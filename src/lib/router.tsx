import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

// Minimal hash router: no server rewrites needed on static hosting (Vercel, Netlify, GitHub Pages).

function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}

export function useRoutePath(): string {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export function navigate(to: string, opts?: { replace?: boolean }) {
  if (opts?.replace) {
    stack[stack.length - 1] = to;
    window.history.replaceState(null, '', `#${to}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = to;
  }
}

// In-memory history so the in-app "Back" button never leaves the app when a page was opened directly.
const stack: string[] = [currentPath()];
window.addEventListener('hashchange', () => {
  const p = currentPath();
  if (stack.length > 1 && stack[stack.length - 2] === p) stack.pop(); // back (in-app or browser)
  else if (stack[stack.length - 1] !== p) stack.push(p);
});

export function goBack(fallback: string) {
  if (stack.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}

/** match('/events/:id', '/events/abc') → { id: 'abc' } */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('?')[0].split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, ...rest }: LinkProps) {
  return (
    <a href={`#${to}`} {...rest}>
      {children}
    </a>
  );
}
