'use client';

import { ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react';
import { Panel } from '@/components/UI';
import { useStore } from '@/lib/store';

const days = Array.from({ length: 35 }, (_, index) => index + 1);

export default function CalendarPage() {
  const { tasks, activities } = useStore();
  return <div className="page-wrap">
    <div className="page-title-row"><div><div className="eyebrow">TIME SYSTEM</div><h1>Calendar</h1><p>Your commitments and activity rhythm in one view.</p></div><button className="primary-button"><Plus size={17}/> New event</button></div>
    <div className="calendar-toolbar"><div><button><ChevronLeft size={18}/></button><button><ChevronRight size={18}/></button><button className="today-button">Today</button></div><h2>August 2026</h2><div className="view-switch"><button className="active">Month</button><button>Week</button></div></div>
    <section className="calendar-layout"><Panel className="calendar-panel"><div className="weekdays">{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(value => <span key={value}>{value}</span>)}</div><div className="calendar-grid">{days.map(value => { const date = value <= 6 ? value + 26 : value - 6; const muted = value <= 6; const active = date === 25 && !muted; return <div key={value} className={`${muted ? 'muted-day' : ''} ${active ? 'active-day' : ''}`}><time>{date}</time>{!muted && [4,12,18,25].includes(date) && <span className="event wealth">Portfolio review</span>}{!muted && [7,14,21,28].includes(date) && <span className="event health">Training</span>}{active && <span className="event task">Deep work block</span>}</div>})}</div></Panel><aside><Panel title="Today" eyebrow="AUG 25"><div className="agenda">{tasks.filter(task => !task.done).slice(0,3).map((task,index) => <div key={task.id}><time>{index === 0 ? '09:00' : index === 1 ? '13:30' : '17:00'}</time><i/><span><b>{task.title}</b><small><Clock3 size={12}/>{task.project}</small></span></div>)}</div></Panel><Panel title="Activity" eyebrow="RECENT"><div className="agenda compact">{activities.slice(0,3).map(activity => <div key={activity.id}><i/><span><b>{activity.title}</b><small>{activity.minutes} min · {activity.category}</small></span></div>)}</div></Panel></aside></section>
  </div>;
}
