import type { WorkspaceData } from './types';

const themes = new Set(['midnight', 'terminal', 'aurora', 'polar', 'sandstone']);
const currencies = new Set(['USD', 'EUR', 'GBP', 'AED', 'IRR', 'IRT']);
const isString = (value: unknown, max = 500) => typeof value === 'string' && value.length <= max;
const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

export function isWorkspaceData(value: unknown): value is WorkspaceData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<WorkspaceData>;
  if (!isString(data.displayName, 60) || !currencies.has(data.baseCurrency || '') || !themes.has(data.theme || '')) return false;
  if (!Array.isArray(data.assets) || data.assets.length > 2_000 || !data.assets.every(asset => asset && isString(asset.id, 100) && isString(asset.symbol, 30) && isString(asset.name, 160) && isNumber(asset.quantity) && isNumber(asset.averagePrice) && isNumber(asset.currentPrice) && isNumber(asset.dayChange))) return false;
  if (!Array.isArray(data.habits) || data.habits.length > 500 || !data.habits.every(habit => habit && isString(habit.id, 100) && isString(habit.name, 160) && isNumber(habit.target) && Array.isArray(habit.completedDates))) return false;
  if (!Array.isArray(data.tasks) || data.tasks.length > 5_000 || !data.tasks.every(task => task && isString(task.id, 100) && isString(task.title, 300) && isString(task.project, 120) && isString(task.due, 20) && typeof task.done === 'boolean')) return false;
  if (!Array.isArray(data.activities) || data.activities.length > 5_000 || !data.activities.every(activity => activity && isString(activity.id, 100) && isString(activity.title, 300) && isNumber(activity.minutes) && isString(activity.date, 20))) return false;
  if (!Array.isArray(data.mentorNotes) || data.mentorNotes.length > 2_000 || !data.mentorNotes.every(note => note && isString(note.id, 100) && isString(note.title, 300) && isString(note.body, 200_000) && typeof note.pinned === 'boolean' && isString(note.createdAt, 20))) return false;
  if (!Array.isArray(data.resources) || data.resources.length > 2_000 || !data.resources.every(resource => resource && isString(resource.id, 100) && isString(resource.title, 300) && isString(resource.fileName, 300) && isString(resource.content, 1_000_000) && isString(resource.createdAt, 20) && isString(resource.updatedAt, 20))) return false;
  return true;
}
