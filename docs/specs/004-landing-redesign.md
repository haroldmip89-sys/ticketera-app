# 004 — Shell del sitio: header blanco, intro con buscador, "Cómo funciona", newsletter y footer claro

- **Estado:** done (APPROVED por reviewer en iteración 1)
- **Modo:** SDD
- **Módulo(s):** `src/modules/home` (nuevo: secciones propias de la landing), `src/modules/events` (formulario de búsqueda), `src/components/shared` (header, footer, logo), `src/app` (grupo de rutas `(site)`), `src/app/globals.css` (altura del header y scroll padding), `package.json` (se elimina `swiper`).
- **Depende de:** 003 implementada y en verde (paleta, `SectionHeader`, `EventDiscoverySection`, `focus-ring`).
- **Diseño fuente:** `docs/design/reference-design.md` §2.1 (`Main`, `Mobile`: header, intro + buscador, "Cómo funciona", newsletter, footer) y §3.2.

**Roadmap:** 003 paleta + events + descubrimiento · **004 shell (esta)** · 005 Hero de destacados · 006 detalle · 007 selección por zonas · 008 mapa de teatro · 009 búsqueda · 010 checkout + confirmación · 011 login/registro · 012 Mis entradas · 013 panel de organizador · 014 crear evento.

## Objetivo

Reemplazar el shell de la 002 por el de la referencia (decisión del usuario): header blanco sólido y sticky, intro con el h1 "Encuentra tu próximo plan en vivo" y un buscador tipo tarjeta, secciones "Cómo funciona" y newsletter, y footer claro de 4 columnas. Se introduce el grupo de rutas `(site)` (layout con header y footer) para que el flujo de compra (007) pueda tener su propio header sin la navegación. Se elimina todo lo que la referencia descarta de la 002. Al terminar, `/` muestra intro → categorías → próximos eventos → cómo funciona → newsletter, en móvil y desktop, claro y oscuro, sin carrusel (el Hero nuevo llega en la 005), y el proyecto queda en verde.

## Qué se elimina o reemplaza de lo construido en la 002

| Pieza de la 002 | Acción | Motivo |
|---|---|---|
| Header transparente con degradado sobre los primeros 100vh (`site-header.tsx`, variante `isScrolled`) | **reemplazar** (reescritura del archivo) | La referencia usa un header blanco sólido siempre. |
| Fila de búsqueda dentro del header (header de `8rem`, `h-16` + `h-16`) | **eliminar** | El buscador pasa a la intro y no es sticky. |
| `src/components/shared/search-topbar.tsx` (`SearchTopbar`) | **eliminar** | Lo reemplaza `EventSearchForm` (otra ubicación, otra firma y otro layout). `PRICE_RANGES` se traslada sin cambios. |
| `src/hooks/use-scrolled-past-viewport.ts` y `src/hooks/use-scrolled-past-viewport.test.ts` | **eliminar** | Sin consumidores tras quitar la variante transparente (YAGNI). |
| `src/components/shared/hero.tsx` (Hero full-bleed con `-mt-32`, overlay, Swiper) | **eliminar** | La referencia no tiene hero full-bleed ni compensación bajo el header. El Hero nuevo (panel partido) es la 005; entre 004 y 005 la landing no tiene carrusel (aceptado, D9). |
| Dependencia `swiper` | **eliminar** (`npm uninstall swiper`) | Sin consumidores. La 005 no la usa (ver su decisión D1). |
| Footer neutro de 2 columnas (`site-footer.tsx`) | **reemplazar** | Footer claro de la referencia con 4 columnas. |
| `SiteHeader`/`SiteFooter` renderizados en `src/app/layout.tsx` | **mover** a `src/app/(site)/layout.tsx` | El flujo de compra (007/008/010) usa otro header. |
| `src/app/page.tsx` | **mover** a `src/app/(site)/page.tsx` | Requisito del grupo `(site)`. |

## Fuera de alcance

