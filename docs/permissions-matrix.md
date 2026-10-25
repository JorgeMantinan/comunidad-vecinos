# Matriz de permisos

La autenticación responde a "quién eres"; la autorización, a "qué puedes
hacer en esta comunidad". Se implementan por separado.

## Roles

| Rol                   | Ámbito                                  |
| --------------------- | --------------------------------------- |
| `platform_admin`      | Técnico del servicio (no es un rol de comunidad) |
| `owner`               | Presidente/junta de la comunidad        |
| `admin`               | Administrador de fincas delegado        |
| `member`              | Propietario                             |
| `resident`            | Inquilino/residente                     |

## Acciones por rol (Fase 1)

| Acción                                | platform_admin | owner | admin | member | resident |
| ------------------------------------- | :------------: | :---: | :---: | :----: | :------: |
| Ver datos de la comunidad             | ✅             | ✅    | ✅    | ✅     | ✅       |
| Ver avisos y reuniones                | ✅             | ✅    | ✅    | ✅     | ✅       |
| Ver gastos de la comunidad            | ❌             | ✅    | ✅    | ✅     | ❌       |
| Publicar avisos                       | ❌             | ✅    | ✅    | ❌     | ❌       |
| Convocar reuniones y gestionar acta   | ❌             | ✅    | ✅    | ❌     | ❌       |
| Gestionar orden del día y acuerdos    | ❌             | ✅    | ✅    | ❌     | ❌       |
| Registrar y pagar gastos              | ❌             | ✅    | ✅    | ❌     | ❌       |
| Ver unidades y facturas               | ❌             | ✅    | ✅    | ✅     | ✅       |
| Ver derramas                          | ❌             | ✅    | ✅    | ✅     | ❌       |
| Gestionar unidades                    | ❌             | ✅    | ✅    | ❌     | ❌       |
| Registrar y pagar facturas            | ❌             | ✅    | ✅    | ❌     | ❌       |
| Crear derramas y cobrar cuotas        | ❌             | ✅    | ✅    | ❌     | ❌       |
| Exportar los datos de la comunidad    | ❌             | ✅    | ✅    | ❌     | ❌       |
| Ver incidencias y tareas              | ❌             | ✅    | ✅    | ✅     | ✅       |
| Reportar incidencias                  | ❌             | ✅    | ✅    | ✅     | ✅       |
| Gestionar incidencias y tareas        | ❌             | ✅    | ✅    | ❌     | ❌       |
| Ver y proponer sugerencias            | ❌             | ✅    | ✅    | ✅     | ✅       |
| Revisar sugerencias (cambiar estado)  | ❌             | ✅    | ✅    | ❌     | ❌       |
| Ver encuestas y votar                 | ❌             | ✅    | ✅    | ✅     | ✅       |
| Crear y cerrar encuestas              | ❌             | ✅    | ✅    | ❌     | ❌       |
| Ver inventario, contratos y profesionales | ❌          | ✅    | ✅    | ✅     | ✅       |
| Gestionar inventario, contratos y profesionales | ❌      | ✅    | ✅    | ❌     | ❌       |
| Ver documentación privada             | ❌             | ✅    | ✅    | ✅     | ❌       |
| Subir y eliminar documentos           | ❌             | ✅    | ✅    | ❌     | ❌       |
| Adjuntar fotos a incidencias          | ❌             | ✅    | ✅    | ✅     | ✅       |
| Eliminar fotos (propias; admin, todas)| ❌             | ✅    | ✅    | ✅     | ✅       |
| Ver informe económico del periodo      | ❌             | ✅    | ✅    | ✅     | ❌       |
| Descargar CSV del periodo             | ❌             | ✅    | ✅    | ❌     | ❌       |
| Ver el panel de administración        | ❌             | ✅    | ✅    | ❌     | ❌       |
| Crear tareas derivadas de acuerdos    | ❌             | ✅    | ✅    | ❌     | ❌       |
| Ver y usar plantillas                 | ❌             | ✅    | ✅    | ❌     | ❌       |
| Generar documentos desde plantillas   | ❌             | ✅    | ✅    | ❌     | ❌       |
| Ver estadísticas de uso               | ❌             | ✅    | ✅    | ✅     | ✅       |
| Gestionar patrocinios (publicidad)    | ✅             | ❌    | ❌    | ❌     | ❌       |
| Ver publicidad de la comunidad        | ❌             | ✅    | ✅    | ✅     | ✅       |
| Editar datos de la comunidad          | ❌             | ✅    | ✅    | ❌     | ❌       |
| Invitar miembros                     | ❌             | ✅    | ✅    | ❌     | ❌       |
| Revocar invitaciones                  | ❌             | ✅    | ✅    | ❌     | ❌       |
| Cambiar rol de un miembro             | ❌             | ✅    | ✅\*  | ❌     | ❌       |
| Expulsar miembros                     | ❌             | ✅    | ✅\*  | ❌     | ❌       |
| Ver miembros                          | ❌             | ✅    | ✅    | ✅     | ✅       |
| Ver eventos de auditoría              | ❌             | ✅    | ✅    | ❌     | ❌       |
| Eliminar la comunidad                 | ❌             | ✅    | ❌    | ❌     | ❌       |
| Gestionar usuarios de plataforma      | ✅             | ❌    | ❌    | ❌     | ❌       |

