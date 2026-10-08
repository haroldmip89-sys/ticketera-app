# Design System — Ticketera

- **Estado:** aprobado (creado con `docs/specs/001-design-system-foundations.md`; paleta actualizada por `docs/specs/003-events-module-upcoming-events.md`; tokens `--stage*` y barra de progreso añadidos por `docs/specs/005-featured-events-hero.md`; tokens `--success*` añadidos por `docs/specs/011-purchase-confirmation.md`)
- **Alcance:** fundamentos visuales de todo el proyecto (no solo la landing). Fuente de verdad para paleta de color (claro y oscuro), tipografía y principios de layout.

> Inspiración visual (no de contenido) en Ticketmaster y Joinnus: densidad de información moderada, tarjetas de evento con imagen dominante, jerarquía tipográfica clara, CTAs de alto contraste. No se copia texto, logos, ni paletas exactas de esos sitios.

---

## 1. Qué debe transmitir la marca

- **Evento / entretenimiento:** color y tipografía con algo de carácter, no un SaaS corporativo gris. Se logra con un primario índigo vívido (no negro/gris puro), tintes suaves por categoría y una tipografía geométrica redondeada (Poppins).
- **Confianza:** suficiente contraste, jerarquía predecible, espaciado generoso y neutros zinc dominantes; el color vívido se usa con disciplina, no en todas partes.
- **Conversión clara:** un naranja reservado **exclusivamente** a las acciones de compra, para que el camino a comprar sea inconfundible.

> Paleta transcrita del diseño de referencia (`docs/design/reference-design.md` §1) en la spec `docs/specs/003-events-module-upcoming-events.md` (C1). Reemplaza la paleta violeta + coral de la spec 001.

### Regla de uso del color

- **Neutros (zinc):** fondos, texto, bordes (~80 %).
- **Índigo (`primary`):** marca y navegación: logo, links, eyebrows, selección, foco, botones de marca no transaccionales ("Suscribirme", "Iniciar sesión").
- **Naranja (`cta`):** **solo** acciones de compra/conversión: "Buscar", "Comprar entradas", "Elegir entradas", "Continuar", "Pagar". "Ver entradas" en la tarjeta de evento es un botón outline oscuro por diseño (no es naranja: es un indicador visual dentro de un link, no un CTA aislado). No se usa como fondo de sección ni para estados.
- **Precio (`price`):** texto de precios.
- **Urgencia (`urgent`):** "Últimas entradas" como **tinte suave + icono `Clock` + texto**, nunca solo color.
- **Agotado:** `bg-foreground text-background` + texto "Agotado" (sin token propio).
- Máximo un CTA naranja visible por bloque.
- `--accent` **no** es un color de marca: es la superficie neutra de hover/foco que usan los primitivos de shadcn (p. ej. `SelectItem`). Si fuera naranja, los menús se pintarían de naranja al navegar con teclado.

---

## 2. Paleta de colores (modo claro y oscuro)

Este producto soporta **modo claro y modo oscuro**, con cambio manual mediante un toggle en el header y detección inicial de preferencia del sistema (`prefers-color-scheme`). Mecanismo: `next-themes` con `attribute="class"` — los tokens de modo claro viven en `:root`, los de modo oscuro en un bloque `.dark` que se activa agregando la clase `dark` al elemento `html` (ver decisión en la sección 6).

Formato: valores en `oklch()` (compatibles con Tailwind v4 y shadcn), convertidos desde los hex de la referencia; el hex se indica como referencia (tolerancia de verificación ±2 por canal RGB). La referencia no tiene modo oscuro: los valores oscuros son propios, derivados de las escalas zinc/indigo/orange de Tailwind (mismo hue, ajuste de lightness).

### 2.1 Modo claro (`:root`)

