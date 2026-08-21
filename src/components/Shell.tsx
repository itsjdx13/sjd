import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type Page = 'overview' | 'portfolio' | 'markets' | 'calculator' | 'settings';
const nav: Array<{ id: Page; label: string }> = [
  { id: 'overview', label: 'Overview' }, { id: 'portfolio', label: 'Portfolio' },
  { id: 'markets', label: 'Markets' }, { id: 'calculator', label: 'Calculator' }, { id: 'settings', label: 'Settings' }
];

interface ShellProps {
  page: Page;
  onPage: (page: Page) => void;
  hidden: boolean;
  refreshing: boolean;
  online: boolean;
  status: string;
  onTogglePrivacy: () => void;
  onRefresh: () => void;
  onAdd: () => void;
  children: ReactNode;
}

export function Shell({ page, onPage, hidden, refreshing, online, status, onTogglePrivacy, onRefresh, onAdd, children }: ShellProps) {
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => onPage('overview')} aria-label="Northstar overview"><span className="brand-mark">✦</span><span>Northstar</span></button>
      <nav aria-label="Primary navigation">{nav.map((item) => <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => onPage(item.id)}><Icon name={item.id} /><span>{item.label}</span></button>)}</nav>
      <div className="privacy-note"><span className="status-dot" />Private by default<br /><small>Data stays on this device</small></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div><p className="eyebrow">PERSONAL FINANCIAL POSITION</p><p className="top-status">{!online && <Icon name="wifiOff" />} {status}</p></div>
        <div className="top-actions">
          <button className="icon-button" onClick={onTogglePrivacy} aria-label={hidden ? 'Show financial values' : 'Hide financial values'} title={hidden ? 'Show values' : 'Hide values'}><Icon name={hidden ? 'eyeOff' : 'eye'} /></button>
          <button className="icon-button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh market prices" title="Refresh prices"><Icon name="refresh" className={refreshing ? 'spinning' : ''} /></button>
          <button className="primary-button compact" onClick={onAdd}><Icon name="plus" /> Add asset</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
    <nav className="bottom-nav" aria-label="Mobile navigation">{nav.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => onPage(item.id)}><Icon name={item.id} /><span>{item.label}</span></button>)}</nav>
  </div>;
}
