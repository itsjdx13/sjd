import type { Asset, Currency } from './types';

export const rates: Record<Currency, number> = {
  USD: 1, EUR: 0.86, GBP: 0.75, AED: 3.6725, IRR: 920000, IRT: 92000,
};

export function convert(amount: number, from: Currency, to: Currency) {
  return (amount / rates[from]) * rates[to];
}

export function assetValue(asset: Asset, base: Currency) {
  const value = asset.quantity * asset.currentPrice * (asset.type === 'liability' ? -1 : 1);
  return convert(value, asset.currency, base);
}

export function assetCost(asset: Asset, base: Currency) {
  const value = asset.quantity * asset.averagePrice * (asset.type === 'liability' ? -1 : 1);
  return convert(value, asset.currency, base);
}

export function portfolioSummary(assets: Asset[], base: Currency) {
  return assets.reduce((summary, asset) => {
    const value = assetValue(asset, base);
    const cost = assetCost(asset, base);
    const prior = value / (1 + asset.dayChange / 100);
    summary.value += value;
    summary.cost += cost;
    summary.day += value - prior;
    return summary;
  }, { value: 0, cost: 0, day: 0 });
}

export function formatMoney(value: number, currency: Currency, compact = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency === 'IRT' ? 'IRR' : currency,
    notation: compact ? 'compact' : 'standard', maximumFractionDigits: currency === 'IRR' || currency === 'IRT' ? 0 : 2,
  }).format(value).replace('IRR', currency);
}
