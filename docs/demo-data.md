# Datos de demostración

Cargas de datos **ficticios** para revisar cómo se ven los paneles con
la información típica de una comunidad real. Jamás se usan datos
reales de vecinos (regla de oro del repositorio).

## Qué incluye

Tres comunidades con todo el relleno de sus paneles:

| Comunidad | Viviendas | Destacado |
| --------- | --------- | --------- |
| Comunidad Calle Mayor 12 (Madrid) | 10 | 4 avisos, 3 juntas (una con acta y 3 acuerdos), 12 gastos, 6 facturas, una derrama de 4.800 € cobrada al 70 %, 5 incidencias, 8 tareas, 4 sugerencias, 2 encuestas con votos, 7 profesionales, 7 elementos, 5 contratos, 5 documentos y 3 plantillas |
| Urbanización El Pinar (Sevilla) | 12 | 3 avisos, 2 juntas, 8 gastos, 4 facturas, derrama de fondo de reserva, 3 incidencias, 5 tareas, 3 sugerencias, 1 encuesta abierta, 5 profesionales, 4 contratos |
| Edificio Las Acacias (Valencia) | 8 | Reforma de fachada con derrama de 31.200 €, cuota actualizada, 2 juntas con acuerdos aprobados, 7 gastos, 4 facturas, 3 incidencias, 5 tareas, 3 sugerencias, 6 profesionales, 4 contratos |

Además:

-  **11 cuentas** (presidencias, administración, vecinos y una cuenta
   de publicidad de plataforma) con la misma contraseña.
-  **3 invitaciones pendientes** con enlace de aceptación funcional y
   1 revocada.
-  **3 patrocinios** (2 activos y 1 pendiente) asignados a
   comunidades, visibles en el panel de publicidad.
-  **Eventos de auditoría** repartidos en el tiempo para que
   «Actividad reciente» tenga contenido.
-  **Documentos reales** subidos al almacén privado (se descargan con
   URL firmada como cualquier otro).

## Credenciales

Contraseña de **todos** los usuarios: `Vecino1234!`

| Email | En qué comunidades |
| ----- | ------------------ |
| `elena.presidenta@demo.local` | Calle Mayor 12 (propietaria) |
| `ana.administradora@demo.local` | Las tres (administración) |
| `vicente.vecino@demo.local` | Calle Mayor 12 + El Pinar (residente) |
| `lucia.residente@demo.local` | Calle Mayor 12 (residente) |
| `pablo.presidente@demo.local` | El Pinar (propietario) |
| `rosa.vecina@demo.local` · `miguel.vecino@demo.local` | El Pinar |
| `carmen.presidenta@demo.local` | Las Acacias (propietaria) |
| `luis.vecino@demo.local` · `nuria.residente@demo.local` | Las Acacias |
| `plataforma@demo.local` | Ninguna; accede al panel de publicidad (incluida en `PLATFORM_ADMIN_EMAILS`) |

La cuenta real del proyecto (`produccion@ejemplo.local` y la del
propietario del despliegue) **no se toca**: el script solo reconoce sus
propias comunidades por nombre y sus propios correos por el dominio
`@demo.local`.

## Cómo cargarlas / quitarlas

```bash
# Carga (usa DATABASE_URL de apps/api/.env; sube los documentos si hay
# BLOB_READ_WRITE_TOKEN en el entorno)
pnpm --filter @comunidad/api db:seed:demo

# Elimina exactamente lo que creó (comunidades, usuarios y patrocinios)
pnpm --filter @comunidad/api db:seed:demo -- --clean
```

El script es **idempotente**: si detecta cuentas `@demo.local` ya
creadas, no vuelve a cargar nada.

## Invitaciones pendientes

Cada invitación pendiente se imprime con su enlace
(`https://mantivecinos.vercel.app/invite/<token>`); el token solo se
conoce en el momento de la carga, igual que en el producto.

## Avisos

-  Todo el contenido es inventado: nombres, direcciones, importes,
   teléfonos y correos (`*.local`) son ficticios.
-  Está pensado para **revisar la interfaz**, no para convivir con datos
   reales: antes de recibir comunidad real, ejecuta `--clean`.
