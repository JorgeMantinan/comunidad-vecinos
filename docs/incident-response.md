# Procedimiento de respuesta a incidentes

Runbook operativo. Objetivo: contener, comunicar y restaurar con el
menor daño posible para los vecinos.

## 1. Detección y clasificación

| Nivel | Ejemplo | Acción inmediata |
| ----- | ------- | ----------------- |
| **Alto** | Acceso no autorizado a datos de una comunidad, fuga de documentos, robo de secretos | Apartado 2 y 3 completos |
| **Medio** | Sesiones comprometidas de una cuenta, envío de correos abusivo, datos incorrectos en informes | Apartado 2 y 4 |
| **Bajo** | Caída puntual, lentitud, error aislado | Registrar y monitorizar |

Fuentes de detección: alertas de Vercel y Neon, `audit_events` y las
métricas de `/api/platform/metrics`.

## 2. Contención (primeros 30 minutos)

1. **No borrar evidencias**: exportar los `audit_events` del periodo
   sospechoso (`GET /api/communities/:id/audit-events`).
2. **Revocar sesiones**: en Neon SQL Editor:
   `DELETE FROM "session";` (a todos los usuarios les pide volver a
   entrar).
3. **Rotar secretos** si hay sospecha de fuga, en este orden:
   - `AUTH_SECRET` (invalida cookies): generar uno nuevo y redeploy.
   - `DATABASE_URL` si se filtró (rotar contraseña en Neon).
   - `RESEND_API_KEY` y `BLOB_READ_WRITE_TOKEN` desde sus paneles.
   - Tras rotar: redeploy de la API (`vercel redeploy`).
4. **Si el atacante es una cuenta de la plataforma**: vaciar
   `PLATFORM_ADMIN_EMAILS` (dejarlo sin valor) y redeploy.
5. **Neon**: si hay datos corrompidos, crear rama de punto de
   restauración desde el panel de Neon (puntos diarios) y migrar
   `DATABASE_URL` a la rama restaurada.

## 3. Comunicación

- Avisar a los presidentes de las comunidades afectadas desde la
  plataforma (aviso con lenguaje llano, sin tecnicismos ni alarmismo).
- Si hay datos personales afectados: evaluar con asesoría jurídica la
  notificación a la AEPD (plazo reglamentario de 72 h desde el
  conocimiento del incidente) y a los interesados.
- Registrar la línea temporal completa del incidente.

## 4. Restauración y verificación

1. Restaurar desde la copia si procede:
   `pnpm --filter @comunidad/api db:restore -- backups/<archivo>.json`
   (previamente `pnpm db:migrate` si el esquema cambió).
2. Verificar: `GET /api/health`, registro/login, listado de una
   comunidad y una descarga con URL firmada.
3. Comprobar métricas en `/api/platform/metrics`.

## 5. Post-mortem (obligatorio)

Documento breve en `docs/incidents/` con: línea temporal, causa raíz,
qué funcionó mal, cambios aplicados (código/PR) y medidas preventivas.
Sin señalar culpables: el objetivo es que no vuelva a ocurrir.

## Copias de seguridad (soporte del runbook)

-  `pnpm --filter @comunidad/api db:backup` → JSON con todos los
   datos en `apps/api/backups/` (carpeta ignorada por git: **no se
   suben datos de vecinos al repositorio**).
-  Guardar copias fuera de Vercel/Neon (disco propio o similar).
-  Probar la restauración periódicamente sobre una base de prueba:
   `pnpm --filter @comunidad/api db:restore -- backups/<archivo>.json`.
-  Las copias de Neon (puntos diarios) son la primera línea; esta
   exportación es la red de seguridad independiente y portable.
