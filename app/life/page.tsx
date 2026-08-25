'use client';

import { useState } from 'react';
import { Activity, BookOpen, Brain, Check, ChevronRight, Circle, Clock3, Dumbbell, Flame, ListTodo, Plus, X } from 'lucide-react';
import { Panel, ProgressRing } from '@/components/UI';
import { useStore } from '@/lib/store';

export default function LifePage() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('Personal');
  const today = new Date().toISOString().slice(0, 10);
  const completed = store.habits.filter(habit => habit.completedDates.includes(today)).length;
  const score = Math.round(completed / Math.max(1, store.habits.length) * 100);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim()) return; store.addTask({ title: title.trim(), project, due: today, priority: 'medium' }); setTitle(''); setOpen(false); };
  const activityIcons = { Fitness: Dumbbell, Learning: Activity, Mindfulness: Brain, Reading: BookOpen };

  return <div className="page-wrap">
    <div className="page-title-row"><div><div className="eyebrow"><ListTodo size={13}/> LIFE & WORK</div><h1>Today</h1><p>Make the next useful action obvious and small.</p></div><button className="primary-button" onClick={() => setOpen(true)}><Plus size={17}/> New task</button></div>
    <section className="life-summary"><Panel className="today-score"><ProgressRing value={score}/><div><span className="positive"><Flame size={15}/> {score >= 70 ? 'On track' : 'Keep moving'}</span><h2>Your daily score is {score}%</h2><p>Finish one meaningful task and the easiest remaining habit.</p></div></Panel><div className="mini-stat"><span>Focused time</span><b>5h 24m</b><small>Goal 6h</small><i><em style={{width:'90%'}}/></i></div><div className="mini-stat"><span>Weekly rhythm</span><b>78%</b><small>+8% vs last week</small><i><em style={{width:'78%'}}/></i></div></section>
    <section className="life-grid"><Panel title="Habits" eyebrow="DAILY RHYTHM" action={<span className="count-chip">{completed}/{store.habits.length}</span>}><div className="life-habits">{store.habits.map(habit => { const done = habit.completedDates.includes(today); return <button key={habit.id} onClick={() => store.toggleHabit(habit.id)}><i className={done ? 'done' : ''}>{done ? <Check size={15}/> : <Circle size={15}/>}</i><span><b>{habit.name}</b><small>{habit.completedDates.length} check-ins · target {habit.target}/week</small></span><strong>{done ? 'Done' : 'Check in'}</strong></button>; })}</div></Panel><Panel title="Tasks" eyebrow="PRIORITY QUEUE" action={<button className="tiny-add" onClick={() => setOpen(true)}><Plus size={15}/></button>}><div className="life-tasks">{store.tasks.map(task => <button key={task.id} onClick={() => store.toggleTask(task.id)} className={task.done ? 'completed' : ''}><i>{task.done && <Check size={13}/>}</i><span><b>{task.title}</b><small><span className={`priority ${task.priority}`}/>{task.project}</small></span><time><Clock3 size={12}/>{task.due === today ? 'Today' : task.due.slice(5)}</time></button>)}</div></Panel></section>
    <Panel title="Recent activity" eyebrow="ENERGY LOG" action={<button className="quiet-link">View history <ChevronRight size={14}/></button>}><div className="activity-cards">{store.activities.map(activity => { const Icon = activityIcons[activity.category]; return <article key={activity.id}><span><Icon size={19}/></span><div><b>{activity.title}</b><small>{activity.category} · {activity.date}</small></div><strong>{activity.minutes}<small>min</small></strong></article>})}<button className="activity-add"><Plus size={19}/><span>Log activity</span></button></div></Panel>
    {open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}><form className="modal-card small" onSubmit={submit} onMouseDown={event => event.stopPropagation()}><header><div><span>LIFE & WORK</span><h2>Create a task</h2></div><button type="button" onClick={() => setOpen(false)}><X size={19}/></button></header><div className="form-grid"><label className="full">Task title<input required autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="What needs to happen?"/></label><label className="full">Project<input value={project} onChange={event => setProject(event.target.value)}/></label></div><footer><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button">Create task</button></footer></form></div>}
  </div>;
}
