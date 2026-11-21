# PROGRESO — Landing Evoruna (handoff para el agente)

> Estado guardado el 2026-10-26 antes de reiniciar Hermes.
> Este archivo es la fuente de contexto: léelo al abrir una sesión nueva en este proyecto.

## 1. Proyecto

- **Raíz**: `/mnt/ssd/Apps/evoruna` — Frontend en `Frontend/` (Astro + Tailwind), Backend en `../Backend` (Hono + Cloudflare Workers, binding `ASSETS`).
- **Stack**: Astro 5.16.0 + Tailwind CSS v4 (NO React, NO MUI).
- **Estilo adoptado**: rediseño premium basado en https://apolloelectricals.co.uk/ — navy profundo, rojo eléctrico, verde neón, Sora + Inter, radius 12px (rounded-xl/2xl).
- **Idioma**: todo en español (código, textos, comentarios).

## 2. Sistema de diseño (en `Frontend/src/styles/global.css`)

| Token | Valor | Uso |
|---|---|---|
| `navy` | `hsl(222 47% 11%)` | Fondos oscuros, texto principal |
| `electric` (rojo) | `hsl(0 84% 50%)` | CTAs, acentos, hover |
| `neon` (verde) | `hsl(142 71% 45%)` | Indicadores "en vivo", verificación |
| `bg` | `hsl(210 20% 98%)` | Fondo claro de la página |
| `muted` | slate-ish | Textos secundarios |

- **Tipografía**: Sora 800 (headings, `font-display`) + Inter (cuerpo).
- **`scroll-padding-top: 77px`** en `html` — el header es `fixed` de 77px exactos; sin esto las anclas dejaban una línea visible debajo del navbar. VERIFICADO: título queda a 72px bajo la navbar (0 gap visible).
- **Padding unificado: `py-16` (64px)** en todas las secciones (Features, Solutions, Pricing, Trust, Faq). El usuario pidió "un tamaño que encaje perfecto" — no cambiar esto.

## 3. Estado de cada sección (componentes en `Frontend/src/components/landing/`)

| Componente | Estado final |
|---|---|
| `Header.astro` | Fixed 77px, blur, anclas: #home #features #solutions #pricing #trust #faq |
| `Hero.astro` | Fondo `bg.webp` (105KB, 1672×940), **solo 3 badges** (el usuario eliminó el 4to), logo-white.webp |
| `Features.astro` | `py-16`, **sin badge/kicker**, grid de features |
| `Solutions.astro` | `py-16`, **sin badge**, 3 cards con foto de fondo Unsplash + overlay navy, **número pasa a `text-electric` en `group-hover`** |
| `Pricing.astro` | `py-16`, **sin badge**, 3 planes (Starter S/200, Pro S/300, Business S/400) — precios y textos SAGRADOS, no tocar |
| `Trust.astro` | `py-16`, **sin badge** — VER SECCIÓN 4 (rediseño completo) |
| `Cta.astro` | Simplificado: **sin badge, sin "listo para arrancar", sin los 3 items de confianza** |
| `Faq.astro` | `py-16`, **sin badge**, acordeones |
| `Footer.astro` | 229 líneas, estándar |
| `ChatWidget.astro` | WhatsApp `51910376251` (Perú) |

**Regla del usuario**: NINGUNA sección (excepto Hero) lleva badge/kicker. Si aparece uno en el futuro, quitarlo.

## 4. Trust / Clientes — rediseño final (lo más reciente)

Evolución: fondo claro con tarjetas blancas → fondo oscuro navy con mosaico → **glass oscuro** → card premium.

- **Fondo**: `bg-navy` + mosaico de 6 fotos Unsplash (grid 3col, opacidad 40%, doble velo navy `bg-navy/50` + `bg-navy/30`) por encima.
- **Cuadro de estadísticas (Performance)**: glass `bg-white/8 backdrop-blur-md border-white/10`, números grandes en **blanco**, etiquetas slate-400, barras de "tiempo de respuesta" en degradado blanco (antes navy — no se veía sobre fondo claro, era el motivo del cambio).
- **Card de testimonio (rediseño premium, solo el card)**:
  - `w-[20.5rem] sm:w-[21.5rem]`, `p-6`, glass `bg-white/8 backdrop-blur-md`.
  - Header: avatar 44px (`bg-white/10 ring-white/25`) + nombre blanco + **check "verificado" verde neón** + rol slate-400.
  - **5 estrellas eléctricas + rating (5.0 / 4.8 alternado por index)** a la derecha.
  - Cita: `text-white/85`.
  - Footer: tiempo a la izq. + chip discreto **"Cliente Evoruna"** (`bg-white/5 text-white/60 ring-white/10`).
  - Hover: `hover:-translate-y-1` + línea de acento rojo superior (gradiente, aparece en hover) + sombra tinte rojo.
- **FIX clipping del hover**: el carrusel infinito usa `overflow-hidden`; al elevarse el card se cortaba. Solución aplicada: wrapper con **`-my-10 overflow-hidden py-10`** (40px de aire dentro del recorte, compensado con margen negativo para que el alto no cambie). Verificado: card a 40px de ambos bordes del clip.
- **Carrusel**: doble fila (2 `testimonialSet`), `animation: trust-scroll 55s linear infinite`, pausa en `hover`, `motion-safe:`.

## 5. IDs de Unsplash VERIFICADOS (curl HEAD = 200)

Usar **siempre** `?w=800&q=70`. **Verificar SIEMPRE con curl antes de usar** (muchos IDs plausibles dan 404).

