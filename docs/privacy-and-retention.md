# Privacidad y retención

Pendiente de revisión jurídica antes de alojar datos reales. Este
documento fija las bases técnicas alineadas con el RGPD y la LOPDGDD.

## Principios

1.  **Minimización:** solo se piden los datos necesarios para operar la
    comunidad (nombre, email, vivienda). No se piden datos de facturación
    a los vecinos.
2.  **Finalidad:** los datos de una comunidad solo se usan para la
    gestión de esa comunidad. Los patrocinios no acceden a datos de
    vecinos ni a quién solicita servicios.
3.  **Acceso restringido:** actas, facturas y documentación sensible se
    limitan por rol y comunidad; cada descarga se autoriza en el momento.
4.  **Registro:** las acciones sobre datos sensibles quedan en
    `audit_events` con actor, fecha y tipo de operación.

## Derechos de las personas interesadas

La plataforma debe permitir atender solicitudes de acceso,
rectificación, limitación, portabilidad y supresión. La supresión
implica anonimización de los datos que deban conservarse por obligación
legal (ej. registros económicos), no solo borrado físico.

## Ciclo de vida de los datos

| Dato | Retención propuesta |
| ---- | ------------------- |
| Cuenta de usuario | Mientras exista la cuenta; borrado a solicitud |
| Membresías e invitaciones caducadas | 90 días tras baja o revocación |
| Actas y acuerdos | Vigencia de la comunidad (histórico) |
| Facturas y registros económicos | Plazo legal contable (≈6 años) |
| Eventos de auditoría | 24 meses |
| Copias de seguridad | 30 días, con borrado coordinado |

## Copias de seguridad y portabilidad

-  Exportaciones periódicas de PostgreSQL fuera del proveedor principal.
-  Copias de documentos y procedimientos de restauración versionados y
   probados periódicamente.
-  Ruta de migración a otro proveedor documentada (el vendor lock-in no
   debe ser un riesgo irreversible).

## Proveedores

Antes de producción: registrar proveedores, ubicación de los datos,
subencargados y transferencias internacionales. Priorizar proveedores
con datos en la UE.

## Pendiente

-  Documento de privacidad para usuarios finales.
-  Registro de tratamiento de actividades.
-  Procedimiento operativo de atención de solicitudes ARSUL.