| Token | Valor oklch | Hex | Uso |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `#FFFFFF` | Fondo de página |
| `--foreground` | `oklch(0.21 0.006 285.9)` | `#18181B` | Texto principal; fondo de chip activo y badge "Agotado" |
| `--card` / `--popover` | `oklch(1 0 0)` | `#FFFFFF` | Tarjetas y popovers |
| `--card-foreground` / `--popover-foreground` | `oklch(0.21 0.006 285.9)` | `#18181B` | Texto sobre card/popover |
| `--primary` | `oklch(0.511 0.23 277)` | `#4F46E5` | Marca y navegación: logo, links, eyebrow, mes del badge, selección |
| `--primary-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Texto sobre primario |
| `--secondary` | `oklch(0.967 0.001 286.4)` | `#F4F4F5` | Fondo de sección alterna (Próximos eventos) |
| `--secondary-foreground` | `oklch(0.21 0.006 285.9)` | `#18181B` | Texto sobre `--secondary` |
| `--muted` | `oklch(0.967 0.001 286.4)` | `#F4F4F5` | Fondos sutiles, botón "−", estados deshabilitados |
| `--muted-foreground` | `oklch(0.442 0.015 285.8)` | `#52525B` | Texto secundario |
| `--accent` | `oklch(0.967 0.001 286.4)` | `#F4F4F5` | Superficie neutra de hover/foco de shadcn (`SelectItem`) |
| `--accent-foreground` | `oklch(0.21 0.006 285.9)` | `#18181B` | Texto sobre `--accent` |
| `--destructive` | `oklch(0.58 0.22 25)` | — | Errores, validación negativa (sin cambios) |
| `--destructive-foreground` | `oklch(0.985 0 0)` | — | Texto sobre `--destructive` |
| `--border` | `oklch(0.92 0.004 286.3)` | `#E4E4E7` | Bordes de tarjeta y divisores |
| `--input` | `oklch(0.871 0.005 286.3)` | `#D4D4D8` | Bordes de inputs, chips inactivos y botones outline |
| `--ring` | `oklch(0.585 0.204 277.1)` | `#6366F1` | Foco (indigo-500: el `#818CF8` de la referencia da 2.98:1 contra blanco, por debajo de 3:1) |
| `--chart-1` … `--chart-5` | sin cambios | — | Reservado para futuras visualizaciones |
| `--sidebar*` | alias de tokens del proyecto (`--sidebar`→`--card`, `-foreground`→`--foreground`, `-primary`→`--primary`, `-primary-foreground`→`--primary-foreground`, `-accent`→`--accent`, `-accent-foreground`→`--accent-foreground`, `-border`→`--border`, `-ring`→`--ring`) | — | Shell de administración (spec 023); ver §4 "Shell de administración" |

### 2.2 Modo oscuro (`.dark`)

| Token | Valor oklch | Hex | Uso |
|---|---|---|---|
| `--background` | `oklch(0.141 0.004 285.8)` | `#09090B` | Fondo de página |
| `--foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Texto principal |
| `--card` / `--popover` | `oklch(0.21 0.006 285.9)` | `#18181B` | Tarjetas y popovers |
| `--card-foreground` / `--popover-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Texto sobre card/popover |
| `--primary` | `oklch(0.68 0.158 276.9)` | `#818CF8` | Marca y navegación |
| `--primary-foreground` | `oklch(0.21 0.006 285.9)` | `#18181B` | Texto oscuro sobre primario claro |
| `--secondary` | `oklch(0.274 0.005 286)` | `#27272A` | Fondo de sección alterna |
| `--secondary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Texto sobre `--secondary` |
| `--muted` | `oklch(0.274 0.005 286)` | `#27272A` | Fondos sutiles |
| `--muted-foreground` | `oklch(0.712 0.013 286.1)` | `#A1A1AA` | Texto secundario |
| `--accent` | `oklch(0.274 0.005 286)` | `#27272A` | Superficie neutra de hover/foco de shadcn |
| `--accent-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Texto sobre `--accent` |
| `--destructive` | `oklch(0.62 0.21 25)` | — | Errores (sin cambios) |
| `--destructive-foreground` | `oklch(0.97 0 0)` | — | Texto sobre `--destructive` |
| `--border` | `oklch(0.37 0.012 285.8)` | `#3F3F46` | Bordes de tarjeta y divisores |
| `--input` | `oklch(0.442 0.015 285.8)` | `#52525B` | Bordes de inputs, chips inactivos y botones outline |
| `--ring` | `oklch(0.785 0.104 274.7)` | `#A5B4FC` | Foco |
| `--chart-1` … `--chart-5` | sin cambios | — | Reservado para futuras visualizaciones |
| `--sidebar*` | mismos alias que en claro (resuelven al valor oscuro de cada token) | — | Shell de administración (spec 023) |

