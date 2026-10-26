# Datos de demostración

Cargas de datos **ficticios** para revisar cómo se ven los paneles con
la información típica de una comunidad real. Jamás se usan datos
reales de vecinos (regla de oro del repositorio).

## Qué incluye

**Seis comunidades** con todo el relleno de sus paneles:

| Comunidad | Unidades | Destacado |
| --------- | -------- | --------- |
| Comunidad Calle Mayor 12 (Madrid) | 10 + 2 garajes + 1 trastero | 4 avisos, 3 juntas (acta y 3 acuerdos), 12 gastos, 6 facturas, derrama de 4.800 € cobrada al 70 %, 5 incidencias, 8 tareas, 4 sugerencias, 2 encuestas con votos, 7 profesionales, 5 contratos, 5 documentos, 3 tarifas |
| Urbanización El Pinar (Sevilla) | 12 + 2 garajes | 3 avisos, 2 juntas, 8 gastos, 4 facturas, derrama de fondo de reserva, 3 incidencias, 5 tareas, 3 sugerencias, encuesta abierta, 5 profesionales, 4 contratos, 2 tarifas |
| Edificio Las Acacias (Valencia) | 8 + 2 garajes | Reforma de fachada con derrama de 31.200 €, 2 juntas con acuerdos, 7 gastos, 4 facturas, 3 incidencias, 5 tareas, 3 sugerencias, 6 profesionales, 4 contratos, 2 tarifas |
| Edificio Sol Naciente (Zaragoza) | 8 + 2 garajes + 1 trastero | 3 avisos, junta con acta y 2 acuerdos (uno rechazado), 8 gastos, 4 facturas, derrama de 3.200 € cobrada al 50 %, 4 incidencias, 5 tareas, 3 sugerencias, encuesta abierta con votos, 5 profesionales, 4 elementos, 3 contratos, 3 documentos, 3 tarifas |
| Residencial Los Olivos (Bilbao) | 8 + 2 garajes | 3 avisos, 2 juntas (acta y acuerdo), 8 gastos, 4 facturas, derrama de 1.800 €, 4 incidencias, 5 tareas, 3 sugerencias, encuesta cerrada, 5 profesionales, 4 contratos, 2 tarifas |
| Comunidad Avenida del Puerto 8 (Alicante) | 6 + 2 garajes | Subida de cuota aprovada en junta con acta, 8 gastos, 4 facturas, derrama de 2.400 €, 4 incidencias, 5 tareas, 3 sugerencias, encuesta abierta, 5 profesionales, 4 contratos, 2 tarifas |

Además:

-  **17 cuentas** con la misma contraseña y **cada rol cubierto** en cada
   comunidad (junta, administración, propietario e inquilino).
-  **7 invitaciones pendientes** con enlace de aceptación funcional y
   1 revocada.
-  **4 patrocinios** con **zona** (Madrid, Sevilla / Valencia /
  Madrid / Zaragoza-Bilbao-Alicante): uno llega a comunidades que no
  están asignadas, para ver la selección por cercanía en acción.
-  **Tarifas y cuotas** de garaje y trastero con dos periodos generados
  (el anterior cobrado y el actual pendiente).
-  **Eventos de auditoría** y **documentos reales** en el almacén
  privado (se descargan con URL firmada).

## Credenciales

Contraseña de **todos** los usuarios: `Vecino1234!`

### Un correo por tipo de cuenta (para ver la app como cada uno)

| Tipo de cuenta | Correo | Qué ve al entrar |
| -------------- | ------ | ----------------- |
| **Junta / presidente** (`owner`) | `elena.presidenta@demo.local` | Calle Mayor 12 |
| | `pablo.presidente@demo.local` | El Pinar |
| | `carmen.presidenta@demo.local` | Las Acacias |
| | `isabel.presidenta@demo.local` | Sol Naciente |
| | `andres.presidente@demo.local` | Los Olivos |
| | `marta.presidenta@demo.local` | Avenida del Puerto 8 |
| **Administración de fincas / gestor** (`admin`) | `ana.administradora@demo.local` | **Las 6 comunidades** (el mejor correo para recorrerlo todo) |
| **Propietario** (`member`) | `tomas.vecino@demo.local` | Sol Naciente + Avenida del Puerto 8 |
| | `rosa.vecina@demo.local` | El Pinar + Sol Naciente |
| | `miguel.vecino@demo.local` | El Pinar + Los Olivos |
| | `luis.vecino@demo.local` | Las Acacias + Los Olivos |
| | `vicente.vecino@demo.local` | Calle Mayor 12 y Avenida del Puerto 8 como propietario, **El Pinar como inquilino** (para ver la misma persona con dos roles) |
| **Inquilino / residente** (`resident`) | `sofia.residente@demo.local` | Sol Naciente (sin acceso económico) |
| | `lucia.residente@demo.local` | Calle Mayor 12 + Avenida del Puerto 8 |
| | `nuria.residente@demo.local` | Las Acacias + Los Olivos |
| **Publicidad de plataforma** | `plataforma@demo.local` | Panel de Publicidad (en `PLATFORM_ADMIN_EMAILS`) |
| **Recién registrado sin comunidad** | `nuevo.vecino@demo.local` | Panel vacío («todavía no perteneces a ninguna comunidad») |

> **Lo que no ven:** los inquilinos (`resident`) no tienen acceso a la
> información económica (gastos, cuotas, derramas) ni a la actividad de
> auditoría; los propietarios (`member`) ven el dinero pero **no** la
> actividad de auditoría (eso es de junta y administración).

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
creadas, no vuelve a cargar nada (para rellenar de nuevo con la última
versión del seed: `--clean` y después la carga).

## Invitaciones pendientes

Cada invitación pendiente se imprime con su enlace
(`https://mantivecinos.vercel.app/invite/<token>`); el token solo se
conoce en el momento de la carga, igual que en el producto.

## Avisos

-  Todo el contenido es inventado: nombres, direcciones, importes,
   teléfonos y correos (`*.local`) son ficticios.
-  Está pensado para **revisar la interfaz**, no para convivir con datos
   reales: antes de recibir comunidad real, ejecuta `--clean`.
