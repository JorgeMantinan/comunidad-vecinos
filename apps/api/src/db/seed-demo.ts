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
  FeeFrequency,
  FeeTarget,
  IncidentStatus,
  MeetingStatus,
  PollStatus,
  SuggestionStatus,
  TaskRecurrence,
  TaskStatus,
  UnitKind,
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
  feeCharges,
  feeTariffs,
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
  {
    key: 'isabel',
    name: 'Isabel Presidenta',
    email: `isabel.presidenta@${DEMO_DOMAIN}`,
  },
  {
    key: 'andres',
    name: 'Andrés Presidente',
    email: `andres.presidente@${DEMO_DOMAIN}`,
  },
  { key: 'marta', name: 'Marta Presidenta', email: `marta.presidenta@${DEMO_DOMAIN}` },
  { key: 'tomas', name: 'Tomás Vecino', email: `tomas.vecino@${DEMO_DOMAIN}` },
  { key: 'sofia', name: 'Sofía Residente', email: `sofia.residente@${DEMO_DOMAIN}` },
  { key: 'nuevo', name: 'Recién Llegado', email: `nuevo.vecino@${DEMO_DOMAIN}` },
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
  /** Tipo de unidad (por defecto `vivienda`). */
  kind?: UnitKind;
  owner?: UserKey;
}

