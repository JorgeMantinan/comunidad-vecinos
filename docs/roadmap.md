# Roadmap técnico: SaaS de comunidades de propietarios

## Objetivo

Construir un SaaS multi-comunidad para que vecinos, presidentes y
administradores de fincas puedan gestionar información, economía,
reuniones, incidencias, documentación y profesionales desde una única
plataforma.

La arquitectura debe priorizar:

-   Coste inicial de infraestructura cercano a 0 €, sin asumir que las
    cuotas gratuitas serán permanentes.
-   Aislamiento estricto entre comunidades.
-   TypeScript de extremo a extremo cuando sea razonable.
-   Migraciones reproducibles y datos exportables.
-   Agentes de IA con instrucciones y skills versionadas en Git.
-   Implementación progresiva: arquitectura completa, funcionalidades
    por fases.

------------------------------------------------------------------------

## 1. Stack tecnológico recomendado

  -----------------------------------------------------------------------
  Área                    Tecnología recomendada  Motivo / notas
  ----------------------- ----------------------- -----------------------
  Frontend                React + TypeScript +    SPA rápida y adecuada
                          Vite                    para una aplicación
                                                  privada.

  UI                      Tailwind CSS +          Componentes
                          shadcn/ui               reutilizables y diseño
                                                  consistente.

  Formularios             React Hook Form + Zod   Formularios tipados y
                                                  validación.

  Estado remoto           TanStack Query          Caché, estados de carga
                                                  y sincronización con la
                                                  API.

  Backend                 TypeScript + Hono       API HTTP ligera;
                                                  verificar
                                                  compatibilidad con el
                                                  runtime elegido.

  ORM                     Drizzle ORM + Drizzle   Esquemas tipados y
                          Kit                     migraciones
                                                  versionadas.

  Base de datos           PostgreSQL,             SQL relacional,
                          inicialmente Neon Free  integridad,
                          si las cuotas actuales  transacciones y
                          encajan                 portabilidad.

  Autenticación           Evaluar Better Auth     Correo/contraseña o
                                                  enlace mágico, sesiones
                                                  e invitaciones. Probar
                                                  compatibilidad antes de
                                                  decidir.

  Hosting                 Cloudflare Workers para Alternativa a Vercel
                          API y Pages/Assets para Hobby para un producto
                          frontend                que podría monetizarse;
                                                  revisar las condiciones
                                                  comerciales y cuotas
                                                  vigentes.

  Archivos                Almacenamiento de       Facturas, actas,
                          objetos privado         fotografías y anexos
                                                  fuera de PostgreSQL.

  Testing                 Vitest + Playwright     Pruebas unitarias,
                                                  integración y E2E.

  Calidad                 ESLint + Prettier +     Calidad y consistencia.
                          TypeScript estricto     

  CI/CD                   GitHub Actions          Comprobaciones
                                                  automáticas en pull
                                                  requests.

  Monitorización          Logs y alertas de       Empezar con
                          cuota/error             herramientas mínimas y
                                                  revisar límites
                                                  gratuitos.
  -----------------------------------------------------------------------

### Consideraciones de infraestructura

-   GitHub almacena el código; no sustituye a la base de datos ni al
    almacenamiento de documentos.
-   Neon y otros servicios gratuitos tienen límites que pueden cambiar.
    Verificar almacenamiento, cómputo, transferencia, suspensión por
    inactividad y condiciones vigentes antes del lanzamiento.
-   Cloudflare Workers no es un servidor Node tradicional. Comprobar la
    compatibilidad de las dependencias de autenticación, PostgreSQL y
    generación de PDF.
-   Vercel Hobby está orientado a uso personal/no comercial; no asumir
    que permite un SaaS con publicidad patrocinada.
-   No prometer coste cero perpetuo. Diseñar para poder migrar y vigilar
    consumo.
-   No almacenar archivos binarios en PostgreSQL. Aplicar límites de
    tamaño, compresión y acceso privado.