- **005**: Hero de destacados (panel partido, miniaturas, accesibilidad del carrusel heredada del AC7 de la 002).
- **009**: búsqueda real. "Buscar" solo hace `preventDefault()`, sin navegar ni llamar a ningún service.
- **011 / 013**: "Iniciar sesión" / "Ingresar" y "Vender entradas" siguen en `href="#"`.
- Envío real del newsletter: no hay backend; solo validación nativa y mensaje local.
- Barras de acción sticky inferiores y su `scroll-padding-bottom`: las define la 006 (primer consumidor).
- Header del flujo de compra: 007.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Button` / `buttonVariants` | reutilizar | `src/components/ui/button.tsx` | Trigger del menú, "Buscar", "Suscribirme". Sin cambios. |
| `Sheet` | reutilizar | `src/components/ui/sheet.tsx` | Menú móvil (`side="right"`). |
| `Input`, `Popover`, `Calendar`, `Select` | reutilizar | `src/components/ui/*` | Campos del buscador, con `className`, sin editar los archivos. |
| `ThemeToggle`, `ThemeProvider` | reutilizar sin cambios | `src/components/shared/*` | Se conserva el modo oscuro (D3). |
| `SectionHeader` (003) | reutilizar | `src/components/shared/section-header.tsx` | Encabezado de "Cómo funciona". |
| `EventDiscoverySection` (003) | reutilizar | `src/modules/events/components/` | Sin cambios. |
| `BrandLogo` | crear | `src/components/shared/brand-logo.tsx` | Tile índigo + `Ticket` + "Ticketera". Usos: header, footer y header de compra (007). |
| `SiteHeader` | reemplazar | `src/components/shared/site-header.tsx` | Firma igual (`SiteHeader()`), pasa a server component salvo el menú (D5). |
| `SiteMobileMenu` | crear | `src/components/shared/site-mobile-menu.tsx` | Client: `Sheet` del menú móvil. Separarlo deja `SiteHeader` como server component. |
| `SiteFooter` | reemplazar | `src/components/shared/site-footer.tsx` | Firma igual. |
| `EventSearchForm` | crear | `src/modules/events/components/event-search-form.tsx` | Client. Dominio events: la 009 lo conectará a la búsqueda. |
| `HomeIntroSection` | crear | `src/modules/home/components/home-intro-section.tsx` | h1 + subtítulo + `EventSearchForm`. |
| `HowItWorksSection` | crear | `src/modules/home/components/how-it-works-section.tsx` | Estática. |
| `NewsletterSection` | crear | `src/modules/home/components/newsletter-section.tsx` | Client (estado de envío local). |
| Layout de `(site)` | crear | `src/app/(site)/layout.tsx` | `SiteHeader` + `<main>` + `SiteFooter`. |
| Root layout | modificar | `src/app/layout.tsx` | Queda con `<html>`, `<body>`, fuente y `ThemeProvider`. |
| `--site-header-height` + `scroll-padding-top` | crear | `src/app/globals.css` | Consumidores reales: anclas del nav (`/#eventos`…) y paneles sticky de la 006. |

**Recuento de archivos de producción:** 13 creados/modificados/movidos + 4 eliminados (+ `package.json`/lock). Pasa la guía de ~8: el shell completo (header, footer, intro, 2 secciones) es una unidad visual, y dejar parte del shell de la 002 mezclado con el nuevo daría una landing incoherente entre fases. El Hero se separó a la 005 precisamente para no superar esta cifra.

## Contratos

### C1 — Altura del header y scroll padding (P1, `src/app/globals.css`)

```css
:root { --site-header-height: 4rem; }                        /* 64 px  (< lg)  — referencia móvil */
@media (width >= 64rem) { :root { --site-header-height: 4.75rem; } } /* 76 px (≥ lg) — referencia desktop */
html { scroll-padding-top: calc(var(--site-header-height) + 1rem); }
```

- Bloque `:root` propio, fuera de los de color (no depende del tema).
- `SiteHeader` usa `h-(--site-header-height)`; nadie más hardcodea la altura.
- API pública para 006 en adelante: `top` de paneles sticky = `calc(var(--site-header-height) + 1rem)`. Prohibido `top-16`, `top-20`, `64px`, `76px` como altura del header.

### C2 — `BrandLogo`

```ts
// src/components/shared/brand-logo.tsx  (server)
export type BrandLogoProps = { size?: "md" | "sm"; className?: string }
export function BrandLogo(props: BrandLogoProps): JSX.Element
```
- `<span>` `inline-flex items-center gap-2.5` (no es link; quien lo usa lo envuelve).
- Tile `bg-primary text-primary-foreground` con `Ticket` (lucide, `aria-hidden`): `md` = `size-[2.375rem] rounded-[11px]`, icono 20 px; `sm` = `size-8 rounded-[10px]`, icono 18 px.
- Texto "Ticketera" `font-bold tracking-[-0.02em]`: `md` = 21 px, `sm` = 18 px; color heredado.

### C3 — Header, menú, footer

```ts
export function SiteHeader(): JSX.Element                      // server
export function SiteMobileMenu(): JSX.Element                  // "use client"
export function SiteFooter(): JSX.Element                      // server
```

Navegación (única fuente, constante en `site-header.tsx` y reutilizada por el menú vía prop o export): `Eventos` → `/#eventos`, `Categorías` → `/#categorias`, `Cómo funciona` → `/#como-funciona`. Se usan rutas `/#…` para que funcionen también desde `/events/[slug]`.

