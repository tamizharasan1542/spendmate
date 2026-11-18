import { CalendarClock, ChevronRight, History, MapPin, Pencil, Trash2, User } from 'lucide-react';
import type { AuditLog, Expense, Payment, SMEvent } from '../types';
import { COVERS, PAYMENT_STATUS_META, eventTypeMeta, paymentKindLabel, paymentMethodMeta } from '../data/constants';
import { daysBetween, formatDate, formatDateTime, relativeDue, todayISO } from '../lib/format';
import { cn } from '../lib/id';
import { Link } from '../lib/router';
import { useStore } from '../store/AppStore';
import { Card, CategoryDot, EventStatusBadge, ProgressBar, budgetBarClass } from './ui/primitives';
import { IconButton } from './ui/Button';

export function EventIcon({ event, size = 'md' }: { event: Pick<SMEvent, 'type' | 'cover'>; size?: 'sm' | 'md' | 'lg' }) {
  const meta = eventTypeMeta(event.type);
  return (
    <span className={cn('grid shrink-0 place-items-center bg-linear-to-br text-white shadow-sm', COVERS[event.cover].gradient, size === 'sm' ? 'size-9 rounded-xl' : size === 'lg' ? 'size-14 rounded-2xl' : 'size-11 rounded-2xl')}>
      <meta.icon className={size === 'lg' ? 'size-7' : size === 'sm' ? 'size-4' : 'size-5'} aria-hidden />
    </span>
  );
}

