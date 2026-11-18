import { useId } from 'react';
import { Link } from '../../lib/router';

export function LogoMark({ className = 'size-9' }: { className?: string }) {
  const id = `sm-logo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4270f2" />
          <stop offset="1" stopColor="#1a2643" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${id})`} />
      <path d="M40.5 22.5c-1.8-2.2-4.9-3.5-8.6-3.5-5.4 0-9.2 2.9-9.2 7.1 0 9.1 18.4 5.4 18.4 12.3 0 2.8-2.9 4.6-7.2 4.6-3.9 0-7-1.4-8.9-3.9" fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M32 14v4.5M32 45.5V50" stroke="#93b4ff" strokeWidth="4.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="SpendMate home">
      <LogoMark className={compact ? 'size-8' : 'size-9'} />
      <span className="text-[17px] font-extrabold tracking-tight text-navy-900 dark:text-white">
        Spend<span className="text-brand-600 dark:text-brand-400">Mate</span>
      </span>
    </Link>
  );
}
