import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { isAuthorized, isRateLimited, syncIsConfigured, syncUserId } from '@/lib/sync-auth';
import { isWorkspaceData } from '@/lib/validation';

export const runtime = 'nodejs';
const privateResponse = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });

function authorize(request: NextRequest) {
  if (!syncIsConfigured()) return privateResponse({ error: 'Sync is disabled.' }, 503);
  if (isRateLimited(request)) return privateResponse({ error: 'Too many requests.' }, 429);
  if (!isAuthorized(request)) return privateResponse({ error: 'Unauthorized.' }, 401);
  if (!syncUserId()) return privateResponse({ error: 'Sync configuration is invalid.' }, 503);
  return null;
}

export async function GET(request: NextRequest) {
  const denial = authorize(request);
  if (denial) return denial;
  const pool = getPool();
  const userId = syncUserId();
  if (!pool || !userId) return privateResponse({ error: 'Sync is disabled.' }, 503);
  const result = await pool.query('select payload, updated_at from workspaces where user_id = $1', [userId]);
  return privateResponse(result.rows[0] ?? { payload: null });
}

export async function PUT(request: NextRequest) {
  const denial = authorize(request);
  if (denial) return denial;
  const pool = getPool();
  const userId = syncUserId();
  if (!pool || !userId) return privateResponse({ error: 'Sync is disabled.' }, 503);
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > 2_000_000 || !request.headers.get('content-type')?.includes('application/json')) return privateResponse({ error: 'Invalid request.' }, 400);
  try {
    const raw = await request.text();
    if (raw.length > 2_000_000) return privateResponse({ error: 'Payload is too large.' }, 413);
    const payload: unknown = JSON.parse(raw);
    if (!isWorkspaceData(payload)) return privateResponse({ error: 'Invalid workspace data.' }, 400);
    await pool.query('insert into workspaces (user_id, payload) values ($1, $2) on conflict (user_id) do update set payload = excluded.payload, updated_at = now()', [userId, payload]);
    return privateResponse({ ok: true });
  } catch {
    return privateResponse({ error: 'The request could not be processed.' }, 400);
  }
}