### 2.3 Tokens semánticos

Tokens propios (no existen en shadcn), mapeados en `@theme inline` como `--color-*` para usar `bg-cta`, `hover:bg-cta-hover`, `text-cta-foreground`, `text-price`, `bg-urgent`, `text-urgent-foreground`.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--cta` | `oklch(0.705 0.187 47.6)` `#F97316` | `oklch(0.705 0.187 47.6)` `#F97316` | Botones de compra/conversión |
| `--cta-foreground` | `oklch(0.21 0.006 285.9)` `#18181B` | igual | Texto sobre el CTA (blanco da 2.8:1 y no cumple AA) |
| `--cta-hover` | `oklch(0.646 0.194 41.1)` `#EA580C` | `oklch(0.758 0.159 55.9)` `#FB923C` | Hover del CTA |
| `--price` | `oklch(0.553 0.174 38.4)` `#C2410C` | `oklch(0.758 0.159 55.9)` `#FB923C` | Precios ("Desde $45") |
| `--urgent` | `oklch(0.954 0.037 75.2)` `#FFEDD5` | `oklch(0.266 0.076 36.3)` `#431407` | Fondo del badge "Últimas entradas" |
| `--urgent-foreground` | `oklch(0.47 0.143 37.3)` `#9A3412` | `oklch(0.901 0.073 70.7)` `#FED7AA` | Texto e icono del badge "Últimas entradas" |

### 2.3.1 Panel oscuro ("escenario", spec 005)

Tokens `--stage*`, mapeados en `@theme inline` como `--color-stage*` (`bg-stage`, `text-stage-foreground`, `text-stage-muted`, `text-stage-subtle`). Fondo del panel del Hero de destacados y, desde la 006, del hero del detalle. **Iguales en claro y oscuro**: el panel es un escenario oscuro fijo, como una foto (spec 005, D5). Las superficies que se apoyan sobre él y deben seguir el tema (p. ej. la cápsula de controles) usan `bg-card`.

| Token | Claro y oscuro | Hex | Uso |
|---|---|---|---|
| `--stage` | `oklch(0.257 0.09 281.3)` | `#1E1B4B` | Fondo del panel y respaldo de la imagen |
| `--stage-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Título, precio |
| `--stage-muted` | `oklch(0.93 0.034 272.8)` | `#E0E7FF` | Fecha y lugar |
| `--stage-subtle` | `oklch(0.87 0.065 274)` | `#C7D2FE` | Contador ("01 / 05"), "Desde" |

Contraste sobre `--stage`: `--stage-foreground` 16:1, `--stage-muted` 13:1, `--stage-subtle` 10.7:1; el indicador de foco `focus-ring` con `--ring` claro (`#6366F1`) 3.6:1 (≥ 3:1). En oscuro `--ring` (`#A5B4FC`) da 8.1:1. Las pills con borde usan `border-white/28` (decorativo; el texto es `--stage-foreground`) y el CTA "Comprar entradas" mantiene `--cta` / `--cta-foreground` (6.3:1).

### 2.3.2 Barra de progreso del autoplay (spec 005)

Animación definida en `@theme` de `src/app/globals.css`: `--animate-featured-progress: featured-progress 6s linear forwards` con `@keyframes featured-progress` (ancho de 0 % a 100 %) → clase `animate-featured-progress`. Es el reloj del autoplay del Hero: su `animationend` dispara el avance, y las pausas temporales usan `animation-play-state: paused` (conserva el progreso).

