import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/id';

export const inputBase =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-navy-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 dark:bg-navy-950/60 dark:text-white dark:placeholder:text-slate-500';
const ok = 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/15 dark:border-white/10 dark:focus:border-brand-400';
const bad = 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15 dark:border-rose-400/60';

export function Field({ label, htmlFor, error, hint, required, children, className }: { label: string; htmlFor?: string; error?: string; hint?: ReactNode; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-rose-500" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} aria-describedby={invalid && rest.id ? `${rest.id}-error` : undefined} className={cn(inputBase, invalid ? bad : ok, className)} {...rest} />;
}

export function AmountInput({ invalid, prefix, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[15px] font-medium text-slate-400">{prefix}</span>
      <input
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && rest.id ? `${rest.id}-error` : undefined}
        className={cn(inputBase, invalid ? bad : ok, 'pl-9 font-semibold tabular', className)}
        {...rest}
      />
    </div>
  );
}

export function SelectInput({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select aria-invalid={invalid || undefined} className={cn(inputBase, invalid ? bad : ok, 'appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
}

export function TextArea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cn(inputBase, invalid ? bad : ok, 'min-h-[84px] resize-y', className)} {...rest} />;
}

/** Selectable pill used for payment methods, statuses, etc. */
export function ChoiceChip({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-[0.97]',
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/15 dark:border-brand-400 dark:bg-brand-400/10 dark:text-brand-200'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20',
        className,
      )}
    >
      {children}
    </button>
  );
}