### C4 — `EventSearchForm`

```ts
// src/modules/events/components/event-search-form.tsx  ("use client")
export type EventSearchFormProps = { className?: string }
export function EventSearchForm(props: EventSearchFormProps): JSX.Element
```
Estado local `{ query, date, price }`. `onSubmit` = `event.preventDefault()` (la 009 añadirá la navegación). `PRICE_RANGES` se traslada de `search-topbar.tsx` sin cambios (6 opciones, `"any"` por defecto).

### C5 — Secciones de home

```ts
export function HomeIntroSection(): JSX.Element     // server
export function HowItWorksSection(): JSX.Element    // server
export function NewsletterSection(): JSX.Element    // "use client"
```

### C6 — Routing

```
src/app/layout.tsx           → <html lang="es"><body><ThemeProvider>{children}</ThemeProvider></body></html>
src/app/(site)/layout.tsx    → <SiteHeader /><main className="flex-1">{children}</main><SiteFooter />
src/app/(site)/page.tsx      → <HomeIntroSection /><EventDiscoverySection /><HowItWorksSection /><NewsletterSection />
```
Un solo root layout (sin recarga completa entre grupos). El `body` conserva `min-h-full flex flex-col`; `(site)/layout.tsx` devuelve un fragmento.

## Especificación visual

**Transcrito de la referencia** (`Main` desktop 1440 px y `Mobile` 390 px): estructura, copy, medidas, colores y orden de todas las secciones. **Criterio propio**: breakpoint `lg` como corte desktop/móvil (D1), `ThemeToggle` (D3), header sticky (D4), comportamiento del newsletter (D7) y lo marcado con D.

### Header (`SiteHeader`)
- `<header className="sticky top-0 z-50 w-full border-b border-border bg-background">`, contenedor `mx-auto flex h-(--site-header-height) max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8`.
- Izquierda: `next/link` a `/` con `<BrandLogo size="md" />` (`sm` por debajo de `lg`) y `aria-label="Ticketera, ir al inicio"`, `focus-ring rounded-xl`.
- **`≥ lg`**:
  - Centro: `<nav aria-label="Principal">` `flex gap-9` con los 3 links de C3, `text-[0.9375rem] font-medium text-foreground/80 hover:text-primary focus-ring rounded-md` (la referencia usa `#3F3F46`; con `/80` sobre blanco da ≈ 8:1).
  - Derecha `flex items-center gap-2`: `<ThemeToggle />`; link **"Iniciar sesión"** (`h-11 px-[18px] rounded-xl text-[0.9375rem] font-medium hover:bg-muted focus-ring`); link **"Vender entradas"** (`h-11 px-[18px] rounded-xl border-[1.5px] border-input text-[0.9375rem] font-semibold hover:bg-muted focus-ring`). Ambos `href="#"`.
- **`< lg`** (derecha, `flex gap-1`): link **"Ingresar"** (`h-11 px-3 text-sm font-medium`, `href="#"`) + `<SiteMobileMenu />`.
- Sin buscador ni degradado. El header es igual en todas las rutas del grupo `(site)`.

### Menú móvil (`SiteMobileMenu`)
- Trigger: `Button variant="ghost" size="icon"` `size-11 rounded-xl`, icono `Menu`, `aria-label="Abrir menú"`.
- `SheetContent side="right"` con `SheetTitle` "Menú"; `<nav aria-label="Principal">` con los 3 links (`min-h-11 text-base font-medium`), luego "Vender entradas"; al pie `ThemeToggle`. Al pulsar un link de ancla, el `Sheet` se cierra.

