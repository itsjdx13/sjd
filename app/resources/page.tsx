'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookMarked, Download, FileCode2, FilePlus2, FileText, Folder, MoreHorizontal, PanelLeftClose, Pencil, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { MarkdownView } from '@/components/MarkdownView';
import { useStore } from '@/lib/store';
import type { ResourceFolder } from '@/lib/types';

const folders: Array<'All' | ResourceFolder> = ['All', 'Research', 'Playbooks', 'Journal', 'Reference'];

export default function ResourcesPage() {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<'All' | ResourceFolder>('All');
  const [selectedId, setSelectedId] = useState(store.resources[0]?.id || '');
  const [readerOpen, setReaderOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [documentFolder, setDocumentFolder] = useState<ResourceFolder>('Reference');
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = store.resources.find(resource => resource.id === selectedId) || store.resources[0];
  const visible = useMemo(() => store.resources.filter(resource => (folder === 'All' || resource.folder === folder) && `${resource.title} ${resource.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [store.resources, folder, query]);

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title); setContent(selected.content); setDocumentFolder(selected.folder);
  }, [selected]);

  const createDocument = () => {
    const id = store.addResource({ title: 'Untitled resource', fileName: 'untitled-resource.md', folder: 'Reference', content: '# Untitled resource\n\nStart writing here.' });
    setSelectedId(id); setReaderOpen(true); setEditing(true);
  };
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.size > 1_000_000 || !/\.(md|markdown)$/i.test(file.name)) { event.target.value = ''; return; }
    const nextTitle = file.name.replace(/\.(md|markdown)$/i, '').replace(/[-_]+/g, ' ');
    const id = store.addResource({ title: nextTitle, fileName: file.name, folder: 'Reference', content: await file.text() });
    setSelectedId(id); setReaderOpen(true); setEditing(false); event.target.value = '';
  };
  const save = () => { if (!selected || !title.trim()) return; store.updateResource(selected.id, { title: title.trim(), content, folder: documentFolder }); setEditing(false); };
  const download = () => {
    if (!selected) return;
    const blob = new Blob([selected.content], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = selected.fileName; link.click(); URL.revokeObjectURL(link.href);
  };

  return <div className="resource-terminal">
    <header className="terminal-subbar"><div><BookMarked size={16}/><b>Resource Library</b><span>{store.resources.length} documents</span></div><div><button onClick={createDocument}><FilePlus2 size={15}/>New</button><button className="accent" onClick={() => fileInput.current?.click()}><Upload size={15}/>Upload MD</button><input ref={fileInput} hidden type="file" accept=".md,.markdown,text/markdown" onChange={upload}/></div></header>
    <div className="resource-layout">
      <aside className="resource-folders"><div className="resource-side-title"><span>LIBRARY</span><PanelLeftClose size={14}/></div>{folders.map(value => <button key={value} className={folder === value ? 'active' : ''} onClick={() => setFolder(value)}><Folder size={15}/><span>{value}</span><b>{value === 'All' ? store.resources.length : store.resources.filter(resource => resource.folder === value).length}</b></button>)}</aside>
      <section className="resource-list"><div className="resource-search"><Search size={14}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search resources"/><span>.MD</span></div><div className="resource-list-head"><span>NAME</span><span>FOLDER</span><span>UPDATED</span></div>{visible.map(resource => <button key={resource.id} className={selected?.id === resource.id ? 'active' : ''} onClick={() => { setSelectedId(resource.id); setReaderOpen(true); setEditing(false); }}><FileText size={16}/><span><b>{resource.title}</b><small>{resource.fileName}</small></span><em>{resource.folder}</em><time>{resource.updatedAt.slice(5)}</time></button>)}{!visible.length && <div className="resource-empty"><FileCode2 size={22}/><b>No Markdown files</b><span>Upload a file or create a new resource.</span></div>}</section>
      <section className={`resource-reader ${readerOpen ? 'is-open' : ''}`}>{selected ? <>
        <header className="resource-reader-head"><div><button className="resource-back" onClick={() => setReaderOpen(false)} aria-label="Back to resources"><ArrowLeft size={15}/></button><FileCode2 size={17}/><span><b>{selected.fileName}</b><small>Local · {selected.content.length.toLocaleString()} characters</small></span></div><div>{editing ? <><button onClick={() => setEditing(false)}><X size={15}/>Cancel</button><button className="accent" onClick={save}><Save size={15}/>Save</button></> : <><button onClick={() => setEditing(true)}><Pencil size={15}/>Edit</button><button onClick={download}><Download size={15}/>Download</button><button aria-label="More actions"><MoreHorizontal size={16}/></button></>}</div></header>
        {editing ? <div className="resource-editor"><div><label>Title<input value={title} onChange={event => setTitle(event.target.value)}/></label><label>Folder<select value={documentFolder} onChange={event => setDocumentFolder(event.target.value as ResourceFolder)}>{folders.slice(1).map(value => <option key={value}>{value}</option>)}</select></label></div><textarea value={content} onChange={event => setContent(event.target.value)} spellCheck={false}/></div> : <div className="resource-preview"><MarkdownView content={selected.content}/></div>}
        <footer className="resource-status"><span>Markdown</span><span>UTF-8</span><span>{selected.content.split(/\s+/).filter(Boolean).length} words</span><button onClick={() => { if (confirm(`Delete ${selected.title}?`)) { store.removeResource(selected.id); setSelectedId(store.resources.find(resource => resource.id !== selected.id)?.id || ''); setReaderOpen(false); } }}><Trash2 size={13}/>Delete</button></footer>
      </> : <div className="resource-empty large"><BookMarked size={26}/><b>Select a resource</b><span>Markdown previews are rendered safely without executing HTML.</span></div>}</section>
    </div>
  </div>;
}
