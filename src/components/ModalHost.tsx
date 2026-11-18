import { CalendarPlus, ChevronRight, IndianRupee, ReceiptText, Store, type LucideIcon } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI, type ModalState } from '../store/UIContext';
import { Modal } from './ui/Modal';
import { EventForm } from './forms/EventForm';
import { ExpenseForm } from './forms/ExpenseForm';
import { PaymentForm } from './forms/PaymentForm';
import { VendorForm } from './forms/VendorForm';
import { cn } from '../lib/id';

function AddSheet({ onClose, open }: { onClose: () => void; open: (m: ModalState) => void }) {
  const { derived } = useStore();
  const hasEvents = derived.events.length > 0;
  const hasExpenses = derived.expenses.length > 0;
  const items: { title: string; desc: string; icon: LucideIcon; tone: string; onClick: () => void; disabled?: boolean }[] = [
    { title: 'Create event', desc: 'Wedding, construction, trip or any project', icon: CalendarPlus, tone: 'bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-300', onClick: () => open({ kind: 'event' }) },
    {
      title: 'Add expense',
      desc: hasEvents ? 'Agreed amount with optional advance' : 'Create an event first',
      icon: ReceiptText,
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
      onClick: () => open({ kind: 'expense' }),
      disabled: !hasEvents,
    },
    {
      title: 'Add payment',
      desc: hasExpenses ? 'Advance, partial or final settlement' : 'Add an expense first',
      icon: IndianRupee,
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
      onClick: () => open({ kind: 'payment' }),
      disabled: !hasExpenses,
    },
    { title: 'Add vendor', desc: 'Save contact details for reuse', icon: Store, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300', onClick: () => open({ kind: 'vendor' }) },
  ];
  return (
    <Modal open onClose={onClose} title="What would you like to add?">
      <div className="space-y-2 pb-2">
        {items.map((it, i) => (
          <button
            key={it.title}
            type="button"
            onClick={it.onClick}
            disabled={it.disabled}
            data-autofocus={i === 0 ? true : undefined}
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 active:scale-[0.99] disabled:opacity-50 dark:border-white/10 dark:hover:border-brand-400/40 dark:hover:bg-white/[0.03]"
          >
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', it.tone)}>
              <it.icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-navy-900 dark:text-white">{it.title}</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">{it.desc}</span>
            </span>
            <ChevronRight className="size-5 text-slate-300 dark:text-slate-600" />
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function ModalHost() {
  const { modal, openModal, closeModal } = useUI();
  if (!modal) return null;
  switch (modal.kind) {
    case 'add':
      return <AddSheet onClose={closeModal} open={openModal} />;
    case 'event':
      return <EventForm key={modal.eventId ?? 'new'} eventId={modal.eventId} onClose={closeModal} />;
    case 'expense':
      return <ExpenseForm key={modal.expenseId ?? 'new'} eventId={modal.eventId} expenseId={modal.expenseId} onClose={closeModal} />;
    case 'payment':
      return <PaymentForm key={modal.paymentId ?? modal.expenseId ?? 'new'} eventId={modal.eventId} expenseId={modal.expenseId} paymentId={modal.paymentId} onClose={closeModal} />;
    case 'vendor':
      return <VendorForm key={modal.vendorId ?? 'new'} vendorId={modal.vendorId} onClose={closeModal} />;
  }
}
