import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import type { CoverKey, EventStatus, EventType, SMEvent } from '../../types';
import { COVERS, EVENT_STATUSES, EVENT_TYPES, LIMITS } from '../../data/constants';
import { amountToInput, currencySymbol, formatMoney, isValidISODate, parseAmount, todayISO } from '../../lib/format';
import { cn, newId, nowISO } from '../../lib/id';
import { navigate } from '../../lib/router';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AmountInput, ChoiceChip, Field, TextArea, TextInput } from '../ui/Field';

interface Draft {
  name: string;
  type: EventType;
  status: EventStatus;
  eventDate: string;
  startDate: string;
  endDate: string;
  budget: string;
  location: string;
  description: string;
  cover: CoverKey;
}

type Errors = Partial<Record<keyof Draft, string>>;

export function validateEventDraft(d: Draft): Errors {
  const e: Errors = {};
  const name = d.name.trim();
  if (!name) e.name = 'Give your event a name.';
  else if (name.length > LIMITS.nameMax) e.name = `Keep it under ${LIMITS.nameMax} characters.`;
  if (d.budget.trim()) {
    const b = parseAmount(d.budget);
    if (b === null) e.budget = 'Enter a valid amount (up to 2 decimals).';
    else if (b > LIMITS.maxAmount) e.budget = 'That amount looks too large.';
  }
  for (const k of ['eventDate', 'startDate', 'endDate'] as const) {
    if (d[k] && !isValidISODate(d[k])) e[k] = 'Enter a valid date.';
  }
  if (d.startDate && d.endDate && !e.startDate && !e.endDate && d.endDate < d.startDate) e.endDate = 'End date can’t be before the start date.';
  if (d.description.length > LIMITS.notesMax) e.description = `Keep it under ${LIMITS.notesMax} characters.`;
  if (d.location.length > 200) e.location = 'Keep it under 200 characters.';
  return e;
}

export function EventForm({ eventId, onClose }: { eventId?: string; onClose: () => void }) {
  const { derived, dispatch, data, currency } = useStore();
  const { toast } = useUI();
  const existing = eventId ? derived.eventById.get(eventId) : undefined;

  const [d, setD] = useState<Draft>(() =>
    existing
      ? {
          name: existing.name,
          type: existing.type,
          status: existing.status,
          eventDate: existing.eventDate ?? '',
          startDate: existing.startDate ?? '',
          endDate: existing.endDate ?? '',
          budget: amountToInput(existing.budget),
          location: existing.location,
          description: existing.description,
          cover: existing.cover,
        }
      : { name: '', type: 'Marriage', status: 'planning', eventDate: '', startDate: todayISO(), endDate: '', budget: '', location: '', description: '', cover: 'rose' },
  );
  const [errors, setErrors] = useState<Errors>({});
  const [coverTouched, setCoverTouched] = useState(!!existing);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const pickType = (t: EventType) => {
    set('type', t);
    if (!coverTouched) set('cover', EVENT_TYPES.find((x) => x.value === t)?.cover ?? 'indigo');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateEventDraft(d);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const base = {
      name: d.name.trim(),
      type: d.type,
      status: d.status,
      eventDate: d.eventDate || null,
      startDate: d.startDate || null,
      endDate: d.endDate || null,
      budget: parseAmount(d.budget) ?? 0,
      location: d.location.trim(),
      description: d.description.trim(),
      cover: d.cover,
    };
    if (existing) {
      dispatch({ type: 'event/update', event: { ...existing, ...base } });
      toast('Event updated');
    } else {
      const ts = nowISO();
      const ev: SMEvent = { id: newId(), ...base, createdBy: data.profile.fullName, createdAt: ts, updatedAt: ts, deletedAt: null };
      dispatch({ type: 'event/add', event: ev });
      toast('Event created');
      navigate(`/events/${ev.id}`);
    }
    onClose();
  };

  const budgetPreview = parseAmount(d.budget);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={existing ? 'Edit event' : 'Create event'}
      subtitle={existing ? existing.name : 'Track budget, expenses and payments in one place.'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" form="event-form" className="flex-1" icon={Check}>
            {existing ? 'Save changes' : 'Create event'}
          </Button>
        </div>
      }
    >
      <form id="event-form" onSubmit={submit} noValidate className="space-y-5">
        <Field label="Event name" htmlFor="ev-name" required error={errors.name}>
          <TextInput id="ev-name" data-autofocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Priya & Arjun's Wedding" maxLength={LIMITS.nameMax + 20} invalid={!!errors.name} />
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Event type</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {EVENT_TYPES.map((t) => {
              const sel = d.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => pickType(t.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition active:scale-[0.97]',
                    sel ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/15 dark:border-brand-400 dark:bg-brand-400/10 dark:text-brand-200' : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300',
                  )}
                >
                  <t.icon className="size-5" aria-hidden />
                  <span className="leading-tight">{t.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Total budget" htmlFor="ev-budget" error={errors.budget} hint={budgetPreview ? formatMoney(budgetPreview, currency) : 'Optional – used for budget tracking and alerts.'}>
          <AmountInput id="ev-budget" prefix={currencySymbol(currency)} value={d.budget} onChange={(e) => set('budget', e.target.value)} placeholder="0" invalid={!!errors.budget} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Event date" htmlFor="ev-date" error={errors.eventDate}>
            <TextInput id="ev-date" type="date" value={d.eventDate} onChange={(e) => set('eventDate', e.target.value)} invalid={!!errors.eventDate} />
          </Field>
          <Field label="Start date" htmlFor="ev-start" error={errors.startDate}>
            <TextInput id="ev-start" type="date" value={d.startDate} onChange={(e) => set('startDate', e.target.value)} invalid={!!errors.startDate} />
          </Field>
          <Field label="End date" htmlFor="ev-end" error={errors.endDate}>
            <TextInput id="ev-end" type="date" value={d.endDate} min={d.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} invalid={!!errors.endDate} />
          </Field>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
          <div className="flex flex-wrap gap-2">
            {EVENT_STATUSES.map((s) => (
              <ChoiceChip key={s.value} selected={d.status === s.value} onClick={() => set('status', s.value)}>
                {s.label}
              </ChoiceChip>
            ))}
          </div>
        </div>

        <Field label="Location" htmlFor="ev-loc" error={errors.location}>
          <TextInput id="ev-loc" value={d.location} onChange={(e) => set('location', e.target.value)} placeholder="City or venue" invalid={!!errors.location} />
        </Field>

        <Field label="Description" htmlFor="ev-desc" error={errors.description}>
          <TextArea id="ev-desc" value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="Guest count, plans, anything worth remembering" invalid={!!errors.description} />
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Cover theme</span>
          <div className="flex flex-wrap items-center gap-2.5">
            {(Object.keys(COVERS) as CoverKey[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-label={`${k} cover`}
                aria-pressed={d.cover === k}
                onClick={() => {
                  setCoverTouched(true);
                  set('cover', k);
                }}
                className={cn('size-9 rounded-full bg-linear-to-br transition', COVERS[k].gradient, d.cover === k ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-navy-900' : 'opacity-80 hover:opacity-100')}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Cover photo upload arrives with secure cloud storage in Phase 7.</p>
        </div>
      </form>
    </Modal>
  );
}
