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
npx astro build                          # build (8 pages, debe ser 0 errores)
npm run preview -- --host 127.0.0.1 --port 4321   # preview, log: /tmp/evoruna-preview.log
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4321/   # debe ser 200
```

**Restart del server (CRÍTICO):**
```bash
kill $(pgrep -f "node_modules/\.bin/ast[r]o")   # SIEMPRE el truco del corchete
```
NUNCA `pkill -f "astro"` ni `kill $(pgrep -f "bin/astro")` → mata tu propia shell (exit -15).

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

## 8. Preferencias del usuario

- **Calidad sobre velocidad**: "con calma, no te apures que salga muy bien".
- **Itera rápido con mensajes cortos** → aplicar el fix inmediato, no discutir.
- **Estética premium minimalista**: Apollo-style navy/rojo/neón, SIN badges/kickers, padding consistente, imaginería profesional.
- **No tocar precios/textos de planes** (Starter/Pro/Business).
- **Confirmar antes de cambios grandes**; los ajustes visuales pequeños se aplican directos.
- Español casual peruano en el chat; respuestas siempre en español.

## 9. Pendiente / próximos pasos posibles

- Verificar el hover del card en browser REAL (el usuario no ha reportado problemas después del fix del clipping).
- Si el usuario pide más: ajustar opacidad del glass (actual 8–12%), o animaciones de entrada.
- Nada roto: build limpio, server 200 OK al momento de escribir esto.
