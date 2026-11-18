import { useState, type FormEvent } from 'react';
import { ChevronRight, Database, KeyRound, LogOut, Mail, Monitor, Moon, Phone, RotateCcw, ShieldCheck, Store, Sun, Trash2, UserRoundX } from 'lucide-react';
import type { ThemePref } from '../types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, SectionTitle, Toggle } from '../components/ui/primitives';
import { Field, SelectInput, TextInput } from '../components/ui/Field';
import { CURRENCIES } from '../data/constants';
import { createEmptyData, createSampleData } from '../data/sampleData';
import { formatDate, initials } from '../lib/format';
import { Link } from '../lib/router';
import { cn } from '../lib/id';

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ProfilePage() {
  const { data, derived, dispatch } = useStore();
  const { confirm, toast } = useUI();
  const p = data.profile;
  const [name, setName] = useState(p.fullName);
  const [nameError, setNameError] = useState('');

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setNameError('Name is required.');
    if (n.length > 80) return setNameError('Keep it under 80 characters.');
    setNameError('');
    dispatch({ type: 'profile/update', profile: { fullName: n } });
    toast('Profile updated');
  };

  const resetSample = async () => {
    if (!(await confirm({ title: 'Reload sample data?', message: 'This replaces everything on this device with the demo events, expenses and payments.', confirmLabel: 'Reload sample data' }))) return;
    dispatch({ type: 'data/replace', data: { ...createSampleData(), theme: data.theme } });
    toast('Sample data restored');
  };

  const startFresh = async () => {
    if (!(await confirm({ title: 'Start with an empty account?', message: 'All events, expenses, payments, vendors and history stored on this device will be cleared. Your profile and theme are kept.', confirmLabel: 'Clear all data' }))) return;
    dispatch({ type: 'data/replace', data: createEmptyData({ profile: data.profile, theme: data.theme, categories: data.categories }) });
    toast('All data cleared');
  };

  const phase2 = 'Available after authentication is added in Phase 2';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 bg-linear-to-br from-navy-800 to-navy-950 p-5 text-white sm:p-6">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-400 to-brand-700 text-xl font-bold shadow-lg ring-4 ring-white/10">{initials(p.fullName)}</span>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{p.fullName}</div>
            <div className="truncate text-sm text-white/70">{p.email}</div>
            <div className="mt-1 text-xs text-white/50">Member since {formatDate(p.createdAt.slice(0, 10))}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center dark:divide-white/5">
          {[
            ['Events', derived.events.length],
            ['Expenses', derived.expenses.length],
            ['Payments', derived.payments.length],
          ].map(([l, v]) => (
            <div key={l} className="py-3">
              <div className="text-lg font-bold text-navy-900 tabular dark:text-white">{v}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <SectionTitle title="Personal details" />
        <form onSubmit={saveName} className="space-y-4">
          <Field label="Full name" htmlFor="pf-name" error={nameError}>
            <div className="flex gap-2">
              <TextInput id="pf-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!nameError} autoComplete="name" />
              <Button type="submit" variant="soft" disabled={name.trim() === p.fullName}>
                Save
              </Button>
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/[0.03]">
              <Mail className="size-4 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-500">Email</div>
                <div className="truncate text-sm font-medium text-navy-900 dark:text-white">{p.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/[0.03]">
              <Phone className="size-4 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-500">Phone</div>
                <div className="truncate text-sm font-medium text-navy-900 dark:text-white">{p.phone}</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Changing email or phone requires OTP verification and arrives with authentication in Phase 2.</p>
        </form>
      </Card>

      <Card className="mt-4 p-5">
        <SectionTitle title="Preferences" />
        <Field label="Default currency" htmlFor="pf-cur" hint="Amounts are stored as entered; this changes the symbol and formatting.">
          <SelectInput id="pf-cur" value={p.currency} onChange={(e) => dispatch({ type: 'profile/update', profile: { currency: e.target.value } })}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="mt-5">
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Theme</span>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={data.theme === t.value}
                onClick={() => dispatch({ type: 'theme/set', theme: t.value })}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-sm font-medium transition',
                  data.theme === t.value ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/15 dark:border-brand-400 dark:bg-brand-400/10 dark:text-brand-200' : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300',
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <SectionTitle title="Notifications" subtitle="Preferences are saved now; in-app notifications are delivered from a later phase." />
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {(
            [
              ['dueReminders', 'Upcoming payment reminders', 'Before an expense’s due date'],
              ['budgetAlerts', 'Budget alerts', 'When an event nears or exceeds its budget'],
              ['sharedActivity', 'Shared event activity', 'Expenses or payments added by others'],
              ['invitations', 'Event invitations', 'When someone invites you to an event'],
            ] as const
          ).map(([k, label, desc]) => (
            <Toggle key={k} label={label} description={desc} checked={p.notifications[k]} onChange={(v) => dispatch({ type: 'profile/update', profile: { notifications: { ...p.notifications, [k]: v } } })} />
          ))}
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <Link to="/vendors" className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
          <Store className="size-5 text-slate-400" />
          <span className="flex-1 text-sm font-medium text-navy-900 dark:text-white">Vendors</span>
          <span className="text-xs text-slate-400">{data.vendors.length}</span>
          <ChevronRight className="size-4 text-slate-300" />
        </Link>
        {[
          { icon: ShieldCheck, label: 'Security settings' },
          { icon: KeyRound, label: 'Change email or phone' },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-3 border-t border-slate-100 px-5 py-4 opacity-60 dark:border-white/5" title={phase2}>
            <r.icon className="size-5 text-slate-400" />
            <span className="flex-1 text-sm font-medium text-navy-900 dark:text-white">{r.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/5">Phase 2</span>
          </div>
        ))}
      </Card>

      <Card className="mt-4 p-5">
        <SectionTitle title="Data on this device" subtitle="Phase 1 stores everything in this browser. Cloud sync arrives with Supabase in Phase 3." />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" icon={RotateCcw} onClick={resetSample}>
            Reload sample data
          </Button>
          <Button variant="secondary" icon={Database} onClick={startFresh}>
            Start fresh (empty)
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" icon={LogOut} disabled title={phase2}>
          Log out
        </Button>
        <Button variant="ghost" icon={UserRoundX} disabled title={phase2} className="text-rose-600 dark:text-rose-400">
          Delete account
        </Button>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <Trash2 className="size-3" /> Log out and account deletion are enabled with authentication in Phase 2.
      </p>
    </div>
  );
}