**Reduced motion:** con `prefers-reduced-motion: reduce` el carrusel arranca en pausa y el fundido de imagen se desactiva (`motion-reduce:transition-none`). La barra **no** se desactiva con `motion-reduce`: es un indicador lineal de tiempo, no movimiento de contenido, y es el reloj del autoplay que el usuario pide explícitamente al pulsar "Reproducir" (spec 005, D6). En pausa del usuario la barra activa se muestra llena y estática.

### 2.3.3 Tonos de zona (spec 006)

Tokens `--zone-1` … `--zone-4` con su `-foreground`, mapeados en `@theme inline` como `--color-zone-*` (`bg-zone-1`, `text-zone-1-foreground`, …). Colores de las zonas en la lista "Entradas" del detalle y, después, en el mapa de zonas (007) y de asientos (008). **Iguales en claro y oscuro**: cada tono trae su propio color de texto.

| Token | Claro y oscuro | `-foreground` | Contraste |
|---|---|---|---|
| `--zone-1` | `#4F46E5` | `#FFFFFF` | 6.3:1 |
| `--zone-2` | `#818CF8` | `#1E1B4B` | 5.4:1 |
| `--zone-3` | `#A5B4FC` | `#1E1B4B` | 8.0:1 |
| `--zone-4` | `#C7D2FE` | `#1E1B4B` | 10.7:1 |

Zona agotada: sin token nuevo, `bg-muted text-muted-foreground`.

**Regla: el color de zona se deriva del precio, no es dato de dominio.** `getZoneTones` (`src/modules/events/utils/zone-tones.ts`) asigna a los tipos de entrada no agotados, por precio descendente (empate: orden recibido), los tonos 1, 2, 3, 4, 4, 4…; los agotados reciben `null` (gris). Así la zona disponible más cara es `#4F46E5` y las siguientes van aclarando, como en la referencia. `getZoneToneClassName` devuelve las clases estáticas completas (Tailwind las detecta); nadie compone `bg-zone-${n}` dinámicamente.

### 2.3.4 Barra de acción inferior en móvil (spec 006)

Token `--mobile-action-bar-height: 5rem` (alto máximo de una barra inferior fija por debajo de `lg`) y regla en `src/app/globals.css`:

```css
@media (width < 64rem) {
  html:has([data-mobile-action-bar]) { scroll-padding-bottom: calc(var(--mobile-action-bar-height) + 1rem); }
}
```

**Contrato:** la raíz de toda barra inferior fija lleva el atributo `data-mobile-action-bar` y su alto (safe-area incluida) no supera `--mobile-action-bar-height`. Con eso ningún elemento enfocado queda oculto bajo la barra (WCAG 2.4.11) sin compensaciones locales. Consumidores: `PurchaseBar` (006), selección de zonas (007) y mapa de asientos (008).

### 2.3.5 Éxito (spec 011)

Tokens `--success` y `--success-foreground`, mapeados en `@theme inline` como `--color-success` y `--color-success-foreground` (`bg-success`, `text-success-foreground`). Primer consumidor: el círculo con check de "¡Compra confirmada!" (011); después, el estado "Válida" de Mis entradas (013). No sustituyen a `--cta` ni a `--urgent`.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--success` | `oklch(0.962 0.044 156.743)` `#DCFCE7` | `oklch(0.266 0.065 152.934)` `#052E16` | Fondo del indicador de éxito |
| `--success-foreground` | `oklch(0.527 0.154 150.069)` `#15803D` | `oklch(0.871 0.15 154.449)` `#86EFAC` | Icono y texto sobre `--success` |

Contraste `--success-foreground` sobre `--success`: claro 4.6:1, oscuro 10.6:1 (≥ 4.5:1; en la 011 solo se usa en un icono, que exige ≥ 3:1).

### 2.4 Tintes de categoría

16 tokens `--cat-<id>-bg` (fondo del tile) y `--cat-<id>-fg` (color del icono). Claro = hex de la referencia. Oscuro = mismo hue, con fondo `oklch(0.30 0.05 H)` e icono `oklch(0.82 0.10 H)`. Se usan con la sintaxis de variables de Tailwind v4: `bg-(--cat-concerts-bg)`, `text-(--cat-concerts-fg)`.

