import { describe, expect, it } from 'vitest';
import { demoData } from '../data/demo';
import { csvCell, validateBackup } from './backup';

describe('backup security', () => {
  it('accepts the application backup schema', () => {
    expect(validateBackup(structuredClone(demoData)).assets.length).toBe(demoData.assets.length);
  });

  it('rejects unsupported currencies and invalid numeric values', () => {
    const invalid = structuredClone(demoData);
    invalid.assets[0].currency = 'JPY' as never;
    expect(() => validateBackup(invalid)).toThrow(/invalid asset data/i);

    const nonFinite = structuredClone(demoData);
    nonFinite.assets[0].quantity = Number.POSITIVE_INFINITY;
    expect(() => validateBackup(nonFinite)).toThrow(/invalid asset data/i);
  });

  it('neutralizes spreadsheet formulas in CSV exports', () => {
    expect(csvCell('=HYPERLINK("https://example.invalid")')).toBe('"\'=HYPERLINK(\\"https://example.invalid\\")"');
    expect(csvCell('BTC')).toBe('"BTC"');
  });
});
