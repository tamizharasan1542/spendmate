import type { Expense, Payment } from '../types';
import type { Derived } from './calc';
import { toPaise } from './calc';
import { addDays, monthKey, monthLabel, monthsBetween, todayISO } from './format';

export type DatePreset = 'all' | 'month' | '3m' | '6m' | 'year' | 'custom';

export interface ReportFilters {
  preset: DatePreset;
  from: string;
  to: string;
  eventId: string; // 'all' or id
  categoryId: string; // 'all' or id
}

export function resolveRange(f: ReportFilters): { from: string | null; to: string | null } {
  const t = todayISO();
  switch (f.preset) {
    case 'all':
      return { from: null, to: null };
    case 'month':
      return { from: `${t.slice(0, 7)}-01`, to: t };
    case '3m':
      return { from: addDays(t, -91), to: t };
    case '6m':
      return { from: addDays(t, -182), to: t };
    case 'year':
      return { from: `${t.slice(0, 4)}-01-01`, to: t };
    case 'custom':
      return { from: f.from || null, to: f.to || null };
  }
}

const inRange = (iso: string, r: { from: string | null; to: string | null }) => (!r.from || iso >= r.from) && (!r.to || iso <= r.to);

/** Expense-level reports: expenses whose expense date falls in the range, with all their payments to date. */
export function filterExpenses(derived: Derived, f: ReportFilters): Expense[] {
  const r = resolveRange(f);
  return derived.expenses.filter((x) => (f.eventId === 'all' || x.eventId === f.eventId) && (f.categoryId === 'all' || x.categoryId === f.categoryId) && inRange(x.expenseDate, r));
}

/** Cash-flow reports: payments made within the range, for expenses matching event/category filters. */
export function filterPayments(derived: Derived, f: ReportFilters): Payment[] {
  const r = resolveRange(f);
  return derived.payments.filter((p) => {
    const x = derived.expenseById.get(p.expenseId);
    if (!x) return false;
    return (f.eventId === 'all' || x.eventId === f.eventId) && (f.categoryId === 'all' || x.categoryId === f.categoryId) && inRange(p.date, r);
  });
}

export interface Row {
  key: string;
  label: string;
  color?: string;
  agreed: number;
  paid: number;
  pending: number;
  count: number;
  budget?: number;
}

export function groupExpenses(derived: Derived, expenses: Expense[], by: 'event' | 'category' | 'vendor'): Row[] {
  const acc = new Map<string, { label: string; color?: string; agreed: number; paid: number; pending: number; count: number }>();
  for (const x of expenses) {
    const s = derived.expenseSummary.get(x.id);
    if (!s) continue;
    let key: string;
    let label: string;
    let color: string | undefined;
    if (by === 'event') {
      key = x.eventId;
      label = derived.eventById.get(x.eventId)?.name ?? 'Unknown event';
    } else if (by === 'category') {
      const c = derived.categoryById.get(x.categoryId);
      key = x.categoryId;
      label = c?.name ?? 'Uncategorised';
      color = c?.color;
    } else {
      key = x.vendorId ?? (x.vendorName.trim().toLowerCase() || '__none');
      label = x.vendorName.trim() || 'No vendor';
    }
    const row = acc.get(key) ?? { label, color, agreed: 0, paid: 0, pending: 0, count: 0 };
    row.agreed += toPaise(x.agreedAmount);
    row.paid += toPaise(s.paid);
    row.pending += toPaise(s.pending);
    row.count++;
    acc.set(key, row);
  }
  return [...acc.entries()]
    .map(([key, r]) => ({
      key,
      label: r.label,
      color: r.color,
      agreed: r.agreed / 100,
      paid: r.paid / 100,
      pending: r.pending / 100,
      count: r.count,
      budget: by === 'event' ? derived.eventById.get(key)?.budget : undefined,
    }))
    .sort((a, b) => b.agreed - a.agreed);
}

export interface PeriodRow {
  key: string;
  label: string;
  paid: number;
  count: number;
}

export function paymentsByPeriod(payments: Payment[], period: 'month' | 'year', range: { from: string | null; to: string | null }): PeriodRow[] {
  const acc = new Map<string, { paid: number; count: number }>();
  for (const p of payments) {
    const key = period === 'month' ? monthKey(p.date) : p.date.slice(0, 4);
    const r = acc.get(key) ?? { paid: 0, count: 0 };
    r.paid += toPaise(p.amount);
    r.count++;
    acc.set(key, r);
  }
  let keys = [...acc.keys()].sort();
  if (period === 'month' && keys.length) {
    // Fill gaps so the trend line is continuous.
    const first = range.from ? range.from.slice(0, 7) : keys[0];
    const last = range.to ? range.to.slice(0, 7) : keys[keys.length - 1] > todayISO().slice(0, 7) ? keys[keys.length - 1] : todayISO().slice(0, 7);
    keys = monthsBetween(first < keys[0] ? first : keys[0], last);
  }
  if (period === 'year' && keys.length) {
    const out: string[] = [];
    for (let y = Number(keys[0]); y <= Number(keys[keys.length - 1]); y++) out.push(String(y));
    keys = out;
  }
  return keys.map((k) => {
    const r = acc.get(k) ?? { paid: 0, count: 0 };
    return { key: k, label: period === 'month' ? monthLabel(k, true) : k, paid: r.paid / 100, count: r.count };
  });
}

// ---------- CSV ----------

function csvCell(v: string | number): string {
  const s = String(v);
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === 'string' ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadCSV(filename: string, csv: string) {
  // BOM so Excel opens UTF-8 (₹, names) correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
