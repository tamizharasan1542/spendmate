import type { AppData, CoverKey, EventStatus, EventType, Expense, Payment, PaymentKind, PaymentMethod, SMEvent, Vendor } from '../types';
import { DEFAULT_CATEGORIES } from './constants';
import { addDays, parseISODate, todayISO } from '../lib/format';

// Sample data uses dates relative to today so "upcoming" and "overdue" always look realistic.

const OWNER = 'Rahul Sharma';
const SPOUSE = 'Meera Sharma';

export function defaultProfile(createdAt: string) {
  return {
    fullName: OWNER,
    email: 'rahul.sharma@example.com',
    phone: '+91 98765 43210',
    createdAt,
    currency: 'INR',
    notifications: { dueReminders: true, sharedActivity: true, budgetAlerts: true, invitations: true },
  };
}

export function createEmptyData(keep?: Pick<AppData, 'profile' | 'theme' | 'categories'>): AppData {
  return {
    version: 1,
    events: [],
    expenses: [],
    payments: [],
    categories: keep?.categories ?? DEFAULT_CATEGORIES,
    vendors: [],
    auditLogs: [],
    profile: keep?.profile ?? defaultProfile(new Date().toISOString()),
    theme: keep?.theme ?? 'system',
  };
}

export function createSampleData(): AppData {
  const T = todayISO();
  const d = (n: number) => addDays(T, n);
  const ts = (n: number) => new Date(parseISODate(d(n)).getTime() + 10.5 * 3_600_000).toISOString();

  const vendors: Vendor[] = [];
  const vendor = (id: string, name: string, phone: string, contactPerson = '', email = '', address = ''): string => {
    vendors.push({ id, name, phone, contactPerson, email, address, notes: '', createdAt: ts(-200), updatedAt: ts(-200) });
    return id;
  };

  const events: SMEvent[] = [];
  const event = (
    id: string,
    name: string,
    type: EventType,
    status: EventStatus,
    cover: CoverKey,
    budget: number,
    start: number,
    end: number,
    eventDay: number,
    location: string,
    description: string,
  ) => {
    events.push({
      id,
      name,
      type,
      status,
      cover,
      budget,
      startDate: d(start),
      endDate: d(end),
      eventDate: d(eventDay),
      location,
      description,
      createdBy: OWNER,
      createdAt: ts(start),
      updatedAt: ts(start),
      deletedAt: null,
    });
  };

  const expenses: Expense[] = [];
  const payments: Payment[] = [];
  let pc = 0;
  const expense = (
    id: string,
    eventId: string,
    name: string,
    categoryId: string,
    vendorId: string | null,
    agreed: number,
    created: number,
    due: number | null,
    pays: [amount: number, day: number, method: PaymentMethod, kind: PaymentKind, ref?: string, by?: string][],
    notes = '',
    by = OWNER,
  ) => {
    const v = vendors.find((x) => x.id === vendorId);
    expenses.push({
      id,
      eventId,
      name,
      categoryId,
      vendorId,
      vendorName: v?.name ?? '',
      vendorPhone: v?.phone ?? '',
      agreedAmount: agreed,
      expenseDate: d(created),
      dueDate: due === null ? null : d(due),
      notes,
      createdBy: by,
      createdAt: ts(created),
      updatedAt: ts(created),
      deletedAt: null,
    });
    for (const [amount, day, method, kind, ref, pBy] of pays) {
      pc++;
      payments.push({
        id: `pay-${String(pc).padStart(3, '0')}`,
        expenseId: id,
        amount,
        date: d(day),
        method,
        kind,
        reference: ref ?? '',
        notes: '',
        createdBy: pBy ?? by,
        createdAt: ts(day),
        updatedAt: ts(day),
        deletedAt: null,
      });
    }
  };

  // Vendors
  const hall = vendor('ven-hall', 'Royal Palace Convention Hall', '+91 98450 11223', 'Mr. Venkatesh', 'bookings@royalpalace.example', 'Jayanagar, Bengaluru');
  const caterer = vendor('ven-caterer', 'Annapurna Caterers', '+91 99000 45678', 'Suresh Rao');
  const photo = vendor('ven-photo', 'Pixel Stories Studio', '+91 97411 22334', 'Ananya', 'hello@pixelstories.example');
  const decor = vendor('ven-decor', 'Bloom & Petal Decor', '+91 90080 77665');
  const jeweller = vendor('ven-jewel', 'Lakshmi Jewellers', '+91 80 2650 1122');
  const printer = vendor('ven-print', 'Paper Lane Prints', '+91 98860 33445');
  const silks = vendor('ven-silks', 'Kanchi Silk House', '+91 94480 55667');
  const builders = vendor('ven-build', 'Shree Builders Supply', '+91 99860 12121', 'Mahesh', '', 'Hoskote Road, Bengaluru');
  const mason = vendor('ven-mason', 'Ramesh & Team (Masonry)', '+91 96320 88990', 'Ramesh');
  const volt = vendor('ven-volt', 'Volt Electricals', '+91 98444 31313');
  const aqua = vendor('ven-aqua', 'AquaFlow Plumbing', '+91 97390 45454');
  const resort = vendor('ven-resort', 'Seaside Palms Resort', '+91 832 245 6789', '', 'stay@seasidepalms.example', 'Candolim, Goa');
  const party = vendor('ven-party', 'Funzone Party Hall', '+91 90360 12345');
  const bakery = vendor('ven-bakery', 'Sweet Crumbs Bakery', '+91 99168 67676');

  // 1. Wedding
  event('evt-wedding', "Priya & Arjun's Wedding", 'Marriage', 'active', 'rose', 1_200_000, -120, 40, 38, 'Bengaluru, Karnataka', 'Two-day wedding with reception. Guests: ~600.');
  expense('exp-hall', 'evt-wedding', 'Marriage Hall', 'cat-venue', hall, 150_000, -110, 30, [
    [50_000, -110, 'bank_transfer', 'advance', 'NEFT 7781230'],
    [25_000, -75, 'upi', 'partial', 'UPI 4451…92'],
    [50_000, -40, 'bank_transfer', 'partial', 'NEFT 7799018', SPOUSE],
    [25_000, -8, 'upi', 'final', 'UPI 4459…10'],
  ], 'Includes AC, dining hall and parking for 150 cars.');
  expense('exp-catering', 'evt-wedding', 'Catering – 2 days', 'cat-food', caterer, 320_000, -60, 3, [[100_000, -60, 'bank_transfer', 'advance', 'IMPS 220019']], '₹520 per plate, 600 guests. Final count due 1 week before.');
  expense('exp-photo', 'evt-wedding', 'Photography & Video', 'cat-photography', photo, 85_000, -50, 14, [[25_000, -50, 'upi', 'advance']], '', SPOUSE);
  expense('exp-decor', 'evt-wedding', 'Stage & Hall Decoration', 'cat-decoration', decor, 110_000, -12, 5, []);
  expense('exp-jewel', 'evt-wedding', 'Bridal Jewellery', 'cat-jewellery', jeweller, 450_000, -90, null, [
    [300_000, -90, 'bank_transfer', 'advance', 'RTGS 00918'],
    [150_000, -30, 'bank_transfer', 'final', 'RTGS 01177'],
  ]);
  expense('exp-invite', 'evt-wedding', 'Invitation Cards (800 nos.)', 'cat-invitation', printer, 18_000, -70, null, [
    [10_000, -70, 'cash', 'advance'],
    [9_500, -45, 'upi', 'final', '', SPOUSE],
  ], 'Paid ₹1,500 extra for urgent re-print; to be adjusted.');
  expense('exp-attire', 'evt-wedding', 'Wedding Attire', 'cat-clothing', silks, 120_000, -25, -2, [[60_000, -20, 'debit_card', 'advance']], '', SPOUSE);

  // 2. House construction
  event('evt-house', 'Dream Home – Ground Floor', 'House Construction', 'active', 'amber', 2_500_000, -200, 160, 160, 'Whitefield, Bengaluru', 'G+1 independent house, ground floor phase.');
  expense('exp-cement', 'evt-house', 'Cement & Steel', 'cat-construction', builders, 680_000, -190, 10, [
    [200_000, -190, 'bank_transfer', 'advance', 'NEFT 551203'],
    [200_000, -130, 'bank_transfer', 'partial', 'NEFT 551877'],
  ]);
  expense('exp-labour', 'evt-house', 'Masonry Labour Contract', 'cat-labour', mason, 360_000, -185, 7, [
    [60_000, -180, 'cash', 'advance'],
    [60_000, -150, 'cash', 'partial'],
    [60_000, -120, 'upi', 'partial'],
    [60_000, -90, 'upi', 'partial'],
  ], 'Weekly progress-linked payments.');
  expense('exp-electrical', 'evt-house', 'Electrical Wiring', 'cat-electrical', volt, 140_000, -40, 21, [[50_000, -35, 'upi', 'advance']]);
  expense('exp-plumbing', 'evt-house', 'Plumbing Work', 'cat-plumbing', aqua, 95_000, -15, 12, []);
  expense('exp-transport', 'evt-house', 'Material Transport', 'cat-transport', null, 28_000, -105, null, [[28_000, -100, 'cash', 'final']]);

  // 3. Completed trip (slightly over budget)
  event('evt-goa', 'Goa Family Trip', 'Travel', 'completed', 'sky', 120_000, -165, -154, -160, 'North Goa', '6 days, 4 adults + 2 kids.');
  expense('exp-flights', 'evt-goa', 'Flights (6 pax)', 'cat-travel', null, 48_600, -200, null, [[48_600, -200, 'credit_card', 'final', 'PNR K7Q2ZX']]);
  expense('exp-resort', 'evt-goa', 'Resort Stay – 5 nights', 'cat-travel', resort, 52_000, -190, null, [
    [20_000, -190, 'upi', 'advance'],
    [32_000, -155, 'credit_card', 'final'],
  ]);
  expense('exp-cab', 'evt-goa', 'Local Cabs', 'cat-transport', null, 9_500, -160, null, [[9_500, -156, 'cash', 'final']]);
  expense('exp-dining', 'evt-goa', 'Food & Dining', 'cat-food', null, 14_200, -160, null, [[14_200, -155, 'debit_card', 'final']]);

  // 4. Upcoming birthday (planning)
  event('evt-bday', "Aarav's 5th Birthday", 'Birthday', 'planning', 'sky', 60_000, -10, 24, 24, 'HSR Layout, Bengaluru', 'Theme party for 40 kids.');
  expense('exp-party-hall', 'evt-bday', 'Party Hall', 'cat-venue', party, 20_000, -8, 20, [[5_000, -6, 'upi', 'advance']]);
  expense('exp-cake', 'evt-bday', 'Cake & Snacks', 'cat-food', bakery, 14_000, -3, 23, []);
  expense('exp-gifts', 'evt-bday', 'Return Gifts', 'cat-shopping', null, 8_000, -2, null, [], '', SPOUSE);

  return {
    version: 1,
    events,
    expenses,
    payments,
    categories: DEFAULT_CATEGORIES,
    vendors,
    auditLogs: [],
    profile: defaultProfile(ts(-240)),
    theme: 'system',
  };
}
