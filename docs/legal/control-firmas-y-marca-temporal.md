# Control de firmas y marca temporal

> Complemento operativo de la documentación de `docs/legal/`. **No
> sustituye la revisión del asesor**: fija cómo se deja constancia de
> quién firmó qué versión y cuándo, y cómo se demuestra después esa
> fecha.

## 1. Qué documento se firma

Cada plantilla de `docs/legal/` se cierra en una **versión concreta**
cuando se publica o se aprueba internamente:

| Documento | Versión | Quién firma |
| --------- | ------- | ----------- |
| `politica-de-privacidad.md` → PDF | `[v1.0]` | Responsable del tratamiento |
| `registro-de-tratamientos.md` → PDF | `[v1.0]` | Responsable del tratamiento |
| `arsul.md` → PDF | `[v1.0]` | Responsable + `[PLACEHOLDER: asesor]` |

Regla: **cambio de texto = versión nueva = firma nueva**. Una revisión
solo cosmética (espacios, formato) no cambia la versión; cualquier
cambio de fondo sí (v1.0 → v1.1).

## 2. Registro de firmas

Tabla que se mantiene junto a los PDF firmados (carpeta
`docs/legal/firmas/` o el gestor interno):

| Versión | Documento | Fecha de firma | Firmante | Huella SHA-256 del PDF | Sello de tiempo / referencia | Archivo |
| ------- | --------- | -------------- | -------- | ---------------------- | ---------------------------- | ------- |
| v1.0 | Política de privacidad | `[AAAA-MM-DD]` | `[nombre y cargo]` | `[64 caracteres]` | `[referencia]` | `privacidad-v1.0.pdf` |
| v1.0 | Registro de tratamientos | `[AAAA-MM-DD]` | `[nombre y cargo]` | `[64 caracteres]` | `[referencia]` | `registro-tratamientos-v1.0.pdf` |
| v1.0 | Procedimiento ARSUL | `[AAAA-MM-DD]` | `[nombre y cargo]` | `[64 caracteres]` | `[referencia]` | `arsul-v1.0.pdf` |

## 3. Huella (integridad)

La huella demuestra que el PDF no se ha tocado después de firmarlo.

```powershell
# PowerShell (Windows)
Get-FileHash .\privacidad-v1.0.pdf -Algorithm SHA256 | Select-Object -ExpandProperty Hash
```

```bash
# macOS / Linux
sha256sum privacidad-v1.0.pdf
```

Se anota la huella en el registro **en el mismo momento** en que se
guarda el PDF firmado.

## 4. Marca temporal: tres niveles

| Nivel | Cómo | Fuerza | Coste |
| ----- | ---- | ------ | ----- |
| **1. Registro interno** | Fila en el registro de firmas con fecha, huella y responsable | Evidencia interna | Gratis |
| **2. Constancia por correo** | Enviar la huella por correo a la propia cuenta: la cabecera `Date` fija una fecha | Refuerzo sencillo | Gratis |
| **3. Sello de tiempo cualificado** | Servicio cualificado (por ejemplo con DNIe/`@firma` o proveedor de sello de tiempo) que envuelve la huella con una fecha certificada | Prueba con valor frente a terceros | `[PLACEHOLDER: coste del proveedor]` |

**Recomendación del asesor** `[PLACEHOLDER]`: nivel 1 para todas las
versiones; nivel 3 para el documento que se vaya a aportar a
terceros (administración, banco, juzgado).

## 5. Procedimiento paso a paso

1.  Cerrar el texto de la plantilla y poner la versión en la cabecera.
2.  Exportar a PDF (`politica-de-privacidad-v1.0.pdf`).
3.  Firmar a mano (o con certificado) en la hoja
    `docs/legal/A4-LIMPIA-para-firmas.docx` impresa, o en el propio PDF
    con certificado.
4.  Calcular la huella SHA-256 del PDF **tal como se archiva**.
5.  Apuntar la fila en el registro de firmas (sección 2).
6.  Guardar el PDF en `docs/legal/firmas/` (los PDF firmados con datos
    identificativos **no se suben al repositorio público**: van al
    almacenamiento privado o al gestor interno).
7.  Si procede, sellar el PDF (nivel 3) y anotar la referencia del
    sello.

## 6. Comprobación posterior

Para verificar que un archivo no se ha modificado:

```powershell
(Get-FileHash .\privacidad-v1.0.pdf -Algorithm SHA256).Hash -eq '<huella del registro>'
```

Si la huella coincide, el documento es el que se firmó.

## 7. Antes de publicar

-  [ ] Versión fijada en la cabecera de cada documento.
-  [ ] PDF exportado y firmado por el responsable.
-  [ ] Huella SHA-256 calculada y anotada en el registro.
-  [ ] Registro de firmas completado.
-  [ ] Decidido el nivel de marca temporal (y contratado si aplica).
-  [ ] Copia del PDF archivada fuera del repositorio público.
