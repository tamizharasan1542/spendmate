import { useEffect, type ReactNode } from 'react';
import { CalendarDays, ChartPie, CircleUser, House, Moon, Plus, Store, Sun, type LucideIcon } from 'lucide-react';
import { Link, useRoutePath } from '../../lib/router';
import { cn } from '../../lib/id';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import { initials } from '../../lib/format';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: ChartPie },
  { to: '/profile', label: 'Profile', icon: CircleUser },
];

const SECONDARY: NavItem[] = [{ to: '/vendors', label: 'Vendors', icon: Store }];

function isActive(path: string, to: string): boolean {
  if (to === '/') return path === '/';
  if (to === '/events') return path.startsWith('/events') || path.startsWith('/expenses');
  return path.startsWith(to);
}

export function useResolvedDark(): boolean {
  const { data } = useStore();
  if (data.theme === 'system') return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return data.theme === 'dark';
}

/** Keeps the <html> class and theme-color meta in sync with the preference. */
export function ThemeSync() {
  const { data } = useStore();
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = data.theme === 'dark' || (data.theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a1022' : '#f8fafc');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [data.theme]);
  return null;
}

function ThemeButton({ className }: { className?: string }) {
  const { dispatch } = useStore();
  const dark = useResolvedDark();
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'theme/set', theme: dark ? 'light' : 'dark' })}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn('grid size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white', className)}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

function Sidebar({ path, onAdd }: { path: string; onAdd: () => void }) {
  const { data } = useStore();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/70 bg-white/80 px-4 py-6 backdrop-blur-xl lg:flex dark:border-white/5 dark:bg-navy-950/80">
      <div className="px-2">
        <Logo />
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-8 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98] dark:bg-brand-500 dark:shadow-brand-500/10"
      >
        <Plus className="size-[18px]" /> Add new
      </button>
      <nav className="mt-6 flex-1 space-y-1" aria-label="Main">
        {[...PRIMARY, ...SECONDARY].map((item) => {
          const active = isActive(path, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active ? 'bg-navy-900 text-white shadow-sm dark:bg-white/10' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white',
              )}
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 p-3 dark:border-white/5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-500 to-navy-800 text-xs font-bold text-white">{initials(data.profile.fullName)}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-navy-900 dark:text-white">{data.profile.fullName}</div>
          <div className="truncate text-xs text-slate-500">{data.profile.email}</div>
        </div>
        <ThemeButton className="size-9" />
      </div>
    </aside>
  );
}

function BottomNav({ path, onAdd }: { path: string; onAdd: () => void }) {
  const item = (n: NavItem) => {
    const active = isActive(path, n.to);
    return (
      <Link
        key={n.to}
        to={n.to}
        aria-current={active ? 'page' : undefined}
        className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition', active ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400 dark:text-slate-500')}
      >
        <span className={cn('grid h-7 w-12 place-items-center rounded-full transition', active && 'bg-brand-50 dark:bg-brand-400/10')}>
          <n.icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
        </span>
        {n.label}
      </Link>
    );
  };
  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 backdrop-blur-xl lg:hidden dark:border-white/5 dark:bg-navy-950/90">
      <div className="mx-auto flex max-w-md items-end px-2">
        {item(PRIMARY[0])}
        {item(PRIMARY[1])}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add new"
            className="-mt-5 grid size-14 place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30 ring-4 ring-slate-50 transition active:scale-95 dark:ring-navy-950"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
        </div>
        {item(PRIMARY[2])}
        {item(PRIMARY[3])}
      </div>
    </nav>
  );
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-transparent bg-slate-50/80 px-4 backdrop-blur-xl lg:hidden dark:bg-navy-950/80">
      <Logo compact />
      <div className="flex items-center">
        <Link to="/vendors" aria-label="Vendors" className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
          <Store className="size-5" />
        </Link>
        <ThemeButton />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRoutePath();
  const { openModal } = useUI();
  const onAdd = () => openModal({ kind: 'add' });
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar path={path} onAdd={onAdd} />
      <div className="lg:pl-64">
        <MobileTopBar />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-32 pt-3 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>
      <BottomNav path={path} onAdd={onAdd} />
    </div>
  );
}
