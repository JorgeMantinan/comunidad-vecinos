import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

/**
 * Avisos legales de la aplicación. Son públicos (no piden sesión) y su
 * texto procede de `docs/legal/`: todo cambio de fondo obliga a subir
 * la versión y a firmarla según `docs/legal/control-firmas-y-marca-temporal.md`.
 */

const contactEmail = import.meta.env.VITE_LEGAL_CONTACT_EMAIL;

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <Link to="/legal" className="text-lg font-medium text-primary">
        ← Volver a avisos legales
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted">Versión 1.0 · octubre de 2026</p>
      </header>
      {children}
    </div>
  );
}

function ContactLine() {
  if (!contactEmail) {
    return null;
  }
  return (
    <p>
      Para cualquier consulta sobre tus datos escribe a{' '}
      <a className="font-medium text-primary underline" href={`mailto:${contactEmail}`}>
        {contactEmail}
      </a>
      .
    </p>
  );
}

export function LegalIndexPage() {
  const entries = [
    {
      to: '/legal/privacidad',
      title: 'Política de privacidad',
      subtitle: 'Qué datos guardamos, para qué y con quién se comparten',
    },
    {
      to: '/legal/derechos',
      title: 'Tus derechos',
      subtitle: 'Acceso, rectificación, borrado, oposición y portabilidad',
    },
    {
      to: '/legal/cookies',
      title: 'Cookies',
      subtitle: 'Solo la cookie de sesión: sin rastreo ni publicidad',
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Avisos legales</h1>
        <p className="text-sm text-muted">
          Información clara sobre tus datos y cómo ejercer tus derechos.
        </p>
      </header>
      <nav aria-label="Avisos legales" className="grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className="rounded-2xl border border-accent bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <span className="block text-xl font-bold text-primary">{entry.title}</span>
            <span className="mt-1 block text-sm text-muted">{entry.subtitle}</span>
          </Link>
        ))}
      </nav>
      <ContactLine />
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de privacidad">
      <Card title="Quién trata tus datos">
        <p className="text-sm leading-6 text-body">
          La plataforma Mantivecinos trata los datos de tu cuenta (nombre, correo
          electrónico y contraseña cifrada) y los datos de gestión de tu comunidad:
          miembros, reuniones, actas, gastos, cuotas, incidencias y los documentos que
          sube la administración.
        </p>
      </Card>

      <Card title="Para qué los usamos">
        <p className="text-sm leading-6 text-body">
          Solo para gestionar la comunidad que te invita: mantener tu acceso, mostrarte
          la información a la que tienes permiso y dejar constancia de las acciones
          importantes (registro de actividad).
        </p>
        <p className="mt-2 text-sm leading-6 text-body">
          <strong>
            No hay perfiles automáticos ni decisiones tomadas por ordenador sobre ti
          </strong>
          , y la plataforma no utiliza inteligencia artificial.
        </p>
      </Card>

      <Card title="Con quién se comparte">
        <p className="text-sm leading-6 text-body">
          Solo con los proveedores que prestan el servicio (alojamiento, base de datos,
          almacenamiento de archivos y envío de correos transaccionales), y siempre con
          la información mínima necesaria. No se venden datos ni se comparten con
          anunciantes: la publicación de anuncios no da acceso a quién eres ni a lo que
          ocurre en tu comunidad.
        </p>
      </Card>

      <Card title="Cuánto tiempo se guardan">
        <ul className="list-inside list-disc space-y-1 text-sm text-body">
          <li>Tu cuenta: mientras la tengas activa.</li>
          <li>Registros económicos y actas: por obligación legal.</li>
          <li>Registro de actividad: 24 meses.</li>
          <li>Copias de seguridad: 30 días.</li>
        </ul>
      </Card>

      <Card title="Seguridad">
        <p className="text-sm leading-6 text-body">
          Todo viaja cifrado (HTTPS), las contraseñas se guardan con hash, cada
          comunidad está aislada de las demás y solo se accede a los documentos con un
          enlace firmado de pocos minutos. Hay copias de seguridad diarias.
        </p>
      </Card>

      <Card title="Contacto">
        <ContactLine />
        <p className="mt-2 text-sm text-muted">
          Puedes descargar o borrar tus datos desde{' '}
          <Link to="/" className="font-medium text-primary underline">
            tu panel
          </Link>{' '}
          (sección «Tu cuenta y tus datos»). Los detalles de cómo atendemos cada
          solicitud están en{' '}
          <Link to="/legal/derechos" className="font-medium text-primary underline">
            tus derechos
          </Link>
          .
        </p>
      </Card>
    </LegalLayout>
  );
}

export function RightsPage() {
  return (
    <LegalLayout title="Tus derechos">
      <Card title="Qué puedes pedir">
        <ul className="list-inside list-disc space-y-1 text-sm text-body">
          <li>
            <strong>Acceso</strong>: copia de los datos que tenemos sobre ti.
          </li>
          <li>
            <strong>Rectificación</strong>: corregir lo que esté mal.
          </li>
          <li>
            <strong>Supresión</strong>: borrado de tu cuenta y de tus datos, con las
            excepciones legales.
          </li>
          <li>
            <strong>Oposición</strong>: que dejemos de tratar tus datos en determinados
            casos.
          </li>
          <li>
            <strong>Limitación</strong>: marcar tus datos «en revisión» mientras se
            resuelve una reclamación.
          </li>
          <li>
            <strong>Portabilidad</strong>: recibir tus datos en un fichero para
            llevártelos.
          </li>
        </ul>
      </Card>

      <Card title="Cómo pedirlo">
        <p className="text-sm leading-6 text-body">
          Escríbenos indicando qué derecho quieres ejercer. Te confirmamos la recepción
          en pocos días y respondemos en el plazo de un mes (ampliable en casos
          complejos, siempre avisándote).
        </p>
        <div className="mt-2">
          <ContactLine />
        </div>
        <p className="mt-2 text-sm text-muted">
          También puedes descargar tus datos al momento desde tu panel («Descargar mis
          datos»).
        </p>
      </Card>

      <Card title="Si no quedas conforme">
        <p className="text-sm leading-6 text-body">
          Puedes reclamar ante la Agencia Española de Protección de Datos: C/ Jorge Juan
          6, 28001 Madrid ·{' '}
          <a
            className="font-medium text-primary underline"
            href="https://www.aepd.es"
            target="_blank"
            rel="noreferrer"
          >
            www.aepd.es
          </a>
          .
        </p>
      </Card>
    </LegalLayout>
  );
}

export function CookiesPage() {
  return (
    <LegalLayout title="Cookies">
      <Card title="Solo la cookie de sesión">
        <p className="text-sm leading-6 text-body">
          La aplicación usa una única cookie: la de sesión, que sirve para mantenerte
          identificado mientras navegas. Es técnica y imprescindible; sin ella tendrías
          que escribir tu contraseña en cada pantalla.
        </p>
      </Card>

      <Card title="Lo que NO usamos">
        <ul className="list-inside list-disc space-y-1 text-sm text-body">
          <li>Ni cookies de análisis o estadísticas.</li>
          <li>Ni cookies de publicidad conductual.</li>
          <li>Ni cookies de terceros para rastrearte por internet.</li>
        </ul>
      </Card>

      <Card title="Si la bloqueas">
        <p className="text-sm leading-6 text-body">
          Puedes eliminarla desde la configuración de tu navegador. Al hacerlo se cierra
          la sesión y tendrás que volver a entrar con tu correo y tu contraseña; el
          resto de la aplicación sigue funcionando.
        </p>
      </Card>
    </LegalLayout>
  );
}
