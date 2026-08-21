import type { CurrencyCode } from '../types/finance';

export function formatMoney(value: number, currency: CurrencyCode, compact = false): string {
  const abs = Math.abs(value);
  if (compact && abs >= 1_000_000) {
    return `${value < 0 ? '-' : ''}${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(abs)} ${currency}`;
  }
  if (currency === 'IRR' || currency === 'IRT') return `${new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(value)} ${currency}`;
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: abs < 10 ? 2 : 0 }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function relativeTime(timestamp: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}
