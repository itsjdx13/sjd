export type Currency = 'USD' | 'EUR' | 'GBP' | 'AED' | 'IRR' | 'IRT';
export type AssetType = 'crypto' | 'stock' | 'fund' | 'gold' | 'cash' | 'property' | 'vehicle' | 'liability';
export type ThemeId = 'midnight' | 'terminal' | 'aurora' | 'polar' | 'sandstone';
export type MentorCategory = 'Mindset' | 'Wealth' | 'Markets' | 'Practice';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  currency: Currency;
  dayChange: number;
}

export interface Habit {
  id: string;
  name: string;
  target: number;
  completedDates: string[];
}

export interface Task {
  id: string;
  title: string;
  project: string;
  due: string;
  priority: 'low' | 'medium' | 'high';
  done: boolean;
}

export interface Activity {
  id: string;
  title: string;
  category: 'Fitness' | 'Learning' | 'Mindfulness' | 'Reading';
  minutes: number;
  date: string;
}

export interface MentorNote {
  id: string;
  title: string;
  body: string;
  category: MentorCategory;
  pinned: boolean;
  createdAt: string;
}

export interface WorkspaceData {
  assets: Asset[];
  habits: Habit[];
  tasks: Task[];
  activities: Activity[];
  displayName: string;
  baseCurrency: Currency;
  theme: ThemeId;
  mentorNotes: MentorNote[];
}
