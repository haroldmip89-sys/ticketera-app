# 005 — Hero de destacados: panel partido con miniaturas de progreso

- **Estado:** done (APPROVED por reviewer en iteración 1)
- **Modo:** SDD
- **Módulo(s):** `src/modules/events` (Hero y su lógica de estado). Transversal: `src/lib` (`formatDateLong`, `withImageWidth`), `src/hooks` (`usePrefersReducedMotion`), `src/app/globals.css` (tokens del panel oscuro y animación de progreso), `src/app/(site)/page.tsx`.
- **Depende de:** 003 y 004 implementadas y en verde.
- **Diseño fuente:** `docs/design/reference-design.md` §2.1 punto 3 ("Hero A: panel partido", desktop y móvil) y §3.2. La variante `HeroB` (§2.2) **no** se adopta (solo existe en desktop; el usuario eligió seguir la referencia principal).

**Roadmap:** 003 paleta + events + descubrimiento · 004 shell · **005 Hero (esta)** · 006 detalle · 007 selección por zonas · 008 mapa de teatro · 009 búsqueda · 010 checkout + confirmación · 011 login/registro · 012 Mis entradas · 013 panel de organizador · 014 crear evento.

## Objetivo

Agregar a la landing, entre la intro y "Explora por categoría", el Hero de la referencia: un panel contenido (no full-bleed) con el evento destacado actual a la izquierda sobre fondo oscuro, la imagen a la derecha con fundido cruzado y controles, y una fila de 5 miniaturas que funcionan como pestañas y muestran el progreso del autoplay. Conserva todos los requisitos de accesibilidad del carrusel del AC7 de la 002, adaptados al nuevo diseño. Funciona a 375, 768 y 1280 px, en claro y oscuro, y el proyecto queda en verde.

## Fuera de alcance

- **006**: la página de detalle (destino de "Ver detalles"). **007**: la página de selección (destino de "Comprar entradas"). Hasta entonces, esos links dan 404 (aceptado, igual que las tarjetas de la 003).
- Gesto de swipe sobre la imagen (D3).
- Cambios en `EventItem`, en el mock o en el service de la 003: se usa `getFeatured()` tal cual (5 eventos).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `eventsService.getFeatured()`, `EventItem` | reutilizar (003) | `src/modules/events/**` | Sin cambios. Devuelve evt-001, 002, 003, 004, 007. |
| `formatPrice`, `formatDateShort`, `getZonedDateParts` | reutilizar (003) | `src/lib/*` | |
| `Badge` | reutilizar (003) | `src/components/ui/badge.tsx` | "Últimas entradas" sobre la imagen. |
| `Button` | reutilizar | `src/components/ui/button.tsx` | Controles de la cápsula (`variant="ghost" size="icon"`). |
| `getEventHref` | reutilizar (003) | `src/modules/events/utils/event-routes.ts` | "Ver detalles". |
| `getEventTicketsHref` | extender | `src/modules/events/utils/event-routes.ts` | Nuevo helper `"/events/{slug}/tickets"` (página de la 007). |
| `formatDateLong` | extender | `src/lib/format.ts` (+ test) | "sábado 3 de octubre" (referencia). La reutilizan 006 y 007. |
| `withImageWidth` | crear | `src/lib/image-url.ts` (+ test) | La imagen del mock viene con `w=800`; el panel mide hasta ~760 px de ancho (1520 px en pantallas 2x). La reutiliza la 006. |
| `usePrefersReducedMotion` | crear | `src/hooks/use-prefers-reduced-motion.ts` (+ test) | Lectura SSR-segura de `prefers-reduced-motion`. Segundo consumidor real en la 008 (mapa de teatro). No existe nada equivalente. |
| Lógica de estado del carrusel | crear | `src/modules/events/utils/featured-carousel.ts` (+ test) | Reducer puro: navegación, pausa del usuario y pausas temporales. |
| `FeaturedEventsHero` | crear | `src/modules/events/components/featured-events-hero.tsx` | Server async: `getFeatured()` → carrusel. |
| `FeaturedEventsCarousel` | crear | `src/modules/events/components/featured-events-carousel.tsx` (+ test) | Client: panel, imagen, controles, región viva. |
| `FeaturedEventThumbnails` | crear | `src/modules/events/components/featured-event-thumbnails.tsx` | Fila de miniaturas con barras de progreso (presentacional). |
| `swiper` | **no se usa** (eliminado en la 004) | — | Ver D1. |
| Tokens `--stage*` y animación `featured-progress` | crear | `src/app/globals.css` | Panel oscuro (lo reutiliza la 006) y barra de progreso. |

