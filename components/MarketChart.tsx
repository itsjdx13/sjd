'use client';

const points = [48, 44, 50, 46, 58, 55, 63, 61, 68, 65, 76, 72, 80, 78, 88, 84, 91, 87, 96, 94, 102, 98, 110, 106, 116, 112, 124, 119, 130, 127, 138, 134, 145];

export function MarketChart({ compact = false }: { compact?: boolean }) {
  const width = 720, height = compact ? 190 : 300;
  const min = Math.min(...points), max = Math.max(...points);
  const mapped = points.map((point, index) => `${(index / (points.length - 1)) * width},${height - 20 - ((point - min) / (max - min)) * (height - 48)}`).join(' ');
  const area = `0,${height} ${mapped} ${width},${height}`;
  return <div className={`market-chart ${compact ? 'compact' : ''}`}>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Portfolio value trend">
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00ADB3" stopOpacity=".32"/><stop offset="1" stopColor="#0053B3" stopOpacity="0"/></linearGradient></defs>
      {[.2,.4,.6,.8].map(value => <line key={value} x1="0" y1={height * value} x2={width} y2={height * value} className="chart-grid"/>)}
      <polygon points={area} fill="url(#area)"/><polyline points={mapped} fill="none" className="chart-line" vectorEffect="non-scaling-stroke"/>
      <circle cx={width} cy={Number(mapped.split(' ').at(-1)?.split(',')[1])} r="5" className="chart-dot"/>
    </svg>
    <div className="chart-axis"><span>May 26</span><span>Jun 12</span><span>Jul 01</span><span>Jul 20</span><span>Aug 25</span></div>
  </div>;
}