\* `admin` solo puede modificar miembros con rol `member` o `resident`;
  nunca a otro `admin` ni al `owner`.

## Reglas de autorización

1.  Toda ruta privada verifica sesión **y** membresía en la comunidad
    indicada; el rol se consulta en servidor, nunca se confía en el
    cliente.
2.  Un administrador de fincas solo accede a las comunidades que tienen
    una membresía suya, aunque manipule el identificador en la URL.
3.  El `platform_admin` accede a metadatos técnicos; el acceso a
    documentos privados requiere procedimiento autorizado y queda
    registrado en auditoría.
4.  Ningún rol puede asignarse a sí mismo privilegios superiores a los
    que ya tiene.
5.  Los permisos ausentes se prueban con tests negativos: cada rol tiene
    al menos una prueba que demuestra que **no** puede ejecutar la
    acción.
6.  Cualquier miembro (incluida la residente) puede reportar
    incidencias, proponer sugerencias y votar encuestas; la revisión de
    estados y la gestión de tareas son exclusivas de `owner`/`admin`.
    El autor de una sugerencia puede eliminar la suya.
7.  Los profesionales listados son **recomendación vecinal**; cualquier
    publicidad patrocinada de la Fase 5 deberá identificarse como tal y
    separarse de estas fichas (nunca accede a datos de vecinos).
8.  Los archivos (documentos y fotos) viven en un almacén **privado**;
    cada descarga exige autorización de la comunidad y entrega una URL
    firmada de 10 minutos. Cualquier miembro puede adjuntar fotos a
    incidencias y borrar las suyas; `owner`/`admin` pueden borrar
    cualquier foto.
9.  El panel de administración solo agrega comunidades donde el usuario
    es `owner`/`admin` (las de mero miembro no aparecen nunca) y el CSV
    del informe queda restringido a `owner`/`admin`.
10. La gestión de patrocinios pertenece a la **administración de
    plataforma** (emails en `PLATFORM_ADMIN_EMAILS`), nunca a roles de
    comunidad. La publicidad mostrada se identifica siempre como tal y
    solo expone nombre y web: los anunciantes no son usuarios y no
    reciben ningún dato de los vecinos ni de quién solicita servicios.

## Evolución

Fases 2-4 añadirán permisos específicos (finanzas, reuniones, documentos,
vista multi-comunidad) manteniendo esta estructura y ampliando los tests
negativos en consecuencia.
