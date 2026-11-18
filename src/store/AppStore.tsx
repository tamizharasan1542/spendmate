import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { AppData, AuditChange, AuditLog, Category, Expense, Payment, Profile, SMEvent, ThemePref, Vendor } from '../types';
import { createSampleData } from '../data/sampleData';
import { deriveData, type Derived } from '../lib/calc';
import { newId, nowISO } from '../lib/id';
import { formatCompact, formatDate, formatMoney } from '../lib/format';
import { eventStatusMeta, paymentKindLabel, paymentMethodMeta } from '../data/constants';

// Phase 1 store: a reducer persisted to localStorage on this device.
// Phase 3+ replaces persistence with Supabase while keeping the same actions and audit semantics.

export const STORAGE_KEY = 'spendmate:data:v1';

export type Action =
  | { type: 'event/add'; event: SMEvent }
  | { type: 'event/update'; event: SMEvent }
  | { type: 'event/delete'; id: string }
  | { type: 'expense/add'; expense: Expense }
  | { type: 'expense/update'; expense: Expense }
  | { type: 'expense/delete'; id: string }
  | { type: 'payment/add'; payment: Payment }
  | { type: 'payment/update'; payment: Payment }
  | { type: 'payment/delete'; id: string }
  | { type: 'vendor/upsert'; vendor: Vendor }
  | { type: 'category/add'; category: Category }
  | { type: 'profile/update'; profile: Partial<Profile> }
  | { type: 'theme/set'; theme: ThemePref }
  | { type: 'data/replace'; data: AppData };