**Recuento de archivos de producción:** 10 (3 extensiones pequeñas: `format.ts`, `event-routes.ts`, `globals.css`; 1 línea en `page.tsx`). Cerca de la guía; cada tarea paralela tiene 1–2 archivos.

## Contratos

### C1 — Tokens (P1, `src/app/globals.css`)

| Token | `:root` | `.dark` | Uso |
|---|---|---|---|
| `--stage` | `#1E1B4B` | `#1E1B4B` | Fondo del panel oscuro (Hero y, en la 006, hero del detalle) y de respaldo de la imagen |
| `--stage-foreground` | `#FFFFFF` | `#FFFFFF` | Título, precio |
| `--stage-muted` | `#E0E7FF` | `#E0E7FF` | Fecha y lugar |
| `--stage-subtle` | `#C7D2FE` | `#C7D2FE` | Contador "01 / 05", "Desde" |

- Iguales en ambos temas: el panel es un "escenario" oscuro fijo, como una foto (D5). Contraste sobre `--stage`: blanco 16:1, `--stage-muted` 13:1, `--stage-subtle` 10.7:1; el anillo `--ring` claro (`#6366F1`) 3.6:1 (≥ 3:1).
- Mapeos `@theme inline`: `--color-stage`, `--color-stage-foreground`, `--color-stage-muted`, `--color-stage-subtle`.
- Animación (en `@theme`): `--animate-featured-progress: featured-progress 6s linear forwards;` con `@keyframes featured-progress { from { width: 0% } to { width: 100% } }` → clase `animate-featured-progress`.

### C2 — Formato e imagen

```ts
// src/lib/format.ts (se añade; no cambia las funciones de la 003)
/** "sábado 3 de octubre" en APP_TIME_ZONE (referencia: "lunes 5 de octubre"), sin año. */
export function formatDateLong(value: string | Date): string

// src/lib/image-url.ts
/** Fija el parámetro `w` si el host es images.unsplash.com, conservando el resto de parámetros.
 *  Otra URL, o un string que no sea URL absoluta, se devuelve sin cambios. */
export function withImageWidth(url: string, width: number): string
```
Tablas fijas nuevas en `format.ts` (minúscula): días largos `domingo lunes martes miércoles jueves viernes sábado`; meses largos `enero … diciembre`. Día sin cero inicial. Mismas reglas de determinismo que la 003.

### C3 — Rutas

```ts
// src/modules/events/utils/event-routes.ts (se añade)
/** "/events/{slug}/tickets" (paso 1 de la compra, 007). */
export function getEventTicketsHref(slug: string): string
```

### C4 — `usePrefersReducedMotion`

```ts
// src/hooks/use-prefers-reduced-motion.ts  ("use client")
/** true si (prefers-reduced-motion: reduce). useSyncExternalStore sobre matchMedia; snapshot de servidor = false. */
export function usePrefersReducedMotion(): boolean
```
Sin `window` en render ni `setState` en efectos (reglas de `eslint-plugin-react-hooks` 7). Reacciona al evento `change`.

### C5 — Estado del carrusel (`src/modules/events/utils/featured-carousel.ts`)

