import type { AppData, Category, Expense, Payment, PaymentStatus, SMEvent, Vendor } from '../types';
import { daysBetween, todayISO } from './format';

// All money arithmetic is done in integer paise to avoid floating-point drift.
export const toPaise = (n: number) => Math.round(n * 100);

export function sumMoney(values: number[]): number {
  let t = 0;
  for (const v of values) t += toPaise(v);
  return t / 100;
}

export function subMoney(a: number, b: number): number {
  return (toPaise(a) - toPaise(b)) / 100;
}

/**
 * Pending        – nothing paid yet
 * Partially Paid – something paid, balance remains
 * Paid           – paid exactly the agreed amount
 * Overpaid       – paid more than agreed
 */
export function getPaymentStatus(agreed: number, paid: number): PaymentStatus {
  const a = toPaise(agreed);
  const p = toPaise(paid);
  if (p <= 0) return 'pending';
  if (p < a) return 'partially_paid';
  if (p === a) return 'paid';
  return 'overpaid';
}

export interface ExpenseSummary {
  paid: number;
  /** Agreed − Paid (negative when overpaid) */
  outstanding: number;
  /** max(outstanding, 0) – the amount still to be paid */
  pending: number;
  overpaidBy: number;
  status: PaymentStatus;
  /** paid / agreed, can exceed 1 */
  progress: number;
  paymentCount: number;
  lastPaymentDate: string | null;
}

export function summarizeExpense(expense: Pick<Expense, 'agreedAmount'>, payments: Payment[]): ExpenseSummary {
  const paid = sumMoney(payments.map((p) => p.amount));
  const outstanding = subMoney(expense.agreedAmount, paid);
  let last: string | null = null;
  for (const p of payments) if (!last || p.date > last) last = p.date;
  return {
    paid,
    outstanding,
    pending: Math.max(0, outstanding),
    overpaidBy: Math.max(0, -outstanding),
    status: getPaymentStatus(expense.agreedAmount, paid),
    progress: expense.agreedAmount > 0 ? paid / expense.agreedAmount : paid > 0 ? 1 : 0,
    paymentCount: payments.length,
    lastPaymentDate: last,
  };
}

export interface EventSummary {
  budget: number;
  totalExpense: number;
  paid: number;
  /** Sum of pending balances (overpayments don't offset other expenses' dues) */
  outstanding: number;
  remainingBudget: number;
  budgetUsed: number;
  expenseCount: number;
  statusCounts: Record<PaymentStatus, number>;
  overdueCount: number;
  nextDue: { expenseId: string; dueDate: string; pending: number } | null;
}

export function summarizeEvent(event: SMEvent, expenses: Expense[], sums: Map<string, ExpenseSummary>): EventSummary {
  const statusCounts: Record<PaymentStatus, number> = { pending: 0, partially_paid: 0, paid: 0, overpaid: 0 };
  let total = 0;
  let paid = 0;
  let pending = 0;
  let overdueCount = 0;
  let nextDue: EventSummary['nextDue'] = null;
  const today = todayISO();
  for (const x of expenses) {
    const s = sums.get(x.id);
    if (!s) continue;
    total += toPaise(x.agreedAmount);
    paid += toPaise(s.paid);
    pending += toPaise(s.pending);
    statusCounts[s.status]++;
    if (s.pending > 0 && x.dueDate) {
      if (x.dueDate < today) overdueCount++;
      if (!nextDue || x.dueDate < nextDue.dueDate) nextDue = { expenseId: x.id, dueDate: x.dueDate, pending: s.pending };
    }
  }
  const totalExpense = total / 100;
  return {
    budget: event.budget,
    totalExpense,
    paid: paid / 100,
    outstanding: pending / 100,
    remainingBudget: subMoney(event.budget, totalExpense),
    budgetUsed: event.budget > 0 ? totalExpense / event.budget : 0,
    expenseCount: expenses.length,
    statusCounts,
    overdueCount,
    nextDue,
  };
}

export interface UpcomingItem {
  expense: Expense;
  event: SMEvent;
  pending: number;
  dueDate: string;
  daysLeft: number;
}

export interface Totals {
  totalExpense: number;
  paid: number;
  pending: number;
  totalBudget: number;
  activeEvents: number;
  planningEvents: number;
  completedEvents: number;
  archivedEvents: number;
}

export interface Derived {
  events: SMEvent[];
  expenses: Expense[];
  payments: Payment[];
  eventById: Map<string, SMEvent>;
  expenseById: Map<string, Expense>;
  categoryById: Map<string, Category>;
  vendorById: Map<string, Vendor>;
  paymentsByExpense: Map<string, Payment[]>;
  expensesByEvent: Map<string, Expense[]>;
  expenseSummary: Map<string, ExpenseSummary>;
  eventSummary: Map<string, EventSummary>;
  totals: Totals;
  upcoming: UpcomingItem[];
}

const byDateThenCreated = (a: Payment, b: Payment) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date));

export function deriveData(d: AppData): Derived {
  const events = d.events.filter((e) => !e.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const eventById = new Map(events.map((e) => [e.id, e] as const));
  const expenses = d.expenses.filter((x) => !x.deletedAt && eventById.has(x.eventId));
  const expenseById = new Map(expenses.map((x) => [x.id, x] as const));
  const payments = d.payments.filter((p) => !p.deletedAt && expenseById.has(p.expenseId)).sort(byDateThenCreated);

  const paymentsByExpense = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = paymentsByExpense.get(p.expenseId);
    if (list) list.push(p);
    else paymentsByExpense.set(p.expenseId, [p]);
  }

  const expensesByEvent = new Map<string, Expense[]>();
  for (const x of expenses) {
    const list = expensesByEvent.get(x.eventId);
    if (list) list.push(x);
    else expensesByEvent.set(x.eventId, [x]);
  }

  const expenseSummary = new Map(expenses.map((x) => [x.id, summarizeExpense(x, paymentsByExpense.get(x.id) ?? [])] as const));
  const eventSummary = new Map(events.map((e) => [e.id, summarizeEvent(e, expensesByEvent.get(e.id) ?? [], expenseSummary)] as const));

  let total = 0;
  let paid = 0;
  let pending = 0;
  let budget = 0;
  for (const e of events) {
    const s = eventSummary.get(e.id)!;
    total += toPaise(s.totalExpense);
    paid += toPaise(s.paid);
    pending += toPaise(s.outstanding);
    budget += toPaise(e.budget);
  }

  const today = todayISO();
  const upcoming: UpcomingItem[] = [];
  for (const x of expenses) {
    const s = expenseSummary.get(x.id)!;
    if (s.pending > 0 && x.dueDate) {
      upcoming.push({ expense: x, event: eventById.get(x.eventId)!, pending: s.pending, dueDate: x.dueDate, daysLeft: daysBetween(today, x.dueDate) });
    }
  }
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    events,
    expenses,
    payments,
    eventById,
    expenseById,
    categoryById: new Map(d.categories.map((c) => [c.id, c] as const)),
    vendorById: new Map(d.vendors.map((v) => [v.id, v] as const)),
    paymentsByExpense,
    expensesByEvent,
    expenseSummary,
    eventSummary,
    totals: {
      totalExpense: total / 100,
      paid: paid / 100,
      pending: pending / 100,
      totalBudget: budget / 100,
      activeEvents: events.filter((e) => e.status === 'active').length,
      planningEvents: events.filter((e) => e.status === 'planning').length,
      completedEvents: events.filter((e) => e.status === 'completed').length,
      archivedEvents: events.filter((e) => e.status === 'archived').length,
    },
    upcoming,
  };
}
