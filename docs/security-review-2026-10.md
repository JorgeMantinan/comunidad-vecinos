# Revisión de seguridad — octubre de 2026

Auditoría independiente del código (frontend, API, infraestructura y
configuración) siguiendo la checklist OWASP del proyecto. Estado de la
rama base: `main` tras la Fase 5.

## 1. Resumen ejecutivo

| Severidad | Nuevos | Corregidos en esta revisión |
| --------- | ------ | --------------------------- |
| Crítico   | 0      | 0                           |
| Alto      | 0      | 0                           |
| Medio     | 0      | 2 (S-01, S-02)              |
| Bajo      | 0      | 2 (S-03, S-04)              |
| Info      | 4 (aceptados) | 1 (S-05, dependencias) |

**Veredicto: apto para el piloto actual** (usuarios de confianza, datos
de prueba). Antes de escalar a comunidades reales con vecinos: revisión
jurídica (pendiente humana) y repetir esta auditoría.

## 2. Hallazgos corregidos

| ID | Severidad | Ubicación | Hallazgo y ataque | Fix |
| -- | --------- | --------- | ----------------- | --- |
| S-01 | **MEDIO** | `apps/api/src/modules/reports/service.ts` (`escapeCsv`) | **Inyección de fórmulas CSV (OWASP)**: un gasto con concepto `=cmd\|calc!A1` se exportaba sin neutralizar; al abrir el informe en Excel/Sheets se ejecuta la fórmula (DDE/exfiltración) | Se antepone `'` a celdas que empiezan por `=`, `+`, `-`, `@`, tab o CR. **Test**: concepto hostil presente en el CSV como `"'=cmd..."` |
| S-02 | **MEDIO** | `apps/web/vercel.json`, `apps/api/vercel.json` | Sin cabeceras de seguridad ni CSP: clicjacking, sniffing MIME, fugas por Referrer | CSP estricta (`default-src 'self'`, sin `unsafe-eval`, `frame-ancestors 'none'`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS 2 años; API: `Cache-Control: no-store` y `Referrer-Policy: no-referrer` |
| S-03 | **BAJO** | `apps/api/src/lib/auth.ts` | Límite de intentos de autenticación dependía del valor por defecto de Better Auth (implícito) | `rateLimit` explícito: 100 intentos/60 s solo en producción (los tests quedan exentos) |
| S-04 | **BAJO** | `packages/shared/src/sponsorships.ts` | `website` aceptaba `javascript:alert(1)` → XSS al hacer clic en «Visitar sitio» | Validación `http(s)://` obligatoria. **Test**: `javascript:` → 400 |
| S-05 | Info | dependencias | `pnpm audit --prod`: 2 hallazgos (esbuild ≤0.24.2 vía `drizzle-kit`, zod <4.6.6 vía `@vercel/oidc`) | `overrides` en `pnpm-workspace.yaml`; verificado: **«No known vulnerabilities found»** y `drizzle-kit generate` operativo |

## 3. Hallazgos aceptados (con justificación)

| ID | Hallazgo | Por qué se acepta |
| -- | -------- | ----------------- |
| S-06 | El email del destinatario aparece en el log de errores de correo | Los logs solo son accesibles con la cuenta de Vercel; es imprescindible para diagnosticar fallos de envío. No se registran contraseñas ni tokens. |
| S-07 | El rate limit de autenticación usa almacenamiento en memoria (por instancia serverless) | Protección suficiente para el piloto (combate automatización desde un mismo cliente). Si hay ataque real: revisar storage de Better Auth o WAF. |
| S-08 | No hay token CSRF propio | Tres barreras: (1) todas las mutaciones exigen JSON (`Content-Type` distinto de formularios → un cross-site form no puede enviarlo), (2) cookies `SameSite` y validación de `Origin` por Better Auth (observado en pruebas: `MISSING_OR_NULL_ORIGIN`), (3) CORS con orígenes exactos y credenciales. |
| S-09 | Regla CSP `style-src 'unsafe-inline'` | Necesaria por estilos en línea de React/Tailwind; sin ella la interfaz se rompe. Riesgo mínimo: sin `unsafe-eval` ni scripts inline. |

## 4. Verificado sin hallazgos (evidencia)

- **Multi-tenancy**: toda ruta privada resuelve membresía+rol en servidor; 404 anti-enumeración; tests negativos por rol en los 15 tests de módulos (`permissions-matrix.md`).
- **SQL**: todas las consultas pasan por Drizzle (parametrizadas). Los dos únicos `sql.raw` (backup/restore) usan nombres de tabla de una constante y escape de literales (`'` duplicado, números/booleanos tipeados). Revisado manualmente.
- **Secretos**: `git ls-files | .env` → solo `.env.example`; sin claves en el bundle (la única `VITE_*` es la URL de la API, pública por diseño). Cero source maps en el build de producción (verificado: `*.map = 0`).
- **Archivos**: 3 MB máx., catálogo cerrado de MIME, claves de almacenamiento generadas por servidor (sin nombres de cliente en la ruta), almacén privado y descarga solo con **URL firmada de 10 min**.
- **Cookies**: `httpOnly` (Better Auth), `SameSite=Lax` en local y `SameSite=None; Secure` en producción (necesario por el proxy), HSTS activo.
- **Errores**: 500 genérico al cliente, detalle solo en logs; validación Zod en todas las entradas (sin `any` en el perímetro).
- **XSS**: sin `dangerouslySetInnerHTML`/`innerHTML` en todo el repo (búsqueda verificada); React escapa por defecto; `target="_blank"` siempre con `noopener`.
- **Dependencias**: `pnpm audit --prod` → **0 vulnerabilidades**.

## 5. Checklist post-fixes

- [x] `pnpm lint`, `format:check`, `typecheck`, `build` en verde.
- [x] 156 tests (los 3 nuevos de esta revisión incluidos).
- [x] Cabeceras verificadas en producción tras el despliegue (`curl -I`).
- [x] `pnpm audit --prod` sin hallazgos.

## 6. Alcance NO revisado (para que nada quede oculto)

- Pentest externo de la infraestructura Vercel/Neon (gestionada por ellos).
- Revisión jurídica de textos y consentimientos (requiere asesor humano).
- Navegadores muy antiguos y lectores de pantalla (habría que probar accesibilidad).
- Dispositivos móviles reales (sin tests E2E de navegador todavía).
- Continuidad de negocio si Vercel/Neon desaparecen (mitigado parcialmente con las copias propias).
