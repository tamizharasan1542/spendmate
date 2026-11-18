import { ArrowRight, ArrowUpRight, CalendarCheck2, CalendarPlus, ChartPie, CircleCheckBig, Database, IndianRupee, ReceiptText, Sparkles, Wallet } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { Link, navigate } from '../lib/router';
import { firstName, formatDate, lastNMonths, monthKey, monthLabel, todayISO } from '../lib/format';
import { sumMoney } from '../lib/calc';
import { groupExpenses } from '../lib/reports';
import { createSampleData } from '../data/sampleData';
import { Card, EmptyState, ProgressBar, SectionTitle, budgetBarClass } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { BarChart, BarList, DonutChart } from '../components/charts/Charts';
import { EventIcon, TransactionRow, UpcomingList } from '../components/domain';
import { cn } from '../lib/id';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function WelcomeEmpty() {
  const { data, dispatch } = useStore();
  const { openModal, toast } = useUI();
  return (
    <div className="animate-slide-up">
      <Card className="overflow-hidden">
        <div className="bg-linear-to-br from-navy-800 via-navy-900 to-navy-950 px-6 py-10 text-white sm:px-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-200">
            <Sparkles className="size-3.5" /> Welcome to SpendMate
          </span>
          <h1 className="mt-4 max-w-lg text-2xl font-bold tracking-tight sm:text-3xl">Every rupee for every occasion, accounted for.</h1>
          <p className="mt-2 max-w-lg text-sm text-white/70">Create an event, add what you’ve agreed to pay, then record advances and part-payments as they happen. SpendMate keeps the balances.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" icon={CalendarPlus} onClick={() => openModal({ kind: 'event' })}>
              Create your first event
            </Button>
            <Button
              size="lg"
              variant="ghost"
              icon={Database}
              className="text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => {
                dispatch({ type: 'data/replace', data: { ...createSampleData(), theme: data.theme } });
                toast('Sample data loaded');
              }}
            >
              Explore with sample data
            </Button>
          </div>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-3 dark:bg-white/5">
          {[
            ['1', 'Create an event', 'Wedding, construction, travel…'],
            ['2', 'Add expenses', 'Agreed amount per vendor'],
            ['3', 'Record payments', 'Advance → partial → final'],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3 bg-white p-5 dark:bg-navy-900">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-400/10 dark:text-brand-300">{n}</span>
              <div>
                <div className="text-sm font-semibold text-navy-900 dark:text-white">{t}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function Dashboard() {
  const { data, derived, money, compact } = useStore();
  const { openModal } = useUI();
  const t = derived.totals;

  if (derived.events.length === 0) return <WelcomeEmpty />;

  const paidShare = t.totalExpense > 0 ? t.paid / t.totalExpense : 0;
  const months = lastNMonths(6);
  const monthly = months.map((k) => ({ label: monthLabel(k), values: [sumMoney(derived.payments.filter((p) => monthKey(p.date) === k).map((p) => p.amount))] }));
  const thisMonth = monthly[monthly.length - 1].values[0];

  const byCategory = groupExpenses(derived, derived.expenses, 'category');
  const top = byCategory.slice(0, 5);
  const rest = byCategory.slice(5);
  const segments = [
    ...top.map((r) => ({ label: r.label, value: r.agreed, color: r.color ?? '#94a3b8' })),
    ...(rest.length ? [{ label: 'Others', value: sumMoney(rest.map((r) => r.agreed)), color: '#cbd5e1' }] : []),
  ];

  const budgetEvents = derived.events.filter((e) => e.budget > 0 && (e.status === 'active' || e.status === 'planning'));
  const recent = [...derived.payments].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date))).slice(0, 6);
  const dueThisWeek = derived.upcoming.filter((u) => u.daysLeft <= 7);
  const dueWeekTotal = sumMoney(dueThisWeek.map((u) => u.pending));

  const quick = [
    { label: 'Create Event', icon: CalendarPlus, onClick: () => openModal({ kind: 'event' }) },
    { label: 'Add Expense', icon: ReceiptText, onClick: () => openModal({ kind: 'expense' }) },
    { label: 'Add Payment', icon: IndianRupee, onClick: () => openModal({ kind: 'payment' }), disabled: derived.expenses.length === 0 },
    { label: 'View Reports', icon: ChartPie, onClick: () => navigate('/reports') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(todayISO())}</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px] dark:text-white">
            {greeting()}, {firstName(data.profile.fullName)}
          </h1>
        </div>
      </div>

      {/* Hero summary */}
      <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-navy-800 via-navy-900 to-navy-950 p-5 text-white shadow-xl shadow-navy-900/10 sm:p-7 dark:from-navy-800 dark:via-navy-900 dark:to-black dark:ring-1 dark:ring-white/5">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-500/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Wallet className="size-4" /> Total expenses across all events
            </div>
            <div className="mt-1.5 text-[34px] font-extrabold leading-tight tracking-tight tabular sm:text-[42px]">{money(t.totalExpense)}</div>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-white/60">
                <span>{Math.round(paidShare * 100)}% paid</span>
                {t.totalBudget > 0 && <span>Budget {compact(t.totalBudget)}</span>}
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-300 transition-[width] duration-700" style={{ width: `${Math.min(100, paidShare * 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10 backdrop-blur">
              <div className="flex items-center gap-1.5 text-xs text-white/60">
                <span className="size-2 rounded-full bg-emerald-400" /> Paid
              </div>
              <div className="mt-1 text-lg font-bold tabular">{money(t.paid)}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10 backdrop-blur">
              <div className="flex items-center gap-1.5 text-xs text-white/60">
                <span className="size-2 rounded-full bg-amber-400" /> Pending
              </div>
              <div className="mt-1 text-lg font-bold tabular">{money(t.pending)}</div>
            </div>
            <Link to="/events" className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10 transition hover:bg-white/[0.12]">
              <div className="flex items-center gap-1.5 text-xs text-white/60">
                <CalendarCheck2 className="size-3.5" /> Active events
              </div>
              <div className="mt-1 text-lg font-bold tabular">
                {t.activeEvents}
                {t.planningEvents > 0 && <span className="ml-1.5 text-xs font-medium text-white/50">+{t.planningEvents} planning</span>}
              </div>
            </Link>
            <Link to="/events" className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10 transition hover:bg-white/[0.12]">
              <div className="flex items-center gap-1.5 text-xs text-white/60">
                <CircleCheckBig className="size-3.5" /> Completed
              </div>
              <div className="mt-1 text-lg font-bold tabular">{t.completedEvents}</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={q.onClick}
            disabled={q.disabled}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-1 py-3.5 text-center transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md hover:shadow-brand-900/5 active:scale-[0.97] disabled:opacity-50 sm:flex-row sm:gap-3 sm:px-4 sm:text-left dark:border-white/[0.06] dark:bg-navy-900/70 dark:hover:border-brand-400/30"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-400/10 dark:text-brand-300">
              <q.icon className="size-5" />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-navy-800 sm:text-sm dark:text-slate-200">{q.label}</span>
          </button>
        ))}
      </div>

      {dueThisWeek.length > 0 && (
        <Link
          to={`/expenses/${dueThisWeek[0].expense.id}`}
          className="flex items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-100/70 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200">
            <IndianRupee className="size-4" />
          </span>
          <span className="flex-1">
            <strong>{money(dueWeekTotal)}</strong> due within 7 days across {dueThisWeek.length} {dueThisWeek.length === 1 ? 'expense' : 'expenses'}
            {dueThisWeek.some((u) => u.daysLeft < 0) && ' (some overdue)'}
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="p-5">
            <SectionTitle title="Monthly spend" subtitle="Payments made in the last 6 months" action={<span className="text-right text-xs text-slate-500 dark:text-slate-400">This month<br /><strong className="text-sm text-navy-900 tabular dark:text-white">{money(thisMonth)}</strong></span>} />
            <BarChart data={monthly} series={[{ name: 'Paid', color: '#4270f2' }]} format={compact} ariaLabel="Payments per month for the last six months" />
          </Card>

          <Card className="p-5">
            <SectionTitle title="Event-wise summary" action={<Link to="/events" className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">View all</Link>} />
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {derived.events.filter((e) => e.status !== 'archived').slice(0, 5).map((e) => {
                const s = derived.eventSummary.get(e.id)!;
                return (
                  <li key={e.id}>
                    <Link to={`/events/${e.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <EventIcon event={e} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-navy-900 dark:text-white">{e.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {s.expenseCount} expenses · <span className="text-emerald-600 dark:text-emerald-400">{compact(s.paid)} paid</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-navy-900 tabular dark:text-white">{money(s.totalExpense)}</div>
                        <div className={cn('text-[11px] tabular', s.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}>{s.outstanding > 0 ? `${compact(s.outstanding)} pending` : 'Settled'}</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Spending by category" subtitle="Agreed amounts across all events" />
            {segments.length === 0 ? (
              <EmptyState icon={ChartPie} title="No expenses yet" message="Add expenses to see how your spending splits across categories." className="py-6" />
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <DonutChart segments={segments} centerLabel="Total" centerValue={compact(t.totalExpense)} ariaLabel="Spending by category" />
                <ul className="w-full flex-1 space-y-2.5">
                  {segments.map((s) => (
                    <li key={s.label} className="flex items-center gap-3 text-sm">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{s.label}</span>
                      <span className="text-xs text-slate-400 tabular">{t.totalExpense ? Math.round((s.value / t.totalExpense) * 100) : 0}%</span>
                      <span className="w-20 text-right font-semibold text-navy-900 tabular dark:text-white">{compact(s.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <SectionTitle title="Upcoming payments" subtitle="Balances with a due date" />
            <UpcomingList limit={5} />
          </Card>

          <Card className="p-5">
            <SectionTitle title="Budget overview" subtitle={t.totalBudget > 0 ? `${money(t.totalExpense)} of ${money(t.totalBudget)} committed` : undefined} />
            {budgetEvents.length === 0 ? (
              <p className="py-4 text-sm text-slate-400">Set a budget on an active event to track it here.</p>
            ) : (
              <ul className="space-y-4">
                {budgetEvents.map((e) => {
                  const s = derived.eventSummary.get(e.id)!;
                  return (
                    <li key={e.id}>
                      <Link to={`/events/${e.id}`} className="block">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-navy-800 dark:text-slate-200">{e.name}</span>
                          <span className={cn('shrink-0 text-xs font-semibold tabular', s.budgetUsed > 1 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400')}>{Math.round(s.budgetUsed * 100)}%</span>
                        </div>
                        <ProgressBar value={s.budgetUsed} barClassName={budgetBarClass(s.budgetUsed)} label={`${e.name} budget used`} />
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {s.remainingBudget >= 0 ? `${compact(s.remainingBudget)} left of ${compact(s.budget)}` : `Over by ${compact(-s.remainingBudget)}`}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Recent transactions" action={<Link to="/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">Reports <ArrowUpRight className="size-3.5" /></Link>} />
            {recent.length === 0 ? <p className="py-4 text-sm text-slate-400">No payments recorded yet.</p> : recent.map((p) => <TransactionRow key={p.id} payment={p} />)}
          </Card>

          {byCategory.length > 5 && (
            <Card className="p-5">
              <SectionTitle title="Top vendors by commitment" />
              <BarList rows={groupExpenses(derived, derived.expenses, 'vendor').filter((r) => r.key !== '__none').slice(0, 4).map((r) => ({ key: r.key, label: r.label, value: r.agreed, sub: `${compact(r.paid)} paid · ${compact(r.pending)} pending` }))} format={compact} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
