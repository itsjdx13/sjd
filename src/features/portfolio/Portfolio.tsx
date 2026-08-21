import { useMemo, useState } from 'react';
import type { Asset, AssetType, CurrencyCode } from '../../types/finance';
import { assetCostBasis, assetValue, convertCurrency, type FxRates } from '../../utils/finance';
import { formatMoney, formatPercent, relativeTime } from '../../utils/format';

type Sort = 'value' | 'profit' | 'loss' | 'daily' | 'type';
interface Props { assets: Asset[]; base: CurrencyCode; rates: FxRates; hidden: boolean; compact: boolean; initialFilter?: AssetType; onEdit: (asset: Asset) => void; onAdd: () => void; }

export function Portfolio({ assets, base, rates, hidden, compact, initialFilter, onEdit, onAdd }: Props) {
  const [sort, setSort] = useState<Sort>('value');
  const [filter, setFilter] = useState<AssetType | 'all'>(initialFilter ?? 'all');
  const money = (value: number) => hidden ? '••••' : formatMoney(value, base, compact);
  const rows = useMemo(() => assets.filter((asset) => filter === 'all' || asset.assetType === filter).sort((a, b) => {
    const av = convertCurrency(assetValue(a), a.currency, base, rates), bv = convertCurrency(assetValue(b), b.currency, base, rates);
    const ap = av - convertCurrency(assetCostBasis(a), a.currency, base, rates), bp = bv - convertCurrency(assetCostBasis(b), b.currency, base, rates);
    if (sort === 'type') return a.assetType.localeCompare(b.assetType);
    if (sort === 'daily') return (b.dailyChangePercent ?? -Infinity) - (a.dailyChangePercent ?? -Infinity);
    if (sort === 'profit') return bp - ap;
    if (sort === 'loss') return ap - bp;
    return Math.abs(bv) - Math.abs(av);
  }), [assets, base, filter, rates, sort]);

  return <div className="page-stack">
    <div className="page-title"><div><p className="eyebrow">EVERYTHING YOU OWN</p><h1>Portfolio</h1><p>Simple holdings and manually valued property in one ledger.</p></div><button className="primary-button desktop-action" onClick={onAdd}>Add holding</button></div>
    <section className="panel table-panel">
      <div className="table-tools"><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <span>{assets.length}</span></button>{(['crypto', 'stock', 'fund', 'gold', 'real_estate', 'cash', 'liability'] as AssetType[]).filter((type) => assets.some((a) => a.assetType === type)).map((type) => <button key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{type.replace('_', ' ')}</button>)}</div><label className="sort-control">Sort <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="value">Value</option><option value="profit">Profit</option><option value="loss">Loss</option><option value="daily">Daily change</option><option value="type">Asset type</option></select></label></div>
      <div className="holdings-table" role="table" aria-label="Portfolio holdings">
        <div className="table-row table-head" role="row"><span>Asset</span><span>Quantity</span><span>Avg. price</span><span>Current</span><span>Value</span><span>P&amp;L</span><span>Day</span></div>
        {rows.map((asset) => { const value = convertCurrency(assetValue(asset), asset.currency, base, rates); const cost = convertCurrency(assetCostBasis(asset), asset.currency, base, rates); const pnl = value - cost; const pnlPercent = Math.abs(cost) ? pnl / Math.abs(cost) * 100 : 0; return <button className="table-row" role="row" key={asset.id} onClick={() => onEdit(asset)}>
          <span className="asset-cell"><i className="asset-avatar">{asset.symbol.slice(0, 2)}</i><span><strong>{asset.name}</strong><small>{asset.symbol} · {asset.currency}</small></span></span>
          <span data-label="Quantity">{hidden ? '••' : new Intl.NumberFormat('en', { maximumFractionDigits: 4 }).format(asset.quantity)}</span>
          <span data-label="Average">{hidden ? '••' : formatMoney(asset.averageBuyPrice, asset.currency, compact)}</span>
          <span data-label="Current">{hidden ? '••' : formatMoney(asset.currentPrice, asset.currency, compact)}<small>{asset.priceSource.replace('_', ' ')} · {relativeTime(asset.lastUpdated)}</small></span>
          <span data-label="Value"><strong>{money(value)}</strong></span>
          <span data-label="P&L" className={pnl >= 0 ? 'positive' : 'negative'}>{money(pnl)}<small>{hidden ? '••' : formatPercent(pnlPercent)}</small></span>
          <span data-label="Day" className={(asset.dailyChangePercent ?? 0) >= 0 ? 'positive' : 'negative'}>{asset.dailyChangePercent == null ? '—' : hidden ? '••' : formatPercent(asset.dailyChangePercent)}</span>
        </button>; })}
        {!rows.length && <div className="empty-state"><strong>No holdings here yet.</strong><p>Add an asset or choose another category.</p><button className="primary-button" onClick={onAdd}>Add asset</button></div>}
      </div>
    </section>
  </div>;
}
