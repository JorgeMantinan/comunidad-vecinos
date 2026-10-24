import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Button, Spinner } from './components/ui';
import { useLogout, useSession } from './lib/auth';
import { CommunityPage } from './pages/community';
import { DashboardPage } from './pages/dashboard';
import { InvitePage } from './pages/invite';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {children}
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isLoading } = useSession();
  if (isLoading) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  }
  if (!data) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Header() {
  const { data } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <header className="border-b border-accent-soft bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-primary">
          Mantivecinos
        </Link>
        {data ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600">{data.user.email}</span>
            <Button
              variant="ghost"
              onClick={() => {
                logout.mutate(undefined, {
                  onSuccess: () => navigate('/login'),
                });
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id"
              element={
                <RequireAuth>
                  <CommunityPage />
                </RequireAuth>
              }
            />
            <Route
              path="/invite/:token"
              element={
                <RequireAuth>
                  <InvitePage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