### Intro + buscador (`HomeIntroSection` + `EventSearchForm`)
- `<section aria-labelledby="home-title">`, contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-5.5 pb-5 lg:pt-11 lg:pb-7`.
- `lg`: `flex items-end justify-between gap-12`; `< lg`: `flex flex-col gap-2.5`.
- Columna de texto (`lg:max-w-[35rem] flex flex-col gap-2.5 lg:gap-3`):
  - `<h1 id="home-title">` **"Encuentra tu próximo plan en vivo"**: `text-[1.875rem] leading-[1.12] lg:text-5xl lg:leading-[1.08] font-bold tracking-[-0.03em] text-balance`.
  - `<p>` **"Conciertos, deportes, teatro y festivales. Compra seguro y recibe tu entrada al instante."**: `text-[0.9375rem] lg:text-[1.0625rem] leading-[1.55] text-muted-foreground`.
- **Buscador** `<form role="search" aria-label="Buscar eventos">`:
  - **`≥ lg`** — tarjeta `w-[42rem] h-19 p-2 flex items-stretch rounded-[22px] border border-border bg-card shadow-[0_12px_32px_-16px_rgb(24_24_27/0.22)]`:
    1. Campo **"Qué quieres ver"** (`flex-1`, `<label>` envolvente `flex flex-col justify-center gap-0.5 rounded-2xl px-[18px] py-1.5 cursor-text has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring`): span del label `text-xs font-semibold` + `Input type="search"` sin borde/fondo/anillo, `placeholder="Artista, evento o ciudad"`, `text-[0.9375rem]`.
    2. Separador vertical `w-px my-3 bg-border` `aria-hidden`.
    3. **"Fecha"** (`w-[9.375rem]`): `PopoverTrigger` con forma de campo (label `text-xs font-semibold` y valor `text-[0.9375rem] text-muted-foreground`): **"Cualquier día"** o la fecha elegida con `Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" })` (D8). Contenido `Calendar mode="single"`. Nombre accesible del trigger incluye "Fecha".
    4. Separador.
    5. **"Precio"** (`w-40`): label con `id` + `Select` (trigger sin borde, `aria-labelledby` al label) con las 6 opciones de `PRICE_RANGES` ("Cualquier precio" por defecto).
    6. Botón **"Buscar"** `type="submit"`: `px-6 rounded-2xl bg-cta text-cta-foreground hover:bg-cta-hover text-[0.9375rem] font-semibold gap-2` + `Search` 18 px `aria-hidden`.
  - **`< lg`** — mismo `<form>`, tarjeta `mt-1.5 h-14 flex items-center gap-2.5 rounded-[18px] border border-border bg-card py-1.5 pr-1.5 pl-4 shadow-[0_10px_24px_-16px_rgb(24_24_27/0.25)]`: icono `Search` 20 px `text-muted-foreground aria-hidden`, el mismo input (label "Qué quieres ver" en `sr-only`) y "Buscar" `h-11 px-4 rounded-[13px] text-sm`. Fecha, precio y separadores con `hidden lg:flex` (D2).
  - Un solo formulario y un solo input en el DOM; `id`s con `useId`.

