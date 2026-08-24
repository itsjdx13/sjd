import { searchCatalog } from '../../data/catalog';
import type { AssetSearchResult, CurrencyCode, MarketDataProvider, PriceSource, Quote } from '../../types/finance';

async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > 2_000_000) throw new Error('Provider response exceeded the safety limit.');
    const body = await response.text();
    if (body.length > 2_000_000) throw new Error('Provider response exceeded the safety limit.');
    try { return JSON.parse(body) as unknown; }
    catch { throw new Error('Provider returned invalid JSON.'); }
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

abstract class BaseProvider implements MarketDataProvider {
  abstract readonly id: PriceSource;
  async searchAssets(query: string): Promise<AssetSearchResult[]> { return searchCatalog(query).filter((item) => item.priceSource === this.id); }
  abstract getQuote(symbol: string, providerId?: string): Promise<Quote>;
  async getQuotes(symbols: Array<{ symbol: string; providerId?: string }>) {
    const results = await Promise.allSettled(symbols.map((item) => this.getQuote(item.symbol, item.providerId)));
    const quotes = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    if (!quotes.length) {
      const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      throw failure?.reason instanceof Error ? failure.reason : new Error(`${this.id} quotes failed`);
    }
    return quotes;
  }
}

export class CoinGeckoProvider extends BaseProvider {
  readonly id = 'coingecko' as const;
  async getQuote(symbol: string, providerId = symbol.toLowerCase()) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(providerId)}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const data = await fetchJson(url) as Record<string, { usd?: number; usd_24h_change?: number; last_updated_at?: number }>;
    const item = data[providerId];
    if (!item?.usd) throw new Error(`No CoinGecko quote for ${symbol}`);
    return { symbol, price: item.usd, currency: 'USD' as const, changePercent: item.usd_24h_change, source: this.id, timestamp: item.last_updated_at ? new Date(item.last_updated_at * 1000).toISOString() : new Date().toISOString() };
  }
  async getQuotes(symbols: Array<{ symbol: string; providerId?: string }>) {
    if (!symbols.length) return [];
    const ids = symbols.map((item) => item.providerId ?? item.symbol.toLowerCase());
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(',')}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const data = await fetchJson(url) as Record<string, { usd?: number; usd_24h_change?: number; last_updated_at?: number }>;
    return symbols.flatMap((item, index) => {
      const quote = data[ids[index]];
      return quote?.usd ? [{ symbol: item.symbol, price: quote.usd, currency: 'USD' as const, changePercent: quote.usd_24h_change, source: this.id, timestamp: quote.last_updated_at ? new Date(quote.last_updated_at * 1000).toISOString() : new Date().toISOString() }] : [];
    });
  }
}

export class GoldProvider extends BaseProvider {
  readonly id = 'gold_api' as const;
  async getQuote(symbol: string, providerId = symbol) {
    const data = await fetchJson(`https://api.gold-api.com/price/${encodeURIComponent(providerId)}`) as { price?: number; updatedAt?: string; timestamp?: number };
    if (!data.price) throw new Error(`No metals quote for ${symbol}`);
    return { symbol, price: data.price, currency: 'USD' as const, source: this.id, timestamp: data.updatedAt ?? (data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString()) };
  }
}

export class AlphaVantageProvider extends BaseProvider {
  readonly id = 'alpha_vantage' as const;
  private readonly key = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string | undefined;
  async getQuote(symbol: string) {
    if (!this.key) throw new Error('Add VITE_ALPHA_VANTAGE_API_KEY to enable delayed stock quotes.');
    const data = await fetchJson(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(this.key)}`) as { 'Global Quote'?: Record<string, string>; Note?: string };
    const row = data['Global Quote'];
    const price = Number(row?.['05. price']);
    if (!price) throw new Error(data.Note ?? `No stock quote for ${symbol}`);
    return { symbol, price, currency: 'USD' as const, changePercent: Number(row?.['10. change percent']?.replace('%', '')), source: this.id, timestamp: new Date().toISOString(), delayed: true };
  }
}

export class TsetmcProvider extends BaseProvider {
  readonly id = 'tsetmc' as const;
  async getQuote(symbol: string, providerId?: string) {
    if (!providerId) throw new Error(`TSETMC instrument code is required for ${symbol}`);
    if (!/^\d{15,20}$/.test(providerId)) throw new Error(`Invalid TSETMC instrument code for ${symbol}`);
    const data = await fetchJson(`https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceInfo/${providerId}`) as { closingPriceInfo?: TsetmcClosingPriceInfo };
    const row = data.closingPriceInfo;
    if (!row) throw new Error(`No TSETMC quote for ${symbol}`);
    return parseTsetmcQuote(symbol, row);
  }
}

export interface TsetmcClosingPriceInfo {
  pClosing?: number;
  pDrCotVal?: number;
  priceYesterday?: number;
  priceChangePercent?: number;
  dEven?: number;
  hEven?: number;
}

export function tsetmcTimestamp(dEven?: number, hEven?: number): string {
  const date = String(dEven ?? '');
  if (!/^\d{8}$/.test(date)) return new Date().toISOString();
  const time = String(hEven ?? 0).padStart(6, '0');
  const parsed = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}+03:30`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function parseTsetmcQuote(symbol: string, row: TsetmcClosingPriceInfo): Quote {
  const price = row.pDrCotVal ?? row.pClosing;
  if (!Number.isFinite(price) || (price ?? 0) <= 0) throw new Error(`No TSETMC quote for ${symbol}`);
  const changePercent = row.priceYesterday && row.priceYesterday > 0
    ? ((price! - row.priceYesterday) / row.priceYesterday) * 100
    : row.priceChangePercent;
  return { symbol, price: price!, currency: 'IRR', changePercent, source: 'tsetmc', timestamp: tsetmcTimestamp(row.dEven, row.hEven), delayed: true };
}

export async function fetchConventionalFx(base: CurrencyCode): Promise<{ rates: Partial<Record<CurrencyCode, number>>; timestamp: string }> {
  const supported = ['USD', 'EUR', 'GBP'].filter((code) => code !== base).join(',');
  const data = await fetchJson(`https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${supported}`) as Array<{ quote: CurrencyCode; rate: number; date: string }>;
  const rates: Partial<Record<CurrencyCode, number>> = { [base]: 1 };
  for (const row of data) rates[row.quote] = row.rate;
  return { rates, timestamp: data[0]?.date ? new Date(`${data[0].date}T00:00:00Z`).toISOString() : new Date().toISOString() };
}
