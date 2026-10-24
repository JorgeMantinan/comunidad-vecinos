---
name: privacy-and-retention
description: Datos personales, documentos privados, exportaciones y borrados. Usar al tratar información de vecinos o documentación sensible.
---

# Privacidad y retención

## Objetivo

Cumplir RGPD/LOPDGDD en el diseño técnico y minimizar el impacto de una
fuga o de una solicitud legítima de un vecino.

## Reglas

1.  **Minimización:** no pidas ni guardes datos que la funcionalidad no
   necesite. Nada de teléfonos, DNI o datos de familiares por defecto.
2.  **Datos ficticios en dev:** prohibido usar datos reales de vecinos
   en seeds, pruebas, demos o contexto de agentes de IA.
3.  **Documentos privados:** almacenamiento de objetos privado; cada
   descarga autorizada en el momento; URLs firmadas de duración limitada;
   nunca URLs públicas permanentes para actas o facturas.
4.  **Auditoría:** los accesos y cambios sobre datos sensibles quedan
   registrados con actor, fecha y acción.
5.  **Exportación:** los datos de una comunidad deben poder exportarse
   (derecho de portabilidad y salida del proveedor).
6.  **Supresión:** al eliminar una cuenta se anonimiza lo que deba
   conservarse por obligación legal; no se destruye el histórico
   económico sin revisión.
7.  **IA:** ningún modelo ni agente publica decisiones ni emite
   dictámenes jurídicos automáticos; las respuestas citan la fuente
   autorizada.

## Pasos antes de una funcionalidad que toque datos personales

1.  Revisa `docs/privacy-and-retention.md` y `docs/security-threat-model.md`.
2.  Define qué datos nuevos se guardan, cuánto se conservan y quién los
   ve.
3.  Añade permisos a la matriz (`docs/permissions-matrix.md`).
4.  Implementa auditoría si la acción es sensible.

## Criterios de finalización

-  Sin datos personales innecesarios en el esquema.
-  Permisos y auditoría actualizados.
-  Exportación/borrado previstos o documentados como pendientes.
