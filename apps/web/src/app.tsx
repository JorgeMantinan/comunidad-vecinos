import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { Button, Spinner } from './components/ui';
import { ThemeToggle } from './components/theme-toggle';
import { usePlatformSponsorships } from './features/sponsorships/api';
import { useLogout, useSession } from './lib/auth';
import { CommunityPage } from './pages/community';
import { DashboardPage } from './pages/dashboard';
import { InvitePage } from './pages/invite';
import { LegalIndexPage, CookiesPage, PrivacyPage, RightsPage } from './pages/legal';
import { LoginPage } from './pages/login';
import { MeetingPage } from './pages/meeting';
import { PlatformPage } from './pages/platform';
import { RegisterPage } from './pages/register';
import {
  AvisosSection,
  DocumentosSection,
  EconomiaSection,
  EstadisticasSection,
  IncidenciasSection,
  MantenimientoSection,
  ParticipacionSection,
  ProfesionalesSection,
  ReunionesSection,
  TareasSection,
  VecinosSection,
} from './pages/sections';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">{children}</div>
  );
}

/** Enlace a publicidad: solo para cuentas autorizadas por la plataforma. */
function PlatformLink() {
  const platformAdmin = usePlatformSponsorships();
  if (!platformAdmin.data) {
    return null;
  }
  return (
    <Link to="/platform" className="text-sm text-primary hover:underline">
      Publicidad
    </Link>
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
    <header className="border-b border-accent-soft bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="text-lg font-bold text-primary sm:text-xl">
          Mantivecinos
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {data ? (
            <>
              <Link to="/" className="text-sm font-medium text-primary hover:underline">
                Inicio
              </Link>
              <PlatformLink />
              <span className="hidden max-w-[40vw] truncate text-sm text-muted sm:inline">
                {data.user.email}
              </span>
              <Button
                variant="ghost"
                onClick={() => {
                  logout.mutate(undefined, {
                    onSuccess: () => navigate('/login'),
                  });
                }}
              >
                <span className="sm:hidden">Salir</span>
                <span className="hidden sm:inline">Cerrar sesión</span>
              </Button>
            </>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Pie con los avisos legales (públicos, sin sesión). */
function LegalFooter() {
  return (
    <footer className="border-t border-accent-soft bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-sm text-muted">
        <span>Mantivecinos · gestión de comunidades de propietarios</span>
        <nav aria-label="Avisos legales" className="flex flex-wrap gap-4">
          <Link to="/legal/privacidad" className="hover:underline">
            Privacidad
          </Link>
          <Link to="/legal/derechos" className="hover:underline">
            Tus derechos
          </Link>
          <Link to="/legal/cookies" className="hover:underline">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
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
              path="/communities/:id/avisos"
              element={
                <RequireAuth>
                  <AvisosSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/reuniones"
              element={
                <RequireAuth>
                  <ReunionesSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/incidencias"
              element={
                <RequireAuth>
                  <IncidenciasSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/mantenimiento"
              element={
                <RequireAuth>
                  <MantenimientoSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/tareas"
              element={
                <RequireAuth>
                  <TareasSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/economia"
              element={
                <RequireAuth>
                  <EconomiaSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/documentos"
              element={
                <RequireAuth>
                  <DocumentosSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/vecinos"
              element={
                <RequireAuth>
                  <VecinosSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/participacion"
              element={
                <RequireAuth>
                  <ParticipacionSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/profesionales"
              element={
                <RequireAuth>
                  <ProfesionalesSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/estadisticas"
              element={
                <RequireAuth>
                  <EstadisticasSection />
                </RequireAuth>
              }
            />
            <Route
              path="/communities/:id/meetings/:meetingId"
              element={
                <RequireAuth>
                  <MeetingPage />
                </RequireAuth>
              }
            />
            <Route
              path="/platform"
              element={
                <RequireAuth>
                  <PlatformPage />
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
            <Route path="/legal" element={<LegalIndexPage />} />
            <Route path="/legal/privacidad" element={<PrivacyPage />} />
            <Route path="/legal/derechos" element={<RightsPage />} />
            <Route path="/legal/cookies" element={<CookiesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <LegalFooter />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
