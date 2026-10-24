import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { AppConfig } from './config';
import type { Database } from './db/client';
import type { Auth } from './lib/auth';
import type { AppEnv } from './lib/context';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { announcementRoutes } from './modules/announcements/routes';
import { assessmentRoutes } from './modules/assessments/routes';
import { auditRoutes } from './modules/audit/routes';
import { communityRoutes } from './modules/communities/routes';
import { expenseRoutes } from './modules/expenses/routes';
import { exportRoutes } from './modules/export/routes';
import { healthRoutes } from './modules/health/routes';
import { invitationRoutes } from './modules/invitations/routes';
import { invoiceRoutes } from './modules/invoices/routes';
import { meetingRoutes } from './modules/meetings/routes';
import { incidentRoutes } from './modules/incidents/routes';
import { pollRoutes } from './modules/polls/routes';
import { suggestionRoutes } from './modules/suggestions/routes';
import { taskRoutes } from './modules/tasks/routes';
import { unitRoutes } from './modules/units/routes';

export interface AppDependencies {
  db: Database;
  auth: Auth;
  config: AppConfig;
}

/**
 * Factoría de la aplicación Hono. La usan el servidor local, los tests
 * y el adaptador de Vercel, para que exista una única configuración.
 */
export function createApp({ db, auth, config }: AppDependencies): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  if (config.nodeEnv !== 'test') {
    app.use('*', logger());
  }
  app.use(
    '*',
    cors({
      origin: (origin) => (config.corsOrigins.includes(origin) ? origin : ''),
      credentials: true,
    }),
  );
  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  // Better Auth gestiona registro, inicio de sesión y sesiones.
  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  app.route('/api/health', healthRoutes());
  app.route('/api/communities', communityRoutes(db, auth));
  app.route('/api/communities', announcementRoutes(db, auth));
  app.route('/api/communities', meetingRoutes(db, auth));
  app.route('/api/communities', expenseRoutes(db, auth));
  app.route('/api/communities', invoiceRoutes(db, auth));
  app.route('/api/communities', unitRoutes(db, auth));
  app.route('/api/communities', assessmentRoutes(db, auth));
  app.route('/api/communities', incidentRoutes(db, auth));
  app.route('/api/communities', taskRoutes(db, auth));
  app.route('/api/communities', suggestionRoutes(db, auth));
  app.route('/api/communities', pollRoutes(db, auth));
  app.route('/api/communities', exportRoutes(db, auth));
  app.route('/api/communities', auditRoutes(db, auth));
  app.route('/api', invitationRoutes(db, auth));

  return app;
}
