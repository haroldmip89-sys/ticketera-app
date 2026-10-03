# 002 — Landing: Hero con carrusel, Topbar de búsqueda y Categorías

- **Estado:** done (APPROVED por reviewer en iteración 2)
- **Modo:** SDD
- **Módulo(s):** ninguno nuevo en `src/modules` (fase transversal/UI: `src/components/shared`, `src/components/ui`, `src/hooks`, `src/app/page.tsx`). `src/app/layout.tsx` **no se modifica** en esta fase (ver justificación en "Contratos").

## Objetivo

Reemplazar el placeholder de `src/app/page.tsx` por el contenido real de la primera mitad de la landing: un Hero full-bleed con carrusel de imágenes (estilo Ticketmaster, con copy fijo y accesibilidad de carrusel completa), un Topbar de búsqueda (texto, fecha, precio) integrado al `SiteHeader` existente con comportamiento sticky y transición de gradiente transparente a fondo sólido al hacer scroll, y una sección de Categorías con iconos. Al terminar, `/` muestra Hero → Categorías, el proyecto compila en verde y no se ha introducido ningún `src/modules/*` nuevo.

Patrón de landing de referencia (validado con la skill `ui-ux-pro-max`, `--domain landing`, perfil "Marketplace/Directory"): Hero (search-focused) → Categories → Featured Listings → Trust/Safety → CTA. Esta fase cubre únicamente los dos primeros bloques.

## Fuera de alcance

