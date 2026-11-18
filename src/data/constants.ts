import {
  Banknote,
  Briefcase,
  Building2,
  Cake,
  CreditCard,
  Gem,
  GraduationCap,
  Heart,
  House,
  Landmark,
  Plane,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Category, CoverKey, EventStatus, EventType, PaymentKind, PaymentMethod, PaymentStatus } from '../types';

export const EVENT_TYPES: { value: EventType; icon: LucideIcon; cover: CoverKey }[] = [
  { value: 'Marriage', icon: Heart, cover: 'rose' },
  { value: 'House Construction', icon: Building2, cover: 'amber' },
  { value: 'Engagement', icon: Gem, cover: 'violet' },
  { value: 'Housewarming', icon: House, cover: 'emerald' },
  { value: 'Birthday', icon: Cake, cover: 'sky' },
  { value: 'Family Function', icon: Users, cover: 'indigo' },
  { value: 'Travel', icon: Plane, cover: 'sky' },
  { value: 'Education', icon: GraduationCap, cover: 'indigo' },
  { value: 'Medical', icon: Stethoscope, cover: 'emerald' },
  { value: 'Shopping', icon: ShoppingBag, cover: 'violet' },
  { value: 'Personal Project', icon: Briefcase, cover: 'slate' },
  { value: 'Custom Event', icon: Sparkles, cover: 'indigo' },
];

export function eventTypeMeta(type: EventType) {
  return EVENT_TYPES.find((t) => t.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

// Full class strings so Tailwind can detect them.
export const COVERS: Record<CoverKey, { gradient: string; swatch: string }> = {
  indigo: { gradient: 'from-brand-500 via-brand-700 to-navy-900', swatch: 'bg-brand-600' },
  rose: { gradient: 'from-rose-500 via-rose-700 to-navy-900', swatch: 'bg-rose-500' },
  emerald: { gradient: 'from-emerald-500 via-teal-700 to-navy-900', swatch: 'bg-emerald-500' },
  amber: { gradient: 'from-amber-500 via-orange-600 to-navy-900', swatch: 'bg-amber-500' },
  sky: { gradient: 'from-sky-400 via-sky-700 to-navy-900', swatch: 'bg-sky-500' },
  violet: { gradient: 'from-violet-500 via-violet-700 to-navy-900', swatch: 'bg-violet-500' },
  slate: { gradient: 'from-slate-500 via-slate-700 to-navy-900', swatch: 'bg-slate-500' },
};

export const EVENT_STATUSES: { value: EventStatus; label: string; badge: string }[] = [
  { value: 'planning', label: 'Planning', badge: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20' },
  { value: 'active', label: 'Active', badge: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20' },
  { value: 'completed', label: 'Completed', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20' },
  { value: 'archived', label: 'Archived', badge: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10' },
];

export const eventStatusMeta = (s: EventStatus) => EVENT_STATUSES.find((x) => x.value === s) ?? EVENT_STATUSES[0];

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; badge: string; bar: string; dot: string }> = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
  },
  partially_paid: {
    label: 'Partially Paid',
    badge: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20',
    bar: 'bg-brand-500',
    dot: 'bg-brand-500',
  },
  paid: {
    label: 'Paid',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  overpaid: {
    label: 'Overpaid',
    badge: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20',
    bar: 'bg-violet-500',
    dot: 'bg-violet-500',
  },
};

export const PAYMENT_STATUS_ORDER: PaymentStatus[] = ['pending', 'partially_paid', 'paid', 'overpaid'];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { value: 'other', label: 'Other', icon: Wallet },
];

export const paymentMethodMeta = (m: PaymentMethod) => PAYMENT_METHODS.find((x) => x.value === m) ?? PAYMENT_METHODS[5];

export const PAYMENT_KINDS: { value: PaymentKind; label: string }[] = [
  { value: 'advance', label: 'Advance' },
  { value: 'partial', label: 'Partial payment' },
  { value: 'final', label: 'Final settlement' },
];

export const paymentKindLabel = (k: PaymentKind) => PAYMENT_KINDS.find((x) => x.value === k)?.label ?? k;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-venue', name: 'Venue', color: '#4270f2', isDefault: true },
  { id: 'cat-food', name: 'Food', color: '#f59e0b', isDefault: true },
  { id: 'cat-invitation', name: 'Invitation', color: '#ec4899', isDefault: true },
  { id: 'cat-decoration', name: 'Decoration', color: '#a855f7', isDefault: true },
  { id: 'cat-photography', name: 'Photography', color: '#06b6d4', isDefault: true },
  { id: 'cat-jewellery', name: 'Jewellery', color: '#eab308', isDefault: true },
  { id: 'cat-clothing', name: 'Clothing', color: '#f43f5e', isDefault: true },
  { id: 'cat-construction', name: 'Construction Materials', color: '#ea580c', isDefault: true },
  { id: 'cat-labour', name: 'Labour', color: '#78716c', isDefault: true },
  { id: 'cat-electrical', name: 'Electrical', color: '#facc15', isDefault: true },
  { id: 'cat-plumbing', name: 'Plumbing', color: '#0ea5e9', isDefault: true },
  { id: 'cat-transport', name: 'Transport', color: '#14b8a6', isDefault: true },
  { id: 'cat-shopping', name: 'Shopping', color: '#8b5cf6', isDefault: true },
  { id: 'cat-medical', name: 'Medical', color: '#ef4444', isDefault: true },
  { id: 'cat-travel', name: 'Travel', color: '#10b981', isDefault: true },
  { id: 'cat-education', name: 'Education', color: '#6366f1', isDefault: true },
  { id: 'cat-misc', name: 'Miscellaneous', color: '#94a3b8', isDefault: true },
];

export const CUSTOM_CATEGORY_COLORS = ['#22c55e', '#d946ef', '#0891b2', '#b45309', '#4f46e5', '#be123c', '#65a30d', '#0d9488'];

export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
];

export const LIMITS = {
  nameMax: 100,
  notesMax: 1000,
  maxAmount: 10_000_000_000, // ₹1,000 crore – guards against typos
};
