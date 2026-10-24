# ADR 004 — Despliegue: Vercel

-  **Estado:** aceptado (sustituye a la propuesta inicial de Cloudflare
   Workers/Pages)
-  **Fecha:** 2026-10-24

## Contexto

El roadmap original proponía Cloudflare Workers + Pages por su capa
gratuita. El propietario del producto ha decidido usar **Vercel** como
plataforma inicial, con el dominio `mantivecinos.vercel.app`, por su
integración con monorepos pnpm, preview deployments por rama y calidad
de experiencia de despliegue. El roadmap advierte que **Vercel Hobby está
orientado a uso personal/no comercial**: antes de monetizar hay que
revisar los términos vigentes y valorar el plan Pro o migrar.

## Decisión

-  Frontend (SPA React/Vite) y API (Hono) desplegados en **Vercel**.
-  La API se expone como funciones serverless de Vercel sirviendo la
   app Hono.
-  PostgreSQL gestionado externo (Neon); nunca dentro de Vercel.
-  CI en GitHub Actions como única fuente de verdad de calidad; Vercel
   despliega desde `main` y genera previews por rama.

## Consecuencias

-  (+) Cero configuración de servidores y previews por pull request.
-  (+) Monorepo soportado oficialmente con pnpm.
-  (−) Riesgo de dependencia del proveedor y límites de Hobby:
   monitorizar ejecuciones, tiempo de CPU y duración de peticiones.
-  (−) La API serverless no mantiene estado: la sesión vive en cookies y
   la base de datos, nunca en memoria.
-  Mitigación: la aplicación no depende de APIs específicas de Vercel
   fuera de un adaptador fino; el backend puede ejecutarse como servidor
   Node estándar.

## Condiciones para revisar la decisión

-  Anuncio de uso comercial del producto (monetización).
-  Exceder cuotas de Hobby (computación, ancho de banda, duración).
-  Necesidad de tareas programadas o WebSockets (valorar Vercel Cron,
   Upstash u otro proveedor).

## Alternativas

-  Cloudflare Workers/Pages: opción original del roadmap; queda como
   ruta de migración documentada.
-  Railway/Fly/Render: mayor coste continuo para el MVP.