### "Cómo funciona" (`HowItWorksSection`)
- `<section id="como-funciona" aria-labelledby="how-it-works-title">`, contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-24 flex flex-col gap-7 lg:gap-12`.
- `SectionHeader` `title="Cómo funciona"`, `description="Tres pasos y ya estás dentro."`.
- `<ol>`: `lg:grid lg:grid-cols-3 lg:gap-8`; `< lg` lista vertical `flex flex-col gap-6`.
- Cada paso (`li`): tile `size-16 rounded-[20px] bg-primary/10 text-primary` con icono 28 px `aria-hidden` (Buscar `Search`, Elegir `Ticket`, Comprar `QrCode`); "Paso {n}" (`text-sm font-semibold text-primary`); `<h3>` (`text-xl font-semibold`); descripción (`text-[0.9375rem] text-muted-foreground`). En `lg`, conector punteado horizontal `border-t-2 border-dashed border-input` entre tiles (`aria-hidden`).
- Copy exacto: **Buscar** — "Encuentra el evento, artista o ciudad que te interesa." · **Elegir** — "Selecciona tus entradas y la cantidad que necesitas." · **Comprar** — "Paga de forma segura y recibe tus entradas al instante."

### Newsletter (`NewsletterSection`)
- `<section aria-labelledby="newsletter-title">`, contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 lg:pb-24`.
- Tarjeta `rounded-[28px] lg:rounded-[32px] bg-primary/10 p-6 lg:px-14 lg:py-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6` (D6).
- Texto: `<h2 id="newsletter-title">` **"No te pierdas ningún evento"** (`text-2xl lg:text-[1.875rem] font-bold tracking-[-0.02em]`) + `<p>` **"Suscríbete y recibe las novedades de tus artistas y equipos favoritos."** (`text-muted-foreground`).
- `<form>`: `flex flex-col sm:flex-row gap-3 lg:w-[30rem]`. Campo con icono `Mail` 20 px dentro (`aria-hidden`), `<label className="sr-only">Correo electrónico</label>`, `Input type="email" required autoComplete="email" placeholder="tu@correo.com"` `h-13 rounded-[14px] border-primary/30 bg-card pl-11` (la referencia usa `#C7D2FE`, ver D6). Botón **"Suscribirme"** `type="submit"` `h-13 rounded-[14px] px-6 bg-primary text-primary-foreground font-semibold` (botón de marca, no de compra).
- Envío: `preventDefault()`; si el input es válido (validación nativa), el formulario se reemplaza por `<p role="status">` **"¡Listo! Te avisaremos de los próximos eventos."** (D7). Sin red.

### Footer (`SiteFooter`)
- `<footer className="border-t border-border bg-secondary/60">` (D6), contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-8 lg:pt-16 flex flex-col gap-10`.
- Fila superior `flex flex-col lg:flex-row lg:justify-between gap-10`:
  - Marca (`max-w-80 flex flex-col gap-3`): `<BrandLogo size="sm" />` + **"Entradas para conciertos, deportes, teatro y festivales."** (`text-sm text-muted-foreground`).
  - Columnas `grid grid-cols-2 gap-x-8 gap-y-10 lg:flex lg:gap-16`; cada una `<nav aria-label="{título}">` con título `text-sm font-semibold` y links `text-sm text-muted-foreground hover:text-foreground focus-ring rounded-sm min-h-6` (`href="#"`):
    - **Compañía**: Sobre nosotros, Contacto.
    - **Ayuda**: Centro de ayuda, Cómo comprar, Reembolsos.
    - **Legal**: Términos y condiciones, Privacidad, Cookies.
    - **Síguenos**: Instagram, Facebook, X (Twitter).
- Pie `border-t border-border pt-6 text-[0.8125rem] text-muted-foreground`: **"© {año} Ticketera. Todos los derechos reservados."** (`new Date().getFullYear()`).

### Jerarquía de headings en `/`
`h1` "Encuentra tu próximo plan en vivo" → `h2` "Explora por categoría" → `h2` "Próximos eventos" → `h3` tarjetas → `h2` "Cómo funciona" → `h3` pasos → `h2` "No te pierdas ningún evento".

## Decisiones propias (no validadas) vs. validadas

**Validadas por el usuario:** header blanco (no transparente), buscador en la intro (no sticky), eliminar header transparente, `SearchTopbar` sticky, `useScrolledPastViewport` y hero full-bleed; naranja para "Buscar"; índigo para marca/navegación ("Suscribirme" en índigo).

**Decisiones propias:**
- **D1** — Un solo breakpoint, `lg` (1024 px), para pasar del layout móvil al desktop en header e intro: a 768 px no caben nav + toggle + 2 botones, ni la tarjeta de búsqueda de 672 px junto al h1.
- **D2** — En móvil el buscador es un solo campo (referencia `Mobile`): fecha y precio quedan ocultos hasta `lg`. Se elimina el `Sheet` de búsqueda de la versión anterior de esta spec.
- **D3** — Se conserva `ThemeToggle` aunque la referencia no lo muestra: el modo oscuro es un requisito vigente (spec 001, tokens claro y oscuro pedidos por el usuario). Va antes de "Iniciar sesión" en desktop y en el menú móvil.
- **D4** — Header `sticky` (la referencia es estática y no lo define). Con `scroll-padding-top` las anclas no quedan bajo el header.
- **D5** — El menú móvil se separa en `SiteMobileMenu` (client) para que `SiteHeader` sea server component (ya no necesita hooks).
- **D6** — Colores sin token propio aproximados con tokens existentes en vez de literales: newsletter `#EEF2FF` → `bg-primary/10`; footer `#FAFAFA` → `bg-secondary/60`; borde del input del newsletter → `border-primary/30`. En oscuro resultan en superficies índigo/zinc oscuras legibles.
- **D7** — Newsletter sin red: validación nativa de email y mensaje local de confirmación (`role="status"`). No se agrega Zod: no hay datos que salgan del navegador.
- **D8** — El texto de la fecha elegida usa el formateador local del navegador (como la 002) y no `src/lib/format.ts`: una fecha del `Calendar` es medianoche local y formatearla en `America/Lima` podría mostrar el día anterior.
- **D9** — Entre la 004 y la 005 la landing no tiene carrusel: se elimina el Hero de la 002 aquí (su `-mt-32` y su `h1` chocan con el header y la intro nuevos) en lugar de parchearlo para una sola fase.
- **D10** — Grupo de rutas `(site)` creado en esta fase (primer cambio del layout) para que la 006 cree el detalle directamente dentro y la 007 solo añada `(purchase)`, sin mover archivos más adelante.
- **D11** — Iconos de "Cómo funciona": `Search`, `Ticket`, `QrCode` (coinciden con los SVG de la referencia).

