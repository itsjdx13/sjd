import { useRef, useState } from 'react';
import type { AppData, CurrencyCode, Preferences } from '../../types/finance';
import { exportCsv, exportJson, readBackup } from '../../utils/backup';
import { Icon } from '../../components/Icon';
import { createSupabaseSyncClient } from '../../services/sync/supabase';

interface Props { data: AppData; onPreferences: (value: Partial<Preferences>) => void; onRestore: (value: AppData) => void; onRemoveDemo: () => void; }

export function Settings({ data, onPreferences, onRestore, onRemoveDemo }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [syncReady, setSyncReady] = useState(false), [syncBusy, setSyncBusy] = useState(false);
  const syncRef = useRef(createSupabaseSyncClient());
  async function importFile(file?: File) {
    if (!file) return;
    try { onRestore(await readBackup(file)); setMessage('Backup restored. Existing local data was replaced.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Import failed.'); }
  }
  async function syncAction(action: 'signin' | 'signup' | 'push' | 'pull') {
    setSyncBusy(true); setMessage('');
    try {
      if (action === 'signin') { await syncRef.current.signIn(email, password); setSyncReady(true); setMessage('Signed in for this session.'); }
      if (action === 'signup') { const active = await syncRef.current.signUp(email, password); setSyncReady(active); setMessage(active ? 'Account created and signed in.' : 'Account created. Confirm your email, then sign in.'); }
      if (action === 'push') { await syncRef.current.push(data); setMessage('Local snapshot uploaded securely.'); }
      if (action === 'pull') { onRestore(await syncRef.current.pull()); setMessage('Synced snapshot downloaded and stored locally.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Sync failed.'); }
    finally { setSyncBusy(false); }
  }
  return <div className="page-stack settings-page">
    <div className="page-title"><div><p className="eyebrow">LOCAL CONTROL</p><h1>Settings</h1><p>Your portfolio lives in this browser unless you explicitly export it.</p></div></div>
    <section className="settings-section panel"><div className="settings-heading"><span>01</span><div><h2>Display</h2><p>Currency, theme, and number formatting.</p></div></div><div className="settings-controls">
      <label><span>Base currency<small>Used for total portfolio values</small></span><select value={data.preferences.baseCurrency} onChange={(e) => onPreferences({ baseCurrency: e.target.value as CurrencyCode })}>{['USD', 'EUR', 'GBP', 'AED', 'IRR', 'IRT'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Appearance<small>Follows your device by default</small></span><select value={data.preferences.theme} onChange={(e) => onPreferences({ theme: e.target.value as Preferences['theme'] })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label className="toggle-row"><span>Compact large numbers<small>Show 1.24B instead of 1,240,000,000</small></span><input type="checkbox" checked={data.preferences.compactNumbers} onChange={(e) => onPreferences({ compactNumbers: e.target.checked })} /></label>
    </div></section>
    <section className="settings-section panel"><div className="settings-heading"><span>02</span><div><h2>Market data</h2><p>Free sources and explicit Iranian currency handling.</p></div></div><div className="settings-controls">
      <label><span>USD / IRR manual rate<small>Used because conventional central-bank feeds omit IRR</small></span><input type="number" min="1" value={data.preferences.usdIrrRate} onChange={(e) => onPreferences({ usdIrrRate: e.target.valueAsNumber || 1 })} /></label>
      <div className="conversion-note"><strong>1 IRT = 10 IRR</strong><span>At this rate: 1 USD = {new Intl.NumberFormat('en').format(data.preferences.usdIrrRate / 10)} IRT</span></div>
      <label className="toggle-row"><span>Enable TSETMC quote adapter<small>Opt-in public endpoint; cached/manual price remains on failure</small></span><input type="checkbox" checked={data.preferences.tsetmcEnabled} onChange={(e) => onPreferences({ tsetmcEnabled: e.target.checked })} /></label>
      <label><span>Automatic refresh interval<small>The app deduplicates and caches requests</small></span><select value={data.preferences.refreshMinutes} onChange={(e) => onPreferences({ refreshMinutes: Number(e.target.value) })}><option value="1">1 minute</option><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="60">60 minutes</option></select></label>
    </div></section>
    <section className="settings-section panel"><div className="settings-heading"><span>03</span><div><h2>Backup &amp; privacy</h2><p>Portable data, with no account or server required.</p></div></div><div className="backup-actions"><button className="secondary-button" onClick={() => exportJson(data)}><Icon name="download" /> Export JSON</button><button className="secondary-button" onClick={() => exportCsv(data)}><Icon name="download" /> Export CSV</button><button className="secondary-button" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Restore JSON</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(e) => void importFile(e.target.files?.[0])} />{data.assets.some((asset) => asset.isDemo) && <button className="danger-button" onClick={onRemoveDemo}>Remove demo data</button>}</div>{message && <p className="settings-message" role="status">{message}</p>}<div className="privacy-grid"><div><strong>Storage</strong><span>IndexedDB in this browser</span></div><div><strong>Telemetry</strong><span>None</span></div><div><strong>Sync</strong><span>Optional and isolated</span></div><div><strong>Secrets</strong><span>Never included in backups</span></div></div></section>
    <section className="settings-section panel"><div className="settings-heading"><span>04</span><div><h2>Optional sync</h2><p>Supabase is isolated from local storage and disabled unless configured.</p></div></div><div className="sync-controls">
      {!syncRef.current.configured ? <p className="sync-empty">Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable private cross-device sync.</p> : <><div className="sync-login"><input type="email" aria-label="Sync email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><input type="password" aria-label="Sync password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /><button className="secondary-button" disabled={syncBusy} onClick={() => void syncAction('signin')}>Sign in</button><button className="text-button" disabled={syncBusy} onClick={() => void syncAction('signup')}>Create account</button></div>{syncReady && <div className="backup-actions"><button className="primary-button" disabled={syncBusy} onClick={() => void syncAction('push')}>Upload local snapshot</button><button className="secondary-button" disabled={syncBusy} onClick={() => void syncAction('pull')}>Download synced snapshot</button></div>}</>}
    </div></section>
  </div>;
}