**Trust (6 fotos de servicios):**
- `photo-1517248135467-4c7edcad34c4` — restaurante
- `photo-1583337130417-3346a1be7dee` — veterinaria
- `photo-1576091160399-112ba8d25d1d` — clínica
- `photo-1441986300917-64674bd600d8` — tienda de ropa
- `photo-1509440159596-0249088772ff` — panadería
- `photo-1487530811176-3780de880c2d` — floristería

**Solutions (3 fotos):**
- `photo-1454165804606-c3d57bc86b40`
- `photo-1547658719-da2b51169166`
- `photo-1551288049-bebda4e38f71`

Fotos que dieron **404** (no usar): mecánico y bodega, y varios IDs probados en 3 lotes de 8.

## 6. Comandos y workflow

```bash
cd /mnt/ssd/Apps/evoruna/Frontend
npx astro build                          # build (11 pages, debe ser 0 errores)
npm run preview -- --host 127.0.0.1 --port 4321   # preview, log: /tmp/evoruna-preview.log
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4321/   # debe ser 200
```

**Restart del server (CRÍTICO):**
```bash
kill $(pgrep -f "node_modules/\.bin/ast[r]o")   # SIEMPRE el truco del corchete
```
NUNCA `pkill -f "astro"` ni `kill $(pgrep -f "bin/astro")` → mata tu propia shell (exit -15).
El truco del corchete NO es suficiente si el MISMO command line contiene otro texto que completa el regex (p. ej. `grep 8787` en la misma línea hizo matchear `workerd serve.*878[7]` contra mi propia shell → exit -15). Pkill/kill en una llamada separada de la verificación.

**WORKER (wrangler dev, puerto 8787) — PITFALL:** el worker carga los assets de `Frontend/dist` al arrancar. Si se hace `astro build` (que borra y regenera `dist/`) con el worker corriendo, el worker queda sirviendo **404 en TODAS las páginas** (la API sigue funcionando) → hay que **rearranquear `wrangler dev` tras cada build** del frontend. Verificado 2026-10-27: con worker viejo → /login 404; tras restart → 200 y login real 200 + cookie + /me 200.

**Verificación en browser headless** (browser_exec):
- `vision_analyze` devuelve 500 con el modelo actual → verificar con **computed styles + JS** en vez de screenshots.
- `group-hover` / `hover:` de Tailwind v4 compila dentro de `@media (hover:hover)` → **no se puede disparar en browser automatizado** (sin mouse). Verificar inspeccionando el CSSOM. Funciona en browser real.
- Selectores JS: `svg.size-3.5` NO es selector CSS válido → usar `classList.contains`.
- Capturas de verificación: `…/browser-use/workspace/…/verificacion/` (01–21).

## 7. Pitfalls acumulados (¡no repetir!)

1. **Astro asset imports** devuelven `{src, width, height}` → usar `img.src` siempre (si no: `src="[object Object]"`).
2. **`write_file` sobre archivo existente** → "Refusing to overwrite" si no se hizo `read_file` primero en la sesión.
3. **Patch con old_string asumido** → falla si el archivo cambió antes. Re-leer antes de parchear; si falla 2 veces, reescribir con `write_file`.
4. **Patch context-aware de Tailwind corrompió un `<p>`** (creó `<p <p class=...>`) → siempre verificar el diff resultante del patch, no solo el "success".
5. **Server preview con CSS viejo** → hay que kill + restart tras cada build.
6. **scroll-padding** debe ser 77px (no 88, no 80).
7. **Animaciones de UI NO deben depender de `requestAnimationFrame`** → en tabs en background / headless los rAF no corren y el elemento queda congelado en el estado inicial invisible. La entrada de `Banner.astro` se anima con `@starting-style` (CSS puro); si el navegador no lo soporta el banner simplemente aparece (ver sección 17).

## 8. Preferencias del usuario

- **Calidad sobre velocidad**: "con calma, no te apures que salga muy bien".
- **Itera rápido con mensajes cortos** → aplicar el fix inmediato, no discutir.
- **Estética premium minimalista**: Apollo-style navy/rojo/neón, SIN badges/kickers, padding consistente, imaginería profesional.
- **No tocar precios/textos de planes** (Starter/Pro/Business).
- **Confirmar antes de cambios grandes**; los ajustes visuales pequeños se aplican directos.
- Español casual peruano en el chat; respuestas siempre en español.

## 9. Pendiente / próximos pasos posibles

- **Dashboard de cliente (VISUAL listo 2026-10-27, lógica pendiente)**: ver SECCIÓN 11. El usuario validará el visual y luego se conecta al backend real (crear tickets, descargar facturas, datos reales).
- Si el usuario pide más: ajustar opacidad del glass (actual 8–12%), o animaciones de entrada.
- Nada roto: build limpio (11 páginas), server 200 OK, flujo de auth verificado (2026-10-27).

## 10. Flujo de autenticación — rediseñado 2026-10-27

Páginas: `/login`, `/register`, `/forgot`, `/reset`, `/verify-email`. Componentes en `src/components/auth/` + `src/components/others/Loader.astro`.

