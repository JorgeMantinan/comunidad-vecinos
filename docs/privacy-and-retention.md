# Privacidad y retención

Pendiente de revisión jurídica antes de alojar datos reales. Este
documento fija las bases técnicas alineadas con el RGPD y la LOPDGDD.

## Principios

1.  **Minimización:** solo se piden los datos necesarios para operar la
    comunidad (nombre, email, vivienda). No se piden datos de facturación
    a los vecinos.
2.  **Finalidad:** los datos de una comunidad solo se usan para la
    gestión de esa comunidad. Los patrocinios no acceden a datos de
    vecinos ni a quién solicita servicios.
3.  **Acceso restringido:** actas, facturas y documentación sensible se
    limitan por rol y comunidad; cada descarga se autoriza en el momento.
4.  **Registro:** las acciones sobre datos sensibles quedan en
    `audit_events` con actor, fecha y tipo de operación.

## Derechos de las personas interesadas

La plataforma debe permitir atender solicitudes de acceso,
rectificación, limitación, portabilidad y supresión. La supresión
implica anonimización de los datos que deban conservarse por obligación
legal (ej. registros económicos), no solo borrado físico.

## Ciclo de vida de los datos

| Dato | Retención propuesta |
| ---- | ------------------- |
| Cuenta de usuario | Mientras exista la cuenta; borrado a solicitud |
| Membresías e invitaciones caducadas | 90 días tras baja o revocación |
| Actas y acuerdos | Vigencia de la comunidad (histórico) |
| Facturas y registros económicos | Plazo legal contable (≈6 años) |
| Eventos de auditoría | 24 meses |
| Copias de seguridad | 30 días, con borrado coordinado |

## Copias de seguridad y portabilidad

-  **Exportación propia**: `pnpm --filter @comunidad/api db:backup`
   vuelca todas las tablas a JSON versionado (`apps/api/backups/`,
   ignorado por git: los datos nunca suben al repositorio). Guardar la
   copia fuera de Vercel/Neon.
-  **Restauración probada**: `pnpm --filter @comunidad/api db:restore
   -- backups/<archivo>.json` sobre una base recién migrada; existe un
   test de ida y vuelta en la suite (`backup.test.ts`).
-  **Purga por retención**: `pnpm --filter @comunidad/api db:purge`
   aplica la tabla «Ciclo de vida de los datos» (invitaciones
   caducadas > 90 días; auditoría > 24 meses) y es idempotente.
-  Puntos de restauración diarios de **Neon** (primera línea) y esta
   exportación como red de seguridad independiente y portable.
-  Ruta de migración a otro proveedor documentada (el vendor lock-in no
   debe ser un riesgo irreversible).

## Proveedores

| Servicio | Uso | Notas |
| -------- | --- | ----- |
| **Vercel Blob** (tienda `mantivecinos`, región `iad1`) | Documentación privada y fotos de incidencias (`access: 'private'`) | Binarios nunca en la BD; descarga solo con URL firmada de 10 min; token en variables de entorno de Vercel |
| **Neon** (región `eu-west-2`, Reino Unido) | PostgreSQL | Migraciones exclusivamente desde el repositorio |
| **Vercel Functions** | API y frontend | Cookies de sesión `SameSite=None; Secure` en producción |
| **Resend** | Correo transaccional (invitaciones) | Clave en variables de entorno; en modo test solo admite el correo de la cuenta; sin dominio verificado no se envía a terceros |

**Publicidad (patrocinios):** los anunciantes no son usuarios de la
plataforma: no reciben credenciales ni acceden a datos de vecinos, a
quién solicita servicios o a métricas individuales. La interfaz muestra
su espacio siempre etiquetado como «Publicidad», separado de las
recomendaciones vecinales.

Antes de producción: registrar proveedores, ubicación de los datos,
subencargados y transferencias internacionales. Priorizar proveedores
con datos en la UE (revisar la región del almacén de Blob: `iad1`,
EE. UU.).

## Pendiente

-  **Correo (Resend)**: el adaptador está implementado
   (`apps/api/src/lib/email.ts` + plantillas de invitación **y de
   avisos**) y se activa solo al definir `RESEND_API_KEY` (+ `EMAIL_FROM`
   con el remitente verificado). Sin clave, el envío se omite con aviso
   y el enlace sigue disponible en la interfaz. En modo test de Resend
   solo se entrega a la dirección de la cuenta; al publicar un aviso se
   notifica a todos los miembros excepto al autor.
-  Documento de privacidad para usuarios finales.
-  Registro de tratamiento de actividades.
-  Procedimiento operativo de atención de solicitudes ARSUL.
