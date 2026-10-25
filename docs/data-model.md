# Modelo de datos

Estado actual: **identidad, comunidades, membresías e invitaciones** (Fase 1).
El resto de entidades son el mapa objetivo de fases posteriores.

Convenciones:

- IDs: `text` con prefijo del recurso (ej. `usr_`, `cm_`, `mem_`) o UUID según convenga; siempre generados en servidor.
- Todas las tablas de negocio privadas incluyen `community_id` y sus claves foráneas lo contienen, para impedir asociaciones entre comunidades distintas.
- Timestamps: `created_at` y `updated_at` con zona horaria UTC.
- Enumeraciones: tipos `text` con constraint `CHECK` (portables y revisables).

## Fase 1 (implementada)

### Identidad (Better Auth)

- `user` — usuarios de la plataforma (nombre, email verificado, imagen).
- `session` — sesiones activas (token, expiración, IP, agente).
- `account` — credenciales y proveedores vinculados (contraseña, OAuth futuro).
- `verification` — tokens de verificación y recuperación (enlaces mágicos, email).

### Comunidades

- `communities` — comunidad de propietarios: nombre, dirección, código corto.
- `community_memberships` — `(user_id, community_id, role)`; unicidad por par.
- `units` — viviendas/local de la comunidad (portal, número, coeficiente).
- `invitations` — invitación a una comunidad: email, rol inicial, token, caducidad, uso único, revocable.
- `audit_events` — registro de acciones críticas: actor, comunidad, acción, metadatos JSON, IP.

Roles (`community_memberships.role`):

| Valor               | Descripción                        |
| ------------------- | ---------------------------------- |
| `owner`             | Presidente/junta con plenos poderes |
| `admin`             | Administrador de fincas delegado    |
| `member`            | Propietario                         |
| `resident`          | Inquilino con acceso limitado       |

## Fase 2 (implementada)

-  `announcements` — avisos: título, contenido, autor, publicación y
   caducidad opcional (los caducados dejan de listarse).
-  `meetings` — reuniones: fecha/hora, lugar, estado
   (`planned`/`finished`/`cancelled`) y `minutes` (acta).
-  `meeting_agenda_items` — orden del día por reunión con posición.
-  `agreements` — acuerdos ligados a una reunión con estado
   (`proposed`/`approved`/`rejected`).
-  `expenses` — gastos comunes: importe decimal exacto, categoría,
   fecha del gasto y estados `registered`/`paid` con `paid_on`
   obligatorio cuando está pagado (constraint en BD).
-  `invoices` — facturas de proveedores: número único por comunidad,
   proveedor, importe, fecha de emisión y estados `received`/`paid`
   (documentos diferenciados de los gastos registrados).
-  `assessments` + `assessment_charges` — derramas: reparto del importe
   total entre las unidades por coeficiente, con cuotas por unidad
   (`pending`/`paid`) y `paid_on` obligatorio al cobrar. Los importes se
   guardan como *snapshot* (cambiar coeficientes no reescribe el
   histórico).

## Fase 3 (implementada — núcleo de participación)

-  `incidents` — incidencias: reportables por **cualquier miembro**
   (incluida la residente), estados `open`/`in_progress`/`resolved` con
   `resolved_at` obligatorio al resolver y limpio al reabrir.
-  `tasks` — tareas: vencimiento opcional, responsable validado como
   miembro de la comunidad, estados `todo`/`doing`/`done` y
   **vínculo opcional con un acuerdo** (`agreement_id`) para el
   seguimiento de acuerdos.
-  `suggestions` — sugerencias de cualquier miembro con revisión de la
   junta (`open`/`under_review`/`accepted`/`rejected`); solo el autor o
   la administración pueden eliminarlas.
-  `polls` + `poll_options` + `poll_votes` — encuestas informales **no
   vinculantes** con un voto por miembro (índice único `poll+user`),
   cierre manual o por fecha y recuentos por opción.
-  `assets` — inventario de elementos comunes: categoría, ubicación,
   estados `operational`/`maintenance`/`broken` y garantía opcional.
-  `maintenance_contracts` — contratos con proveedor, importe, ventana
   `start_on`→`renewal_on` (restricción en BD) y estados
   `active`/`ended`.
-  `professionals` — profesionales **recomendados por la comunidad**
   (recomendación vecinal; los patrocinios identificados llegan en la
   Fase 5 como entidad separada).

## Archivos privados (Vercel Blob)

-  `documents` — documentación privada: metadatos en BD (título,
   categoría, tipo MIME, tamaño, quién lo subió) y **binario en el
   almacén privado** `mantivecinos` (Vercel Blob `access: 'private'`).
   Cada descarga entrega una **URL firmada de 10 minutos**; nunca
   existen URLs públicas permanentes.
-  `incident_photos` — fotografías de incidencias: misma política;
   subida limitada a 3 MB y tipos MIME de imagen.

## Mapa objetivo (fases posteriores)

| Área           | Entidades                                                            |
| -------------- | -------------------------------------------------------------------- |
| Economía       | `budgets`, `payments`, `financial_periods`                           |
| Reuniones      | `votes` (escrutinios de acuerdos)                                    |
| Comunicación   | `notifications`                                                      |
| Profesionales  | `sponsorships` (publicidad identificada; Fase 5)                     |
| Profesionales  | `professionals`, `professional_services`, `community_recommendations`, `sponsorships` |
| Documentación  | `documents`, `document_versions`, `document_permissions`             |
| Seguridad      | `access_events`, `retention_policies`                                |

Reglas para el mapa objetivo:

- Diferenciar gasto registrado, factura recibida, presupuesto aprobado y pago realizado.
- Una derrama aprobada no equivale a dinero cobrado.
- Separar propuestas, votaciones y acuerdos definitivos.
- Separar gastos comunes e individuales salvo configuración explícita.
- Los archivos binarios viven en almacenamiento de objetos privado; en la tabla solo se guarda metadatos y referencia.
