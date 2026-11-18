import { useMemo, useState } from 'react';
import { Mail, MapPin, Pencil, Phone, Search, Store, UserPlus } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, IconButton } from '../components/ui/Button';
import { Card, EmptyState, ProgressBar } from '../components/ui/primitives';
import { toPaise } from '../lib/calc';
import { Link } from '../lib/router';

export function VendorsPage() {
  const { data, derived, money } = useStore();
  const { openModal } = useUI();
  const [q, setQ] = useState('');

  const stats = useMemo(() => {
    const m = new Map<string, { agreed: number; paid: number; count: number; expenseIds: string[] }>();
    for (const x of derived.expenses) {
      if (!x.vendorId) continue;
      const s = derived.expenseSummary.get(x.id)!;
      const r = m.get(x.vendorId) ?? { agreed: 0, paid: 0, count: 0, expenseIds: [] };
      r.agreed += toPaise(x.agreedAmount);
      r.paid += toPaise(s.paid);
      r.count++;
      r.expenseIds.push(x.id);
      m.set(x.vendorId, r);
    }
    return m;
  }, [derived]);

  const list = data.vendors
    .filter((v) => {
      const s = q.trim().toLowerCase();
      return !s || v.name.toLowerCase().includes(s) || v.contactPerson.toLowerCase().includes(s) || v.phone.includes(s);
    })
    .sort((a, b) => (stats.get(b.id)?.agreed ?? 0) - (stats.get(a.id)?.agreed ?? 0) || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="People and businesses you pay, with their linked expenses"
        actions={
          <Button icon={UserPlus} onClick={() => openModal({ kind: 'vendor' })}>
            Add vendor
          </Button>
        }
      />
      {data.vendors.length === 0 ? (
        <Card>
          <EmptyState icon={Store} title="No vendors yet" message="Vendors are saved automatically when you add an expense with a vendor name, or you can add one here." />
        </Card>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search vendors"
              aria-label="Search vendors"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[15px] placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-navy-900/70 dark:text-white"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((v) => {
              const s = stats.get(v.id);
              const agreed = (s?.agreed ?? 0) / 100;
              const paid = (s?.paid ?? 0) / 100;
              return (
                <Card key={v.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300">
                      <Store className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-navy-900 dark:text-white">{v.name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {v.contactPerson && <span>{v.contactPerson}</span>}
                        {v.phone && (
                          <a href={`tel:${v.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 hover:text-brand-600">
                            <Phone className="size-3" /> {v.phone}
                          </a>
                        )}
                        {v.email && (
                          <a href={`mailto:${v.email}`} className="inline-flex items-center gap-1 hover:text-brand-600">
                            <Mail className="size-3" /> {v.email}
                          </a>
                        )}
                        {v.address && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" /> {v.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <IconButton icon={Pencil} label={`Edit ${v.name}`} className="size-8" onClick={() => openModal({ kind: 'vendor', vendorId: v.id })} />
                  </div>
                  {s ? (
                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {s.count} {s.count === 1 ? 'expense' : 'expenses'} · <span className="text-emerald-600 dark:text-emerald-400">{money(paid)} paid</span>
                        </span>
                        <span className="font-semibold text-navy-900 tabular dark:text-white">{money(agreed)}</span>
                      </div>
                      <ProgressBar value={agreed ? paid / agreed : 0} size="sm" barClassName="bg-emerald-500" label={`${v.name} paid`} />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.expenseIds.slice(0, 3).map((xid) => (
                          <Link key={xid} to={`/expenses/${xid}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-white/5 dark:text-slate-300">
                            {derived.expenseById.get(xid)?.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">No linked expenses yet.</p>
                  )}
                </Card>
              );
            })}
          </div>
          {list.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No vendors match “{q}”.</p>}
        </>
      )}
    </div>
  );
}
