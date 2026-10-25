import { createHash, randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { inArray, like } from 'drizzle-orm';
import type {
  AgreementStatus,
  AssetCategory,
  AssetStatus,
  CommunityRole,
  ContractStatus,
  DocumentCategory,
  ExpenseCategory,
  ExpenseStatus,
  IncidentStatus,
  MeetingStatus,
  PollStatus,
  SuggestionStatus,
  TaskRecurrence,
  TaskStatus,
} from '@comunidad/shared';
import { loadConfig } from '../config';
import { createBlobStorage, isStorageConfigured } from '../lib/storage';
import { newId } from '../lib/ids';
import type { Database } from './client';
import { createDatabase } from './client';
import { createLocalDatabase } from './local';
import { runMigrations } from './migrate';
import {
  account,
  agreements,
  announcements,
  assessmentCharges,
  assessments,
  auditEvents,
  assets,
  communities,
  communityMemberships,
  documentTemplates,
  documents,
  expenses,
  incidents,
  invitations,
  invoices,
  maintenanceContracts,
  meetingAgendaItems,
  meetings,
  pollOptions,
  pollVotes,
  polls,
  professionals,
  sponsorships,
  sponsorshipCommunities,
  suggestions,
  tasks,
  units,
  user,
} from './schema';

/**
 * Datos de demostración completos: varias comunidades con la información
 * típica (gastos, cuotas, reuniones, actas, incidencias, profesionales,
 * contratos, documentos…) para poder revisar cómo se ven los paneles.
 *
 * Jamás se usan datos reales de vecinos: todo es ficticio.
 *
 *   pnpm --filter @comunidad/api db:seed:demo           # carga
 *   pnpm --filter @comunidad/api db:seed:demo -- --clean # elimina
 *
 * Credenciales: email indicado y contraseña `Vecino1234!`.
 */
const DEMO_PASSWORD = 'Vecino1234!';
const DEMO_DOMAIN = 'demo.local';
const DAY_MS = 86_400_000;
const NOW = Date.now();

const day = (offset: number): string =>
  new Date(NOW + offset * DAY_MS).toISOString().slice(0, 10);
const at = (offset: number): Date => new Date(NOW + offset * DAY_MS);
const cents = (amount: string): number => Math.round(Number(amount) * 100);
const money = (value: number): string => (value / 100).toFixed(2);

/* ------------------------------------------------------------------ */
/*  Usuarios                                                           */
/* ------------------------------------------------------------------ */

const userSpecs = [
  { key: 'elena', name: 'Elena Presidenta', email: `elena.presidenta@${DEMO_DOMAIN}` },
  {
    key: 'ana',
    name: 'Ana Administradora',
    email: `ana.administradora@${DEMO_DOMAIN}`,
  },
  { key: 'vicente', name: 'Vicente Vecino', email: `vicente.vecino@${DEMO_DOMAIN}` },
  { key: 'lucia', name: 'Lucía Residente', email: `lucia.residente@${DEMO_DOMAIN}` },
  { key: 'pablo', name: 'Pablo Presidente', email: `pablo.presidente@${DEMO_DOMAIN}` },
  { key: 'rosa', name: 'Rosa Vecina', email: `rosa.vecina@${DEMO_DOMAIN}` },
  { key: 'miguel', name: 'Miguel Vecino', email: `miguel.vecino@${DEMO_DOMAIN}` },
  {
    key: 'carmen',
    name: 'Carmen Presidenta',
    email: `carmen.presidenta@${DEMO_DOMAIN}`,
  },
  { key: 'luis', name: 'Luis Vecino', email: `luis.vecino@${DEMO_DOMAIN}` },
  { key: 'nuria', name: 'Nuria Residente', email: `nuria.residente@${DEMO_DOMAIN}` },
  { key: 'plataforma', name: 'Demo Publicidad', email: `plataforma@${DEMO_DOMAIN}` },
] as const;

type UserKey = (typeof userSpecs)[number]['key'];
type IdMap = Record<string, string>;

/* ------------------------------------------------------------------ */
/*  Especificación de las comunidades                                  */
/* ------------------------------------------------------------------ */

interface UnitSpec {
  portal?: string;
  number: string;
  coefficient: string;
  owner?: UserKey;
}

interface MemberSpec {
  user: UserKey;
  role: CommunityRole;
}

interface AnnouncementSpec {
  title: string;
  body: string;
  publishedDaysAgo: number;
  expiresInDays?: number;
  author: UserKey;
}

interface MeetingSpec {
  title: string;
  scheduledInDays: number;
  location: string;
  status: MeetingStatus;
  minutes?: string;
  author: UserKey;
  agenda: { title: string; description?: string }[];
  agreements?: { title: string; body: string; status: AgreementStatus }[];
}

interface ExpenseSpec {
  concept: string;
  amount: string;
  category: ExpenseCategory;
  incurredDaysAgo: number;
  status: ExpenseStatus;
  paidDaysAgo?: number;
}

interface InvoiceSpec {
  number: string;
  supplier: string;
  amount: string;
  issuedDaysAgo: number;
  status: 'received' | 'paid';
  paidDaysAgo?: number;
  notes?: string;
}

interface AssessmentSpec {
  concept: string;
  totalAmount: string;
  createdDaysAgo: number;
  paidNumbers: string[];
}

interface IncidentSpec {
  title: string;
  description: string;
  status: IncidentStatus;
  reportedBy: UserKey;
  createdDaysAgo: number;
  resolvedDaysAgo?: number;
}

interface TaskSpec {
  title: string;
  description?: string;
  status: TaskStatus;
  createdDaysAgo: number;
  dueInDays?: number;
  assignee?: UserKey;
  recurrence?: TaskRecurrence;
  fromAgreement?: number;
}

interface SuggestionSpec {
  title: string;
  body: string;
  status: SuggestionStatus;
  author: UserKey;
  createdDaysAgo: number;
}

interface PollSpec {
  question: string;
  status: PollStatus;
  closesInDays?: number;
  createdBy: UserKey;
  options: string[];
  votes: { user: UserKey; option: number }[];
}

interface ProfessionalSpec {
  name: string;
  trade: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface AssetSpec {
  name: string;
  category: AssetCategory;
  location?: string;
  status: AssetStatus;
  warrantyInDays?: number;
  notes?: string;
}

interface ContractSpec {
  provider: string;
  service: string;
  amount: string;
  startDaysAgo: number;
  renewalInDays: number;
  status: ContractStatus;
  notes?: string;
}

interface DocumentSpec {
  title: string;
  category: DocumentCategory;
  content: string;
  uploadedBy: UserKey;
  createdDaysAgo: number;
}

interface TemplateSpec {
  name: string;
  category: DocumentCategory;
  content: string;
  createdBy: UserKey;
}

interface CommunitySpec {
  name: string;
  address: string;
  members: MemberSpec[];
  units: UnitSpec[];
  announcements: AnnouncementSpec[];
  meetings: MeetingSpec[];
  expenses: ExpenseSpec[];
  invoices: InvoiceSpec[];
  assessments: AssessmentSpec[];
  incidents: IncidentSpec[];
  tasks: TaskSpec[];
  suggestions: SuggestionSpec[];
  polls: PollSpec[];
  professionals: ProfessionalSpec[];
  assets: AssetSpec[];
  contracts: ContractSpec[];
  documents: DocumentSpec[];
  templates: TemplateSpec[];
  audit: { action: string; actor: UserKey; daysAgo: number }[];
  invitations: {
    email: string;
    role: 'admin' | 'member' | 'resident';
    status: 'pending' | 'revoked';
  }[];
}

/* ------------------------------------------------------------------ */
/*  Datos ficticios                                                    */
/* ------------------------------------------------------------------ */

const commonDocuments: TemplateSpec[] = [
  {
    name: 'Convocatoria de junta ordinaria',
    category: 'minutes',
    createdBy: 'elena',
    content: [
      'CONVOCATORIA DE JUNTA ORDINARIA',
      '',
      'Por acuerdo de la presidencia, se convoca a todos los propietarios',
      'a la junta ordinaria que se celebrará el día [FECHA] a las [HORA]',
      'en [LUGAR], con el siguiente orden del día:',
      '',
      '1. Lectura y, en su caso, aprobación del acta anterior.',
      '2. Presentación de la cuenta general y presupuesto.',
      '3. Estado de la derrama acordada.',
      '4. Incidencias y mantenimiento.',
      '5. Puntos de interés general.',
      '6. Ruegos y preguntas.',
      '',
      'La asistencia de los propietarios es delegable por escrito.',
    ].join('\n'),
  },
  {
    name: 'Acta de junta (modelo)',
    category: 'minutes',
    createdBy: 'elena',
    content: [
      'ACTA DE LA JUNTA DE PROPIETARIOS',
      '',
      'Localidad: [LOCALIDAD]   Fecha: [FECHA]',
      'Asistentes: [Nº] propietarios con [Nº] votos, [Nº] por delegación.',
      '',
      '1. Se aprueba por unanimidad el acta de la reunión anterior.',
      '2. Se aprueba la cuenta general por [mayoría simple / mayoría simple].',
      '3. Se toma acuerdo sobre los puntos del orden del día.',
      '',
      'La presidencia da por cerrada la sesión a las [HORA].',
    ].join('\n'),
  },
  {
    name: 'Modelo de delegación de voto',
    category: 'other',
    createdBy: 'ana',
    content: [
      'MODELO DE DELEGACIÓN DE VOTO',
      '',
      'D./Dña. [NOMBRE], con DNI [NÚMERO], propietario de la vivienda',
      '[UNIDAD] de [COMUNIDAD], delega su voto en D./Dña. [NOMBRE] con',
      'DNI [NÚMERO], para la junta de [FECHA].',
      '',
      'Firma: ______________________   Fecha: ____________',
    ].join('\n'),
  },
];

const communitySpecs: CommunitySpec[] = [
  {
    name: 'Comunidad Calle Mayor 12',
    address: 'Calle Mayor 12, 28013 Madrid',
    members: [
      { user: 'elena', role: 'owner' },
      { user: 'ana', role: 'admin' },
      { user: 'vicente', role: 'member' },
      { user: 'lucia', role: 'resident' },
    ],
    units: [
      { portal: 'Único', number: '1ºA', coefficient: '0.100000', owner: 'elena' },
      { portal: 'Único', number: '1ºB', coefficient: '0.100000', owner: 'lucia' },
      { portal: 'Único', number: '2ºA', coefficient: '0.100000', owner: 'vicente' },
      { portal: 'Único', number: '2ºB', coefficient: '0.100000' },
      { portal: 'Único', number: '3ºA', coefficient: '0.100000' },
      { portal: 'Único', number: '3ºB', coefficient: '0.100000' },
      { portal: 'Único', number: '4ºA', coefficient: '0.100000' },
      { portal: 'Único', number: '4ºB', coefficient: '0.100000' },
      { portal: 'Ático', number: 'Ático A', coefficient: '0.100000' },
      { portal: 'Ático', number: 'Ático B', coefficient: '0.100000' },
    ],
    announcements: [
      {
        title: 'Corte de agua el martes de 9:00 a 13:00',
        body: 'El martes se realizarán obras en la bajante principal y el suministro quedará interrumpido en todo el portal. Rogamos que dejéis las llaves de paso cerradas.',
        publishedDaysAgo: 2,
        expiresInDays: 10,
        author: 'elena',
      },
      {
        title: 'Reunión con la empresa del ascensor',
        body: 'El jueves a las 17:00 el técnico revisará el ascensor. Durante la revisión no estará disponible. Si notáis algún ruido raro, avisad a la administración.',
        publishedDaysAgo: 6,
        author: 'ana',
      },
      {
        title: 'Recogida de residuos voluminosos',
        body: 'La semana del 3 al 7 se puede dejar muebles y colchones junto al contenedor azul, sin estropear el portal. Gracias por no dejarlos en el rellano.',
        publishedDaysAgo: 14,
        author: 'elena',
      },
      {
        title: 'Nuevo horario de limpieza',
        body: 'A partir del lunes la limpieza se hará de 8:00 a 10:00 en lugar de por la tarde. Si preferís otro horario, dejadlo en las sugerencias de la comunidad.',
        publishedDaysAgo: 25,
        author: 'ana',
      },
    ],
    meetings: [
      {
        title: 'Junta ordinaria de octubre',
        scheduledInDays: -21,
        location: 'Salón de actos del portal',
        status: 'finished',
        author: 'elena',
        minutes:
          'Se reúnen los propietarios en número suficiente. Se aprueba por unanimidad el acta anterior. Se presenta la cuenta general: los gastos del trimestre se ajustan al presupuesto. Se debate la reparación de la cubierta y se acuerda abrir una derrama. Se aprueba el presupuesto de pintura por 4.800,00 €. Se tratan varias incidencias del ascensor.',
        agenda: [
          {
            title: 'Lectura y aprobación del acta anterior',
            description: 'Sin observaciones.',
          },
          {
            title: 'Cuenta general del trimestre',
            description: 'Ingresos, gastos y estado de tesorería.',
          },
          {
            title: 'Reparación de la cubierta',
            description: 'Presupuesto de 4.800,00 € de Cubiertas Hermanos S.L.',
          },
          {
            title: 'Pintura de rellanos',
            description: 'Presupuesto de Pinturas Alcázar.',
          },
          { title: 'Incidencias y puntos de interés general' },
        ],
        agreements: [
          {
            title: 'Aprobar la derrama para la reparación de la cubierta',
            body: 'Se aprueba por mayoría simple la apertura de una derrama de 4.800,00 € a repartir entre las 10 viviendas según coeficiente, con un plazo de pago de 60 días.',
            status: 'approved',
          },
          {
            title: 'Contratar el mantenimiento preventivo del ascensor',
            body: 'Se acuerda contratar con Ascensores del Sur el mantenimiento preventivo por 118,00 € al mes, con renovación anual.',
            status: 'approved',
          },
          {
            title: 'Instalar aire acondicionado en el rellano',
            body: 'Se propone instalar aire acondicionado en los rellanos por un coste de 3.900,00 €. Se rechaza por considerarlo un gasto innecesario este año.',
            status: 'rejected',
          },
        ],
      },
      {
        title: 'Junta ordinaria de enero',
        scheduledInDays: 42,
        location: 'Salón de actos del portal',
        status: 'planned',
        author: 'elena',
        agenda: [
          { title: 'Lectura y aprobación del acta anterior' },
          { title: 'Presupuesto del ejercicio siguiente' },
          { title: 'Estado de cobro de la derrama de la cubierta' },
          { title: 'Renovación de contratos de mantenimiento' },
          { title: 'Ruegos y preguntas' },
        ],
      },
      {
        title: 'Junta extraordinaria: ascensor',
        scheduledInDays: -63,
        location: 'Portal',
        status: 'cancelled',
        author: 'ana',
        agenda: [{ title: 'Avería repetida del ascensor' }],
      },
    ],
    expenses: [
      {
        concept: 'Limpieza de zonas comunes (octubre)',
        amount: '640.00',
        category: 'community',
        incurredDaysAgo: 32,
        status: 'paid',
        paidDaysAgo: 28,
      },
      {
        concept: 'Suministro de agua de la comunidad',
        amount: '187.45',
        category: 'supply',
        incurredDaysAgo: 30,
        status: 'paid',
        paidDaysAgo: 26,
      },
      {
        concept: 'Mantenimiento preventivo del ascensor',
        amount: '320.00',
        category: 'repair',
        incurredDaysAgo: 28,
        status: 'paid',
        paidDaysAgo: 25,
      },
      {
        concept: 'Electricidad de la escalera',
        amount: '96.78',
        category: 'supply',
        incurredDaysAgo: 24,
        status: 'paid',
        paidDaysAgo: 20,
      },
      {
        concept: 'Residuos y contenedor volcador',
        amount: '142.30',
        category: 'community',
        incurredDaysAgo: 45,
        status: 'paid',
        paidDaysAgo: 41,
      },
      {
        concept: 'Honorarios de administración',
        amount: '410.00',
        category: 'administration',
        incurredDaysAgo: 30,
        status: 'paid',
        paidDaysAgo: 27,
      },
      {
        concept: 'Seguro del edificio (anual)',
        amount: '1180.00',
        category: 'community',
        incurredDaysAgo: 62,
        status: 'paid',
        paidDaysAgo: 58,
      },
      {
        concept: 'Jardinería del patio interior',
        amount: '95.00',
        category: 'community',
        incurredDaysAgo: 18,
        status: 'paid',
        paidDaysAgo: 15,
      },
      {
        concept: 'Reparación de la cerradura del portal',
        amount: '155.00',
        category: 'repair',
        incurredDaysAgo: 3,
        status: 'registered',
      },
      {
        concept: 'Pintura de rellanos (anticipo)',
        amount: '480.00',
        category: 'repair',
        incurredDaysAgo: 8,
        status: 'registered',
      },
      {
        concept: 'Suministro de gas (calefacción común)',
        amount: '210.55',
        category: 'supply',
        incurredDaysAgo: 40,
        status: 'paid',
        paidDaysAgo: 36,
      },
      {
        concept: 'Sustitución de luminarias del garaje',
        amount: '264.90',
        category: 'repair',
        incurredDaysAgo: 5,
        status: 'registered',
      },
    ],
    invoices: [
      {
        number: 'F-2026-015',
        supplier: 'Ascensores del Sur S.L.',
        amount: '320.00',
        issuedDaysAgo: 28,
        status: 'paid',
        paidDaysAgo: 25,
      },
      {
        number: 'F-2026-016',
        supplier: 'Limpiezas Vega S.L.',
        amount: '640.00',
        issuedDaysAgo: 32,
        status: 'paid',
        paidDaysAgo: 28,
      },
      {
        number: 'F-2026-017',
        supplier: 'Aguas de Madrid',
        amount: '187.45',
        issuedDaysAgo: 30,
        status: 'received',
      },
      {
        number: 'F-2026-018',
        supplier: 'Electricidad Iberia',
        amount: '96.78',
        issuedDaysAgo: 24,
        status: 'paid',
        paidDaysAgo: 20,
      },
      {
        number: 'F-2026-019',
        supplier: 'Pinturas Alcázar',
        amount: '480.00',
        issuedDaysAgo: 8,
        status: 'received',
        notes: 'Anticipo de la obra de rellanos.',
      },
      {
        number: 'F-2026-020',
        supplier: 'Cerrajería Ágata',
        amount: '155.00',
        issuedDaysAgo: 3,
        status: 'received',
      },
    ],
    assessments: [
      {
        concept: 'Reparación de la cubierta',
        totalAmount: '4800.00',
        createdDaysAgo: 21,
        paidNumbers: ['1ºA', '1ºB', '2ºA', '2ºB', '3ºA', '3ºB', '4ºA'],
      },
    ],
    incidents: [
      {
        title: 'Fuga de agua en el trastero',
        description:
          'Se ha abierto una humedad en la pared del trastero de la planta baja. Parece venir de la bajante. Ya avisé al fontanero.',
        status: 'in_progress',
        reportedBy: 'vicente',
        createdDaysAgo: 4,
      },
      {
        title: 'Ascensor atascado en planta baja',
        description:
          'El ascensor se quedó parado con dos personas dentro durante diez minutos. Vinieron los bomberos. Ya lo revisó el técnico.',
        status: 'resolved',
        reportedBy: 'lucia',
        createdDaysAgo: 16,
        resolvedDaysAgo: 12,
      },
      {
        title: 'La luz del portal parpadea',
        description:
          'La luz de la entrada parpadea al anochecer. Puede ser el contacto del interruptor.',
        status: 'open',
        reportedBy: 'elena',
        createdDaysAgo: 2,
      },
      {
        title: 'Gotera sobre la plaza de garaje 3',
        description:
          'Caía agua desde la junta de dilatación. Dejé un cubo debajo mientras se arregla.',
        status: 'resolved',
        reportedBy: 'vicente',
        createdDaysAgo: 38,
        resolvedDaysAgo: 34,
      },
      {
        title: 'Contenedor de vidrio desbordado',
        description:
          'El contenedor lleva tres días lleno y la gente deja las botellas al lado.',
        status: 'open',
        reportedBy: 'rosa',
        createdDaysAgo: 7,
      },
    ],
    tasks: [
      {
        title: 'Pedir presupuesto de pintura',
        description: 'Tres presupuestos, como pidió la junta.',
        status: 'doing',
        createdDaysAgo: 20,
        dueInDays: 3,
        assignee: 'ana',
      },
      {
        title: 'Renovar el contrato de limpieza',
        description: 'El contrato caduca el mes que viene.',
        status: 'todo',
        createdDaysAgo: 12,
        dueInDays: 11,
        assignee: 'elena',
      },
      {
        title: 'Cambiar la bombilla del rellano 2ª',
        status: 'done',
        createdDaysAgo: 26,
        dueInDays: -20,
        assignee: 'vicente',
      },
      {
        title: 'Revisar la instalación contra incendios',
        status: 'todo',
        createdDaysAgo: 9,
        dueInDays: -2,
        assignee: 'ana',
      },
      {
        title: 'Comprobar los extintores del portal',
        status: 'todo',
        createdDaysAgo: 30,
        recurrence: 'quarterly',
        assignee: 'vicente',
      },
      {
        title: 'Enviar el resumen trimestral a los vecinos',
        status: 'doing',
        createdDaysAgo: 6,
        dueInDays: 6,
        assignee: 'elena',
        fromAgreement: 0,
      },
      {
        title: 'Avisar al fontanero de la humedad',
        status: 'done',
        createdDaysAgo: 4,
        dueInDays: -3,
        assignee: 'vicente',
      },
      {
        title: 'Archivar el acta de octubre',
        status: 'done',
        createdDaysAgo: 19,
        assignee: 'ana',
      },
    ],
    suggestions: [
      {
        title: 'Banco en el jardín del interior',
        body: 'Estaría bien poner un banco en el patio para los mayores cuando hace sol.',
        status: 'accepted',
        author: 'lucia',
        createdDaysAgo: 40,
      },
      {
        title: 'Punto de reciclaje de pilas',
        body: 'Podríamos colocar una cajita junto al buzón para reciclar pilas y tetrapacks.',
        status: 'under_review',
        author: 'vicente',
        createdDaysAgo: 11,
      },
      {
        title: 'Horario alternativo de la limpieza',
        body: 'Por la mañana a veces nos entra el ruido al dormir. ¿Se podría limpiar más tarde?',
        status: 'open',
        author: 'rosa',
        createdDaysAgo: 5,
      },
      {
        title: 'Cámara en el garaje',
        body: 'Se han quitado dos matriculas de las ruedas. Creo que haría falta vigilancia.',
        status: 'rejected',
        author: 'miguel',
        createdDaysAgo: 55,
      },
    ],
    polls: [
      {
        question: '¿Qué reforma hacemos este año?',
        status: 'open',
        closesInDays: 7,
        createdBy: 'elena',
        options: ['Pintura de los rellanos', 'Ascensor nuevo', 'Jardín del patio'],
        votes: [
          { user: 'elena', option: 0 },
          { user: 'vicente', option: 0 },
          { user: 'lucia', option: 2 },
          { user: 'rosa', option: 1 },
          { user: 'miguel', option: 0 },
        ],
      },
      {
        question: '¿A qué hora preferís las reuniones?',
        status: 'closed',
        closesInDays: -30,
        createdBy: 'ana',
        options: ['Por la tarde (17:00)', 'Por la mañana (10:00)'],
        votes: [
          { user: 'elena', option: 0 },
          { user: 'vicente', option: 0 },
          { user: 'lucia', option: 1 },
          { user: 'ana', option: 0 },
        ],
      },
    ],
    professionals: [
      {
        name: 'Fontanería Hermanos Ruiz',
        trade: 'Fontanería',
        phone: '600 11 22 33',
        email: 'contacto@fontaneria-ruiz.local',
        notes:
          'Urgencias 24 horas. Presupuesto sin compromiso. Recomiendan desde el 2º.',
      },
      {
        name: 'Electricidad Soria',
        trade: 'Electricista',
        phone: '611 44 55 66',
        notes: 'Muy puntual; arregló el cuadro del garaje en una tarde.',
      },
      {
        name: 'Ascensores del Sur S.L.',
        trade: 'Mantenimiento de ascensores',
        phone: '910 22 33 44',
        email: 'admin@ascensoresdelsur.local',
        notes: 'Empresa contratada. Avisan 24 h antes de la revisión.',
      },
      {
        name: 'Limpiezas Vega',
        trade: 'Limpieza',
        phone: '622 77 88 99',
        email: 'limpiezas@vega.local',
        notes: 'Trabajan de 8:00 a 10:00. Muy buena relación calidad-precio.',
      },
      { name: 'Jardinería Los Olivos', trade: 'Jardinería', phone: '633 12 34 56' },
      {
        name: 'Cerrajería Ágata',
        trade: 'Cerrajería',
        phone: '644 98 76 54',
        notes:
          'Abre puertas sin dañar la hoja; pide fotocopia del DNI del propietario.',
      },
      {
        name: 'Pinturas Alcázar',
        trade: 'Pintor',
        phone: '655 33 22 11',
        notes: 'Presupuesto de rellanos por 4.800,00 € con pintura mate lavable.',
      },
    ],
    assets: [
      {
        name: 'Ascensor Otis (4 personas)',
        category: 'elevator',
        location: 'Portal principal',
        status: 'operational',
        warrantyInDays: 420,
      },
      {
        name: 'Caldera comunitaria',
        category: 'heating',
        location: 'Cuarto técnico - sótano',
        status: 'maintenance',
        warrantyInDays: 180,
        notes: 'Revisión anual pendiente.',
      },
      {
        name: 'Puerta automática del portal',
        category: 'electrical',
        location: 'Acceso principal',
        status: 'operational',
        warrantyInDays: 95,
      },
      {
        name: 'Depósito de agua',
        category: 'plumbing',
        location: 'Cubierta',
        status: 'operational',
      },
      {
        name: 'Cuadro eléctrico del garaje',
        category: 'electrical',
        location: 'Garaje',
        status: 'broken',
        notes: 'Salta el diferencial con la lluvia.',
      },
      {
        name: 'Sistema de riego del patio',
        category: 'other',
        location: 'Patio interior',
        status: 'operational',
        warrantyInDays: 260,
      },
      {
        name: 'Zona común de juegos',
        category: 'common_area',
        location: 'Patio interior',
        status: 'maintenance',
        notes: 'Falta cambiar el suelo antideslizante.',
      },
    ],
    contracts: [
      {
        provider: 'Ascensores del Sur S.L.',
        service: 'Mantenimiento preventivo de ascensor',
        amount: '118.00',
        startDaysAgo: 300,
        renewalInDays: 25,
        status: 'active',
      },
      {
        provider: 'Limpiezas Vega S.L.',
        service: 'Limpieza de zonas comunes',
        amount: '640.00',
        startDaysAgo: 220,
        renewalInDays: 145,
        status: 'active',
      },
      {
        provider: 'Jardinería Los Olivos',
        service: 'Mantenimiento del jardín',
        amount: '95.00',
        startDaysAgo: 400,
        renewalInDays: 12,
        status: 'active',
      },
      {
        provider: 'Extermia Control de Plagas',
        service: 'Desinsectación semestral',
        amount: '180.00',
        startDaysAgo: 500,
        renewalInDays: 70,
        status: 'active',
      },
      {
        provider: 'Seguros del Centro S.A.',
        service: 'Seguro de responsabilidad civil',
        amount: '1180.00',
        startDaysAgo: 380,
        renewalInDays: -40,
        status: 'ended',
        notes: 'Sustituido por la póliza renovada.',
      },
    ],
    documents: [
      {
        title: 'Acta de la junta de octubre',
        category: 'minutes',
        uploadedBy: 'elena',
        createdDaysAgo: 20,
        content:
          'ACTA DE LA JUNTA ORDINARIA DE OCTUBRE\n\nCalle Mayor 12, Madrid.\nAsistentes: 7 propietarios con 62 votos.\n\n1. Se aprueba el acta anterior.\n2. Se aprueba la cuenta general.\n3. Se acuerda derrama de 4.800,00 EUR para la cubierta.\n4. Se aprueba pintar los rellanos.\n\nLa presidencia cierra la sesion a las 19:40.\n',
      },
      {
        title: 'Presupuesto de pintura de rellanos',
        category: 'report',
        uploadedBy: 'ana',
        createdDaysAgo: 18,
        content:
          'PINTURAS ALCAZAR - PRESUPUESTO 2026\n\nObra: pintura de rellanos y portales\nImporte: 4.800,00 EUR\nMateriales: pintura mate lavable\nPlazo: 10 dias laborables\nValidez: 30 dias\n',
      },
      {
        title: 'Contrato de mantenimiento del ascensor',
        category: 'contract',
        uploadedBy: 'elena',
        createdDaysAgo: 120,
        content:
          'CONTRATO DE MANTENIMIENTO PREVENTIVO\n\nEmpresa: Ascensores del Sur S.L.\nObjeto: revision semestral del ascensor\nImporte: 118,00 EUR/mes\nDuracion: 1 anio renovable\n',
      },
      {
        title: 'Factura F-2026-015 (ascensor)',
        category: 'invoice',
        uploadedBy: 'ana',
        createdDaysAgo: 28,
        content:
          'FACTURA F-2026-015\n\nAscensores del Sur S.L.\nConcepto: mantenimiento preventivo\nBase imponible: 320,00 EUR\nIVA 21%: 67,20 EUR\nTotal: 387,20 EUR\n',
      },
      {
        title: 'Normas de la comunidad',
        category: 'other',
        uploadedBy: 'elena',
        createdDaysAgo: 200,
        content:
          'NORMAS DE CIVISMO Y CONVIVENCIA\n\n1. No dejar objetos en los rellanos.\n2. Respetar los horarios de silencio: 22:00 a 8:00.\n3. Recoger los excrementos de mascotas.\n4. No tirar colillas al patio.\n',
      },
    ],
    templates: commonDocuments,
    audit: [
      { action: 'expense.created', actor: 'ana', daysAgo: 3 },
      { action: 'announcement.created', actor: 'elena', daysAgo: 2 },
      { action: 'assessment.charge_paid', actor: 'elena', daysAgo: 6 },
      { action: 'incident.resolved', actor: 'ana', daysAgo: 12 },
      { action: 'meeting.created', actor: 'elena', daysAgo: 15 },
      { action: 'document.uploaded', actor: 'ana', daysAgo: 18 },
      { action: 'agreement.status_changed', actor: 'elena', daysAgo: 21 },
      { action: 'member.role_changed', actor: 'elena', daysAgo: 35 },
      { action: 'contract.created', actor: 'ana', daysAgo: 44 },
      { action: 'community.created', actor: 'elena', daysAgo: 300 },
    ],
    invitations: [
      { email: 'nuevo.vecino@demo.local', role: 'member', status: 'pending' },
      { email: 'administrador.suplente@demo.local', role: 'admin', status: 'pending' },
      { email: 'vecino.antiguo@demo.local', role: 'resident', status: 'revoked' },
    ],
  },
  {
    name: 'Urbanización El Pinar',
    address: 'Camino del Pinar 4, 41013 Sevilla',
    members: [
      { user: 'pablo', role: 'owner' },
      { user: 'ana', role: 'admin' },
      { user: 'rosa', role: 'member' },
      { user: 'miguel', role: 'member' },
      { user: 'vicente', role: 'resident' },
    ],
    units: [
      { portal: 'Pinar 1', number: 'P-1', coefficient: '0.083333', owner: 'pablo' },
      { portal: 'Pinar 1', number: 'P-2', coefficient: '0.083333', owner: 'rosa' },
      { portal: 'Pinar 1', number: 'P-3', coefficient: '0.083333' },
      { portal: 'Pinar 1', number: 'P-4', coefficient: '0.083333' },
      { portal: 'Pinar 1', number: 'P-5', coefficient: '0.083333', owner: 'miguel' },
      { portal: 'Pinar 1', number: 'P-6', coefficient: '0.083333' },
      { portal: 'Pinar 2', number: 'P-7', coefficient: '0.083333' },
      { portal: 'Pinar 2', number: 'P-8', coefficient: '0.083333' },
      { portal: 'Pinar 2', number: 'P-9', coefficient: '0.083333' },
      { portal: 'Pinar 2', number: 'P-10', coefficient: '0.083333' },
      { portal: 'Pinar 2', number: 'P-11', coefficient: '0.083333', owner: 'vicente' },
      { portal: 'Pinar 2', number: 'P-12', coefficient: '0.083334' },
    ],
    announcements: [
      {
        title: 'Limpieza a presión de las calles internas',
        body: 'El miércoles pasará la máquina de agua por las calles del urbanismo. Retirad los coches de las zonas marcadas con cartelería.',
        publishedDaysAgo: 3,
        expiresInDays: 8,
        author: 'pablo',
      },
      {
        title: 'Fumigación de zonas verdes',
        body: 'El viernes por la mañana se fumigarán las zonas verdes. Los perros no deben pisar el césped durante 24 horas.',
        publishedDaysAgo: 9,
        author: 'ana',
      },
      {
        title: 'Reunión con la empresa de riego',
        body: 'Se revisará el sistema de riego automático del carril central. Avisad si algún aspersor no funciona.',
        publishedDaysAgo: 17,
        author: 'pablo',
      },
    ],
    meetings: [
      {
        title: 'Junta ordinaria de septiembre',
        scheduledInDays: -35,
        location: 'Local social',
        status: 'finished',
        author: 'pablo',
        minutes:
          'Junta celebrada con 9 asistentes. Se aprueba el acta anterior. Se informa del estado del fondo de reserva. Se acuerda renovar el contrato de limpieza a presión. Se debate la instalación de un columpio accesible.',
        agenda: [
          { title: 'Acta anterior' },
          { title: 'Estado del fondo de reserva' },
          { title: 'Renovación del contrato de limpieza a presión' },
          { title: 'Zona de juegos accesible' },
        ],
        agreements: [
          {
            title: 'Renovar el contrato de limpieza a presión',
            body: 'Se acuerda renovar con Limpiezas Vega por dos años, a 210,00 € por limpieza trimestral.',
            status: 'approved',
          },
          {
            title: 'Columpio accesible en la zona de juegos',
            body: 'Se propone adquirir un columpio accesible por 1.450,00 €. Queda pendiente de presupuesto para la siguiente junta.',
            status: 'proposed',
          },
        ],
      },
      {
        title: 'Junta ordinaria de diciembre',
        scheduledInDays: 28,
        location: 'Local social',
        status: 'planned',
        author: 'pablo',
        agenda: [
          { title: 'Cierre del ejercicio' },
          { title: 'Presupuesto del próximo año' },
          { title: 'Zona de juegos accesible' },
          { title: 'Ruegos y preguntas' },
        ],
      },
    ],
    expenses: [
      {
        concept: 'Limpieza a presión de calles',
        amount: '210.00',
        category: 'community',
        incurredDaysAgo: 34,
        status: 'paid',
        paidDaysAgo: 30,
      },
      {
        concept: 'Riego: mantenimiento del sistema',
        amount: '148.50',
        category: 'repair',
        incurredDaysAgo: 26,
        status: 'paid',
        paidDaysAgo: 22,
      },
      {
        concept: 'Electricidad del alumbrado',
        amount: '232.10',
        category: 'supply',
        incurredDaysAgo: 29,
        status: 'paid',
        paidDaysAgo: 25,
      },
      {
        concept: 'Fumigación de zonas verdes',
        amount: '190.00',
        category: 'community',
        incurredDaysAgo: 9,
        status: 'paid',
        paidDaysAgo: 7,
      },
      {
        concept: 'Honorarios de administración',
        amount: '380.00',
        category: 'administration',
        incurredDaysAgo: 30,
        status: 'paid',
        paidDaysAgo: 27,
      },
      {
        concept: 'Reparación de la portería automática',
        amount: '435.70',
        category: 'repair',
        incurredDaysAgo: 6,
        status: 'registered',
      },
      {
        concept: 'Suministro de agua de jardines',
        amount: '97.25',
        category: 'supply',
        incurredDaysAgo: 15,
        status: 'paid',
        paidDaysAgo: 12,
      },
      {
        concept: 'Poda de palmeras',
        amount: '320.00',
        category: 'community',
        incurredDaysAgo: 48,
        status: 'paid',
        paidDaysAgo: 44,
      },
    ],
    invoices: [
      {
        number: 'EP-1180',
        supplier: 'Limpiezas Vega S.L.',
        amount: '210.00',
        issuedDaysAgo: 34,
        status: 'paid',
        paidDaysAgo: 30,
      },
      {
        number: 'EP-1181',
        supplier: 'Riegos Andaluzes S.L.',
        amount: '148.50',
        issuedDaysAgo: 26,
        status: 'paid',
        paidDaysAgo: 22,
      },
      {
        number: 'EP-1182',
        supplier: 'Sevilla Electricidad',
        amount: '232.10',
        issuedDaysAgo: 29,
        status: 'paid',
        paidDaysAgo: 25,
      },
      {
        number: 'EP-1183',
        supplier: 'Automatismos Costa',
        amount: '435.70',
        issuedDaysAgo: 6,
        status: 'received',
      },
    ],
    assessments: [
      {
        concept: 'Renovación del fondo de reserva',
        totalAmount: '2400.00',
        createdDaysAgo: 55,
        paidNumbers: ['P-1', 'P-2', 'P-5', 'P-7', 'P-11', 'P-12'],
      },
    ],
    incidents: [
      {
        title: 'La valla de la zona verde está suelta',
        description:
          'Se ha desprendido un tramo de valla junto al campo de fútbol. Puede ser peligroso para los niños.',
        status: 'open',
        reportedBy: 'rosa',
        createdDaysAgo: 5,
      },
      {
        title: 'Alumbrado apagado en el carril 3',
        description:
          'Tres farolas seguidas del carril 3 no encienden desde el temporal.',
        status: 'in_progress',
        reportedBy: 'miguel',
        createdDaysAgo: 12,
      },
      {
        title: 'Bache en el acceso al garaje comunitario',
        description:
          'Bache de unos 40 cm en la rampa de acceso. Ya se ha rellenado provisionalmente.',
        status: 'resolved',
        reportedBy: 'pablo',
        createdDaysAgo: 27,
        resolvedDaysAgo: 20,
      },
    ],
    tasks: [
      {
        title: 'Pedir presupuesto del columpio accesible',
        status: 'todo',
        createdDaysAgo: 35,
        dueInDays: 9,
        assignee: 'ana',
      },
      {
        title: 'Avisar a la empresa de portería',
        status: 'doing',
        createdDaysAgo: 5,
        dueInDays: 2,
        assignee: 'pablo',
      },
      {
        title: 'Cambiar los bombillos del local social',
        status: 'done',
        createdDaysAgo: 22,
        assignee: 'miguel',
      },
      {
        title: 'Revisar los aspersores',
        status: 'todo',
        createdDaysAgo: 14,
        recurrence: 'monthly',
        assignee: 'rosa',
      },
      {
        title: 'Enviar el resumen del ejercicio',
        status: 'todo',
        createdDaysAgo: 8,
        dueInDays: 21,
        assignee: 'pablo',
        fromAgreement: 0,
      },
    ],
    suggestions: [
      {
        title: 'Más bancos en el carril central',
        body: 'Para los mayores que van a la tienda viene bien descansar a mitad de camino.',
        status: 'accepted',
        author: 'rosa',
        createdDaysAgo: 45,
      },
      {
        title: 'Zona de bicicletas cubierta',
        body: 'Podríamos poner un par de aparcabicicletas bajo la pérgola.',
        status: 'open',
        author: 'miguel',
        createdDaysAgo: 6,
      },
      {
        title: 'Cambio del horario del reciclaje',
        body: 'Los domingos el contenedor amarillo está lleno desde primera hora.',
        status: 'under_review',
        author: 'vicente',
        createdDaysAgo: 13,
      },
    ],
    polls: [
      {
        question: '¿Ponemos aire acondicionado en el local social?',
        status: 'open',
        closesInDays: 4,
        createdBy: 'pablo',
        options: ['Sí, con instalación nueva', 'No, por ahora no hace falta'],
        votes: [
          { user: 'pablo', option: 0 },
          { user: 'rosa', option: 0 },
          { user: 'miguel', option: 1 },
        ],
      },
    ],
    professionals: [
      {
        name: 'Riegos Andaluzes S.L.',
        trade: 'Riego y jardinería',
        phone: '954 11 22 33',
        notes: 'Atienden en 48 h; muy ordenados con las facturas.',
      },
      {
        name: 'Automatismos Costa',
        trade: 'Porteros automáticos',
        phone: '666 55 44 33',
        email: 'tecnicos@automatismos-costa.local',
      },
      {
        name: 'Fontanería La Cartuja',
        trade: 'Fontanería',
        phone: '677 22 11 00',
        notes: 'Trabajan toda la zona sur; aceptan transferencia.',
      },
      {
        name: 'Electricista Sevillo',
        trade: 'Electricista',
        phone: '688 90 90 90',
        notes: 'Buen precio en instalaciones grandes.',
      },
      {
        name: 'Poda y Verde Sevilla',
        trade: 'Jardinería',
        phone: '699 33 44 55',
        notes: 'Poda de palmeras incluida en el contrato anual.',
      },
    ],
    assets: [
      {
        name: 'Portería automática principal',
        category: 'electrical',
        location: 'Acceso norte',
        status: 'broken',
        notes: 'No cierra bien desde hace una semana.',
      },
      {
        name: 'Riego automático carril central',
        category: 'other',
        location: 'Zona verdes',
        status: 'operational',
        warrantyInDays: 300,
      },
      {
        name: 'Cuadro de fuerza del alumbrado',
        category: 'electrical',
        location: 'Local técnico',
        status: 'operational',
      },
      {
        name: 'Depósito de agua de riego',
        category: 'plumbing',
        location: 'Sótano',
        status: 'operational',
        warrantyInDays: 150,
      },
      {
        name: 'Pérgola de la zona de juegos',
        category: 'common_area',
        location: 'Zona de juegos',
        status: 'maintenance',
      },
    ],
    contracts: [
      {
        provider: 'Limpiezas Vega S.L.',
        service: 'Limpieza a presión trimestral',
        amount: '210.00',
        startDaysAgo: 240,
        renewalInDays: 125,
        status: 'active',
      },
      {
        provider: 'Riegos Andaluzes S.L.',
        service: 'Mantenimiento de riego y jardines',
        amount: '148.50',
        startDaysAgo: 180,
        renewalInDays: 20,
        status: 'active',
      },
      {
        provider: 'Poda y Verde Sevilla',
        service: 'Poda anual de palmeras',
        amount: '320.00',
        startDaysAgo: 365,
        renewalInDays: 88,
        status: 'active',
      },
      {
        provider: 'Automatismos Costa',
        service: 'Mantenimiento de portería',
        amount: '45.00',
        startDaysAgo: 500,
        renewalInDays: -15,
        status: 'ended',
      },
    ],
    documents: [
      {
        title: 'Acta de la junta de septiembre',
        category: 'minutes',
        uploadedBy: 'pablo',
        createdDaysAgo: 34,
        content:
          'ACTA JUNTA SEPTIEMBRE - URBANIZACION EL PINAR\n\nAsistentes: 9 propietarios.\n\n1. Cuenta general aprobada.\n2. Renovacion del contrato de limpieza a presion.\n3. Columpio accesible pendiente de presupuesto.\n',
      },
      {
        title: 'Presupuesto de limpieza a presión',
        category: 'report',
        uploadedBy: 'ana',
        createdDaysAgo: 33,
        content:
          'LIMPIEZAS VEGA - PRESUPUESTO\n\nLimpieza a presion de calles internas\n210,00 EUR por limpieza (trimestral)\nDuracion: 2 anos\n',
      },
      {
        title: 'Póliza de responsabilidad civil',
        category: 'contract',
        uploadedBy: 'pablo',
        createdDaysAgo: 160,
        content:
          'POLIZA DE RESPONSABILIDAD CIVIL\n\nAseguradora: Seguros del Centro S.A.\nCobertura: 600.000 EUR\nVigencia: 1 ano\n',
      },
    ],
    templates: commonDocuments.map((template) => ({
      ...template,
      createdBy: 'pablo' as UserKey,
    })),
    audit: [
      { action: 'incident.created', actor: 'rosa', daysAgo: 5 },
      { action: 'announcement.created', actor: 'pablo', daysAgo: 3 },
      { action: 'expense.paid', actor: 'ana', daysAgo: 7 },
      { action: 'meeting.created', actor: 'pablo', daysAgo: 35 },
      { action: 'contract.created', actor: 'ana', daysAgo: 60 },
      { action: 'community.created', actor: 'pablo', daysAgo: 420 },
    ],
    invitations: [
      { email: 'futuro.vecino@demo.local', role: 'member', status: 'pending' },
    ],
  },
  {
    name: 'Edificio Las Acacias',
    address: 'Avenida de las Acacias 27, 46010 Valencia',
    members: [
      { user: 'carmen', role: 'owner' },
      { user: 'ana', role: 'admin' },
      { user: 'luis', role: 'member' },
      { user: 'nuria', role: 'resident' },
    ],
    units: [
      { portal: 'A', number: 'A-1', coefficient: '0.115000', owner: 'carmen' },
      { portal: 'A', number: 'A-2', coefficient: '0.125000', owner: 'luis' },
      { portal: 'A', number: 'A-3', coefficient: '0.125000' },
      { portal: 'B', number: 'B-1', coefficient: '0.125000', owner: 'nuria' },
      { portal: 'B', number: 'B-2', coefficient: '0.125000' },
      { portal: 'B', number: 'B-3', coefficient: '0.130000' },
      { portal: 'B', number: 'B-4', coefficient: '0.130000' },
      { portal: 'Ático', number: 'AT-1', coefficient: '0.125000' },
    ],
    announcements: [
      {
        title: 'Subida de la cuota mensual a 95 €',
        body: 'La junta aprobó subir la cuota ordinaria a 95 € al mes para hacer frente a la reforma de la fachada. La nueva cuota se aplica a partir del mes que viene.',
        publishedDaysAgo: 5,
        expiresInDays: 30,
        author: 'carmen',
      },
      {
        title: 'Reforma de la fachada: empieza el lunes',
        body: 'La empresa colocará andamios en la fachada principal. Habrá cortes parciales de tráfico en la acera durante dos semanas.',
        publishedDaysAgo: 11,
        author: 'ana',
      },
      {
        title: 'Aviso de corte de luz programado',
        body: 'El viernes de 9:00 a 12:00 habrá corte de luz por trabajos en el cuadro de fuerza. Los ascensores no estarán disponibles.',
        publishedDaysAgo: 2,
        expiresInDays: 5,
        author: 'carmen',
      },
    ],
    meetings: [
      {
        title: 'Junta ordinaria de noviembre',
        scheduledInDays: -8,
        location: 'Portal B, planta baja',
        status: 'finished',
        author: 'carmen',
        minutes:
          'Se reúnen 5 propietarios con 62 votos. Se aprueba el acta anterior. Se somete a votación la reforma de la fachada y se aprueba por mayoría. Se aprueba la subida de la cuota ordinaria a 95,00 €.',
        agenda: [
          { title: 'Acta anterior' },
          {
            title: 'Reforma de la fachada',
            description: 'Presupuesto de 31.200,00 € de Reformas Integral S.L.',
          },
          { title: 'Cuota ordinaria' },
          { title: 'Incidencias del portal' },
        ],
        agreements: [
          {
            title: 'Aprobar la reforma de la fachada',
            body: 'Se aprueba por mayoría la reforma de la fachada por 31.200,00 €, con financiación a 24 meses.',
            status: 'approved',
          },
          {
            title: 'Subir la cuota ordinaria a 95,00 €',
            body: 'Se aprueba la subida de la cuota mensual de 80,00 € a 95,00 € desde el próximo mes.',
            status: 'approved',
          },
        ],
      },
      {
        title: 'Junta ordinaria de marzo',
        scheduledInDays: 105,
        location: 'Portal B, planta baja',
        status: 'planned',
        author: 'carmen',
        agenda: [
          { title: 'Acta anterior' },
          { title: 'Estado de la reforma de fachada' },
          { title: 'Ruegos y preguntas' },
        ],
      },
    ],
    expenses: [
      {
        concept: 'Cuota ordinaria: limpieza semanal',
        amount: '150.00',
        category: 'community',
        incurredDaysAgo: 20,
        status: 'paid',
        paidDaysAgo: 18,
      },
      {
        concept: 'Electricidad del portal',
        amount: '78.40',
        category: 'supply',
        incurredDaysAgo: 22,
        status: 'paid',
        paidDaysAgo: 19,
      },
      {
        concept: 'Reparación del ascensor B',
        amount: '486.30',
        category: 'repair',
        incurredDaysAgo: 14,
        status: 'paid',
        paidDaysAgo: 10,
      },
      {
        concept: 'Honorarios de administración',
        amount: '350.00',
        category: 'administration',
        incurredDaysAgo: 30,
        status: 'paid',
        paidDaysAgo: 27,
      },
      {
        concept: 'Anticipo reforma de fachada',
        amount: '6240.00',
        category: 'repair',
        incurredDaysAgo: 7,
        status: 'registered',
      },
      {
        concept: 'Suministro de agua',
        amount: '112.65',
        category: 'supply',
        incurredDaysAgo: 25,
        status: 'paid',
        paidDaysAgo: 21,
      },
      {
        concept: 'Seguro del edificio',
        amount: '845.00',
        category: 'community',
        incurredDaysAgo: 90,
        status: 'paid',
        paidDaysAgo: 86,
      },
    ],
    invoices: [
      {
        number: 'VA-2026-31',
        supplier: 'Reformas Integral S.L.',
        amount: '6240.00',
        issuedDaysAgo: 7,
        status: 'received',
        notes: 'Primer plomo de la reforma de fachada.',
      },
      {
        number: 'VA-2026-30',
        supplier: 'Ascensores Levante',
        amount: '486.30',
        issuedDaysAgo: 14,
        status: 'paid',
        paidDaysAgo: 10,
      },
      {
        number: 'VA-2026-29',
        supplier: 'Limpiezas Turia',
        amount: '150.00',
        issuedDaysAgo: 20,
        status: 'paid',
        paidDaysAgo: 18,
      },
      {
        number: 'VA-2026-28',
        supplier: 'Aguas de Valencia',
        amount: '112.65',
        issuedDaysAgo: 25,
        status: 'paid',
        paidDaysAgo: 21,
      },
    ],
    assessments: [
      {
        concept: 'Reforma de la fachada',
        totalAmount: '31200.00',
        createdDaysAgo: 8,
        paidNumbers: ['A-1', 'A-2'],
      },
    ],
    incidents: [
      {
        title: 'El ascensor del portal B se detiene bruscamente',
        description:
          'Al llegar a la planta 4 el ascensor frena de golpe. Ya avisé a Ascensores Levante.',
        status: 'in_progress',
        reportedBy: 'nuria',
        createdDaysAgo: 9,
      },
      {
        title: 'Grieta en la fachada del portal A',
        description:
          'Grieta vertical junto al primer balcón. Está incluida en la reforma.',
        status: 'open',
        reportedBy: 'carmen',
        createdDaysAgo: 30,
      },
      {
        title: 'Desprendimiento de un azulejo',
        description:
          'Cayó un azulejo del rellano de la 2ª. No ha herido a nadie, pero hay que revisarlo.',
        status: 'resolved',
        reportedBy: 'luis',
        createdDaysAgo: 44,
        resolvedDaysAgo: 40,
      },
    ],
    tasks: [
      {
        title: 'Seguimiento diario de la reforma de fachada',
        status: 'doing',
        createdDaysAgo: 10,
        assignee: 'ana',
        recurrence: 'monthly',
      },
      {
        title: 'Revisar los seguros de la obra',
        status: 'todo',
        createdDaysAgo: 9,
        dueInDays: 5,
        assignee: 'carmen',
        fromAgreement: 0,
      },
      {
        title: 'Avisar a los vecinos del corte de luz',
        status: 'done',
        createdDaysAgo: 3,
        assignee: 'carmen',
      },
      {
        title: 'Pedir presupuesto de limpieza de fachada',
        status: 'todo',
        createdDaysAgo: 15,
        dueInDays: 14,
        assignee: 'luis',
      },
      {
        title: 'Comprobar los extintores',
        status: 'todo',
        createdDaysAgo: 40,
        recurrence: 'quarterly',
        assignee: 'luis',
      },
    ],
    suggestions: [
      {
        title: 'Placas solares en la cubierta',
        body: 'Con las subidas de la luz merecería la pena estudiar placas comunitarias.',
        status: 'under_review',
        author: 'luis',
        createdDaysAgo: 18,
      },
      {
        title: 'Aseo adaptado en el portal',
        body: 'Un aseo accesible en la planta baja ayudaría a las personas mayores.',
        status: 'open',
        author: 'nuria',
        createdDaysAgo: 10,
      },
      {
        title: 'Quitar la planta del rellano',
        body: 'Ocupa medio rellano y hay que esquivarla cada día.',
        status: 'accepted',
        author: 'carmen',
        createdDaysAgo: 60,
      },
    ],
    polls: [
      {
        question: '¿Qué color pintamos la fachada?',
        status: 'closed',
        closesInDays: -20,
        createdBy: 'carmen',
        options: ['Blanco roto', 'Ocre', 'Gris piedra'],
        votes: [
          { user: 'carmen', option: 0 },
          { user: 'luis', option: 2 },
          { user: 'nuria', option: 0 },
          { user: 'ana', option: 1 },
        ],
      },
    ],
    professionals: [
      {
        name: 'Reformas Integral S.L.',
        trade: 'Reformas',
        phone: '963 11 22 33',
        email: 'obras@reformas-integral.local',
        notes: 'Empresa de la reforma de fachada. Muy ordenados con los plazos.',
      },
      {
        name: 'Ascensores Levante',
        trade: 'Mantenimiento de ascensores',
        phone: '961 44 55 66',
        notes: 'Avisan el mismo día si hay avería.',
      },
      { name: 'Limpiezas Turia', trade: 'Limpieza', phone: '612 33 44 55' },
      {
        name: 'Fontanería Blasco',
        trade: 'Fontanería',
        phone: '623 44 55 66',
        notes: 'Rapido y barato; recomendado por el 3º.',
      },
      {
        name: 'Carpintería Albor',
        trade: 'Carpintero',
        phone: '634 55 66 77',
        notes: 'Cambia ventanas de madera sin obras largas.',
      },
    ],
    assets: [
      {
        name: 'Ascensor portal A',
        category: 'elevator',
        location: 'Portal A',
        status: 'operational',
        warrantyInDays: 210,
      },
      {
        name: 'Ascensor portal B',
        category: 'elevator',
        location: 'Portal B',
        status: 'maintenance',
        notes: 'Revisión tras la parada brusca.',
      },
      {
        name: 'Caldera de agua caliente',
        category: 'heating',
        location: 'Cuarto técnico',
        status: 'operational',
        warrantyInDays: 340,
      },
      {
        name: 'Cuadro eléctrico general',
        category: 'electrical',
        location: 'Sótano',
        status: 'operational',
      },
      {
        name: 'Depósito de agua',
        category: 'plumbing',
        location: 'Cubierta',
        status: 'operational',
        warrantyInDays: 120,
      },
      {
        name: 'Portal automático B',
        category: 'common_area',
        location: 'Portal B',
        status: 'operational',
      },
    ],
    contracts: [
      {
        provider: 'Ascensores Levante S.L.',
        service: 'Mantenimiento de ascensores',
        amount: '96.00',
        startDaysAgo: 260,
        renewalInDays: 105,
        status: 'active',
      },
      {
        provider: 'Limpiezas Turia S.L.',
        service: 'Limpieza semanal',
        amount: '150.00',
        startDaysAgo: 150,
        renewalInDays: 60,
        status: 'active',
      },
      {
        provider: 'Seguros del Centro S.A.',
        service: 'Seguro del edificio',
        amount: '845.00',
        startDaysAgo: 90,
        renewalInDays: 275,
        status: 'active',
      },
      {
        provider: 'Reformas Integral S.L.',
        service: 'Reforma de fachada',
        amount: '31200.00',
        startDaysAgo: 8,
        renewalInDays: 540,
        status: 'active',
        notes: 'Obra a 24 meses con garantía de 5 años.',
      },
    ],
    documents: [
      {
        title: 'Acta de la junta de noviembre',
        category: 'minutes',
        uploadedBy: 'carmen',
        createdDaysAgo: 7,
        content:
          'ACTA JUNTA NOVIEMBRE - EDIFICIO LAS ACACIAS\n\nAsistentes: 5 propietarios con 62 votos.\n\n1. Se aprueba la reforma de la fachada por 31.200,00 EUR.\n2. Se aprueba subir la cuota a 95,00 EUR al mes.\n',
      },
      {
        title: 'Presupuesto reforma de fachada',
        category: 'report',
        uploadedBy: 'ana',
        createdDaysAgo: 12,
        content:
          'REFORMAS INTEGRAL S.L. - PRESUPUESTO\n\nReforma de fachada (180 m2)\nImporte: 31.200,00 EUR\nPlazo: 3 meses\nGarantia: 5 anos\n',
      },
      {
        title: 'Factura VA-2026-31 (fachada)',
        category: 'invoice',
        uploadedBy: 'ana',
        createdDaysAgo: 7,
        content:
          'FACTURA VA-2026-31\n\nReformas Integral S.L.\nConcepto: primer plomo de la obra\nTotal: 6.240,00 EUR\n',
      },
    ],
    templates: commonDocuments.map((template) => ({
      ...template,
      createdBy: 'carmen' as UserKey,
    })),
    audit: [
      { action: 'announcement.created', actor: 'carmen', daysAgo: 2 },
      { action: 'expense.created', actor: 'ana', daysAgo: 7 },
      { action: 'assessment.created', actor: 'carmen', daysAgo: 8 },
      { action: 'agreement.status_changed', actor: 'carmen', daysAgo: 8 },
      { action: 'meeting.created', actor: 'carmen', daysAgo: 40 },
      { action: 'community.created', actor: 'carmen', daysAgo: 620 },
    ],
    invitations: [
      { email: 'adriana.vecina@demo.local', role: 'member', status: 'pending' },
    ],
  },
];

const sponsorSpecs = [
  {
    businessName: 'Fontanería Rápida 24h',
    website: 'https://fontaneria-rapida.local',
    contactEmail: `anunciante.fontaneria@${DEMO_DOMAIN}`,
    monthlyAmount: '45.00',
    status: 'active' as const,
    notes: 'Anuncio de cabecera en la sección de profesionales.',
    communities: ['Comunidad Calle Mayor 12', 'Urbanización El Pinar'],
  },
  {
    businessName: 'Seguros del Centro S.A.',
    website: 'https://seguros-centro.local',
    contactEmail: `anunciante.seguros@${DEMO_DOMAIN}`,
    monthlyAmount: '60.00',
    status: 'active' as const,
    notes: 'Pólizas de comunidades; renovación en enero.',
    communities: ['Edificio Las Acacias'],
  },
  {
    businessName: 'Reformas y Obras Vega',
    website: 'https://reformas-vega.local',
    contactEmail: `anunciante.reformas@${DEMO_DOMAIN}`,
    monthlyAmount: '30.00',
    status: 'pending' as const,
    notes: 'Pendiente de confirmar el alta y la creatividad.',
    communities: ['Comunidad Calle Mayor 12'],
  },
];

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */

const idMaps: Record<
  'users' | 'communities' | 'units' | 'meetings' | 'agreements' | 'polls',
  IdMap
> = {
  users: {},
  communities: {},
  units: {},
  meetings: {},
  agreements: {},
  polls: {},
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Reparte un importe total entre las unidades según su coeficiente. */
function splitAmount(
  total: string,
  unitRows: { id: string; coefficient: string; number: string }[],
): { unitId: string; amount: string; number: string }[] {
  const totalCents = cents(total);
  let accumulated = 0;
  return unitRows.map((unit, index) => {
    const isLast = index === unitRows.length - 1;
    const share = isLast
      ? totalCents - accumulated
      : Math.max(1, Math.round(totalCents * Number(unit.coefficient)));
    accumulated += share;
    return { unitId: unit.id, amount: money(share), number: unit.number };
  });
}

/* ------------------------------------------------------------------ */
/*  Carga                                                              */
/* ------------------------------------------------------------------ */

async function createUserRecords(db: Database): Promise<void> {
  const password = await hashPassword(DEMO_PASSWORD);
  for (const spec of userSpecs) {
    const [inserted] = await db
      .insert(user)
      .values({
        id: newId('usr'),
        name: spec.name,
        email: spec.email,
        emailVerified: true,
      })
      .returning({ id: user.id });
    if (!inserted) {
      throw new Error(`No se pudo crear el usuario ${spec.email}`);
    }
    idMaps.users[spec.key] = inserted.id;
    await db.insert(account).values({
      id: newId('acc'),
      accountId: inserted.id,
      providerId: 'credential',
      userId: inserted.id,
      password,
    });
  }
}

const userId = (key: UserKey): string => {
  const id = idMaps.users[key];
  if (!id) throw new Error(`Usuario no sembrado: ${key}`);
  return id;
};

const communityId = (name: string): string => {
  const id = idMaps.communities[name];
  if (!id) throw new Error(`Comunidad no sembrada: ${name}`);
  return id;
};

async function seedCommunity(
  db: Database,
  spec: CommunitySpec,
  storage: ReturnType<typeof createBlobStorage> | null,
): Promise<void> {
  const [created] = await db
    .insert(communities)
    .values({ id: newId('cm'), name: spec.name, address: spec.address })
    .returning({ id: communities.id });
  if (!created) throw new Error(`No se pudo crear ${spec.name}`);
  const cid = created.id;
  idMaps.communities[spec.name] = cid;

  for (const member of spec.members) {
    await db.insert(communityMemberships).values({
      id: newId('mem'),
      communityId: cid,
      userId: userId(member.user),
      role: member.role,
    });
  }

  for (const unit of spec.units) {
    const [inserted] = await db
      .insert(units)
      .values({
        id: newId('un'),
        communityId: cid,
        portal: unit.portal ?? null,
        number: unit.number,
        coefficient: unit.coefficient,
        ownerId: unit.owner ? userId(unit.owner) : null,
      })
      .returning({
        id: units.id,
        number: units.number,
        coefficient: units.coefficient,
      });
    if (!inserted) throw new Error(`No se pudo crear la unidad ${unit.number}`);
    idMaps.units[`${cid}:${unit.number}`] = inserted.id;
  }

  for (const announcement of spec.announcements) {
    await db.insert(announcements).values({
      id: newId('an'),
      communityId: cid,
      title: announcement.title,
      body: announcement.body,
      authorId: userId(announcement.author),
      publishedAt: at(-announcement.publishedDaysAgo),
      expiresAt: announcement.expiresInDays ? at(announcement.expiresInDays) : null,
    });
  }

  for (const meeting of spec.meetings) {
    const [inserted] = await db
      .insert(meetings)
      .values({
        id: newId('mt'),
        communityId: cid,
        title: meeting.title,
        scheduledFor: at(meeting.scheduledInDays),
        location: meeting.location,
        status: meeting.status,
        minutes: meeting.minutes ?? null,
        createdById: userId(meeting.author),
        createdAt: at(meeting.scheduledInDays - 1),
      })
      .returning({ id: meetings.id });
    if (!inserted) throw new Error(`No se pudo crear la reunión ${meeting.title}`);
    const mid = inserted.id;
    idMaps.meetings[`${cid}:${meeting.title}`] = mid;

    for (const [index, item] of meeting.agenda.entries()) {
      await db.insert(meetingAgendaItems).values({
        id: newId('ag'),
        meetingId: mid,
        communityId: cid,
        position: index + 1,
        title: item.title,
        description: item.description ?? null,
      });
    }

    for (const agreement of meeting.agreements ?? []) {
      const [insertedAgreement] = await db
        .insert(agreements)
        .values({
          id: newId('ac'),
          communityId: cid,
          meetingId: mid,
          title: agreement.title,
          body: agreement.body,
          status: agreement.status,
          createdById: userId(meeting.author),
        })
        .returning({ id: agreements.id });
      if (insertedAgreement) {
        idMaps.agreements[`${cid}:${agreement.title}`] = insertedAgreement.id;
      }
    }
  }

  for (const expense of spec.expenses) {
    await db.insert(expenses).values({
      id: newId('ex'),
      communityId: cid,
      concept: expense.concept,
      amount: expense.amount,
      category: expense.category,
      incurredOn: day(-expense.incurredDaysAgo),
      status: expense.status,
      paidOn:
        expense.status === 'paid' && expense.paidDaysAgo !== undefined
          ? day(-expense.paidDaysAgo)
          : null,
      createdById: userId(spec.members[0]?.user ?? 'elena'),
    });
  }

  for (const invoice of spec.invoices) {
    await db.insert(invoices).values({
      id: newId('in'),
      communityId: cid,
      number: invoice.number,
      supplier: invoice.supplier,
      amount: invoice.amount,
      issuedOn: day(-invoice.issuedDaysAgo),
      status: invoice.status,
      paidOn:
        invoice.status === 'paid' && invoice.paidDaysAgo !== undefined
          ? day(-invoice.paidDaysAgo)
          : null,
      notes: invoice.notes ?? null,
      createdById: userId(spec.members[0]?.user ?? 'elena'),
    });
  }

  for (const assessment of spec.assessments) {
    const unitRows = spec.units.map((unit) => ({
      id: idMaps.units[`${cid}:${unit.number}`] as string,
      coefficient: unit.coefficient,
      number: unit.number,
    }));
    const [inserted] = await db
      .insert(assessments)
      .values({
        id: newId('as'),
        communityId: cid,
        concept: assessment.concept,
        totalAmount: assessment.totalAmount,
        createdById: userId(spec.members[0]?.user ?? 'elena'),
        createdAt: at(-assessment.createdDaysAgo),
      })
      .returning({ id: assessments.id });
    if (!inserted) throw new Error(`No se pudo crear la derrama ${assessment.concept}`);

    for (const share of splitAmount(assessment.totalAmount, unitRows)) {
      const paid = assessment.paidNumbers.includes(share.number);
      await db.insert(assessmentCharges).values({
        id: newId('ac'),
        assessmentId: inserted.id,
        communityId: cid,
        unitId: share.unitId,
        amount: share.amount,
        status: paid ? 'paid' : 'pending',
        paidOn: paid ? day(-(assessment.createdDaysAgo - 5)) : null,
        createdAt: at(-assessment.createdDaysAgo),
      });
    }
  }

  for (const incident of spec.incidents) {
    await db.insert(incidents).values({
      id: newId('ic'),
      communityId: cid,
      title: incident.title,
      description: incident.description,
      status: incident.status,
      reportedById: userId(incident.reportedBy),
      resolvedAt: incident.resolvedDaysAgo ? at(-incident.resolvedDaysAgo) : null,
      createdAt: at(-incident.createdDaysAgo),
    });
  }

  for (const task of spec.tasks) {
    const agreementId =
      task.fromAgreement !== undefined
        ? (idMaps.agreements[
            `${cid}:${spec.meetings[0]?.agreements?.[task.fromAgreement]?.title}`
          ] ?? null)
        : null;
    await db.insert(tasks).values({
      id: newId('tk'),
      communityId: cid,
      title: task.title,
      description: task.description ?? null,
      dueOn: task.dueInDays !== undefined ? day(task.dueInDays) : null,
      assigneeId: task.assignee ? userId(task.assignee) : null,
      status: task.status,
      agreementId,
      recurrence: task.recurrence ?? null,
      createdById: userId(spec.members[0]?.user ?? 'elena'),
      createdAt: at(-task.createdDaysAgo),
    });
  }

  for (const suggestion of spec.suggestions) {
    await db.insert(suggestions).values({
      id: newId('sg'),
      communityId: cid,
      title: suggestion.title,
      body: suggestion.body,
      status: suggestion.status,
      authorId: userId(suggestion.author),
      createdAt: at(-suggestion.createdDaysAgo),
    });
  }

  for (const poll of spec.polls) {
    const [insertedPoll] = await db
      .insert(polls)
      .values({
        id: newId('pl'),
        communityId: cid,
        question: poll.question,
        status: poll.status,
        closesOn: poll.closesInDays !== undefined ? at(poll.closesInDays) : null,
        createdById: userId(poll.createdBy),
      })
      .returning({ id: polls.id });
    if (!insertedPoll) throw new Error(`No se pudo crear la encuesta ${poll.question}`);
    const pollId = insertedPoll.id;

    const optionIds: string[] = [];
    for (const [index, text] of poll.options.entries()) {
      const optionId = newId('po');
      optionIds.push(optionId);
      await db.insert(pollOptions).values({
        id: optionId,
        pollId,
        communityId: cid,
        position: index + 1,
        text,
      });
    }

    for (const vote of poll.votes) {
      const optionId = optionIds[vote.option];
      if (!optionId) continue;
      await db.insert(pollVotes).values({
        id: newId('pv'),
        pollId,
        communityId: cid,
        optionId,
        userId: userId(vote.user),
        createdAt: at(-3),
      });
    }
  }

  for (const professional of spec.professionals) {
    await db.insert(professionals).values({
      id: newId('pf'),
      communityId: cid,
      name: professional.name,
      trade: professional.trade,
      phone: professional.phone ?? null,
      email: professional.email ?? null,
      notes: professional.notes ?? null,
    });
  }

  for (const asset of spec.assets) {
    await db.insert(assets).values({
      id: newId('at'),
      communityId: cid,
      name: asset.name,
      category: asset.category,
      location: asset.location ?? null,
      status: asset.status,
      warrantyUntil:
        asset.warrantyInDays !== undefined ? day(asset.warrantyInDays) : null,
      notes: asset.notes ?? null,
      createdById: userId('ana'),
    });
  }

  for (const contract of spec.contracts) {
    await db.insert(maintenanceContracts).values({
      id: newId('ct'),
      communityId: cid,
      provider: contract.provider,
      service: contract.service,
      amount: contract.amount,
      startOn: day(-contract.startDaysAgo),
      renewalOn: day(contract.renewalInDays),
      status: contract.status,
      notes: contract.notes ?? null,
      createdById: userId('ana'),
    });
  }

  for (const template of spec.templates) {
    await db.insert(documentTemplates).values({
      id: newId('dt'),
      communityId: cid,
      name: template.name,
      category: template.category,
      content: template.content,
      createdById: userId(template.createdBy),
    });
  }

  for (const document of spec.documents) {
    const documentId = newId('dc');
    const key = `communities/${cid}/documents/${documentId}/archivo.txt`;
    const body = Buffer.from(document.content, 'utf8');
    if (storage) {
      const stored = await storage.put(key, body, 'text/plain');
      await db.insert(documents).values({
        id: documentId,
        communityId: cid,
        title: document.title,
        category: document.category,
        storageKey: stored.key,
        contentType: 'text/plain',
        sizeBytes: stored.size,
        uploadedById: userId(document.uploadedBy),
        createdAt: at(-document.createdDaysAgo),
      });
    } else {
      console.warn(`AVISO: sin almacenamiento; se omite "${document.title}".`);
    }
  }

  for (const event of spec.audit) {
    await db.insert(auditEvents).values({
      id: newId('ae'),
      communityId: cid,
      actorId: userId(event.actor),
      action: event.action,
      metadata: { demo: true },
      createdAt: at(-event.daysAgo),
    });
  }

  const inviterId = userId(spec.members[0]?.user ?? 'elena');
  const printed: string[] = [];
  for (const invitation of spec.invitations) {
    const token = randomBytes(32).toString('hex');
    await db.insert(invitations).values({
      id: newId('iv'),
      communityId: cid,
      email: invitation.email,
      role: invitation.role,
      tokenHash: hashToken(token),
      invitedById: inviterId,
      expiresAt: at(invitation.status === 'pending' ? 7 : -3),
      revokedAt: invitation.status === 'revoked' ? at(-1) : null,
      createdAt: at(invitation.status === 'pending' ? -1 : -6),
    });
    if (invitation.status === 'pending') {
      printed.push(
        `   ${invitation.email} -> https://mantivecinos.vercel.app/invite/${token}`,
      );
    }
  }
  if (printed.length > 0) {
    console.info(`Enlaces de invitación de "${spec.name}":`);
    printed.forEach((line) => console.info(line));
  }
}

async function seedSponsorships(db: Database): Promise<void> {
  for (const spec of sponsorSpecs) {
    const [inserted] = await db
      .insert(sponsorships)
      .values({
        id: newId('sp'),
        businessName: spec.businessName,
        website: spec.website,
        contactEmail: spec.contactEmail,
        monthlyAmount: spec.monthlyAmount,
        status: spec.status,
        notes: spec.notes,
        createdById: userId('plataforma'),
      })
      .returning({ id: sponsorships.id });
    if (!inserted) continue;
    for (const name of spec.communities) {
      await db.insert(sponsorshipCommunities).values({
        sponsorshipId: inserted.id,
        communityId: communityId(name),
      });
    }
  }
}

/** Borra los datos de demostración (comunidades, usuarios y anuncios). */
async function cleanDemo(db: Database): Promise<number> {
  const names = communitySpecs.map((spec) => spec.name);
  const demoCommunities = await db
    .select({ id: communities.id })
    .from(communities)
    .where(inArray(communities.name, names));
  const ids = demoCommunities.map((row) => row.id);

  if (ids.length > 0) {
    await db
      .delete(communityMemberships)
      .where(inArray(communityMemberships.communityId, ids));
    await db.delete(communities).where(inArray(communities.id, ids));
  }

  const demoSponsors = sponsorSpecs.map((spec) => spec.businessName);
  await db.delete(sponsorships).where(inArray(sponsorships.businessName, demoSponsors));

  const demoEmails = userSpecs.map((spec) => spec.email);
  await db.delete(user).where(inArray(user.email, demoEmails));
  return ids.length;
}

/* ------------------------------------------------------------------ */
/*  Principal                                                          */
/* ------------------------------------------------------------------ */

const main = async (): Promise<void> => {
  const clean = process.argv.includes('--clean');
  const config = loadConfig();
  const connection = config.databaseUrl
    ? { db: createDatabase(config.databaseUrl), close: async () => {} }
    : await createLocalDatabase();

  try {
    await runMigrations(connection.db);
    const db = connection.db;

    if (clean) {
      const removed = await cleanDemo(db);
      console.info(`Datos de demostración eliminados (${removed} comunidades).`);
      return;
    }

    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(like(user.email, `%@${DEMO_DOMAIN}`))
      .limit(1);
    if (existing.length > 0) {
      console.info(
        'Ya hay datos de demostración cargados. Usa `db:seed:demo -- --clean` para recrearlos.',
      );
      return;
    }

    const storage = isStorageConfigured() ? createBlobStorage() : null;

    await createUserRecords(db);
    for (const spec of communitySpecs) {
      await seedCommunity(db, spec, storage);
      console.info(` - ${spec.name} (${spec.units.length} viviendas)`);
    }
    await seedSponsorships(db);

    console.info('');
    console.info('Datos de demostración creados.');
    console.info(`Contraseña de TODOS los usuarios: ${DEMO_PASSWORD}`);
    userSpecs.forEach((spec) => console.info(` - ${spec.email} (${spec.name})`));
  } finally {
    await connection.close();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
