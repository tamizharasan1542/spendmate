import { useMemo, useState, type FormEvent } from 'react';
import { Check, Paperclip, Plus } from 'lucide-react';
import type { Expense, PaymentMethod, Vendor } from '../../types';
import { CUSTOM_CATEGORY_COLORS, LIMITS, PAYMENT_METHODS } from '../../data/constants';
import { amountToInput, currencySymbol, formatMoney, isValidISODate, parseAmount, todayISO } from '../../lib/format';
import { newId, nowISO } from '../../lib/id';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AmountInput, ChoiceChip, Field, SelectInput, TextArea, TextInput } from '../ui/Field';

interface Draft {
  eventId: string;
  name: string;
  categoryId: string;
  vendorName: string;
  vendorPhone: string;
  agreedAmount: string;
  expenseDate: string;
  dueDate: string;
  notes: string;
  advanceAmount: string;
  advanceMethod: PaymentMethod;
  advanceDate: string;
}
type Errors = Partial<Record<keyof Draft, string>>;

const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

export function ExpenseForm({ eventId, expenseId, onClose }: { eventId?: string; expenseId?: string; onClose: () => void }) {
  const { data, derived, dispatch, currency } = useStore();
  const { toast } = useUI();
  const existing = expenseId ? derived.expenseById.get(expenseId) : undefined;
  const selectableEvents = derived.events.filter((e) => e.status !== 'archived' || e.id === existing?.eventId || e.id === eventId);

  const [d, setD] = useState<Draft>(() =>
    existing
      ? {
          eventId: existing.eventId,
          name: existing.name,
          categoryId: existing.categoryId,
          vendorName: existing.vendorName,
          vendorPhone: existing.vendorPhone,
          agreedAmount: amountToInput(existing.agreedAmount),
          expenseDate: existing.expenseDate,
          dueDate: existing.dueDate ?? '',
          notes: existing.notes,
          advanceAmount: '',
          advanceMethod: 'upi',
          advanceDate: todayISO(),
        }
      : {
          eventId: eventId ?? selectableEvents[0]?.id ?? '',
          name: '',
          categoryId: data.categories[0]?.id ?? '',
          vendorName: '',
          vendorPhone: '',
          agreedAmount: '',
          expenseDate: todayISO(),
          dueDate: '',
          notes: '',
          advanceAmount: '',
          advanceMethod: 'upi',
          advanceDate: todayISO(),
        },
  );
  const [errors, setErrors] = useState<Errors>({});
  const [newCat, setNewCat] = useState<string | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const matchedVendor = useMemo(() => data.vendors.find((v) => v.name.trim().toLowerCase() === d.vendorName.trim().toLowerCase()), [data.vendors, d.vendorName]);

  const onVendorName = (name: string) => {
    set('vendorName', name);
    const v = data.vendors.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (v && !d.vendorPhone) set('vendorPhone', v.phone);
  };

  const agreed = parseAmount(d.agreedAmount);
  const advance = parseAmount(d.advanceAmount);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!d.eventId || !derived.eventById.has(d.eventId)) e.eventId = 'Choose an event.';
    const name = d.name.trim();
    if (!name) e.name = 'What is this expense for?';
    else if (name.length > LIMITS.nameMax) e.name = `Keep it under ${LIMITS.nameMax} characters.`;
    if (!d.categoryId) e.categoryId = 'Choose a category.';
    if (agreed === null) e.agreedAmount = 'Enter the agreed total amount.';
    else if (agreed <= 0) e.agreedAmount = 'Amount must be greater than zero.';
    else if (agreed > LIMITS.maxAmount) e.agreedAmount = 'That amount looks too large.';
    if (!isValidISODate(d.expenseDate)) e.expenseDate = 'Enter a valid date.';
    if (d.dueDate && !isValidISODate(d.dueDate)) e.dueDate = 'Enter a valid date.';
    if (d.vendorName.length > LIMITS.nameMax) e.vendorName = 'Keep it under 100 characters.';
    if (d.vendorPhone && !PHONE_RE.test(d.vendorPhone.trim())) e.vendorPhone = 'Enter a valid phone number.';
    if (d.notes.length > LIMITS.notesMax) e.notes = `Keep notes under ${LIMITS.notesMax} characters.`;
    if (!existing && d.advanceAmount.trim()) {
      if (advance === null || advance <= 0) e.advanceAmount = 'Enter a valid advance amount, or leave it empty.';
      else if (advance > LIMITS.maxAmount) e.advanceAmount = 'That amount looks too large.';
      if (!isValidISODate(d.advanceDate)) e.advanceDate = 'Enter a valid date.';
    }
    return e;
  };

  const addCategory = () => {
    const name = (newCat ?? '').trim();
    if (!name) return;
    const dup = data.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (dup) {
      set('categoryId', dup.id);
    } else {
      const id = newId();
      const color = CUSTOM_CATEGORY_COLORS[data.categories.filter((c) => !c.isDefault).length % CUSTOM_CATEGORY_COLORS.length];
      dispatch({ type: 'category/add', category: { id, name: name.slice(0, 40), color, isDefault: false } });
      set('categoryId', id);
    }
    setNewCat(null);
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ts = nowISO();
    const actor = data.profile.fullName;

    // Link to an existing vendor record or create one so vendor-wise reports work.
    let vendorId: string | null = null;
    const vendorName = d.vendorName.trim();
    const vendorPhone = d.vendorPhone.trim();
    if (vendorName) {
      if (matchedVendor) {
        vendorId = matchedVendor.id;
        if (vendorPhone && !matchedVendor.phone) dispatch({ type: 'vendor/upsert', vendor: { ...matchedVendor, phone: vendorPhone } });
      } else {
        const v: Vendor = { id: newId(), name: vendorName, contactPerson: '', phone: vendorPhone, email: '', address: '', notes: '', createdAt: ts, updatedAt: ts };
        dispatch({ type: 'vendor/upsert', vendor: v });
        vendorId = v.id;
      }
    }

    const fields = {
      eventId: d.eventId,
      name: d.name.trim(),
      categoryId: d.categoryId,
      vendorId,
      vendorName,
      vendorPhone,
      agreedAmount: agreed ?? 0,
      expenseDate: d.expenseDate,
      dueDate: d.dueDate || null,
      notes: d.notes.trim(),
    };

    if (existing) {
      dispatch({ type: 'expense/update', expense: { ...existing, ...fields } });
      toast('Expense updated');
    } else {
      const x: Expense = { id: newId(), ...fields, createdBy: actor, createdAt: ts, updatedAt: ts, deletedAt: null };
      dispatch({ type: 'expense/add', expense: x });
      if (advance && advance > 0) {
        dispatch({
          type: 'payment/add',
          payment: {
            id: newId(),
            expenseId: x.id,
            amount: advance,
            date: d.advanceDate,
            method: d.advanceMethod,
            kind: agreed !== null && advance >= agreed ? 'final' : 'advance',
            reference: '',
            notes: '',
            createdBy: actor,
            createdAt: ts,
            updatedAt: ts,
            deletedAt: null,
          },
        });
      }
      toast(advance ? 'Expense and advance saved' : 'Expense added');
    }
    onClose();
  };

  const remainingPreview = agreed !== null && advance !== null ? Math.round((agreed - advance) * 100) / 100 : null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={existing ? 'Edit expense' : 'Add expense'}
      subtitle={existing ? existing.name : 'Record what was agreed. Payments can be added any time.'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" form="expense-form" className="flex-1" icon={Check}>
            {existing ? 'Save changes' : 'Add expense'}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={submit} noValidate className="space-y-5">
        <Field label="Event" htmlFor="x-event" required error={errors.eventId}>
          <SelectInput id="x-event" value={d.eventId} onChange={(e) => set('eventId', e.target.value)} invalid={!!errors.eventId}>
            {selectableEvents.length === 0 && <option value="">Create an event first</option>}
            {selectableEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Expense name" htmlFor="x-name" required error={errors.name}>
          <TextInput id="x-name" data-autofocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Marriage Hall" invalid={!!errors.name} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Agreed total amount" htmlFor="x-amount" required error={errors.agreedAmount} hint={agreed ? formatMoney(agreed, currency) : undefined}>
            <AmountInput id="x-amount" prefix={currencySymbol(currency)} value={d.agreedAmount} onChange={(e) => set('agreedAmount', e.target.value)} placeholder="0" invalid={!!errors.agreedAmount} />
          </Field>
          <Field label="Category" htmlFor="x-cat" required error={errors.categoryId}>
            {newCat === null ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <SelectInput id="x-cat" value={d.categoryId} onChange={(e) => set('categoryId', e.target.value)} invalid={!!errors.categoryId}>
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </SelectInput>
                </div>
                <Button variant="secondary" icon={Plus} aria-label="New category" title="New category" className="w-11 shrink-0 px-0" onClick={() => setNewCat('')} />
              </div>
            ) : (
              <div className="flex gap-2">
                <TextInput
                  id="x-cat"
                  autoFocus
                  value={newCat}
                  maxLength={40}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="New category name"
                />
                <Button variant="soft" onClick={addCategory} className="shrink-0">
                  Add
                </Button>
                <Button variant="ghost" onClick={() => setNewCat(null)} className="shrink-0 px-2">
                  Cancel
                </Button>
              </div>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vendor or person" htmlFor="x-vendor" error={errors.vendorName} hint={matchedVendor ? 'Linked to saved vendor' : d.vendorName.trim() ? 'Will be saved as a new vendor' : undefined}>
            <TextInput id="x-vendor" list="vendor-options" value={d.vendorName} onChange={(e) => onVendorName(e.target.value)} placeholder="Who are you paying?" invalid={!!errors.vendorName} />
            <datalist id="vendor-options">
              {data.vendors.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Vendor contact number" htmlFor="x-phone" error={errors.vendorPhone}>
            <TextInput id="x-phone" type="tel" inputMode="tel" value={d.vendorPhone} onChange={(e) => set('vendorPhone', e.target.value)} placeholder="+91 98765 43210" invalid={!!errors.vendorPhone} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Expense date" htmlFor="x-date" required error={errors.expenseDate}>
            <TextInput id="x-date" type="date" value={d.expenseDate} onChange={(e) => set('expenseDate', e.target.value)} invalid={!!errors.expenseDate} />
          </Field>
          <Field label="Due date" htmlFor="x-due" error={errors.dueDate}>
            <TextInput id="x-due" type="date" value={d.dueDate} onChange={(e) => set('dueDate', e.target.value)} invalid={!!errors.dueDate} />
          </Field>
        </div>

        {!existing && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-navy-900 dark:text-white">Initial advance</span>
              <span className="text-xs text-slate-500">Optional – leave empty if nothing is paid yet</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Advance amount" htmlFor="x-adv" error={errors.advanceAmount}>
                <AmountInput id="x-adv" prefix={currencySymbol(currency)} value={d.advanceAmount} onChange={(e) => set('advanceAmount', e.target.value)} placeholder="0" invalid={!!errors.advanceAmount} />
              </Field>
              <Field label="Paid on" htmlFor="x-adv-date" error={errors.advanceDate}>
                <TextInput id="x-adv-date" type="date" value={d.advanceDate} onChange={(e) => set('advanceDate', e.target.value)} invalid={!!errors.advanceDate} />
              </Field>
            </div>
            {advance ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <ChoiceChip key={m.value} selected={d.advanceMethod === m.value} onClick={() => set('advanceMethod', m.value)}>
                      <m.icon className="size-4" aria-hidden /> {m.label}
                    </ChoiceChip>
                  ))}
                </div>
                {remainingPreview !== null && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {remainingPreview >= 0 ? (
                      <>
                        Remaining balance after advance: <strong className="tabular">{formatMoney(remainingPreview, currency)}</strong>
                      </>
                    ) : (
                      <span className="text-violet-600 dark:text-violet-300">Advance exceeds the agreed amount by {formatMoney(-remainingPreview, currency)} – this will show as Overpaid.</span>
                    )}
                  </p>
                )}
              </>
            ) : null}
          </div>
        )}

        <Field label="Notes" htmlFor="x-notes" error={errors.notes}>
          <TextArea id="x-notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Terms, inclusions, anything to remember" invalid={!!errors.notes} />
        </Field>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
          <Paperclip className="size-4 shrink-0" />
          Receipt attachments are enabled in Phase 7 with secure Supabase Storage.
        </div>
      </form>
    </Modal>
  );
}