```ts
export const FEATURED_AUTOPLAY_MS = 6000

export type FeaturedCarouselState = {
  slideCount: number
  activeIndex: number
  cycle: number            // se incrementa en cada navegación o reanudación: reinicia la barra de progreso
  isUserPaused: boolean    // pausa explícita (botón) o arranque con reduced motion
  hasUserToggled: boolean  // el usuario ya usó play/pausa: reduced motion no lo pisa
  isHovered: boolean
  hasFocusWithin: boolean
  isInViewport: boolean
}

export type FeaturedCarouselAction =
  | { type: "next" } | { type: "prev" } | { type: "go"; index: number }
  | { type: "advance" }                      // fin de la barra de progreso
  | { type: "toggle-play" }
  | { type: "set-hovered"; value: boolean }
  | { type: "set-focus-within"; value: boolean }
  | { type: "set-in-viewport"; value: boolean }
  | { type: "reduced-motion-detected" }

export function createFeaturedCarouselState(slideCount: number): FeaturedCarouselState
//   { slideCount, activeIndex: 0, cycle: 0, isUserPaused: false, hasUserToggled: false,
//     isHovered: false, hasFocusWithin: false, isInViewport: true }
export function featuredCarouselReducer(state: FeaturedCarouselState, action: FeaturedCarouselAction): FeaturedCarouselState
/** slideCount > 1 && !isUserPaused && !isHovered && !hasFocusWithin && isInViewport */
export function isFeaturedCarouselRunning(state: FeaturedCarouselState): boolean
```

Reglas:
- `next`/`prev`: índice con vuelta (`(i ± 1 + n) % n`) y `cycle + 1`. `go`: índice normalizado al rango y `cycle + 1` (aunque sea el mismo índice: reinicia el temporizador, como la referencia).
- `advance`: igual que `next` **solo si** `isFeaturedCarouselRunning(state)`; si no, devuelve el mismo estado (evita avances tardíos tras pausar).
- `toggle-play`: invierte `isUserPaused`, `hasUserToggled = true`, y al reanudar `cycle + 1` (la barra arranca de cero).
- `reduced-motion-detected`: si `!hasUserToggled` → `isUserPaused = true`; si no, sin cambios.
- `set-*`: actualizan su campo. Con `slideCount <= 1`, `next`/`prev`/`go`/`advance` no cambian nada.
- Nunca muta el estado recibido.

### C6 — Componentes

```ts
// featured-events-hero.tsx  (server async, sin props)
export async function FeaturedEventsHero(): Promise<JSX.Element | null>
//   const events = await eventsService.getFeatured(); events.length === 0 → null

// featured-events-carousel.tsx  ("use client")
export type FeaturedEventsCarouselProps = { events: EventItem[] }   // length >= 1
export function FeaturedEventsCarousel(props: FeaturedEventsCarouselProps): JSX.Element

// featured-event-thumbnails.tsx  (sin "use client"; solo se usa dentro del carrusel)
export type FeaturedEventThumbnailsProps = {
  events: EventItem[]
  activeIndex: number
  progress: "running" | "paused" | "complete"   // estado de la barra del activo
  progressKey: string                            // `${activeIndex}-${cycle}`: remonta la barra
  onSelect: (index: number) => void
  onProgressEnd: () => void                      // dispara "advance"
}
export function FeaturedEventThumbnails(props: FeaturedEventThumbnailsProps): JSX.Element
```

Mecanismo de tiempo (D2): el autoplay **no** usa `setInterval`. La barra de progreso del activo es la fuente del tiempo: `animate-featured-progress` (6 s) y `onAnimationEnd` → `dispatch({ type: "advance" })`. Pausa temporal (hover, foco dentro, fuera del viewport) → `animation-play-state: paused` (conserva el avance). Pausa del usuario → barra del activo llena y estática (`progress = "complete"`, referencia). `progressKey` remonta la barra al navegar o reanudar.

Con `events.length === 1`: panel e imagen estáticos, sin cápsula de controles, sin miniaturas, sin autoplay.

## Especificación visual

