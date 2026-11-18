import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cn, newId } from '../lib/id';

export type ModalState =
  | { kind: 'add' }
  | { kind: 'event'; eventId?: string }
  | { kind: 'expense'; eventId?: string; expenseId?: string }
  | { kind: 'payment'; eventId?: string; expenseId?: string; paymentId?: string }
  | { kind: 'vendor'; vendorId?: string };

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'default';
}

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface UIValue {
  modal: ModalState | null;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, tone?: ToastTone) => void;
}

const UIContext = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = newId();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => {
    setConfirmState(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setConfirmState(null);
  };

  const value = useMemo<UIValue>(
    () => ({ modal, openModal: setModal, closeModal: () => setModal(null), confirm, toast }),
    [modal, confirm, toast],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      <ConfirmDialog options={confirmState} onSettle={settle} />
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        {toasts.map((t) => {
          const Icon = t.tone === 'success' ? CircleCheck : t.tone === 'error' ? CircleAlert : Info;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-2xl bg-navy-900 px-4 py-3 text-sm text-white shadow-xl shadow-navy-950/20 ring-1 ring-white/10 dark:bg-white dark:text-navy-900"
            >
              <Icon className={cn('size-5 shrink-0', t.tone === 'success' ? 'text-emerald-400 dark:text-emerald-600' : t.tone === 'error' ? 'text-rose-400' : 'text-brand-300 dark:text-brand-600')} />
              <span className="flex-1">{t.message}</span>
              <button aria-label="Dismiss" className="rounded-lg p-1 opacity-60 hover:opacity-100" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </UIContext.Provider>
  );
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