-   Mantener copias de seguridad independientes y probar su
    restauración.

------------------------------------------------------------------------

## 2. Arquitectura general

Arquitectura de monolito modular:

1.  **Frontend React:** interfaz para vecinos, presidencia y
    administradores.
2.  **API TypeScript:** autenticación de la petición, validación,
    autorización y casos de uso.
3.  **Dominio:** reglas de negocio, estados y restricciones.
4.  **Infraestructura:** PostgreSQL, almacenamiento, correo y servicios
    externos.
5.  **Servicios auxiliares:** copias de seguridad, monitorización y
    tareas programadas.

No crear microservicios por módulo en el MVP. Compartir API y base de
datos, manteniendo límites lógicos claros.

### Principios

-   Validación en servidor; el frontend no es una barrera de seguridad.
-   Contratos HTTP explícitos y validación de entradas.
-   Reglas de negocio en el backend, no duplicadas solo en React.
-   Acceso a datos mediante una capa de persistencia.
-   Dependencias externas aisladas para facilitar migraciones.
-   Sin Redis, colas ni servidores persistentes hasta que exista una
    necesidad real.

------------------------------------------------------------------------

## 3. Modelo de datos y multi-tenancy

### Entidades conceptuales

  -----------------------------------------------------------------------
  Área                                Entidades
  ----------------------------------- -----------------------------------
  Identidad                           `users`, `sessions`, `invitations`

  Comunidades                         `communities`,
                                      `community_memberships`, `units`

  Economía                            `expenses`, `invoices`, `budgets`,
                                      `assessments`, `payments`,
                                      `financial_periods`

  Reuniones                           `meetings`, `meeting_agenda_items`,
                                      `meeting_minutes`, `agreements`,
                                      `votes`

  Mantenimiento                       `incidents`, `tasks`, `assets`,
                                      `maintenance_contracts`

  Comunicación                        `announcements`, `suggestions`,
                                      `polls`, `notifications`

  Profesionales                       `professionals`,
                                      `professional_services`,
                                      `community_recommendations`,
                                      `sponsorships`

  Documentación                       `documents`, `document_versions`,
                                      `document_permissions`

  Seguridad                           `audit_events`, `access_events`,
                                      `retention_policies`
  -----------------------------------------------------------------------

Estas entidades son un mapa objetivo, no una instrucción para crear
todas las tablas en una sola migración. Implementar el esquema por
módulos y con migraciones pequeñas.

### Reglas de aislamiento

1.  Todo recurso privado pertenece a una comunidad o tiene un ámbito
    global explícitamente definido.
2.  Cada petición protegida verifica membresía y rol en el servidor.
3.  Las relaciones deben impedir asociaciones entre entidades de
    comunidades distintas.
4.  Las consultas se limitan a los ámbitos autorizados, no solo al ID
    del recurso.
5.  Registrar acciones críticas: cambios en facturas, gastos, acuerdos y
    permisos.
6.  Documentos privados requieren autorización para cada descarga.
7.  Roles y permisos se prueban mediante tests negativos.
8.  En PostgreSQL, valorar Row-Level Security (RLS) como segunda
    barrera, además de la autorización de la aplicación.

### Roles iniciales

-   Administrador de plataforma: gestión técnica del servicio; acceso a
    documentos privados sujeto a procedimiento autorizado.
-   Presidente/junta: gestión de publicaciones, acuerdos y tareas
    autorizadas.
-   Administrador de fincas: acceso delegado a las comunidades
    asignadas.
-   Propietario: consulta y participación según permisos.
-   Residente/inquilino: acceso limitado a información y servicios
    permitidos.

La autenticación responde a "quién eres"; la autorización, a "qué puedes
hacer en esta comunidad". Diseñarlas por separado.

### Invitaciones

