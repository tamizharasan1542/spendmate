import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import type { Vendor } from '../../types';
import { LIMITS } from '../../data/constants';
import { newId, nowISO } from '../../lib/id';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/UIContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, TextArea, TextInput } from '../ui/Field';

type Draft = Pick<Vendor, 'name' | 'contactPerson' | 'phone' | 'email' | 'address' | 'notes'>;
type Errors = Partial<Record<keyof Draft, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

export function VendorForm({ vendorId, onClose }: { vendorId?: string; onClose: () => void }) {
  const { data, dispatch } = useStore();
  const { toast } = useUI();
  const existing = vendorId ? data.vendors.find((v) => v.id === vendorId) : undefined;
  const [d, setD] = useState<Draft>(() => existing ?? { name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' });
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Draft>(k: K, v: string) => {
    setD((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    const name = d.name.trim();
    if (!name) errs.name = 'Vendor name is required.';
    else if (name.length > LIMITS.nameMax) errs.name = 'Keep it under 100 characters.';
    else if (data.vendors.some((v) => v.id !== existing?.id && v.name.trim().toLowerCase() === name.toLowerCase())) errs.name = 'A vendor with this name already exists.';
    if (d.phone.trim() && !PHONE_RE.test(d.phone.trim())) errs.phone = 'Enter a valid phone number.';
    if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) errs.email = 'Enter a valid email address.';
    if (d.notes.length > LIMITS.notesMax) errs.notes = 'Notes are too long.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ts = nowISO();
    const clean = { name, contactPerson: d.contactPerson.trim(), phone: d.phone.trim(), email: d.email.trim(), address: d.address.trim(), notes: d.notes.trim() };
    dispatch({ type: 'vendor/upsert', vendor: existing ? { ...existing, ...clean } : { id: newId(), ...clean, createdAt: ts, updatedAt: ts } });
    toast(existing ? 'Vendor updated' : 'Vendor added');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit vendor' : 'Add vendor'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" form="vendor-form" className="flex-1" icon={Check}>
            {existing ? 'Save changes' : 'Add vendor'}
          </Button>
        </div>
      }
    >
      <form id="vendor-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Vendor name" htmlFor="v-name" required error={errors.name}>
          <TextInput id="v-name" data-autofocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Business or person" invalid={!!errors.name} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact person" htmlFor="v-person">
            <TextInput id="v-person" value={d.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
          </Field>
          <Field label="Phone number" htmlFor="v-phone" error={errors.phone}>
            <TextInput id="v-phone" type="tel" inputMode="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91" invalid={!!errors.phone} />
          </Field>
        </div>
        <Field label="Email" htmlFor="v-email" error={errors.email}>
          <TextInput id="v-email" type="email" inputMode="email" value={d.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} />
        </Field>
        <Field label="Address" htmlFor="v-address">
          <TextInput id="v-address" value={d.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Notes" htmlFor="v-notes" error={errors.notes}>
          <TextArea id="v-notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} invalid={!!errors.notes} />
        </Field>
      </form>
    </Modal>
  );
}
