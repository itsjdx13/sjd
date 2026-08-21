import { useMemo, useState } from 'react';
import { calculateMargin, calculatePipValue, calculatePnl, calculatePositionSize, calculateRiskReward } from '../../utils/finance';

type Mode = 'position' | 'risk-reward' | 'pnl' | 'pip' | 'margin';
const modes: Array<{ id: Mode; label: string }> = [{ id: 'position', label: 'Position size' }, { id: 'risk-reward', label: 'Risk / reward' }, { id: 'pnl', label: 'P&L' }, { id: 'pip', label: 'Forex pip' }, { id: 'margin', label: 'Margin' }];
function Field({ label, value, onChange, suffix, step = 'any' }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: string }) { return <label className="calc-field"><span>{label}</span><div><input type="number" step={step} value={value} onChange={(e) => onChange(e.target.valueAsNumber || 0)} />{suffix && <i>{suffix}</i>}</div></label>; }
function Result({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div className={accent ? 'calc-result accent' : 'calc-result'}><span>{label}</span><strong>{value}</strong></div>; }

export function Calculator() {
  const [mode, setMode] = useState<Mode>('position');
  const [balance, setBalance] = useState(10000), [risk, setRisk] = useState(1), [stopDistance, setStopDistance] = useState(2.5);
  const [entry, setEntry] = useState(100), [stop, setStop] = useState(96), [target, setTarget] = useState(110), [size, setSize] = useState(25), [exit, setExit] = useState(112);
  const [side, setSide] = useState<'long' | 'short'>('long'), [fees, setFees] = useState(4);
  const [lotSize, setLotSize] = useState(100000), [pipSize, setPipSize] = useState(0.0001), [pips, setPips] = useState(25);
  const [positionValue, setPositionValue] = useState(10000), [leverage, setLeverage] = useState(100);
  const position = useMemo(() => calculatePositionSize(balance, risk, stopDistance), [balance, risk, stopDistance]);
  const rr = useMemo(() => calculateRiskReward(entry, stop, target, size, side), [entry, stop, target, size, side]);
  const pnl = useMemo(() => calculatePnl(entry, exit, size, side, fees), [entry, exit, size, side, fees]);
  const pipValue = calculatePipValue(lotSize, pipSize);

  return <div className="page-stack calculator-page">
    <div className="page-title"><div><p className="eyebrow">TRADING WORKBENCH</p><h1>Calculator</h1><p>Fast, deterministic calculations. No market connection required.</p></div></div>
    <div className="calculator-layout">
      <nav className="calculator-nav" aria-label="Calculator type">{modes.map((item) => <button key={item.id} className={mode === item.id ? 'active' : ''} onClick={() => setMode(item.id)}><span>{item.label}</span><small>{item.id === 'position' ? 'Risk-based quantity' : item.id === 'risk-reward' ? 'Trade quality' : item.id === 'pnl' ? 'Net outcome' : item.id === 'pip' ? 'FX exposure' : 'Capital required'}</small></button>)}</nav>
      <section className="calculator-card panel">
        <header><p className="eyebrow">{modes.find((item) => item.id === mode)?.label.toUpperCase()}</p><h2>{mode === 'position' ? 'Size the risk, not the hope.' : mode === 'risk-reward' ? 'Measure the trade before taking it.' : mode === 'pnl' ? 'Estimate net trade outcome.' : mode === 'pip' ? 'Calculate pip exposure.' : 'Know the capital requirement.'}</h2></header>
        {mode === 'position' && <><div className="calc-inputs"><Field label="Account balance" value={balance} onChange={setBalance} suffix="$" /><Field label="Risk per trade" value={risk} onChange={setRisk} suffix="%" /><Field label="Stop-loss distance" value={stopDistance} onChange={setStopDistance} suffix="$" /></div><div className="calc-results"><Result label="Amount at risk" value={`$${position.riskAmount.toFixed(2)}`} /><Result accent label="Recommended position" value={`${position.positionSize.toFixed(2)} units`} /></div></>}
        {mode === 'risk-reward' && <><div className="segmented"><button className={side === 'long' ? 'active' : ''} onClick={() => setSide('long')}>Long</button><button className={side === 'short' ? 'active' : ''} onClick={() => setSide('short')}>Short</button></div><div className="calc-inputs"><Field label="Entry" value={entry} onChange={setEntry} /><Field label="Stop loss" value={stop} onChange={setStop} /><Field label="Take profit" value={target} onChange={setTarget} /><Field label="Position size" value={size} onChange={setSize} /></div><div className="calc-results"><Result label="Risk" value={`$${rr.risk.toFixed(2)}`} /><Result label="Potential profit" value={`$${rr.reward.toFixed(2)}`} /><Result accent label="Risk : Reward" value={`1 : ${rr.ratio.toFixed(2)}`} /></div></>}
        {mode === 'pnl' && <><div className="segmented"><button className={side === 'long' ? 'active' : ''} onClick={() => setSide('long')}>Long</button><button className={side === 'short' ? 'active' : ''} onClick={() => setSide('short')}>Short</button></div><div className="calc-inputs"><Field label="Entry" value={entry} onChange={setEntry} /><Field label="Exit" value={exit} onChange={setExit} /><Field label="Position size" value={size} onChange={setSize} /><Field label="Commission + spread + swap" value={fees} onChange={setFees} /></div><div className="calc-results"><Result label="Gross P&L" value={`$${pnl.gross.toFixed(2)}`} /><Result label="Fees" value={`-$${fees.toFixed(2)}`} /><Result accent label="Net P&L" value={`$${pnl.net.toFixed(2)} (${pnl.returnPercent.toFixed(2)}%)`} /></div></>}
        {mode === 'pip' && <><div className="calc-inputs"><Field label="Position units" value={lotSize} onChange={setLotSize} /><Field label="Pip size" value={pipSize} onChange={setPipSize} step="0.00001" /><Field label="Pip movement" value={pips} onChange={setPips} /></div><p className="calc-hint">Use 0.0001 for most FX pairs and 0.01 for JPY pairs. Result assumes the quote currency equals the account currency.</p><div className="calc-results"><Result label="Pip value" value={`$${pipValue.toFixed(2)}`} /><Result accent label="P&L for movement" value={`$${(pipValue * pips).toFixed(2)}`} /></div></>}
        {mode === 'margin' && <><div className="calc-inputs"><Field label="Position value" value={positionValue} onChange={setPositionValue} suffix="$" /><label className="calc-field"><span>Leverage</span><div><select value={leverage} onChange={(e) => setLeverage(Number(e.target.value))}>{[10, 20, 30, 50, 100, 200, 500, 1000].map((value) => <option key={value} value={value}>1:{value}</option>)}</select></div></label></div><div className="calc-results"><Result accent label="Required margin" value={`$${calculateMargin(positionValue, leverage).toFixed(2)}`} /><Result label="Effective exposure" value={`${leverage}×`} /></div></>}
      </section>
    </div>
  </div>;
}
