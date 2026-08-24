import { describe, expect, it } from 'vitest';
import { parseTsetmcQuote, tsetmcTimestamp } from './providers';

describe('TSETMC quote parsing', () => {
  it('uses the last traded price and derives its daily change from previous close', () => {
    const quote = parseTsetmcQuote('عیار', {
      pDrCotVal: 590_993,
      pClosing: 584_223,
      priceYesterday: 553_356,
      priceChangePercent: 5.58,
      dEven: 20260822,
      hEven: 123045
    });

    expect(quote.price).toBe(590_993);
    expect(quote.currency).toBe('IRR');
    expect(quote.changePercent).toBeCloseTo(6.8, 1);
    expect(quote.timestamp).toBe('2026-08-22T09:00:45.000Z');
    expect(quote.delayed).toBe(true);
  });

  it('falls back to closing price and provider percent when last-trade fields are absent', () => {
    const quote = parseTsetmcQuote('TEST', { pClosing: 100_000, priceChangePercent: -1.25 });
    expect(quote.price).toBe(100_000);
    expect(quote.changePercent).toBe(-1.25);
  });

  it('rejects missing and non-positive prices', () => {
    expect(() => parseTsetmcQuote('TEST', { pClosing: 0 })).toThrow('No TSETMC quote');
  });
});

describe('TSETMC timestamps', () => {
  it('converts Tehran exchange time to UTC', () => {
    expect(tsetmcTimestamp(20260824, 93005)).toBe('2026-08-24T06:00:05.000Z');
  });
});
