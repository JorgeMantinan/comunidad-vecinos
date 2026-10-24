---
name: architecture-review
description: Revisión arquitectónica de nuevos módulos y cambios entre capas del monolito modular. Usar antes de añadir un módulo o mover lógica entre capas.
---

# Revisión de arquitectura

## Objetivo

Que los límites del monolito modular se mantienen: módulos
independientes, lógica en la capa correcta y contratos explícitos.

## Contexto

Arquitectura: `docs/architecture.md`. Decisiones: `docs/decisions/`.

## Pasos

1.  **¿Es un módulo nuevo?** Debe vivir en
    `apps/api/src/modules/<nombre>/` con `routes`, `service` y
    `repository`. Si toca varios módulos, define un contrato en
    `packages/shared` en vez de importar entre módulos.
2.  **Ubicación de la lógica:**
    -  Reglas de negocio → `service.ts` (o dominio puro si es
       compleja).
    -  Acceso a datos → `repository.ts` (único lugar que importa
       Drizzle).
    -  Validación/autorización → middleware y contratos Zod.
    -  Presentación → `apps/web`.
3.  **¿Cambia el modelo de datos?** Requiere migración y actualización
    de `docs/data-model.md`.
4.  **¿Cambia el comportamiento público?** Añade o actualiza el contrato
    Zod en `packages/shared` y documéntalo.
5.  **¿Es una decisión relevante?** Nuevo ADR numerado en
    `docs/decisions/`.

## Restricciones

-  Sin dependencias directas `apps/web` → Drizzle ni saltos de capa.
-  Sin lógica de negocio en componentes React ni en SQL ad-hoc fuera
   del repositorio.
-  Sin dependencias nuevas de infraestructura (Redis, colas…) sin ADR.

## Criterios de finalización

-  El módulo es utilizable sin importar internamente de otro módulo.
-  Tipos y contratos compartidos sin duplicación.
-  Docs afectadas actualizadas en el mismo PR.
