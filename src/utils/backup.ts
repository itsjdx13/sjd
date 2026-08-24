import { assetTypes, type AppData, type AssetType, type CurrencyCode, type PriceSource } from '../types/finance';

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const MAX_ASSETS = 10_000;
const currencies = new Set<CurrencyCode>(['USD', 'EUR', 'GBP', 'AED', 'IRR', 'IRT']);
const sources = new Set<PriceSource>(['coingecko', 'alpha_vantage', 'gold_api', 'tsetmc', 'manual']);
const types = new Set(assetTypes);

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function safeString(value: unknown, max = 500) { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function safeOptionalString(value: unknown, max = 2_000) { return value === undefined || (typeof value === 'string' && value.length <= max); }
function finite(value: unknown, min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
function validDate(value: unknown) { return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)); }

function validAsset(value: unknown) {
  if (!isRecord(value)) return false;
  return safeString(value.id, 100) && safeString(value.name, 160) && safeString(value.symbol, 80) &&
    types.has(value.assetType as AssetType) && safeString(value.market, 160) && finite(value.quantity, 0) &&
    finite(value.averageBuyPrice, 0) && finite(value.currentPrice, 0) && currencies.has(value.currency as CurrencyCode) &&
    sources.has(value.priceSource as PriceSource) && validDate(value.lastUpdated) && safeOptionalString(value.providerId, 160) &&
    safeOptionalString(value.notes) && (value.ownershipPercent === undefined || finite(value.ownershipPercent, 0, 100));
}

function validTransaction(value: unknown) {
  if (!isRecord(value)) return false;
  return safeString(value.id, 100) && safeString(value.assetId, 100) &&
    ['buy', 'sell', 'deposit', 'withdrawal', 'dividend', 'interest', 'fee', 'transfer', 'adjustment'].includes(String(value.type)) &&
    finite(value.quantity) && finite(value.price, 0) && finite(value.fees, 0) && validDate(value.timestamp) && safeOptionalString(value.notes);
}

function validWatchItem(value: unknown) {
  if (!isRecord(value)) return false;
  return safeString(value.id, 100) && safeString(value.symbol, 80) && safeString(value.name, 160) &&
    currencies.has(value.currency as CurrencyCode) && sources.has(value.priceSource as PriceSource) && finite(value.price, 0) &&
    validDate(value.lastUpdated) && safeOptionalString(value.providerId, 160);
}

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
  const rows = data.assets.map((asset) => headers.map((key) => csvCell(asset[key as keyof typeof asset])).join(','));
  download([headers.join(','), ...rows].join('\n'), `portfolio-${dateStamp()}.csv`, 'text/csv;charset=utf-8');
}

export function csvCell(value: unknown) {
  const text = String(value ?? '');
  const protectedText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return JSON.stringify(protectedText);
}

export function validateBackup(value: unknown): AppData {
  if (!isRecord(value) || value.version !== 1) throw new Error('This is not a valid Northstar backup.');
  if (!Array.isArray(value.assets) || value.assets.length > MAX_ASSETS || !value.assets.every(validAsset)) throw new Error('The backup contains invalid asset data.');
  if (!Array.isArray(value.transactions) || value.transactions.length > 50_000 || !value.transactions.every(validTransaction)) throw new Error('The backup contains invalid transaction data.');
  if (!Array.isArray(value.watchlist) || value.watchlist.length > 1_000 || !value.watchlist.every(validWatchItem)) throw new Error('The backup contains invalid watchlist data.');
  if (!isRecord(value.preferences) || !currencies.has(value.preferences.baseCurrency as CurrencyCode) ||
      !['light', 'dark', 'system'].includes(String(value.preferences.theme)) || typeof value.preferences.valuesHidden !== 'boolean' ||
      typeof value.preferences.compactNumbers !== 'boolean' || !finite(value.preferences.refreshMinutes, 0, 1_440) ||
      !finite(value.preferences.usdIrrRate, 1) || typeof value.preferences.tsetmcEnabled !== 'boolean' || !validDate(value.updatedAt)) {
    throw new Error('The backup contains invalid preferences.');
  }
  return value as unknown as AppData;
}

export async function readBackup(file: File): Promise<AppData> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup is larger than the 5 MB safety limit.');
  try { return validateBackup(JSON.parse(await file.text()) as unknown); }
  catch (error) { if (error instanceof SyntaxError) throw new Error('Backup is not valid JSON.'); throw error; }
}