interface FeeTariffSpec {
  concept: string;
  amount: string;
  target: FeeTarget;
  frequency: FeeFrequency;
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
  /** Cuotas y tasas del demo (se generan dos periodos). */
  feeTariffs?: FeeTariffSpec[];
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
      { portal: 'Sótano', number: 'G-1', coefficient: '0.050000', kind: 'garaje' },
      { portal: 'Sótano', number: 'G-2', coefficient: '0.050000', kind: 'garaje' },
      { portal: 'Sótano', number: 'T-1', coefficient: '0.020000', kind: 'trastero' },
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
    feeTariffs: [
      {
        concept: 'Cuota ordinaria',
        amount: '85.00',
        target: 'all',
        frequency: 'monthly',
      },
      {
        concept: 'Tasa de garaje',
        amount: '25.00',
        target: 'garaje',
        frequency: 'monthly',
      },
      {
        concept: 'Trastero',
        amount: '12.00',
        target: 'trastero',
        frequency: 'monthly',
      },
    ],
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
      { portal: 'Sótano', number: 'G-1', coefficient: '0.040000', kind: 'garaje' },
      { portal: 'Sótano', number: 'G-2', coefficient: '0.040000', kind: 'garaje' },
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
    feeTariffs: [
      {
        concept: 'Cuota ordinaria',
        amount: '70.00',
        target: 'all',
        frequency: 'monthly',
      },
      {
        concept: 'Plaza de garaje',
        amount: '22.00',
        target: 'garaje',
        frequency: 'monthly',
      },
    ],
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
      { portal: 'Sótano', number: 'G-1', coefficient: '0.040000', kind: 'garaje' },
      { portal: 'Sótano', number: 'G-2', coefficient: '0.040000', kind: 'garaje' },
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
    feeTariffs: [
      {
        concept: 'Cuota ordinaria',
        amount: '95.00',
        target: 'all',
        frequency: 'monthly',
      },
      {
        concept: 'Plaza de garaje',
        amount: '30.00',
        target: 'garaje',
        frequency: 'monthly',
      },
    ],
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
  {
    name: 'Edificio Sol Naciente',
    address: 'Avenida de la Independencia 18, 50005 Zaragoza',
    members: [
      { user: 'isabel', role: 'owner' },
      { user: 'ana', role: 'admin' },
      { user: 'tomas', role: 'member' },
      { user: 'rosa', role: 'member' },
      { user: 'sofia', role: 'resident' },
    ],
    units: [
      { portal: 'A', number: 'A-1', coefficient: '0.100000' },
      { portal: 'A', number: 'A-2', coefficient: '0.100000' },
      { portal: 'A', number: 'A-3', coefficient: '0.100000' },
      { portal: 'A', number: 'A-4', coefficient: '0.100000' },
      { portal: 'B', number: 'B-1', coefficient: '0.100000' },
      { portal: 'B', number: 'B-2', coefficient: '0.100000' },
      { portal: 'B', number: 'B-3', coefficient: '0.100000' },
      { portal: 'B', number: 'B-4', coefficient: '0.100000' },
      { portal: 'Sótano', number: 'G-1', coefficient: '0.070000', kind: 'garaje' },
      { portal: 'Sótano', number: 'G-2', coefficient: '0.070000', kind: 'garaje' },
      { portal: 'Sótano', number: 'T-1', coefficient: '0.060000', kind: 'trastero' },
    ],
    announcements: [
      {
        title: 'Corte de luz el jueves de 9:00 a 13:00',
        body: 'Habrá trabajos en el cuadro de fuerza y los ascensores no estarán disponibles. Si tenéis problemas para subir, avisad a la administración y avisamos a los vecinos mayores.',
        publishedDaysAgo: 3,
        expiresInDays: 7,
        author: 'isabel',
      },
      {
        title: 'Pintura de los rellanos del portal B',
        body: 'La semana que viene se pintan los rellanos del portal B. Aparcad fuera de la calle esas jornadas: los operarios necesitan espacio.',
        publishedDaysAgo: 9,
        author: 'ana',
      },
      {
        title: 'Recogida de enseres el día 15',
        body: 'El día 15 podéis dejar muebles y colchones junto al contenedor verde. No los dejéis en los rellanos: estorban a los vecinos y a la limpieza.',
        publishedDaysAgo: 21,
        author: 'isabel',
      },
    ],
    meetings: [
      {
        title: 'Junta ordinaria de septiembre',
        scheduledInDays: -40,
        location: 'Salón de actos del portal A',
        status: 'finished',
        author: 'isabel',
        minutes:
          'Se reúnen los propietarios en número suficiente. Se aprueba el acta anterior. Se presenta la cuenta general: los gastos del trimestre se ajustan al presupuesto. Se debate la reparación de la cubierta del bloque B y se acuerda abrir una derrama de 3.200,00 €. Se rechaza la instalación de cámaras en el garaje por su coste.',
        agenda: [
          { title: 'Lectura y aprobación del acta anterior' },
          { title: 'Cuenta general del trimestre' },
          { title: 'Reparación de la cubierta del bloque B' },
          { title: 'Videovigilancia en el garaje' },
        ],
        agreements: [
          {
            title: 'Aprobar la derrama de la cubierta del bloque B',
            body: 'Se aprueba por mayoría simple una derrama de 3.200,00 € a repartir entre las unidades por coeficiente, con plazo de pago de 60 días.',
            status: 'approved',
          },
          {
            title: 'Instalar cámaras en el garaje',
            body: 'Se propone instalar dos cámaras en el garaje por 1.900,00 €. Se rechaza por el coste y porque el vecindario prefiere reforzar la iluminación.',
            status: 'rejected',
          },
        ],
      },
      {
        title: 'Junta ordinaria de enero',
        scheduledInDays: 55,
        location: 'Salón de actos del portal A',
        status: 'planned',
        author: 'isabel',
        agenda: [
          { title: 'Acta anterior' },
          { title: 'Presupuesto del ejercicio siguiente' },
          { title: 'Estado de cobro de la derrama' },
          { title: 'Ruegos y preguntas' },
        ],
      },
    ],
    expenses: [
      {
        concept: 'Limpieza de zonas comunes (octubre)',
        amount: '590.00',
        category: 'community',
        incurredDaysAgo: 25,
        status: 'paid',
        paidDaysAgo: 21,
      },
      {
        concept: 'Suministro de agua de la comunidad',
        amount: '164.30',
        category: 'supply',
        incurredDaysAgo: 32,
        status: 'paid',
        paidDaysAgo: 28,
      },
      {
        concept: 'Mantenimiento preventivo del ascensor',
        amount: '275.00',
        category: 'repair',
        incurredDaysAgo: 30,
        status: 'paid',
        paidDaysAgo: 26,
      },
      {
        concept: 'Electricidad de las zonas comunes',
        amount: '118.75',
        category: 'supply',
        incurredDaysAgo: 20,
        status: 'paid',
        paidDaysAgo: 17,
      },
      {
        concept: 'Honorarios de administración',
        amount: '340.00',
        category: 'administration',
        incurredDaysAgo: 28,
        status: 'paid',
        paidDaysAgo: 25,
      },
      {
        concept: 'Contrato de jardinería',
        amount: '88.00',
        category: 'community',
        incurredDaysAgo: 18,
        status: 'paid',
        paidDaysAgo: 15,
      },
      {
        concept: 'Reparación del timbre del portal A',
        amount: '96.50',
        category: 'repair',
        incurredDaysAgo: 4,
        status: 'registered',
      },
      {
        concept: 'Sustitución de la luz del garaje',
        amount: '132.40',
        category: 'repair',
        incurredDaysAgo: 6,
        status: 'registered',
      },
    ],
    invoices: [
      {
        number: 'SN-2026-41',
        supplier: 'Ascensores Ebro S.L.',
        amount: '275.00',
        issuedDaysAgo: 30,
        status: 'paid',
        paidDaysAgo: 26,
      },
      {
        number: 'SN-2026-42',
        supplier: 'Limpiezas Pilar S.L.',
        amount: '590.00',
        issuedDaysAgo: 25,
        status: 'paid',
        paidDaysAgo: 21,
      },
      {
        number: 'SN-2026-43',
        supplier: 'Aguas de Zaragoza',
        amount: '164.30',
        issuedDaysAgo: 32,
        status: 'received',
      },
      {
        number: 'SN-2026-44',
        supplier: 'Electricidad Alhama',
        amount: '118.75',
        issuedDaysAgo: 20,
        status: 'paid',
        paidDaysAgo: 17,
      },
    ],
    assessments: [
      {
        concept: 'Reparación de la cubierta del bloque B',
        totalAmount: '3200.00',
        createdDaysAgo: 35,
        paidNumbers: ['A-1', 'A-2', 'A-3', 'B-1', 'B-2'],
      },
    ],
    incidents: [
      {
        title: 'Ascensor del portal A parado en planta 4',
        description:
          'Se ha quedado parado con dos personas dentro. Ya vinieron los técnicos y lo dejaron funcionando, pero piden revisión.',
        status: 'in_progress',
        reportedBy: 'tomas',
        createdDaysAgo: 5,
      },
      {
        title: 'Fuga de agua en la rampa del garaje',
        description:
          'Se ve una humedad en la pared de la rampa, parece de la bajante del bloque B.',
        status: 'open',
        reportedBy: 'sofia',
        createdDaysAgo: 2,
      },
      {
        title: 'Gotera en el rellano de la 3ª',
        description:
          'Caía agua desde la junta del techo. Ya pusieron un cubo y lo revisaron.',
        status: 'resolved',
        reportedBy: 'rosa',
        createdDaysAgo: 30,
        resolvedDaysAgo: 26,
      },
      {
        title: 'La puerta del trastero no cierra bien',
        description:
          'La cerradura se queda enganchada y hay que empujar la hoja para que entre.',
        status: 'open',
        reportedBy: 'isabel',
        createdDaysAgo: 8,
      },
    ],
    tasks: [
      {
        title: 'Pedir presupuesto de la pintura',
        description: 'Tres presupuestos, como pidió la junta.',
        status: 'doing',
        createdDaysAgo: 12,
        dueInDays: 4,
        assignee: 'tomas',
      },
      {
        title: 'Renovar el contrato de limpieza',
        status: 'todo',
        createdDaysAgo: 10,
        dueInDays: 12,
        assignee: 'isabel',
      },
      {
        title: 'Cambiar el bombillo del rellano 2ª',
        status: 'done',
        createdDaysAgo: 28,
        dueInDays: -25,
        assignee: 'rosa',
      },
      {
        title: 'Revisar los extintores de los dos portales',
        status: 'todo',
        createdDaysAgo: 40,
        recurrence: 'quarterly',
        assignee: 'tomas',
      },
      {
        title: 'Enviar el resumen del trimestre',
        status: 'doing',
        createdDaysAgo: 5,
        dueInDays: 5,
        assignee: 'isabel',
        fromAgreement: 0,
      },
    ],
    suggestions: [
      {
        title: 'Banco en la entrada del portal A',
        body: 'Para los mayores que suben andando, estaría bien descansar un momento antes de las escaleras.',
        status: 'accepted',
        author: 'sofia',
        createdDaysAgo: 45,
      },
      {
        title: 'Cajita de reciclaje de pilas',
        body: 'Podríamos colocarla junto al buzón para no tirar las pilas a la basura.',
        status: 'under_review',
        author: 'tomas',
        createdDaysAgo: 12,
      },
      {
        title: 'Reforzar la luz del garaje',
        body: 'De noche se ve poco y con las cámaras no, pero sí con más focos.',
        status: 'open',
        author: 'rosa',
        createdDaysAgo: 6,
      },
    ],
    polls: [
      {
        question: '¿Qué reforma hacemos este año?',
        status: 'open',
        closesInDays: 6,
        createdBy: 'isabel',
        options: ['Pintura de los rellanos', 'Ascensor nuevo', 'Zona verde del patio'],
        votes: [
          { user: 'isabel', option: 0 },
          { user: 'tomas', option: 0 },
          { user: 'rosa', option: 1 },
          { user: 'sofia', option: 2 },
        ],
      },
    ],
    professionals: [
      {
        name: 'Fontanería Ibérica',
        trade: 'Fontanería',
        phone: '676 11 22 33',
        notes: 'Urgencias 24 horas; muy rápidos con las bajantes.',
      },
      {
        name: 'Electricidad Alhama',
        trade: 'Electricista',
        phone: '676 44 55 66',
        email: 'contacto@electricidad-alhama.local',
      },
      {
        name: 'Ascensores Ebro S.L.',
        trade: 'Mantenimiento de ascensores',
        phone: '976 22 33 44',
        notes: 'Empresa contratada; avisan 24 h antes de la revisión.',
      },
      {
        name: 'Limpiezas Pilar',
        trade: 'Limpieza',
        phone: '676 77 88 99',
        notes: 'Muy puntuales; pasan de 7:30 a 9:30.',
      },
      {
        name: 'Carpintería Duero',
        trade: 'Carpintero',
        phone: '676 00 11 22',
        notes: 'Arregla puertas y ventanas de madera sin obras largas.',
      },
    ],
    assets: [
      {
        name: 'Ascensor Otis (6 personas)',
        category: 'elevator',
        location: 'Portal A',
        status: 'operational',
        warrantyInDays: 200,
      },
      {
        name: 'Caldera comunitaria',
        category: 'heating',
        location: 'Cuarto técnico',
        status: 'operational',
        warrantyInDays: 150,
      },
      {
        name: 'Cuadro eléctrico del garaje',
        category: 'electrical',
        location: 'Sótano',
        status: 'broken',
        notes: 'Salta el diferencial cuando llueve.',
      },
      {
        name: 'Puerta automática del portal',
        category: 'common_area',
        location: 'Portal B',
        status: 'maintenance',
      },
    ],
    contracts: [
      {
        provider: 'Ascensores Ebro S.L.',
        service: 'Mantenimiento de ascensor',
        amount: '275.00',
        startDaysAgo: 330,
        renewalInDays: 18,
        status: 'active',
      },
      {
        provider: 'Limpiezas Pilar S.L.',
        service: 'Limpieza de zonas comunes',
        amount: '590.00',
        startDaysAgo: 200,
        renewalInDays: 160,
        status: 'active',
      },
      {
        provider: 'Jardinería Ribera',
        service: 'Mantenimiento de jardines',
        amount: '88.00',
        startDaysAgo: 400,
        renewalInDays: -20,
        status: 'ended',
      },
    ],
    documents: [
      {
        title: 'Acta de la junta de septiembre',
        category: 'minutes',
        uploadedBy: 'isabel',
        createdDaysAgo: 39,
        content:
          'ACTA JUNTA SEPTIEMBRE - EDIFICIO SOL NACIENTE\n\nAsistentes: 6 propietarios con 71 votos.\n\n1. Se aprueba el acta anterior.\n2. Cuenta general aprobada.\n3. Derrama de 3.200,00 EUR para la cubierta del bloque B.\n4. Se rechazan las camaras del garaje.\n',
      },
      {
        title: 'Presupuesto de la cubierta',
        category: 'report',
        uploadedBy: 'ana',
        createdDaysAgo: 36,
        content:
          'EBRO CUBIERTAS S.L. - PRESUPUESTO\n\nReparacion de la cubierta del bloque B (210 m2)\nImporte: 3.200,00 EUR\nPlazo: 15 dias\nGarantia: 3 anos\n',
      },
      {
        title: 'Normas de convivencia',
        category: 'other',
        uploadedBy: 'isabel',
        createdDaysAgo: 180,
        content:
          'NORMAS DE CONVIVENCIA\n\n1. No dejar objetos en los rellanos.\n2. Silencio de 22:00 a 8:00.\n3. Recoger los excrementos de mascotas.\n4. No lavar coches en los portales.\n',
      },
    ],
    templates: commonDocuments,
    feeTariffs: [
      {
        concept: 'Cuota ordinaria',
        amount: '78.00',
        target: 'all',
        frequency: 'monthly',
      },
      {
        concept: 'Tasa de garaje',
        amount: '24.00',
        target: 'garaje',
        frequency: 'monthly',
      },
      {
        concept: 'Trastero',
        amount: '15.00',
        target: 'trastero',
        frequency: 'monthly',
      },
    ],
    audit: [
      { action: 'announcement.created', actor: 'isabel', daysAgo: 3 },
      { action: 'expense.created', actor: 'ana', daysAgo: 4 },
      { action: 'assessment.created', actor: 'isabel', daysAgo: 35 },
      { action: 'incident.resolved', actor: 'ana', daysAgo: 26 },
      { action: 'community.created', actor: 'isabel', daysAgo: 500 },
    ],
    invitations: [
      { email: 'inmobiliaria.ebro@demo.local', role: 'admin', status: 'pending' },
    ],
  },
  {
    name: 'Residencial Los Olivos',
    address: 'Camino de los Olivos 6, 48012 Bilbao',
    members: [
      { user: 'andres', role: 'owner' },
      { user: 'ana', role: 'admin' },
      { user: 'miguel', role: 'member' },
      { user: 'luis', role: 'member' },
      { user: 'nuria', role: 'resident' },
    ],
    units: [
      { portal: 'Bloque 1', number: 'O-1', coefficient: '0.100000' },
      { portal: 'Bloque 1', number: 'O-2', coefficient: '0.100000' },
      { portal: 'Bloque 1', number: 'O-3', coefficient: '0.100000' },
      { portal: 'Bloque 1', number: 'O-4', coefficient: '0.100000' },
      { portal: 'Bloque 2', number: 'O-5', coefficient: '0.100000' },
      { portal: 'Bloque 2', number: 'O-6', coefficient: '0.100000' },
      { portal: 'Bloque 2', number: 'O-7', coefficient: '0.100000' },
      { portal: 'Bloque 2', number: 'O-8', coefficient: '0.100000' },
      {
        portal: 'Aparcamiento',
        number: 'G-1',
        coefficient: '0.100000',
        kind: 'garaje',
      },
      {
        portal: 'Aparcamiento',
        number: 'G-2',
        coefficient: '0.100000',
        kind: 'garaje',
      },
    ],
    announcements: [
      {
        title: 'Poda de los olivos la semana que viene',
        body: 'Los operarios podarán los olivos del camino interior el martes y el miércoles. Retirad los coches de la zona marcada con cartelería.',
        publishedDaysAgo: 4,
        expiresInDays: 9,
        author: 'andres',
      },
      {
        title: 'Calle interior cerrada por obras el lunes',
        body: 'El lunes se arregla el firme del camino interior. Se podrá salir a pie pero no con coche de 8:00 a 16:00.',
        publishedDaysAgo: 11,
        author: 'ana',
      },
      {
        title: 'Nuevo horario de la portería',
        body: 'A partir de ahora la portería atiende de 7:00 a 22:00. Fuera de ese horario, el acceso es con la tarjeta.',
        publishedDaysAgo: 24,
        author: 'andres',
      },
    ],
    meetings: [
      {
        title: 'Junta ordinaria de julio',
        scheduledInDays: -70,
        location: 'Local social',
        status: 'finished',
        author: 'andres',
        minutes:
          'Junta con 7 asistentes. Se aprueba el acta anterior. Se informa del estado del fondo de reserva. Se acuerda renovar el contrato de limpieza a presión. Se aprueba por unanimidad sustituir la valla del parque por una de madera reciclada.',
        agenda: [
          { title: 'Acta anterior' },
          { title: 'Estado del fondo de reserva' },
          { title: 'Renovación del contrato de limpieza' },
          { title: 'Valla del parque infantil' },
        ],
        agreements: [
          {
            title: 'Sustituir la valla del parque infantil',
            body: 'Se aprueba por unanimidad sustituir la valla por 1.800,00 € de madera reciclada, con instalación en otoño.',
            status: 'approved',
          },
        ],
      },
      {
        title: 'Junta ordinaria de diciembre',
        scheduledInDays: 35,
        location: 'Local social',
        status: 'planned',
        author: 'andres',
        agenda: [
          { title: 'Cierre del ejercicio' },
          { title: 'Presupuesto del próximo año' },
          { title: 'Ruegos y preguntas' },
        ],
      },
    ],
    expenses: [
      {
        concept: 'Limpieza a presión de caminos',
        amount: '240.00',
        category: 'community',
        incurredDaysAgo: 29,
        status: 'paid',
        paidDaysAgo: 25,
      },
      {
        concept: 'Electricidad del alumbrado',
        amount: '198.40',
        category: 'supply',
        incurredDaysAgo: 26,
        status: 'paid',
        paidDaysAgo: 22,
      },
      {
        concept: 'Mantenimiento del riego',
        amount: '132.00',
        category: 'repair',
        incurredDaysAgo: 22,
        status: 'paid',
        paidDaysAgo: 19,
      },
      {
        concept: 'Honorarios de administración',
        amount: '360.00',
        category: 'administration',
        incurredDaysAgo: 30,
        status: 'paid',
        paidDaysAgo: 27,
      },
      {
        concept: 'Poda de los olivos',
        amount: '410.00',
        category: 'community',
        incurredDaysAgo: 40,
        status: 'paid',
        paidDaysAgo: 36,
      },
      {
        concept: 'Suministro de agua de jardines',
        amount: '76.90',
        category: 'supply',
        incurredDaysAgo: 16,
        status: 'paid',
        paidDaysAgo: 13,
      },
      {
        concept: 'Sustitución de la valla del parque',
        amount: '1800.00',
        category: 'repair',
        incurredDaysAgo: 5,
        status: 'registered',
      },
      {
        concept: 'Reparación de la garita de portería',
        amount: '214.50',
        category: 'repair',
        incurredDaysAgo: 3,
        status: 'registered',
      },
    ],
    invoices: [
      {
        number: 'LO-2026-77',
        supplier: 'Limpiezas Nervión S.L.',
        amount: '240.00',
        issuedDaysAgo: 29,
        status: 'paid',
        paidDaysAgo: 25,
      },
      {
        number: 'LO-2026-78',
        supplier: 'Bilbao Electricidad',
        amount: '198.40',
        issuedDaysAgo: 26,
        status: 'paid',
        paidDaysAgo: 22,
      },
      {
        number: 'LO-2026-79',
        supplier: 'Riegos Deusto S.L.',
        amount: '132.00',
        issuedDaysAgo: 22,
        status: 'paid',
        paidDaysAgo: 19,
      },
      {
        number: 'LO-2026-80',
        supplier: 'Maderería Cantábrico',
        amount: '1800.00',
        issuedDaysAgo: 5,
        status: 'received',
      },
    ],
    assessments: [
      {
        concept: 'Sustitución de la valla del parque',
        totalAmount: '1800.00',
        createdDaysAgo: 65,
        paidNumbers: ['O-1', 'O-2', 'O-3', 'O-5', 'O-6', 'G-1'],
      },
    ],
    incidents: [
      {
        title: 'La garita de portería tiene la teja suelta',
        description:
          'Con la última tormenta se movió una teja y entra agua cuando llueve.',
        status: 'in_progress',
        reportedBy: 'miguel',
        createdDaysAgo: 6,
      },
      {
        title: 'Farola apagada en el camino interior',
        description: 'No enciende desde el temporal de la semana pasada.',
        status: 'open',
        reportedBy: 'luis',
        createdDaysAgo: 3,
      },
      {
        title: 'Bache en el acceso al aparcamiento',
        description:
          'Se ha agrandado con la lluvia y daña los coches que entran rápido.',
        status: 'open',
        reportedBy: 'nuria',
        createdDaysAgo: 9,
      },
      {
        title: 'Aspersor del jardín roto',
        description:
          'Rocaban la acera todas las mañanas. Ya lo avisaron a la empresa de riego.',
        status: 'resolved',
        reportedBy: 'andres',
        createdDaysAgo: 34,
        resolvedDaysAgo: 30,
      },
    ],
    tasks: [
      {
        title: 'Seguimiento de la valla del parque',
        status: 'doing',
        createdDaysAgo: 20,
        dueInDays: 9,
        assignee: 'ana',
      },
      {
        title: 'Pedir presupuesto del asfalto del camino',
        status: 'todo',
        createdDaysAgo: 8,
        dueInDays: 6,
        assignee: 'miguel',
      },
      {
        title: 'Cambiar los bombillos del local social',
        status: 'done',
        createdDaysAgo: 24,
        dueInDays: -20,
        assignee: 'luis',
      },
      {
        title: 'Revisar los aspersores',
        status: 'todo',
        createdDaysAgo: 15,
        recurrence: 'monthly',
        assignee: 'ana',
      },
      {
        title: 'Avisar a la empresa de portería',
        status: 'doing',
        createdDaysAgo: 4,
        dueInDays: 2,
        assignee: 'andres',
      },
    ],
    suggestions: [
      {
        title: 'Más bancos en el camino interior',
        body: 'Para las personas mayores que van a la tienda, viene bien descansar a mitad de camino.',
        status: 'accepted',
        author: 'nuria',
        createdDaysAgo: 50,
      },
      {
        title: 'Zona para bicicletas bajo la pérgola',
        body: 'Se aparcan muchas bicis sueltas; con dos anclajes quedarían ordenadas.',
        status: 'open',
        author: 'luis',
        createdDaysAgo: 7,
      },
      {
        title: 'Contenedor de aceite usado',
        body: 'Podríamos poner uno junto a la portería para no tirar el aceite por el fregadero.',
        status: 'under_review',
        author: 'miguel',
        createdDaysAgo: 14,
      },
    ],
    polls: [
      {
        question: '¿Ponemos columpios nuevos en el parque?',
        status: 'closed',
        closesInDays: -12,
        createdBy: 'andres',
        options: ['Sí, columpio accesible', 'Sí, columpio normal', 'No hace falta'],
        votes: [
          { user: 'andres', option: 0 },
          { user: 'miguel', option: 0 },
          { user: 'luis', option: 1 },
          { user: 'nuria', option: 2 },
        ],
      },
    ],
    professionals: [
      {
        name: 'Riegos Deusto S.L.',
        trade: 'Riego y jardinería',
        phone: '944 11 22 33',
        notes: 'Muy ordenados con las facturas y rápidos.',
      },
      { name: 'Limpiezas Nervión', trade: 'Limpieza', phone: '688 55 44 33' },
      {
        name: 'Fontanería Gernika',
        trade: 'Fontanería',
        phone: '688 22 11 00',
        notes: 'Trabajan todo el territorio; aceptan transferencia.',
      },
      {
        name: 'Electricidad Abando',
        trade: 'Electricista',
        phone: '688 90 90 90',
        notes: 'Buen precio en instalaciones grandes.',
      },
      {
        name: 'Maderería Cantábrico',
        trade: 'Carpintero',
        phone: '688 33 44 55',
        notes: 'Hacen vallas y pérgolas a medida.',
      },
    ],
    assets: [
      {
        name: 'Garita de portería',
        category: 'common_area',
        location: 'Acceso principal',
        status: 'maintenance',
        notes: 'Teja suelta desde la tormenta.',
      },
      {
        name: 'Alumbrado del camino',
        category: 'electrical',
        location: 'Camino interior',
        status: 'broken',
      },
      {
        name: 'Sistema de riego',
        category: 'other',
        location: 'Jardines',
        status: 'operational',
        warrantyInDays: 240,
      },
      {
        name: 'Cuadro de fuerza',
        category: 'electrical',
        location: 'Cuarto técnico',
        status: 'operational',
      },
    ],
    contracts: [
      {
        provider: 'Limpiezas Nervión S.L.',
        service: 'Limpieza a presión trimestral',
        amount: '240.00',
        startDaysAgo: 260,
        renewalInDays: 40,
        status: 'active',
      },
      {
        provider: 'Riegos Deusto S.L.',
        service: 'Mantenimiento de riego y jardines',
        amount: '132.00',
        startDaysAgo: 180,
        renewalInDays: 20,
        status: 'active',
      },
      {
        provider: 'Portería 24 S.L.',
        service: 'Control de portería',
        amount: '95.00',
        startDaysAgo: 520,
        renewalInDays: -30,
        status: 'ended',
      },
    ],
    documents: [
      {
        title: 'Acta de la junta de julio',
        category: 'minutes',
        uploadedBy: 'andres',
        createdDaysAgo: 68,
        content:
          'ACTA JUNTA JULIO - RESIDENCIAL LOS OLIVOS\n\nAsistentes: 7 propietarios.\n\n1. Cuenta general aprobada.\n2. Renovacion del contrato de limpieza a presion.\n3. Aprobada por unanimidad la valla del parque (1.800,00 EUR).\n',
      },
      {
        title: 'Presupuesto de la valla del parque',
        category: 'report',
        uploadedBy: 'ana',
        createdDaysAgo: 66,
        content:
          'MADERERIA CANTABRICO - PRESUPUESTO\n\nValla del parque infantil (42 m)\nImporte: 1.800,00 EUR\nMaterial: madera reciclada\nPlazo: 20 dias\n',
      },
      {
        title: 'Normas del residencial',
        category: 'other',
        uploadedBy: 'andres',
        createdDaysAgo: 220,
        content:
          'NORMAS DEL RESIDENCIAL\n\n1. Silencio de 22:00 a 8:00.\n2. No aparcar en los accesos.\n3. Recoger los excrementos de mascotas.\n4. Cuidar las zonas verdes comunes.\n',
      },
    ],
    templates: commonDocuments,
    feeTariffs: [
      {
        concept: 'Cuota ordinaria',
        amount: '68.00',
        target: 'all',
        frequency: 'monthly',
      },
      {
        concept: 'Plaza de garaje',
        amount: '26.00',
        target: 'garaje',
        frequency: 'monthly',
      },
    ],
    audit: [
      { action: 'announcement.created', actor: 'andres', daysAgo: 4 },
      { action: 'expense.paid', actor: 'ana', daysAgo: 13 },
      { action: 'task.created', actor: 'andres', daysAgo: 8 },
      { action: 'meeting.created', actor: 'andres', daysAgo: 70 },
      { action: 'community.created', actor: 'andres', daysAgo: 740 },
    ],
    invitations: [
      { email: 'administracion.olivos@demo.local', role: 'admin', status: 'pending' },
    ],
  },
  {
    name: 'Comunidad Avenida del Puerto 8',
    address: 'Avenida del Puerto 8, 03002 Alicante',
    members: [
      { user: 'marta', role: 'owner' },
      { user: 'ana', role: 'admin' },
      { user: 'vicente', role: 'member' },
      { user: 'tomas', role: 'member' },
      { user: 'lucia', role: 'resident' },
    ],
    units: [
      { portal: 'A', number: 'A-1', coefficient: '0.120000' },
      { portal: 'A', number: 'A-2', coefficient: '0.120000' },
      { portal: 'A', number: 'A-3', coefficient: '0.120000' },
      { portal: 'B', number: 'B-1', coefficient: '0.120000' },
      { portal: 'B', number: 'B-2', coefficient: '0.120000' },
      { portal: 'B', number: 'B-3', coefficient: '0.120000' },
      { portal: 'Sótano', number: 'G-1', coefficient: '0.140000', kind: 'garaje' },
      { portal: 'Sótano', number: 'G-2', coefficient: '0.140000', kind: 'garaje' },
    ],
    announcements: [
      {
        title: 'Impermeabilización de la azotea desde el lunes',
        body: 'Durante dos semanas se trabaja en la azotea. El ruido será sobre todo en horario de mañana. Si trabajáis de noche, avisadnos y buscaremos una solución.',
        publishedDaysAgo: 6,
        expiresInDays: 16,
        author: 'marta',
      },
      {
        title: 'Corte de agua el martes por la mañana',
        body: 'El martes de 8:00 a 12:00 habrá corte de agua para revisar la bajante. Dejad las llaves cerradas.',
        publishedDaysAgo: 2,
        expiresInDays: 5,
        author: 'ana',
      },
      {
        title: 'Verano: ventilar las viviendas vacías',
        body: 'Recordatorio para las viviendas que no se usan todo el año: ventilad de vez en cuando para evitar humedades en los muros.',
        publishedDaysAgo: 30,
        author: 'marta',
      },
    ],
    meetings: [
      {
        title: 'Junta ordinaria de octubre',
        scheduledInDays: -28,
        location: 'Portal B, planta baja',
        status: 'finished',
        author: 'marta',
        minutes:
          'Se reúnen 5 propietarios con 58 votos. Se aprueba el acta anterior. Se somete a votación la impermeabilización de la azotea (2.400,00 €) y se aprueba por mayoría. Se acuerda subir la cuota ordinaria a 92,00 € para el fondo de reserva.',
        agenda: [
          { title: 'Acta anterior' },
          { title: 'Impermeabilización de la azotea' },
          { title: 'Cuota ordinaria y fondo de reserva' },
          { title: 'Ruegos y preguntas' },
        ],
        agreements: [
          {
            title: 'Aprobar la impermeabilización de la azotea',
            body: 'Se aprueba la impermeabilización por 2.400,00 € con garantía de 5 años, a pagar en dos plazos.',
            status: 'approved',
          },
          {
            title: 'Subir la cuota ordinaria a 92,00 €',
            body: 'Se aprueba subir la cuota de 85,00 € a 92,00 € desde el mes siguiente para reforzar el fondo de reserva.',
            status: 'approved',
          },
        ],
      },
      {
        title: 'Junta ordinaria de febrero',
        scheduledInDays: 90,
        location: 'Portal B, planta baja',
        status: 'planned',
        author: 'marta',
        agenda: [
          { title: 'Acta anterior' },
          { title: 'Estado de la azotea' },
          { title: 'Ruegos y preguntas' },
        ],
      },
    ],
    expenses: [
      {
        concept: 'Limpieza semanal (octubre)',
        amount: '310.00',
        category: 'community',
        incurredDaysAgo: 24,
        status: 'paid',
        paidDaysAgo: 20,
      },
      {
        concept: 'Electricidad del portal',
        amount: '84.60',
        category: 'supply',
        incurredDaysAgo: 22,
        status: 'paid',
        paidDaysAgo: 18,
      },
      {
        concept: 'Mantenimiento del ascensor',
        amount: '196.00',
        category: 'repair',
        incurredDaysAgo: 27,
        status: 'paid',
        paidDaysAgo: 24,
      },
      {
        concept: 'Honorarios de administración',
        amount: '320.00',
        category: 'administration',
        incurredDaysAgo: 30,
        status: 'paid',
        paidDaysAgo: 27,
      },
      {
        concept: 'Suministro de agua',
        amount: '98.25',
        category: 'supply',
        incurredDaysAgo: 19,
        status: 'paid',
        paidDaysAgo: 16,
      },
      {
        concept: 'Impermeabilización de la azotea (primer plazo)',
        amount: '1200.00',
        category: 'repair',
        incurredDaysAgo: 5,
        status: 'registered',
      },
      {
        concept: 'Reparación del timbre del portal A',
        amount: '74.90',
        category: 'repair',
        incurredDaysAgo: 7,
        status: 'registered',
      },
      {
        concept: 'Fumigación contra terciarios',
        amount: '165.00',
        category: 'community',
        incurredDaysAgo: 45,
        status: 'paid',
        paidDaysAgo: 41,
      },
    ],
    invoices: [
      {
        number: 'AP-2026-12',
        supplier: 'Azoteas Levante S.L.',
        amount: '1200.00',
        issuedDaysAgo: 5,
        status: 'received',
      },
      {
        number: 'AP-2026-13',
        supplier: 'Ascensores Costa',
        amount: '196.00',
        issuedDaysAgo: 27,
        status: 'paid',
        paidDaysAgo: 24,
      },
      {
        number: 'AP-2026-14',
        supplier: 'Limpiezas Marina',
        amount: '310.00',
        issuedDaysAgo: 24,
        status: 'paid',
        paidDaysAgo: 20,
      },
      {
        number: 'AP-2026-15',
        supplier: 'Plagas Mediterráneo',
        amount: '165.00',
        issuedDaysAgo: 45,
        status: 'paid',
        paidDaysAgo: 41,
      },
    ],
    assessments: [
      {
        concept: 'Impermeabilización de la azotea',
        totalAmount: '2400.00',
        createdDaysAgo: 28,
        paidNumbers: ['A-1', 'A-2', 'B-1'],
      },
    ],
    incidents: [
      {
        title: 'Humedad en el techo del portal B',
        description: 'Mancha grande en el techo de la entrada; parece de la azotea.',
        status: 'in_progress',
        reportedBy: 'lucia',
        createdDaysAgo: 7,
      },
      {
        title: 'El ascensor del portal A huele a quemado',
        description:
          'Al subir se nota un olor raro en la cabina. Avisamos a la empresa.',
        status: 'open',
        reportedBy: 'vicente',
        createdDaysAgo: 2,
      },
      {
        title: 'Gotera en el cuarto de basuras',
        description: 'Caía agua de la tubería. Ya la sellaron.',
        status: 'resolved',
        reportedBy: 'tomas',
        createdDaysAgo: 40,
        resolvedDaysAgo: 37,
      },
      {
        title: 'Buzón atascado',
        description: 'No caben más cartas y el cartero deja el correo en la recepción.',
        status: 'open',
        reportedBy: 'marta',
        createdDaysAgo: 4,
      },
    ],
    tasks: [
      {
        title: 'Seguimiento de la obra de la azotea',
        status: 'doing',
        createdDaysAgo: 6,
        assignee: 'ana',
        recurrence: 'monthly',
      },
      {
        title: 'Recoger el presupuesto de los toldos',
        status: 'todo',
        createdDaysAgo: 9,
        dueInDays: 7,
        assignee: 'marta',
      },
      {
        title: 'Avisar del corte de agua a los vecinos mayores',
        status: 'done',
        createdDaysAgo: 3,
        dueInDays: -2,
        assignee: 'vicente',
      },
      {
        title: 'Comprar bombillas del portal',
        status: 'todo',
        createdDaysAgo: 11,
        dueInDays: -1,
        assignee: 'tomas',
      },
      {
        title: 'Revisar los extintores',
        status: 'todo',
        createdDaysAgo: 60,
        recurrence: 'quarterly',
        assignee: 'ana',
      },
    ],
    suggestions: [
      {
        title: 'Toldos en las ventanas del portal',
        body: 'En verano entra un sol fuerte por la tarde; un toldo ayudaría a refrescar el rellano.',
        status: 'under_review',
        author: 'vicente',
        createdDaysAgo: 15,
      },
      {
        title: 'Punto de reciclaje de tapas',
        body: 'Podríamos poner una cajita junto al buzón para recoger tapas solidarias.',
        status: 'open',
        author: 'lucia',
        createdDaysAgo: 8,
      },
      {
        title: 'Plantas en los rellanos',
        body: 'Una planta en cada rellano haría el portal más acogedor; yo me encargo de regar.',
        status: 'accepted',
        author: 'tomas',
        createdDaysAgo: 55,
      },
    ],
    polls: [
      {
        question: '¿Qué color pintamos el portal?',
        status: 'open',
        closesInDays: 4,
        createdBy: 'marta',
        options: ['Blanco roto', 'Arena', 'Gris claro'],
        votes: [
          { user: 'marta', option: 0 },
          { user: 'vicente', option: 1 },
          { user: 'tomas', option: 0 },
          { user: 'lucia', option: 2 },
        ],
      },
    ],
    professionals: [
      {
        name: 'Azoteas Levante S.L.',
        trade: 'Reformas',
        phone: '965 11 22 33',
        notes: 'Empresa de la azotea; muy cuidadosos con los plazos.',
      },
      {
        name: 'Ascensores Costa',
        trade: 'Mantenimiento de ascensores',
        phone: '965 44 55 66',
      },
      {
        name: 'Limpiezas Marina',
        trade: 'Limpieza',
        phone: '666 33 44 55',
        notes: 'Pasan de lunes a viernes a las 8:00.',
      },
      {
        name: 'Fontanería Alacantina',
        trade: 'Fontanería',
        phone: '666 44 55 66',
        notes: 'Rápidos y con factura inmediata.',
      },
      {
        name: 'Plagas Mediterráneo',
        trade: 'Control de plagas',
        phone: '666 77 88 99',
        notes: 'Desinsectación semestral; avisan por correo.',
      },
    ],
    assets: [
      {
        name: 'Ascensor portal A',
        category: 'elevator',
        location: 'Portal A',
        status: 'maintenance',
        notes: 'Olor a quemado: revisión pedida.',
      },
      {
        name: 'Ascensor portal B',
        category: 'elevator',
        location: 'Portal B',
        status: 'operational',
        warrantyInDays: 180,
      },
      {
        name: 'Caldera de agua caliente',
        category: 'heating',
        location: 'Cuarto técnico',
        status: 'operational',
        warrantyInDays: 300,
      },
      {
        name: 'Buzones del portal',
        category: 'common_area',
        location: 'Acceso principal',
        status: 'broken',
        notes: 'Atascados por volumen de correo.',
      },
    ],
    contracts: [
      {
        provider: 'Ascensores Costa S.L.',
        service: 'Mantenimiento de ascensores',
        amount: '196.00',
        startDaysAgo: 300,
        renewalInDays: 25,
        status: 'active',
      },
      {
        provider: 'Limpiezas Marina S.L.',
        service: 'Limpieza semanal',
        amount: '310.00',
        startDaysAgo: 210,
        renewalInDays: 120,
        status: 'active',
      },
      {
        provider: 'Plagas Mediterráneo',
        service: 'Desinsectación semestral',
        amount: '165.00',
        startDaysAgo: 190,
        renewalInDays: 8,
        status: 'active',
      },
    ],
    documents: [
      {
        title: 'Acta de la junta de octubre',
        category: 'minutes',
        uploadedBy: 'marta',
        createdDaysAgo: 27,
        content:
          'ACTA JUNTA OCTUBRE - AVENIDA DEL PUERTO 8\n\nAsistentes: 5 propietarios con 58 votos.\n\n1. Se aprueba el acta anterior.\n2. Impermeabilizacion de la azotea aprobada (2.400,00 EUR).\n3. Cuota ordinaria sube a 92,00 EUR.\n',
      },
      {
        title: 'Presupuesto de la azotea',
        category: 'report',
        uploadedBy: 'ana',
        createdDaysAgo: 26,
        content:
          'AZOTAS LEVANTE S.L. - PRESUPUESTO\n\nImpermeabilizacion de azotea (180 m2)\nImporte: 2.400,00 EUR\nGarantia: 5 anos\nPlazo: 10 dias\n',
      },
      {
        title: 'Escritura de división horizontal',
        category: 'other',
        uploadedBy: 'marta',
        createdDaysAgo: 400,
        content:
          'NOTA DE DIVISION HORIZONTAL (RESUMEN)\n\n8 viviendas con coeficientes entre 0,12 y 0,14.\nZonas comunes: portals, escaleras, azotea y solana.\n',
      },
    ],
    templates: commonDocuments,
    feeTariffs: [
      {
        concept: 'Cuota ordinaria',
        amount: '92.00',
        target: 'all',
        frequency: 'monthly',
      },
      {
        concept: 'Plaza de garaje',
        amount: '28.00',
        target: 'garaje',
        frequency: 'monthly',
      },
    ],
    audit: [
      { action: 'announcement.created', actor: 'marta', daysAgo: 2 },
      { action: 'expense.created', actor: 'ana', daysAgo: 5 },
      { action: 'agreement.status_changed', actor: 'marta', daysAgo: 28 },
      { action: 'meeting.created', actor: 'marta', daysAgo: 45 },
      { action: 'community.created', actor: 'marta', daysAgo: 900 },
    ],
    invitations: [
      { email: 'gestoria.puerto@demo.local', role: 'admin', status: 'pending' },
    ],
  },
];

