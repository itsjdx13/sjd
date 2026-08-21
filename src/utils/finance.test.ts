import { describe, expect, it } from 'vitest';
import { assetValue, calculateMargin, calculatePipValue, calculatePnl, calculatePositionSize, calculateRiskReward, convertCurrency, createFxRates, portfolioTotals } from './finance';
import type { Asset } from '../types/finance';

const rates = createFxRates(800_000, { EUR: 0.8, GBP: 0.7 });
const baseAsset: Asset = { id: '1', symbol: 'TEST', name: 'Test', assetType: 'stock', market: 'Test', quantity: 2, averageBuyPrice: 80, currentPrice: 100, currency: 'USD', priceSource: 'manual', lastUpdated: '2026-08-21T00:00:00Z' };

describe('currency conversion', () => {
  it('converts through a USD-normalized rate table', () => {
    expect(convertCurrency(100, 'USD', 'EUR', rates)).toBe(80);
    expect(convertCurrency(80, 'EUR', 'USD', rates)).toBe(100);
  });

  it('keeps rial and toman explicitly separated by ten', () => {
    expect(convertCurrency(10, 'IRT', 'IRR', rates)).toBe(100);
    expect(convertCurrency(100, 'IRR', 'IRT', rates)).toBe(10);
  });
});

describe('portfolio values', () => {
  it('applies property ownership and subtracts liabilities', () => {
    expect(assetValue({ ...baseAsset, assetType: 'real_estate', currentPrice: 200_000, quantity: 1, ownershipPercent: 50 })).toBe(100_000);
    expect(assetValue({ ...baseAsset, assetType: 'liability', currentPrice: 20_000, quantity: 1 })).toBe(-20_000);
  });

  it('computes net worth, cost, and daily change in the base currency', () => {
    const totals = portfolioTotals([{ ...baseAsset, dailyChangePercent: 10 }, { ...baseAsset, id: '2', assetType: 'liability', quantity: 1, currentPrice: 25, averageBuyPrice: 25 }], 'USD', rates);
    expect(totals.value).toBe(175);
    expect(totals.cost).toBe(135);
    expect(totals.dailyChange).toBeCloseTo(18.1818, 3);
  });
});

describe('trading calculations', () => {
  it('sizes a position from maximum risk', () => expect(calculatePositionSize(10_000, 1, 2.5)).toEqual({ riskAmount: 100, positionSize: 40 }));
  it('calculates long and short P&L after fees', () => {
    expect(calculatePnl(100, 110, 5, 'long', 2).net).toBe(48);
    expect(calculatePnl(100, 90, 5, 'short', 2).net).toBe(48);
  });
  it('calculates risk/reward', () => expect(calculateRiskReward(100, 96, 110, 25).ratio).toBe(2.5));
  it('calculates margin for supported leverage', () => expect(calculateMargin(100_000, 1000)).toBe(100));
  it('calculates standard-lot pip value', () => expect(calculatePipValue(100_000)).toBe(10));
});