| id | Claro bg | Claro fg | H (oscuro) |
|---|---|---|---|
| `concerts` | `#EEF0FF` `oklch(0.958 0.02 279.9)` | `#4338CA` `oklch(0.457 0.215 277)` | 277 |
| `sports` | `#E7F6EC` `oklch(0.959 0.021 156.8)` | `#15803D` `oklch(0.527 0.137 150.1)` | 150 |
| `theater` | `#FCEBEF` `oklch(0.955 0.019 1.4)` | `#BE123C` `oklch(0.514 0.198 16.9)` | 15 |
| `festivals` | `#FFF1E6` `oklch(0.966 0.021 60.8)` | `#C2410C` `oklch(0.553 0.174 38.4)` | 45 |
| `family` | `#E4F5F7` `oklch(0.958 0.018 205.3)` | `#0E7490` `oklch(0.52 0.094 223.1)` | 220 |
| `cinema` | `#F1ECFB` `oklch(0.951 0.021 301.1)` | `#6D28D9` `oklch(0.491 0.241 292.6)` | 293 |
| `comedy` | `#FDF5D8` `oklch(0.969 0.039 94.3)` | `#A16207` `oklch(0.554 0.121 66.4)` | 75 |
| `arts` | `#FBEAF6` `oklch(0.954 0.024 336.1)` | `#A21CAF` `oklch(0.518 0.226 323.9)` | 320 |

El icono va sobre un cuadro `bg-card` dentro del tile (blanco en claro, `#18181B` en oscuro). Contraste icono/cuadro ≥ 4.5:1 en los 16 pares (en claro el peor es comedy `#A16207` sobre blanco ≈ 4.9:1; en oscuro, L 0.82 sobre `#18181B` ≈ 9:1). El label del tile usa `text-foreground` sobre el fondo del tile (≥ 10:1 en ambos temas).

### 2.5 Contraste verificado (WCAG, luminancia relativa)

| Par | Claro | Oscuro |
|---|---|---|
| `--cta-foreground` sobre `--cta` | **6.3:1** | igual |
| `--cta-foreground` sobre `--cta-hover` | 5.0:1 | 7.8:1 |
| Blanco sobre `#F97316` (descartado) | **2.8:1, no cumple AA** | — |
| `--price` sobre `--card` | 5.2:1 | 7.8:1 |
| `--price` sobre `--secondary` | 4.7:1 | 6.6:1 |
| `--urgent-foreground` sobre `--urgent` | 6.4:1 | 11.6:1 |
| `--success-foreground` sobre `--success` | 4.6:1 | 10.6:1 |
| `--primary-foreground` sobre `--primary` | 6.3:1 | 5.9:1 |
| `--primary` sobre `--secondary` (eyebrow, links) | 5.7:1 | 5.0:1 |
| `--muted-foreground` sobre `--card` / `--secondary` | 7.7:1 / 7.0:1 | 6.9:1 / 5.8:1 |
| `--ring` contra `--background` (indicador de foco, ≥ 3:1) | 4.5:1 | 9.9:1 |
| `--stage-foreground` / `--stage-muted` / `--stage-subtle` sobre `--stage` | 16:1 / 13:1 / 10.7:1 | igual |
| `--ring` contra `--stage` (indicador de foco, ≥ 3:1) | 3.6:1 | 8.1:1 |
| `--zone-1-foreground` … `--zone-4-foreground` sobre su `--zone-*` | 6.3:1 / 5.4:1 / 8.0:1 / 10.7:1 | igual |

Si un ajuste futuro deja un par por debajo del umbral (4.5:1 texto, 3:1 indicadores de foco), se corrige la lightness (`L`) del token, no el hue.

### 2.6 Foco: utilidad `focus-ring`

Definida en `src/app/globals.css`:

```css
@utility focus-ring {
  &:focus-visible { outline: 3px solid var(--ring); outline-offset: 2px; }
}
```

