import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

const attempts = new Map<string, { count: number; resetAt: number }>();

export function syncIsConfigured() {
  return process.env.SJD_SYNC_ENABLED === 'true' && Boolean(process.env.DATABASE_URL) && Boolean(process.env.SJD_SYNC_API_KEY) && Boolean(process.env.SJD_SYNC_USER_ID);
}

export function isRateLimited(request: NextRequest) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const record = attempts.get(ip);
  if (!record || record.resetAt < now) { attempts.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  record.count += 1;
  return record.count > 10;
}

export function isAuthorized(request: NextRequest) {
  const expected = process.env.SJD_SYNC_API_KEY;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || expected.length < 32 || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function syncUserId() {
  const id = process.env.SJD_SYNC_USER_ID || '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}
