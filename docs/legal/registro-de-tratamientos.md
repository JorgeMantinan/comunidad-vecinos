# Registro de actividades de tratamiento (art. 30 RGPD)

> **Plantilla para revisión jurídica.** Refleja el tratamiento tal como
> está implementado hoy en el código (verificable en
> `docs/architecture.md`, `docs/data-model.md` y
> `docs/permissions-matrix.md`). Los campos `[PLACEHOLDER]` deben
> completarse. Estado: **pendiente de validación humana**.

**Responsable:** `[PLACEHOLDER: nombre, NIF, domicilio, contacto]`

**Fecha de elaboración:** `[PLACEHOLDER]` · **Última revisión:**
`[PLACEHOLDER]`

## 1. Cuentas y autenticación

| Campo | Contenido |
| ----- | --------- |
| Finalidad | Alta, autenticación y mantenimiento de la sesión de las personas usuarias |
| Base jurídica | Ejecución de contrato (art. 6.1.b) |
| Interesados | Personas usuarias registradas (vecinos, miembros de junta, administración) |
| Categorías de datos | Nombre, correo electrónico, contraseña cifrada, identificadores de sesión |
| Destinatarios | Vercel (API), Neon (base de datos) |
| Transferencias | `[PLACEHOLDER: revisar región de Vercel]` |
| Plazos | Vigencia de la cuenta + borrado a solicitud |
| Medidas | Hash de contraseña, cookies `Secure`/`SameSite`, limitación de peticiones, HTTPS |

## 2. Comunidades y membresías

| Campo | Contenido |
| ----- | --------- |
| Finalidad | Gestión de la comunidad: unidades, miembros, roles e invitaciones |
| Base jurídica | Ejecución de contrato (art. 6.1.b); interés legítimo de la comunidad para terceros mencionados |
| Interesados | Miembros de la comunidad, titulares de viviendas, personas invitadas |
| Categorías de datos | Nombre, correo, rol, unidad/participación, comunidad |
| Destinatarios | Vercel, Neon |
| Plazos | Vigencia de la comunidad; membresías e invitaciones caducadas: 90 días tras baja/revocación |
| Medidas | Aislamiento por comunidad en toda consulta, control por roles, registro de invitaciones |

## 3. Gestión económica

| Campo | Contenido |
| ----- | --------- |
| Finalidad | Gastos, facturas, derramas, cuotas, pagos y exportaciones |
| Base jurídica | Ejecución de contrato (art. 6.1.b) y obligaciones contables/fiscales (art. 6.1.c) |
| Interesados | Miembros, personas responsables de pagos, proveedores |
| Categorías de datos | Importes, conceptos, fechas, estado de pago, unidades |
| Destinatarios | Vercel, Neon, Vercel Blob (facturas) |
| Plazos | Plazo legal contable (≈ 6 años) para registros; el resto, vigencia de la comunidad |
| Medidas | Acceso restringido por rol, exportación limitada a administración, URLs de descarga firmadas de 10 minutos |

## 4. Documentos privados

| Campo | Contenido |
| ----- | --------- |
| Finalidad | Custodia de actas, contratos, modelos y fotografías de incidencias |
| Base jurídica | Ejecución de contrato (art. 6.1.b) |
| Interesados | Miembros y personas mencionadas en la documentación |
| Categorías de datos | Archivos aportados por la comunidad |
| Destinatarios | Vercel Blob (almacenamiento privado), Vercel (API) |
| Transferencias | Sin transferencia: almacén en la UE (`fra1`, Fráncfort) |
| Plazos | Vigencia de la comunidad (actas/contratos); borrado de fotos al cerrar la incidencia |
| Medidas | `access: private`, nunca en base de datos, URL firmada de corta duración, sin acceso directo público |

## 5. Comunicaciones por correo