- **`AuthShell.astro`** (nuevo): contenedor full-screen navy-gradient + glows rojo/neón + grilla con máscara radial (mismo lenguaje que Cta.astro), header con logo + "Volver al sitio", slots `panel` + default. Props: `withPanel` (2 columnas desktop / 1 columnas mobile) y `page` → `data-auth-page`.
- **`Panel.astro`**: columna de marca (login/register/forgot), oculta en mobile.
- **`Formulario.astro`**: card glass `bg-white/[0.06]` + `backdrop-blur-xl` + hairline rojo superior; inputs oscuros `bg-white/5` con iconos (data-icon), toggle password, submit `.btn-primary`, banners dentro de la card.
- **`Banner.astro`**: alerts glass dark por tipo (success=neón, error=electric, warning=ámbar, info=neutro), animación fade+slide, controlado por `window.showAuthMessage()`.
- **`Layout.astro`**: prop `title?` opcional (default: título del landing).
- **`src/scripts/auth-pages.js`** (nuevo): TODA la lógica de las 5 páginas (antes era inline con `define:vars`). Detecta la página por `data-auth-page`. `API_URL = import.meta.env.PUBLIC_API_URL ?? "/api"` (se reemplaza estáticamente). Endpoints sin cambios: `/api/auth/{login,register,forgot-password,reset-password,validate-reset-token,verify-email,me}`.
- **Mobile (390px)**: panel oculto, card 358px con margen 16px, sin overflow. **Desktop (1280px)**: grid 2 col 0.9fr/1.1fr.
- **Fix header en pantallas chicas (350px)**: el logo (1983×255, ratio ~7.8) a h-7 medía 218px y con el botón "Volver al sitio" no cabía en 350px → flexbox los comprimía. Solución: logo por escalones `h-[22px] min-[420px]:h-6 sm:h-7`, ambos con `shrink-0`, botón `whitespace-nowrap` compacto en mobile (`px-3 py-1.5 text-[13px] sm:px-4 sm:py-2 sm:text-sm`), header con `px-4 sm:px-6` (no container-x). Verificado a 350/390: logo 170×22 sin deformar (ratio 7.75 vs 7.78 original), botón 132px en una línea, overflow 0.
- **Card resaltada**: `bg-gradient-to-b from-white/[0.10] via-white/[0.06] to-white/[0.05]`, borde `white/14`, doble sombra `0 44px 100px -32px rgba(0,0,0,0.75)` + halo rojo `0 0 64px -16px rgba(230,57,70,0.28)`, hairline superior 2px `via-electric/70` (inset-x-10).
- **Verificado en browser**: validaciones (vacío, mismatch), banners por tipo, `?msg=`, redirects de /reset (sin token → /forgot; inválido → /forgot?msg=invalid_token), verify-email sin token → estado error, toggle password.

### PITFALL CRÍTICO — bundling de scripts en Astro 5.16
Un `<script>` con **cualquier atributo distinto de `src`** (incluido `type="module"`) se trata como `is:inline`: NO se bunea y los `import` relativos quedan sin resolver → **404 en preview y producción** (solo funciona en `npm run dev`; el bug era preexistente, confirmado contra el build de HEAD).
Regla: scripts de página → archivo externo en `src/scripts/` + `<script src="../scripts/x.js"></script>` **SIN** `type`/`define:vars`. Los scripts inline autocontenidos sin imports (banner, toggle) sí pueden llevar `type="module"` (se quedan tal cual y funcionan).

Nota: el `🐴` que aparece en `document.title` en el browser de verificación NO es del proyecto (no está en dist/src) — artefacto del entorno del navegador.

## 11. Dashboard de cliente — fase VISUAL (2026-10-27)

El usuario pidió un dashboard profesional (ver detalles, generar tickets, descargar facturas) y definió la estrategia: **visual primero con datos mock, lógica después**. El modelo antiguo (SPA que llamaba `/api/dashboard` inexistente) se movió a `src/components/dashboard-old/` (no eliminado, de referencia).

**Rutas** (todas 200 en preview): `/dashboard` (Resumen), `/dashboard/tickets`, `/dashboard/facturas`, `/dashboard/cuenta`.

| Archivo | Rol |
|---|---|
| `src/data/dashboard-mock.ts` | Tipos (Ticket, Invoice, Activity) + mockUser/Plan/Site + 5 tickets, 4 facturas, 5 actividades + `formatMoney()` (S/ es-PE) |
| `src/components/dashboard/Shell.astro` | Shell propio (no reusa Layout del landing): sidebar navy, topbar mobile, fondo grid + glow rojo |
| `src/components/dashboard/{StatusBadge,StatCard,TicketItem,InvoiceRow,ActivityItem}.astro` | Piezas de UI (chips de estado, stat cards, filas) |
| `src/scripts/dashboard-ui.js` | Guard de sesión + drawer + filtros + toasts + demos (UN solo script compartido por las 4 páginas — regla de bundling, sin attrs) |
| `src/pages/dashboard/index.astro` + `tickets/facturas/cuenta.astro` | Las 4 páginas |

**Decisiones técnicas:**
- **Routing**: `src/pages/dashboard/` como carpeta con `index.astro` (NO `dashboard.astro` + `dashboard/` a la vez — el build genera `dist/dashboard.html` y la carpeta `dist/dashboard/` conviven, y el servidor resuelve `/dashboard` → `dashboard.html`; `/dashboard/` con barra da 404, consistente con el resto del sitio por `trailingSlash: 'never'`).
- **Drawer mobile**: `w-full lg:w-[280px]` + `translate-x-full`. CRÍTICO: un drawer de 280px fijo en viewport 390px con `translate-x-full` deja una franja de 110px visible — el drawer debe ocupar el ancho completo en mobile para que el translate lo oculte por completo. Verificado: cerrado → left=390 (fuera de pantalla), abierto → left=0.
- **Tailwind v4**: `translate-x-full` usa la propiedad CSS `translate` (NO `transform`) → al verificar en browser, leer `getComputedStyle(el).translate`, no `.transform`.
- **Guard de sesión**: `sessionStorage['evoruna_session_hint']` (misma clave que auth.js) → sin hint, redirect a `/login`. Verificado: tab sin hint → /login.
- **Interacciones demo** (se reemplazan en la fase de lógica): crear ticket (agrega fila TK-XXXX + toast), filtros de tickets, download de factura (toast), cambio de contraseña (toast).

