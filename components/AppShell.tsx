'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BookOpenText, CalendarDays, CheckSquare2, CircleHelp, Command, LayoutDashboard, Menu, Search, Settings, TrendingUp, WalletCards, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/lib/store';

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: WalletCards },
  { href: '/life', label: 'Life & work', icon: CheckSquare2 },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/mentor', label: 'Dr. Majed', icon: BookOpenText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { displayName } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = nav.find(item => item.href === pathname)?.label || (pathname === '/settings' ? 'Settings' : 'SJD');

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <div className="brand-row"><Link href="/" className="brand"><span className="logo-frame"><Image src="/sjd-logo.png" alt="SJD" width={42} height={42} priority /></span><span>SJD <small>PROJECT</small></span></Link><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
      <button className="workspace-switcher"><span className="avatar">S</span><span><small>PRIVATE WORKSPACE</small>SJD Project</span><span className="online-dot"/></button>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={pathname === href ? 'active' : ''}><Icon size={18}/><span>{label}</span>{href === '/life' && <b>3</b>}</Link>)}</nav>
      <div className="nav-label">TOOLS</div>
      <nav className="side-nav compact"><Link href="/portfolio"><TrendingUp size={18}/><span>Markets</span></Link><Link href="/settings" className={pathname === '/settings' ? 'active' : ''}><Settings size={18}/><span>Settings</span></Link></nav>
      <div className="sidebar-spacer"/>
      <div className="storage-card"><div><span>Local-first storage</span><b>Private & ready</b></div><span className="storage-track"><i/></span><small>PostgreSQL sync is optional</small></div>
      <div className="user-row"><span className="user-avatar">{displayName.slice(0, 1).toUpperCase()}</span><span><b>{displayName}</b><small>Personal workspace</small></span><CircleHelp size={17}/></div>
    </aside>
    <section className="workspace">
      <header className="topbar">
        <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21}/></button>
        <div className="mobile-title">{current}</div>
        <button className="command-search"><Search size={17}/><span>Search everything...</span><kbd><Command size={12}/> K</kbd></button>
        <div className="top-actions"><span className="market-status"><i/> Markets open</span><button aria-label="Notifications"><Bell size={19}/><b/></button><Link href="/settings" className="top-avatar">{displayName.slice(0, 1).toUpperCase()}</Link></div>
      </header>
      <main>{children}</main>
    </section>
    {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>}
    <nav className="mobile-nav">{nav.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={pathname === href ? 'active' : ''}><Icon size={21}/><span>{label.split(' ')[0]}</span></Link>)}</nav>
  </div>;
}