**Transcrito de la referencia** (`Main`/`Mobile`, Hero A): estructura, medidas, copy, colores, crossfade de 0.7 s, autoplay de 6 s, barras de 3 px, contador, controles y su orden, `aria-live` off/polite, `aria-current` en miniaturas, arranque en pausa con reduced motion y reanudación manual. **Criterio propio**: breakpoint `lg`, pausa por hover/foco/viewport y flechas de teclado (heredados del AC7 de la 002), orden del DOM en móvil (D4) y lo marcado con D.

**Raíz:** `<section aria-roledescription="carrusel" aria-label="Eventos destacados">` con contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6`. Eventos: `onMouseEnter/Leave` (hover), `onFocus/onBlur` con `relatedTarget` (foco dentro), `onKeyDown` (flechas), `IntersectionObserver` (viewport; si no existe, se asume visible).

**Bloque principal** (`overflow-hidden rounded-[28px] lg:rounded-[32px] bg-stage text-stage-foreground`):
- `< lg`: `flex flex-col-reverse` (imagen arriba, panel abajo).
- `≥ lg`: `grid h-130 grid-cols-[32.5rem_minmax(0,1fr)]` (520 px de alto, panel de 520 px).
- DOM: panel → capa de imagen (D4).

**Panel** (`<div aria-live={running ? "off" : "polite"}>`, `flex flex-col p-5.5 pb-6 lg:p-12`), muestra `events[activeIndex]`:
1. Fila `flex items-center justify-between`:
   - Pills `flex gap-1.5 lg:gap-2`: **"Destacado"** `h-7 lg:h-8 px-3 lg:px-3.5 rounded-full bg-cta text-cta-foreground text-xs lg:text-[13px] font-semibold`; categoría `h-7 lg:h-8 px-3 lg:px-3.5 rounded-full border border-white/28 text-xs lg:text-[13px] font-medium` con `category.label`.
   - Contador `text-[13px] lg:text-sm font-medium text-stage-subtle tabular-nums`: **"01 / 05"** (2 dígitos). Para lectores de pantalla: `<span className="sr-only">Destacado 1 de 5</span>` y el visual con `aria-hidden`.
2. `<h2>` con `title`: `mt-4.5 lg:mt-7 text-[1.625rem] leading-[1.15] lg:text-[2.75rem] lg:leading-[1.1] font-bold tracking-[-0.025em] text-balance`.
3. Lista `mt-3.5 lg:mt-5 flex flex-col gap-2 lg:gap-2.5 text-sm lg:text-base text-stage-muted`: `Calendar` + `<time dateTime={startsAt}>{formatDateLong(startsAt)}</time>`; `MapPin` + `"{venue.name}, {venue.city}"`. Iconos 18 px `aria-hidden`.
4. Espaciador `flex-1` (solo `lg`).
5. **`≥ lg`**: "Desde" (`text-sm text-stage-subtle`) + precio `text-[1.875rem] font-bold tracking-[-0.02em]` en línea base; debajo (`mt-3.5 flex gap-2.5`): **"Comprar entradas"** + `ArrowRight` (`next/link` a `getEventTicketsHref(slug)`, `flex-1 h-13.5 rounded-2xl bg-cta text-cta-foreground hover:bg-cta-hover text-base font-semibold focus-ring`, sr-only " para {title}") y **"Ver detalles"** (`next/link` a `getEventHref(slug)`, `h-13.5 px-5.5 rounded-2xl border-[1.5px] border-white/40 text-base font-medium hover:bg-white/10 focus-ring`, sr-only " de {title}").
6. **`< lg`**: fila `mt-5 flex items-center justify-between gap-3`: columna "Desde" (`text-xs text-stage-subtle`) + precio `text-2xl font-bold`; "Comprar entradas" `h-13 px-5 rounded-[15px] text-[0.9375rem]`. Sin "Ver detalles" (la referencia móvil no lo tiene).

**Capa de imagen** (`relative h-57.5 lg:h-auto overflow-hidden bg-stage`):
- Una `next/image` por evento, apiladas `absolute inset-0 object-cover`, `fill`, `src={withImageWidth(imageUrl, 1600)}`, `alt={imageAlt}`, `sizes="(min-width: 1280px) 760px, (min-width: 1024px) 60vw, 100vw"`. Activa `opacity-100`, resto `opacity-0` + `aria-hidden`; `transition-opacity duration-700 motion-reduce:transition-none`. La primera lleva `loading="eager"` y `fetchPriority="high"` (`priority` está deprecado en Next 16).
- Badge **"Últimas entradas"** (si `availability === "last-tickets"`): `absolute top-3.5 left-3.5 lg:top-6 lg:left-6`, `Badge` `h-7.5 lg:h-8.5 gap-1.5 rounded-full px-3 lg:px-3.5 bg-urgent text-urgent-foreground text-xs lg:text-[13px] font-semibold` + `Clock` `aria-hidden`.
- **Cápsula de controles** (`absolute right-3 bottom-3 lg:right-6 lg:bottom-6 flex gap-0.5 lg:gap-1 rounded-full bg-card p-1 lg:p-1.5 text-card-foreground shadow-[0_10px_30px_-10px_rgb(0_0_0/0.4)]`), en orden: **"Evento anterior"** (`ChevronLeft` 20 px), **"Pausar carrusel"** / **"Reproducir carrusel"** (`Pause`/`Play` rellenos 16 px, fondo `bg-muted`), **"Evento siguiente"** (`ChevronRight` 20 px). Cada uno `Button variant="ghost" size="icon"` `size-11 rounded-full focus-ring`. La etiqueta del botón de pausa refleja `isUserPaused` (no las pausas temporales).

**Miniaturas** (`FeaturedEventThumbnails`, debajo del bloque):
- `< lg`: `mt-4 -mx-4 flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-1`, cada botón `w-55 shrink-0 snap-start` (220 px).
- `≥ lg`: `mt-5.5 grid grid-cols-5 gap-4`.
- Cada miniatura: `<button type="button" aria-label="Ver {title}" aria-current={active ? "true" : undefined} className="flex flex-col gap-3 lg:gap-3.5 text-left focus-ring rounded-xl">`:
  - Pista `h-[3px] w-full rounded-full bg-border overflow-hidden`; relleno `h-full bg-primary`: activo + `running` → `animate-featured-progress` (`[animation-play-state:running]`); activo + `paused` → misma animación con `[animation-play-state:paused]`; activo + `complete` → `w-full` estático; inactivo → sin relleno. La barra **no** se desactiva con `motion-reduce` (D6). `onAnimationEnd={onProgressEnd}` solo en la barra activa; `key={progressKey}`.
  - Fila `flex items-center gap-2.5 lg:gap-3`: `next/image` `size-12 lg:size-14 rounded-xl lg:rounded-[14px] object-cover` (`alt=""`), `opacity-100` activa y `opacity-70` inactiva; columna `min-w-0`: título `text-[13px] lg:text-sm font-semibold truncate` (`text-foreground` activo, `text-muted-foreground` inactivo) y `"{formatDateShort(startsAt)} · {venue.city}"` `text-xs lg:text-[13px] text-muted-foreground`.

**Comportamiento (AC7 de la 002 adaptado):**
- Autoplay cada 6 s mientras `isFeaturedCarouselRunning`. Navegar (anterior, siguiente, miniatura, flechas) reinicia la barra.
- Pausa temporal con hover sobre toda la sección, con foco dentro y fuera del viewport; se reanuda al terminar esas condiciones, salvo pausa del usuario.
- `prefers-reduced-motion: reduce` (vía `usePrefersReducedMotion` → `reduced-motion-detected` en un efecto): arranca en pausa con "Reproducir carrusel", sin fundido; si el usuario pulsa "Reproducir", el autoplay corre (acción explícita, como la referencia).
- Teclado: Tab llega a "Comprar entradas", "Ver detalles", los 3 controles y las 5 miniaturas; Enter/Espacio los activan. Con el foco dentro de la sección, ←/→ cambian de evento (`preventDefault`), salvo que el foco esté en un campo de texto.
- `aria-live` del panel: `"off"` mientras corre y `"polite"` cuando está detenido (patrón WAI-ARIA: no anunciar rotaciones automáticas).

### Jerarquía de headings en `/`
`h1` (intro) → `h2` título del destacado → `h2` "Explora por categoría" → …

## Decisiones propias (no validadas) vs. validadas

**Validadas por el usuario:** seguir el Hero A de la referencia (panel partido + miniaturas de progreso); conservar la accesibilidad del AC7 de la 002; decidir y justificar si se mantiene Swiper; CTA de compra naranja con texto oscuro.

**Decisiones propias:**
- **D1** — **No se usa Swiper.** En el diseño nuevo solo la imagen hace fundido; el texto del panel, la cápsula y las miniaturas viven fuera del slider. Con Swiper habría que sincronizar a mano las barras de progreso (`autoplayTimeLeft`), sobrescribir su CSS y su módulo A11y, y seguiría sin poder testearse en jsdom (motivo por el que la 002 no tenía test del carrusel). Un reducer puro (testeable) + fundido CSS + barra CSS como reloj cubre todo con menos código y permite eliminar la dependencia (la 004 la desinstala).
- **D2** — La animación CSS de la barra es el temporizador (`onAnimationEnd` → `advance`): barra y cambio de slide nunca se desincronizan, y la pausa temporal es `animation-play-state: paused`, que conserva el progreso sin calcular tiempos restantes.
- **D3** — Sin gesto de swipe: los botones y miniaturas son la alternativa de un clic que exige WCAG 2.5.1, y en móvil las miniaturas ya se recorren con scroll horizontal. Si el usuario lo quiere, se agrega en una fase posterior.
- **D4** — Orden del DOM: panel (texto y CTAs) antes que la imagen y sus controles, en ambos tamaños. En desktop coincide con el orden visual; en móvil la imagen se ve arriba (`flex-col-reverse`), así que el foco pasa por los CTAs antes que por la cápsula. Se acepta para que el lector de pantalla encuentre primero el contenido.
- **D5** — Tokens `--stage*` iguales en claro y oscuro (panel oscuro fijo, como la foto).
- **D6** — La barra de progreso sigue animándose con reduced motion cuando el usuario elige reproducir: es un indicador lineal de tiempo, no un movimiento de contenido, y sin ella el autoplay pedido explícitamente no tendría reloj. El fundido sí se desactiva.
- **D7** — El contador visible "01 / 05" va con `aria-hidden` y un texto `sr-only` "Destacado 1 de 5" para que se anuncie de forma natural.
- **D8** — Cápsula de controles con `bg-card` (blanca en claro, `#18181B` en oscuro) en vez de blanco fijo, para que siga el tema como el resto de superficies.

