import { useMemo, useState, type FormEvent } from 'react';
import { Check, Info, Paperclip, TriangleAlert } from 'lucide-react';
import type { Payment, PaymentKind, PaymentMethod } from '../../types';
import { LIMITS, PAYMENT_KINDS, PAYMENT_METHODS, PAYMENT_STATUS_META } from '../../data/constants';
import { amountToInput, currencySymbol, formatMoney, isValidISODate, parseAmount, todayISO } from '../../lib/format';
import { getPaymentStatus, subMoney, summarizeExpense, toPaise } from '../../lib/calc';
import { cn, newId, nowISO } from '../../lib/id';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AmountInput, ChoiceChip, Field, SelectInput, TextArea, TextInput } from '../ui/Field';
import { PaymentStatusBadge, ProgressBar } from '../ui/primitives';

interface Draft {
  eventId: string;
  expenseId: string;
  amount: string;
  date: string;
  method: PaymentMethod;
  kind: PaymentKind;
  reference: string;
  notes: string;
}
type Errors = Partial<Record<keyof Draft, string>>;

export function PaymentForm({ eventId, expenseId, paymentId, onClose }: { eventId?: string; expenseId?: string; paymentId?: string; onClose: () => void }) {
  const { data, derived, dispatch, currency, money } = useStore();
  const { toast } = useUI();
  const existing = paymentId ? data.payments.find((p) => p.id === paymentId && !p.deletedAt) : undefined;
  const initialExpense = existing ? derived.expenseById.get(existing.expenseId) : expenseId ? derived.expenseById.get(expenseId) : undefined;

  const [d, setD] = useState<Draft>(() => ({
    eventId: initialExpense?.eventId ?? eventId ?? '',
    expenseId: initialExpense?.id ?? '',
    amount: existing ? amountToInput(existing.amount) : '',
    date: existing?.date ?? todayISO(),
    method: existing?.method ?? 'upi',
    kind: existing?.kind ?? 'partial',
    reference: existing?.reference ?? '',
    notes: existing?.notes ?? '',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [kindTouched, setKindTouched] = useState(!!existing);
  const lockedExpense = !!existing || !!expenseId;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  // Events that have expenses; expenses sorted with outstanding balances first.
  const eventOptions = derived.events.filter((e) => (derived.expensesByEvent.get(e.id)?.length ?? 0) > 0);
  const expenseOptions = useMemo(() => {
    const list = d.eventId ? (derived.expensesByEvent.get(d.eventId) ?? []) : [];
    return [...list].sort((a, b) => (derived.expenseSummary.get(b.id)?.pending ?? 0) - (derived.expenseSummary.get(a.id)?.pending ?? 0));
  }, [d.eventId, derived]);

  const expense = d.expenseId ? derived.expenseById.get(d.expenseId) : undefined;
  // Balance before this payment (excludes the payment being edited).
  const before = useMemo(() => {
    if (!expense) return null;
    const others = (derived.paymentsByExpense.get(expense.id) ?? []).filter((p) => p.id !== existing?.id);
    return summarizeExpense(expense, others);
  }, [expense, derived, existing?.id]);

  const amount = parseAmount(d.amount);
  const after = expense && before && amount !== null ? { paid: (toPaise(before.paid) + toPaise(amount)) / 100 } : null;
  const afterOutstanding = expense && after ? subMoney(expense.agreedAmount, after.paid) : null;
  const afterStatus = expense && after ? getPaymentStatus(expense.agreedAmount, after.paid) : null;

  const suggestKind = (amt: number | null): PaymentKind => {
    if (!before) return 'partial';
    if (before.paid === 0 && (amt === null || toPaise(amt) < toPaise(before.pending))) return 'advance';
    if (amt !== null && before.pending > 0 && toPaise(amt) >= toPaise(before.pending)) return 'final';
    return 'partial';
  };

  const onAmount = (v: string) => {
    set('amount', v);
    if (!kindTouched) set('kind', suggestKind(parseAmount(v)));
  };

  const quickFill = (value: number) => onAmount(amountToInput(value));

  const pickExpense = (id: string) => {
    set('expenseId', id);
    if (!kindTouched) {
      const s = derived.expenseSummary.get(id);
      set('kind', s && s.paid === 0 ? 'advance' : 'partial');
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!expense) errs.expenseId = 'Choose the expense this payment is for.';
    if (amount === null) errs.amount = 'Enter the amount paid.';
    else if (amount <= 0) errs.amount = 'Amount must be greater than zero.';
    else if (amount > LIMITS.maxAmount) errs.amount = 'That amount looks too large.';
    if (!isValidISODate(d.date)) errs.date = 'Enter a valid date.';
    if (d.reference.length > 100) errs.reference = 'Keep the reference under 100 characters.';
    if (d.notes.length > LIMITS.notesMax) errs.notes = `Keep notes under ${LIMITS.notesMax} characters.`;
    setErrors(errs);
    if (Object.keys(errs).length || !expense || amount === null) return;

    const fields = { expenseId: expense.id, amount, date: d.date, method: d.method, kind: d.kind, reference: d.reference.trim(), notes: d.notes.trim() };
    if (existing) {
      dispatch({ type: 'payment/update', payment: { ...existing, ...fields } });
      toast('Payment updated – change saved to history');
    } else {
      const ts = nowISO();
      const p: Payment = { id: newId(), ...fields, createdBy: data.profile.fullName, createdAt: ts, updatedAt: ts, deletedAt: null };
      dispatch({ type: 'payment/add', payment: p });
      toast(`${formatMoney(amount, currency)} payment recorded`);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit payment' : 'Add payment'}
      subtitle={expense ? expense.name : 'Record an advance, partial or final payment.'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" form="payment-form" className="flex-1" icon={Check} disabled={eventOptions.length === 0}>
            {existing ? 'Save changes' : 'Save payment'}
          </Button>
        </div>
      }
    >
      <form id="payment-form" onSubmit={submit} noValidate className="space-y-5">
        {!lockedExpense && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Event" htmlFor="p-event">
              <SelectInput
                id="p-event"
                value={d.eventId}
                onChange={(e) => {
                  set('eventId', e.target.value);
                  set('expenseId', '');
                }}
              >
                <option value="">Select event</option>
                {eventOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Expense" htmlFor="p-expense" required error={errors.expenseId}>
              <SelectInput id="p-expense" value={d.expenseId} onChange={(e) => pickExpense(e.target.value)} disabled={!d.eventId} invalid={!!errors.expenseId}>
                <option value="">{d.eventId ? 'Select expense' : 'Choose an event first'}</option>
                {expenseOptions.map((x) => {
                  const s = derived.expenseSummary.get(x.id);
                  return (
                    <option key={x.id} value={x.id}>
                      {x.name} — {s && s.pending > 0 ? `${money(s.pending)} due` : 'settled'}
                    </option>
                  );
                })}
              </SelectInput>
            </Field>
          </div>
        )}

        {expense && before && (
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{existing ? 'Before this payment' : 'Current status'}</span>
              <PaymentStatusBadge status={before.status} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['Agreed', expense.agreedAmount],
                ['Paid', before.paid],
                [before.overpaidBy > 0 ? 'Overpaid' : 'Balance', before.overpaidBy > 0 ? before.overpaidBy : before.pending],
              ].map(([label, v]) => (
                <div key={label as string}>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="text-sm font-bold text-navy-900 tabular dark:text-white">{money(v as number)}</div>
                </div>
              ))}
            </div>
            <ProgressBar value={before.progress} className="mt-3" barClassName={PAYMENT_STATUS_META[before.status].bar} label="Paid so far" />
          </div>
        )}

        <Field label="Amount paid" htmlFor="p-amount" required error={errors.amount}>
          <AmountInput id="p-amount" data-autofocus prefix={currencySymbol(currency)} value={d.amount} onChange={(e) => onAmount(e.target.value)} placeholder="0" invalid={!!errors.amount} className="text-lg" />
        </Field>
        {before && before.pending > 0 && (
          <div className="-mt-3 flex flex-wrap gap-2">
            <ChoiceChip selected={amount !== null && toPaise(amount) === toPaise(before.pending)} onClick={() => quickFill(before.pending)}>
              Full balance · {money(before.pending)}
            </ChoiceChip>
            {before.pending >= 2 && (
              <ChoiceChip selected={false} onClick={() => quickFill(Math.round(before.pending * 50) / 100)}>
                50%
              </ChoiceChip>
            )}
            {before.pending >= 4 && (
              <ChoiceChip selected={false} onClick={() => quickFill(Math.round(before.pending * 25) / 100)}>
                25%
              </ChoiceChip>
            )}
          </div>
        )}

        {expense && afterOutstanding !== null && afterStatus && amount && amount > 0 ? (
          <div
            className={cn(
              'flex gap-2.5 rounded-2xl px-4 py-3 text-sm',
              afterStatus === 'overpaid' ? 'bg-violet-50 text-violet-800 dark:bg-violet-400/10 dark:text-violet-200' : 'bg-brand-50 text-brand-800 dark:bg-brand-400/10 dark:text-brand-100',
            )}
          >
            {afterStatus === 'overpaid' ? <TriangleAlert className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
            <span>
              {afterStatus === 'overpaid' ? (
                <>
                  This exceeds the agreed amount by <strong>{money(-afterOutstanding)}</strong>. The expense will be marked <strong>Overpaid</strong>.
                </>
              ) : afterStatus === 'paid' ? (
                <>
                  This settles the expense in full. Status becomes <strong>Paid</strong>.
                </>
              ) : (
                <>
                  Remaining balance after this payment: <strong className="tabular">{money(afterOutstanding)}</strong>
                </>
              )}
            </span>
          </div>
        ) : null}

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment type</span>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_KINDS.map((k) => (
              <ChoiceChip
                key={k.value}
                selected={d.kind === k.value}
                onClick={() => {
                  setKindTouched(true);
                  set('kind', k.value);
                }}
              >
                {k.label}
              </ChoiceChip>
            ))}
          </div>
        </div>

        <Field label="Payment date" htmlFor="p-date" required error={errors.date}>
          <TextInput id="p-date" type="date" value={d.date} onChange={(e) => set('date', e.target.value)} invalid={!!errors.date} />
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment method</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((m) => (
              <ChoiceChip key={m.value} selected={d.method === m.value} onClick={() => set('method', m.value)} className="justify-center">
                <m.icon className="size-4" aria-hidden /> {m.label}
              </ChoiceChip>
            ))}
          </div>
        </div>

        <Field label="Transaction reference" htmlFor="p-ref" error={errors.reference} hint="UPI ref, cheque no., NEFT/IMPS ID…">
          <TextInput id="p-ref" value={d.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Optional" invalid={!!errors.reference} />
        </Field>

        <Field label="Notes" htmlFor="p-notes" error={errors.notes}>
          <TextArea id="p-notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" invalid={!!errors.notes} className="min-h-[64px]" />
        </Field>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
          <Paperclip className="size-4 shrink-0" />
          Payment screenshots and receipts can be attached from Phase 7.
        </div>
        {existing && <p className="text-xs text-slate-500 dark:text-slate-400">Edits are recorded in the expense’s activity history with the previous values.</p>}
      </form>
    </Modal>
  );
}
