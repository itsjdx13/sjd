import type { AppData } from '../../types/finance';

const AYAR_INSTRUMENT_ID = '34144395039913458';
const AYAR_FALLBACK_PRICE_IRR = 590_993;
const AYAR_FALLBACK_CHANGE = 6.8;
const AYAR_FALLBACK_TIMESTAMP = '2026-08-22T00:00:00.000Z';

/** Repairs the original demo Ayar record without changing user-created manual assets. */
export function upgradeKnownMarketData(data: AppData): AppData {
  const hasDemoAyar = data.assets.some((asset) => asset.id === 'demo-ayar' && asset.isDemo);
  const hasDemoAyarWatch = data.watchlist.some((item) => item.id === 'watch-ayar');
  if (!hasDemoAyar && !hasDemoAyarWatch) return data;

  return {
    ...data,
    preferences: { ...data.preferences, tsetmcEnabled: true },
    assets: data.assets.map((asset) => asset.id === 'demo-ayar' && asset.isDemo ? {
      ...asset,
      symbol: 'عیار',
      market: 'Iran Fara Bourse',
      currency: 'IRR',
      currentPrice: asset.currentPrice === 21_450 ? AYAR_FALLBACK_PRICE_IRR : asset.currentPrice,
      dailyChangePercent: asset.currentPrice === 21_450 ? AYAR_FALLBACK_CHANGE : asset.dailyChangePercent,
      priceSource: 'tsetmc',
      providerId: AYAR_INSTRUMENT_ID,
      lastUpdated: asset.currentPrice === 21_450 ? AYAR_FALLBACK_TIMESTAMP : asset.lastUpdated,
      notes: 'Units are entered manually; the public TSETMC quote is Rial per fund unit.'
    } : asset),
    watchlist: data.watchlist.map((item) => item.id === 'watch-ayar' ? {
      ...item,
      symbol: 'عیار',
      currency: 'IRR',
      price: item.price === 21_450 ? AYAR_FALLBACK_PRICE_IRR : item.price,
      dailyChangePercent: item.price === 21_450 ? AYAR_FALLBACK_CHANGE : item.dailyChangePercent,
      priceSource: 'tsetmc',
      providerId: AYAR_INSTRUMENT_ID,
      lastUpdated: item.price === 21_450 ? AYAR_FALLBACK_TIMESTAMP : item.lastUpdated
    } : item)
  };
}
