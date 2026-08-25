import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function Panel({ title, eyebrow, action, children, className = '' }: { title?: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    {(title || action) && <header className="panel-head"><div>{eyebrow && <span>{eyebrow}</span>}{title && <h2>{title}</h2>}</div>{action}</header>}
    {children}
  </section>;
}

export function Stat({ label, value, change, detail }: { label: string; value: string; change?: number; detail?: string }) {
  const positive = (change || 0) >= 0;
  return <div className="stat"><span>{label}</span><strong>{value}</strong>{change !== undefined ? <small className={positive ? 'positive' : 'negative'}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {Math.abs(change).toFixed(2)}% <em>today</em></small> : <small>{detail}</small>}</div>;
}

export function ProgressRing({ value }: { value: number }) {
  return <div className="progress-ring" style={{ '--progress': `${Math.min(100, Math.max(0, value)) * 3.6}deg` } as React.CSSProperties}><div><strong>{value}%</strong><span>complete</span></div></div>;
}