## Tareas

### Preparación (serie)
- **P1** Tokens y documentación — archivos: `src/app/globals.css` (C1), `docs/design/design-system.md` (§4: altura del header y regla de `top` sticky; uso de `bg-primary/10` y `bg-secondary/60` de D6).
- **P2** Routing, logo y retiro del Hero de la 002 — archivos: `src/components/shared/brand-logo.tsx`, `src/app/layout.tsx` (quitar header, footer y `<main>`), `src/app/(site)/layout.tsx` (nuevo), mover `src/app/page.tsx` → `src/app/(site)/page.tsx` quitando `<Hero />`, eliminar `src/components/shared/hero.tsx`, y `package.json`/`package-lock.json` (`npm uninstall swiper`, después de eliminar su único consumidor).

### Paralelo (archivos disjuntos)
- **T1** Header y menú móvil — archivos: `src/components/shared/site-header.tsx`, `src/components/shared/site-mobile-menu.tsx`.
- **T2** Footer — archivos: `src/components/shared/site-footer.tsx`.
- **T3** Intro y buscador, con test — archivos: `src/modules/events/components/event-search-form.tsx`, `src/modules/events/components/event-search-form.test.tsx`, `src/modules/home/components/home-intro-section.tsx`.
- **T4** "Cómo funciona" y newsletter, con test — archivos: `src/modules/home/components/how-it-works-section.tsx`, `src/modules/home/components/newsletter-section.tsx`, `src/modules/home/components/newsletter-section.test.tsx`.

Durante el bloque paralelo nadie ejecuta `npm install` ni `npm run build`.

### Integración (serie)
- **I1** Composición y limpieza — archivos: `src/app/(site)/page.tsx` (orden de C6), eliminar `src/components/shared/search-topbar.tsx`, `src/hooks/use-scrolled-past-viewport.ts`, `src/hooks/use-scrolled-past-viewport.test.ts`.

## Criterios de aceptación

**Calidad y estructura**
- [ ] AC1 `npm run lint`, `npm run test` y `npm run build` pasan.
- [ ] AC2 No existen `hero.tsx`, `search-topbar.tsx`, `use-scrolled-past-viewport.ts` ni su test; `swiper` no está en `package.json` y ningún archivo importa `swiper` (grep).
- [ ] AC3 `src/app/layout.tsx` no importa `SiteHeader` ni `SiteFooter`; `src/app/(site)/layout.tsx` sí. `src/app/page.tsx` no existe y `/` responde 200 desde `src/app/(site)/page.tsx`.
- [ ] AC4 Ningún archivo de `src/components/shared/` importa de `@/modules/` (grep). La altura del header sale de `--site-header-height` (grep: `site-header.tsx` no contiene `h-16`, `h-[76px]` ni `-mt-`).