| Campo | Contenido |
| ----- | --------- |
| Finalidad | Envío de invitaciones a comunidades y notificación de avisos publicados |
| Base jurídica | Ejecución de contrato (art. 6.1.b) — correo transaccional |
| Interesados | Miembros y personas invitadas |
| Categorías de datos | Correo, nombre de la comunidad, título y extracto del aviso |
| Destinatarios | Resend (encargado de envío) |
| Transferencias | `[PLACEHOLDER]` |
| Plazos | Hasta la baja en la comunidad; los mensajes en el proveedor se eliminan según su política `[PLACEHOLDER: verificar retención de Resend]` |
| Medidas | Sin credenciales ni tokens en el cuerpo del correo; sin envío si no hay clave configurada |

## 6. Seguridad y auditoría

| Campo | Contenido |
| ----- | --------- |
| Finalidad | Prevención del abuso, detección de incidentes y trazabilidad de operaciones sensibles |
| Base jurídica | Interés legítimo (art. 6.1.f) |
| Interesados | Personas usuarias |
| Categorías de datos | Identificador de autor, tipo de operación, recurso, fecha, resultado |
| Destinatarios | Vercel, Neon |
| Plazos | 24 meses (purga con `db:purge`) |
| Medidas | Acceso restringido al registro, no contiene contenido de documentos |

## 7. Copias de seguridad

| Campo | Contenido |
| ----- | --------- |
| Finalidad | Continuidad del servicio y recuperación ante incidentes |
| Base jurídica | Interés legítimo (art. 6.1.f) y obligaciones legales (art. 6.1.c) |
| Categorías de datos | Volcado completo de tablas a JSON |
| Destinatarios | Infraestructura de la comunidad `[PLACEHOLDER: responsable de custodia de `apps/api/backups/`]` |
| Plazos | 30 días, con borrado coordinado; puntos de restauración del proveedor de BD |
| Medidas | Ficheros fuera del repositorio (ignorados por git), prueba periódica de restauración |

## 8. Publicidad (patrocinios)

| Campo | Contenido |
| ----- | --------- |
| Finalidad | Publicación de espacios publicitarios de terceros en la aplicación |
| Base jurídica | Consentimiento del anunciante (art. 6.1.a) |
| Interesados | Anunciantes |
| Categorías de datos | Datos de contacto del anunciante y creatividades |
| Destinatarios | Vercel, Neon |
| Plazos | Vigencia del contrato de patrocinio |
| Medidas | **Los anunciantes no son usuarios de la plataforma:** sin credenciales y sin acceso a datos de vecinos ni a quién solicita servicios; espacios etiquetados como «Publicidad» |

## 9. Encargados del tratamiento

| Encargado | Servicio | Cláusulas | Registro de transferencias |
| --------- | -------- | --------- | -------------------------- |
| Vercel Inc. | Hosting y functions | `[PLACEHOLDER: DPA vigente]` | UE (`fra1`, Fráncfort) |
| Neon Inc. | PostgreSQL | `[PLACEHOLDER: DPA vigente]` | Reino Unido (`eu-west-2`, decisión de adecuación) |
| Resend Inc. | Correo transaccional | `[PLACEHOLDER: DPA vigente]` | `[PENDIENTE: EE. UU.]` |
| Vercel Blob | Almacenamiento de objetos | `[PLACEHOLDER: DPA vigente]` | UE (`fra1`, Fráncfort) |

## 10. Medidas de seguridad generales

-  Cifrado TLS en tránsito; cabeceras de seguridad en producción.
-  Hash de contraseñas; sin credenciales en el código (solo variables de
   entorno).
-  Autorización **siempre** verificada en el servidor, filtrando por
   comunidad autorizada (matriz en `docs/permissions-matrix.md`).
-  Control por roles (vecino / administrador / presidente / plataforma).
-  Registro de auditoría de operaciones sensibles.
-  Limitación de peticiones (rate limit) y revisión de seguridad
   periódica (`docs/security-review-2026-10.md`).
-  Purga automática por retención y exportación de datos portables.