-   Invitación vinculada a una comunidad y rol inicial.
-   Caducidad y uso único.
-   Revocación por usuario autorizado.
-   No permitir que el invitado se asigne arbitrariamente un rol
    privilegiado.
-   Una cuenta puede pertenecer a varias comunidades sin duplicarse.

------------------------------------------------------------------------

## 4. Migraciones y gestión de datos

Usar Drizzle Kit para generar migraciones y mantener SQL revisable en
Git. No modificar producción manualmente desde el panel del proveedor.

Cada migración debe:

-   Estar versionada y vinculada a un cambio.
-   Aplicarse desde una base vacía.
-   Tener pruebas de integridad y compatibilidad.
-   Documentar recuperación o reversión cuando sea posible.

Para cambios destructivos, usar migraciones por etapas: añadir la nueva
estructura, migrar datos, cambiar el código y retirar la estructura
antigua cuando ya no se use.

Mantener entornos lógicos de desarrollo, pruebas y producción. No
considerar las ramas de base de datos como copias de seguridad
permanentes.

No usar datos reales de vecinos en pruebas ni en contextos de agentes de
IA.

------------------------------------------------------------------------

## 5. Roadmap por fases

### Fase 0 --- Producto y arquitectura

-   Definir perfiles, roles y permisos.
-   Especificar módulos, flujos y criterios de aceptación.
-   Evaluar hosting, base de datos, autenticación y almacenamiento con
    una prueba técnica.
-   Crear ADRs (registros de decisiones de arquitectura).
-   Definir cuotas y límites de almacenamiento.
-   Diseñar aislamiento multi-tenant y políticas documentales.

**Criterio de salida:** arquitectura aprobada, backlog priorizado y
decisiones documentadas.

### Fase 1 --- Infraestructura y seguridad

-   Repositorio GitHub y ramas protegidas.
-   Frontend, API y base de datos.
-   Migraciones y datos ficticios.
-   Registro, inicio de sesión, invitaciones y sesiones.
-   Comunidades, membresías y roles.
-   Auditoría de acciones críticas.
-   CI con lint, tipos y tests.
-   Pruebas de aislamiento entre comunidades.

**Criterio de salida:** un usuario solo accede a sus comunidades y a los
recursos autorizados.

### Fase 2 --- Gestión esencial (MVP)

-   Panel principal.
-   Avisos y calendario.
-   Reuniones, orden del día, actas y acuerdos.
-   Gastos, facturas y derramas.
-   Documentación privada.
-   Registro de cambios.
-   Exportación inicial de datos.

**Criterio de salida:** una comunidad piloto puede organizarse y
consultar su información desde la web.

### Fase 3 --- Mantenimiento y participación

-   Incidencias con fotografías y estados.
-   Tareas, responsables y vencimientos.
-   Sugerencias y encuestas.
-   Inventario de elementos comunes.
-   Contratos y mantenimiento preventivo.
-   Notificaciones por correo.
-   Profesionales recomendados.

**Criterio de salida:** la plataforma sirve para el trabajo cotidiano.

### Fase 4 --- Administración de fincas

-   Panel de varias comunidades.
-   Permisos delegados y cambio seguro de contexto.
-   Informes por comunidad y periodo.
-   Plantillas de documentos.
-   Seguimiento de acuerdos y tareas.
-   Procesos repetitivos y exportaciones avanzadas.

**Criterio de salida:** un administrador gestiona varias comunidades sin
mezclar información.

### Fase 5 --- IA y monetización

-   Resúmenes de actas con revisión humana.
-   Búsqueda en documentación autorizada.
-   Buscador orientativo sobre gastos y responsabilidades.
-   Directorio local de profesionales.
-   Patrocinios claramente identificados.
-   Estadísticas de uso y métricas de producto.

**Criterio de salida:** funcionalidades diferenciales probadas y
primeros experimentos de monetización.

### Fase 6 --- Preparación para producción

