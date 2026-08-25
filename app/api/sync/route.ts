import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';
const demoUser = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: 'PostgreSQL is not configured.' }, { status: 503 });
  const result = await pool.query('select payload, updated_at from workspaces where user_id = $1', [demoUser]);
  return NextResponse.json(result.rows[0] ?? { payload: null });
}

export async function PUT(request: NextRequest) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: 'PostgreSQL is not configured.' }, { status: 503 });
  const payload = await request.json();
  if (!payload || typeof payload !== 'object' || JSON.stringify(payload).length > 2_000_000) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  await pool.query('insert into workspaces (user_id, payload) values ($1, $2) on conflict (user_id) do update set payload = excluded.payload, updated_at = now()', [demoUser, payload]);
  return NextResponse.json({ ok: true });
}
