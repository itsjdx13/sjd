import type { Asset, MarketDataProvider, PriceSource, Quote, WatchItem } from '../../types/finance';
import { AlphaVantageProvider, CoinGeckoProvider, GoldProvider, TsetmcProvider } from './providers';

const CACHE_TTL: Record<PriceSource, number> = {
  coingecko: 60_000,
  alpha_vantage: 5 * 60_000,
  gold_api: 5 * 60_000,
  tsetmc: 5 * 60_000,
  manual: Number.POSITIVE_INFINITY
};

export class MarketDataService {
  private providers = new Map<PriceSource, MarketDataProvider>();
  private inFlight = new Map<string, Promise<Quote[]>>();

  constructor() {
    for (const provider of [new CoinGeckoProvider(), new GoldProvider(), new AlphaVantageProvider(), new TsetmcProvider()]) this.providers.set(provider.id, provider);
  }

  async refreshAssets(assets: Asset[], force = false, tsetmcEnabled = false): Promise<{ quotes: Quote[]; errors: string[] }> {
    const now = Date.now();
    const eligible = assets.filter((asset) => asset.priceSource !== 'manual' && (asset.priceSource !== 'tsetmc' || tsetmcEnabled) && (force || now - new Date(asset.lastUpdated).getTime() >= CACHE_TTL[asset.priceSource]));
    const groups = new Map<PriceSource, Asset[]>();
    for (const asset of eligible) groups.set(asset.priceSource, [...(groups.get(asset.priceSource) ?? []), asset]);
    const quotes: Quote[] = [];
    const errors: string[] = [];
    await Promise.all([...groups].map(async ([source, items]) => {
      const provider = this.providers.get(source);
      if (!provider) return;
      const uniqueItems = items.filter((item, index) => items.findIndex((candidate) => (candidate.providerId ?? candidate.symbol) === (item.providerId ?? item.symbol)) === index);
      const key = `${source}:${uniqueItems.map((item) => item.providerId ?? item.symbol).sort().join(',')}`;
      let request = this.inFlight.get(key);
      if (!request) {
        request = provider.getQuotes(uniqueItems.map(({ symbol, providerId }) => ({ symbol, providerId })));
        this.inFlight.set(key, request);
      }
      try { quotes.push(...await request); }
      catch (error) { errors.push(error instanceof Error ? error.message : `${source} failed`); }
      finally { this.inFlight.delete(key); }
    }));
    return { quotes, errors };
  }

  async refreshWatchlist(items: WatchItem[], force = false, tsetmcEnabled = false) {
    const pseudoAssets: Asset[] = items.map((item) => ({ ...item, id: item.id, assetType: 'custom', market: 'Watchlist', quantity: 0, averageBuyPrice: 0, currentPrice: item.price }));
    return this.refreshAssets(pseudoAssets, force, tsetmcEnabled);
  }
}

export const marketDataService = new MarketDataService();
