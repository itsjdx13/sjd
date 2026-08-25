'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BookMarked, BookOpenText, CalendarDays, CheckSquare2, CircleHelp, Command, LayoutDashboard, Menu, PanelTop, Search, Settings, WalletCards, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/lib/store';

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: WalletCards },
  { href: '/life', label: 'Life & work', icon: CheckSquare2 },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/mentor', label: 'Dr. Majed', icon: BookOpenText },
  { href: '/resources', label: 'Resources', icon: BookMarked },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { displayName } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = nav.find(item => item.href === pathname)?.label || (pathname === '/settings' ? 'Settings' : 'SJD');

  return <div className="app-shell terminal-shell">
    <aside className={`sidebar terminal-rail ${mobileOpen ? 'is-open' : ''}`}>
      <div className="brand-row"><Link href="/" className="brand" title="SJD Project"><span className="logo-frame"><Image src="/sjd-logo.png" alt="SJD" width={40} height={40} priority /></span><span>SJD <small>PROJECT</small></span></Link><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
      <div className="nav-label">WORKSPACES</div>
      <nav className="side-nav terminal-nav">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} title={label} aria-label={label} onClick={() => setMobileOpen(false)} className={pathname === href ? 'active' : ''}><Icon size={19}/><span>{label}</span>{href === '/life' && <b>3</b>}</Link>)}</nav>
      <div className="sidebar-spacer"/>
      <nav className="side-nav terminal-nav rail-tools"><Link href="/settings" title="Settings" aria-label="Settings" className={pathname === '/settings' ? 'active' : ''}><Settings size={19}/><span>Settings</span></Link><button title="Help" aria-label="Help"><CircleHelp size={19}/><span>Help</span></button></nav>
      <div className="user-row"><span className="user-avatar">{displayName.slice(0, 1).toUpperCase()}</span><span><b>{displayName}</b><small>Personal workspace</small></span></div>
    </aside>
    <section className="workspace terminal-workspace">
      <header className="topbar terminal-topbar">
        <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
        <div className="terminal-context"><PanelTop size={16}/><span><small>SJD PROJECT</small><b>{current}</b></span></div>
        <nav className="workspace-tabs">{nav.slice(0, 4).map(item => <Link href={item.href} key={item.href} className={pathname === item.href ? 'active' : ''}>{item.label}</Link>)}</nav>
        <button className="command-search"><Search size={16}/><span>Quick search</span><kbd><Command size={11}/> K</kbd></button>
        <div className="top-actions"><span className="market-status"><i/> Local saved</span><button aria-label="Notifications"><Bell size={17}/><b/></button><Link href="/settings" className="top-avatar">{displayName.slice(0, 1).toUpperCase()}</Link></div>
      </header>
      <main>{children}</main>
      <footer className="terminal-statusbar"><span><i/> SYSTEM ONLINE</span><span>LOCAL-FIRST</span><span>UTC+03:30</span><span>SJD · PERSONAL WORKSPACE</span></footer>
    </section>
    {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>}
    <nav className="mobile-nav">{nav.filter(item => ['/', '/portfolio', '/life', '/mentor', '/resources'].includes(item.href)).map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={pathname === href ? 'active' : ''}><Icon size={20}/><span>{label.split(' ')[0]}</span></Link>)}</nav>
  </div>;
}