## Tareas

### Preparación (serie)
- **P1** Tokens y animación — archivos: `src/app/globals.css` (C1), `docs/design/design-system.md` (tokens `--stage*` y su contraste; nota de la barra de progreso y reduced motion).
- **P2** Utilidades con tests — archivos: `src/lib/format.ts`, `src/lib/format.test.ts` (añadir casos), `src/lib/image-url.ts`, `src/lib/image-url.test.ts`, `src/hooks/use-prefers-reduced-motion.ts`, `src/hooks/use-prefers-reduced-motion.test.ts`, `src/modules/events/utils/event-routes.ts` (añadir `getEventTicketsHref`).
- **P3** Estado del carrusel con test — archivos: `src/modules/events/utils/featured-carousel.ts`, `src/modules/events/utils/featured-carousel.test.ts`.

### Paralelo (archivos disjuntos)
- **T1** Miniaturas — archivos: `src/modules/events/components/featured-event-thumbnails.tsx`.
- **T2** Carrusel y Hero — archivos: `src/modules/events/components/featured-events-carousel.tsx`, `src/modules/events/components/featured-events-hero.tsx`. Importa `FeaturedEventThumbnails` por su contrato.

Durante el bloque paralelo nadie ejecuta `npm install` ni `npm run build`.

### Integración (serie)
- **I1** Composición y test del carrusel — archivos: `src/app/(site)/page.tsx` (insertar `<FeaturedEventsHero />` después de `<HomeIntroSection />`), `src/modules/events/components/featured-events-carousel.test.tsx`.

