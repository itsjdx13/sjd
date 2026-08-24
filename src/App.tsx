import { useEffect, useRef, useState } from 'react';
import { AssetModal } from './components/AssetModal';
import { Shell, type Page } from './components/Shell';
import { Calculator } from './features/calculator/Calculator';
import { Overview } from './features/dashboard/Overview';
import { Markets } from './features/markets/Markets';
import { Portfolio } from './features/portfolio/Portfolio';
import { Settings } from './features/settings/Settings';
import { usePortfolio } from './hooks/usePortfolio';
import { fetchConventionalFx } from './services/market-data/providers';
import type { Asset, AssetType } from './types/finance';
import { createFxRates } from './utils/finance';

export default function App() {
  const portfolio = usePortfolio();
  const [page, setPage] = useState<Page>('overview');
  const [modal, setModal] = useState<Asset | 'new' | null>(null);
  const [filter, setFilter] = useState<AssetType>();
  const [online, setOnline] = useState(navigator.onLine);
  const refreshed = useRef(false);
  const rates = createFxRates(portfolio.data.preferences.usdIrrRate, portfolio.data.preferences.fxRates ?? { EUR: 0.86, GBP: 0.75, AED: 3.6725 });

  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  useEffect(() => {
    const theme = portfolio.data.preferences.theme;
    document.documentElement.dataset.theme = theme === 'system' ? '' : theme;
  }, [portfolio.data.preferences.theme]);

  useEffect(() => {
    if (!portfolio.ready || refreshed.current) return;
    refreshed.current = true;
    void portfolio.refresh(false);
    fetchConventionalFx('USD').then((result) => portfolio.updatePreferences({ fxRates: { ...portfolio.data.preferences.fxRates, ...result.rates, AED: 3.6725 }, fxLastUpdated: result.timestamp })).catch(() => undefined);
  }, [portfolio.ready, portfolio.refresh]);

  useEffect(() => {
    if (!portfolio.ready || portfolio.data.preferences.refreshMinutes <= 0) return;
    const timer = window.setInterval(() => { if (navigator.onLine) void portfolio.refresh(false); }, portfolio.data.preferences.refreshMinutes * 60_000);
    return () => window.clearInterval(timer);
  }, [portfolio.data.preferences.refreshMinutes, portfolio.ready, portfolio.refresh]);

  function openCategory(type: AssetType) { setFilter(type); setPage('portfolio'); }
  function saveAsset(asset: Asset) { if (modal === 'new') portfolio.addAsset(asset); else portfolio.updateAsset(asset); setModal(null); }
  const common = { base: portfolio.data.preferences.baseCurrency, rates, hidden: portfolio.data.preferences.valuesHidden, compact: portfolio.data.preferences.compactNumbers };

  return <>
    <Shell page={page} onPage={(next) => { setPage(next); if (next !== 'portfolio') setFilter(undefined); }} hidden={portfolio.data.preferences.valuesHidden} refreshing={portfolio.refreshing} online={online} status={online ? portfolio.status : 'Offline — cached portfolio available'} onTogglePrivacy={() => portfolio.updatePreferences({ valuesHidden: !portfolio.data.preferences.valuesHidden })} onRefresh={() => void portfolio.refresh(true)} onAdd={() => setModal('new')}>
      {page === 'overview' && <Overview assets={portfolio.data.assets} {...common} onCategory={openCategory} onPortfolio={() => setPage('portfolio')} />}
      {page === 'portfolio' && <Portfolio assets={portfolio.data.assets} {...common} initialFilter={filter} onEdit={setModal} onAdd={() => setModal('new')} />}
      {page === 'markets' && <Markets items={portfolio.data.watchlist} hidden={portfolio.data.preferences.valuesHidden} onAdd={portfolio.addWatchItem} onDelete={portfolio.deleteWatchItem} onRefresh={() => void portfolio.refresh(true)} />}
      {page === 'calculator' && <Calculator />}
      {page === 'settings' && <Settings data={portfolio.data} onPreferences={portfolio.updatePreferences} onRestore={portfolio.replaceData} onRemoveDemo={portfolio.removeDemo} />}
    </Shell>
    {modal && <AssetModal asset={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} onSave={saveAsset} onDelete={portfolio.deleteAsset} />}
  </>;
}
