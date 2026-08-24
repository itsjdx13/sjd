import { useCallback, useEffect, useMemo, useState } from 'react';
import { demoData } from '../data/demo';
import { marketDataService } from '../services/market-data/market-data-service';
import { upgradeKnownMarketData } from '../services/market-data/migrations';
import { localStorageProvider } from '../services/storage/storage';
import type { AppData, Asset, Preferences, WatchItem } from '../types/finance';

function cloneDemo(): AppData { return structuredClone(demoData); }

export function usePortfolio() {
  const [data, setData] = useState<AppData>(cloneDemo);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('Loading local portfolio…');

  useEffect(() => {
    localStorageProvider.load().then((stored) => {
      setData(stored ? upgradeKnownMarketData(stored) : cloneDemo());
      setReady(true);
      setStatus(stored ? 'Local portfolio loaded' : 'Demo portfolio — stored on this device');
    }).catch(() => { setReady(true); setStatus('Temporary session — local database unavailable'); });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void localStorageProvider.save({ ...data, updatedAt: new Date().toISOString() }).catch(() => setStatus('Changes could not be persisted on this device'));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [data, ready]);

  const refresh = useCallback(async (force = false) => {
    if (refreshing) return;
    setRefreshing(true);
    setStatus(navigator.onLine ? 'Refreshing prices…' : 'Offline — showing cached prices');
    try {
      const watchAssets: Asset[] = data.watchlist.map((item) => ({ ...item, id: item.id, assetType: 'custom', market: 'Watchlist', quantity: 0, averageBuyPrice: 0, currentPrice: item.price }));
      const result = await marketDataService.refreshAssets([...data.assets, ...watchAssets], force, data.preferences.tsetmcEnabled);
      const quoteMap = new Map(result.quotes.map((quote) => [quote.symbol, quote]));
      setData((current) => ({
        ...current,
        assets: current.assets.map((asset) => {
          const quote = quoteMap.get(asset.symbol);
          return quote ? { ...asset, currentPrice: quote.price, currency: quote.currency, dailyChangePercent: quote.changePercent, lastUpdated: quote.timestamp } : asset;
        }),
        watchlist: current.watchlist.map((item) => {
          const quote = quoteMap.get(item.symbol);
          return quote ? { ...item, price: quote.price, currency: quote.currency, dailyChangePercent: quote.changePercent, lastUpdated: quote.timestamp } : item;
        })
      }));
      const errors = [...new Set(result.errors)];
      setStatus(errors.length ? `Cached prices retained · ${errors[0]}` : 'Prices updated');
    } catch { setStatus('Provider unavailable — cached prices retained'); }
    finally { setRefreshing(false); }
  }, [data.assets, data.preferences.tsetmcEnabled, data.watchlist, refreshing]);

  const addAsset = useCallback((asset: Asset) => setData((current) => ({ ...current, assets: [...current.assets, asset] })), []);
  const updateAsset = useCallback((asset: Asset) => setData((current) => ({ ...current, assets: current.assets.map((item) => item.id === asset.id ? asset : item) })), []);
  const deleteAsset = useCallback((id: string) => setData((current) => ({ ...current, assets: current.assets.filter((item) => item.id !== id) })), []);
  const removeDemo = useCallback(() => setData((current) => ({ ...current, assets: current.assets.filter((item) => !item.isDemo), watchlist: current.watchlist.filter((item) => !item.id.startsWith('watch-')) })), []);
  const updatePreferences = useCallback((preferences: Partial<Preferences>) => setData((current) => ({ ...current, preferences: { ...current.preferences, ...preferences } })), []);
  const replaceData = useCallback((next: AppData) => setData(next), []);
  const addWatchItem = useCallback((item: WatchItem) => setData((current) => ({ ...current, watchlist: current.watchlist.some((existing) => existing.symbol === item.symbol) ? current.watchlist : [...current.watchlist, item] })), []);
  const deleteWatchItem = useCallback((id: string) => setData((current) => ({ ...current, watchlist: current.watchlist.filter((item) => item.id !== id) })), []);

  return useMemo(() => ({ data, ready, refreshing, status, refresh, addAsset, updateAsset, deleteAsset, removeDemo, updatePreferences, replaceData, addWatchItem, deleteWatchItem }), [data, ready, refreshing, status, refresh, addAsset, updateAsset, deleteAsset, removeDemo, updatePreferences, replaceData, addWatchItem, deleteWatchItem]);
}
