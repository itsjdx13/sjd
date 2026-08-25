import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const pool = getPool();
  if (!pool) return NextResponse.json({ ok: true, storage: 'local', database: 'not configured' });
  try { await pool.query('select 1'); return NextResponse.json({ ok: true, storage: 'postgresql', database: 'connected' }); }
  catch { return NextResponse.json({ ok: false, database: 'unavailable' }, { status: 503 }); }
}
