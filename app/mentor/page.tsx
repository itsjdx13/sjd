'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BookOpenText, CheckCircle2, FileUp, Lightbulb, Pin, Plus, Search, Sparkles, Target, Trash2, X } from 'lucide-react';
import { Panel } from '@/components/UI';
import { useStore } from '@/lib/store';
import type { MentorCategory } from '@/lib/types';

const categories: Array<'All' | MentorCategory> = ['All', 'Mindset', 'Wealth', 'Markets', 'Practice'];
const categoryDescriptions: Record<MentorCategory, string> = {
  Mindset: 'Identity, belief, attention, and agency',
  Wealth: 'Capital stewardship and long-term wealth',
  Markets: 'Research, risk, and decision frameworks',
  Practice: 'Habits that turn insight into behavior',
};

export default function MentorPage() {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | MentorCategory>('All');
  const [selectedId, setSelectedId] = useState(store.mentorNotes[0]?.id || '');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [noteCategory, setNoteCategory] = useState<MentorCategory>('Mindset');
  const fileInput = useRef<HTMLInputElement>(null);

  const notes = useMemo(() => store.mentorNotes.filter(note => {
    const matchesCategory = category === 'All' || note.category === category;
    const matchesQuery = `${note.title} ${note.body}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    return matchesCategory && matchesQuery;
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned)), [store.mentorNotes, category, query]);
  const selected = store.mentorNotes.find(note => note.id === selectedId) || notes[0];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    store.addMentorNote({ title: title.trim(), body: body.trim(), category: noteCategory, pinned: false });
    setTitle(''); setBody(''); setNoteCategory('Mindset'); setOpen(false);
  };
  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.size > 2_000_000) return;
    const text = await file.text();
    if (text.trim()) store.addMentorNote({ title: file.name.replace(/\.[^.]+$/, ''), body: text.trim(), category: 'Practice', pinned: false });
    event.target.value = '';
  };

  return <div className="page-wrap mentor-page">
    <div className="page-title-row"><div><div className="eyebrow"><BookOpenText size={13}/> MENTOR LIBRARY</div><h1>Dr. Majed Notes</h1><p>Preserve the lesson, find the principle, apply the next action.</p></div><div className="title-actions"><button className="secondary-button" onClick={() => fileInput.current?.click()}><FileUp size={16}/> Import notes</button><input ref={fileInput} hidden type="file" accept=".txt,.md,text/plain,text/markdown" onChange={importFile}/><button className="primary-button" onClick={() => setOpen(true)}><Plus size={17}/> New note</button></div></div>

    <section className="mentor-hero">
      <div className="mentor-mark"><Sparkles size={20}/><span>MAJED<br/><b>METHOD</b></span></div>
      <blockquote dir="auto">“همیشه راهی هست.”<small>There is always a way.</small></blockquote>
      <div className="mentor-principle"><span>THIS WEEK'S PRACTICE</span><b>Turn one insight into one observable action.</b><small>Knowledge compounds only when it changes a decision.</small></div>
    </section>

    <div className="mentor-stats"><div><Lightbulb size={18}/><span><b>{store.mentorNotes.length}</b><small>captured insights</small></span></div><div><Pin size={18}/><span><b>{store.mentorNotes.filter(note => note.pinned).length}</b><small>core principles</small></span></div><div><Target size={18}/><span><b>{store.tasks.filter(task => task.project === 'Dr. Majed' && !task.done).length}</b><small>open applications</small></span></div></div>

    <div className="mentor-toolbar"><div className="mentor-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search every lesson..."/></div><div className="mentor-filters">{categories.map(value => <button key={value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{value}</button>)}</div></div>

    <section className="mentor-layout">
      <Panel className="note-browser" title="Knowledge cards" eyebrow={`${notes.length} RESULTS`}>
        <div className="note-grid">{notes.map(note => <button key={note.id} className={`note-card ${selected?.id === note.id ? 'selected' : ''}`} onClick={() => setSelectedId(note.id)}><span className={`note-category ${note.category.toLowerCase()}`}>{note.category}</span>{note.pinned && <Pin size={13} className="note-pin"/>}<h3>{note.title}</h3><p dir="auto">{note.body}</p><footer><span>{note.createdAt}</span><ArrowUpRight size={14}/></footer></button>)}{!notes.length && <div className="mentor-empty"><Search size={22}/><b>No matching lessons</b><span>Try another phrase or category.</span></div>}</div>
      </Panel>
      <aside className="note-reader">
        {selected ? <Panel eyebrow={selected.category.toUpperCase()} title={selected.title} action={<button className={`pin-button ${selected.pinned ? 'active' : ''}`} onClick={() => store.toggleMentorNotePin(selected.id)} aria-label="Pin note"><Pin size={15}/></button>}>
          <p className="reader-body" dir="auto">{selected.body}</p>
          <div className="reader-context"><span>WHY IT MATTERS</span><p>{categoryDescriptions[selected.category]}</p></div>
          <div className="reader-actions"><button className="primary-button" onClick={() => store.turnMentorNoteIntoTask(selected.id)}><CheckCircle2 size={15}/> Turn into action</button><button className="delete-note" onClick={() => { if (confirm('Delete this mentor note?')) store.removeMentorNote(selected.id); }}><Trash2 size={15}/></button></div>
        </Panel> : <Panel><div className="mentor-empty"><BookOpenText size={22}/><b>Select a lesson</b></div></Panel>}
        <div className="mentor-disclaimer">Personal learning archive. Independently verify financial, medical, and historical claims before acting on them.</div>
      </aside>
    </section>

    {open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}><form className="modal-card" onSubmit={submit} onMouseDown={event => event.stopPropagation()}><header><div><span>MENTOR LIBRARY</span><h2>Capture a lesson</h2></div><button type="button" onClick={() => setOpen(false)}><X size={19}/></button></header><div className="form-grid"><label className="full">Title<input required autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Name the principle"/></label><label className="full">Category<select value={noteCategory} onChange={event => setNoteCategory(event.target.value as MentorCategory)}>{categories.slice(1).map(value => <option key={value}>{value}</option>)}</select></label><label className="full">Lesson<textarea required dir="auto" value={body} onChange={event => setBody(event.target.value)} placeholder="Capture the original thought, then add what it means to you."/></label></div><footer><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button">Save lesson</button></footer></form></div>}
  </div>;
}
