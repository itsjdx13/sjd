import 'server-only';
import { Pool } from 'pg';

declare global { var sjdPool: Pool | undefined; }

export function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!global.sjdPool) global.sjdPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
  });
  return global.sjdPool;
}
