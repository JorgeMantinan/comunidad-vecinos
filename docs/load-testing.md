# Pruebas de carga (Fase 6)

Medición razonable del rendimiento del despliegue real, sin
herramientas externas ni estrés innecesario sobre la producción.

## Cómo se ejecuta

```bash
LOAD_EMAIL=<usuario> LOAD_PASSWORD=<contraseña> \
pnpm --filter @comunidad/api load-test -- https://mantivecinos.vercel.app --n 100 --c 10
```

- `--n` peticiones por escenario, `--c` concurrencia (por lotes).
- Escenarios: `GET /api/health` (público) y `GET /api/communities`
  (con sesión, usando **una sola** sesión para no tocar el límite de
  autenticación).
- Mide p50/p95/máximo y cuenta errores.

## Resultados

### Antes (funciones en `iad1`, EE. UU.) — 25/10/2026

| Escenario | p50 | p95 | máx | Errores |
| --------- | --- | --- | --- | ------- |
| `GET /api/health` | 159 ms | 366 ms | 2.178 ms | **0/100** |
| `GET /api/communities` (con sesión) | 627 ms | 1.394 ms | 3.493 ms | **0/100** |

### Después (funciones en `fra1`, Fráncfort) — 25/10/2026

| Escenario | p50 | p95 | máx | Errores |
| --------- | --- | --- | --- | ------- |
| `GET /api/health` | **89 ms** | 351 ms | 2.464 ms | **0/100** |
| `GET /api/communities` (con sesión) | **166 ms** | **356 ms** | 2.342 ms | **0/100** |

**0 errores** en las 400 peticiones de las dos mediciones.

**Mejora al cambiar a Europa:** el p50 de la consulta autenticada baja
de 627 ms a 166 ms (**−74 %**) y el p95 de 1.394 ms a 356 ms
(**−74 %**): la base de datos está en Londres y, con la API en
Fráncfort, desaparece el viaje transatlántico que pagaba cada
petición.

## Interpretación honesta

1. **Sin fallos bajo carga moderada**: nada de 5xx ni timeouts con
   10 peticiones concurrentes sostenidas.
2. **El máximo (≈2-3,5 s) son arranques en frío** de las funciones
   serverless: solo afecta a la primera petición tras un periodo de
   inactividad; no se ve en el uso normal de una comunidad.
3. **Región resuelta**: la ejecución ya está en `fra1` (fijado en
   `apps/api/vercel.json`, no en el panel) y el almacén de archivos
   también, así que la medición de arriba es la referencia vigente.
4. **Siguiente margen**: el remanente de ~160 ms en consultas con
   sesión es la verificación de la sesión de Better Auth más la red
   local de quien ejecuta la prueba; bajar de ahí exige mover la base
   de datos a la misma región o cachear la sesión, valorando si
   complica el sistema.

## Límites del método

- Es una prueba funcional de estrés suave, no una prueba de saturación:
  no busca romper el sistema sino detectar errores y latencias anómalas.
- Los tiempos incluyen la red local del que ejecuta la prueba.
- Repetir tras cambios relevantes (migraciones grandes, cambios de
  región, nuevos módulos).
