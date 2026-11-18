import { TriangleAlert } from 'lucide-react';
import type { ConfirmOptions } from '../../store/UIContext';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({ options, onSettle }: { options: ConfirmOptions | null; onSettle: (v: boolean) => void }) {
  const danger = options?.tone !== 'default';
  return (
    <Modal
      open={!!options}
      onClose={() => onSettle(false)}
      title={options?.title ?? ''}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => onSettle(false)} data-autofocus>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} block onClick={() => onSettle(true)}>
            {options?.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">
            <TriangleAlert className="size-5" />
          </span>
        )}
        <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{options?.message}</div>
      </div>
    </Modal>
  );
}