-   Restauración de copias de seguridad probada.
-   Revisión de seguridad independiente.
-   Control de cuotas y alertas.
-   Políticas de retención y eliminación.
-   Pruebas de carga razonables.
-   Revisión jurídica y de privacidad.
-   Procedimiento de respuesta a incidentes.

**Criterio de salida:** servicio preparado para operar con datos reales
dentro de las garantías y límites de los proveedores.

------------------------------------------------------------------------

## 6. Alcance de los módulos

  -----------------------------------------------------------------------
  Módulo                              Responsabilidad
  ----------------------------------- -----------------------------------
  Comunidades y usuarios              Identidad, membresías, unidades y
                                      roles.

  Finanzas                            Gastos, presupuestos, facturas,
                                      derramas y seguimiento de pagos.

  Reuniones                           Convocatorias, agenda, actas,
                                      acuerdos y tareas derivadas.

  Incidencias                         Averías, evidencias, estados,
                                      presupuestos y resolución.

  Profesionales                       Fichas, servicios, recomendaciones
                                      y patrocinios.

  Comunicación                        Anuncios, sugerencias, encuestas y
                                      notificaciones.

  Documentos                          Metadatos, versiones, permisos y
                                      almacenamiento privado.

  Administración                      Vista de varias comunidades y
                                      permisos delegados.

  Auditoría                           Histórico de cambios, especialmente
                                      en operaciones económicas.

  Asistente IA                        Búsqueda, resúmenes y orientación
                                      basada en información autorizada.
  -----------------------------------------------------------------------

### Reglas de negocio importantes

-   Diferenciar gasto registrado, factura recibida, presupuesto aprobado
    y pago realizado.
-   Una derrama aprobada no equivale a dinero cobrado.
-   Separar propuestas, votaciones y acuerdos definitivos.
-   No convertir una encuesta informal en una decisión legalmente
    vinculante.
-   Separar gastos comunes e individuales, salvo que exista un motivo
    legítimo y configuración explícita.
-   Mantener referencias verificables y fecha de revisión en las
    explicaciones sobre IBI, derramas y responsabilidades.
-   La IA no debe publicar decisiones ni dar dictámenes jurídicos
    definitivos automáticamente.

------------------------------------------------------------------------

## 7. Agentes de IA y skills versionadas

Usar un agente principal de implementación y agentes especialistas como
revisores. No es necesario ejecutar muchos agentes continuamente.

### Agentes

1.  **Arquitectura:** define módulos, contratos, modelo de datos y ADRs.
2.  **Full-stack:** implementa funcionalidades completas según los
    contratos acordados.
3.  **Seguridad:** revisa autorización, aislamiento, archivos, secretos
    y exposición de datos.
4.  **QA:** crea pruebas unitarias, de integración y E2E.
5.  **Producto/UX:** convierte necesidades en historias de usuario y
    criterios de aceptación.
6.  **Documentación/normativa:** mantiene referencias verificadas,
    plantillas y documentación.

Herramientas posibles: Codex, Claude Code o Cursor. Mantener las reglas
y el conocimiento del proyecto versionados, independientemente del
asistente.

### Organización propuesta

``` text
AGENTS.md
README.md
docs/
  product-requirements.md
  architecture.md
  data-model.md
  permissions-matrix.md
  security-threat-model.md
  privacy-and-retention.md
  roadmap.md
  decisions/
    001-frontend-and-hosting.md
    002-database.md
    003-multi-tenancy.md
.agents/
  skills/
    project-conventions/
    architecture-review/
    multi-tenant-security/
    database-migrations/
    testing-and-qa/
    privacy-and-retention/
    deployment-and-costs/
```

La ruta de skills es una propuesta: adaptarla al formato que soporte el
asistente elegido, evitando duplicar instrucciones innecesariamente.