Transcribe el foco de la referencia (outline de 3 px con offset de 2 px). La usan todos los elementos interactivos propios (tiles, chips, links-tarjeta, controles). Los `Button` de shadcn conservan su anillo (`ring-3 ring-ring/50`); si un `Button` queda sobre un fondo donde ese anillo no se ve, se le añade `focus-ring`.

---

## 3. Tipografía

- **Familia única para todo el proyecto:** [Poppins](https://fonts.google.com/specimen/Poppins) vía `next/font/google`, tanto para encabezados como para cuerpo de texto. Poppins no se distribuye como variable font en Google Fonts, así que se cargan pesos fijos: `300, 400, 500, 600, 700`.
- No se usa una segunda familia para mono/código en esta fase (ver decisión en sección 6 sobre `--font-mono`).

### Escala tipográfica (base 16px, line-height en proporción, no en px fijos)

| Elemento | Tamaño | Line-height | Peso | Uso |
|---|---|---|---|---|
| `h1` | `2.25rem` móvil / `3rem` desde `md` | `1.1` | 700 | Título de página/hero (uno por página) |
| `h2` | `1.75rem` móvil / `2.25rem` desde `md` | `1.2` | 600 | Títulos de sección |
| `h3` | `1.25rem` móvil / `1.5rem` desde `md` | `1.3` | 600 | Subtítulos, títulos de tarjeta destacada |
| `h4` | `1.125rem` | `1.4` | 500 | Títulos menores |
| `h5` | `1rem` | `1.4` | 500 | Encabezados de bloque pequeños |
| `h6` | `0.875rem` | `1.4` | 600, `uppercase`, `tracking-wide` | Etiquetas/eyebrow (ej. categoría sobre un título) |
| `body` | `1rem` | `1.6` | 400 | Texto de párrafo por defecto |
| `body-sm` | `0.875rem` | `1.5` | 400 | Texto secundario, descripciones cortas |
| `caption` | `0.75rem` | `1.4` | 400, color `--muted-foreground` | Metadatos: fecha, ubicación, aclaraciones legales |

Reglas:
- Un único `h1` por página.
- No saltarse niveles por motivos puramente visuales (si se necesita otro tamaño, se ajusta con clases de Tailwind sobre el mismo nivel semántico, no se usa `h4` por su tamaño en vez de `h2`).
- Botones y badges usan los tamaños `body-sm`/`caption` según su tamaño visual, no un nivel de heading.

---

## 4. Espaciado y layout

- **Contenedor principal:** ancho máximo `1280px` (`max-w-7xl`), centrado, con padding horizontal responsivo: `px-4` en móvil, `px-6` en `sm`/`md`, `px-8` desde `lg`.
- **Breakpoints:** los de Tailwind v4 por defecto (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px). No se agregan breakpoints custom.
- **Ritmo vertical entre secciones:** `py-12` en móvil, `py-16`/`py-20` desde `md` para secciones de contenido grandes (hero, grids de eventos — aplica desde la fase 2). El header usa altura fija (`--site-header-height`, ver abajo) y el footer un padding interno más compacto (`py-10`/`py-12`).
- **Altura del header (spec 004, C1):** variable `--site-header-height` en `src/app/globals.css` (bloque `:root` propio, independiente del tema): `4rem` (64 px) por debajo de `lg` y `4.75rem` (76 px) desde `lg`. `SiteHeader` la consume con `h-(--site-header-height)`; nadie más hardcodea la altura del header.
- **Scroll padding y `top` de elementos sticky:** `html` tiene `scroll-padding-top: calc(var(--site-header-height) + 1rem)` para que las anclas (`/#eventos`, `/#como-funciona`…) no queden bajo el header sticky. Todo panel sticky bajo el header (006 en adelante) usa `top: calc(var(--site-header-height) + 1rem)` (en Tailwind: `top-[calc(var(--site-header-height)+1rem)]`). Prohibido usar `top-16`, `top-20`, `64px` o `76px` como altura del header.
- **Superficies tintadas sin token propio (spec 004, D6):** se aproximan con tokens existentes y opacidad, no con literales hex. Tarjeta del newsletter (`#EEF2FF` en la referencia) → `bg-primary/10`; footer (`#FAFAFA`) → `bg-secondary/60`; borde del input del newsletter (`#C7D2FE`) → `border-primary/30`. En oscuro resultan superficies índigo/zinc oscuras legibles sin valores extra.
- **Radios:** se mantiene la escala de `--radius` ya definida en el scaffold (`--radius: 0.625rem` como base, con `sm/md/lg/xl/2xl/3xl/4xl` derivados). Encaja con el tono "moderno, no corporativo-cuadrado" sin necesidad de cambiarla.
- **Elevación:** sombras discretas (`shadow-sm`/`shadow-md` de Tailwind) para tarjetas y el popup del menú móvil; evitar sombras pesadas o múltiples capas de sombra.

### Shell de administración (spec 023)

- **Anchos:** sidebar expandido 264 px (`--sidebar-width: 16.5rem`), rail colapsado 76 px (`--sidebar-width-icon: 4.75rem`), fijados vía `style` del `SidebarProvider`. En móvil usa el drawer (`Sheet`) del componente shadcn.
- **Ítem activo:** `bg-primary/10 text-primary`; hover neutro `bg-accent`; foco con `focus-ring`.
- **Badge `success`:** nueva variante de `Badge` (`bg-success text-success-foreground`, tokens de §2.3.5) para estados "Aprobado". Los estados siempre llevan texto, no solo color.
- **Equivalencias del diseño (D1 de la spec 023):** no se agregan hex nuevos.

| Diseño | Token del proyecto |
|---|---|
| Fondo de página `#F8FAFC`, cards blancas, bordes `#E5E7EB` | `bg-muted/40`, `bg-card`, `border-border` |
| Texto `#111827` / `#4B5563` / `#6B7280` | `text-foreground` / `text-muted-foreground` |
| Ítem activo `#EEF2FF` + `#4338CA` | `bg-primary/10 text-primary` |
| Hover `#F3F4F6` | `bg-accent` |
| Botón primario `#4F46E5` / peligro `#B91C1C` | `Button` default / `variant="destructive"` |
| Foco `2px #4F46E5` | `focus-ring` (§2.6) |
| Radios 10–20 px | escala `--radius` (`rounded-lg/xl/2xl`) |
| Aviso de éxito `#DCFCE7` / `#166534` | `bg-success text-success-foreground` |

Al resolver a tokens ya verificados (§2.5), el contraste del shell hereda el de `--foreground`/`--card`/`--primary` en ambos temas.

---

## 5. Componentes base (criterio de selección, no implementación)

- Priorizar composición de primitivos de shadcn/ui (estilo `base-nova` sobre Base UI) ya configurados en `components.json`, instalados vía `npx shadcn@latest add <componente>`.
- El color y la tipografía se controlan centralmente vía los tokens CSS de la sección 2 y 3 — los componentes de shadcn ya están escritos para consumir esas variables (`bg-primary`, `text-foreground`, `cn-font-heading`, etc.), así que no deberían requerir overrides de color por componente.
- Iconografía: `lucide-react` (ya instalado, configurado como `iconLibrary` en `components.json`).

---

## 6. Decisiones explícitas (y su justificación)

1. **Modo oscuro vía `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`).** Se agrega `next-themes` como dependencia nueva y un `ThemeProvider` (client component) que envuelve el contenido en `src/app/layout.tsx`. El `<html>` lleva `suppressHydrationWarning` (requerido por `next-themes` para evitar el warning de hidratación por el `class` que la librería inyecta antes de que React hidrate). El toggle manual en el header alterna explícitamente entre `"light"` y `"dark"` (dos estados, sin exponer un tercer botón para "system" — `next-themes` ya resuelve la preferencia del sistema como valor inicial; exponer un selector de tres vías es innecesario para el alcance actual, YAGNI).
2. **`--font-mono` no carga una segunda fuente de Google.** Nada en el producto necesita texto monoespaciado real (no hay bloques de código de cara al usuario). En vez de cargar `Geist Mono` (peso extra de red sin uso) o eliminar la variable (rompiendo la utilidad `font-mono` de Tailwind si algún componente de shadcn la usa internamente), se define `--font-mono` como una pila de fuentes monoespaciadas del sistema (`ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`). Costo cero, utilidad disponible si se necesita más adelante.
3. **Poppins reemplaza completamente a Geist/Geist Mono** como `--font-sans` (y por herencia `--font-heading`, que ya apuntaba a `--font-sans` en el scaffold).
4. **Copy de la interfaz (nav, footer, metadata) en español.** El dominio (ticketera) y el contexto del equipo son hispanohablantes, y los productos de referencia (Joinnus) operan en español en Latinoamérica. El naming de código (archivos, componentes, variables) se mantiene en inglés según `docs/SETUP.md`; esto solo aplica al texto visible para el usuario final.

