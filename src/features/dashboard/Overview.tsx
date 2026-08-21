import type { Asset, AssetType, CurrencyCode } from '../../types/finance';
import { allocationByType, assetValue, convertCurrency, type FxRates, portfolioTotals } from '../../utils/finance';
import { formatMoney, formatPercent, relativeTime } from '../../utils/format';

const colors: Record<AssetType, string> = { cash: '#c6ec56', crypto: '#ff9f68', stock: '#6fa8ff', iran_stock: '#b8a1ff', fund: '#48cfae', gold: '#f4c95d', currency: '#69c0d0', real_estate: '#eb7aa5', vehicle: '#a0a8b2', commodity: '#c98d65', custom: '#87909b', liability: '#ef6b6b' };
const labels: Record<AssetType, string> = { cash: 'Cash', crypto: 'Crypto', stock: 'Global equities', iran_stock: 'Iranian equities', fund: 'Funds', gold: 'Precious metals', currency: 'Currencies', real_estate: 'Real estate', vehicle: 'Vehicles', commodity: 'Commodities', custom: 'Other assets', liability: 'Liabilities' };

interface Props { assets: Asset[]; base: CurrencyCode; rates: FxRates; hidden: boolean; compact: boolean; onCategory: (type: AssetType) => void; onPortfolio: () => void; }

export function Overview({ assets, base, rates, hidden, compact, onCategory, onPortfolio }: Props) {
  const totals = portfolioTotals(assets, base, rates);
  const dayPercent = totals.value - totals.dailyChange ? totals.dailyChange / (totals.value - totals.dailyChange) * 100 : 0;
  const profit = totals.value - totals.cost;
  const profitPercent = totals.cost ? profit / Math.abs(totals.cost) * 100 : 0;
  const allocation = allocationByType(assets, base, rates);
  let cursor = 0;
  const segments = allocation.filter((item) => item.percent > 0).map((item) => { const start = cursor; cursor += item.percent; return `${colors[item.type]} ${start}% ${cursor}%`; }).join(', ');
  const largest = [...assets].sort((a, b) => Math.abs(convertCurrency(assetValue(b), b.currency, base, rates)) - Math.abs(convertCurrency(assetValue(a), a.currency, base, rates))).slice(0, 5);
  const money = (value: number) => hidden ? '••••••' : formatMoney(value, base, compact);

  return <div className="page-stack overview-page">
    <section className="hero-grid">
      <div className="net-worth-panel">
        <div className="section-label"><span>NET WORTH</span><span className="live-pill"><i />LOCAL</span></div>
        <h1 className={hidden ? 'private-value' : ''}>{money(totals.value)}</h1>
        <div className="hero-metrics">
          <div><span className={totals.dailyChange >= 0 ? 'positive' : 'negative'}>{hidden ? '••••' : formatPercent(dayPercent)}</span><small>Today</small></div>
          <div><span className={totals.dailyChange >= 0 ? 'positive' : 'negative'}>{money(totals.dailyChange)}</span><small>Daily change</small></div>
          <div><span className={profit >= 0 ? 'positive' : 'negative'}>{hidden ? '••••' : formatPercent(profitPercent)}</span><small>All-time return</small></div>
        </div>
      </div>
      <aside className="signal-panel"><p className="eyebrow">POSITION SUMMARY</p><div className="signal-row"><span>Assets</span><strong>{assets.filter((a) => a.assetType !== 'liability').length}</strong></div><div className="signal-row"><span>Liabilities</span><strong>{money(Math.abs(allocation.find((a) => a.type === 'liability')?.value ?? 0))}</strong></div><div className="signal-row"><span>Unrealized P&amp;L</span><strong className={profit >= 0 ? 'positive' : 'negative'}>{money(profit)}</strong></div></aside>
    </section>

    <section className="content-grid">
      <div className="panel allocation-panel">
        <div className="panel-heading"><div><p className="eyebrow">DISTRIBUTION</p><h2>Asset allocation</h2></div><span>{allocation.filter((a) => a.value > 0).length} categories</span></div>
        <div className="allocation-content">
          <div className="donut" style={{ background: segments ? `conic-gradient(${segments})` : '#e4e7e1' }}><div><strong>{hidden ? '••' : '100%'}</strong><small>allocated</small></div></div>
          <div className="allocation-list">{allocation.map((item) => <button key={item.type} onClick={() => onCategory(item.type)}><i style={{ background: colors[item.type] }} /><span>{labels[item.type]}</span><strong>{money(item.value)}</strong><small>{item.value > 0 ? `${item.percent.toFixed(1)}%` : 'debt'}</small></button>)}</div>
        </div>
      </div>
      <div className="panel holdings-panel">
        <div className="panel-heading"><div><p className="eyebrow">CONCENTRATION</p><h2>Largest holdings</h2></div><button className="text-button" onClick={onPortfolio}>View all →</button></div>
        <div className="holding-list">{largest.map((asset) => { const value = convertCurrency(assetValue(asset), asset.currency, base, rates); return <button key={asset.id} onClick={onPortfolio}><span className="asset-avatar">{asset.symbol.slice(0, 2)}</span><span className="asset-title"><strong>{asset.name}</strong><small>{asset.symbol} · {asset.market}</small></span><span className="holding-value"><strong>{money(value)}</strong><small className={(asset.dailyChangePercent ?? 0) >= 0 ? 'positive' : 'negative'}>{asset.dailyChangePercent == null ? 'Manual' : formatPercent(asset.dailyChangePercent)}</small></span></button>; })}</div>
      </div>
    </section>
    {assets.some((asset) => asset.isDemo) && <aside className="demo-banner"><span><strong>Demo portfolio</strong> — explore safely, then remove it before adding your real position.</span></aside>}
    <footer className="data-footnote">Values use locally cached prices. Oldest quote updated {assets.length ? relativeTime(assets.reduce((oldest, asset) => new Date(asset.lastUpdated) < new Date(oldest) ? asset.lastUpdated : oldest, assets[0].lastUpdated)) : 'never'}.</footer>
  </div>;
}
