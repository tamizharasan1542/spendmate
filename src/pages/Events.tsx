import { useMemo, useState } from 'react';
import { CalendarPlus, CalendarX2, Search } from 'lucide-react';
import type { EventStatus } from '../types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/UIContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, EmptyState, Segmented } from '../components/ui/primitives';
import { EventCard } from '../components/domain';
import { EVENT_STATUSES } from '../data/constants';

type Filter = 'all' | EventStatus;
type Sort = 'recent' | 'date' | 'amount' | 'pending';

export function EventsPage() {
  const { derived, money } = useStore();
  const { openModal } = useUI();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, planning: 0, active: 0, completed: 0, archived: 0 };
    for (const e of derived.events) {
      c[e.status]++;
      if (e.status !== 'archived') c.all++;
    }
    return c;
  }, [derived.events]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = derived.events.filter(
      (e) => (filter === 'all' ? e.status !== 'archived' : e.status === filter) && (!q || e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.location.toLowerCase().includes(q)),
    );
    const sum = (id: string) => derived.eventSummary.get(id)!;
    switch (sort) {
      case 'date':
        out.sort((a, b) => (a.eventDate ?? '9999').localeCompare(b.eventDate ?? '9999'));
        break;
      case 'amount':
        out.sort((a, b) => sum(b.id).totalExpense - sum(a.id).totalExpense);
        break;
      case 'pending':
        out.sort((a, b) => sum(b.id).outstanding - sum(a.id).outstanding);
        break;
      default:
        break;
    }
    return out;
  }, [derived, filter, query, sort]);

  const options = [{ value: 'all' as Filter, label: 'All', count: counts.all }, ...EVENT_STATUSES.map((s) => ({ value: s.value as Filter, label: s.label, count: counts[s.value] }))];

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle={`${counts.all} events · ${money(derived.totals.pending)} pending overall`}
        actions={
          <Button icon={CalendarPlus} onClick={() => openModal({ kind: 'event' })}>
            New event
          </Button>
        }
      />

      {derived.events.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarPlus}
            title="No events yet"
            message="Create an event for a wedding, home construction, a trip or any project to start tracking its expenses."
            action={
              <Button icon={CalendarPlus} onClick={() => openModal({ kind: 'event' })}>
                Create event
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events"
                aria-label="Search events"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[15px] placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-navy-900/70 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Segmented options={options} value={filter} onChange={setFilter} ariaLabel="Filter by status" className="flex-1 lg:flex-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Sort events"
                className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-600 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-navy-900 dark:text-slate-300"
              >
                <option value="recent">Recent</option>
                <option value="date">Event date</option>
                <option value="amount">Highest spend</option>
                <option value="pending">Most pending</option>
              </select>
            </div>
          </div>

          {list.length === 0 ? (
            <Card>
              <EmptyState icon={CalendarX2} title="No matching events" message={query ? `Nothing matches “${query}”.` : 'No events with this status.'} />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