## Criterios de aceptación

**Calidad**
- [ ] AC1 `npm run lint`, `npm run test` y `npm run build` pasan.
- [ ] AC2 Ningún archivo importa `swiper` (grep). Los exports coinciden con C2–C6. `featured-carousel.ts` no importa React.
- [ ] AC3 No se modificaron `event.types.ts`, `events.mock.ts`, `events.service.ts`, `event-card.tsx`, `event-discovery*.tsx` ni los archivos de la 004 salvo `page.tsx`.

**Contenido y layout (manual, `/`)**
- [ ] AC4 Orden: intro → Hero → "Explora por categoría". El Hero está dentro del contenedor de 1280 px (no full-bleed) con esquinas de 32 px a 1280 px y 28 px a 375 px.
- [ ] AC5 Al cargar (sin reduced motion), el panel muestra "Destacado", "Conciertos", "01 / 05", el `h2` "Noche de Rock Sinfónico", `<time dateTime="2026-10-03T20:00:00-05:00">sábado 3 de octubre</time>`, "Teatro Municipal, Lima", "Desde $45", "Comprar entradas" (naranja, texto oscuro, `href="/events/noche-de-rock-sinfonico/tickets"`, nombre accesible "Comprar entradas para Noche de Rock Sinfónico") y "Ver detalles" (`href="/events/noche-de-rock-sinfonico"`). La imagen muestra el badge "Últimas entradas" con icono.
- [ ] AC6 A 1280 px el bloque mide 520 px de alto con el panel de 520 px a la izquierda y la imagen a la derecha; debajo, 5 miniaturas en una fila. A 375 px: imagen de 230 px arriba con la cápsula abajo a la derecha, panel abajo (título 26 px, fila "Desde $45" + "Comprar entradas", sin "Ver detalles") y miniaturas de 220 px con scroll horizontal y snap; sin scroll horizontal de la página.
- [ ] AC7 Las miniaturas muestran, en orden, Noche de Rock Sinfónico, Clásico del Fútbol, Festival Sonidos del Sur, La Casa de Bernarda Alba y Pop en Vivo, cada una con "sáb 3 oct · Lima" (o su fecha y ciudad). Solo la activa tiene `aria-current="true"`, imagen opaca y título en color principal.
- [ ] AC8 Las imágenes del Hero se piden con `w=1600` (atributo `src`/`srcset` o Network) y la consola no muestra warnings de `priority`.