const sponsorSpecs = [
  {
    businessName: 'Fontanería Rápida 24h',
    website: 'https://fontaneria-rapida.local',
    contactEmail: `anunciante.fontaneria@${DEMO_DOMAIN}`,
    zone: 'Madrid, Sevilla',
    monthlyAmount: '45.00',
    status: 'active' as const,
    notes: 'Anuncio de cabecera en la sección de profesionales.',
    // Solo se asigna Madrid: en El Pinar llega por coincidir la zona.
    communities: ['Comunidad Calle Mayor 12'],
  },
  {
    businessName: 'Seguros del Centro S.A.',
    website: 'https://seguros-centro.local',
    contactEmail: `anunciante.seguros@${DEMO_DOMAIN}`,
    zone: 'Valencia',
    monthlyAmount: '60.00',
    status: 'active' as const,
    notes: 'Pólizas de comunidades; renovación en enero.',
    communities: ['Edificio Las Acacias'],
  },
  {
    businessName: 'Reformas y Obras Vega',
    website: 'https://reformas-vega.local',
    contactEmail: `anunciante.reformas@${DEMO_DOMAIN}`,
    zone: 'Madrid',
    monthlyAmount: '30.00',
    status: 'pending' as const,
    notes: 'Pendiente de confirmar el alta y la creatividad.',
    communities: ['Comunidad Calle Mayor 12'],
  },
  {
    businessName: 'Cerrajería Nocturna 24h',
    website: 'https://cerrajeria-nocturna.local',
    contactEmail: `anunciante.cerrajeria@${DEMO_DOMAIN}`,
    zone: 'Zaragoza, Bilbao, Alicante',
    monthlyAmount: '35.00',
    status: 'active' as const,
    notes:
      'Apertura de puertas 24 horas; asignada a Zaragoza y con zona para las otras dos ciudades nuevas.',
    communities: ['Edificio Sol Naciente'],
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

/**
 * Reparte un importe total entre las unidades según su coeficiente.
 *
 * Normaliza por la **suma** de coeficientes: en el demo hay comunidades
 * cuyos coeficientes no suman 1 (los garajes y trasteros se añadieron
 * después de las viviendas) y sin normalizar la última unidad
 * recibiría un importe negativo y violaría el check de la base de datos.
 */
function splitAmount(
  total: string,
  unitRows: { id: string; coefficient: string; number: string }[],
): { unitId: string; amount: string; number: string }[] {
  const totalCents = cents(total);
  const weights = unitRows.map((unit) => Number(unit.coefficient));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let accumulated = 0;

  return unitRows.map((unit, index) => {
    const isLast = index === unitRows.length - 1;
    const share = isLast
      ? Math.max(1, totalCents - accumulated)
      : Math.max(1, Math.round((totalCents * (weights[index] ?? 0)) / weightSum));
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

/**
 * Cuotas del demo: genera dos periodos —el anterior, ya cobrado, y el
 * actual, pendiente— para que se vean los dos estados en los paneles.
 */
async function seedFeeTariffs(
  db: Database,
  communityId: string,
  spec: CommunitySpec,
  createdById: string,
): Promise<void> {
  const tariffs = spec.feeTariffs ?? [];
  if (tariffs.length === 0) {
    return;
  }

  const current = new Date(NOW).toISOString().slice(0, 7);
  const [year, month] = current.split('-').map(Number);
  if (!year || !month) {
    return;
  }
  // Mes anterior: índice 0-based `m - 2` (con enero da diciembre previo).
  const previous = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);

  for (const tariff of tariffs) {
    const [inserted] = await db
      .insert(feeTariffs)
      .values({
        id: newId('ft'),
        communityId,
        concept: tariff.concept,
        amount: tariff.amount,
        target: tariff.target,
        frequency: tariff.frequency,
        anchorPeriod: previous,
        createdById,
      })
      .returning({ id: feeTariffs.id });
    if (!inserted) {
      continue;
    }

    for (const [period, paid] of [
      [previous, true],
      [current, false],
    ] as const) {
      for (const unit of spec.units) {
        const kind = unit.kind ?? 'vivienda';
        if (tariff.target !== 'all' && tariff.target !== kind) {
          continue;
        }
        const unitId = idMaps.units[`${communityId}:${unit.number}`];
        if (!unitId) {
          continue;
        }
        await db
          .insert(feeCharges)
          .values({
            id: newId('fc'),
            communityId,
            tariffId: inserted.id,
            unitId,
            period,
            concept: tariff.concept,
            amount: tariff.amount,
            status: paid ? 'paid' : 'pending',
            paidOn: paid ? day(-30) : null,
            createdAt: at(-30),
          })
          .onConflictDoNothing();
      }
    }
  }
}

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
        kind: unit.kind ?? 'vivienda',
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

  await seedFeeTariffs(db, cid, spec, userId(spec.members[0]?.user ?? 'elena'));

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
        zone: spec.zone,
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
