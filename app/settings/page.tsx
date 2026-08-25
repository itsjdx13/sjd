'use client';

import { useRef, useState } from 'react';
import { Check, Database, Download, HardDrive, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { Panel } from '@/components/UI';
import { useStore } from '@/lib/store';
import type { Currency, ThemeId, WorkspaceData } from '@/lib/types';
import { isWorkspaceData } from '@/lib/validation';

const themes: Array<{ id: ThemeId; name: string; description: string; colors: string[] }> = [
  { id: 'midnight', name: 'Trading Dark', description: 'Balanced dark chart workspace', colors: ['#131722','#2962FF','#089981','#FF9800'] },
  { id: 'terminal', name: 'OLED Terminal', description: 'Pure black with high-signal colors', colors: ['#000000','#2962FF','#00ADB3','#F23645'] },
  { id: 'aurora', name: 'Deep Blue', description: 'Focused navy using the SJD palette', colors: ['#071426','#0053B3','#00ADB3','#FF9800'] },
  { id: 'polar', name: 'Trading Light', description: 'Clean white chart surfaces', colors: ['#FFFFFF','#2962FF','#089981','#F23645'] },
  { id: 'sandstone', name: 'Warm Paper', description: 'Low-glare notes and planning', colors: ['#F7F4EF','#0053B3','#00ADB3','#E57A00'] },
];

export default function SettingsPage() {
  const store = useStore();
  const [name, setName] = useState(store.displayName);
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const save = (event: React.FormEvent) => { event.preventDefault(); store.setDisplayName(name.trim() || 'Sajad'); setNotice('Workspace updated.'); };
  const exportData = () => { const blob = new Blob([JSON.stringify({ assets: store.assets, habits: store.habits, tasks: store.tasks, activities: store.activities, mentorNotes: store.mentorNotes, resources: store.resources, displayName: store.displayName, baseCurrency: store.baseCurrency, theme: store.theme }, null, 2)], {type:'application/json'}); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `sjd-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href); setNotice('Backup downloaded.'); };
  const restore = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { if (file.size > 2_000_000) throw new Error('too large'); const parsed: unknown = JSON.parse(await file.text()); if (!isWorkspaceData(parsed)) throw new Error('invalid'); store.replaceData(parsed as WorkspaceData); setNotice('Backup restored.'); } catch { setNotice('That backup is invalid or larger than 2 MB.'); } event.target.value=''; };

  return <div className="page-wrap settings-page">
    <div className="page-title-row"><div><div className="eyebrow">WORKSPACE CONTROL</div><h1>Settings</h1><p>Keep your system private, portable, and uncomplicated.</p></div>{notice && <span className="notice"><Check size={15}/>{notice}</span>}</div>
    <div className="settings-layout"><Panel title="Profile & display" eyebrow="GENERAL"><form className="settings-form" onSubmit={save}><label>Display name<input value={name} onChange={event => setName(event.target.value)} maxLength={60}/></label><label>Base currency<select value={store.baseCurrency} onChange={event => store.setBaseCurrency(event.target.value as Currency)}>{['USD','EUR','GBP','AED','IRR','IRT'].map(value => <option key={value}>{value}</option>)}</select></label><button className="primary-button">Save changes</button></form></Panel><Panel title="Data & backup" eyebrow="LOCAL FIRST"><div className="setting-row"><span className="setting-icon"><Download size={19}/></span><div><b>Export workspace</b><p>Download all portfolio, Life OS, and mentor-note data as JSON.</p></div><button className="secondary-button" onClick={exportData}>Export</button></div><div className="setting-row"><span className="setting-icon"><Upload size={19}/></span><div><b>Restore workspace</b><p>Replace local data from a previous backup.</p></div><button className="secondary-button" onClick={() => input.current?.click()}>Import</button><input ref={input} hidden type="file" accept="application/json,.json" onChange={restore}/></div><div className="setting-row"><span className="setting-icon"><RefreshCw size={19}/></span><div><b>Starter data</b><p>Restore the safe demonstration workspace.</p></div><button className="secondary-button" onClick={() => { if (confirm('Reset all local SJD data?')) store.reset(); }}>Reset</button></div></Panel><Panel title="Interface themes" eyebrow="APPEARANCE" className="full-panel"><div className="theme-grid">{themes.map(theme => <button key={theme.id} className={`theme-option ${store.theme === theme.id ? 'selected' : ''}`} onClick={() => store.setTheme(theme.id)}><span className="theme-preview">{theme.colors.map(color => <i key={color} style={{background:color}}/>)}</span><span><b>{theme.name}</b><small>{theme.description}</small></span>{store.theme === theme.id && <Check size={16}/>}</button>)}</div><p className="theme-note">Theme choice is saved on this device and included in workspace backups.</p></Panel><Panel title="Storage status" eyebrow="SYNC" className="full-panel"><div className="storage-options"><article className="selected"><span><HardDrive size={21}/></span><div><b>On this device</b><p>Active · encrypted by your device security</p></div><Check size={18}/></article><article><span><Database size={21}/></span><div><b>PostgreSQL sync</b><p>Optional · configure DATABASE_URL on your server</p></div><em>Ready</em></article><article><span><ShieldCheck size={21}/></span><div><b>Privacy mode</b><p>No analytics, trackers, or paid services</p></div><em>Always on</em></article></div></Panel></div>
  </div>;
}
