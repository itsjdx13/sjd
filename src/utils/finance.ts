import type { Asset, AssetType, CurrencyCode } from '../types/finance';

export type FxRates = Record<CurrencyCode, number>;

export function createFxRates(usdIrrRate: number, conventional: Partial<FxRates> = {}): FxRates {
  return {
    USD: 1,
    EUR: conventional.EUR ?? 0.86,
    GBP: conventional.GBP ?? 0.75,
    AED: conventional.AED ?? 3.6725,
    IRR: usdIrrRate,
    IRT: usdIrrRate / 10
  };
}

export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode, rates: FxRates): number {
  if (!Number.isFinite(amount) || rates[from] <= 0 || rates[to] <= 0) return 0;
  return (amount / rates[from]) * rates[to];
}

export function assetValue(asset: Asset): number {
  const ownership = (asset.ownershipPercent ?? 100) / 100;
  const magnitude = asset.quantity * asset.currentPrice * ownership;
  return asset.assetType === 'liability' ? -Math.abs(magnitude) : magnitude;
}

export function assetCostBasis(asset: Asset): number {
  const ownership = (asset.ownershipPercent ?? 100) / 100;
  const magnitude = asset.quantity * asset.averageBuyPrice * ownership;
  return asset.assetType === 'liability' ? -Math.abs(magnitude) : magnitude;
}

export function portfolioTotals(assets: Asset[], base: CurrencyCode, rates: FxRates) {
  return assets.reduce((totals, asset) => {
    const value = convertCurrency(assetValue(asset), asset.currency, base, rates);
    const cost = convertCurrency(assetCostBasis(asset), asset.currency, base, rates);
    const previousValue = asset.dailyChangePercent == null ? value : value / (1 + asset.dailyChangePercent / 100);
    totals.value += value;
    totals.cost += cost;
    totals.dailyChange += value - previousValue;
    return totals;
  }, { value: 0, cost: 0, dailyChange: 0 });
}

export function allocationByType(assets: Asset[], base: CurrencyCode, rates: FxRates): Array<{ type: AssetType; value: number; percent: number }> {
  const grouped = new Map<AssetType, number>();
  for (const asset of assets) {
    const value = convertCurrency(assetValue(asset), asset.currency, base, rates);
    grouped.set(asset.assetType, (grouped.get(asset.assetType) ?? 0) + value);
  }
  const positiveTotal = [...grouped.values()].filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  return [...grouped.entries()].map(([type, value]) => ({ type, value, percent: value > 0 && positiveTotal ? value / positiveTotal * 100 : 0 })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

export function calculatePositionSize(balance: number, riskPercent: number, stopDistance: number) {
  const riskAmount = balance * riskPercent / 100;
  return { riskAmount, positionSize: stopDistance > 0 ? riskAmount / stopDistance : 0 };
}

export function calculateRiskReward(entry: number, stop: number, target: number, size = 1, side: 'long' | 'short' = 'long') {
  const direction = side === 'long' ? 1 : -1;
  const risk = Math.max(0, (entry - stop) * direction * size);
  const reward = Math.max(0, (target - entry) * direction * size);
  return { risk, reward, ratio: risk > 0 ? reward / risk : 0 };
}

export function calculatePnl(entry: number, exit: number, size: number, side: 'long' | 'short', fees = 0) {
  const gross = (exit - entry) * size * (side === 'long' ? 1 : -1);
  return { gross, net: gross - fees, returnPercent: entry * size ? (gross - fees) / (entry * size) * 100 : 0 };
}

export function calculateMargin(positionValue: number, leverage: number) {
  return leverage > 0 ? positionValue / leverage : 0;
}

export function calculatePipValue(lotSize: number, pipSize = 0.0001, quoteToAccountRate = 1) {
  return lotSize * pipSize * quoteToAccountRate;
}
