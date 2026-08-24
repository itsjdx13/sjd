import type { AssetSearchResult } from '../types/finance';

export const assetCatalog: AssetSearchResult[] = [
  { symbol: 'BTC', name: 'Bitcoin', assetType: 'crypto', market: 'Crypto', currency: 'USD', priceSource: 'coingecko', providerId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', assetType: 'crypto', market: 'Crypto', currency: 'USD', priceSource: 'coingecko', providerId: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', assetType: 'crypto', market: 'Crypto', currency: 'USD', priceSource: 'coingecko', providerId: 'solana' },
  { symbol: 'USDT', name: 'Tether', assetType: 'crypto', market: 'Crypto', currency: 'USD', priceSource: 'coingecko', providerId: 'tether' },
  { symbol: 'XAU', name: 'Gold ounce', assetType: 'gold', market: 'Metals', currency: 'USD', priceSource: 'gold_api', providerId: 'XAU' },
  { symbol: 'XAG', name: 'Silver ounce', assetType: 'gold', market: 'Metals', currency: 'USD', priceSource: 'gold_api', providerId: 'XAG' },
  { symbol: 'AAPL', name: 'Apple', assetType: 'stock', market: 'NASDAQ', currency: 'USD', priceSource: 'alpha_vantage' },
  { symbol: 'MSFT', name: 'Microsoft', assetType: 'stock', market: 'NASDAQ', currency: 'USD', priceSource: 'alpha_vantage' },
  { symbol: 'NVDA', name: 'NVIDIA', assetType: 'stock', market: 'NASDAQ', currency: 'USD', priceSource: 'alpha_vantage' },
  { symbol: 'TSLA', name: 'Tesla', assetType: 'stock', market: 'NASDAQ', currency: 'USD', priceSource: 'alpha_vantage' },
  { symbol: 'AMZN', name: 'Amazon', assetType: 'stock', market: 'NASDAQ', currency: 'USD', priceSource: 'alpha_vantage' },
  { symbol: 'META', name: 'Meta', assetType: 'stock', market: 'NASDAQ', currency: 'USD', priceSource: 'alpha_vantage' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', assetType: 'fund', market: 'NYSE Arca', currency: 'USD', priceSource: 'alpha_vantage' },
  { symbol: 'QQQ', name: 'Invesco QQQ', assetType: 'fund', market: 'NASDAQ', currency: 'USD', priceSource: 'alpha_vantage' },
  { symbol: 'عیار', name: 'Ayar Gold Fund', assetType: 'fund', market: 'Iran Fara Bourse', currency: 'IRR', priceSource: 'tsetmc', providerId: '34144395039913458' },
  { symbol: 'USD/IRR', name: 'US Dollar / Iranian Rial', assetType: 'currency', market: 'FX', currency: 'IRR', priceSource: 'manual' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', assetType: 'currency', market: 'FX', currency: 'USD', priceSource: 'manual' }
];

export function searchCatalog(query: string): AssetSearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return assetCatalog.slice(0, 8);
  return assetCatalog.filter((item) => `${item.symbol} ${item.name}`.toLocaleLowerCase().includes(normalized)).slice(0, 8);
}
