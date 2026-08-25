'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Activity, Asset, Currency, Habit, Task, WorkspaceData } from './types';

const today = () => new Date().toISOString().slice(0, 10);
const day = (offset: number) => {
  const value = new Date();
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
};

const seed: WorkspaceData = {
  displayName: 'Sajad', baseCurrency: 'USD',
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
  setDisplayName(name: string): void;
  replaceData(data: WorkspaceData): void;
  reset(): void;
};

const StoreContext = createContext<Store | null>(null);
const storageKey = 'sjd-project-workspace-v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(seed);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try { const saved = localStorage.getItem(storageKey); if (saved) setData(JSON.parse(saved)); } catch { /* keep safe demo */ }
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(storageKey, JSON.stringify(data)); }, [data, hydrated]);

  const value = useMemo<Store>(() => ({ ...data, hydrated,
    toggleHabit: (id) => setData(current => ({ ...current, habits: current.habits.map(habit => habit.id !== id ? habit : ({ ...habit, completedDates: habit.completedDates.includes(today()) ? habit.completedDates.filter(date => date !== today()) : [...habit.completedDates, today()] })) })),
    toggleTask: (id) => setData(current => ({ ...current, tasks: current.tasks.map(task => task.id === id ? { ...task, done: !task.done } : task) })),
    addAsset: (asset) => setData(current => ({ ...current, assets: [...current.assets, { ...asset, id: crypto.randomUUID() }] })),
    removeAsset: (id) => setData(current => ({ ...current, assets: current.assets.filter(asset => asset.id !== id) })),
    addTask: (task) => setData(current => ({ ...current, tasks: [...current.tasks, { ...task, id: crypto.randomUUID(), done: false }] })),
    addActivity: (activity) => setData(current => ({ ...current, activities: [{ ...activity, id: crypto.randomUUID() }, ...current.activities] })),
    setBaseCurrency: (baseCurrency) => setData(current => ({ ...current, baseCurrency })),
    setDisplayName: (displayName) => setData(current => ({ ...current, displayName })),
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