### Contenido de las skills

  -----------------------------------------------------------------------
  Skill                               Uso
  ----------------------------------- -----------------------------------
  `project-conventions`               Estructura, nombres, TypeScript
                                      estricto y convenciones.

  `architecture-review`               Nuevos módulos y cambios entre
                                      capas.

  `multi-tenant-security`             Operaciones con recursos privados.

  `database-migrations`               Cambios de esquema e integridad.

  `testing-and-qa`                    Criterios de pruebas antes de
                                      finalizar una tarea.

  `privacy-and-retention`             Documentos, datos personales,
                                      exportaciones y borrados.

  `deployment-and-costs`              Hosting, almacenamiento, tareas
                                      programadas y cuotas.
  -----------------------------------------------------------------------

Cada skill debe definir objetivo, contexto, pasos, restricciones y
criterios de finalización. Evitar instrucciones enormes o duplicadas.

### Flujo de trabajo de agentes

1.  El usuario define una funcionalidad y criterios de aceptación.
2.  Arquitectura comprueba permisos, modelo y límites de módulos.
3.  El agente principal implementa el cambio y las migraciones.
4.  QA ejecuta pruebas.
5.  Seguridad revisa los casos sensibles.
6.  Pull request y revisión humana.
7.  CI aprobada antes de fusionar.

No dar a los agentes acceso ilimitado a producción, secretos o datos
reales. Usar datos ficticios y permisos mínimos.

### CI con GitHub Actions

En cada pull request:

-   Comprobación de tipos TypeScript.
-   ESLint y formato.
-   Tests unitarios.
-   Tests de integración contra una base de prueba.
-   Migraciones desde una base limpia.
-   Tests de autorización y aislamiento.
-   E2E para flujos críticos.

Añadir análisis de dependencias y escaneos de seguridad progresivamente.
No exponer secretos de producción a jobs de pull requests no confiables.

------------------------------------------------------------------------

## 8. Infraestructura y coste

  -----------------------------------------------------------------------
  Servicio                Uso                     Riesgo a controlar
  ----------------------- ----------------------- -----------------------
  GitHub Free             Código, issues y PRs    Secretos fuera del
                                                  repositorio.

  Cloudflare Workers /    API y frontend          Cuotas, CPU y
  Pages                                           compatibilidad del
                                                  runtime.

  Neon Free               PostgreSQL              Cómputo,
                                                  almacenamiento,
                                                  transferencia y
                                                  suspensión.

  Almacenamiento de       Documentos privados     Cuota, transferencia y
  objetos                                         recuperación.

  Proveedor de correo     Invitaciones y avisos   Límites de envío y
                                                  condiciones de uso.

  Monitorización          Errores y               Límites gratuitos y
                          disponibilidad          retención de logs.
  -----------------------------------------------------------------------

### Medidas para evitar costes y bloqueos

1.  No guardar PDFs o fotos como blobs en PostgreSQL.
2.  Limitar tamaño de cargas y comprimir imágenes.
3.  Evitar tareas costosas en cada petición.
4.  Paginar listas grandes.
5.  Evitar consultas N+1 y descargas repetidas.
6.  Generar informes bajo demanda.
7.  Vigilar consumo de base de datos, correo, almacenamiento y API.
8.  Mantener exportaciones y procedimientos de migración.

### Almacenamiento seguro

-   Datos estructurados y metadatos en PostgreSQL.
-   Binarios en almacenamiento privado de objetos.
-   Metadatos con comunidad, tipo, tamaño, fecha y referencia al
    archivo.
-   Autorización en cada descarga.
-   URLs firmadas y de duración limitada si el proveedor lo permite.
-   Evitar URLs permanentes públicas para documentos sensibles.

### Copias de seguridad

-   Exportaciones periódicas de PostgreSQL fuera del proveedor
    principal.
-   Copias de documentos y estrategia de recuperación.
-   Instrucciones de restauración versionadas.
-   Pruebas periódicas de restauración.
-   Procedimiento para migrar a otro proveedor.

