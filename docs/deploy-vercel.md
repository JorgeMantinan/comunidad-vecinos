# Despliegue en Vercel

Guía paso a paso para publicar `mantivecinos.vercel.app` con la
arquitectura del [ADR 004](decisions/004-deployment-vercel.md): dos
proyectos de Vercel (web y API) desde este monorepo.

## 1. Base de datos (Neon)

1.  Crear un proyecto en <https://neon.tech> (plan Free).
2.  Copiar la cadena de conexión *pooled* (`postgresql://...-pooler...`).
3.  Guardarla: será `DATABASE_URL` de la API. Nunca se versiona.

## 2. Proyecto de la API

1.  En Vercel: *Add New → Project* → importar el repo; en **Root
    Directory** indicar `apps/api`.
2.  Framework preset: *Other*. Vercel detecta `apps/api/api/index.ts`
    como función serverless (todo se reescribe hacia ella con
    `apps/api/vercel.json`).
3.  **Nombre del proyecto: `mantivecinos-api`** (obligatorio: el
    frontend reenvía `/api` a `https://mantivecinos-api.vercel.app`).
4.  Variables de entorno (Production y Preview):
    -  `DATABASE_URL`: la cadena de Neon.
    -  `AUTH_SECRET`: generar con `openssl rand -base64 32`.
    -  `CORS_ORIGIN`: `https://mantivecinos.vercel.app` (red de
       seguridad; el tráfico real va por proxy en el mismo dominio).
    -  `NODE_ENV`: `production`.
5.  Desplegar. La API quedará en `mantivecinos-api.vercel.app`.

## 3. Proyecto del frontend

1.  Otro proyecto del mismo repo con **Root Directory** `apps/web` y
    framework *Vite*.
2.  Build command `pnpm build`, output `dist` (Vite los detecta).
3.  **Nombre del proyecto: `mantivecinos`** → dominio automático
    `mantivecinos.vercel.app`.
4.  No hace falta `VITE_API_URL`: `apps/web/vercel.json` reenvía
    `/api/*` al proyecto de la API, por lo que web y API comparten
    dominio y las cookies son same-origin (sin CORS en la práctica).

Las cookies de sesión usan `SameSite=None; Secure` en producción (ver
`apps/api/src/lib/auth.ts`) como red de seguridad por si algún día se
separan dominios.

## 4. Migraciones en producción

Nunca desde el panel de Neon. Desde el repositorio:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @comunidad/api db:migrate
```

El CI ya valida que las migraciones se aplican sobre PostgreSQL limpio.

## 5. Semántica de ramas

-  `main` despliega a **Production** (ambos proyectos).
-  Cada rama genera un **Preview** con sus propias variables de Preview.
-  `main` está protegida: PR obligatorio y CI verde.

## 6. Cuotas y vigilancia (Hobby)

Vercel Hobby está orientado a uso personal/no comercial: revisar los
términos antes de monetizar. Vigilar en el dashboard:

-  funciones: invocaciones, tiempo de compute, ancho de banda.
-  Neon: cómputo, almacenamiento y suspensión por inactividad.

## 7. Local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm db:migrate   # PGlite local si no hay DATABASE_URL
pnpm dev
```