interface FieldSpec<T> {
  key: keyof T;
  label: string;
  fmt?: (v: unknown) => string;
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function diff<T>(before: T, after: T, fields: FieldSpec<T>[]): AuditChange[] {
  const out: AuditChange[] = [];
  for (const f of fields) {
    const a = before[f.key];
    const b = after[f.key];
    if ((a ?? '') === (b ?? '')) continue;
    const fmt = f.fmt;
    out.push({ field: f.label, from: fmt ? fmt(a) : show(a), to: fmt ? fmt(b) : show(b) });
  }
  return out;
}

function withLog(state: AppData, entry: Omit<AuditLog, 'id' | 'at' | 'actor'>): AuditLog[] {
  return [{ id: newId(), at: nowISO(), actor: state.profile.fullName || 'You', ...entry }, ...state.auditLogs];
}

function reducer(state: AppData, action: Action): AppData {
  const cur = state.profile.currency;
  const money = (v: unknown) => (typeof v === 'number' ? formatMoney(v, cur) : show(v));
  const date = (v: unknown) => (typeof v === 'string' && v ? formatDate(v) : '—');
  const ts = nowISO();

  switch (action.type) {
    case 'event/add': {
      const e = action.event;
      return {
        ...state,
        events: [e, ...state.events],
        auditLogs: withLog(state, { entityType: 'event', entityId: e.id, action: 'create', summary: `Created event “${e.name}”`, changes: [], eventId: e.id, expenseId: null }),
      };
    }
    case 'event/update': {
      const before = state.events.find((e) => e.id === action.event.id);
      if (!before) return state;
      const after = { ...action.event, updatedAt: ts };
      const changes = diff<SMEvent>(before, after, [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status', fmt: (v) => eventStatusMeta(v as SMEvent['status']).label },
        { key: 'budget', label: 'Budget', fmt: money },
        { key: 'eventDate', label: 'Event date', fmt: date },
        { key: 'startDate', label: 'Start date', fmt: date },
        { key: 'endDate', label: 'End date', fmt: date },
        { key: 'location', label: 'Location' },
        { key: 'description', label: 'Description' },
        { key: 'cover', label: 'Cover' },
      ]);
      if (changes.length === 0) return state;
      return {
        ...state,
        events: state.events.map((e) => (e.id === after.id ? after : e)),
        auditLogs: withLog(state, { entityType: 'event', entityId: after.id, action: 'update', summary: `Updated event “${after.name}”`, changes, eventId: after.id, expenseId: null }),
      };
    }
    case 'event/delete': {
      const ev = state.events.find((e) => e.id === action.id);
      if (!ev) return state;
      return {
        ...state,
        events: state.events.map((e) => (e.id === action.id ? { ...e, deletedAt: ts, updatedAt: ts } : e)),
        auditLogs: withLog(state, { entityType: 'event', entityId: ev.id, action: 'delete', summary: `Deleted event “${ev.name}” (expenses and payments retained in history)`, changes: [], eventId: ev.id, expenseId: null }),
      };
    }
    case 'expense/add': {
      const x = action.expense;
      return {
        ...state,
        expenses: [...state.expenses, x],
        auditLogs: withLog(state, { entityType: 'expense', entityId: x.id, action: 'create', summary: `Added expense “${x.name}” – agreed ${formatMoney(x.agreedAmount, cur)}`, changes: [], eventId: x.eventId, expenseId: x.id }),
      };
    }
    case 'expense/update': {
      const before = state.expenses.find((x) => x.id === action.expense.id);
      if (!before) return state;
      const after = { ...action.expense, updatedAt: ts };
      const catName = (v: unknown) => state.categories.find((c) => c.id === v)?.name ?? show(v);
      const evName = (v: unknown) => state.events.find((e) => e.id === v)?.name ?? show(v);
      const changes = diff<Expense>(before, after, [
        { key: 'name', label: 'Name' },
        { key: 'eventId', label: 'Event', fmt: evName },
        { key: 'categoryId', label: 'Category', fmt: catName },
        { key: 'vendorName', label: 'Vendor' },
        { key: 'vendorPhone', label: 'Vendor phone' },
        { key: 'agreedAmount', label: 'Agreed amount', fmt: money },
        { key: 'expenseDate', label: 'Expense date', fmt: date },
        { key: 'dueDate', label: 'Due date', fmt: date },
        { key: 'notes', label: 'Notes' },
      ]);
      if (changes.length === 0) return state;
      return {
        ...state,
        expenses: state.expenses.map((x) => (x.id === after.id ? after : x)),
        auditLogs: withLog(state, { entityType: 'expense', entityId: after.id, action: 'update', summary: `Edited expense “${after.name}”`, changes, eventId: after.eventId, expenseId: after.id }),
      };
    }
    case 'expense/delete': {
      const x = state.expenses.find((e) => e.id === action.id);
      if (!x) return state;
      return {
        ...state,
        expenses: state.expenses.map((e) => (e.id === action.id ? { ...e, deletedAt: ts, updatedAt: ts } : e)),
        auditLogs: withLog(state, { entityType: 'expense', entityId: x.id, action: 'delete', summary: `Deleted expense “${x.name}” (agreed ${formatMoney(x.agreedAmount, cur)}); payment records retained`, changes: [], eventId: x.eventId, expenseId: x.id }),
      };
    }
    case 'payment/add': {
      const p = action.payment;
      const x = state.expenses.find((e) => e.id === p.expenseId);
      return {
        ...state,
        payments: [...state.payments, p],
        auditLogs: withLog(state, {
          entityType: 'payment',
          entityId: p.id,
          action: 'create',
          summary: `Recorded ${paymentKindLabel(p.kind).toLowerCase()} of ${formatMoney(p.amount, cur)} via ${paymentMethodMeta(p.method).label}`,
          changes: [],
          eventId: x?.eventId ?? null,
          expenseId: p.expenseId,
        }),
      };
    }
    case 'payment/update': {
      const before = state.payments.find((p) => p.id === action.payment.id);
      if (!before) return state;
      const after = { ...action.payment, updatedAt: ts };
      const x = state.expenses.find((e) => e.id === after.expenseId);
      const changes = diff<Payment>(before, after, [
        { key: 'amount', label: 'Amount', fmt: money },
        { key: 'date', label: 'Date', fmt: date },
        { key: 'method', label: 'Method', fmt: (v) => paymentMethodMeta(v as Payment['method']).label },
        { key: 'kind', label: 'Type', fmt: (v) => paymentKindLabel(v as Payment['kind']) },
        { key: 'reference', label: 'Reference' },
        { key: 'notes', label: 'Notes' },
      ]);
      if (changes.length === 0) return state;
      return {
        ...state,
        payments: state.payments.map((p) => (p.id === after.id ? after : p)),
        auditLogs: withLog(state, { entityType: 'payment', entityId: after.id, action: 'update', summary: `Edited payment of ${formatMoney(after.amount, cur)}`, changes, eventId: x?.eventId ?? null, expenseId: after.expenseId }),
      };
    }
    case 'payment/delete': {
      const p = state.payments.find((x) => x.id === action.id);
      if (!p) return state;
      const x = state.expenses.find((e) => e.id === p.expenseId);
      return {
        ...state,
        payments: state.payments.map((q) => (q.id === action.id ? { ...q, deletedAt: ts, updatedAt: ts } : q)),
        auditLogs: withLog(state, {
          entityType: 'payment',
          entityId: p.id,
          action: 'delete',
          summary: `Deleted payment of ${formatMoney(p.amount, cur)} dated ${formatDate(p.date)} (${paymentMethodMeta(p.method).label}${p.reference ? `, ref ${p.reference}` : ''})`,
          changes: [],
          eventId: x?.eventId ?? null,
          expenseId: p.expenseId,
        }),
      };
    }
    case 'vendor/upsert': {
      const v = action.vendor;
      const exists = state.vendors.some((x) => x.id === v.id);
      // Keep denormalised vendor name/phone on linked expenses in sync.
      const expenses = exists
        ? state.expenses.map((x) => (x.vendorId === v.id ? { ...x, vendorName: v.name, vendorPhone: v.phone || x.vendorPhone } : x))
        : state.expenses;
      return {
        ...state,
        expenses,
        vendors: exists ? state.vendors.map((x) => (x.id === v.id ? { ...v, updatedAt: ts } : x)) : [...state.vendors, v],
        auditLogs: withLog(state, { entityType: 'vendor', entityId: v.id, action: exists ? 'update' : 'create', summary: `${exists ? 'Updated' : 'Added'} vendor “${v.name}”`, changes: [], eventId: null, expenseId: null }),
      };
    }
    case 'category/add':
      return { ...state, categories: [...state.categories, action.category] };
    case 'profile/update':
      return { ...state, profile: { ...state.profile, ...action.profile } };
    case 'theme/set':
      return { ...state, theme: action.theme };
    case 'data/replace':
      return action.data;
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.events)) return parsed;
    }
  } catch {
    /* corrupted or unavailable storage – fall back to sample data */
  }
  return createSampleData();
}

interface StoreValue {
  data: AppData;
  derived: Derived;
  dispatch: Dispatch<Action>;
  currency: string;
  money: (n: number) => string;
  compact: (n: number) => string;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked – app keeps working in memory */
    }
  }, [data]);

  const value = useMemo<StoreValue>(() => {
    const currency = data.profile.currency || 'INR';
    return {
      data,
      derived: deriveData(data),
      dispatch,
      currency,
      money: (n: number) => formatMoney(n, currency),
      compact: (n: number) => formatCompact(n, currency),
    };
  }, [data]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
