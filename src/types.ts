// Domain model for SpendMate.
// Shapes mirror the planned Supabase tables (Phase 3) so the local store can be swapped for the database later.

export type EventType =
  | 'House Construction'
  | 'Marriage'
  | 'Engagement'
  | 'Housewarming'
  | 'Birthday'
  | 'Family Function'
  | 'Travel'
  | 'Education'
  | 'Medical'
  | 'Shopping'
  | 'Personal Project'
  | 'Custom Event';

export type EventStatus = 'planning' | 'active' | 'completed' | 'archived';
export type CoverKey = 'indigo' | 'rose' | 'emerald' | 'amber' | 'sky' | 'violet' | 'slate';

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'other';
export type PaymentKind = 'advance' | 'partial' | 'final';
export type PaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'overpaid';
export type ThemePref = 'light' | 'dark' | 'system';

/** Named SMEvent to avoid clashing with the DOM `Event` type. Maps to the `events` table. */
export interface SMEvent {
  id: string;
  name: string;
  type: EventType;
  status: EventStatus;
  eventDate: string | null; // YYYY-MM-DD
  startDate: string | null;
  endDate: string | null;
  budget: number;
  description: string;
  location: string;
  cover: CoverKey;
  createdBy: string;
  createdAt: string; // ISO timestamp
  updatedAt: string;
  deletedAt: string | null;
}

export interface Expense {
  id: string;
  eventId: string;
  name: string;
  categoryId: string;
  vendorId: string | null;
  vendorName: string;
  vendorPhone: string;
  agreedAmount: number;
  expenseDate: string; // YYYY-MM-DD
  dueDate: string | null;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Payment {
  id: string;
  expenseId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: PaymentMethod;
  kind: PaymentKind;
  reference: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex
  isDefault: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditChange {
  field: string;
  from: string;
  to: string;
}

export interface AuditLog {
  id: string;
  entityType: 'event' | 'expense' | 'payment' | 'vendor' | 'category';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  summary: string;
  changes: AuditChange[];
  eventId: string | null;
  expenseId: string | null;
  actor: string;
  at: string;
}

export interface NotificationPrefs {
  dueReminders: boolean;
  sharedActivity: boolean;
  budgetAlerts: boolean;
  invitations: boolean;
}

export interface Profile {
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  currency: string;
  notifications: NotificationPrefs;
}

export interface AppData {
  version: 1;
  events: SMEvent[];
  expenses: Expense[];
  payments: Payment[];
  categories: Category[];
  vendors: Vendor[];
  auditLogs: AuditLog[];
  profile: Profile;
  theme: ThemePref;
}
