---
name: project-conventions
description: Estructura del monorepo, nombres, TypeScript estricto y estilo de código. Usar siempre que se escriba o revise código.
---

# Convenciones del proyecto

## Objetivo

Que el código sea predecible: dos personas (o agentes) distintas deben
escribir estructuras idénticas para el mismo caso.

## Estructura

-  `apps/api/src/modules/<modulo>/` — cada módulo de negocio contiene
   `routes.ts`, `service.ts`, `repository.ts` y `*.test.ts`.
-  `apps/api/src/lib/` — infraestructura compartida (db, auth, errores).
-  `packages/shared/src/` — contratos Zod y tipos; el frontend importa
   tipos desde aquí, nunca duplica definiciones.
-  `apps/web/src/features/<modulo>/` — componentes y hooks del cliente.

## Nombres

-  Variables y funciones en inglés (`createCommunity`, `membershipId`).
-  Archivos en kebab-case (`require-community-role.ts`).
-  Tablas en snake_case plural (`community_memberships`).
-  Prefijos de ID por recurso: `usr_`, `cm_`, `mem_`, `inv_`.

## TypeScript

-  `strict: true`; prohibido `any` y `@ts-ignore`. Usa `unknown` +
   narrowing o mejora el tipo.
-  Los contratos de entrada/salida se definen con Zod en
   `packages/shared` y se derivan los tipos con `z.infer`.
-  No expongas tipos de Drizzle fuera de la capa de persistencia:
   convierte a tipos de dominio/contrato.

## Estilo

-  Prettier formatea; ESLint decide. No discutas formato.
-  Funciones pequeñas con una responsabilidad; evita comentar el
   obvio, comenta el *por qué*.
-  Sin código comentado ni código muerto: bórralo.
-  Los errores se lanzan tipados y se traducen a HTTP en la capa de
   transporte, con mensajes sin filtrar detalles internos.

## Criterios de finalización

-  `pnpm lint && pnpm typecheck && pnpm test` en verde.
-  Sin `any`, sin TODOs abandonados, sin dependencias nuevas sin
   justificación.
