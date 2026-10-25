# ADR 006 — Sin funciones de inteligencia artificial

-  **Estado:** aceptado
-  **Fecha:** 2026-10-25

## Contexto

El roadmap original preveía, en la Fase 5, un «asistente IA» con
resúmenes de actas, búsqueda en documentación y orientación sobre
gastos. El propietario del producto ha decidido **no incorporar
funciones de IA** en la plataforma.

## Decisión

-  **No se incorpora ninguna función de IA** (ni resúmenes, ni
   chatbots, ni búsqueda semántica, ni generación de textos).
-  La plataforma opera con lógica determinista y verificable
   (consultas, agregaciones y reglas de negocio en TypeScript).
-  Tampoco se envían datos de la comunidad a servicios de terceros de
   IA (modelos, embeddings, transcripciones…).

## Motivos

1.  **Coste para los usuarios:** las funciones de IA consumen tokens o
    créditos y repercutirían ese gasto en vecinos y comunidades.
2.  **Exposición de datos:** actas, facturas y datos personales no
   deben salir de la infraestructura hacia proveedores de modelos.
3.  **Operación impredecible:** respuestas no deterministas en un
   dominio económico y normativo exigen revisión humana constante.
4.  **Simplicidad:** menos proveedores, menos cuotas y menos
   superficie de privacidad que vigilar.

## Consecuencias

-  La Fase 5 del roadmap se reduce a: directorio de profesionales,
   patrocinios claramente identificados y estadísticas de uso
   (agregaciones, no IA).
-  Cualquier propuesta futura de IA requiere un **nuevo ADR** que
   justifique coste, proveedor, tratamiento de datos y quién asume el
   consumo.
-  Las «estadísticas» se implementan con consultas SQL agregadas.

## Alternativas descartadas

-  Asistente de resumen de actas: coste por uso y alucinaciones en
   acuerdos formalmente vinculantes.
-  Búsqueda vectorial sobre documentos: exige enviar texto de la
   comunidad a un proveedor de embeddings.
