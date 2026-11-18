import { useEffect } from 'react';
import { Compass } from 'lucide-react';
import { StoreProvider } from './store/AppStore';
import { UIProvider } from './store/UIContext';
import { AppShell, ThemeSync } from './components/layout/AppShell';
import { ModalHost } from './components/ModalHost';
import { matchRoute, navigate, useRoutePath } from './lib/router';
import { Dashboard } from './pages/Dashboard';
import { EventsPage } from './pages/Events';
import { EventDetail } from './pages/EventDetail';
import { ExpenseDetail } from './pages/ExpenseDetail';
import { Reports } from './pages/Reports';
import { VendorsPage } from './pages/Vendors';
import { ProfilePage } from './pages/Profile';
import { Card, EmptyState } from './components/ui/primitives';
import { Button } from './components/ui/Button';

function Routes() {
  const path = useRoutePath();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [path]);

  let page;
  let m: Record<string, string> | null;
  if (path === '/') page = <Dashboard />;
  else if (path === '/events') page = <EventsPage />;
  else if ((m = matchRoute('/events/:id', path))) page = <EventDetail id={m.id} />;
  else if ((m = matchRoute('/expenses/:id', path))) page = <ExpenseDetail id={m.id} />;
  else if (path === '/reports') page = <Reports />;
  else if (path === '/vendors') page = <VendorsPage />;
  else if (path === '/profile') page = <ProfilePage />;
  else
    page = (
      <Card className="mt-6">
        <EmptyState icon={Compass} title="Page not found" message="That page doesn’t exist." action={<Button onClick={() => navigate('/')}>Go home</Button>} />
      </Card>
    );

  return (
    <div key={path} className="animate-fade-in">
      {page}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <UIProvider>
        <ThemeSync />
        <AppShell>
          <Routes />
        </AppShell>
        <ModalHost />
      </UIProvider>
    </StoreProvider>
  );
}
