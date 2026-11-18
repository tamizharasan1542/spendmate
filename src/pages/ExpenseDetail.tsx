import { CalendarClock, CircleDollarSign, FileSearch, Paperclip, Pencil, Phone, Plus, Share2, StickyNote, Trash2, User } from 'lucide-react';
import type { Payment } from '../types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { Link, navigate } from '../lib/router';
import { cn } from '../lib/id';
import { formatDate, relativeDue, todayISO } from '../lib/format';
import { PAYMENT_STATUS_META, paymentKindLabel, paymentMethodMeta } from '../data/constants';
import { BackButton } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, EmptyState, PaymentStatusBadge, ProgressBar, SectionTitle } from '../components/ui/primitives';
import { ActivityLog, EventIcon, PaymentHistory } from '../components/domain';

export function ExpenseDetail({ id }: { id: string }) {
  const { data, derived, dispatch, money } = useStore();
  const { openModal, confirm, toast } = useUI();
  const expense = derived.expenseById.get(id);

  if (!expense) {
    return (
      <Card className="mt-6">
        <EmptyState icon={FileSearch} title="Expense not found" message="It may have been deleted, or the link is incorrect." action={<Button onClick={() => navigate('/events')}>Back to events</Button>} />
      </Card>
    );
  }

  const s = derived.expenseSummary.get(expense.id)!;
  const event = derived.eventById.get(expense.eventId)!;
  const cat = derived.categoryById.get(expense.categoryId);
  const vendor = expense.vendorId ? derived.vendorById.get(expense.vendorId) : undefined;
  const logs = data.auditLogs.filter((l) => l.expenseId === expense.id);
  const overdue = s.pending > 0 && !!expense.dueDate && expense.dueDate < todayISO();
  const meta = PAYMENT_STATUS_META[s.status];

  const onDeletePayment = async (p: Payment) => {
    const ok = await confirm({
      title: 'Delete this payment?',
      message: (
        <>
          <p>
            You’re deleting a <strong>{paymentKindLabel(p.kind).toLowerCase()}</strong> of <strong>{money(p.amount)}</strong> paid on {formatDate(p.date)} via {paymentMethodMeta(p.method).label}.
          </p>
          <p className="mt-2">
            The balance for this expense will increase to <strong>{money(Math.max(0, s.outstanding + p.amount))}</strong>. A record of the deleted payment is kept in the activity history.
          </p>
        </>
      ),
      confirmLabel: 'Delete payment',
    });
    if (!ok) return;
    dispatch({ type: 'payment/delete', id: p.id });
    toast('Payment deleted – recorded in history');
  };

  const onDeleteExpense = async () => {
    const ok = await confirm({
      title: 'Delete this expense?',
      message: (
        <>
          <strong>{expense.name}</strong> ({money(expense.agreedAmount)} agreed{s.paymentCount ? `, ${s.paymentCount} payments totalling ${money(s.paid)}` : ''}) will be removed from totals and reports. The deletion is recorded in the event’s activity history.
        </>
      ),
      confirmLabel: 'Delete expense',
    });
    if (!ok) return;
    dispatch({ type: 'expense/delete', id: expense.id });
    toast('Expense deleted');
    navigate(`/events/${event.id}`, { replace: true });
  };

  const addPayment = () => openModal({ kind: 'payment', expenseId: expense.id });

  return (
    <div className="mx-auto max-w-3xl">
      <BackButton to={`/events/${event.id}`} />

      <Link to={`/events/${event.id}`} className="mb-3 inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:ring-slate-300 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
        <EventIcon event={event} size="sm" />
        {event.name}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {cat && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${cat.color}1f`, color: cat.color }}>
                <span className="size-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </span>
            )}
            <PaymentStatusBadge status={s.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl dark:text-white">{expense.name}</h1>
          {expense.vendorName && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <User className="size-4" /> {vendor ? <Link to="/vendors" className="hover:text-brand-600">{expense.vendorName}</Link> : expense.vendorName}
              </span>
              {expense.vendorPhone && (
                <a href={`tel:${expense.vendorPhone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-brand-600">
                  <Phone className="size-4" /> {expense.vendorPhone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Amount card */}
      <Card className="mt-5 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Agreed total</div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-navy-900 tabular dark:text-white">{money(expense.agreedAmount)}</div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{Math.round(s.progress * 100)}% paid</span>
              <span>
                {s.paymentCount} {s.paymentCount === 1 ? 'payment' : 'payments'}
              </span>
            </div>
            <ProgressBar value={s.progress} size="lg" barClassName={meta.bar} label="Payment progress" />
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 dark:divide-white/5 dark:border-white/5">
          <div className="p-4 sm:px-6">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total paid</div>
            <div className="mt-0.5 text-lg font-bold text-emerald-600 tabular dark:text-emerald-400">{money(s.paid)}</div>
          </div>
          <div className="p-4 sm:px-6">
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.overpaidBy > 0 ? 'Overpaid by' : 'Outstanding balance'}</div>
            <div className={cn('mt-0.5 text-lg font-bold tabular', s.overpaidBy > 0 ? 'text-violet-600 dark:text-violet-300' : s.pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500')}>
              {money(s.overpaidBy > 0 ? s.overpaidBy : s.pending)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:px-6 dark:border-white/5 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" /> Expense date {formatDate(expense.expenseDate)}
          </span>
          {expense.dueDate && (
            <span className={cn('inline-flex items-center gap-1.5', overdue && 'font-semibold text-rose-600 dark:text-rose-400')}>
              Due {formatDate(expense.dueDate)}
              {s.pending > 0 && ` · ${relativeDue(expense.dueDate)}`}
            </span>
          )}
          <span>Added by {expense.createdBy}</span>
        </div>
      </Card>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button icon={Plus} onClick={addPayment} className="col-span-2 sm:col-span-1">
          Add payment
        </Button>
        <Button variant="secondary" icon={Pencil} onClick={() => openModal({ kind: 'expense', expenseId: expense.id })}>
          Edit
        </Button>
        <Button variant="secondary" icon={Paperclip} disabled title="Available in Phase 7">
          Receipt
        </Button>
        <Button variant="secondary" icon={Share2} disabled title="Available in Phase 6">
          Share
        </Button>
        <Button variant="ghost" icon={Trash2} onClick={onDeleteExpense} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-400/10">
          Delete
        </Button>
      </div>

      {/* Payment history */}
      <Card className="mt-6 p-4 sm:p-5">
        <SectionTitle title="Payment history" subtitle={s.paymentCount ? `${money(s.paid)} paid in ${s.paymentCount} ${s.paymentCount === 1 ? 'instalment' : 'instalments'}` : undefined} />
        {s.paymentCount === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="No payments yet"
            message={`Nothing has been paid towards ${expense.name}. Record the advance when you pay it.`}
            action={
              <Button icon={Plus} onClick={addPayment}>
                Record advance
              </Button>
            }
            className="py-8"
          />
        ) : (
          <>
            <PaymentHistory expense={expense} onEdit={(p) => openModal({ kind: 'payment', paymentId: p.id })} onDelete={onDeletePayment} />
            <div className="mt-2 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-white/[0.03]">
              <span className="font-medium text-slate-600 dark:text-slate-300">Total paid</span>
              <span className="font-bold text-navy-900 tabular dark:text-white">{money(s.paid)}</span>
            </div>
          </>
        )}
      </Card>

      {expense.notes && (
        <Card className="mt-4 p-5">
          <div className="flex gap-3">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{expense.notes}</p>
          </div>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <SectionTitle title="Receipts & documents" />
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          <Paperclip className="size-5 shrink-0" />
          Bills, invoices and payment screenshots will be stored securely with Supabase Storage in Phase 7.
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <SectionTitle title="Activity history" subtitle="Every edit and deletion is kept – nothing is silently removed." />
        <ActivityLog logs={logs} emptyText="No edits or deletions recorded for this expense." />
      </Card>
    </div>
  );
}
