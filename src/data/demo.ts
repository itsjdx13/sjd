import type { AppData } from '../types/finance';

const now = new Date().toISOString();

export const demoData: AppData = {
  version: 1,
  updatedAt: now,
  preferences: {
    baseCurrency: 'USD', theme: 'system', valuesHidden: false,
    compactNumbers: false, refreshMinutes: 5, usdIrrRate: 840000, tsetmcEnabled: false
  },
  transactions: [],
  assets: [
    { id: 'demo-btc', symbol: 'BTC', name: 'Bitcoin', assetType: 'crypto', market: 'Crypto', quantity: 0.42, averageBuyPrice: 42500, currency: 'USD', currentPrice: 64280, dailyChangePercent: 2.4, priceSource: 'coingecko', providerId: 'bitcoin', lastUpdated: now, isDemo: true },
    { id: 'demo-eth', symbol: 'ETH', name: 'Ethereum', assetType: 'crypto', market: 'Crypto', quantity: 3.2, averageBuyPrice: 2180, currency: 'USD', currentPrice: 3460, dailyChangePercent: -0.8, priceSource: 'coingecko', providerId: 'ethereum', lastUpdated: now, isDemo: true },
    { id: 'demo-gold', symbol: 'XAU', name: 'Gold', assetType: 'gold', market: 'Metals', quantity: 4.5, averageBuyPrice: 1910, currency: 'USD', currentPrice: 2435, dailyChangePercent: 0.34, priceSource: 'gold_api', providerId: 'XAU', lastUpdated: now, isDemo: true },
    { id: 'demo-aapl', symbol: 'AAPL', name: 'Apple', assetType: 'stock', market: 'NASDAQ', quantity: 32, averageBuyPrice: 152, currency: 'USD', currentPrice: 224.2, dailyChangePercent: 1.12, priceSource: 'alpha_vantage', lastUpdated: now, isDemo: true },
    { id: 'demo-ayar', symbol: 'عیار', name: 'Ayar Gold Fund', assetType: 'fund', market: 'TSETMC', quantity: 25000, averageBuyPrice: 16800, currency: 'IRR', currentPrice: 21450, dailyChangePercent: 0.61, priceSource: 'manual', lastUpdated: now, notes: 'Manual holding with a replaceable market-price provider.', isDemo: true },
    { id: 'demo-cash', symbol: 'USD', name: 'Cash reserve', assetType: 'cash', market: 'Manual', quantity: 1, averageBuyPrice: 20000, currency: 'USD', currentPrice: 20000, priceSource: 'manual', lastUpdated: now, isDemo: true },
    { id: 'demo-home', symbol: 'HOME', name: 'Apartment', assetType: 'real_estate', market: 'Physical', quantity: 1, averageBuyPrice: 120000, currency: 'USD', currentPrice: 155000, priceSource: 'manual', lastUpdated: now, ownershipPercent: 100, purchaseDate: '2021-04-12', isDemo: true },
    { id: 'demo-loan', symbol: 'LOAN', name: 'Property loan', assetType: 'liability', market: 'Manual', quantity: 1, averageBuyPrice: 38000, currency: 'USD', currentPrice: 38000, priceSource: 'manual', lastUpdated: now, isDemo: true }
  ],
  watchlist: [
    { id: 'watch-btc', symbol: 'BTC', name: 'Bitcoin', currency: 'USD', priceSource: 'coingecko', providerId: 'bitcoin', price: 64280, dailyChangePercent: 2.4, lastUpdated: now },
    { id: 'watch-gold', symbol: 'XAU', name: 'Gold', currency: 'USD', priceSource: 'gold_api', providerId: 'XAU', price: 2435, dailyChangePercent: 0.34, lastUpdated: now },
    { id: 'watch-ayar', symbol: 'عیار', name: 'Ayar', currency: 'IRR', priceSource: 'manual', price: 21450, dailyChangePercent: 0.61, lastUpdated: now },
    { id: 'watch-aapl', symbol: 'AAPL', name: 'Apple', currency: 'USD', priceSource: 'alpha_vantage', price: 224.2, dailyChangePercent: 1.12, lastUpdated: now }
  ]
};
