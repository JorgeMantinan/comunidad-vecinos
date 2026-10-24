---
name: deployment-and-costs
description: Despliegue en Vercel, cuotas de servicios gratuitos, tareas programadas y costes. Usar al tocar configuración de despliegue o añadir dependencias de infraestructura.
---

# Despliegue y costes

## Objetivo

Mantener el coste inicial cercano a 0 € sin sorpresas ni bloqueos, y
poder migrar de proveedor.

## Plataforma

-  Frontend y API en **Vercel** (`mantivecinos.vercel.app`); previews
   por rama; `main` es producción.
-  PostgreSQL gestionado externo (Neon). Correo, almacenamiento de
   objetos y monitorización: proveedores externos con cuota vigilada.
-  Decisiones: `docs/decisions/004-despliegue-vercel.md`.

## Reglas para no disparar costes

1.  Nada de binarios en PostgreSQL: van a almacenamiento de objetos.
2.  Limita el tamaño de subidas y comprime imágenes.
3.  Pagina listas grandes; evita consultas N+1 y descargas repetidas.
4.  Evita trabajo costoso dentro de una petición (genera informes bajo
   demanda).
5.  Vigila cuotas: base de datos, correo, almacenamiento, funciones.
6.  Revisa los términos de Vercel Hobby antes de monetizar: está
   orientado a uso personal/no comercial.

## Variables de entorno

-  Producción y preview se configuran en Vercel; local usa `.env` (no
   versionado) a partir de `.env.example`.
-  Nunca escribas secretos reales en el repositorio ni en logs.
-  Rotación de secretos si se detecta una fuga.

## Criterios de finalización

-  Despliegue reproducible desde cero siguiendo la documentación.
-  Secretos solo en variables de entorno.
-  Ninguna dependencia nueva sin revisar su cuota gratuita y su
   compatibilidad con serverless.
