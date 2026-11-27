// Small chart components (one accent hue per chart, thin marks, hover tooltip, labels only where they help).
import { useState } from 'preact/hooks';

/** Vertical bars over time / ordered categories. Single series → no legend; the title names it. */
export function Columns({ data, height = 140, onPick, unit = '' }: { data: { k: string; label: string; v: number }[]; height?: number; onPick?: (k: string) => void; unit?: string }) {
  const [hov, setHov] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d.v)), n = data.length || 1, W = 100 / n;
  const maxI = data.findIndex(d => d.v === max);
  const labelEvery = Math.ceil(n / 12);
  return <div class="chart" style={{ height: height + 34 + 'px' }}>
    <svg class="chart-svg" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ height: height + 'px' }} role="img" aria-label="bar chart">
      <line x1="0" y1={height - 0.5} x2="100" y2={height - 0.5} class="chart-base" vector-effect="non-scaling-stroke" />
      {data.map((d, i) => { const h = (d.v / max) * (height - 18); return <g>
        <rect x={i * W} y={0} width={W} height={height} fill="transparent" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onClick={() => onPick?.(d.k)} style={{ cursor: onPick ? 'pointer' : 'default' }} />
        {d.v > 0 && <rect class={'chart-bar' + (hov === i ? ' hov' : '')} x={i * W + W * 0.18} width={W * 0.64} y={height - h} height={h} rx="0.8" pointer-events="none" />}
      </g>; })}
    </svg>
    <div class="chart-x">{data.map((d, i) => <span style={{ width: W + '%' }}>{i % labelEvery === 0 ? d.label : ''}</span>)}</div>
    {maxI >= 0 && max > 0 && hov == null && <div class="chart-peak mono" style={{ left: `calc(${(maxI + 0.5) * W}% - 20px)`, top: '0px' }}>{max}{unit}</div>}
    {hov != null && <div class="chart-tip" style={{ left: `min(calc(${(hov + 0.5) * W}% - 50px), calc(100% - 110px))` }}><b class="mono">{data[hov].v}{unit}</b><span>{data[hov].label}</span></div>}
  </div>;
}
/** Horizontal bars for categories (funnel, plans, reasons) – label and value written next to each bar. */
export function Bars({ data, onPick, total }: { data: { k: string; label: string; v: number; note?: string }[]; onPick?: (k: string) => void; total?: number }) {
  const max = Math.max(1, total || 0, ...data.map(d => d.v));
  if (!data.length) return <div class="empty">Nothing yet.</div>;
  return <div class="hbars">{data.map(d => <button type="button" class="hbar" onClick={() => onPick?.(d.k)} title={d.label + ': ' + d.v}>
    <span class="hbar-l">{d.label}</span><span class="hbar-t"><i style={{ width: Math.max(d.v ? 2 : 0, (d.v / max) * 100) + '%' }} /></span><span class="hbar-v mono">{d.v}{d.note ? <small> · {d.note}</small> : null}</span>
  </button>)}</div>;
}