export function EventCard({ event }: { event: SMEvent }) {
  const { derived, money, compact } = useStore();
  const s = derived.eventSummary.get(event.id)!;
  const over = s.budget > 0 && s.totalExpense > s.budget;
  return (
    <Link to={`/events/${event.id}`} className="group block focus-visible:outline-none">
      <Card className="relative overflow-hidden p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-navy-900/5 group-focus-visible:ring-2 group-focus-visible:ring-brand-500 dark:group-hover:border-white/10">
        <div className="flex items-start gap-3.5">
          <EventIcon event={event} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold text-navy-900 dark:text-white">{event.name}</h3>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {event.type}
              {event.eventDate && ` · ${formatDate(event.eventDate)}`}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total expenses</div>
            <div className="text-xl font-bold tracking-tight text-navy-900 tabular dark:text-white">{money(s.totalExpense)}</div>
          </div>
          {s.budget > 0 && (
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              of <span className="font-semibold text-slate-700 tabular dark:text-slate-300">{compact(s.budget)}</span> budget
            </div>
          )}
        </div>
        {s.budget > 0 && <ProgressBar value={s.budgetUsed} className="mt-2.5" barClassName={budgetBarClass(s.budgetUsed)} label="Budget used" />}

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3.5 text-xs dark:border-white/5">
          <div>
            <div className="text-slate-400">Paid</div>
            <div className="font-semibold text-emerald-600 tabular dark:text-emerald-400">{money(s.paid)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">Pending</div>
            <div className={cn('font-semibold tabular', s.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500')}>{money(s.outstanding)}</div>
          </div>
        </div>
        {(over || s.overdueCount > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {over && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">Over budget by {compact(s.totalExpense - s.budget)}</span>}
            {s.overdueCount > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">{s.overdueCount} overdue</span>}
          </div>
        )}
      </Card>
    </Link>
  );
}

export function ExpenseRow({ expense, showEvent }: { expense: Expense; showEvent?: boolean }) {
  const { derived, money } = useStore();
  const s = derived.expenseSummary.get(expense.id)!;
  const cat = derived.categoryById.get(expense.categoryId);
  const ev = derived.eventById.get(expense.eventId);
  const overdue = s.pending > 0 && expense.dueDate && expense.dueDate < todayISO();
  return (
    <Link to={`/expenses/${expense.id}`} className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50 sm:px-4 dark:hover:bg-white/[0.03]">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${cat?.color ?? '#94a3b8'}1f` }}>
        <CategoryDot color={cat?.color ?? '#94a3b8'} className="size-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-navy-900 dark:text-white">{expense.name}</span>
          <span className="shrink-0 font-semibold text-navy-900 tabular dark:text-white">{money(expense.agreedAmount)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">
            {showEvent && ev ? `${ev.name} · ` : ''}
            {expense.vendorName || cat?.name || 'No vendor'}
          </span>
          <span className={cn('shrink-0 tabular', s.pending > 0 ? (overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400') : 'text-emerald-600 dark:text-emerald-400')}>
            {s.status === 'overpaid' ? `+${money(s.overpaidBy)} over` : s.pending > 0 ? `${money(s.pending)} due` : 'Settled'}
          </span>
        </div>
        <ProgressBar value={s.progress} size="sm" className="mt-2" barClassName={PAYMENT_STATUS_META[s.status].bar} label={`${expense.name} paid`} />
      </div>
      <ChevronRight className="hidden size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 sm:block dark:text-slate-600" />
    </Link>
  );
}

export function UpcomingList({ limit = 5, eventId }: { limit?: number; eventId?: string }) {
  const { derived, money } = useStore();
  const items = derived.upcoming.filter((u) => !eventId || u.event.id === eventId).slice(0, limit);
  if (items.length === 0) return <p className="py-6 text-center text-sm text-slate-400">No upcoming dues. You’re all caught up.</p>;
  return (
    <ul className="divide-y divide-slate-100 dark:divide-white/5">
      {items.map((u) => {
        const overdue = u.daysLeft < 0;
        const soon = u.daysLeft >= 0 && u.daysLeft <= 7;
        return (
          <li key={u.expense.id}>
            <Link to={`/expenses/${u.expense.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              <span
                className={cn(
                  'flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-center leading-none',
                  overdue ? 'bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300' : soon ? 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300',
                )}
              >
                <span className="text-[15px] font-bold">{u.dueDate.slice(8, 10)}</span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase">{formatDate(u.dueDate, 'short').split(' ')[1]}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-navy-900 dark:text-white">{u.expense.name}</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">{eventId ? u.expense.vendorName || 'Payment due' : u.event.name}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-navy-900 tabular dark:text-white">{money(u.pending)}</div>
                <div className={cn('text-[11px] font-medium', overdue ? 'text-rose-600 dark:text-rose-400' : soon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}>{relativeDue(u.dueDate)}</div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function TransactionRow({ payment }: { payment: Payment }) {
  const { derived, money } = useStore();
  const x = derived.expenseById.get(payment.expenseId);
  const ev = x ? derived.eventById.get(x.eventId) : undefined;
  const m = paymentMethodMeta(payment.method);
  return (
    <Link to={`/expenses/${payment.expenseId}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
        <m.icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-navy-900 dark:text-white">{x?.name ?? 'Payment'}</div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          {ev?.name} · {m.label}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-navy-900 tabular dark:text-white">−{money(payment.amount)}</div>
        <div className="text-[11px] text-slate-400">{formatDate(payment.date, daysBetween(payment.date, todayISO()) < 300 ? 'short' : 'medium')}</div>
      </div>
    </Link>
  );
}

export function PaymentHistory({ expense, onEdit, onDelete }: { expense: Expense; onEdit: (p: Payment) => void; onDelete: (p: Payment) => void }) {
  const { derived, money } = useStore();
  const payments = derived.paymentsByExpense.get(expense.id) ?? [];
  let running = 0;
  const rows = payments.map((p) => {
    running = Math.round((running + p.amount) * 100) / 100;
    return { p, balance: Math.round((expense.agreedAmount - running) * 100) / 100 };
  });
  if (rows.length === 0) return null;
  return (
    <ol className="relative space-y-1">
      {rows.map(({ p, balance }, i) => {
        const m = paymentMethodMeta(p.method);
        return (
          <li key={p.id} className="relative flex gap-3.5 rounded-2xl px-1 py-3 sm:px-2">
            {i < rows.length - 1 && <span className="absolute left-[25px] top-14 h-[calc(100%-2.75rem)] w-px bg-slate-200 sm:left-[29px] dark:bg-white/10" aria-hidden />}
            <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-4 ring-white dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-navy-900">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900 dark:text-white">{paymentKindLabel(p.kind)}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDate(p.date)}</span>
                    <span className="inline-flex items-center gap-1">
                      <m.icon className="size-3.5" aria-hidden /> {m.label}
                    </span>
                    {p.reference && <span className="truncate">Ref {p.reference}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold text-navy-900 tabular dark:text-white">{money(p.amount)}</div>
                  <div className={cn('text-[11px] tabular', balance < 0 ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400')}>
                    {balance < 0 ? `Overpaid ${money(-balance)}` : balance === 0 ? 'Fully paid' : `Balance ${money(balance)}`}
                  </div>
                </div>
              </div>
              {p.notes && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{p.notes}</p>}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <User className="size-3" aria-hidden /> Added by {p.createdBy}
                  {p.updatedAt !== p.createdAt && ' · edited'}
                </span>
                <span className="flex">
                  <IconButton icon={Pencil} label={`Edit payment of ${money(p.amount)}`} className="size-8" onClick={() => onEdit(p)} />
                  <IconButton icon={Trash2} label={`Delete payment of ${money(p.amount)}`} className="size-8 hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-400/10" onClick={() => onDelete(p)} />
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityLog({ logs, emptyText = 'No changes recorded yet.' }: { logs: AuditLog[]; emptyText?: string }) {
  if (logs.length === 0) return <p className="py-4 text-sm text-slate-400">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {logs.map((l) => (
        <li key={l.id} className="flex gap-3">
          <span
            className={cn(
              'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
              l.action === 'delete' ? 'bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300' : l.action === 'update' ? 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300' : 'bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300',
            )}
          >
            {l.action === 'delete' ? <Trash2 className="size-3.5" /> : l.action === 'update' ? <Pencil className="size-3.5" /> : <History className="size-3.5" />}
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="text-navy-900 dark:text-slate-100">{l.summary}</div>
            {l.changes.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                {l.changes.map((c) => (
                  <li key={c.field}>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{c.field}:</span> <span className="line-through decoration-slate-300">{c.from}</span> → <span className="font-medium text-navy-800 dark:text-slate-200">{c.to}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-0.5 text-[11px] text-slate-400">
              {l.actor} · {formatDateTime(l.at)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EventMeta({ event }: { event: SMEvent }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
      {event.eventDate && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-4" /> {formatDate(event.eventDate)}
        </span>
      )}
      {event.location && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4" /> {event.location}
        </span>
      )}
    </div>
  );
}

