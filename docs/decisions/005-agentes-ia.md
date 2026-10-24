# ADR 005 — Agentes de IA con instrucciones versionadas

-  **Estado:** aceptado
-  **Fecha:** 2026-10-24

## Contexto

Se va a desarrollar con asistentes de IA (Codex, Claude Code, Cursor,
OpenCode…). El conocimiento del proyecto debe vivir en el repositorio,
no en la configuración privada de una herramienta concreta.

## Decisión

-  `AGENTS.md` como punto de entrada de instrucciones para cualquier
   agente.
-  `.agents/skills/` con skills versionadas por área (convenciones,
   seguridad multi-tenant, migraciones, QA, privacidad, despliegue).
-  Todo cambio de código pasa por **pull request** con CI verde y
   revisión humana antes de fusionarse.
-  Los agentes usan **datos ficticios**, nunca datos reales de vecinos.
-  Los agentes **no** reciben secretos de producción ni acceso a
   producción.
-  Los agentes **no** ejecutan migraciones sobre producción: solo sobre
   bases de prueba.

## Consecuencias

-  (+) Las instrucciones se revisan, versionan y comparten como el
   resto del código.
-  (+) Cualquier asistente puede continuar el proyecto sin conocimiento
   privado.
-  (−) Hay que mantener las skills cortas y actualizadas: se revisan en
   cada PR que toque convenciones.

## Revisión del flujo de agentes

1.  El humano define funcionalidad y criterios de aceptación.
2.  Revisión de arquitectura: permisos, modelo de datos y límites de
    módulo.
3.  Implementación (incluidas migraciones) en rama.
4.  Tests (unitarios, integración, aislamiento).
5.  Revisión de seguridad cuando el cambio sea sensible.
6.  Pull request + revisión humana.
7.  CI verde antes de fusionar.