**Comportamiento y accesibilidad (AC7 de la 002 adaptado)**
- [ ] AC9 (a, d) "Evento anterior", "Pausar carrusel"/"Reproducir carrusel" y "Evento siguiente" son visibles sin hover, miden ≥ 44×44 px y cambian de evento o de estado con un clic. Clic en una miniatura muestra ese evento y su barra arranca de cero.
- [ ] AC10 (autoplay) Sin interacción, cada ~6 s el evento avanza y la barra de la miniatura activa se llena en ese tiempo; tras el quinto vuelve al primero.
- [ ] AC11 (b) "Pausar carrusel" detiene el autoplay, deja la barra activa llena y estática, cambia la etiqueta a "Reproducir carrusel" y el panel pasa a `aria-live="polite"`; "Reproducir carrusel" reanuda con la barra desde cero y `aria-live="off"`.
- [ ] AC12 (e) Con el puntero sobre el Hero, o con el foco en cualquier control del Hero, la barra se congela y no hay avance; al salir, continúa desde donde estaba (salvo pausa del usuario). Al hacer scroll hasta que el Hero salga de la vista y volver, no avanzó mientras estaba fuera.
- [ ] AC13 (c) Teclado: Tab recorre "Comprar entradas", "Ver detalles", los 3 controles y las 5 miniaturas con foco visible (también sobre el panel oscuro); Enter/Espacio los activan; con el foco dentro del Hero, ←/→ cambian de evento sin desplazar la página.
- [ ] AC14 (f) Con `prefers-reduced-motion: reduce` emulado y recarga: el Hero arranca detenido con "Reproducir carrusel", el cambio de evento es instantáneo (sin fundido) y no hay avance automático; al pulsar "Reproducir carrusel" el autoplay arranca.
- [ ] AC15 En claro y oscuro, el panel se ve igual (fondo `#1E1B4B`); contraste ≥ 4.5:1 en título, fecha, lugar, contador, "Desde", precio, pills y "Comprar entradas"; la cápsula sigue el tema. La consola no muestra errores ni warnings de hidratación.

