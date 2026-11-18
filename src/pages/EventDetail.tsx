import { useMemo, useState } from 'react';
import { Archive, CalendarSearch, CircleDollarSign, Clock3, FileWarning, Pencil, Plus, ReceiptText, Share2, Trash2, Wallet } from 'lucide-react';
import type { EventStatus, PaymentStatus } from '../types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { navigate } from '../lib/router';
import { cn } from '../lib/id';
import { formatDate, formatDateTime, todayISO } from '../lib/format';
import { COVERS, EVENT_STATUSES, PAYMENT_STATUS_META, PAYMENT_STATUS_ORDER, paymentKindLabel, paymentMethodMeta } from '../data/constants';
import { BackButton } from '../components/layout/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Card, EmptyState, EventStatusBadge, SectionTitle, Segmented, StatTile } from '../components/ui/primitives';
import { ActivityLog, EventIcon, EventMeta, ExpenseRow, UpcomingList } from '../components/domain';

type Tab = 'expenses' | 'upcoming' | 'timeline' | 'activity';
type StatusFilter = 'all' | PaymentStatus;

export function EventDetail({ id }: { id: string }) {
  const { data, derived, dispatch, money, compact } = useStore();
  const { openModal, confirm, toast } = useUI();
  const [tab, setTab] = useState<Tab>('expenses');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<'due' | 'amount' | 'pending' | 'name'>('pending');
  const event = derived.eventById.get(id);

  const expenses = useMemo(() => derived.expensesByEvent.get(id) ?? [], [derived, id]);
  const sorted = useMemo(() => {
    const list = expenses.filter((x) => statusFilter === 'all' || derived.expenseSummary.get(x.id)?.status === statusFilter);
    const s = (xid: string) => derived.expenseSummary.get(xid)!;
    return [...list].sort((a, b) => {
      if (sort === 'amount') return b.agreedAmount - a.agreedAmount;
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'due') return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
      return s(b.id).pending - s(a.id).pending;
    });
  }, [expenses, derived, statusFilter, sort]);

  const timeline = useMemo(() => {
    type Item = { key: string; date: string; ts: string; kind: 'expense' | 'payment'; title: string; sub: string; amount: number; expenseId: string; by: string };
    const items: Item[] = [];
    for (const x of expenses) {
      items.push({ key: `x-${x.id}`, date: x.expenseDate, ts: x.createdAt, kind: 'expense', title: `${x.name} agreed`, sub: x.vendorName || 'Expense added', amount: x.agreedAmount, expenseId: x.id, by: x.createdBy });
      for (const p of derived.paymentsByExpense.get(x.id) ?? []) {
        items.push({ key: `p-${p.id}`, date: p.date, ts: p.createdAt, kind: 'payment', title: `${paymentKindLabel(p.kind)} – ${x.name}`, sub: paymentMethodMeta(p.method).label, amount: p.amount, expenseId: x.id, by: p.createdBy });
      }
    }
    items.sort((a, b) => (a.date === b.date ? b.ts.localeCompare(a.ts) : b.date.localeCompare(a.date)));
    const groups: { month: string; items: Item[] }[] = [];
    for (const it of items) {
      const label = new Date(`${it.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const g = groups[groups.length - 1];
      if (g && g.month === label) g.items.push(it);
      else groups.push({ month: label, items: [it] });
    }
    return groups;
  }, [expenses, derived]);

  if (!event) {
    return (
      <Card className="mt-6">
        <EmptyState icon={CalendarSearch} title="Event not found" message="It may have been deleted, or the link is incorrect." action={<Button onClick={() => navigate('/events')}>Back to events</Button>} />
      </Card>
    );
  }

  const s = derived.eventSummary.get(event.id)!;
  const logs = data.auditLogs.filter((l) => l.eventId === event.id);
  const upcomingCount = derived.upcoming.filter((u) => u.event.id === event.id).length;

  const setStatus = (status: EventStatus) => {
    dispatch({ type: 'event/update', event: { ...event, status } });
    toast(`Marked as ${EVENT_STATUSES.find((x) => x.value === status)?.label}`);
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete this event?',
      message: (
        <>
          <strong>{event.name}</strong> and its {s.expenseCount} expenses will be removed from your dashboard and reports. The deletion is recorded in the activity log. Consider <strong>archiving</strong> instead if you may need it later.
        </>
      ),
      confirmLabel: 'Delete event',
    });
    if (!ok) return;
    dispatch({ type: 'event/delete', id: event.id });
    toast('Event deleted');
    navigate('/events', { replace: true });
  };

  const tabOptions: { value: Tab; label: string; count?: number }[] = [
    { value: 'expenses', label: 'Expenses', count: s.expenseCount },
    { value: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { value: 'timeline', label: 'Timeline' },
    { value: 'activity', label: 'Activity' },
  ];

  return (
    <div>
      <BackButton to="/events" />

      {/* Cover */}
      <div className={cn('relative overflow-hidden rounded-[28px] bg-linear-to-br p-5 text-white shadow-xl shadow-navy-900/10 sm:p-7', COVERS[event.cover].gradient)}>
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="hidden sm:block">
              <EventIcon event={event} size="lg" />
            </span>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{event.type}</span>
                <span className="rounded-full bg-white px-0.5 py-0.5 shadow-sm">
                  <EventStatusBadge status={event.status} />
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{event.name}</h1>
              <div className="mt-2">
                <EventMeta event={event} />
              </div>
              {(event.startDate || event.endDate) && (
                <p className="mt-1 text-xs text-white/60">
                  {formatDate(event.startDate)} → {event.endDate ? formatDate(event.endDate) : 'ongoing'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-2xl bg-white/10 p-1 backdrop-blur">
            <IconButton icon={Pencil} label="Edit event" className="text-white hover:bg-white/15 hover:text-white dark:text-white" onClick={() => openModal({ kind: 'event', eventId: event.id })} />
            <IconButton icon={Share2} label="Share event (available in Phase 6)" className="text-white/50 hover:bg-white/15 hover:text-white/60 dark:text-white/50" disabled />
            <IconButton
              icon={Archive}
              label={event.status === 'archived' ? 'Unarchive event' : 'Archive event'}
              className="text-white hover:bg-white/15 hover:text-white dark:text-white"
              onClick={() => setStatus(event.status === 'archived' ? 'active' : 'archived')}
            />
            <IconButton icon={Trash2} label="Delete event" className="text-white hover:bg-rose-500/80 hover:text-white dark:text-white" onClick={onDelete} />
          </div>
        </div>

        <div className="relative mt-6">
          <div className="mb-1.5 flex items-end justify-between text-sm">
            <span className="text-white/70">Budget used</span>
            <span className="font-semibold tabular">
              {money(s.totalExpense)} <span className="font-normal text-white/60">/ {s.budget > 0 ? money(s.budget) : 'no budget'}</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
            <div className={cn('h-full rounded-full transition-[width] duration-700', s.budgetUsed > 1 ? 'bg-rose-300' : 'bg-white')} style={{ width: `${Math.min(100, s.budgetUsed * 100)}%` }} />
          </div>
          {s.budget > 0 && (
            <p className="mt-1.5 text-xs text-white/70">
              {s.remainingBudget >= 0 ? `${money(s.remainingBudget)} remaining` : `Over budget by ${money(-s.remainingBudget)}`} · {Math.round(s.budgetUsed * 100)}% used
            </p>
          )}
        </div>
      </div>

      {/* Status quick change */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {EVENT_STATUSES.map((st) => (
          <button
            key={st.value}
            type="button"
            onClick={() => st.value !== event.status && setStatus(st.value)}
            aria-pressed={event.status === st.value}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition',
              event.status === st.value ? st.badge : 'text-slate-500 ring-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:ring-white/10 dark:hover:bg-white/5',
            )}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total expenses" value={money(s.totalExpense)} sub={`${s.expenseCount} expenses`} icon={ReceiptText} tone="brand" />
        <StatTile label="Payments made" value={money(s.paid)} sub={s.totalExpense ? `${Math.round((s.paid / s.totalExpense) * 100)}% of total` : '—'} icon={CircleDollarSign} tone="emerald" />
        <StatTile label="Outstanding" value={money(s.outstanding)} sub={s.overdueCount ? `${s.overdueCount} overdue` : s.nextDue ? `Next due ${formatDate(s.nextDue.dueDate, 'short')}` : 'Nothing due'} icon={Clock3} tone={s.overdueCount ? 'rose' : 'amber'} />
        <StatTile
          label="Remaining budget"
          value={s.budget > 0 ? money(s.remainingBudget) : '—'}
          sub={s.budget > 0 ? `of ${compact(s.budget)}` : 'No budget set'}
          icon={Wallet}
          tone={s.remainingBudget < 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Payment status overview */}
      {s.expenseCount > 0 && (
        <Card className="mt-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-navy-900 dark:text-white">Payment status</span>
            <span className="text-xs text-slate-500">{s.expenseCount} expenses</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            {PAYMENT_STATUS_ORDER.map((st) =>
              s.statusCounts[st] ? <div key={st} className={cn('h-full', PAYMENT_STATUS_META[st].bar)} style={{ width: `${(s.statusCounts[st] / s.expenseCount) * 100}%` }} title={PAYMENT_STATUS_META[st].label} /> : null,
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_STATUS_ORDER.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setTab('expenses');
                  setStatusFilter(statusFilter === st ? 'all' : st);
                }}
                aria-pressed={statusFilter === st}
                className={cn('flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition', statusFilter === st ? 'bg-slate-100 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5')}
              >
                <span className={cn('size-2 rounded-full', PAYMENT_STATUS_META[st].dot)} />
                <span className="flex-1 text-slate-600 dark:text-slate-300">{PAYMENT_STATUS_META[st].label}</span>
                <span className="font-bold text-navy-900 tabular dark:text-white">{s.statusCounts[st]}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {event.description && (
        <p className="mt-4 rounded-2xl bg-slate-100/70 px-4 py-3 text-sm text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">{event.description}</p>
      )}

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented options={tabOptions} value={tab} onChange={setTab} ariaLabel="Event sections" />
        <div className="flex gap-2">
          {s.expenseCount > 0 && (
            <Button variant="secondary" size="sm" icon={CircleDollarSign} onClick={() => openModal({ kind: 'payment', eventId: event.id })}>
              Add payment
            </Button>
          )}
          <Button size="sm" icon={Plus} onClick={() => openModal({ kind: 'expense', eventId: event.id })}>
            Add expense
          </Button>
        </div>
      </div>

      <Card className="mt-3 p-2 sm:p-3">
        {tab === 'expenses' &&
          (expenses.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No expenses yet"
              message="Add the first expense – e.g. the venue with its agreed amount. You can record the advance right away or later."
              action={
                <Button icon={Plus} onClick={() => openModal({ kind: 'expense', eventId: event.id })}>
                  Add expense
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {statusFilter === 'all' ? `${sorted.length} expenses` : `${sorted.length} ${PAYMENT_STATUS_META[statusFilter].label.toLowerCase()}`}
                  {statusFilter !== 'all' && (
                    <button type="button" onClick={() => setStatusFilter('all')} className="ml-2 font-semibold text-brand-600 dark:text-brand-400">
                      Clear filter
                    </button>
                  )}
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  aria-label="Sort expenses"
                  className="rounded-lg border-0 bg-transparent py-1 pr-1 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:bg-navy-900 dark:text-slate-300"
                >
                  <option value="pending">Most pending</option>
                  <option value="amount">Highest amount</option>
                  <option value="due">Due date</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {sorted.map((x) => (
                  <ExpenseRow key={x.id} expense={x} />
                ))}
              </div>
            </>
          ))}

        {tab === 'upcoming' && (
          <div className="px-3 py-1">
            <UpcomingList eventId={event.id} limit={50} />
          </div>
        )}

        {tab === 'timeline' && (
          <div className="px-3 py-3">
            {timeline.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">The timeline fills up as you add expenses and payments.</p>
            ) : (
              timeline.map((g) => (
                <div key={g.month} className="mb-5 last:mb-0">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.month}</div>
                  <ol className="relative ml-2 border-l border-slate-200 dark:border-white/10">
                    {g.items.map((it) => (
                      <li key={it.key} className="relative pb-4 pl-5 last:pb-0">
                        <span className={cn('absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-4 ring-white dark:ring-navy-900', it.kind === 'payment' ? 'bg-emerald-500' : 'bg-brand-500')} />
                        <a href={`#/expenses/${it.expenseId}`} className="flex items-start justify-between gap-3 rounded-lg hover:opacity-80">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-navy-900 dark:text-white">{it.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(it.date)} · {it.sub} · by {it.by.split(' ')[0]}
                            </div>
                          </div>
                          <span className={cn('shrink-0 text-sm font-semibold tabular', it.kind === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-navy-900 dark:text-white')}>
                            {it.kind === 'payment' ? '−' : ''}
                            {money(it.amount)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="px-3 py-3">
            <SectionTitle title="Change history" subtitle="Edits and deletions are kept for every expense and payment in this event." />
            <ActivityLog logs={logs} emptyText={`No changes recorded since this event was created on ${formatDateTime(event.createdAt)}.`} />
          </div>
        )}
      </Card>

      {s.overdueCount > 0 && tab === 'expenses' && (
        <div className="mt-4 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
          <FileWarning className="size-4" /> {s.overdueCount} {s.overdueCount === 1 ? 'payment is' : 'payments are'} past the due date (today is {formatDate(todayISO())}).
        </div>
      )}
    </div>
  );
}
