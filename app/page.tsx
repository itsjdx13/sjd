'use client';

import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Check, ChevronRight, Clock3, Flame, Plus, Sparkles, Target } from 'lucide-react';
import { MarketChart } from '@/components/MarketChart';
import { Panel, ProgressRing, Stat } from '@/components/UI';
import { formatMoney, portfolioSummary } from '@/lib/finance';
import { useStore } from '@/lib/store';

export default function OverviewPage() {
  const store = useStore();
  const summary = portfolioSummary(store.assets, store.baseCurrency);
  const profit = summary.value - summary.cost;
  const dayPercent = summary.value ? summary.day / (summary.value - summary.day) * 100 : 0;
  const today = new Date().toISOString().slice(0, 10);
  const habitsDone = store.habits.filter(habit => habit.completedDates.includes(today)).length;
  const focus = Math.round((habitsDone / Math.max(1, store.habits.length)) * 100);
  const openTasks = store.tasks.filter(task => !task.done);

  return <div className="page-wrap">
    <div className="page-title-row"><div><div className="eyebrow"><Sparkles size={13}/> PERSONAL COMMAND CENTER</div><h1>Good morning, {store.displayName}.</h1><p>One clear view of your money, priorities, and momentum.</p></div><div className="title-actions"><span className="date-chip">Tuesday, August 25</span><Link href="/life" className="primary-button"><Plus size={17}/> Quick add</Link></div></div>

    <section className="hero-grid">
      <Panel className="wealth-panel" eyebrow="TOTAL NET WORTH" title={formatMoney(summary.value, store.baseCurrency)} action={<Link href="/portfolio" className="quiet-link">Open portfolio <ArrowRight size={14}/></Link>}>
        <div className="wealth-meta"><span className="positive">+{formatMoney(summary.day, store.baseCurrency)} <b>({dayPercent.toFixed(2)}%)</b> today</span><span>All accounts · {store.assets.length} assets</span></div>
        <MarketChart compact/>
        <div className="range-switch"><button>1D</button><button>1W</button><button className="active">1M</button><button>3M</button><button>1Y</button><button>ALL</button></div>
      </Panel>
      <Panel className="focus-panel" eyebrow="TODAY'S FOCUS" title="Daily momentum">
        <div className="focus-body"><ProgressRing value={focus}/><div className="focus-copy"><span><Flame size={15}/> {habitsDone >= 3 ? 'Strong rhythm' : 'Build momentum'}</span><h3>{habitsDone} of {store.habits.length} habits complete</h3><p>{openTasks.length} tasks remain across your workspace.</p></div></div>
        <div className="habit-mini-list">{store.habits.slice(0, 3).map(habit => { const done = habit.completedDates.includes(today); return <button key={habit.id} onClick={() => store.toggleHabit(habit.id)}><i className={done ? 'done' : ''}>{done && <Check size={13}/>}</i><span>{habit.name}</span><small>{done ? 'Done' : 'Today'}</small></button>; })}</div>
        <Link href="/life" className="panel-link">View daily plan <ChevronRight size={15}/></Link>
      </Panel>
    </section>

    <div className="stat-grid"><Stat label="Portfolio return" value={formatMoney(profit, store.baseCurrency, true)} change={summary.cost ? profit / summary.cost * 100 : 0}/><Stat label="Focused time" value="5h 24m" detail="+48m from last week"/><Stat label="Active streak" value="12 days" detail="Personal best: 21 days"/><Stat label="Open tasks" value={`${openTasks.length}`} detail={`${openTasks.filter(task => task.priority === 'high').length} high priority`}/></div>

    <section className="content-grid">
      <Panel title="Portfolio snapshot" eyebrow="WEALTH" action={<Link href="/portfolio" className="quiet-link">View all <ArrowRight size={14}/></Link>}>
        <div className="asset-snapshot">{store.assets.slice(0, 4).map(asset => <div key={asset.id}><span className={`asset-badge ${asset.type}`}>{asset.symbol.slice(0, 2)}</span><span><b>{asset.name}</b><small>{asset.symbol} · {asset.type}</small></span><span className="asset-price"><b>{formatMoney(asset.quantity * asset.currentPrice, asset.currency, true)}</b><small className={asset.dayChange >= 0 ? 'positive' : 'negative'}>{asset.dayChange >= 0 ? '+' : ''}{asset.dayChange.toFixed(2)}%</small></span></div>)}</div>
      </Panel>
      <Panel title="Priority queue" eyebrow="WORK" action={<Link href="/life" className="quiet-link">Open list <ArrowRight size={14}/></Link>}>
        <div className="task-list">{openTasks.slice(0, 4).map(task => <button key={task.id} onClick={() => store.toggleTask(task.id)}><i/><span><b>{task.title}</b><small><span className={`priority ${task.priority}`}/>{task.project}</small></span><time><Clock3 size={13}/>{task.due === today ? 'Today' : task.due.slice(5)}</time></button>)}</div>
      </Panel>
      <Panel title="System pulse" eyebrow="THIS WEEK" className="pulse-panel">
        <div className="pulse-metric"><span><Target size={19}/></span><div><b>78%</b><small>Habit consistency</small></div></div><div className="pulse-metric"><span><BriefcaseBusiness size={19}/></span><div><b>6</b><small>Completed tasks</small></div></div><div className="weekly-bars">{[58,72,44,88,76,92,64].map((height, i) => <i key={i} style={{height: `${height}%`}} className={i === 5 ? 'active' : ''}/>)}</div><div className="week-labels"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
      </Panel>
    </section>
  </div>;
}
