# Modelo de amenazas

Alcance: plataforma con datos personales y económicos de comunidades de
propietarios españolas, desplegada en Vercel + PostgreSQL gestionado.

## Activos a proteger

- Datos personales de vecinos (nombre, email, vivienda).
- Documentación privada (actas, facturas, derramas).
- Registros económicos y de acuerdos.
- Credenciales, sesiones y tokens de invitación.
- Secretos de infraestructura (DATABASE_URL, claves de sesión).

## Amenazas principales y controles

| Amenaza | Impacto | Control |
| ------- | ------- | ------ |
| Manipulación de IDs para acceder a datos de otra comunidad | Crítico | Autorización por membresía en servidor; FKs con `communityId`; tests negativos de aislamiento; RLS como segunda barrera |
| Secuestro de sesión (robo de cookie/token) | Alto | Cookies `httpOnly` + `Secure` + `SameSite`, expiración y rotación de sesión, revocación al cambiar contraseña |
| Fuerza bruta / credenciales débiles | Medio | Hash con bcrypt/scrypt vía Better Auth, límite de intentos, verificación de email |
| Invitaciones reutilizadas o caducadas | Alto | Token de uso único, caducidad, revocación explícita, rol inicial asignado por el invitador |
| Inyección SQL | Crítico | ORM (Drizzle) con parametrización; sin SQL concatenado |
| Exposición de secretos en Git | Crítico | `.env` ignorado, solo `.env.example` versionado; secretos en variables de entorno de Vercel; rotación al detectar fuga |
| Subida de archivos maliciosos | Alto | Validación de tipo/tamaño, almacenamiento privado, descarga con autorización y URLs firmadas temporales |
| XSS | Alto | React con escaping por defecto; sin `dangerouslySetInnerHTML` sin sanitización |
| CSRF | Medio | Cookies `SameSite`, comprobación de origen en mutaciones |
| Escalada de privilegios entre roles | Alto | Guards centralizados; tests negativos por rol y acción |
| Pérdida de datos (borrado accidental, proveedor) | Alto | Copias de seguridad externas periódicas + restauración probada |

## Prácticas obligatorias

-  Todo recurso privado exige autorización en servidor antes de tocar la
   base de datos.
-  Nada de datos reales de vecinos en desarrollo ni en pruebas de agentes
   de IA: solo datos ficticios.
-  Los agentes de IA no reciben secretos de producción ni acceso a
   producción.
-  Los pull requests pasan CI (tipos, lint, tests de aislamiento) antes
   de fusionarse.
-  Registro de auditoría en acciones críticas (economía, permisos,
   acuerdos).

## Pendiente (fases posteriores)

-  Row-Level Security en PostgreSQL como segunda barrera.
-  Revisión de seguridad independiente antes de producción.
-  Pruebas de penetración y de carga.
-  Procedimiento documentado de respuesta a incidentes.
