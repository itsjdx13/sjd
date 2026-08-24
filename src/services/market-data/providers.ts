import { searchCatalog } from '../../data/catalog';
import type { AssetSearchResult, CurrencyCode, MarketDataProvider, PriceSource, Quote } from '../../types/finance';

async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > 2_000_000) throw new Error('Provider response exceeded the safety limit.');
    return await response.json() as unknown;
  } finally {
    window.clearTimeout(timeout);
  }
}

abstract class BaseProvider implements MarketDataProvider {
  abstract readonly id: PriceSource;
  async searchAssets(query: string): Promise<AssetSearchResult[]> { return searchCatalog(query).filter((item) => item.priceSource === this.id); }
  abstract getQuote(symbol: string, providerId?: string): Promise<Quote>;
  async getQuotes(symbols: Array<{ symbol: string; providerId?: string }>) { return Promise.all(symbols.map((item) => this.getQuote(item.symbol, item.providerId))); }
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
    const data = await fetchJson(`https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceInfo/${encodeURIComponent(providerId)}`) as { closingPriceInfo?: { pClosing?: number; pDrCotVal?: number; priceChangePercent?: number; dEven?: number } };
    const row = data.closingPriceInfo;
    const price = row?.pClosing ?? row?.pDrCotVal;
    if (!price) throw new Error(`No TSETMC quote for ${symbol}`);
    return { symbol, price, currency: 'IRR' as const, changePercent: row?.priceChangePercent, source: this.id, timestamp: new Date().toISOString(), delayed: true };
  }
}

export async function fetchConventionalFx(base: CurrencyCode): Promise<{ rates: Partial<Record<CurrencyCode, number>>; timestamp: string }> {
  const supported = ['USD', 'EUR', 'GBP'].filter((code) => code !== base).join(',');
  const data = await fetchJson(`https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${supported}`) as Array<{ quote: CurrencyCode; rate: number; date: string }>;
  const rates: Partial<Record<CurrencyCode, number>> = { [base]: 1 };
  for (const row of data) rates[row.quote] = row.rate;
  return { rates, timestamp: data[0]?.date ? new Date(`${data[0].date}T00:00:00Z`).toISOString() : new Date().toISOString() };
}
