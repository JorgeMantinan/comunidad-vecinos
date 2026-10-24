---
name: multi-tenant-security
description: Aislamiento entre comunidades y autorización. Usar en toda operación con recursos privados, rutas autenticadas o cambios de permisos.
---

# Seguridad multi-tenant

## Objetivo

Ningún usuario puede leer ni modificar datos de una comunidad ajena, ni
manipulando identificadores.

## Reglas

1.  Toda ruta privada pasa por `requireAuth` y por
    `requireCommunityRole(...)`; el rol se resuelve en servidor desde
    `community_memberships`.
2.  `communityId` viene de la membresía resuelta, no del cuerpo de la
    petición. Si el cliente envía un `communityId`, debe coincidir con
    una membresía activa del usuario.
3.  Todas las consultas incluyen el filtro de comunidad en el
    repositorio, incluso cuando el ID del recurso ya es único.
4.  Las tablas privadas incluyen `community_id` y sus FK lo contienen.
5.  Las acciones críticas (economía, permisos, acuerdos) escriben en
    `audit_events`.
6.  Nunca devuelvas al cliente datos de otra comunidad ni confirmations
    de su existencia (404, no 403, cuando corresponda ocultar).

## Tests obligatorios

Para cada ruta privada añadida:

-  **Positivo:** el usuario con el rol adecuado obtiene 2xx.
-  **Negativo sin membresía:** 401/404, nunca datos.
-  **Negativo con membresía de rol insuficiente:** 403.
-  **Negativo cruzado:** usuario de la comunidad A accediendo al
   recurso de la comunidad B manipulando IDs → sin datos.

## Criterios de finalización

-  Tests negativos presentes y en verde.
-  Ninguna consulta privada sin filtro de comunidad.
-  Auditoría registrada en acciones críticas.
