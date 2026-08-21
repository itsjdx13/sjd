import type { AppData } from '../../types/finance';

interface SessionResponse { access_token: string; user: { id: string }; }

export class SupabaseSyncClient {
  private token = '';
  private userId = '';
  constructor(private readonly url: string, private readonly anonKey: string) {}

  get configured() { return Boolean(this.url && this.anonKey); }

  async signIn(email: string, password: string) {
    if (!this.configured) throw new Error('Supabase environment variables are not configured.');
    const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: this.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    const result = await response.json() as SessionResponse & { msg?: string; error_description?: string };
    if (!response.ok) throw new Error(result.msg ?? result.error_description ?? 'Sign-in failed.');
    this.token = result.access_token; this.userId = result.user.id;
  }

  async signUp(email: string, password: string) {
    if (!this.configured) throw new Error('Supabase environment variables are not configured.');
    const response = await fetch(`${this.url}/auth/v1/signup`, { method: 'POST', headers: { apikey: this.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
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
    const response = await fetch(`${this.url}/rest/v1/portfolio_snapshots?on_conflict=user_id`, { method: 'POST', headers: { ...this.headers(), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: this.userId, data, updated_at: new Date().toISOString() }) });
    if (!response.ok) throw new Error('Sync upload failed. Local data is unchanged.');
  }

  async pull(): Promise<AppData> {
    const response = await fetch(`${this.url}/rest/v1/portfolio_snapshots?user_id=eq.${encodeURIComponent(this.userId)}&select=data&limit=1`, { headers: this.headers() });
    if (!response.ok) throw new Error('Sync download failed. Local data is unchanged.');
    const rows = await response.json() as Array<{ data: AppData }>;
    if (!rows[0]?.data) throw new Error('No synced portfolio exists for this account.');
    return rows[0].data;
  }
}

export function createSupabaseSyncClient() {
  return new SupabaseSyncClient(import.meta.env.VITE_SUPABASE_URL ?? '', import.meta.env.VITE_SUPABASE_ANON_KEY ?? '');
}
