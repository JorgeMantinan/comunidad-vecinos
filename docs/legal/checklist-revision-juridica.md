# Checklist de revisión jurídica

> Para tenerlo todo en una sola pantalla antes de enviarlo al asesor.
> El detalle y el texto están en los documentos de esta carpeta.
> Estado: **A y B completados (26/10/2026)** · **falta la revisión C**
> (asesor) y los **pasos finales E**. **Ningún documento publicado.**

## A. Datos del responsable — ✅ rellenado

| # | Qué | Valor |
| - | --- | ----- |
| A1 | Responsable | **Jorge Mantiñán Montero**, a título particular (sin empresa ni alta de autónomo) |
| A2 | NIF y domicilio | **No se publican** (el repositorio es público): están en `datos-responsable.local.md`, archivo **no versionado** en `.gitignore` |
| A3 | Contacto de privacidad | `jorgemantinanmontero@gmail.com` — el mismo que muestra `/legal` (`VITE_LEGAL_CONTACT_EMAIL`) |
| A4 | Delegado de Protección de Datos | **No designado** (no obligatorio en este proyecto) |
| A5 | Fecha de la primera versión | 26/10/2026 (v1.0) |

> **Si algún día hay que publicar el domicilio** (si el asesor lo
> considera obligatorio), usar una dirección distinta de la particular:
> un local, la administración que actúe por usted o un apartado postal.

## B. Decisiones del responsable — ✅ tomadas

| # | Decisión | Valor |
| - | -------- | ----- |
| B1 | Custodia de las copias | El responsable, en su equipo **más** el almacén privado de Vercel (rotación de 30 días) |
| B2 | Baja asistida cuando la app bloquea | **Sí**: manual, a petición por escrito y con registro. Para el asesor: ¿disolver la comunidad o solo borrar la cuenta? |
| B3 | Marca temporal | **Nivel 1** (interno, gratis) + **nivel 2** (huella por correo). Nivel 3 solo si un tercero exige sello cualificado |
| B4 | Correos | Modo test de Resend: solo llegan a tu bandeja (sin dominio). Ya asumido en los documentos |

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