**Header**
- [ ] AC5 A 1280 px: header blanco con borde inferior, alto 76 px; logo (tile índigo + "Ticketera"); `nav` "Principal" con Eventos, Categorías y Cómo funciona; a la derecha toggle de tema, "Iniciar sesión" y "Vender entradas" (outline). No hay buscador en el header ni degradado.
- [ ] AC6 A 375 px y 768 px: alto 64 px, logo, "Ingresar" y botón "Abrir menú" que abre un `Sheet` con los 3 links, "Vender entradas" y el toggle. Pulsar "Cómo funciona" cierra el menú y lleva a la sección.
- [ ] AC7 El header queda fijo arriba al hacer scroll y es idéntico al cargar con scroll 0 y tras hacer scroll. "Eventos" lleva a `#eventos` y el h2 "Próximos eventos" queda visible bajo el header (no tapado).

**Intro y buscador**
- [ ] AC8 Intro con el `h1` y el subtítulo exactos. A 1280 px el buscador es una tarjeta de 76 px de alto a la derecha del texto, con "Qué quieres ver" (placeholder "Artista, evento o ciudad"), "Fecha" ("Cualquier día"), "Precio" ("Cualquier precio") y "Buscar" naranja con texto oscuro.
- [ ] AC9 Clic en el label "Qué quieres ver" enfoca el input. Elegir una fecha muestra un texto con el mes en letras. El `Select` tiene las 6 opciones de la 002 y su nombre accesible incluye "Precio".
- [ ] AC10 A 375 px: h1 de 30 px y un buscador de una sola fila (icono, input y "Buscar"), sin fecha ni precio visibles; el input tiene nombre accesible "Qué quieres ver".
- [ ] AC11 Pulsar "Buscar" no recarga, no cambia la URL y no hace peticiones (pestaña Network).

**Secciones**
- [ ] AC12 "Cómo funciona" (`id="como-funciona"`) con el subtítulo exacto y 3 pasos en orden (Buscar, Elegir, Comprar), cada uno con tile índigo, "Paso n", `h3` y descripción exactos; 3 columnas a 1280 px y lista vertical a 375 px.
- [ ] AC13 Newsletter con título y texto exactos, input de email con label accesible "Correo electrónico" y botón índigo "Suscribirme". Con un email inválido el navegador muestra su validación y no aparece el mensaje; con uno válido aparece "¡Listo! Te avisaremos de los próximos eventos." sin peticiones de red.
- [ ] AC14 Footer claro con la marca, el texto exacto y 4 `<nav>` ("Compañía", "Ayuda", "Legal", "Síguenos") con exactamente los links listados, más "© 2026 Ticketera. Todos los derechos reservados."; a 375 px las columnas forman una grilla de 2.
- [ ] AC15 Orden de `/`: intro → "Explora por categoría" → "Próximos eventos" → "Cómo funciona" → newsletter → footer. No hay carrusel.

**Accesibilidad, tema y responsive**
- [ ] AC16 Con Tab, todos los elementos interactivos del header, intro, secciones y footer muestran foco visible; los botones de solo icono tienen nombre accesible.
- [ ] AC17 En claro y oscuro, el inspector de contraste da ≥ 4.5:1 en links del nav, "Iniciar sesión", "Vender entradas", "Buscar" (texto oscuro sobre naranja), labels y valores del buscador, textos de "Cómo funciona", newsletter y footer.
- [ ] AC18 A 375, 768 y 1280 px no hay scroll horizontal; la consola no muestra errores ni warnings de hidratación.

## Tests obligatorios

- `src/modules/home/components/newsletter-section.test.tsx` (RTL + `user-event`; tiene estado): con email válido, enviar muestra el texto de confirmación con `role="status"`; con el campo vacío, no se muestra.
- `src/modules/events/components/event-search-form.test.tsx` (RTL): el input tiene nombre accesible "Qué quieres ver"; enviar el formulario llama a `preventDefault` (el evento `submit` queda `defaultPrevented`); el `Select` muestra "Cualquier precio" por defecto.
- Se eliminan `use-scrolled-past-viewport.test.ts` (su hook se elimina). Los tests de 001 y 003 siguen pasando sin cambios.
- **Sin test propio:** `BrandLogo`, `SiteHeader`, `SiteMobileMenu`, `SiteFooter`, `HomeIntroSection`, `HowItWorksSection` (presentacionales o composición) y los layouts/página.
## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- Manual (`npm run dev`, `/`), a 375, 768 y 1280 px, claro y oscuro: AC5–AC18 (altura del header en DevTools, menú móvil, anclas del nav, Network al pulsar "Buscar" y "Suscribirme", inspector de contraste, recorrido con Tab, consola).