**Verificado en browser (computed styles):** desktop 1265 (sidebar 280, topbar oculto, main pad-left 280, sin overflow), 390 (drawer off-canvas cerrado / full-width abierto, overlay abre/cierra), 350 (topbar: logo 68→223 + burger, sin overflow), flujo de creación de ticket, filtros, toasts. Build: 11 páginas.

**Fase siguiente (lógica, pendiente de validación visual del usuario):** endpoints en Hono (`/api/dashboard` con tickets/facturas/cuenta), crear ticket real, generar/descargar PDF de factura, datos reales en vez de mock. El schema SQL en `Backend/db/schema.sql` ya tiene tablas de clientes/facturas/tickets.

## 12. Fase LÓGICA — auth completo sobre Hono + Worker unificado (2026-10-27)

El usuario pidió: Astro + Hono en UN SOLO Cloudflare Worker (landing estático vía `ASSETS`, resto por Hono), con login, registro y recuperación de contraseña, correos de verificación por Resend, buenas prácticas.

**Arquitectura (verificada contra `wrangler dev` en 127.0.0.1:8787):**
- `Backend/src/index.ts`: Hono monta `/api/auth` → `routes/auth.ts`; `/api/*` inexistente → 404 JSON (no HTML); resto → `c.env.ASSETS.fetch` (el `dist/` de Astro). `wrangler.jsonc`: `assets.directory = ../Frontend/dist`, binding `ASSETS`, D1 binding `DB`.
- Frontend llama a `/api/...` misma origen (`API_URL = import.meta.env.PUBLIC_API_URL ?? "/api"`); login usa `credentials: "include"`.

**Backend (`Backend/src/routes/auth.ts` + `src/auth/`):**
- Endpoints: `login`, `register`, `forgot-password`, `reset-password` (cuerpo `{token, new_password}`), `verify-email?token=`, `validate-reset-token`, **`me`** (nuevo), **`logout`** (nuevo).
- Sesión: JWT HS256 (`tokens.ts`, payload `{sub, email, type, iat, exp}`) en cookie `evoruna_token` → `HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`. Logout la borra con `Max-Age=0`.
- Buenas prácticas aplicadas: rate limiting in-memory por IP+ruta (`rate-limit.ts`: login 10/15min, register/forgot 5/15min), login timing-safe con hash bcrypt dummy (usuario inexistente vs clave errada indistinguibles), bloqueo de login si `suspended` o `email_verified = 0`, tokens de un solo uso (verify-email usado → 400), rollback en D1 si Resend falla en register (502, usuario NO queda creado), mensajes de error genéricos en forgot/reset (no revelan si el email existe).
- `reset-password` invalida la sesión anterior al cambiar la clave.

**Secrets:**
- Dev: `Backend/.dev.vars` (gitignored) con `JWT_SECRET` (hex 32) y `RESEND_API_KEY`. **Key real configurada el 2026-11-03** — dominio `evoruna.com` verificado en Resend (con envío habilitado); `velocry.com` sigue en `not_started`, no usar. `RESEND_FROM` en `wrangler.jsonc`: `Evoruna <no-reply@evoruna.com>`.
- Producción: `npx wrangler secret put RESEND_API_KEY` / `JWT_SECRET`. `wrangler.jsonc` trae `database_id: "PASTE_DATABASE_ID_AQUI"` → reemplazar con el id de `npx wrangler d1 create evoruna`. `APP_URL` en producción = URL pública del dominio (sin barra final).

**Frontend conectado:**
- Mínimo de contraseña: **4 caracteres** (antes 8) — `minlength="4"` en `Formulario.astro` (login/register/reset), hint "Mínimo 4 caracteres" en register, y backend `register`/`reset-password` validan `< 4`. Cambiado el 2026-10-27.
- `src/scripts/auth.js`: añade `readJson()`, `setSessionHint/clearSessionHint()`, `logout(apiUrl)` (POST `/auth/logout` + limpia hint + redirect /login), `requireSession(apiUrl)` (GET `/auth/me` con `credentials: "include"` → usuario o redirect /login).
- `src/scripts/dashboard-ui.js` (reescrito): `requireSession(API_URL)` como guard REAL (ya no solo sessionStorage), hidrata nombre/email/iniciales en el Shell (hooks `data-user-name`, `data-user-email`, `data-user-initials`, `data-greeting`), logout contra el backend.
- Contrato verificado en ambos lados: login `{email, password}` → `{name, email, role}` + cookie; reset `{token, new_password}`; verify `?token=`.

**Verificación end-to-end (Worker local + D1 local, script en scratch `test-auth.py`):**
/me sin sesión 401 · login sin verificar 403 · verify-email 200 · verify reusado 400 · login 200 + cookie HttpOnly/Lax · /me con sesión 200 · logout 200 + Max-Age=0 · /me post-logout 401 · clave errada 401 · usuario inexistente 401 (mismo mensaje) · register sin Resend válido 502 + rollback (usuario no persiste) · forgot 502 · páginas `/`, `/login`, `/register`, `/verify-email`, `/reset`, `/dashboard{,/tickets,/facturas,/cuenta}` → 200. `tsc --noEmit` → 0 errores.

**Resend ACTIVO (2026-11-03):** `register` crea la cuenta con `email_verified=0`, envía el correo de activación por Resend y guarda el token; si Resend falla se revierte el usuario (502). Verificado E2E contra la key real: register 201 + email `sent` en la API de Resend · login pre-verificación 403 · verify-email 200 · login post-verificación 200 · forgot-password 200 + email "Restablece tu contraseña" `sent`. El flujo de correos NUNCA se modificó en la sesión del 2026-11-03; lo único que cambió en `auth.ts` fue quitar la creación de factura falsa al registrar (ver SECCIÓN 15).

