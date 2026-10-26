# Política de privacidad — Mantivecinos

> **Documento listo para publicar**, con los datos del responsable ya
> rellenados. Falta la **validación del asesor jurídico** antes de
> publicarlo en la aplicación. Estado: **no publicado, pendiente de
> revisión humana** (`docs/legal/checklist-revision-juridica.md`).
>
> Este repositorio es **público**: por seguridad no constan aquí el NIF
> ni el domicilio (están en un archivo no versionado). La identidad y
> un canal de contacto son suficientes para ejercer los derechos.

**Última actualización:** 26 de octubre de 2026 (versión 1.0)

## 1. Responsable del tratamiento

| Campo | Valor |
| ----- | ----- |
| Responsable | Jorge Mantiñán Montero (a título particular) |
| NIF | No publicado: se facilita por el canal de contacto cuando proceda |
| Domicilio | No publicado: las notificaciones se reciben por el canal de contacto |
| Contacto de privacidad | `jorgemantinanmontero@gmail.com` |
| Delegado de Protección de Datos | No designado (no obligatorio en este proyecto) |

## 2. Qué es este servicio

Mantivecinos es una aplicación de gestión para comunidades de
propietarios (administraciones de fincas, juntas y vecinos). El servicio
prestado a la comunidad incluye el tratamiento de los datos de las
personas que se registran y de las personas cuya información gestiona
la comunidad (miembros, titulares de viviendas y personas de contacto).

**No se toman decisiones automatizadas sobre las personas ni se elaboran
perfiles.** Tampoco se utiliza inteligencia artificial en el tratamiento
de datos (ver `docs/decisions/006-sin-inteligencia-artificial.md`): las
estadísticas que muestra la aplicación son consultas agregadas sobre los
propios datos de la comunidad, sin inferencias sobre personas.

## 3. Finalidades y bases jurídicas

| Finalidad | Base jurídica (art. 6 RGPD) |
| --------- | ---------------------------- |
| Alta y gestión de cuentas (registro, acceso, sesión) | Ejecución de un contrato o aplicación de medidas precontractuales (art. 6.1.b) |
| Gestión de la comunidad: miembros, roles, invitaciones, reuniones, actas, acuerdos, incidencias, tareas | Ejecución del contrato con la comunidad (art. 6.1.b) y, para los datos de terceros mencionados en actas, interés legítimo de la comunidad (art. 6.1.f) |
| Gestión económica: gastos, facturas, derramas, cuotas y exportaciones | Ejecución del contrato (art. 6.1.b) y obligaciones contables y fiscales (art. 6.1.c) |
| Custodia de documentos (actas, contratos, fotos de incidencias) | Ejecución del contrato (art. 6.1.b) |
| Comunicaciones por correo (invitaciones y notificación de avisos) | Ejecución del contrato (art. 6.1.b) para el correo transaccional |
| Seguridad, prevención del abuso y registro de auditoría | Interés legítimo (art. 6.1.f) |
| Copias de seguridad y continuidad del servicio | Interés legítimo (art. 6.1.f) y obligaciones legales (art. 6.1.c) |
| Espacios de publicidad (patrocinios) | Consentimiento del anunciante, que **no** accede a datos de vecinos |

La base para los datos de personas que no son clientes del servicio
(titulares mencionados en documentación de la comunidad) es el interés
legítimo de la comunidad en su propia gestión, con información previa y
derecho de oposición.

## 4. Qué datos se tratan

-  **Cuenta:** nombre, dirección de correo electrónico y contraseña
   **cifrada** (nunca se almacena en texto plano).
-  **Comunidad:** nombre y dirección de la finca, unidades y roles.
-  **Gestión:** miembros, invitaciones, reuniones, actas, acuerdos,
   incidencias, tareas, gastos, cuotas, documentos y encuestas.
-  **Trazas de seguridad:** eventos de auditoría (autor, fecha y tipo de
   operación) sin contenido de documentos.

No se piden datos de facturación de los vecinos, datos de salud,
ideología ni otras categorías especiales (art. 9). No se compran ni se
venden datos personales.

## 5. Destinatarios, encargados y transferencias

| Proveedor | Uso | Ubicación |
| --------- | --- | --------- |
| **Vercel Inc.** | Alojamiento web y ejecución de la API | Fráncfort, UE (`fra1`) |
| **Neon Inc.** (PostgreSQL) | Base de datos | Región configurada en producción (`eu-west-2`, Reino Unido) |
| **Vercel Blob** | Almacenamiento de archivos privados (actas, facturas, fotos) | Fráncfort, UE (`fra1`) |
| **Resend Inc.** | Envío de correos transaccionales (invitaciones y avisos) | Estados Unidos (proveedor de correo). **En modo test solo se entrega a la cuenta de la persona responsable**: no hay envíos a terceros |

