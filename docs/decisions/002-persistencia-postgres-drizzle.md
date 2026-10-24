# ADR 002 — Persistencia: PostgreSQL + Drizzle ORM

-  **Estado:** aceptado
-  **Fecha:** 2026-10-24

## Contexto

Se necesita integridad de datos (relaciones, transacciones, restricciones)
para un dominio económico y normativo. También migraciones reproducibles
y un camino de salida del proveedor.

## Decisión

-  **PostgreSQL** como base de datos; Neon (plan gratuito) como proveedor
   inicial, validando sus límites de cómputo, almacenamiento,
   transferencia y suspensión por inactividad antes de producción.
-  **Drizzle ORM + Drizzle Kit** como única capa de acceso a datos, con
   migraciones SQL versionadas en Git.
-  Prohibido tocar el esquema de producción desde el panel del
   proveedor: solo migraciones aplicadas desde el repositorio.

## Consecuencias

-  (+) Esquema tipado de extremo a extremo y migraciones revisables.
-  (+) SQL estándar: portabilidad entre proveedores (Neon, Supabase,
   RDS, autoalojado).
-  (+) Posibilidad de añadir Row-Level Security como segunda barrera de
   aislamiento.
-  (−) El runtime serverless exige pooling adecuado (driver HTTP de
   Neon o pooler del proveedor).

## Alternativas descartadas

-  SQLite: limita transacciones, concurrentidad y despliegue gestionado.
-  MongoDB: el dominio es relacional con restricciones de integridad.
-  ORM con código generado propio (Prisma): válido, pero Drizzle es más
   cercano al SQL y se integra mejor con drivers serverless.
