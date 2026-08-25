'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Activity, Asset, Currency, Habit, MentorNote, Task, ThemeId, WorkspaceData } from './types';

const today = () => new Date().toISOString().slice(0, 10);
const day = (offset: number) => {
  const value = new Date();
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
};

const seed: WorkspaceData = {
  displayName: 'Sajad', baseCurrency: 'USD', theme: 'midnight',
  assets: [
    { id: 'btc', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', quantity: 0.42, averagePrice: 64200, currentPrice: 68420, currency: 'USD', dayChange: 2.84 },
    { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', type: 'stock', quantity: 34, averagePrice: 142.4, currentPrice: 176.32, currency: 'USD', dayChange: 1.17 },
    { id: 'ayar', symbol: 'AYAR', name: 'Ayar Gold Fund', type: 'fund', quantity: 4200, averagePrice: 228000, currentPrice: 246500, currency: 'IRR', dayChange: -0.46 },
    { id: 'cash', symbol: 'USD', name: 'Cash reserve', type: 'cash', quantity: 1, averagePrice: 12400, currentPrice: 12400, currency: 'USD', dayChange: 0 },
    { id: 'home', symbol: 'HOME', name: 'Primary property', type: 'property', quantity: 1, averagePrice: 126000, currentPrice: 142000, currency: 'USD', dayChange: 0 },
  ],
  habits: [
    { id: 'h1', name: 'Deep work', target: 5, completedDates: [today(), day(-1), day(-3)] },
    { id: 'h2', name: 'Train or walk', target: 6, completedDates: [today(), day(-1), day(-2), day(-4)] },
    { id: 'h3', name: 'Read 20 pages', target: 5, completedDates: [day(-1), day(-2), day(-3)] },
    { id: 'h4', name: 'No late scrolling', target: 7, completedDates: [today(), day(-2), day(-3), day(-4)] },
  ],
  tasks: [
    { id: 't1', title: 'Review monthly allocation', project: 'Wealth system', due: today(), priority: 'high', done: false },
    { id: 't2', title: 'Plan next training block', project: 'Health', due: day(1), priority: 'medium', done: false },
    { id: 't3', title: 'Read market notes', project: 'Learning', due: today(), priority: 'low', done: true },
  ],
  activities: [
    { id: 'a1', title: 'Upper body', category: 'Fitness', minutes: 68, date: today() },
    { id: 'a2', title: 'Product design', category: 'Learning', minutes: 45, date: day(-1) },
    { id: 'a3', title: 'Meditation', category: 'Mindfulness', minutes: 12, date: day(-1) },
  ],
  mentorNotes: [
    { id: 'm1', title: 'There is always a way', body: 'همیشه راهی هست. When the route is unclear, define the destination first and keep looking for the next workable move.', category: 'Mindset', pinned: true, createdAt: '2026-08-25' },
    { id: 'm2', title: 'Turn intention into a roadmap', body: 'کارهای بزرگ نیاز به نقشه راه دارد؛ باید ریتم داشته باشی. Translate the desired outcome into a repeatable weekly rhythm.', category: 'Practice', pinned: true, createdAt: '2026-08-25' },
    { id: 'm3', title: 'Protect liquidity', body: 'هرگز از نقدینگی خارج نشو. Keep enough cash available to act when a genuinely undervalued opportunity appears.', category: 'Wealth', pinned: true, createdAt: '2026-08-25' },
    { id: 'm4', title: 'Independent positions', body: 'Treat each position as its own decision. Define both price risk and time risk before entry, then review the thesis independently.', category: 'Markets', pinned: false, createdAt: '2026-08-25' },
    { id: 'm5', title: 'Fundamental before tactical', body: 'Start from the world, then region, country, industry, and company. Technical and fundamental analysis should confirm rather than replace each other.', category: 'Markets', pinned: false, createdAt: '2026-08-25' },
    { id: 'm6', title: 'Identity is a direction', body: 'نگو من کی بودم، بگو کی می‌خواهم باشم؟ Let current choices be evidence for the person you are becoming.', category: 'Mindset', pinned: false, createdAt: '2026-08-25' },
  ],
};

type Store = WorkspaceData & {
  hydrated: boolean;
  toggleHabit(id: string): void;
  toggleTask(id: string): void;
  addAsset(asset: Omit<Asset, 'id'>): void;
  removeAsset(id: string): void;
  addTask(task: Omit<Task, 'id' | 'done'>): void;
  addActivity(activity: Omit<Activity, 'id'>): void;
  setBaseCurrency(currency: Currency): void;
  setTheme(theme: ThemeId): void;
  setDisplayName(name: string): void;
  addMentorNote(note: Omit<MentorNote, 'id' | 'createdAt'>): void;
  removeMentorNote(id: string): void;
  toggleMentorNotePin(id: string): void;
  turnMentorNoteIntoTask(id: string): void;
  replaceData(data: WorkspaceData): void;
  reset(): void;
};

const StoreContext = createContext<Store | null>(null);
const storageKey = 'sjd-project-workspace-v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(seed);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<WorkspaceData>;
        setData({ ...seed, ...parsed, mentorNotes: Array.isArray(parsed.mentorNotes) ? parsed.mentorNotes : seed.mentorNotes, theme: parsed.theme || 'midnight' });
      }
    } catch { /* keep safe demo */ }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(storageKey, JSON.stringify(data)); }, [data, hydrated]);
  useEffect(() => {
    document.documentElement.dataset.theme = data.theme;
    document.documentElement.style.colorScheme = data.theme === 'polar' || data.theme === 'sandstone' ? 'light' : 'dark';
  }, [data.theme]);

  const value = useMemo<Store>(() => ({ ...data, hydrated,
    toggleHabit: (id) => setData(current => ({ ...current, habits: current.habits.map(habit => habit.id !== id ? habit : ({ ...habit, completedDates: habit.completedDates.includes(today()) ? habit.completedDates.filter(date => date !== today()) : [...habit.completedDates, today()] })) })),
    toggleTask: (id) => setData(current => ({ ...current, tasks: current.tasks.map(task => task.id === id ? { ...task, done: !task.done } : task) })),
    addAsset: (asset) => setData(current => ({ ...current, assets: [...current.assets, { ...asset, id: crypto.randomUUID() }] })),
    removeAsset: (id) => setData(current => ({ ...current, assets: current.assets.filter(asset => asset.id !== id) })),
    addTask: (task) => setData(current => ({ ...current, tasks: [...current.tasks, { ...task, id: crypto.randomUUID(), done: false }] })),
    addActivity: (activity) => setData(current => ({ ...current, activities: [{ ...activity, id: crypto.randomUUID() }, ...current.activities] })),
    setBaseCurrency: (baseCurrency) => setData(current => ({ ...current, baseCurrency })),
    setTheme: (theme) => setData(current => ({ ...current, theme })),
    setDisplayName: (displayName) => setData(current => ({ ...current, displayName })),
    addMentorNote: (note) => setData(current => ({ ...current, mentorNotes: [{ ...note, id: crypto.randomUUID(), createdAt: today() }, ...current.mentorNotes] })),
    removeMentorNote: (id) => setData(current => ({ ...current, mentorNotes: current.mentorNotes.filter(note => note.id !== id) })),
    toggleMentorNotePin: (id) => setData(current => ({ ...current, mentorNotes: current.mentorNotes.map(note => note.id === id ? { ...note, pinned: !note.pinned } : note) })),
    turnMentorNoteIntoTask: (id) => setData(current => { const note = current.mentorNotes.find(item => item.id === id); return note ? { ...current, tasks: [{ id: crypto.randomUUID(), title: `Apply: ${note.title}`, project: 'Dr. Majed', due: today(), priority: 'medium', done: false }, ...current.tasks] } : current; }),
    replaceData: setData,
    reset: () => setData(seed),
  }), [data, hydrated]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}