**Pendiente:**
1. **Producción**: `npx wrangler secret put RESEND_API_KEY` / `JWT_SECRET` (la key de dev solo vive en `.dev.vars` local) y reemplazar `database_id` en `wrangler.jsonc`.

## 13. Fase LÓGICA del dashboard — COMPLETA (2026-10-27)

El usuario pidió que "toda la lógica funcione perfectamente", simple y sin dividir en muchos módulos. Mock eliminado (borrados `dashboard-mock.ts`, `TicketItem.astro`, `InvoiceRow.astro`, `ActivityItem.astro`).

**Backend (1 archivo nuevo):**
- `Backend/src/routes/dashboard.ts`: sub-app Hono montada en `/api/dashboard` desde `index.ts`.
  - `GET /` → UN solo JSON con todo: `{user, plan, tickets, invoices, activity}` (tickets+facturas de D1, plan fijo `{name:"Pro", priceCents:30000}` exportado desde `auth.ts`, activity derivada de tickets/facturas + alta).
  - `POST /tickets` → crea ticket (valida subject/category, 201).
  - `GET /invoices/:id/download` → PDF real generado inline (bytes crudos, sin librería), `Content-Type: application/pdf` + `Content-Disposition: attachment`.
- `auth.ts`: `getSessionUser()` compartido + `POST /change-password` `{current, new_password}`.
- `db/schema.sql`: tablas `tickets` + `invoices` aplicadas al D1 local.

**Frontend (1 solo script):**
- `src/scripts/dashboard-ui.js` (reescrito, ~425 líneas, UN único archivo): guard de sesión, hidratación del shell, fetch de `/api/dashboard`, render de stats/tickets/facturas/activity en las 4 páginas, form de ticket, cambio de contraseña, logout, toasts.
- Páginas: skeletons + hooks `data-*` (sin datos server-side). **PITFALL Astro:** en componentes, `data-value="x"` NO crea el prop `dataValue` (Astro no convierte guiones a camelCase) → se pasó `dataValue="x"` / `dataSub="x"` y quedó renderizado.
- Inputs de forms usan `name=` (no `id=`): email/password en auth, subject/category/priority/description en tickets, current/new/confirm en change-password.

**E2E verificado en browser real (2026-10-27):** login → dashboard con datos reales (stats Pro/S/300, 2 tickets, 2 facturas, 5 activities) · tickets: lista + creación por form (TK-0004) · facturas: 2 filas + links PDF (`/api/dashboard/invoices/{id}/download`, PDF válido %PDF-1.4) · cuenta: datos reales · cambio de contraseña por UI (toast) · logout → /login · re-login con la nueva clave · register → login inmediato SIN verificación de email (suspendida) · email duplicado 409 · PDF de id inexistente 404 · ticket vacío 400. `tsc --noEmit` 0 errores · build 11 páginas 0 errores.

**Datos demo (D1 local):** `carlos@empresa.pe` — contraseña actual **`runa1234`** (cambiada durante pruebas), plan Pro, 2 facturas (FV-0001 pagada, FV-0002 pendiente), 4 tickets.

**Sesión 100% backend (2026-10-28):** se eliminó el "hint" de `sessionStorage` (`evoruna_session_hint`) de `auth.js` y `auth-pages.js` (y restos en `AdminPage.astro`). La cookie httpOnly + `GET /auth/me` es la ÚNICA fuente de verdad: `requireSession()` y `redirectIfAuthenticated()` siempre consultan al backend sin caché client-side. Verificado en browser: con sessionStorage vacío la sesión persiste al recargar; sin cookie /dashboard → /login y /me → 401; logout mata la sesión en el servidor.

## 14. Estructura del dashboard — decisión 2026-10-28 (SE MANTIENE)

El usuario pidió reducir archivos ("muy dividido"). **Decisión: la estructura actual ya es la mínima razonable en Astro y se mantiene.**

- 4 páginas (1 por ruta: `index`, `tickets`, `facturas`, `cuenta`) — así funciona el routing de Astro; unirlas obligaría a una SPA de pestañas (pierde deep-links, cambio de UX).
- `Shell.astro` (162 líneas) — layout compartido; sin él se duplicaría 4 veces.
- `StatCard.astro` (43) + `StatusBadge.astro` (38) — se intentó unirlas en `bits.astro` como **componentes de función** (export named) y el build falló: en Astro 5.16, los function components en `.astro` NO aceptan atributos JSX en elementos intrínsecos (`class`, `className`, `href="str"`, `class:list` → error de parse de esbuild). Solo funcionan tags sin atributos, `id`, `data-*` y spread `{...{...}}`. En proyecto sin framework, `.jsx` no es opción (no hay renderer). Los dos componentes vuelven a su formato original (componente default con `interface Props` + template) y se eliminó `bits.astro`.
- `dashboard-ui.js` (~425) — todo el JS del dashboard en un solo script.

**Total: 4 páginas + 3 componentes + 1 script.** Verificado post-revert: build 11 páginas 0 errores, worker reiniciado, login demo → stats reales (Pro, 3 tickets, 2 facturas) y badges en /dashboard y /dashboard/cuenta.

## 15. Estado vacío del dashboard — la cuenta empieza sin datos (2026-11-03)

El usuario pidió que una cuenta nueva NO muestre plan, facturas ni actividad ("recién compraré un producto"). Los datos eran inventados en 3 capas: `register` creaba una factura inicial falsa, `dashboard.ts` devolvía siempre plan "Pro", y el frontend no manejaba el vacío.

