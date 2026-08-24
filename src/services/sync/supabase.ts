import type { AppData } from '../../types/finance';

interface SessionResponse { access_token: string; user: { id: string }; }

const REQUEST_TIMEOUT_MS = 12_000;

function normalizedEndpoint(value: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return '';
    url.pathname = url.pathname.replace(/\/$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch { return ''; }
}

async function secureFetch(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' }); }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Sync request timed out. Local data is unchanged.'); throw error; }
  finally { window.clearTimeout(timer); }
}

export class SupabaseSyncClient {
  private token = '';
  private userId = '';
  private readonly url: string;
  constructor(url: string, private readonly anonKey: string) { this.url = normalizedEndpoint(url); }

  get configured() { return Boolean(this.url && this.anonKey); }

  async signIn(email: string, password: string) {
    if (!this.configured) throw new Error('Supabase environment variables are not configured.');
    const response = await secureFetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: this.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    const result = await response.json() as SessionResponse & { msg?: string; error_description?: string };
    if (!response.ok) throw new Error(result.msg ?? result.error_description ?? 'Sign-in failed.');
    this.token = result.access_token; this.userId = result.user.id;
  }

  async signUp(email: string, password: string) {
    if (!this.configured) throw new Error('Supabase environment variables are not configured.');
    const response = await secureFetch(`${this.url}/auth/v1/signup`, { method: 'POST', headers: { apikey: this.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const result = await response.json() as Partial<SessionResponse> & { msg?: string; error_description?: string };
    if (!response.ok) throw new Error(result.msg ?? result.error_description ?? 'Sign-up failed.');
    if (result.access_token && result.user) { this.token = result.access_token; this.userId = result.user.id; }
    return Boolean(result.access_token);
  }

  private headers() {
    if (!this.token) throw new Error('Sign in before syncing.');
    return { apikey: this.anonKey, Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
  }

  async push(data: AppData) {
    const response = await secureFetch(`${this.url}/rest/v1/portfolio_snapshots?on_conflict=user_id`, { method: 'POST', headers: { ...this.headers(), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: this.userId, data, updated_at: new Date().toISOString() }) });
    if (!response.ok) throw new Error('Sync upload failed. Local data is unchanged.');
  }

  async pull(): Promise<AppData> {
    const response = await secureFetch(`${this.url}/rest/v1/portfolio_snapshots?user_id=eq.${encodeURIComponent(this.userId)}&select=data&limit=1`, { headers: this.headers() });
    if (!response.ok) throw new Error('Sync download failed. Local data is unchanged.');
    const rows = await response.json() as Array<{ data: AppData }>;
    if (!rows[0]?.data) throw new Error('No synced portfolio exists for this account.');
    return rows[0].data;
  }
}

export function createSupabaseSyncClient() {
  return new SupabaseSyncClient(import.meta.env.VITE_SUPABASE_URL ?? '', import.meta.env.VITE_SUPABASE_ANON_KEY ?? '');
}
