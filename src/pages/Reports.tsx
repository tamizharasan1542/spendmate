import { useMemo, useState } from 'react';
import { ChartPie, Download, FileText, SlidersHorizontal } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, EmptyState, ProgressBar, SectionTitle, Segmented, StatTile, budgetBarClass } from '../components/ui/primitives';
import { SelectInput, TextInput } from '../components/ui/Field';
import { BarChart, BarList, DonutChart, Legend, LineChart } from '../components/charts/Charts';
import { downloadCSV, filterExpenses, filterPayments, groupExpenses, paymentsByPeriod, resolveRange, toCSV, type DatePreset, type ReportFilters, type Row } from '../lib/reports';
import { sumMoney } from '../lib/calc';
import { formatDate, todayISO } from '../lib/format';
import { PAYMENT_STATUS_META, PAYMENT_STATUS_ORDER, paymentKindLabel, paymentMethodMeta } from '../data/constants';
import { cn } from '../lib/id';

type ReportKind = 'overview' | 'event' | 'category' | 'vendor' | 'monthly' | 'yearly' | 'paid' | 'budget';

const REPORTS: { value: ReportKind; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'event', label: 'By event' },
  { value: 'category', label: 'By category' },
  { value: 'vendor', label: 'By vendor' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'paid', label: 'Paid vs Pending' },
  { value: 'budget', label: 'Budget vs Actual' },
];

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

const C = { agreed: '#1a2643', agreedDark: '#93b4ff', paid: '#10b981', pending: '#f59e0b', brand: '#4270f2' };

