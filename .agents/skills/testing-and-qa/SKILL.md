---
name: testing-and-qa
description: Criterios de pruebas antes de finalizar cualquier tarea. Usar siempre que se dé una tarea por terminada.
---

# Testing y QA

## Objetivo

Ninguna funcionalidad se da por terminada sin pruebas que demuestren que
funciona y que no rompe lo existente.

## Pirámide de pruebas

-  **Unitarias (Vitest):** lógica de servicios y utilidades puras.
-  **Integración:** repositorios y endpoints contra base de datos real
   (PGlite en local/CI; PostgreSQL del proveedor en staging).
-  **E2E (Playwright):** flujos críticos; pendiente de implementar.

## Mínimo exigible por cambio

1.  El camino feliz cubierto.
2.  Validación de entradas (Zod): entradas inválidas → 400.
3.  Autorización: tests negativos por rol (ver skill
   `multi-tenant-security`).
4.  Casos borde relevantes (límites, duplicados, estados).

## Convenciones

-  Los tests usan **datos ficticios**; jamás datos reales de vecinos.
-  Nombres descriptivos: `describe('POST /communities/:id/invitations')`,
   `it('rechaza a un miembro sin rol admin')`.
-  Cada test crea sus datos (factories/seeders en
   `apps/api/src/test/`); sin dependencia entre tests.
-  Sin sleeps ni esperas arbitrarias: usa condiciones o helpers.
-  La base de datos de pruebas se crea desde las migraciones, no desde
   `push`.

## Criterios de finalización

-  `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde.
-  Cobertura razonable de la lógica nueva (no perseguir porcentaje).
-  Ninguna prueba roja ignorada ni `it.skip` sin issue justificado.
