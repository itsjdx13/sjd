export const assetTypes = [
  'crypto', 'stock', 'iran_stock', 'fund', 'gold', 'currency', 'cash',
  'real_estate', 'vehicle', 'commodity', 'custom', 'liability'
] as const;

export type AssetType = (typeof assetTypes)[number];
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AED' | 'IRR' | 'IRT';
export type PriceSource = 'coingecko' | 'alpha_vantage' | 'gold_api' | 'tsetmc' | 'manual';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  market: string;
  quantity: number;
  averageBuyPrice: number;
  currency: CurrencyCode;
  currentPrice: number;
  priceSource: PriceSource;
  providerId?: string;
  dailyChangePercent?: number;
  lastUpdated: string;
  purchaseDate?: string;
  ownershipPercent?: number;
  notes?: string;
  isDemo?: boolean;
}

export type TransactionType = 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'dividend' | 'interest' | 'fee' | 'transfer' | 'adjustment';

export interface Transaction {
  id: string;
  assetId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fees: number;
  timestamp: string;
  notes?: string;
}

export interface WatchItem {
  id: string;
  symbol: string;
  name: string;
  currency: CurrencyCode;
  priceSource: PriceSource;
  providerId?: string;
  price: number;
  dailyChangePercent?: number;
  lastUpdated: string;
}

export interface Preferences {
  baseCurrency: CurrencyCode;
  theme: 'light' | 'dark' | 'system';
  valuesHidden: boolean;
  compactNumbers: boolean;
  refreshMinutes: number;
  usdIrrRate: number;
  tsetmcEnabled: boolean;
  fxRates?: Partial<Record<CurrencyCode, number>>;
  fxLastUpdated?: string;
}

export interface AppData {
  version: 1;
  assets: Asset[];
  transactions: Transaction[];
  watchlist: WatchItem[];
  preferences: Preferences;
  updatedAt: string;
}

export interface Quote {
  symbol: string;
  price: number;
  currency: CurrencyCode;
  changePercent?: number;
  source: PriceSource;
  timestamp: string;
  delayed?: boolean;
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  assetType: AssetType;
  market: string;
  currency: CurrencyCode;
  priceSource: PriceSource;
  providerId?: string;
}

export interface MarketDataProvider {
  readonly id: PriceSource;
  searchAssets(query: string): Promise<AssetSearchResult[]>;
  getQuote(symbol: string, providerId?: string): Promise<Quote>;
  getQuotes(symbols: Array<{ symbol: string; providerId?: string }>): Promise<Quote[]>;
}
