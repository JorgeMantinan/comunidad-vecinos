# Acceso con Google

La aplicación puede ofrecer **«Continuar con Google»** junto al login y
al registro. Es opcional: **si no hay credenciales, el botón no se
muestra** (la interfaz lo consulta en `/api/health` → `login.google`).

## Cómo funciona

1. La web llama a `POST /api/auth/sign-in/social` con
   `{ "provider": "google", "callbackURL": "/" }`.
2. Better Auth devuelve la URL de consentimiento de Google y el
   navegador sale hacia ella.
3. Google redirige a **`https://mantivecinos.vercel.app/api/auth/callback/google`**
   (misma origin, reescrito a la API) y Better Auth crea la sesión con
   la cookie de la aplicación.
4. Si el correo de Google coincide con una cuenta existente, **Better
   Auth enlaza la cuenta** (`account.accountLinking` con
   `trustedProviders: ['google']`): quien ya tenía contraseña puede
   entrar con Google sin duplicarse.

## Configuración (una sola vez, en Google Cloud Console)

1. [console.cloud.google.com](https://console.cloud.google.com) →
   **Crear proyecto** (nombre: `Mantivecinos`).
2. **APIs y Services → Pantalla de consentimiento OAuth**:
   - Usuario externo, rellenar nombre y correo de soporte.
   - En **Usuarios de prueba** añadir los correos que vayan a entrar
     (mientras está en modo «Testing» solo esos correos pueden entrar).
3. **APIs and Services → Credenciales → Crear credenciales →
   ID de cliente de OAuth**:
   - Tipo: **Aplicación web**.
   - **URIs de redirección autorizadas**:
     `https://mantivecinos.vercel.app/api/auth/callback/google`
   - (Opcional en local: `http://localhost:5173/api/auth/callback/google`).
4. Copiar el **ID de cliente** y el **secreto**.

## Configuración en Vercel (proyecto `mantivecinos-api`)

```bash
vercel env add BETTER_AUTH_URL production --cwd apps/api   # https://mantivecinos.vercel.app
vercel env add GOOGLE_CLIENT_ID production --cwd apps/api
vercel env add GOOGLE_CLIENT_SECRET production --cwd apps/api
```

- `BETTER_AUTH_URL` define la URL pública con la que Better Auth
  construye el callback y valida los orígenes.
- **Nunca** guardar `GOOGLE_CLIENT_ID`/`SECRET` vacíos: la configuración
  exige valores no vacíos y la API no arrancaría.
- En **preview** no se copian las credenciales: el botón no aparece
  ahí (evita callbacks rotos en despliegues de prueba).

Verificación tras guardarlas y redesplegar:

```bash
curl -s https://mantivecinos-api.vercel.app/api/health
# → {"status":"ok",...,"login":{"google":true}}
```

## Local

```bash
# apps/api/.env
BETTER_AUTH_URL=http://localhost:5173
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Límites y decisiones

-  **Modo «Testing»** de Google: hasta 100 usuarios y solo los correos
   añadidos como usuarios de prueba. Para abrirlo a todo el mundo hay
   que publicar la pantalla de consentimiento (revisión de Google).
-  No se envía nada a Google más allá del identificador de la cuenta:
   la aplicación no recibe datos de la comunidad de Google, solo el
   correo y el nombre para crear la sesión.
-  El acceso por correo y contraseña **sigue disponible**; Google es
   una vía más, no una obligación.