## Tests obligatorios

- `src/lib/format.test.ts` (añadir) — `formatDateLong`: `"2026-10-03T20:00:00-05:00"` → `"sábado 3 de octubre"`; `"2026-11-08T20:00:00-05:00"` → `"domingo 8 de noviembre"`; `"2026-11-01T03:00:00Z"` → `"sábado 31 de octubre"` (zona); `Date` = `string`.
- `src/lib/image-url.test.ts` — URL de Unsplash con `w=800` → `w=1600` conservando `auto`, `fit` y `q`; sin `w` → lo agrega; otro host → idéntica; `"/local.jpg"` y `""` → idénticos.
- `src/hooks/use-prefers-reduced-motion.test.ts` (`renderHook`, `matchMedia` mockeado) — devuelve `false`/`true` según `matches`; cambia al emitir `change`; elimina el listener al desmontar.
- `src/modules/events/utils/featured-carousel.test.ts` — estado inicial; `next`/`prev` con vuelta (4 → 0, 0 → 4) e incremento de `cycle`; `go` normaliza y siempre incrementa `cycle`; `advance` avanza solo si corre (con `isHovered`, `hasFocusWithin`, `!isInViewport` o `isUserPaused` devuelve el mismo objeto); `toggle-play` pausa y reanuda con `cycle + 1` al reanudar; `reduced-motion-detected` pausa si el usuario no tocó play/pausa y no hace nada si ya lo tocó; con `slideCount` 1 la navegación no cambia el estado; no muta la entrada.
- `src/modules/events/components/featured-events-carousel.test.tsx` (RTL + `user-event`; mockear `next/image`, `matchMedia` y ausencia de `IntersectionObserver`), con los 5 destacados del mock:
  - Render inicial: `h2` "Noche de Rock Sinfónico", texto sr-only "Destacado 1 de 5", primera miniatura con `aria-current="true"`, panel con `aria-live="off"`.
  - "Evento siguiente" → `h2` "Clásico del Fútbol: Final de Temporada"; "Evento anterior" dos veces → "Pop en Vivo: Gira 2026".
  - Clic en la miniatura "Ver La Casa de Bernarda Alba" → ese título y `aria-current` en esa miniatura.
  - Disparar `animationEnd` en la barra activa → avanza al siguiente. Tras `mouseEnter` en la sección, `animationEnd` no avanza.
  - "Pausar carrusel" → botón "Reproducir carrusel" y `aria-live="polite"`.
  - Con `matchMedia` de reduced motion en `true`: arranca con "Reproducir carrusel".
  - `ArrowRight` con el foco en un control del Hero → avanza.
- **Sin test propio:** `FeaturedEventThumbnails` (presentacional, cubierto por el test del carrusel), `FeaturedEventsHero` (composición), `page.tsx`.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- Manual (`npm run dev`, `/`), a 375, 768 y 1280 px, claro y oscuro: AC4–AC15. Recorrer los 5 destacados con los controles y las miniaturas; esperar dos ciclos de autoplay; hover y foco; scroll fuera y dentro; Rendering → `prefers-reduced-motion: reduce` y recarga; recorrido con Tab y flechas; inspector de contraste; consola.
