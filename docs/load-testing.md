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

## Resultados (25/10/2026, despliegue real)

| Escenario | p50 | p95 | máx | Errores |
| --------- | --- | --- | --- | ------- |
| `GET /api/health` | 159 ms | 366 ms | 2.178 ms | **0/100** |
| `GET /api/communities` (con sesión) | 627 ms | 1.394 ms | 3.493 ms | **0/100** |

**0 errores** en 200 peticiones.

## Interpretación honesta

1. **Sin fallos bajo carga moderada**: nada de 5xx ni timeouts con
   10 peticiones concurrentes sostenidas.
2. **Las latencias son altas por dos causas conocidas**:
   - El máximo (≈2-3,5 s) corresponde a **arranques en frío** de las
     funciones serverless: solo afecta a la primera petición tras un
     periodo de inactividad.
   - Las consultas con sesión laten ~600 ms porque las funciones se
     ejecutan en **iad1 (EE. UU.)** y la base de datos está en
     **eu-west-2 (Londres)**: cada consulta paga ida y vuelta
     transatlántica (~100 ms) más la sesión completa de Better Auth.
3. **Recomendación antes de usuarios reales**: mover la ejecución de
   las funciones a una región europea (p. ej. `fra1`, Fráncfort) desde
   el panel de Vercel (Settings → General → Region). Esto debería
   bajar el p50 de las consultas autenticadas de forma apreciable.
   Repetir esta medición tras el cambio y anotar los resultados aquí.

## Límites del método

- Es una prueba funcional de estrés suave, no una prueba de saturación:
  no busca romper el sistema sino detectar errores y latencias anómalas.
- Los tiempos incluyen la red local del que ejecuta la prueba.
- Repetir tras cambios relevantes (migraciones grandes, cambios de
  región, nuevos módulos).