- **Featured Listings** (grid/carrusel de eventos reales con datos) y las secciones **Trust/Safety** y **CTA final** del patrón de landing validado — quedan para una fase `003` futura.
- `src/modules/events` y `src/modules/categories` (o cualquier otro módulo de dominio): no se crean en esta fase. Las listas de imágenes del hero, categorías y rangos de precio son constantes estáticas de UI, no datos de dominio.
- Lógica real de búsqueda/filtrado: el Topbar es solo UI (sin `onSubmit`, sin navegación, sin llamadas a ningún service).
- Rutas de navegación reales (`/events`, `/categories`, etc.): se mantienen como placeholders (`#`/`/`), igual que en la fase 001.
- Internacionalización / soporte multi-idioma.
- `shadcn/carousel` y `embla-carousel-react`: esta fase usa `swiper` en su lugar (decisión explícita del usuario), no se instala `embla-carousel-react` en ningún momento.
- Cualquier cambio a `src/app/layout.tsx`, `src/app/globals.css` o a los tokens de `docs/design/design-system.md`.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Button` (shadcn) | reutilizar | `src/components/ui/button.tsx` | Sin cambios. |
| `Sheet` (shadcn) | reutilizar | `src/components/ui/sheet.tsx` | Sin cambios (menú móvil existente). |
| `Separator` (shadcn) | reutilizar | `src/components/ui/separator.tsx` | No se usa en esta fase, no se toca. |
| `SiteHeader` | extender | `src/components/shared/site-header.tsx` | Se le agrega la fila de Topbar, estado scroll y variantes de color. Único archivo de la fase 001 que esta spec modifica. |
| `SiteFooter`, `ThemeProvider`, `ThemeToggle` | reutilizar sin cambios | `src/components/shared/*` | No se tocan. |
| `src/app/layout.tsx` | **no se toca** | `src/app/layout.tsx` | Ver justificación en "Contratos → Mecanismo sticky/overlay/compensación". |
| `src/app/page.tsx` | reemplazar contenido | `src/app/page.tsx` | Placeholder actual → composición `<Hero /><CategoriesSection />`. |
| `swiper` | instalar dependencia nueva | `package.json` | `npm install swiper`. No se usa `embla-carousel-react` ni `shadcn/carousel`. |
| `input` (shadcn) | agregar de shadcn | `src/components/ui/input.tsx` | `npx shadcn@latest add input` — campo de texto libre del Topbar. |
| `calendar` (shadcn) | agregar de shadcn | `src/components/ui/calendar.tsx` | `npx shadcn@latest add calendar` — selector de fecha. La CLI puede instalar dependencias propias (ej. `react-day-picker`) automáticamente; no instalarlas a mano. |
| `popover` (shadcn) | agregar de shadcn | `src/components/ui/popover.tsx` | `npx shadcn@latest add popover` — contenedor del `calendar`. |
| `select` (shadcn) | agregar de shadcn | `src/components/ui/select.tsx` | `npx shadcn@latest add select` — rangos de precio predefinidos. |
| `card` (shadcn) | agregar de shadcn | `src/components/ui/card.tsx` | `npx shadcn@latest add card` — tarjetas de categoría. |
| `next.config.ts` | modificar | `next.config.ts` | Agregar `images.remotePatterns` para `images.unsplash.com` (requerido por `next/image` con las URLs del hero). |
| `Hero` | crear | `src/components/shared/hero.tsx` | No existe equivalente. Usa `swiper/react`. Autocontenido (datos de slides inline). |
| `SearchTopbar` | crear | `src/components/shared/search-topbar.tsx` | No existe equivalente. Autocontenido (estado local, sin wiring externo). |
| `CategoriesSection` | crear | `src/components/shared/categories-section.tsx` | No existe equivalente. Autocontenido (incluye su propio contenedor `max-w-7xl`). |
| `useScrolledPastViewport` | crear | `src/hooks/use-scrolled-past-viewport.ts` | No existe equivalente. Único hook de la fase con lógica propia → lleva test. |

## Contratos

### Copy del Hero (texto exacto, sin añadidos)

- Headline: `Encuentra y compra entradas para tus próximos eventos`
- Subheadline: `Conciertos, deportes, teatro y mucho más, todo en un solo lugar.`
- No se agrega ningún otro texto (sin eyebrow, sin badge, sin CTA adicional en el hero).

### Datos de slides del Hero (constante interna de `hero.tsx`)

```ts
const HERO_SLIDES: { id: string; imageUrl: string; alt: string }[] = [
  {
    id: "concert",
    imageUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1920&h=1080&q=80",
    alt: "Multitud con las manos en alto durante un concierto",
  },
  {
    id: "sports",
    imageUrl:
      "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1920&h=1080&q=80",
    alt: "Estadio deportivo iluminado durante la noche",
  },
  {
    id: "theater",
    imageUrl:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1920&h=1080&q=80",
    alt: "Escenario de teatro con telón rojo y luces",
  },
  {
    id: "festival",
    imageUrl:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1920&h=1080&q=80",
    alt: "Multitud disfrutando un festival de música al aire libre",
  },
];
```

Si alguna URL deja de resolver en el momento de implementar, sustituirla por otra imagen de Unsplash de temática equivalente (concierto/deporte/teatro/festival) conservando los parámetros de tamaño (`w=1920&h=1080&q=80`); esto no bloquea la tarea.

### `Hero`

```ts
// src/components/shared/hero.tsx
"use client"
export function Hero(): JSX.Element
```

- Sin props. Full-bleed: se renderiza como primer hijo de `<main>` (vía `page.tsx`), sin ningún contenedor `max-w-7xl` envolviéndolo, por lo que ocupa el 100% del ancho del viewport de forma natural.
- Contenedor raíz: `relative h-dvh w-full -mt-32 overflow-hidden` (el `-mt-32` es el mecanismo de superposición con el header, ver sección "Mecanismo sticky/overlay/compensación" — valor acoplado por contrato a la altura total del stack navbar+topbar de `SiteHeader`, que esta spec fija en `8rem`).
- Capa de imagen: `swiper/react` (`Swiper`/`SwiperSlide`) con cada `HERO_SLIDES[i]` renderizado vía `next/image` (`fill`, `priority` solo en el primer slide, `sizes="100vw"`).
- Overlay oscuro (`absolute inset-0 bg-black/40` o gradiente equivalente) sobre cada slide para legibilidad del texto, consistente con `docs/design/design-system.md`.
- Bloque de texto (headline `h1` + subheadline `body`) centrado sobre el overlay, color claro (texto blanco/casi blanco) para contraste sobre la imagen.
- Módulos de Swiper requeridos: navegación (prev/next, botones **visibles** por defecto, no solo al hover), paginación o indicador de slide, `keyboard` (navegación completa por teclado cuando el carrusel tiene foco), `a11y` (anuncios ARIA de Swiper), `autoplay` con `pauseOnMouseEnter: true` y pausa también al recibir foco (manejar `onFocus`/`onBlur` del contenedor si `pauseOnMouseEnter` no cubre foco de teclado).
- Control adicional de **play/pause** visible y accesible (botón propio, no provisto por Swiper), que detiene/reanuda `autoplay` del `Swiper` vía su instancia.
- Debe detener el autoplay cuando el Hero sale del viewport (usar `IntersectionObserver` sobre el contenedor del Hero) y reanudarlo al volver a entrar (si el usuario no lo pausó manualmente y no aplica `prefers-reduced-motion`).
- Debe respetar `prefers-reduced-motion: reduce` (`window.matchMedia("(prefers-reduced-motion: reduce)")`): si está activo, no inicia `autoplay`, muestra el primer slide de forma estática, y los controles prev/next siguen disponibles para cambio manual.
- La navegación prev/next (clic) debe ser suficiente alternativa al gesto de swipe/arrastre (no se exige deshabilitar el swipe táctil, solo que no sea la única forma de cambiar de slide).

### `SearchTopbar`

```ts
// src/components/shared/search-topbar.tsx
"use client"
export function SearchTopbar({ className }: { className?: string }): JSX.Element
```

- Componente **agnóstico del estado de scroll/sticky**: no recibe ni necesita ninguna prop relacionada a si está sobre el hero o ya scrolleado. Se renderiza siempre con el mismo estilo "tarjeta flotante" opaca (ej. `bg-card/95 backdrop-blur-sm shadow-md rounded-xl border border-border`), de forma que sea legible tanto sobre el gradiente transparente del header como sobre su fondo sólido.
- Altura natural total (incluyendo padding) de **como máximo `4rem` (64px)** en su variante de una sola fila, para que `SiteHeader` pueda envolverla en un contenedor de altura fija (ver más abajo) sin recortarla.
- Layout interno: `flex flex-nowrap items-center gap-2` con `overflow-x-auto` (si el espacio es insuficiente en viewports angostos, los campos se desplazan horizontalmente en vez de envolver en una segunda fila — decisión propia por simplicidad/KISS, no validada por ninguna skill, ver sección "Decisiones propias").
- Tres campos, cada uno controlado con estado local (`useState`), **sin wiring a lógica de búsqueda real**:
  1. **Texto libre**: `Input` (shadcn) con `placeholder="Buscar eventos, artistas, lugares..."`.
  2. **Fecha**: `Popover` (shadcn) + `Calendar` (shadcn) dentro del contenido del popover. El trigger es un `Button` (variant `outline`) que muestra:
     - `"Cualquier fecha"` si no hay fecha seleccionada,
     - si hay fecha seleccionada, un formato **local y no ambiguo** (nunca solo numérico tipo `dd/mm/aa`): `new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" }).format(date)` (ej. `"2 oct 2026"`).
  3. **Precio**: `Select` (shadcn) con las opciones:
     ```ts
     const PRICE_RANGES = [
       { value: "any", label: "Cualquier precio" },
       { value: "free", label: "Gratis" },
       { value: "0-50", label: "$0 - $50" },
       { value: "50-100", label: "$50 - $100" },
       { value: "100-200", label: "$100 - $200" },
       { value: "200+", label: "Más de $200" },
     ] as const;
     ```
     Valor por defecto: `"any"`.
- No se exige localizar el idioma interno de la grilla del `Calendar` (puede quedar en el idioma por defecto de `react-day-picker`); solo el texto del trigger (fuera del popover) debe cumplir el formato no ambiguo arriba descrito.

### `CategoriesSection`

```ts
// src/components/shared/categories-section.tsx
export function CategoriesSection(): JSX.Element
```

- Sin props. Server component (sin interactividad, no lleva `"use client"`).
- Autocontenido: incluye su propio contenedor `mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8` (ritmo de `docs/design/design-system.md` sección 4), un `h2` ("Explora por categoría") y un grid responsivo (ej. `grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4`) de 8 `Card` (shadcn), cada una con icono (`lucide-react`) + label:

```ts
const CATEGORIES: { label: string; icon: LucideIcon }[] = [
  { label: "Conciertos", icon: Music },
  { label: "Deportes", icon: Trophy },
  { label: "Teatro", icon: Drama },
  { label: "Festivales", icon: PartyPopper },
  { label: "Familiar", icon: Users },
  { label: "Comedia", icon: Mic2 },
  { label: "Cine", icon: Clapperboard },
  { label: "Vida nocturna", icon: Martini },
];
```

Todos los nombres de icono (`Music`, `Trophy`, `Drama`, `PartyPopper`, `Users`, `Mic2`, `Clapperboard`, `Martini`) están confirmados como exports válidos de la versión de `lucide-react` ya instalada en el proyecto. No hay match en el catálogo de iconos de la skill `ui-ux-pro-max` para términos de categoría de evento ("concierto", "deportes", "teatro", etc.) — esta asignación de icono por categoría es **criterio propio del equipo de spec**, no un dato validado.

### `useScrolledPastViewport`

```ts
// src/hooks/use-scrolled-past-viewport.ts
export function useScrolledPastViewport(): boolean
```

- Hook sin argumentos. Devuelve `false` en el render inicial (SSR-safe, no accede a `window` fuera de un efecto).
- En un `useEffect`, agrega listeners de `scroll` y `resize` (con cleanup al desmontar) que recalculan: `scrollY > window.innerHeight` (si el scroll vertical actual supera una altura de viewport completa, equivalente a haber pasado el Hero, que mide exactamente `100dvh`).
- Devuelve el booleano resultante; se recalcula también si el viewport cambia de tamaño (`resize`).

### `SiteHeader` (cambios)

```ts
// src/components/shared/site-header.tsx
"use client"
export function SiteHeader(): JSX.Element
```

- Pasa a ser **client component** (necesita `useScrolledPastViewport`). Misma firma pública (sin props), sigue usándose en `layout.tsx` como `<SiteHeader />` sin cambios ahí.
- Estructura: `<header className="sticky top-0 z-50 w-full ...">` que contiene dos filas apiladas:
  1. **Fila navbar** (contenido ya existente: logo, nav links, `ThemeToggle`, botón "Iniciar sesión", trigger del `Sheet` móvil): se ajusta su contenedor a altura fija `h-16` (en vez del `py-3 md:py-4` actual) para hacer la altura determinística.
  2. **Fila topbar** (nueva): un contenedor `mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8` — mismo ancho/padding responsivo que la fila navbar (`docs/design/design-system.md` sección 4) — que envuelve `<SearchTopbar />`, centrándola verticalmente dentro de esos `4rem`. Sin este contenedor, `SearchTopbar` (que es `w-full`) queda pegada a los bordes del viewport, contradiciendo su propia descripción de "tarjeta flotante" (hallazgo de reviewer, iteración 1).
- La suma de ambas filas es exactamente `8rem` (`h-16` + `h-16`), valor acoplado por contrato al `-mt-32` de `Hero`.
- Usa `useScrolledPastViewport()` para derivar `isScrolled: boolean` y aplica dos variantes de clases en el `<header>` (no en `SearchTopbar`, que es agnóstica):
  - `isScrolled === false` (sobre el hero): fondo `bg-gradient-to-b from-black/60 via-black/30 to-transparent`, borde inferior transparente, textos de logo/nav/`ThemeToggle` en tono claro (ej. `text-white` / variantes `hover:text-white/80`).
  - `isScrolled === true`: fondo `bg-background`, `border-b border-border` (como hoy), textos en los tonos actuales (`text-foreground`).
  - El botón "Iniciar sesión" (`Button` variant `default`) no cambia entre estados (su fondo `bg-primary` ya garantiza contraste en ambos casos).
- El menú móvil (`Sheet`) conserva su contenido actual; no es necesario replicar el `SearchTopbar` dentro del `Sheet` en esta fase (YAGNI: el Topbar ya es visible/sticky en todo momento, incluido móvil, fuera del `Sheet`).

### Mecanismo sticky / overlay / compensación de padding-top (declarado explícitamente, no validado por ninguna skill salvo el principio general de "el contenido bajo un header fijo necesita compensación")

Se usa `position: sticky` (no `fixed`) en `SiteHeader`, colocado — igual que hoy — como primer hijo dentro de `<body>`, antes de `<main>`. Al ser `sticky` y estar en la parte superior del documento, el header reserva su propio espacio (`8rem`) en el flujo normal de **cualquier página** que use el layout raíz. Esto significa que, por construcción, **ninguna página necesita un `padding-top` manual**: el espacio ya está reservado por el propio header en el flujo.

El único lugar que necesita "escapar" de ese espacio reservado es el `Hero` de la home, porque debe verse detrás del header (transparente) desde el borde superior real del viewport. Por eso `Hero` aplica `-mt-32` (un margen superior negativo igual a los `8rem` reservados por el header) y mide `h-dvh` (100% de la altura del viewport): el margen negativo "sube" el Hero exactamente lo que el header reserva, dejándolo ocupar desde `y=0`, y el siguiente elemento del DOM (`CategoriesSection`) queda posicionado justo al terminar esa altura de viewport, sin solaparse ni dejar huecos. `<main>` es un *flex item* de `<body className="flex flex-col">`, por lo que el margen negativo de `Hero` no colapsa hacia afuera de `<main>` ni desplaza a `SiteFooter`.

**Consecuencia práctica:** `src/app/layout.tsx` no requiere ningún cambio en esta fase — ni padding-top, ni ajuste del `flex flex-col` del body. Si una fase futura agrega una página sin Hero, su contenido ya queda correctamente debajo del header gracias a que este es `sticky` (reserva espacio), no `fixed`.

### Decisiones propias (no validadas por ninguna skill) — declaradas explícitamente

1. **Transición gradiente→sólido mediante hook de scroll + estado React** (no `:has()`/CSS puro ni `@supports` de "stuck"), por ser la opción más simple y de soporte más predecible dado que no se pide blur progresivo ni animaciones complejas.
2. **Umbral de cambio de variante = una altura de viewport (`window.innerHeight`)**, no la altura exacta del header, por simplicidad (coincide con que el Hero mide exactamente `100dvh`).
3. **`SearchTopbar` con `overflow-x-auto` en vez de envolver en una segunda fila en móvil**, para mantener la altura del header constante (`8rem`) en todos los breakpoints y no necesitar lógica responsiva adicional en la compensación del Hero.
4. **Asignación de icono por categoría** (sección `CategoriesSection` arriba): sin match en el catálogo de iconos de la skill para terminología de categorías de eventos.
5. **Rangos de precio del `Select`**: valores de ejemplo (`$0-$50`, etc.) sin relación a ninguna moneda/mercado real todavía (no hay datos de eventos); se eligen solo para demostrar el patrón de UI.

## Tareas

### Preparación (serie)

- **P1** Instalar dependencia y componentes shadcn que usará el bloque paralelo, y habilitar el dominio de imágenes remotas — archivos: `package.json`, `package-lock.json` (`npm install swiper`), `src/components/ui/input.tsx`, `src/components/ui/calendar.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/select.tsx`, `src/components/ui/card.tsx` (`npx shadcn@latest add input calendar popover select card`), `next.config.ts` (agregar `images.remotePatterns` para `hostname: "images.unsplash.com"`).

### Paralelo (archivos disjuntos; ninguna depende de otra ni de `site-header.tsx`/`layout.tsx`/`page.tsx`)

- **T1** Construir `Hero` (carrusel Swiper, overlay, copy exacto, accesibilidad completa) — archivos: `src/components/shared/hero.tsx`.
- **T2** Construir `SearchTopbar` (texto, fecha con `Calendar`+`Popover`, precio con `Select`, sin lógica de filtrado) — archivos: `src/components/shared/search-topbar.tsx`.
- **T3** Construir `CategoriesSection` (8 categorías con icono, usando `Card`) — archivos: `src/components/shared/categories-section.tsx`.
- **T4** Crear el hook `useScrolledPastViewport` y su test — archivos: `src/hooks/use-scrolled-past-viewport.ts`, `src/hooks/use-scrolled-past-viewport.test.ts`. No depende de T1/T2/T3 ni de ningún archivo compartido, por lo que se suma al bloque paralelo en vez de esperar a la integración (optimización de paralelismo, hallazgo de revisión previa a la aprobación).

### Integración (serie, después del bloque paralelo)

- **I2** Integrar Topbar + sticky + gradiente/sólido en el header existente (usando el hook de T4), y componer Hero + Categorías en la página — archivos: `src/components/shared/site-header.tsx` (modificar), `src/app/page.tsx` (reemplazar contenido). No se modifica `src/app/layout.tsx` (ver "Contratos").

## Criterios de aceptación

- [ ] AC1 `npm run lint` pasa sin errores.
- [ ] AC2 `npm run test` pasa, incluyendo el test nuevo de `useScrolledPastViewport`.
- [ ] AC3 `npm run build` pasa sin errores.
- [ ] AC4 El Hero muestra exactamente el headline `"Encuentra y compra entradas para tus próximos eventos"` y el subheadline `"Conciertos, deportes, teatro y mucho más, todo en un solo lugar."`, sin ningún otro texto adicional (sin eyebrow/badge/CTA extra) dentro del componente `Hero`.
- [ ] AC5 El Hero es full-bleed: en el DOM no está envuelto por ningún contenedor `max-w-7xl`/`mx-auto` y ocupa el 100% del ancho del viewport (verificable en devtools).
- [ ] AC6 El carrusel del Hero muestra al menos 4 imágenes distintas (URLs/alt text diferentes), no una imagen repetida.
- [ ] AC7 Accesibilidad del carrusel, todas verificables manualmente: (a) botones prev/next visibles sin necesidad de hover; (b) un control de play/pause visible; (c) el carrusel es completamente operable por teclado (Tab llega a los controles, Enter/Space los activa, flechas cambian de slide con el carrusel enfocado); (d) existe una alternativa de un solo clic al gesto de swipe (los botones prev/next); (e) el autoplay se detiene al hacer hover o al enfocar el carrusel/sus controles, y se detiene cuando el Hero sale del viewport; (f) con `prefers-reduced-motion: reduce` activo, no hay autoplay y se muestra un frame estático desde la carga.
- [ ] AC8 `SearchTopbar` renderiza los 3 campos (texto, fecha, precio) funcionando como UI controlada localmente, sin ningún `onSubmit`/navegación/llamada a service.
- [ ] AC9 El trigger de fecha muestra `"Cualquier fecha"` sin selección, y tras seleccionar una fecha muestra un formato no ambiguo con nombre de mes (nunca `dd/mm/aa` puramente numérico).
- [ ] AC10 El `Select` de precio incluye exactamente las 6 opciones definidas en el contrato, con `"any"` como valor por defecto.
- [ ] AC11 `SiteHeader` (navbar + topbar) permanece visible/fijo en la parte superior al hacer scroll por el resto de la página (`position: sticky`).
- [ ] AC12 Sobre el Hero (antes de superar una altura de viewport de scroll), `SiteHeader` se ve con fondo degradado semitransparente (de oscuro a transparente) y textos de logo/nav en tono claro; tras superar esa altura, cambia a fondo sólido opaco y textos en los tonos normales del tema.
- [ ] AC13 `SearchTopbar` se ve legible (tarjeta opaca) tanto sobre el gradiente del Hero como sobre el header sólido, sin recibir ninguna prop relacionada al estado de scroll.
- [ ] AC14 Ningún contenido de la página queda oculto/tapado de forma no intencional bajo el header sticky: `src/app/layout.tsx` no requiere (ni recibe) cambios de `padding-top`, porque el header reserva su propio espacio en el flujo (`sticky`) y solo `Hero` lo compensa deliberadamente con `-mt-32`.
- [ ] AC15 `CategoriesSection` renderiza las 8 categorías definidas en el contrato, cada una dentro de un `Card` (shadcn) con su icono de `lucide-react` asignado.
- [ ] AC16 `next.config.ts` incluye `images.remotePatterns` con `hostname: "images.unsplash.com"`, y las imágenes del Hero se renderizan sin error de dominio no permitido.
- [ ] AC17 No existe ninguna carpeta `src/modules/*` nueva creada en esta fase.
- [ ] AC18 `src/app/page.tsx` ya no contiene el placeholder de la fase 001 (`<h1>Ticketera</h1>` + párrafo "Próximamente...") y en su lugar compone `<Hero />` seguido de `<CategoriesSection />`.

## Tests obligatorios

Según `docs/SETUP.md` sección 3, solo se exige test donde hay lógica real que pueda romperse silenciosamente:

- `src/hooks/use-scrolled-past-viewport.test.ts` (Vitest + `@testing-library/react`'s `renderHook`): (1) valor inicial `false`; (2) con `window.innerHeight` simulado y disparando un evento `scroll` con `window.scrollY` mayor a esa altura, el hook pasa a `true`; (3) al volver a `scrollY` menor o igual, vuelve a `false`; (4) limpia sus listeners al desmontar (no lanza errores al disparar eventos tras `unmount`).
- `Hero`, `SearchTopbar`, `CategoriesSection` **no requieren test unitario propio**: `Hero` es una composición sobre una librería de terceros (Swiper) cuyo comportamiento real (autoplay, teclado, `prefers-reduced-motion`) es frágil/poco significativo de simular en `jsdom`; se valida manualmente (ver "Verificación"). `SearchTopbar` y `CategoriesSection` solo mantienen estado local trivial de UI (sin derivaciones ni transformaciones) y son, en la práctica, presentacionales — no distinto del criterio ya aplicado a `SiteHeader`/`SiteFooter` en la spec 001.
- `SiteHeader` tampoco requiere un test unitario nuevo: su único añadido de lógica (consumir `isScrolled` para elegir clases) es mapeo presentacional de un booleano ya cubierto por el test del hook.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- Verificación manual (`npm run dev`, abrir `/`):
  - **Reduced motion:** activar "Emulate CSS prefers-reduced-motion: reduce" en DevTools (pestaña Rendering) y recargar `/`; confirmar que el Hero no avanza automáticamente y muestra un slide estático.
  - **Teclado:** navegar con `Tab` desde el inicio de la página; confirmar foco visible en los controles del Hero (prev/next/play-pause), en los 3 campos del `SearchTopbar`, y que las flechas cambian de slide con el carrusel enfocado.
  - **Scroll/sticky/gradiente:** en viewport de escritorio, confirmar que sobre el Hero el header se ve con gradiente transparente y texto claro; al hacer scroll más de una altura de viewport, confirmar que cambia a fondo sólido y texto oscuro, y que el header+topbar permanecen fijos arriba durante todo el scroll.
  - **Móvil (~375px, DevTools):** confirmar que el Topbar es usable (scroll horizontal si no caben los 3 campos), que el header sigue sticky, y que el Hero y las categorías se ven correctamente apiladas.
  - Confirmar que la sección de categorías muestra las 8 tarjetas con icono.
