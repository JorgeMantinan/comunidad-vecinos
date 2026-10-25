# Procedimiento ARSUL — atención de solicitudes de personas interesadas

> **Plantilla operativa para revisión jurídica.** Recoge cómo se recibe,
> atiende y responde cada solicitud de derechos (Acceso, Rectificación,
> Supresión, Uso oposición, Limitación y Portabilidad). Los campos
> `[PLACEHOLDER]` se completan con el responsable. Estado: **pendiente
> de validación humana**.

**Responsable:** `[PLACEHOLDER: nombre y contacto]`
**Canales de entrada:** `[PLACEHOLDER: email de privacidad]`
**Última revisión:** `[PLACEHOLDER]`

## 1. Principios

-  **Plazo:** un mes desde la recepción, ampliable dos meses más en
   casos complejos, avisando al solicitante dentro del primer mes.
-  **Gratuidad:** la primera copia es gratuita; si se piden más, solo se
   repercuten los costes efectivos.
-  **Forma:** se admite por escrito (correo electrónico basta). No se
   exige un formulario oficial.
-  **Identificación razonable:** verificar que quien solicita es la
   persona (el correo de la cuenta o un documento identificativo) sin
   recabar más datos de los necesarios.
-  **Registro:** toda solicitud queda anotada en el
   [registro de solicitudes](#7-registro-de-solicitudes) con fecha de
   entrada, tipo, plazo de respuesta y fecha de cierre.
-  **Silencio:** si no se contesta en plazo, el solicitante puede
   entender denegada su solicitud y reclamar a la AEPD.

## 2. Paso a paso

1.  **Recepción.** Llega al canal indicado. Se anota fecha y hora de
    entrada (ese es el día que arranca el plazo).
2.  **Registro y acuse.** Se responde acusando recibo en 3 días hábiles
    como máximo, indicando el plazo legal de un mes.
3.  **Identificación.** Si no queda clara la identidad del solicitante,
    se pide verificación (correo de la cuenta o documento). Se archiva
    sin conservar más datos de los necesarios.
4.  **Clasificación.**

   | Tipo | Qué hacer |
   | ---- | --------- |
   | **Acceso** | Facilitar copia de los datos que consten sobre la persona y su procedencia, plazos y destinatarios. |
   | **Rectificación** | Corregir los datos inexactos y comunicarlo a quien los haya recibido, si los hubiera. |
   | **Supresión** | Borrar los datos salvo obligación legal de conservarlos (en ese caso se anonimizan). |
   | **Oposición** | Cesar el tratamiento salvo que existan motivos imperativos o obligación legal. |
   | **Limitación** | Marcar los datos como «en revisión» y no tratarlos más que con consentimiento o reclamaciones. |
   | **Portabilidad** | Entregar los datos en formato estructurado y de uso común (JSON/CSV), si el tratamiento se basa en el contrato o el consentimiento. |
   | **Retirada de consentimiento** | Cesar el tratamiento basado en consentimiento sin que ello afecte a lo hecho con anterioridad. |

5.  **Localización de los datos.** Consultar dónde vive cada bloque
   (ver sección 4) y, si procede, pedir a `[PLACEHOLDER: responsable
   técnico]` la extracción.
6.  **Decisión y respuesta.** Respuesta escrita, clara y en castellano,
   con el detalle de las medidas adoptadas. Si se deniega, se exponen
   los motivos y la vía de reclamación ante la AEPD.
7.  **Cierre y registro.** Anotar fecha de respuesta y archivo de la
   documentación.

## 3. Supresión: qué se borra y qué se conserva

| Dato | Tratamiento ante una solicitud de supresión |
| ---- | -------------------------------------------- |
| Cuenta (nombre, email, contraseña) | Se borra la cuenta y las invitaciones pendientes |
| Membresías e invitaciones | Se eliminan con la cuenta |
| Actas y acuerdos en los que la persona aparezca | Se conservan (documento colegial de la comunidad): se sustituye la referencia por la unidad afecta |
| Registros económicos (gastos, cuotas, facturas) | Se conservan por obligación contable (≈ 6 años) y se **anonimizan** la referencia a la persona |
| Eventos de auditoría | Se conservan 24 meses con el actor anonimizado |
| Documentos subidos por la persona | Se descifran (borrado físico) si no son obligatorios legalmente |
| Copias de seguridad | El borrado llega al respaldo en un máximo de 30 días (ciclo de rotación) |

## 4. Dónde están los datos (mapa para responder)

| Bloque | Ubicación | Acceso |
| ------ | --------- | ------ |
| Cuentas, comunidades, membresías, unidades | PostgreSQL (Neon) | Consulta por `email` / `user_id` |
| Reuniones, actas, acuerdos | PostgreSQL | Por comunidad y miembro |
| Gastos, facturas, derramas y cuotas | PostgreSQL | Por comunidad y unidad |
| Incidencias, tareas, sugerencias, encuestas | PostgreSQL (los votos se exportan agregados) | Por comunidad |
| Documentos y fotografías | Almacenamiento de objetos privado (metadatos en PostgreSQL) | Borrado directo de la clave de almacenamiento |
| Correo transaccional | Resend | Según su política de retención `[PLACEHOLDER: verificar]` |
| Copias de seguridad | `apps/api/backups/` fuera del repositorio | Rotación de 30 días |

**Exportación de una comunidad (acceso/portabilidad):** los
administradores disponen de la exportación JSON de la comunidad
(`GET /api/communities/:id/export`). **Pendiente:** ampliarla a la
exportación individual que puede pedir cualquier persona interesada.

**Baja en la aplicación:** la interfaz incluye «Tu cuenta y tus datos →
Darme de baja» (`DELETE /api/account`), que exige contraseña y la frase
`ELIMINAR`. Elimina la cuenta, sus invitaciones y las comunidades en las
que la persona era el único miembro; en las comunidades con más vecinos
solo desaparece la membresía y el actor queda anónimo en la auditoría,
conservándose actas y registros económicos (sección 3). Si es la única
`owner` de una comunidad con otros miembros, la aplicación **bloquea la
baja** y pide transferir antes la presidencia. **[PLACEHOLDER —
decisión del asesor]** validar este criterio y, si procede, habilitar un
proceso excepcional de baja asistida.

## 5. Solicitudes de terceros mencionados en actas

Un propietario puede pedir la rectificación o supresión de datos suyos
que aparecen en actas o documentación aportada por otros. En ese caso:

-  Se informa de la base jurídica (interés legítimo de la comunidad en
   su gestión) y del derecho de oposición.
-  Se valora con `[PLACEHOLDER: asesor]` si procede ocultar el dato en
   documentos futuros sin alterar el histórico.

## 6. Escalado

-  Dudas de interpretación → `[PLACEHOLDER: asesor jurídico]`.
-  Reclamación del interesado → respuesta formal y, si procede,
  remisión a la AEPD (C/ Jorge Juan 6, 28001 Madrid,
  [www.aepd.es](https://www.aepd.es)).
-  Incidente de seguridad con datos personales → proceder según
  `docs/incident-response.md` y, si procede, notificar a la AEPD en
  72 horas.

## 7. Registro de solicitudes

| Fecha de entrada | Interesado | Tipo | Plazo de respuesta | Fecha de respuesta | Medidas adoptadas | Cerrada |
| ---------------- | ---------- | ---- | ------------------ | ------------------ | ----------------- | ------- |
| `[PLACEHOLDER]` | | | | | | |

> Este registro se mantiene fuera de la aplicación (hoja de cálculo o
> gestor interno) para no crear una nueva base de datos identificativa
> sin necesidad.

## 8. Comprobación técnica antes de publicar

-  [x] Canal de contacto publicado en la política de privacidad
      (`/legal`, contacto configurable con `VITE_LEGAL_CONTACT_EMAIL`).
-  [x] Exportación de datos: comunidad (owner/admin) **y personal**
      (`GET /api/account/export`), con botón en el panel.
-  [x] Baja de cuenta en la aplicación, probada con tests.
-  [x] Borrado de los archivos privados de las comunidades eliminadas
      (incluido en el proceso de baja).
-  [ ] Verificar que el borrado llega a los respaldos antes de los
      30 días de rotación.
-  [ ] Acuse de recibo automático o manual en 3 días hábiles.
-  [ ] Registro de solicitudes en marcha.
-  [ ] Personal formado: quién recibe, quién responde, quién escala.
