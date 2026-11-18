import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/id';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

let openCount = 0;

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    openCount++;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current;
      target?.focus();
    }, 50);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      openCount--;
      if (openCount === 0) document.body.style.overflow = '';
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-navy-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-slide-up flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl outline-none sm:animate-pop sm:rounded-3xl dark:bg-navy-900 dark:ring-1 dark:ring-white/10',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden dark:bg-white/15" aria-hidden />
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-3 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-lg font-bold tracking-tight text-navy-900 dark:text-white">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900 dark:hover:bg-white/5 dark:hover:text-white">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">{children}</div>
        {footer && <div className="safe-bottom shrink-0 border-t border-slate-100 bg-white/95 px-5 py-3 sm:px-6 dark:border-white/5 dark:bg-navy-900/95">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
