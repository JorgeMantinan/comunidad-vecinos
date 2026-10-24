# Arquitectura

## Visión general

Monolito modular desplegado como dos procesos dentro de un único repositorio (monorepo pnpm):

```
comunidad-vecinos/
├── apps/
│   ├── web/          # SPA React (Vite + TypeScript + Tailwind)
│   └── api/          # API HTTP (Hono + Drizzle + Better Auth)
├── packages/
│   └── shared/       # Contratos HTTP (Zod) y tipos compartidos
├── docs/             # Requisitos, arquitectura, modelo de datos, ADRs
└── .agents/skills/   # Instrucciones de agentes versionadas
```

No hay microservicios en el MVP: un único backend y una única base de datos,
con límites lógicos claros por módulo de negocio.

## Capas de la API

Cada endpoint sigue el mismo flujo, de fuera hacia dentro:

1. **Transporte (Hono):** enruta la petición y centraliza CORS, cabeceras y manejo de errores.
2. **Autenticación (Better Auth):** resuelve *quién es* el usuario a partir de la sesión.
3. **Autorización (guards):** resuelve *qué puede hacer* en la comunidad indicada (rol + membresía).
4. **Validación (Zod, `packages/shared`):** entrada y salida tipadas y verificadas.
5. **Caso de uso / repositorio:** lógica de negocio y acceso a datos vía Drizzle.
6. **Dominio:** reglas de negocio puras, sin dependencias de infraestructura.

### Reglas no negociables

- El frontend **nunca** es una barrera de seguridad: toda validación y autorización se hace en el servidor.
- Ninguna consulta accede a un recurso privado solo por ID: siempre se filtra por `communityId` autorizado.
- Las relaciones de base de datos impiden asociar entidades de comunidades distintas (FK compuestas por `communityId`).
- Las acciones críticas (facturas, gastos, acuerdos, permisos) generan eventos de auditoría.
- Sin Redis, colas ni servidores persistentes hasta que exista una necesidad real.

## Multi-tenancy

Cada recurso privado pertenece a una comunidad. El aislamiento se apoya en tres capas:

1. **Membresías:** `community_memberships` conecta usuarios con comunidades y roles.
2. **Autorización en servidor:** middleware `requireCommunityRole(roles)` en cada ruta privada.
3. **Restricciones de integridad:** claves foráneas que incluyen `communityId`, más RLS en PostgreSQL como segunda barrera (fase posterior).

## Frontend

- React + Vite + TypeScript estricto.
- Tailwind CSS para estilos; componentes de UI reutilizables.
- React Hook Form + Zod para formularios tipados.
- TanStack Query para estado remoto (caché, carga y sincronización).
- El frontend consume los contratos de `packages/shared`, nunca inventa tipos.

## Persistencia y migraciones

- Drizzle ORM como único acceso a datos.
- Drizzle Kit genera migraciones SQL revisables versionadas en Git.
- Prohibido modificar el esquema de producción desde el panel del proveedor.
- Toda migración debe aplicarse desde una base vacía (se verifica en CI).

## Despliegue

Ver [ADR 004](decisions/004-deployment-vercel.md). Resumen:

- Frontend y API desplegados en **Vercel** (`mantivecinos.vercel.app`).
- PostgreSQL gestionado (Neon como candidato inicial).
- CI en GitHub Actions: lint, tipos, tests y migraciones desde cero.

## Deuda técnica consciente

- Almacenamiento de objetos (documentos/fotos): pendiente de elegir proveedor; nunca en PostgreSQL.
- RLS en PostgreSQL: segunda barrera, pendiente de implementar.
- Tests E2E (Playwright): pendientes de la primera funcionalidad completa.
- Servicios de correo: pendientes para invitaciones y notificaciones.
