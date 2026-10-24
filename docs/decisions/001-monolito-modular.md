# ADR 001 — Arquitectura: monolito modular

-  **Estado:** aceptado
-  **Fecha:** 2026-10-24

## Contexto

El producto es un SaaS multi-comunidad con muchos módulos de negocio
(economía, reuniones, incidencias, documentos…). Un equipo pequeño debe
maximizar velocidad de desarrollo y minimizar coste de infraestructura
inicial.

## Decisión

Monolito modular en TypeScript:

-  Un repositorio (monorepo pnpm) con `apps/web` y `apps/api`.
-  Frontend React (Vite) y API HTTP con Hono.
-  Reglas de negocio y autorización en el backend; el frontend es solo
   presentación.
-  Sin microservicios, colas ni Redis en el MVP.

## Consecuencias

-  (+) Un único despliegue, una base de datos y un modelo de tipos
   compartido (`packages/shared`).
-  (+) Despliegue barato y sencillo en Vercel.
-  (−) Riesgo de acoplamiento si no se respetan los límites de módulo.
-  Mitigación: cada módulo vive en su propio directorio con sus rutas,
   repositorios y tests; las dependencias entre módulos pasan por
   contratos explícitos.

## Alternativas descartadas

-  Microservicios por módulo: complejidad operativa injustificada al
   inicio.
-  Next.js full-stack: acopla frontend y backend y complica migrar el
   backend a otro runtime.
