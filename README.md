# Comunidad de Vecinos

SaaS multi-comunidad para que vecinos, presidentes y administradores de
fincas gestionen información, economía, reuniones, incidencias,
documentación y profesionales desde una única plataforma.

> Estado: **Fase 4 — administración de fincas**: panel agregado por
> comunidad (owner/admin), informe económico por periodo con CSV y
> seguimiento de acuerdos con tareas derivadas.
>
> **Decisión de producto (ADR 006): la plataforma no incorpora
> funciones de IA** — sin chatbots, resúmenes automáticos ni llamadas
> a proveedores de modelos; el coste de uso no recae en los vecinos.

## Enlaces

-  Web (producción): <https://mantivecinos.vercel.app>
-  Roadmap técnico: [docs/roadmap.md](docs/roadmap.md)
-  Arquitectura: [docs/architecture.md](docs/architecture.md)
-  Despliegue en Vercel: [docs/deploy-vercel.md](docs/deploy-vercel.md)
-  Decisiones (ADRs): [docs/decisions/](docs/decisions/)

## Stack

| Área        | Tecnología                                    |
| ----------- | --------------------------------------------- |
| Frontend    | React + TypeScript + Vite + Tailwind          |
| API         | TypeScript + Hono                             |
| Base datos  | PostgreSQL (Neon) + Drizzle ORM               |
| Auth        | Better Auth (correo/contraseña y sesiones)    |
| Formularios | React Hook Form + Zod                         |
| Datos       | TanStack Query                                |
| Testing     | Vitest                                        |
| Calidad     | TypeScript estricto + ESLint + Prettier       |
| CI/CD       | GitHub Actions + Vercel                       |

## Estructura

```text
comunidad-vecinos/
├── apps/
│   ├── web/          # SPA React
│   └── api/          # API Hono + Drizzle + Better Auth
├── packages/
│   └── shared/       # Contratos Zod y tipos compartidos
├── docs/             # Roadmap, arquitectura, modelo de datos, ADRs
└── .agents/skills/   # Instrucciones de agentes de IA versionadas
```

## Desarrollo

Requisitos: Node.js 22+ y pnpm 9+.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env     # configura AUTH_SECRET (DATABASE_URL opcional)
pnpm db:migrate                            # aplica migraciones (PGlite local si no hay DATABASE_URL)
pnpm dev                                   # api (:3001) + web (:5173)
```

En local no hace falta configurar el frontend: Vite reenvía `/api` a la API
(`localhost:3001`). En producción, `apps/web/vercel.json` reenvía `/api` al
proyecto de la API, así que web y API comparten dominio.

Comandos de calidad (se ejecutan en CI y antes de cada PR):

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Contribuir

1.  Lee [AGENTS.md](AGENTS.md) y [docs/architecture.md](docs/architecture.md).
2.  Crea una rama (`feat/…`, `fix/…`, `docs/…`) desde `main`.
3.  Abre un pull request: la CI debe pasar y requiere revisión humana.
4.  `main` está protegida: no se fusiona directamente.

## Diseño

Paleta corporativa (ver [docs/design-system.md](docs/design-system.md)):
`#A30B37` (primario), `#BD6B73`, `#BBB6DF` (acento), `#C6C8EE`, `#FCFCFF` (fondo).

## Licencia

Licencia por definir. Todo el código es propiedad de sus autores.
