import { useEffect, useMemo, useState } from 'react';
import { searchCatalog } from '../data/catalog';
import { assetTypes, type Asset, type AssetType, type CurrencyCode, type PriceSource } from '../types/finance';
import { Icon } from './Icon';

interface Props { asset?: Asset; onClose: () => void; onSave: (asset: Asset) => void; onDelete?: (id: string) => void; }

const labels: Record<AssetType, string> = { crypto: 'Crypto', stock: 'International stock', iran_stock: 'Iranian stock', fund: 'Investment fund', gold: 'Precious metal', currency: 'Foreign currency', cash: 'Cash', real_estate: 'Real estate', vehicle: 'Vehicle', commodity: 'Commodity', custom: 'Other asset', liability: 'Liability' };

export function AssetModal({ asset, onClose, onSave, onDelete }: Props) {
  const [query, setQuery] = useState(asset?.name ?? '');
  const [name, setName] = useState(asset?.name ?? '');
  const [symbol, setSymbol] = useState(asset?.symbol ?? '');
  const [type, setType] = useState<AssetType>(asset?.assetType ?? 'crypto');
  const [quantity, setQuantity] = useState(asset?.quantity ?? 1);
  const [average, setAverage] = useState(asset?.averageBuyPrice ?? 0);
  const [current, setCurrent] = useState(asset?.currentPrice ?? 0);
  const [currency, setCurrency] = useState<CurrencyCode>(asset?.currency ?? 'USD');
  const [source, setSource] = useState<PriceSource>(asset?.priceSource ?? 'manual');
  const [providerId, setProviderId] = useState(asset?.providerId ?? '');
  const [ownership, setOwnership] = useState(asset?.ownershipPercent ?? 100);
  const [notes, setNotes] = useState(asset?.notes ?? '');
  const results = useMemo(() => asset ? [] : searchCatalog(query), [asset, query]);
  const isProperty = type === 'real_estate' || type === 'vehicle';

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function selectResult(index: number) {
    const item = results[index];
    setQuery(item.name); setName(item.name); setSymbol(item.symbol); setType(item.assetType); setCurrency(item.currency); setSource(item.priceSource); setProviderId(item.providerId ?? '');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !symbol.trim() || quantity < 0 || current < 0) return;
    onSave({ id: asset?.id ?? crypto.randomUUID(), name: name.trim(), symbol: symbol.trim(), assetType: type, market: asset?.market ?? (source === 'manual' ? 'Manual' : source), quantity, averageBuyPrice: average, currentPrice: current, currency, priceSource: source, providerId: providerId || undefined, lastUpdated: asset?.lastUpdated ?? new Date().toISOString(), ownershipPercent: isProperty ? ownership : undefined, notes: notes.trim() || undefined, purchaseDate: asset?.purchaseDate });
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="asset-title">
    <div className="modal-header"><div><p className="eyebrow">{asset ? 'EDIT HOLDING' : 'NEW HOLDING'}</p><h2 id="asset-title">{asset ? asset.name : 'Add an asset'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
    <form onSubmit={submit}>
      {!asset && <div className="field full search-field"><label htmlFor="asset-search">Search known assets</label><input id="asset-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="BTC, AAPL, عیار…" autoFocus />{query && results.length > 0 && <div className="search-results">{results.map((item, index) => <button type="button" key={`${item.symbol}-${item.market}`} onClick={() => selectResult(index)}><span><strong>{item.symbol}</strong>{item.name}</span><small>{item.market}</small></button>)}</div>}</div>}
      <div className="form-grid">
        <div className="field"><label htmlFor="asset-name">Name</label><input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label htmlFor="asset-symbol">Symbol</label><input id="asset-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} required dir="auto" /></div>
        <div className="field"><label htmlFor="asset-type">Asset type</label><select id="asset-type" value={type} onChange={(e) => setType(e.target.value as AssetType)}>{assetTypes.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></div>
        <div className="field"><label htmlFor="asset-currency">Currency</label><select id="asset-currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>{['USD', 'EUR', 'GBP', 'AED', 'IRR', 'IRT'].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="asset-quantity">{isProperty ? 'Units' : 'Quantity'}</label><input id="asset-quantity" type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.valueAsNumber || 0)} /></div>
        <div className="field"><label htmlFor="asset-average">{isProperty ? 'Purchase value' : 'Average buy price'}</label><input id="asset-average" type="number" min="0" step="any" value={average} onChange={(e) => setAverage(e.target.valueAsNumber || 0)} /></div>
        <div className="field"><label htmlFor="asset-current">{isProperty ? 'Estimated current value' : 'Current price'}</label><input id="asset-current" type="number" min="0" step="any" value={current} onChange={(e) => setCurrent(e.target.valueAsNumber || 0)} /></div>
        {isProperty && <div className="field"><label htmlFor="asset-ownership">Ownership %</label><input id="asset-ownership" type="number" min="0" max="100" value={ownership} onChange={(e) => setOwnership(e.target.valueAsNumber || 0)} /></div>}
        <div className="field"><label htmlFor="asset-source">Price source</label><select id="asset-source" value={source} onChange={(e) => setSource(e.target.value as PriceSource)}><option value="manual">Manual</option><option value="coingecko">CoinGecko</option><option value="gold_api">Gold API</option><option value="alpha_vantage">Alpha Vantage</option><option value="tsetmc">TSETMC (opt-in)</option></select></div>
        {(source === 'coingecko' || source === 'tsetmc') && <div className="field"><label htmlFor="provider-id">{source === 'tsetmc' ? 'TSETMC instrument code' : 'CoinGecko ID'}</label><input id="provider-id" value={providerId} onChange={(e) => setProviderId(e.target.value)} /></div>}
        <div className="field full"><label htmlFor="asset-notes">Notes</label><textarea id="asset-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      </div>
      <div className="modal-actions">{asset && onDelete && <button type="button" className="danger-button" onClick={() => { onDelete(asset.id); onClose(); }}><Icon name="trash" /> Delete</button>}<span /><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Save asset</button></div>
    </form>
  </section></div>;
}