**Backend:**
- `auth.ts`: eliminada `crearFacturaInicial()` — `register` ya no crea la factura "inicial" (FV-XXXX). Cuenta nueva = solo usuario + correo de verificación. El rollback si falla Resend es solo DELETE user. El flujo de correos (Resend, tokens, verify) quedó intacto.
- `dashboard.ts`: `plan` condicional — si el usuario tiene facturas en D1 → `{name, priceFormatted, renewal}` (derivados de la factura más reciente); si no → `null`. Actividad: eliminada la entrada fija "Cuenta creada"; solo tickets + facturas reales.

**Frontend (estado vacío):**
- `dashboard-ui.js`: nueva `emptyRow(texto)`; `renderResumen`/`renderFacturas`/`renderCuenta` manejan `plan === null` → "Sin plan", "Sin sitio", "Sin suscripción activa", "Sin facturas todavía", "Sin actividad todavía".
- `index.astro`: StatCard "Sitio" dinámico (default "— / Sin producto"); los StatusBadge de plan y última factura quedaron envueltos en `<span data-plan-badge>` / `<span data-last-invoice-badge>` para que el JS los oculte cuando no hay datos.
- `facturas.astro`: línea de plan dinámica (`data-invoice-plan-line`, default "Sin plan activo").
- `cuenta.astro`: eliminado el badge falso "Email sin verificar" (todo usuario que llega al panel ya está verificado) y la tarjeta "Tu sitio" con datos inventados (minegocio.pe, uptime, SSL) → placeholder "Aquí verás los datos de tu sitio cuando compres un producto."

**E2E verificado (2026-11-03, script persistente en `Backend/scripts/e2e-final.sh` — sana `.dev.vars` en runtime, sin secrets literales):** register 201 → email por Resend → verify 200 → login 200 → dashboard JSON `{plan: null, invoices: [], tickets: [], activity: []}`. Browser: /dashboard "Sin sitio / Sin plan / 0 activos / 0 facturas" · /dashboard/facturas "Sin facturas todavía" · /dashboard/tickets "0 registrados" · /dashboard/cuenta "Sin plan" + badge oculto. Regresión `carlos@empresa.pe` intacta (Pro, 2 facturas, 4 tickets, 5 actividades, badges visibles). Usuarios de prueba limpiados de D1 (quedan solo carlos@empresa.pe, jean@evoruna.com y jeanoi.py@gmail.com).

**Nota:** el D1 local tenía la factura falsa FV-0003 (user 19, `jeanoi.py@gmail.com`) creada por el viejo `register` — eliminada; el user 19 ahora tiene 0 facturas y su panel muestra el estado vacío.

## 16. Correos Resend — rediseño premium (2026-11-08)

El usuario pidió rediseñar las plantillas de correo (verificación + reset) para que se vean modernas y profesionales.

**Archivos:**
- `Backend/src/auth/templates/layout.ts` (NUEVO): shell compartido — estructura por tablas + estilos 100% inline (compat Gmail/Outlook/Apple Mail), `role="presentation"`, metas `x-apple-disable-message-reformatting` + `color-scheme: dark`. `emailLayout({preheader, icon, title, intro, buttonLabel, buttonHref, note, siteUrl})`.
- `verification-email.ts` / `password-reset.ts`: ahora solo definen contenido (icono ✓ neón / 🔒 rojo, textos) y delegan al layout. Firma ampliada con `siteUrl`.
- `email.ts`: pasa `env.APP_URL ?? ''` al footer.

**Diseño (idéntico lenguaje a las páginas de auth):**
- Fondo `#0F1729` (navy), card `#172036` (navy-800) hairline `white/8`, radius 16px, sombra.
- Barra de acento roja 3px en degradado (fallback `bgcolor` para Outlook).
- Wordmark "EVORUNA" (rojo 9px + letter-spacing 3px) — SIN imagen remota (webp no es fiable en email).
- Icono circular 56px: verificación = ✓ en verde neón, reset = 🔒 en rojo.
- Botón: tabla `td` con `bgcolor` rojo + degradado `linear-gradient(135deg, #EB1414, #F53D3D)` (Outlook cae al sólido), radius 12px.
- Fallback "copia y pega la URL" + nota de expiración (TTL) + footer `© año Evoruna · dominio` (de `APP_URL`).
- Preheader oculto por email (aparece junto al asunto).

**Verificado:** `tsc --noEmit` 0 errores · render local inspeccionado en browser a 1280 (card 600px, colores exactos, sin overflow) y 375 (card 343px, sin overflow) · worker reiniciado · **envío REAL a Gmail** (plus-tag `jeanoi.py+correo-preview-4192960@gmail.com`): verification 201 + reset 200, ambos visibles en `api.resend.com/emails`. Usuario de prueba verificado quedó en D1 local (sirve para probar los links clicando; borrar si no se usa).

**PITFALL recordado:** `kill $(pgrep -f "workerd serve")` en la MISMA línea que el texto "workerd serve" → self-kill (exit -15). Usar el truco del corchete `pgrep -f "workerd [s]erve"` y kill en llamada separada.

**FIX centrado (2026-11-09):** el usuario reportó botón y check descentrados. Causa: las tablas del icono y del botón llevaban `align="center"` PERO con `style="margin:... 0 ..."` — el margin explícito (left/right 0) anula los auto-margins que `align` genera (style > presentación) → izquierda en clientes reales. Fix: `margin:32px auto 24px auto` (icono) y `margin:0 auto 20px auto` (botón), conservando `align="center"` como fallback Outlook. Verificado midiendo bounding-rects en browser: centro icono/botón = centro card (Δ0 a 1280 y 375, Δ1 subpixel en 375). Correo reenviado (plus-tag `jeanoi.py+preview2-198463@gmail.com`): `last_event=delivered` en Resend.

