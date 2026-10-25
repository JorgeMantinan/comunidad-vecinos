# ADR 007 — Publicidad de terceros (AdSense) pausada

-  **Estado:** aceptado (moratoria: no se implementa por ahora)
-  **Fecha:** 2026-10-25

## Contexto

Se planteó incorporar **anuncios de Google Ads (AdSense) en los
laterales** de la aplicación, con el aviso de cookies que eso exige. El
propietario del producto ha decidido **pausar la decisión**: otro de sus
proyectos tiene la cuenta de AdSense suspendida y quiere investigar ese
tema antes de volver a tocarlo. Además, **no va a comprar dominio
propio** por ahora, y la app corre en `mantivecinos.vercel.app`.

## Decisión

-  **No se carga ningún script de terceros** (AdSense ni similar):
   sin `googlesyndication`, sin `doubleclick`, sin cambio de la
   política de contenidos (`script-src 'self'`).
-  En consecuencia **no se muestra aviso/banner de cookies**: hoy la
   aplicación solo usa la cookie de sesión y decir lo contrario en
   `/legal/cookies` sería falso. El banner se introduce, si acaso,
   junto con las cookies de terceros que lo justifiquen.
-  La publicidad que sí está en producción son los **anuncios propios
   por zona** (`sponsorships`): sin cookies de terceros, sin banner,
   sin dominio y con el precio elegido por el propietario.

## Qué queda decidido para cuando se reactive

Estas dos decisiones ya están tomadas y no hacen falta volver a
consultarlas:

1.  **Ubicación:** anuncios en **ambos laterales y solo en pantallas
    anchas** (≥ `xl`); ni en móvil ni en tablet (el público de la app
    son personas mayores y las pantallas pequeñas ya son justas).
2.  **Consentimiento:** **barra inferior con «Aceptar» y «Rechazar»**
    del mismo tamaño, sin bloquear el resto de la aplicación. Sin
    aceptar, **no se carga absolutamente nada de Google** (Consent
    Mode v2 antes del script).

## Qué habrá que hacer entonces (lista de la compra)

-  **Técnico:** ampliar la CSP de `apps/web/vercel.json` (`script-src`,
   `frame-src`, `img-src`, `connect-src` con los dominios de Google),
   `ads.txt`, unidad de anuncio y prueba de que el bloque no aparece
   sin consentimiento.
-  **Legal:** actualizar `/legal/cookies` (hoy afirma «ni cookies de
   terceros»), `docs/legal/politica-de-privacidad.md` (cookies de
   terceros y transferencia a Google) y
   `docs/legal/registro-de-tratamientos.md` (tratamiento nuevo), todo
   validado con el checklist de `docs/legal/`.
-  **Riesgo conocido:** el revisor de AdSense ve el sitio **sin
   sesión**; una aplicación de gestión tras login con poco contenido
   público puede caer en «contenido insuficiente», y con `*.vercel.app`
   la aprobación **no está garantizada** (hay rechazos y casos de
   éxito documentados).

## Motivos de la pausa

1.  Suspensión pendiente de investigar en otro proyecto del mismo
   titular.
2.  Sin dominio propio: la aprobación y la depuración de la cuenta son
   más frágiles.
3.  Coste de complejidad real (CSP + consentimiento + revisión legal)
   antes de saber si va a merecer la pena.

## Alternativas descartadas

-  **Anuncios propios por zona**: ya implementados y en producción;
   es la vía por defecto mientras dure la pausa.
-  Redes publicitarias sin consentimiento: imposible, la normativa
   española exige consentimiento previo para cookies no necesarias.
