# Checklist de revisión jurídica

> Para tenerlo todo en una sola pantalla antes de enviarlo al asesor.
> El detalle y el texto están en los cuatro documentos de esta carpeta;
> aquí solo se lista **qué falta, quién lo pone y dónde**.
> Estado: **ningún documento está publicado todavía**.

## A. Datos que pones tú (5 minutos)

| # | Qué | Dónde |
| - | --- | ----- |
| A1 | Nombre/razón social, NIF, domicilio y email de contacto | `politica-de-privacidad.md` §1 (tabla «Responsable») |
| A2 | Si hay Delegado de Protección de Datos (en la mayoría de proyectos: **no es obligatorio**) | `politica-de-privacidad.md` §1, última fila |
| A3 | Mismos datos del responsable y **fecha de elaboración** | `registro-de-tratamientos.md` cabecera |
| A4 | Responsable, **canal de entrada de solicitudes** y fecha | `arsul.md` cabecera |
| A5 | Fecha de la primera versión | `politica-de-privacidad.md` «Última actualización» |

**Coherencia con la app:** el contacto que se muestra en `/legal` sale de
la variable `VITE_LEGAL_CONTACT_EMAIL` (hoy
`jorgemantinanmontero@gmail.com`). Si cambias el correo en los
documentos, cambia también esa variable (o viceversa).

## B. Decisiones tuyas (no son jurídicas, son de producto)

| # | Qué decidir | Dónde |
| - | ----------- | ----- |
| B1 | Quién custodia las copias de seguridad fuera de Vercel/Neon (`apps/api/backups/` y el almacén) | `registro-de-tratamientos.md` §7 (copias) |
| B2 | Si permite la baja **asistida** excepcional cuando la app bloquea (único presidente de una comunidad con vecinos) | `arsul.md` §4 |
| B3 | Nivel de marca temporal que contratas: interno (gratis), por correo (gratis) o **sello cualificado** (de pago) | `control-firmas-y-marca-temporal.md` §4 |
| B4 | Aceptación del envío de correos en modo test (sin dominio: **solo llegan a tu bandeja**) | `politica-de-privacidad.md` §5 fila Resend |

## C. Revisión del asesor (el texto ya está escrito; solo valida o corrige)

| # | Qué valida | Dónde |
| - | ---------- | ----- |
| C1 | Bases jurídicas de cada finalidad (art. 6) y si basta el interés legítimo en las actas | `politica-de-privacidad.md` §3 y §4 |
| C2 | Tabla de encargados: **DPA vigente** de Vercel, Neon, Resend y Blob, y registro de transferencias | `registro-de-tratamientos.md` §9 |
| C3 | Plazos de conservación, en especial el contable (≈6 años) | `politica-de-privacidad.md` §6 y `registro-de-tratamientos.md` tablas |
| C4 | Redacción de los derechos, plazos (1 mes + 2) y vía ante la AEPD | `arsul.md` §1-§2 y `politica-de-privacidad.md` §7 |
| C5 | Caso de terceros mencionados en actas (¿ocultar el dato sin alterar el histórico?) | `arsul.md` §5 |
| C6 | Matriz de supresión: qué se borra y qué se anonimiza | `arsul.md` §3 |
| C7 | Los 7 puntos de «Pendiente de validación por el asesor» | `politica-de-privacidad.md` final |
| C8 | Quién firma cada documento | `control-firmas-y-marca-temporal.md` §1 |

## D. Ya hecho: no requiere revisión (solo verificar)

-  **Regiones en Europa**: funciones y almacén en `fra1` (Fráncfort),
   base de datos en `eu-west-2` (Reino Unido con decisión de
   adecuación). La única zona pendiente es **Resend** (EE. UU.).
-  **Derechos operativos**: exportación individual
   (`GET /api/account/export`) y baja de cuenta con contraseña y
   confirmación, probadas con tests.
-  **Publicidad**: los anunciantes no son usuarios, no ven datos de
   vecinos; la selección por zona se hace en el servidor.
-  **Sin IA** (ADR 006): ni perfiles ni decisiones automáticas.
-  **Cookies**: solo la de sesión; sin analítica ni publicidad conductual.

## E. Pasos finales (cuando el asesor devuelva el texto)

1.  Aplicar sus correcciones en los tres documentos.
2.  Exportar a PDF y **firmar** con `A4-LIMPIA-para-firmas.docx`.
3.  Anotar la fila en la tabla de `control-firmas-y-marca-temporal.md`
    (versión, fecha, firmante, **huella SHA-256**, sello si procede).
4.  Guardar el PDF firmado **fuera del repositorio público** (almacén
    privado o gestor interno).
5.  Actualizar el texto público de la aplicación: las páginas
    `apps/web/src/pages/legal.tsx` son un resumen escrito a mano y
    **deben sincronizarse con la política aprobada**.
6.  Publicar (por fin se pueden enlazar en el registro y en el pie).
