import { useMemo, useState } from 'react';
import { searchCatalog } from '../../data/catalog';
import type { WatchItem } from '../../types/finance';
import { formatMoney, formatPercent, relativeTime } from '../../utils/format';
import { Icon } from '../../components/Icon';

interface Props { items: WatchItem[]; hidden: boolean; onAdd: (item: WatchItem) => void; onDelete: (id: string) => void; onRefresh: () => void; }

export function Markets({ items, hidden, onAdd, onDelete, onRefresh }: Props) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCatalog(query).filter((item) => ['coingecko', 'gold_api', 'alpha_vantage', 'manual', 'tsetmc'].includes(item.priceSource)), [query]);
  function add(index: number) {
    const item = results[index];
    onAdd({ id: crypto.randomUUID(), symbol: item.symbol, name: item.name, currency: item.currency, priceSource: item.priceSource, providerId: item.providerId, price: 0, lastUpdated: new Date(0).toISOString() });
    setQuery('');
  }
  return <div className="page-stack">
    <div className="page-title"><div><p className="eyebrow">QUICK SIGNALS</p><h1>Markets</h1><p>A lean watchlist. Quotes refresh independently from your holdings.</p></div><button className="secondary-button desktop-action" onClick={onRefresh}><Icon name="refresh" /> Refresh</button></div>
    <section className="market-search panel"><label htmlFor="market-search">Add to watchlist</label><div><input id="market-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search BTC, gold, Apple, عیار…" />{query && <div className="search-results">{results.map((item, index) => <button key={`${item.symbol}-${item.market}`} onClick={() => add(index)}><span><strong>{item.symbol}</strong>{item.name}</span><small>+ Add</small></button>)}</div>}</div></section>
    <section className="watch-grid">{items.map((item) => <article className="quote-card" key={item.id}><header><span className="asset-avatar">{item.symbol.slice(0, 2)}</span><button className="quiet-delete" onClick={() => onDelete(item.id)} aria-label={`Remove ${item.name}`}><Icon name="close" /></button></header><div><p>{item.name}</p><h2>{hidden ? '••••' : item.price ? formatMoney(item.price, item.currency) : 'Awaiting quote'}</h2></div><footer><span className={(item.dailyChangePercent ?? 0) >= 0 ? 'positive' : 'negative'}>{item.dailyChangePercent == null ? 'No daily data' : hidden ? '••' : formatPercent(item.dailyChangePercent)}</span><small>{item.priceSource.replace('_', ' ')} · {relativeTime(item.lastUpdated)}</small></footer></article>)}</section>
    <section className="provider-strip"><div><i className="provider-dot live" /><span><strong>CoinGecko</strong><small>Keyless · crypto · 60 sec cache</small></span></div><div><i className="provider-dot live" /><span><strong>Gold API</strong><small>Keyless · metals · 5 min cache</small></span></div><div><i className="provider-dot optional" /><span><strong>Alpha Vantage</strong><small>Optional key · delayed · 25/day</small></span></div><div><i className="provider-dot manual" /><span><strong>TSETMC</strong><small>Public Iranian quotes · Rial per unit · cached fallback</small></span></div></section>
  </div>;
}