Una rama de base de datos no sustituye a una copia de seguridad. El
almacenamiento externo puede tener costes o cuotas propias; verificarlos
al diseñar la frecuencia.

------------------------------------------------------------------------

## 9. Seguridad, privacidad y normativa española

Antes de alojar datos reales:

-   Revisar RGPD y LOPDGDD.
-   Minimizar datos personales.
-   Restringir acceso a actas, facturas y documentación sensible.
-   Gestionar solicitudes de acceso, rectificación y supresión cuando
    procedan.
-   Definir conservación y eliminación.
-   Controlar permisos de presidencia y administración.
-   Proteger invitaciones y sesiones.
-   Registrar operaciones relevantes.
-   Evaluar proveedores y transferencias internacionales.
-   Definir un procedimiento de gestión de incidentes.

Los patrocinadores no deben acceder a datos de vecinos ni conocer quién
ha solicitado servicios. La publicidad debe identificarse y separarse de
las recomendaciones vecinales.

La orientación sobre IBI, derramas y responsabilidades debe usar
referencias verificables, fecha de revisión y advertencias cuando
dependa de circunstancias concretas. La IA no debe decidir
automáticamente quién paga.

------------------------------------------------------------------------

## 10. Criterios de aceptación por hito

  -----------------------------------------------------------------------
  Hito                                Condición de finalización
  ----------------------------------- -----------------------------------
  Infraestructura                     Despliegue reproducible, secretos
                                      seguros y migraciones verificadas.

  Autenticación                       Registro, invitación, expiración,
                                      sesiones y recuperación probados.

  Multi-tenancy                       Un usuario no puede leer ni
                                      modificar datos de otra comunidad
                                      manipulando identificadores.

  Finanzas                            Gastos, facturas y derramas tienen
                                      estados diferenciados, histórico y
                                      validaciones.

  Reuniones                           Actas y acuerdos tienen permisos,
                                      versiones y seguimiento.

  Documentos                          No se descarga un documento privado
                                      sin autorización.

  Administración                      Solo se accede a las comunidades
                                      asignadas.

  Profesionales                       Se distingue recomendación vecinal
                                      de publicidad patrocinada.

  IA                                  Respeta permisos, cita fuentes
                                      cuando corresponde y no publica
                                      decisiones automáticamente.

  Producción                          Copias restauradas, límites
                                      monitorizados y revisión de
                                      privacidad completada.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 11. Decisiones arquitectónicas iniciales (ADRs)

### ADR 001 --- Arquitectura

Monolito modular TypeScript, frontend React y API HTTP. Sin
microservicios en el MVP.

### ADR 002 --- Persistencia

PostgreSQL con Drizzle y migraciones SQL versionadas. Neon Free como
candidato inicial, sujeto a validar cuotas y recuperación.

### ADR 003 --- Aislamiento

Multi-tenancy mediante membresías, autorización en servidor,
restricciones de integridad y RLS donde corresponda.

### ADR 004 --- Despliegue

GitHub Actions y Cloudflare para la aplicación, tras probar
compatibilidad de backend y dependencias.

### ADR 005 --- Agentes

Instrucciones y skills versionadas, cambios mediante PRs, datos
ficticios y revisión de seguridad independiente.

------------------------------------------------------------------------

## 12. Primer paso recomendado

Antes de construir módulos de negocio, realizar una prueba técnica
acotada de tres aspectos:

1.  Conexión segura a PostgreSQL desde el runtime elegido.
2.  Autenticación e invitaciones.
3.  Aislamiento real entre dos comunidades, incluyendo intentos de
    acceso manipulando IDs.

No es el MVP: es una validación de arquitectura para evitar descubrir
incompatibilidades después de implementar numerosos módulos.

Si la prueba funciona, continuar con el roadmap sin cambiar de stack
salvo que aparezca una limitación real.

**Principio rector:** diseñar desde el principio para todos los módulos,
pero implementar solo lo que requiere la fase actual.
