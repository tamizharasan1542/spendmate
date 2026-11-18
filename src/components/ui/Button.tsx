import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/id';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:hover:bg-brand-400 dark:shadow-none',
  secondary:
    'bg-white text-navy-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 active:bg-slate-100 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/10',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-navy-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white',
  danger: 'bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700 active:bg-rose-800 dark:shadow-none',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-400/10 dark:text-brand-300 dark:hover:bg-brand-400/20',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', icon: Icon, block, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-navy-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white',
        className,
      )}
      {...rest}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
