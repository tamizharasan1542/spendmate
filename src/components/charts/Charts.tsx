import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/id';

// Lightweight, dependency-free SVG charts sized to their container in real pixels,
// so labels stay legible on phones.

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.floor(e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

export interface Series {
  name: string;
  color: string;
}

function ChartTooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.max(80, Math.min(width - 80, x));
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-xl bg-navy-900 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10 dark:bg-navy-700"
      style={{ left }}
    >
      {children}
    </div>
  );
}

function TooltipRows({ title, series, values, format }: { title: string; series: Series[]; values: number[]; format: (n: number) => string }) {
  return (
    <>
      <div className="mb-1 font-semibold">{title}</div>
      {series.map((s, i) => (
        <div key={s.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-white/70">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
          <span className="font-semibold tabular">{format(values[i] ?? 0)}</span>
        </div>
      ))}
    </>
  );
}

export function Legend({ series, className }: { series: Series[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400', className)}>
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px]" style={{ backgroundColor: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

const PAD = { l: 52, r: 8, t: 14, b: 28 };

export function BarChart({ data, series, height = 220, format, ariaLabel }: { data: { label: string; values: number[] }[]; series: Series[]; height?: number; format: (n: number) => string; ariaLabel: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.flatMap((d) => d.values)));
  const innerW = Math.max(0, width - PAD.l - PAD.r);
  const innerH = height - PAD.t - PAD.b;
  const groupW = data.length ? innerW / data.length : 0;
  const n = Math.max(1, series.length);
  const gap = 3;
  const barW = Math.max(3, Math.min(30, (groupW * 0.62 - gap * (n - 1)) / n));
  const labelEvery = groupW < 34 ? Math.ceil(34 / Math.max(groupW, 1)) : 1;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD.t + innerH - t * innerH;
            return (
              <g key={t}>
                <line x1={PAD.l} x2={width - PAD.r} y1={y} y2={y} className="stroke-slate-200 dark:stroke-white/10" strokeDasharray={t === 0 ? undefined : '3 5'} />
                <text x={PAD.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] tabular dark:fill-slate-500">
                  {format(t * max)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const x0 = PAD.l + i * groupW;
            const start = x0 + (groupW - (barW * n + gap * (n - 1))) / 2;
            return (
              <g key={`${d.label}-${i}`} onMouseEnter={() => setHover(i)} onClick={() => setHover(hover === i ? null : i)}>
                <rect x={x0 + 2} y={PAD.t} width={Math.max(0, groupW - 4)} height={innerH} rx={8} className={hover === i ? 'fill-slate-100 dark:fill-white/[0.04]' : 'fill-transparent'} />
                {d.values.map((v, j) => {
                  const h = (Math.max(0, v) / max) * innerH;
                  return (
                    <rect
                      key={j}
                      x={start + j * (barW + gap)}
                      y={PAD.t + innerH - h}
                      width={barW}
                      height={v > 0 ? Math.max(h, 2) : 0}
                      rx={Math.min(5, barW / 2)}
                      fill={series[j]?.color}
                      className="transition-all duration-500"
                    />
                  );
                })}
                {i % labelEvery === 0 && (
                  <text x={x0 + groupW / 2} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">
                    {d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip x={PAD.l + hover * groupW + groupW / 2} width={width}>
          <TooltipRows title={data[hover].label} series={series} values={data[hover].values} format={format} />
        </ChartTooltip>
      )}
    </div>
  );
}

export function LineChart({ data, series, height = 220, format, ariaLabel }: { data: { label: string; values: number[] }[]; series: Series[]; height?: number; format: (n: number) => string; ariaLabel: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = 'lc' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const max = niceMax(Math.max(0, ...data.flatMap((d) => d.values)));
  const innerW = Math.max(0, width - PAD.l - PAD.r - 12);
  const innerH = height - PAD.t - PAD.b;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xAt = (i: number) => PAD.l + 6 + (data.length > 1 ? i * step : innerW / 2);
  const yAt = (v: number) => PAD.t + innerH - (Math.max(0, v) / max) * innerH;
  const labelEvery = step && step < 40 ? Math.ceil(40 / step) : 1;

  const onMove = (clientX: number, rect: DOMRect) => {
    if (!data.length) return;
    const x = clientX - rect.left - PAD.l - 6;
    const i = data.length > 1 ? Math.round(x / step) : 0;
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div
      ref={ref}
      className="relative w-full touch-pan-y select-none"
      style={{ height }}
      onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
      onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setHover(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <defs>
            {series.map((s, j) => (
              <linearGradient key={s.name} id={`${gid}-${j}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD.t + innerH - t * innerH;
            return (
              <g key={t}>
                <line x1={PAD.l} x2={width - PAD.r} y1={y} y2={y} className="stroke-slate-200 dark:stroke-white/10" strokeDasharray={t === 0 ? undefined : '3 5'} />
                <text x={PAD.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] tabular dark:fill-slate-500">
                  {format(t * max)}
                </text>
              </g>
            );
          })}
          {series.map((s, j) => {
            const pts = data.map((d, i) => [xAt(i), yAt(d.values[j] ?? 0)] as const);
            if (pts.length === 0) return null;
            const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
            const area = `${line} L${pts[pts.length - 1][0]},${PAD.t + innerH} L${pts[0][0]},${PAD.t + innerH} Z`;
            return (
              <g key={s.name}>
                <path d={area} fill={`url(#${gid}-${j})`} />
                <path d={line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={hover === i ? 5 : data.length <= 12 ? 3 : 0} fill={s.color} className="stroke-white dark:stroke-navy-900" strokeWidth={2} />
                ))}
              </g>
            );
          })}
          {hover !== null && <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.t} y2={PAD.t + innerH} className="stroke-slate-300 dark:stroke-white/20" strokeDasharray="3 3" />}
          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={`${d.label}-${i}`} x={xAt(i)} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">
                {d.label}
              </text>
            ) : null,
          )}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip x={xAt(hover)} width={width}>
          <TooltipRows title={data[hover].label} series={series} values={data[hover].values} format={format} />
        </ChartTooltip>
      )}
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ segments, size = 176, thickness = 22, centerLabel, centerValue, ariaLabel }: { segments: DonutSegment[]; size?: number; thickness?: number; centerLabel?: string; centerValue?: string; ariaLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const C = 2 * Math.PI * r;
  const gapLen = segments.filter((s) => s.value > 0).length > 1 ? 2.5 : 0;
  let offset = 0;
  const shown = active !== null ? segments[active] : null;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={thickness} className="stroke-slate-100 dark:stroke-white/[0.06]" />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (Math.max(0, s.value) / total) * C;
            const el = (
              <circle
                key={s.label}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={active === i ? thickness + 4 : thickness}
                strokeDasharray={`${Math.max(0, len - gapLen)} ${C}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${c} ${c})`}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
              >
                <title>{s.label}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="line-clamp-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{shown ? shown.label : centerLabel}</span>
        <span className="text-base font-bold tracking-tight text-navy-900 tabular dark:text-white">
          {shown ? `${total ? Math.round((shown.value / total) * 100) : 0}%` : centerValue}
        </span>
      </div>
    </div>
  );
}

/** Ranked horizontal bars – readable breakdowns on small screens. */
export function BarList({ rows, format, emptyText = 'No data yet' }: { rows: { key: string; label: string; value: number; color?: string; sub?: string; href?: string }[]; format: (n: number) => string; emptyText?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {r.color && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />}
                <span className="truncate font-medium text-navy-800 dark:text-slate-200">{r.label}</span>
              </span>
              <span className="shrink-0 font-semibold text-navy-900 tabular dark:text-white">{format(r.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${max ? (r.value / max) * 100 : 0}%`, backgroundColor: r.color ?? '#4270f2' }} />
            </div>
            {r.sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{r.sub}</div>}
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <a href={r.href} className="-mx-2 block rounded-xl px-2 py-1 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                {inner}
              </a>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
