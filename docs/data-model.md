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

## Mapa objetivo (fases posteriores)

| Área           | Entidades                                                            |
| -------------- | -------------------------------------------------------------------- |
| Economía       | `budgets`, `payments`, `financial_periods`                           |
| Reuniones      | `votes` (escrutinios de acuerdos)                                    |
| Mantenimiento  | `incidents`, `tasks`, `assets`, `maintenance_contracts`              |
| Comunicación   | `suggestions`, `polls`, `notifications`                              |
| Profesionales  | `professionals`, `professional_services`, `community_recommendations`, `sponsorships` |
| Documentación  | `documents`, `document_versions`, `document_permissions`             |
| Seguridad      | `access_events`, `retention_policies`                                |

Reglas para el mapa objetivo:

- Diferenciar gasto registrado, factura recibida, presupuesto aprobado y pago realizado.
- Una derrama aprobada no equivale a dinero cobrado.
- Separar propuestas, votaciones y acuerdos definitivos.
- Separar gastos comunes e individuales salvo configuración explícita.
- Los archivos binarios viven en almacenamiento de objetos privado; en la tabla solo se guarda metadatos y referencia.
