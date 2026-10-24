# AGENTS.md

Instrucciones para los agentes de IA que trabajan en este repositorio.
Cualquier asistente (OpenCode, Codex, Claude Code, Cursor…) debe seguir
este documento. Las skills de `.agents/skills/` amplían estas reglas por
área; léelas antes de tocar código de esa área.

## Qué es este proyecto

SaaS multi-comunidad para comunidades de propietarios españolas.
Roadmap completo en `docs/roadmap.md`. Decisiones de arquitectura en
`docs/decisions/` (los ADRs son vinculantes; si propones un cambio,
añade un nuevo ADR).

## Stack

-  Monorepo pnpm: `apps/web` (React + Vite + TS + Tailwind),
   `apps/api` (Hono + Drizzle + Better Auth), `packages/shared`
   (contratos Zod y tipos).
-  PostgreSQL (Neon en producción). Migraciones con Drizzle Kit.
-  Despliegue en Vercel. CI en GitHub Actions.
-  Tests con Vitest. TypeScript estricto, ESLint, Prettier.

## Reglas de oro

1.  **El servidor manda:** toda validación y autorización se hace en el
    backend. Nunca confíes en el frontend.
2.  **Aislamiento:** ningún recurso privado se consulta solo por ID;
    siempre filtra por comunidad autorizada. Antes de añadir una ruta
    privada, lee `docs/permissions-matrix.md`.
3.  **Sin datos reales:** usa datos ficticios en pruebas, seeds y
    ejemplos.
4.  **Sin secretos:** nunca escribas claves reales en el código; usa
    `.env.example` como plantilla.
5.  **Tipos estrictos:** no uses `any`; los tipos deben pasar
    `tsc --noEmit`.
6.  **Migraciones reproducibles:** toda migración debe aplicarse desde
    una base vacía. No edites migraciones ya aplicadas.
7.  **Un cambio, un PR:** cambios pequeños y enfocados, con tests y sin
    código muerto.
8.  **Reglas de negocio en backend,** no duplicadas solo en React.

## Flujo de trabajo

1.  Crea una rama desde `main`: `feat/…`, `fix/…`, `docs/…`, `ci/…`,
    `test/…`.
2.  Implementa con tests (incluidos tests negativos de permisos cuando
    toque autorización).
3.  Ejecuta antes de entregar: `pnpm lint`, `pnpm typecheck`,
    `pnpm test`.
4.  Abre un pull request descriptivo. CI debe pasar. Revisión humana
    obligatoria antes de fusionar.
5.  Commits en inglés o español consistente, formato
    `tipo(scope): descripción` (conventional commits).

## Skills disponibles

| Skill                        | Cuándo usarla                                |
| ---------------------------- | -------------------------------------------- |
| `project-conventions`        | Siempre: estructura, nombres, estilo         |
| `architecture-review`        | Nuevos módulos o cambios entre capas         |
| `multi-tenant-security`      | Cualquier operación con recursos privados    |
| `database-migrations`        | Cambios de esquema                           |
| `testing-and-qa`             | Antes de dar una tarea por terminada         |
| `privacy-and-retention`      | Documentos, datos personales, borrados       |
| `deployment-and-costs`       | Despliegue, cuotas y tareas programadas      |

## Qué no hacer

-  No crear microservicios, colas ni Redis sin necesidad real.
-  No subir binarios a PostgreSQL (van a almacenamiento de objetos).
-  No publicar decisiones ni emitir dictámenes jurídicos automáticos.
-  No migrar proveedores ni ejecutar acciones sobre producción sin
    autorización explícita del humano.