Todos ellos actúan como **encargados** del tratamiento, con contrato de
encargo conforme al art. 28 RGPD. Las transferencias internacionales se
amparan en las **cláusulas contractuales tipo** de la Comisión Europea y
en las decisiones de adecuación correspondientes; debe completarse el
**registro de transferencias** (ver `registro-de-tratamientos.md`).

Los anunciantes en los espacios de publicidad **no** son encargados ni
destinatarios: no reciben credenciales ni acceden a datos de vecinos.

## 6. Plazos de conservación

| Dato | Plazo |
| ---- | ----- |
| Cuenta de usuario | Mientras exista la cuenta; borrado a solicitud |
| Membresías e invitaciones caducadas | 90 días tras baja o revocación |
| Actas y acuerdos | Vigencia de la comunidad (histórico) |
| Facturas y registros económicos | Plazo legal contable (≈ 6 años) |
| Eventos de auditoría | 24 meses |
| Copias de seguridad | 30 días, con borrado coordinado |

Detalle y aplicación práctica en `docs/privacy-and-retention.md`.

## 7. Derechos de las personas interesadas

Puedes ejercer los derechos de **acceso, rectificación, supresión
(«derecho al olvido»), oposición, limitación del tratamiento y
portabilidad**, así como retirar el consentimiento en cualquier momento
cuando el tratamiento se base en él.

-  **Cómo:** correo electrónico a `jorgemantinanmontero@gmail.com`
   indicando el derecho que ejerces y el dato al que se refiere.
-  **Plazo de respuesta:** un mes desde la recepción, ampliable por dos
  meses en casos complejos, con notificación previa.
-  **Identificación:** se pedirá la verificación razonable de la
  identidad del solicitante (el correo de la cuenta suele bastar).
-  **Procedimiento operativo completo:** `docs/legal/arsul.md`.
-  Si no quedas conforme, puedes reclamar ante la **Agencia Española
  de Protección de Datos** ([www.aepd.es](https://www.aepd.es)),
  C/ Jorge Juan 6, 28001 Madrid.

**Nota:** el borrado puede ser parcial: los datos que deban conservarse
por obligación legal (registros económicos contables) se anonimizan en
lugar de eliminarse.

## 8. Medidas de seguridad

-  Cifrado en tránsito (HTTPS/TLS) y cabeceras de seguridad en
   producción (HSTS, `X-Content-Type-Options`, política de contenidos).
-  Contraseñas con hash (Better Auth); nunca en texto plano.
-  **Aislamiento por comunidad:** ningún dato privado se consulta sin
   autorización previa de la comunidad a la que pertenece.
-  Control de acceso por roles (vecino, administrador, presidente).
-  Registro de auditoría sobre datos sensibles.
-  Copias de seguridad diarias (puntos de restauración del proveedor de
   base de datos) más exportación propia con borrado a los 30 días.
-  Archivos privados servidos solo con URL firmada de corta duración.
-  Limitación de peticiones contra abuso y auditoría de seguridad
   periódica.

## 9. Cookies

La aplicación solo utiliza la **cookie de sesión** técnica, imprescindible
para mantener al usuario autenticado (emitida con `Secure` y
`SameSite` adecuados en producción). **No** se instalan cookies
analíticas, de publicidad conductual ni de terceros con seguimiento. Los
espacios de publicidad muestran creatividades estáticas del anunciante.

## 10. Cambios en esta política

Cualquier modificación relevante se comunicará por correo electrónico a
las cuentas activas o mediante aviso destacado en la aplicación, con al
menos 15 días de antelación cuando el cambio afecte a
finalidades o destinatarios.

---

### Pendiente de validación por el asesor

1. Identidad y datos del responsable (sección 1).
2. Designación, en su caso, de Delegado de Protección de Datos.
3. Región definitiva de los proveedores y **registro de transferencias
   internacionales** (sección 5).
4. Base jurídica aplicable a las actas y a los datos de terceros
   mencionados en ellas.
5. Plazo de conservación de los registros económicos (confirmar el
   plazo contable aplicable).
6. Envío de comunicaciones comerciales de patrocinios: confirmar que se
   resuelve con la opción «no soy anunciante» del contrato de patrocinio
   o si se requiere consentimiento específico.
7. Traducción/marcaje de versión en inglés, si se ofrecen a usuarios de
   otros Estados miembros.