function RowsTable({ rows, money, firstCol, showBudget }: { rows: Row[]; money: (n: number) => string; firstCol: string; showBudget?: boolean }) {
  const total = { agreed: sumMoney(rows.map((r) => r.agreed)), paid: sumMoney(rows.map((r) => r.paid)), pending: sumMoney(rows.map((r) => r.pending)), count: rows.reduce((a, r) => a + r.count, 0) };
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500 dark:border-white/5 dark:text-slate-400">
            <th className="px-2 py-2 font-medium">{firstCol}</th>
            <th className="px-2 py-2 text-right font-medium">Items</th>
            {showBudget && <th className="px-2 py-2 text-right font-medium">Budget</th>}
            <th className="px-2 py-2 text-right font-medium">Agreed</th>
            <th className="px-2 py-2 text-right font-medium">Paid</th>
            <th className="px-2 py-2 text-right font-medium">Pending</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
          {rows.map((r) => (
            <tr key={r.key} className="text-navy-800 dark:text-slate-200">
              <td className="px-2 py-2.5">
                <span className="flex items-center gap-2">
                  {r.color && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />}
                  <span className="truncate">{r.label}</span>
                </span>
              </td>
              <td className="px-2 py-2.5 text-right tabular text-slate-500">{r.count}</td>
              {showBudget && <td className="px-2 py-2.5 text-right tabular">{r.budget ? money(r.budget) : '—'}</td>}
              <td className="px-2 py-2.5 text-right font-semibold tabular">{money(r.agreed)}</td>
              <td className="px-2 py-2.5 text-right tabular text-emerald-600 dark:text-emerald-400">{money(r.paid)}</td>
              <td className="px-2 py-2.5 text-right tabular text-amber-600 dark:text-amber-400">{money(r.pending)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 font-bold text-navy-900 dark:border-white/10 dark:text-white">
            <td className="px-2 py-2.5">Total</td>
            <td className="px-2 py-2.5 text-right tabular">{total.count}</td>
            {showBudget && <td className="px-2 py-2.5 text-right tabular">{money(sumMoney(rows.map((r) => r.budget ?? 0)))}</td>}
            <td className="px-2 py-2.5 text-right tabular">{money(total.agreed)}</td>
            <td className="px-2 py-2.5 text-right tabular">{money(total.paid)}</td>
            <td className="px-2 py-2.5 text-right tabular">{money(total.pending)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function Reports() {
  const { data, derived, money, compact } = useStore();
  const { toast } = useUI();
  const [kind, setKind] = useState<ReportKind>('overview');
  const [f, setF] = useState<ReportFilters>({ preset: 'all', from: '', to: todayISO(), eventId: 'all', categoryId: 'all' });
  const [showFilters, setShowFilters] = useState(false);
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const agreedColor = dark ? C.agreedDark : C.agreed;

  const range = resolveRange(f);
  const expenses = useMemo(() => filterExpenses(derived, f), [derived, f]);
  const payments = useMemo(() => filterPayments(derived, f), [derived, f]);

  const totals = useMemo(() => {
    const agreed = sumMoney(expenses.map((x) => x.agreedAmount));
    const paid = sumMoney(expenses.map((x) => derived.expenseSummary.get(x.id)!.paid));
    const pending = sumMoney(expenses.map((x) => derived.expenseSummary.get(x.id)!.pending));
    return { agreed, paid, pending, cashOut: sumMoney(payments.map((p) => p.amount)) };
  }, [expenses, payments, derived]);

  const byEvent = useMemo(() => groupExpenses(derived, expenses, 'event'), [derived, expenses]);
  const byCategory = useMemo(() => groupExpenses(derived, expenses, 'category'), [derived, expenses]);
  const byVendor = useMemo(() => groupExpenses(derived, expenses, 'vendor'), [derived, expenses]);
  const monthly = useMemo(() => paymentsByPeriod(payments, 'month', range), [payments, range.from, range.to]);
  const yearly = useMemo(() => paymentsByPeriod(payments, 'year', range), [payments, range.from, range.to]);
  const statusRows = useMemo(() => {
    const m = Object.fromEntries(PAYMENT_STATUS_ORDER.map((s) => [s, { count: 0, agreed: 0, paid: 0, pending: 0 }])) as Record<(typeof PAYMENT_STATUS_ORDER)[number], { count: number; agreed: number; paid: number; pending: number }>;
    for (const x of expenses) {
      const s = derived.expenseSummary.get(x.id)!;
      const r = m[s.status];
      r.count++;
      r.agreed = sumMoney([r.agreed, x.agreedAmount]);
      r.paid = sumMoney([r.paid, s.paid]);
      r.pending = sumMoney([r.pending, s.pending]);
    }
    return m;
  }, [expenses, derived]);

  const budgetRows = byEvent.filter((r) => (r.budget ?? 0) > 0);

  const rangeLabel = range.from || range.to ? `${range.from ? formatDate(range.from) : 'Start'} – ${range.to ? formatDate(range.to) : 'Today'}` : 'All time';
  const filterLabel = [rangeLabel, f.eventId !== 'all' ? derived.eventById.get(f.eventId)?.name : null, f.categoryId !== 'all' ? derived.categoryById.get(f.categoryId)?.name : null].filter(Boolean).join(' · ');

  const exportCSV = () => {
    const stamp = todayISO();
    const rowsCsv = (rows: Row[], first: string, budget = false) =>
      toCSV([first, 'Items', ...(budget ? ['Budget', 'Variance'] : []), 'Agreed', 'Paid', 'Pending'], rows.map((r) => [r.label, r.count, ...(budget ? [r.budget ?? 0, Math.round(((r.budget ?? 0) - r.agreed) * 100) / 100] : []), r.agreed, r.paid, r.pending]));
    let csv = '';
    let name: string = kind;
    switch (kind) {
      case 'overview':
        name = 'expenses';
        csv = toCSV(
          ['Event', 'Expense', 'Category', 'Vendor', 'Expense date', 'Due date', 'Agreed', 'Paid', 'Outstanding', 'Status'],
          expenses.map((x) => {
            const s = derived.expenseSummary.get(x.id)!;
            return [derived.eventById.get(x.eventId)?.name ?? '', x.name, derived.categoryById.get(x.categoryId)?.name ?? '', x.vendorName, x.expenseDate, x.dueDate ?? '', x.agreedAmount, s.paid, s.outstanding, PAYMENT_STATUS_META[s.status].label];
          }),
        );
        break;
      case 'event':
        csv = rowsCsv(byEvent, 'Event');
        break;
      case 'category':
        csv = rowsCsv(byCategory, 'Category');
        break;
      case 'vendor':
        csv = rowsCsv(byVendor, 'Vendor');
        break;
      case 'budget':
        csv = rowsCsv(budgetRows, 'Event', true);
        break;
      case 'monthly':
      case 'yearly':
        name = `payments-${kind}`;
        csv = toCSV([kind === 'monthly' ? 'Month' : 'Year', 'Payments', 'Amount paid'], (kind === 'monthly' ? monthly : yearly).map((r) => [r.label, r.count, r.paid]));
        csv += '\r\n\r\n' + toCSV(
          ['Date', 'Event', 'Expense', 'Type', 'Method', 'Reference', 'Amount', 'Added by'],
          [...payments].reverse().map((p) => {
            const x = derived.expenseById.get(p.expenseId);
            return [p.date, x ? (derived.eventById.get(x.eventId)?.name ?? '') : '', x?.name ?? '', paymentKindLabel(p.kind), paymentMethodMeta(p.method).label, p.reference, p.amount, p.createdBy];
          }),
        );
        break;
      case 'paid':
        csv = toCSV(['Status', 'Expenses', 'Agreed', 'Paid', 'Pending'], PAYMENT_STATUS_ORDER.map((s) => [PAYMENT_STATUS_META[s].label, statusRows[s].count, statusRows[s].agreed, statusRows[s].paid, statusRows[s].pending]));
        break;
    }
    downloadCSV(`spendmate-${name}-${stamp}.csv`, csv);
    toast('CSV downloaded');
  };

  if (derived.expenses.length === 0) {
    return (
      <div>
        <PageHeader title="Reports" />
        <Card>
          <EmptyState icon={ChartPie} title="Nothing to report yet" message="Reports appear once you add expenses and payments to an event." />
        </Card>
      </div>
    );
  }

  const activeFilterCount = (f.preset !== 'all' ? 1 : 0) + (f.eventId !== 'all' ? 1 : 0) + (f.categoryId !== 'all' ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={filterLabel}
        actions={
          <>
            <Button variant="secondary" icon={SlidersHorizontal} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
            <Button icon={Download} onClick={exportCSV}>
              Export CSV
            </Button>
          </>
        }
      />

      {showFilters && (
        <Card className="mb-4 animate-slide-up p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="r-range" className="mb-1.5 block text-xs font-medium text-slate-500">
                Date range
              </label>
              <SelectInput id="r-range" value={f.preset} onChange={(e) => setF({ ...f, preset: e.target.value as DatePreset })}>
                {PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label htmlFor="r-event" className="mb-1.5 block text-xs font-medium text-slate-500">
                Event
              </label>
              <SelectInput id="r-event" value={f.eventId} onChange={(e) => setF({ ...f, eventId: e.target.value })}>
                <option value="all">All events</option>
                {derived.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label htmlFor="r-cat" className="mb-1.5 block text-xs font-medium text-slate-500">
                Category
              </label>
              <SelectInput id="r-cat" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
                <option value="all">All categories</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" block onClick={() => setF({ preset: 'all', from: '', to: todayISO(), eventId: 'all', categoryId: 'all' })} disabled={!activeFilterCount}>
                Reset filters
              </Button>
            </div>
            {f.preset === 'custom' && (
              <>
                <div>
                  <label htmlFor="r-from" className="mb-1.5 block text-xs font-medium text-slate-500">
                    From
                  </label>
                  <TextInput id="r-from" type="date" value={f.from} max={f.to || undefined} onChange={(e) => setF({ ...f, from: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="r-to" className="mb-1.5 block text-xs font-medium text-slate-500">
                    To
                  </label>
                  <TextInput id="r-to" type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Expense reports use the expense date; monthly and yearly reports use the payment date.
          </p>
        </Card>
      )}

      <Segmented options={REPORTS} value={kind} onChange={setKind} ariaLabel="Report type" className="mb-5" />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Agreed expenses" value={money(totals.agreed)} sub={`${expenses.length} expenses`} tone="brand" />
        <StatTile label="Paid" value={money(totals.paid)} sub={totals.agreed ? `${Math.round((totals.paid / totals.agreed) * 100)}% of agreed` : '—'} tone="emerald" />
        <StatTile label="Pending" value={money(totals.pending)} sub={`${statusRows.pending.count + statusRows.partially_paid.count} open expenses`} tone="amber" />
        <StatTile label="Cash out in period" value={money(totals.cashOut)} sub={`${payments.length} payments`} tone="slate" />
      </div>

      {expenses.length === 0 && payments.length === 0 ? (
        <Card>
          <EmptyState icon={FileText} title="No data for these filters" message="Try a wider date range or a different event or category." />
        </Card>
      ) : (
        <div className="space-y-5">
          {kind === 'overview' && (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-5">
                  <SectionTitle title="Category split" />
                  <div className="flex flex-col items-center gap-5 sm:flex-row">
                    <DonutChart segments={byCategory.map((r) => ({ label: r.label, value: r.agreed, color: r.color ?? '#94a3b8' }))} centerLabel="Agreed" centerValue={compact(totals.agreed)} ariaLabel="Category split" />
                    <div className="w-full flex-1">
                      <BarList rows={byCategory.slice(0, 5).map((r) => ({ key: r.key, label: r.label, value: r.agreed, color: r.color }))} format={compact} />
                    </div>
                  </div>
                </Card>
                <Card className="p-5">
                  <SectionTitle title="Paid vs pending by event" />
                  <BarChart
                    data={byEvent.map((r) => ({ label: r.label, values: [r.paid, r.pending] }))}
                    series={[
                      { name: 'Paid', color: C.paid },
                      { name: 'Pending', color: C.pending },
                    ]}
                    format={compact}
                    ariaLabel="Paid and pending amounts by event"
                  />
                  <Legend
                    className="mt-2"
                    series={[
                      { name: 'Paid', color: C.paid },
                      { name: 'Pending', color: C.pending },
                    ]}
                  />
                </Card>
              </div>
              <Card className="p-5">
                <SectionTitle title="Payment trend" subtitle="Amount paid per month" />
                <LineChart data={monthly.map((m) => ({ label: m.label.split(' ')[0], values: [m.paid] }))} series={[{ name: 'Paid', color: C.brand }]} format={compact} ariaLabel="Payments per month" />
              </Card>
            </>
          )}

          {(kind === 'event' || kind === 'category' || kind === 'vendor') && (
            <>
              <Card className="p-5">
                <SectionTitle title={kind === 'event' ? 'Event-wise expenses' : kind === 'category' ? 'Category-wise expenses' : 'Vendor-wise expenses'} />
                {kind === 'category' ? (
                  <div className="flex flex-col items-center gap-6 sm:flex-row">
                    <DonutChart segments={byCategory.map((r) => ({ label: r.label, value: r.agreed, color: r.color ?? '#94a3b8' }))} centerLabel="Agreed" centerValue={compact(totals.agreed)} ariaLabel="Category-wise expenses" size={200} />
                    <div className="w-full flex-1">
                      <BarList rows={byCategory.map((r) => ({ key: r.key, label: r.label, value: r.agreed, color: r.color, sub: `${compact(r.paid)} paid · ${compact(r.pending)} pending` }))} format={compact} />
                    </div>
                  </div>
                ) : (
                  <>
                    <BarChart
                      data={(kind === 'event' ? byEvent : byVendor.slice(0, 10)).map((r) => ({ label: r.label, values: [r.agreed, r.paid] }))}
                      series={[
                        { name: 'Agreed', color: agreedColor },
                        { name: 'Paid', color: C.paid },
                      ]}
                      format={compact}
                      height={240}
                      ariaLabel="Agreed and paid amounts"
                    />
                    <Legend
                      className="mt-2"
                      series={[
                        { name: 'Agreed', color: agreedColor },
                        { name: 'Paid', color: C.paid },
                      ]}
                    />
                  </>
                )}
              </Card>
              <Card className="p-5">
                <RowsTable rows={kind === 'event' ? byEvent : kind === 'category' ? byCategory : byVendor} money={money} firstCol={kind === 'event' ? 'Event' : kind === 'category' ? 'Category' : 'Vendor'} />
              </Card>
            </>
          )}

          {(kind === 'monthly' || kind === 'yearly') && (
            <>
              <Card className="p-5">
                <SectionTitle title={kind === 'monthly' ? 'Monthly payments' : 'Yearly payments'} subtitle="Based on payment date" />
                {kind === 'monthly' ? (
                  <LineChart data={monthly.map((m) => ({ label: m.label.split(' ')[0], values: [m.paid] }))} series={[{ name: 'Paid', color: C.brand }]} format={compact} height={260} ariaLabel="Monthly payments" />
                ) : (
                  <BarChart data={yearly.map((y) => ({ label: y.label, values: [y.paid] }))} series={[{ name: 'Paid', color: C.brand }]} format={compact} height={240} ariaLabel="Yearly payments" />
                )}
              </Card>
              <Card className="p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 dark:border-white/5">
                      <th className="px-2 py-2 font-medium">{kind === 'monthly' ? 'Month' : 'Year'}</th>
                      <th className="px-2 py-2 text-right font-medium">Payments</th>
                      <th className="px-2 py-2 text-right font-medium">Amount paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                    {[...(kind === 'monthly' ? monthly : yearly)].reverse().map((r) => (
                      <tr key={r.key} className={cn('text-navy-800 dark:text-slate-200', r.count === 0 && 'text-slate-400 dark:text-slate-500')}>
                        <td className="px-2 py-2.5">{r.label}</td>
                        <td className="px-2 py-2.5 text-right tabular">{r.count}</td>
                        <td className="px-2 py-2.5 text-right font-semibold tabular">{money(r.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {kind === 'paid' && (
            <>
              <Card className="p-5">
                <SectionTitle title="Paid vs pending" subtitle="For expenses in the selected range" />
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <DonutChart
                    segments={[
                      { label: 'Paid', value: Math.min(totals.paid, totals.agreed), color: C.paid },
                      { label: 'Pending', value: totals.pending, color: C.pending },
                    ]}
                    centerLabel="Paid"
                    centerValue={`${totals.agreed ? Math.round((totals.paid / totals.agreed) * 100) : 0}%`}
                    ariaLabel="Paid versus pending"
                    size={200}
                  />
                  <div className="grid w-full flex-1 grid-cols-2 gap-3">
                    {PAYMENT_STATUS_ORDER.map((s) => (
                      <div key={s} className="rounded-2xl bg-slate-50 p-3.5 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className={cn('size-2 rounded-full', PAYMENT_STATUS_META[s].dot)} /> {PAYMENT_STATUS_META[s].label}
                        </div>
                        <div className="mt-1 text-xl font-bold text-navy-900 tabular dark:text-white">{statusRows[s].count}</div>
                        <div className="text-xs text-slate-500 tabular dark:text-slate-400">{s === 'pending' || s === 'partially_paid' ? `${compact(statusRows[s].pending)} due` : `${compact(statusRows[s].paid)} paid`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <SectionTitle title="Pending by event" />
                <BarList rows={byEvent.filter((r) => r.pending > 0).map((r) => ({ key: r.key, label: r.label, value: r.pending, color: C.pending, sub: `${compact(r.paid)} paid of ${compact(r.agreed)}` }))} format={money} emptyText="Nothing pending – everything is settled." />
              </Card>
            </>
          )}

          {kind === 'budget' && (
            <>
              {budgetRows.length === 0 ? (
                <Card>
                  <EmptyState icon={ChartPie} title="No budgets set" message="Add a total budget to your events to compare planned versus actual spend." />
                </Card>
              ) : (
                <>
                  <Card className="p-5">
                    <SectionTitle title="Budget vs actual" subtitle="Agreed expenses compared to each event’s budget" />
                    <BarChart
                      data={budgetRows.map((r) => ({ label: r.label, values: [r.budget ?? 0, r.agreed] }))}
                      series={[
                        { name: 'Budget', color: '#cbd5e1' },
                        { name: 'Actual', color: C.brand },
                      ]}
                      format={compact}
                      height={240}
                      ariaLabel="Budget versus actual by event"
                    />
                    <Legend
                      className="mt-2"
                      series={[
                        { name: 'Budget', color: '#cbd5e1' },
                        { name: 'Actual', color: C.brand },
                      ]}
                    />
                  </Card>
                  <Card className="p-5">
                    <SectionTitle title="Budget progress" />
                    <ul className="space-y-5">
                      {budgetRows.map((r) => {
                        const used = r.budget ? r.agreed / r.budget : 0;
                        const variance = (r.budget ?? 0) - r.agreed;
                        return (
                          <li key={r.key}>
                            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                              <span className="truncate font-medium text-navy-800 dark:text-slate-200">{r.label}</span>
                              <span className="shrink-0 tabular text-slate-500 dark:text-slate-400">
                                {money(r.agreed)} / {money(r.budget ?? 0)}
                              </span>
                            </div>
                            <ProgressBar value={used} barClassName={budgetBarClass(used)} label={`${r.label} budget`} />
                            <div className={cn('mt-1 text-xs font-medium', variance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
                              {variance < 0 ? `Over budget by ${money(-variance)}` : `${money(variance)} under budget`} · {Math.round(used * 100)}%
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                  <Card className="p-5">
                    <RowsTable rows={budgetRows} money={money} firstCol="Event" showBudget />
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">PDF export is planned for a later phase. CSV files open in Excel, Google Sheets and Numbers.</p>
    </div>
  );
}
