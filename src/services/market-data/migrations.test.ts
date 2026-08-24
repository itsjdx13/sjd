import { describe, expect, it } from 'vitest';
import { demoData } from '../../data/demo';
import type { AppData } from '../../types/finance';
import { upgradeKnownMarketData } from './migrations';

describe('known market-data migrations', () => {
  it('upgrades the original demo Ayar mapping and cached value', () => {
    const original: AppData = structuredClone(demoData);
    const asset = original.assets.find((item) => item.id === 'demo-ayar')!;
    asset.currentPrice = 21_450;
    asset.priceSource = 'manual';
    asset.providerId = undefined;
    original.preferences.tsetmcEnabled = false;
    const watch = original.watchlist.find((item) => item.id === 'watch-ayar')!;
    watch.price = 21_450;
    watch.priceSource = 'manual';

    const upgraded = upgradeKnownMarketData(original);
    const upgradedAsset = upgraded.assets.find((item) => item.id === 'demo-ayar')!;
    const upgradedWatch = upgraded.watchlist.find((item) => item.id === 'watch-ayar')!;

    expect(upgradedAsset.currentPrice).toBe(590_993);
    expect(upgradedAsset.priceSource).toBe('tsetmc');
    expect(upgradedAsset.providerId).toBe('34144395039913458');
    expect(upgradedWatch.price).toBe(590_993);
    expect(upgraded.preferences.tsetmcEnabled).toBe(true);
  });

  it('does not change user-created manual Ayar assets', () => {
    const original: AppData = {
      ...structuredClone(demoData),
      assets: [{ ...demoData.assets[0], id: 'mine', isDemo: false, symbol: 'عیار', currentPrice: 123, priceSource: 'manual' }],
      watchlist: []
    };
    expect(upgradeKnownMarketData(original)).toBe(original);
  });
});
