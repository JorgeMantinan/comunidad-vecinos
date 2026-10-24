# ADR 003 — Multi-tenancy por membresía

-  **Estado:** aceptado
-  **Fecha:** 2026-10-24

## Contexto

Una cuenta puede pertenecer a varias comunidades (vecino en la suya y
administrador de fincas de otras). Ningún usuario debe ver ni modificar
datos de una comunidad a la que no pertenece, ni siquiera manipulando
identificadores.

## Decisión

-  Aislamiento **compartido con columna de comunidad**: toda tabla
   privada lleva `community_id`.
-  Relaciones lógicas con claves foráneas compuestas por `communityId`
   siempre que sea posible, para impedir en BD asociaciones entre
   comunidades distintas.
-  **Autorización en servidor** en cada ruta privada: resolver usuario →
   membresía → rol antes de ejecutar el caso de uso.
-  Todas las consultas se limitan al ámbito autorizado; el ID del
   recurso nunca es suficiente por sí solo.
-  Acciones críticas se registran en `audit_events`.
-  RLS en PostgreSQL como segunda barrera en una fase posterior.

## Consecuencias

-  (+) Modelo simple, un único esquema y una base de datos.
-  (+) Un administrador de fincas cambia de comunidad sin duplicar
   cuentas.
-  (−) Un fallo en un guard afecta a todos los tenants: se mitiga con
   tests negativos de aislamiento obligatorios en CI.

## Alternativas descartadas

-  Base de datos por comunidad: coste y migraciones inviables gratis.
-  Esquema por comunidad: complejidad de migraciones y consultas.