---

## 7. Validación con la skill `ui-ux-pro-max`

Se contrastó esta propuesta contra el catálogo local de la skill (`--design-system`, `--domain color`, `--domain typography`, `--domain product`, `--domain ux`). Resultado, distinguiendo match real de catálogo vs. ausencia de match (fallback a criterio propio):

- **Tipo de producto:** el catálogo tiene perfiles "Ticketing / Box Office" y "Event Management", pero ambos asumen hero de countdown/conferencia o dark mode OLED — no hay un perfil para "marketplace de entradas multi-evento en modo claro" como el nuestro. **Sin match exacto**; se mantiene el criterio propio documentado en las secciones 1-6.
- **Color primario (violeta-índigo sobre fondo claro):** sí hay precedente validado en el catálogo de indigo vívido sobre fondo claro para otro tipo de producto (principio perceptual aplicable, no el mismo dominio). **Confirma la dirección**, no cambia ningún valor.
- **Accent/urgencia vs. disponibilidad:** la convención del catálogo para ticketing es **verde = disponible, rojo = agotado**, como colores de estado separados del color de "urgencia/CTA". Desde la spec 003 el naranja es exclusivo de las acciones de compra (`--cta`), la urgencia tiene su propio token (`--urgent`) y `--accent` es neutro (ver la nota de abajo y la sección 1); ninguno de ellos **debe reutilizarse para indicar "entradas disponibles"** — si se necesita ese estado, se agrega un token `--success` (verde) nuevo en ese momento, no ahora (YAGNI: en esta fase no existen cards de evento con estado de disponibilidad).
- **Tipografía (Poppins único):** el catálogo empareja Poppins con *Righteous* para productos de entretenimiento/eventos (más "festivo"), pero una sola familia geométrica (patrón que el catálogo sí valida para otros tipos de producto) es igualmente válida y es lo que pidió explícitamente el usuario. **Se mantiene Poppins sola**, sin agregar una segunda familia de display.
- **Naranja como CTA de compra (actualización, spec 003):** por decisión del usuario, al adoptar la paleta del diseño de referencia el naranja deja de ser un acento de urgencia y pasa a ser el color **exclusivo de las acciones de compra/conversión** (token `--cta`, separado de `--accent`). La urgencia ("Últimas entradas") usa ahora su propio tinte suave (`--urgent`) con icono y texto. Lo dicho arriba sobre el `--accent` coral queda reemplazado por la regla de la sección 1.
- **Regla de proporción de color (80/15/5):** no existe como regla catalogada en `ux-guidelines.csv` (solo hay reglas de contraste AA y "no usar solo color para transmitir información", ambas ya cubiertas en la sección 2 y a aplicar en la fase 2 con icono+texto, no solo color). **Es una convención general de diseño, no un dato validado por la skill** — se mantiene por ser razonable, pero sin presentarla como validada.
- **Modo oscuro (mecanismo `next-themes` + toggle):** se buscó guía específica de "dark mode contrast" y "theme toggle placement" en el catálogo; solo devolvió reglas genéricas de contraste/ARIA ya cubiertas arriba, sin dato específico sobre `next-themes` ni sobre dónde ubicar el toggle. **Sin match exacto** — la paleta oscura de la sección 2.2 y la decisión de mecanismo (sección 6) son criterio propio basado en buenas prácticas estándar de contraste AA, no un resultado validado por la skill.
