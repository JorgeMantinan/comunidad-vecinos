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

## Acciones sobre la propia cuenta

No dependen de un rol de comunidad: las ejecuta cualquier sesión sobre
**sus propios datos** (el usuario se resuelve en servidor desde la
sesión, nunca desde el cuerpo de la petición).

| Acción                              | Requisito                        |
| ----------------------------------- | -------------------------------- |
| Descargar los propios datos (JSON)  | Sesión válida                    |
| Darse de baja                       | Sesión + contraseña + `ELIMINAR` |

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
    separarse de estas fichas (nunca accede a datos de vecinos). El alta
    y el borrado corresponden a `owner`/`admin`; **cualquier miembro
    puede proponer** un profesional desde la propia sección (se
    materializa como sugerencia y la junta la da de alta). Las fichas
    **no publican quién las creó**: la recomendación la firma la junta,
    no una persona.
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
    El anuncio aparece en las comunidades **asignadas a mano** y, si
    lleva **zona** (ciudad o barrio), también en las fincas cuya
    dirección la incluye: el cruce lo hace el servidor y el anunciante
    solo conoce su propia zona.
11. La **baja de la cuenta** elimina la cuenta y las comunidades en las
    que la persona era el único miembro; se bloquea (409) si es la única
    `owner` de una comunidad con más miembros, para no dejarla huérfana.
    En el resto de comunidades solo desaparece la membresía y el actor
    queda anónimo en la auditoría: los registros económicos y las actas
    se conservan por obligación legal.

## Evolución

Fases 2-4 añadirán permisos específicos (finanzas, reuniones, documentos,
vista multi-comunidad) manteniendo esta estructura y ampliando los tests
negativos en consecuencia.
