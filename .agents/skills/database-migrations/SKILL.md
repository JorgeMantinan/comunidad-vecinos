---
name: database-migrations
description: Cambios de esquema en PostgreSQL con Drizzle Kit. Usar antes de modificar tablas, añadir entidades o tocar migraciones.
---

# Migraciones de base de datos

## Objetivo

Migraciones reproducibles, revisables en SQL y aplicables desde una base
vacía.

## Pasos

1.  Edita el esquema en `apps/api/src/db/schema/`.
2.  Genera la migración: `pnpm --filter api db:generate` (produce SQL
    revisable en `apps/api/drizzle/`).
3.  Revisa el SQL generado: si hay operaciones destructivas
    (`DROP COLUMN`, `ALTER TYPE`, cambios de nulabilidad), aplica la
    estrategia por etapas:
    1.  Añadir la nueva estructura.
    2.  Migrar los datos.
    3.  Cambiar el código para usar lo nuevo.
    4.  Retirar lo antiguo en una migración posterior.
4.  Aplica sobre base de prueba: `pnpm --filter api db:migrate`.
5.  Documenta en el PR cómo revertir o recuperar si no es automático.

## Restricciones

-  Nunca edites una migración ya aplicada y fusionada.
-  Nunca toques el esquema de producción desde el panel del proveedor.
-  Toda tabla privada nueva lleva `community_id` con FK que lo
   contenga.
-  Prefiere `CHECK` con tipo `text` a enumeraciones de PostgreSQL
   nativas.
-  Añade índices para las consultas frecuentes (membresías por usuario,
   recursos por comunidad).
-  Las migraciones se ejecutan en CI contra una base limpia.

## Criterios de finalización

-  Migración generada, revisada y aplicada en local.
-  `docs/data-model.md` actualizado si cambia el mapa de entidades.
-  CI pasa la comprobación de migraciones desde cero.