**Notas de verificación Resend:** el endpoint de detalle NO trae `status` en esta cuenta → el estado de entrega va en `last_event` (`delivered`). El hot-reload de `wrangler dev` se cayó una vez con `✘ [ERROR]` vacío (miniflare) tras editar `layout.ts` → relanzar `wrangler dev` si la API da 000.

## 17. FIX banner de estados de auth — los mensajes NUNCA se veían (2026-11-15)

El usuario reportó que en login no aparecía NINGÚN mensaje de estado. El JS ya estaba bien (clases + texto correctos en el DOM) — el bug era CSS.

**Causa:** en `Banner.astro`, la base era `display: none` y `.auth-banner.show` solo definía `opacity: 1` + `transform` → **`display: none` nunca se anula**, el banner existía en el DOM con el mensaje puesto pero era invisible (verificado: `classes: "auth-banner error show"`, `display: none`).

**Fix (solo `Frontend/src/components/auth/Banner.astro`):**
- `.auth-banner.show` ahora incluye `display: flex` + `opacity: 1` + `transform: translateY(0)`.
- La animación de entrada (fade + slide 0.25s) la aporta un `@starting-style { opacity: 0; transform: translateY(-6px); }` dentro de la misma regla — CSS puro, SIN `requestAnimationFrame` (la versión intermedia con doble rAF quedaba congelada en opacidad 0 en tabs en background; los rAF no corren ahí). Navegadores sin `@starting-style` (muy viejos): el banner aparece sin fade.
- JS simplificado: `showAuthMessage` agrega `show` síncrono; `hideAuthMessage` lo quita. Sin clase `on`.

**Verificado en browser (worker 8787, build fresco):** login fallido → error banner "Credenciales inválidas" visible (flex, opacity 1, icono ok, 366×48) · register duplicado → error "El correo ya se encuentra registrado" · register nuevo → success "Hemos enviado un correo de verificación. Revisa tu bandeja." · botón cerrar → `display: none`. Nota de verificación: en el tab de pruebas (background) las transiciones CSS se throttlean — medir con `transition: none` o esperar; el estado objetivo (flex + opacity 1) es el que importa.

**Nota de seguridad (decisión del usuario 2026-11-15):** el login mantiene el mensaje genérico "Credenciales inválidas" para cuenta inexistente y contraseña errada (timing-safe con hash dummy) — se propuso separarlos por legibilidad y el usuario eligió mantenerlo genérico (evita enumeración de usuarios).

### 17b. Banner superpuesto — cero shift de layout (2026-11-15, mismo día)

El usuario reportó que al aparecer el banner "mueve todo hacia abajo... se ve feo" (pasaba de display none a flex EN FLUJO → +60px que empujaban título/form/footer). Fix en `Banner.astro` (solo CSS):

- `.auth-banner` → `position: absolute; top:0; left:0; right:0; z-index:20` (el `<section>` de la card ya es `relative`; top:0 cae en el borde del padding box = zona del padding superior de la card). Se quitó `margin-bottom`.
- Fondo ahora **sólido** `rgba(13,20,36,0.94)` + `box-shadow 0 12px 32px -8px rgba(0,0,0,0.45)` — necesario porque el banner queda superpuesto (antes era glass casi transparente, que no funciona encima de contenido). Los tintes por tipo pasaron de `background-color` a `background-image: linear-gradient(135deg, tinte, transparent 60%)` (un `background-color` transparente anularía la base sólida).
- `.show` + `@starting-style` sin cambios (fade de entrada intacto).

**Verificado midiendo getBoundingClientRect antes/después del error** (worker 8787): card [110,719,448×518], h2 [151,…,46], form [261,…,271], footer [565,…], submit [482,…] → **idénticos en ambos estados** (cero movimiento). El banner (111–159px) ocupa la zona de padding superior de la card y apenas roza 8px del borde superior del título (que queda prácticamente visible completo). Mobile: sin overflow, banner dentro de la card (ancho 446 vs card 448). Cerrar → display none.

### 17c. Auto-ocultado del banner (2026-11-15, mismo día)

El usuario reportó que el banner "no se borra" — solo se iba con la X. Fix en `Banner.astro` (JS, dentro del `<script type="module">`):

- `AUTO_HIDE_MS = 5000`: `showAuthMessage` agenda `scheduleAutoHide()` → `setTimeout` 5s → `hideAuthMessage()`. El timer se reinicia con cada mensaje nuevo y se limpia en `hideAuthMessage` (también al cerrar con la X).
- Pausa por hover: `mouseenter` cancela el timer; `mouseleave` lo reagenda con `AUTO_HIDE_RESUME_MS = 1500` (solo si el banner sigue visible). Evita borrar el mensaje mientras el usuario lo lee.
- Sin `requestAnimationFrame` (pitfall 7); solo `setTimeout`, que funciona en tabs de fondo.

**Verificado E2E sobre el worker 8787:** login inválido → t=2s banner visible ("Credenciales inválidas") → t=6s `display: none` (desapareció solo). Pausa hover probada sobre el HTML de dist: con `mouseenter` sigue visible a los 6.5s; tras `mouseleave` se oculta entre +1.0s y +2.0s.

### 17d. Reenvío automático de verificación al hacer login (2026-11-15, mismo día)

El usuario quedó atascado: su cuenta (jeanoi.py@gmail.com) no verificada + token de verificación vencido (TTL 30 min) = calle sin salida: `verify-email` devolvía 400 (enlace expirado), el login devolvía 400→403 sin emitir token nuevo, y `forgot-password` bloquea cuentas no verificadas.

