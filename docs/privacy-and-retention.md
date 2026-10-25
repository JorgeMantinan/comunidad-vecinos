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

-  **Mantenimiento automático semanal**: Vercel Cron llama a
   `GET /api/cron/maintenance` **los domingos a las 03:00** (autorizado
   con la variable `CRON_SECRET`) y hace dos cosas en la misma
   ejecución —así no se gasta el segundo cron de Hobby—:
   1. **Purga por retención** (lo mismo que `db:purge`).
   2. **Copia de seguridad** al **almacén privado** —en Vercel el disco
      de la función es temporal— bajo `backups/`, borrando las de
      **más de 30 días**.
   Con volcados de ~150 KB y 4-5 ficheros vives el coste es de
   centavos: dentro de las cuotas gratuitas.
-  **Exportación manual**: `pnpm --filter @comunidad/api db:backup`
   vuelca todas las tablas a JSON versionado en `apps/api/backups/`
   (ignorado por git: los datos nunca suben al repositorio). Útil para
   llevarse una copia fuera de Vercel/Neon.
-  **Restauración probada**: `pnpm --filter @comunidad/api db:restore
   -- backups/<archivo>.json` sobre una base recién migrada; existe un
   test de ida y vuelta en la suite (`backup.test.ts`).
-  **Purga por retención**: ya no es manual — se ejecuta sola cada
   domingo en el cron (arriba). Para forzarla cuando se quiera:
   `pnpm --filter @comunidad/api db:purge` aplica la tabla «Ciclo de
   vida de los datos» (invitaciones caducadas > 90 días; auditoría >
   24 meses) y es idempotente.
-  Puntos de restauración de **Neon** (primera línea: el plan gratuito
   solo conserva **6 horas**, por eso la copia semanal aporta
   cobertura real) y esta exportación como red de seguridad
   independiente y portable.
-  Ruta de migración a otro proveedor documentada (el vendor lock-in no
   debe ser un riesgo irreversible).

## Proveedores

| Servicio | Uso | Notas |
| -------- | --- | ----- |
| **Vercel Blob** (tienda `mantivecinos-eu`, región `fra1`, Fráncfort) | Documentación privada y fotos de incidencias (`access: 'private'`) | Binarios nunca en la BD; descarga solo con URL firmada de 10 min; token en variables de entorno de Vercel |
| **Neon** (región `eu-west-2`, Reino Unido) | PostgreSQL | Migraciones exclusivamente desde el repositorio |
| **Vercel Functions** (región `fra1`, Fráncfort) | API y frontend | Cookies de sesión `SameSite=None; Secure` en producción |
| **Resend** | Correo transaccional (invitaciones y avisos) | Clave en variables de entorno; en modo test solo admite el correo de la cuenta; sin dominio verificado no se envía a terceros |

**Publicidad (patrocinios):** los anunciantes no son usuarios de la
plataforma: no reciben credenciales ni acceden a datos de vecinos, a
quién solicita servicios o a métricas individuales. La interfaz muestra
su espacio siempre etiquetado como «Publicidad», separado de las
recomendaciones vecinales.

**Selección por cercanía (sin geolocalización externa):** el anunciado
puede indicar una **zona** (ciudad o barrio, p. ej. `Valencia, Rusafa`).
El servidor la compara con la dirección de la finca y muestra el anuncio
en las comunidades de esa zona, además de las asignadas a mano. El
cruce ocurre **solo en el servidor**: el anunciante no recibe la
dirección ni sabe en qué comunidades se le muestra, y la zona no permite
identificar a ninguna persona.

Antes de producción: registrar proveedores, ubicación de los datos,
subencargados y transferencias internacionales. **Regiones en Europa:**
funciones (`fra1`), almacén de archivos (`fra1`) y base de datos
(`eu-west-2`, Reino Unido con decisión de adecuación). Queda pendiente
de revisión la ubicación de Resend (correo).

## Documentación legal (plantillas pendientes de revisión)

Los tres documentos que estaban marcados como «pendiente» existen ya
como plantillas listas para que el asesor las revise y complete. Ninguno
está publicado todavía:

-  **Política de privacidad** para personas usuarias:
   [`docs/legal/politica-de-privacidad.md`](legal/politica-de-privacidad.md)
-  **Registro de actividades de tratamiento** (art. 30 RGPD):
   [`docs/legal/registro-de-tratamientos.md`](legal/registro-de-tratamientos.md)
-  **Procedimiento operativo ARSUL** (derechos de las personas
   interesadas): [`docs/legal/arsul.md`](legal/arsul.md)

Mientras no se publiquen, este documento sigue siendo la referencia
técnica interna.

## Pendiente

-  **Correo (Resend)**: el adaptador está implementado
   (`apps/api/src/lib/email.ts` + plantillas de invitación **y de
   avisos**) y se activa solo al definir `RESEND_API_KEY` (+ `EMAIL_FROM`
   con el remitente verificado). Sin clave, el envío se omite con aviso
   y el enlace sigue disponible en la interfaz. En modo test de Resend
   solo se entrega a la dirección de la cuenta; al publicar un aviso se
   notifica a todos los miembros excepto al autor.
-  **Validación humana** de los tres documentos de `docs/legal/` antes
   de publicarlos en la aplicación.
