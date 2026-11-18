import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/id';
import { PAYMENT_STATUS_META, eventStatusMeta } from '../../data/constants';
import type { EventStatus, PaymentStatus } from '../../types';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/[0.06] dark:bg-navy-900/70',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-navy-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', className)}>
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const m = PAYMENT_STATUS_META[status];
  return (
    <Badge className={m.badge}>
      <span className={cn('size-1.5 rounded-full', m.dot)} />
      {m.label}
    </Badge>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const m = eventStatusMeta(status);
  return <Badge className={m.badge}>{m.label}</Badge>;
}

export function ProgressBar({ value, className, barClassName, size = 'md', label }: { value: number; className?: string; barClassName?: string; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cn('w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]', size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', barClassName ?? 'bg-brand-500')} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Colour for budget usage bars: blue → amber at 85% → red when exceeded */
export function budgetBarClass(used: number): string {
  if (used > 1) return 'bg-rose-500';
  if (used >= 0.85) return 'bg-amber-500';
  return 'bg-brand-500';
}

export function EmptyState({ icon: Icon, title, message, action, className }: { icon: LucideIcon; title: string; message: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-8 ring-brand-50/50 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/5">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-navy-900 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Segmented<T extends string>({ options, value, onChange, className, ariaLabel }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; className?: string; ariaLabel?: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 dark:bg-white/[0.05]', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition-all',
              active ? 'bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-white' : 'text-slate-500 hover:text-navy-800 dark:text-slate-400 dark:hover:text-white',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular', active ? 'bg-brand-50 text-brand-700 dark:bg-brand-400/20 dark:text-brand-200' : 'bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-400')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function StatTile({ label, value, sub, icon: Icon, tone = 'brand', className }: { label: string; value: string; sub?: ReactNode; icon?: LucideIcon; tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet'; className?: string }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300',
  } as const;
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={cn('grid size-8 place-items-center rounded-xl', tones[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="mt-2.5 truncate text-lg font-bold tracking-tight text-navy-900 tabular sm:text-xl dark:text-white">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </Card>
  );
}

export function CategoryDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-navy-900 dark:text-white">{label}</span>
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-white/15')}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </label>
  );
}
