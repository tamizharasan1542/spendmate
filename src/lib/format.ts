const nfCache = new Map<string, Intl.NumberFormat>();

function nf(currency: string, digits: number): Intl.NumberFormat {
  const key = `${currency}:${digits}`;
  let f = nfCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
    } catch {
      f = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
    nfCache.set(key, f);
  }
  return f;
}

/** ₹1,50,000 — Indian digit grouping, paise only when present. */
export function formatMoney(n: number, currency = 'INR'): string {
  const rounded = Math.round(n * 100) / 100;
  return nf(currency, Number.isInteger(rounded) ? 0 : 2).format(rounded);
}

export function currencySymbol(currency = 'INR'): string {
  return nf(currency, 0).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency;
}

const trim1 = (v: number) => (Math.round(v * 10) / 10).toString();

/** Short form for charts: ₹1.5L, ₹12Cr, ₹8.2K */
export function formatCompact(n: number, currency = 'INR'): string {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (currency === 'INR') {
    const s = currencySymbol('INR');
    if (a >= 1e7) return `${sign}${s}${trim1(a / 1e7)}Cr`;
    if (a >= 1e5) return `${sign}${s}${trim1(a / 1e5)}L`;
    if (a >= 1e3) return `${sign}${s}${trim1(a / 1e3)}K`;
    return `${sign}${s}${Math.round(a)}`;
  }
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch {
    return formatMoney(n, currency);
  }
}

/** Parses user-entered amounts like "1,50,000", "₹ 2500.50". Returns null when invalid. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₹$€£,\s]/g, '').replace(/^[A-Za-z]+/, '');
  if (cleaned === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function amountToInput(n: number): string {
  return n ? String(Math.round(n * 100) / 100) : '';
}

// ---------- Dates (stored as YYYY-MM-DD, interpreted in local time) ----------

export function parseISODate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = () => toISODate(new Date());

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / 86_400_000);
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(parseISODate(s)) === s;
}

export function formatDate(iso: string | null | undefined, style: 'short' | 'medium' = 'medium'): string {
  if (!iso) return '—';
  const d = parseISODate(iso);
  return d.toLocaleDateString(
    'en-IN',
    style === 'short' ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

export function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function relativeDue(iso: string): string {
  const n = daysBetween(todayISO(), iso);
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n > 1) return `Due in ${n} days`;
  if (n === -1) return 'Overdue by 1 day';
  return `Overdue by ${-n} days`;
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export function monthLabel(key: string, withYear = false): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', withYear ? { month: 'short', year: 'numeric' } : { month: 'short' });
}

export function lastNMonths(n: number, from = todayISO()): string[] {
  const d = parseISODate(from);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(toISODate(new Date(d.getFullYear(), d.getMonth() - i, 1)).slice(0, 7));
  }
  return out;
}

export function monthsBetween(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  let y = fy;
  let m = fm;
  while ((y < ty || (y === ty && m <= tm)) && out.length < 240) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}
