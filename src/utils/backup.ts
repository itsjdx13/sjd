import type { AppData } from '../types/finance';

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function dateStamp() { return new Date().toISOString().slice(0, 10); }

export function exportJson(data: AppData) {
  download(JSON.stringify(data, null, 2), `portfolio-backup-${dateStamp()}.json`, 'application/json');
}

export function exportCsv(data: AppData) {
  const headers = ['name', 'symbol', 'type', 'market', 'quantity', 'averageBuyPrice', 'currentPrice', 'currency', 'priceSource', 'lastUpdated'];
  const rows = data.assets.map((asset) => headers.map((key) => JSON.stringify(String(asset[key as keyof typeof asset] ?? ''))).join(','));
  download([headers.join(','), ...rows].join('\n'), `portfolio-${dateStamp()}.csv`, 'text/csv;charset=utf-8');
}

export async function readBackup(file: File): Promise<AppData> {
  const value: unknown = JSON.parse(await file.text());
  if (!value || typeof value !== 'object') throw new Error('This is not a valid Northstar backup.');
  const candidate = value as Partial<AppData>;
  const validAssets = Array.isArray(candidate.assets) && candidate.assets.every((asset) => asset && typeof asset.id === 'string' && typeof asset.name === 'string' && typeof asset.symbol === 'string' && typeof asset.quantity === 'number' && Number.isFinite(asset.quantity) && typeof asset.currentPrice === 'number' && Number.isFinite(asset.currentPrice));
  if (candidate.version !== 1 || !validAssets || !Array.isArray(candidate.transactions) || !Array.isArray(candidate.watchlist) || !candidate.preferences || typeof candidate.preferences.baseCurrency !== 'string') throw new Error('This is not a valid Northstar backup.');
  return value as AppData;
}
