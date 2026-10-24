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

## Evolución

Fases 2-4 añadirán permisos específicos (finanzas, reuniones, documentos,
vista multi-comunidad) manteniendo esta estructura y ampliando los tests
negativos en consecuencia.
