import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { goBack } from '../../lib/router';

export function PageHeader({ title, subtitle, actions, backTo, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; backTo?: string; eyebrow?: ReactNode }) {
  return (
    <div className="mb-5 lg:mb-7">
      {backTo && <BackButton to={backTo} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{eyebrow}</div>}
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px] dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function BackButton({ to }: { to: string }) {
  return (
    <button type="button" onClick={() => goBack(to)} className="-ml-1 mb-3 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-slate-500 transition hover:text-navy-900 dark:text-slate-400 dark:hover:text-white">
      <ArrowLeft className="size-4" /> Back
    </button>
  );
}