Fix en `POST /api/auth/login` (`Backend/src/routes/auth.ts`): si las credenciales son correctas pero `email_verified = 0`, se emite un **nuevo token de verificación** (reutilizando `createEmailVerificationToken` + `storeToken`, que sustituye al anterior) y se **reenvía el correo** por Resend. Respuesta:

- 403 + "Tu correo no está verificado. Te hemos enviado un nuevo correo de verificación. Revisa tu bandeja." (éxito del reenvío)
- 502 + "...y no se pudo reenviar el correo de verificación. Inténtalo de nuevo." (falla Resend)

El frontend no cambió: el handler de login ya muestra `data.error` del backend en el banner (auth-pages.js ~línea 64). El loop de recuperación queda cerrado: enlace expirado → página verify-email (error + botón "Ir al inicio de sesión") → login → nuevo correo. El rate limit de login (10/15 min por IP) limita el spam de reenvíos.

**Verificado E2E (worker 8787):** cuenta desechable test.resend@evoruna.com → registro 201 → token expirado artificialmente (`UPDATE ... expires_at = datetime('now','-1 hour')`) → login con credenciales correctas → 403 con el nuevo mensaje → BD con **1 token vigente** (`expires_at` futuro, `viginte=1`) reemplazando el vencido → cuenta de prueba eliminada.

**Para el usuario (cuenta real jeanoi.py@gmail.com):** basta con intentar el login con su contraseña — llegará un correo nuevo con enlace de 30 min. Revisar spam de Gmail si no aparece (si el primero fue a spam, el reenvío también puede ir).

## 18. Dashboard funcional al 100% — edición de perfil + compra de plan (2026-11-16)

Los dos botones que decían "se conectará al backend" ("Editar perfil" y "Cambiar plan" en Mi cuenta) ahora hacen de verdad, contra el mismo Hono local.

**Backend (`Backend/src/routes/dashboard.ts`, `auth/tokens.ts`, `auth/email.ts`, `routes/auth.ts`):**
- `PUT /api/dashboard/profile` — nombre se aplica de inmediato (minúsculas en BD, convención existente); correo → token `change-email` (30 min) + enlace enviado al **nuevo** correo; el cambio solo se aplica al confirmar (endpoint `GET /api/auth/verify-email` ahora polimórfico: acepta `verify-email` Y `change-email`).
- `POST /api/dashboard/subscribe` — crea factura pendiente `EV-{año}-{seq:4}` con el periodo actual y el precio del plan (S/ 300.00, centavos 30000 en BD). Idempotente: si ya hay una pendiente devuelve la misma (200); si el plan está activo, 409.
- `POST /api/dashboard/invoices/:id/pay` — marca la factura `paid` (simula el cobro) y devuelve la factura actualizada.
- `GET /api/dashboard` — `plan` solo existe si hay factura **pagada** (`status='paid'`; pendiente no activa); añade `plans: [{name, priceCents, priceFormatted}]` como fuente única del plan disponible.
- Token: `TokenType` incluye `'change-email'` (TTL 30 min, hash SHA-256 en BD como los demás). Plantilla `templates/email-change.ts` + `sendEmailChangeEmail`.

**Frontend (`Frontend/src/pages/dashboard/cuenta.astro`, `Frontend/src/scripts/dashboard-ui.js`):**
- "Editar" abre un panel inline (`#profile-panel`) con form → `PUT /profile`; toast según `pendingEmail` (info si hay correo pendiente de confirmar, success si no).
- "Cambiar plan" abre el panel de compra (`#checkout-panel`): si no hay plan, "Comprar plan" → `POST /subscribe` → la fila aparece en Facturas con botón **Pagar** (injetado dinámicamente en `renderFacturas`); con factura pendiente el panel muestra "Pagar ahora" → `POST /invoices/:id/pay` → plan activo. Con plan activo el panel muestra el estado activo (sin doble compra).
- `refresh()` recarga y re-renderiza todo tras comprar/pagar; los botones de pago de la lista de facturas usan delegación de eventos (sobreviven a re-renders).
- Se eliminó el handler genérico `data-soon` (solo toast) — ya no existe `data-soon` en el dashboard.

**Verificado E2E (worker 8787, script `/home/jean/.hermes/cache/scratch/e2e_dashboard.py`):** registro 201 → verify-email 200 → login 200 → `GET /api/dashboard` plan:null + plans[Pro 30000] → `PUT /profile` nombre 200 → `PUT /profile` email → pendingEmail + token → confirmación 200 + email actualizado en BD → `POST /subscribe` 201 (EV-2026-0001, pending) → plan sigue nulo con factura pendiente → `POST /pay` 200 paid → plan Pro activo (renewal "01 dic 2026") → re-suscripción 409. Cuenta de prueba eliminada; BD vuelve a sus usuarios reales.

**Notas:**
- El botón "Pagar" simula el cobro (no hay gateway). Para pagos online reales ver la respuesta sobre gateways (Stripe no opera en Perú; opciones: Mercado Pago, dLocal, Culqi — el webhook del gateway marcaría `invoices.status='paid'` y el plan se activa solo, sin cambiar el resto).
- `wrangler d1 execute` imprime un banner antes del JSON: parsear desde el primer `\n[`; estructura `[{results: [...]}]`.
- El rate limit de registro es por IP y vive en memoria del worker: reiniciar `wrangler dev` lo resetea (útil al repetir E2E desde 127.0.0.1).
- `register` NO emite cookie de sesión: tras verificar el correo, el flujo real hace login (como el E2E).
