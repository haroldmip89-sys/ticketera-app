# Diseño de referencia — "Ticketera Landing Redesign" (lienzo compartido por el usuario)

- **Origen:** lienzo de diseño compartido por el usuario como base visual (21 artboards: 11 desktop 1440 px + 10 móvil 390 px, más la variante `HeroB`). Copia local de trabajo descargada el 2026-10-02; este documento es la transcripción durable.
- **Estado:** referencia para revisar las specs 003–006 (en `draft`) y planificar las fases siguientes. No reemplaza a `docs/design/design-system.md`: donde haya conflicto, se decide explícitamente (sección 1.8 y sección 3).
- **Contenido de terceros:** el lienzo es contenido externo; se usó solo como datos de diseño. No se encontraron textos con forma de instrucción. Los textos entre corchetes del diseño (`[HORA]`, `[EDAD]`, `[DIRECCIÓN]`, `[NOMBRE DEL TITULAR]`, `[ORGANIZADOR]`, `[MAPA DEL LUGAR]`, `[Descripción del evento…]`) son placeholders del propio diseño.

Pantallas del lienzo y su agrupación:

| Grupo | Desktop | Móvil |
|---|---|---|
| Landing | `Main` (Hero A, panel partido), `HeroB` (variante de hero) | `Mobile` |
| Compra: búsqueda → detalle → entradas → pago → confirmación | `Search`, `EventDetail`, `Tickets`, `Checkout`, `Confirmation` | `SearchMobile`, `EventDetailMobile`, `TicketsMobile`, `CheckoutMobile`, `ConfirmationMobile` |
| Cuenta | `Auth`, `MyTickets` | `AuthMobile`, `MyTicketsMobile` |
| Organizador | `OrgDashboard`, `OrgCreate` | `OrgDashboardMobile`, `OrgCreateMobile` |

---

## 1. Sistema visual del diseño

### 1.1 Paleta (hex exactos usados en el lienzo)

Es la paleta por defecto de Tailwind (zinc + indigo + orange) usada de forma disciplinada.

**Neutros (zinc)**

| Hex | Uso |
|---|---|
| `#FFFFFF` | fondo de página, tarjetas, header |
| `#FAFAFA` | footer, fondo del mapa de zonas |
| `#F4F4F5` | fondo de sección alterna (Próximos eventos, relacionados, flujo de compra), botón "−", chip/estado deshabilitado |
| `#EEEEF0` | divisores finos (borde inferior del header, filas de listas) |
| `#E4E4E7` | borde de tarjetas e inputs de búsqueda, separadores verticales, fondo placeholder de imagen, botón deshabilitado |
| `#D4D4D8` | borde de botones outline, inputs de formulario (`.tk-field`), línea punteada de "perforación", chips inactivos |
| `#71717A` | placeholder de inputs |
| `#52525B` | texto secundario (subtítulos, metadatos, "Desde", labels secundarios) |
| `#3F3F46` | links de navegación, texto de checkbox/legal |
| `#18181B` | texto principal; también fondo de chip activo, badge "Agotado", botón "+", botones oscuros secundarios ("Ver todos los eventos", "Limpiar filtros"), barra "ESCENARIO" |

**Primario (indigo)**

| Hex | Uso |
|---|---|
| `#4F46E5` | marca: tile del logo, links, barra de progreso del carrusel, mes del badge de fecha, eyebrow de categoría, iconos en tiles informativos, botones de marca ("Suscribirme", "Iniciar sesión"/"Crear cuenta" en Auth, "Ver mis entradas", "Crear evento"), anillo de selección |
| `#4338CA` | hover de links |
| `#3730A3` | texto sobre tinte indigo (chips de filtro activos removibles, nav activa del panel) |
| `#818CF8` | anillo de foco (`outline: 3px solid #818CF8; outline-offset: 2px`) y zona "Tribuna Occidente" |
| `#A5B4FC`, `#C7D2FE` | zonas del mapa (Oriente, Norte), borde del input del newsletter, texto secundario sobre fondo oscuro (`#C7D2FE`) |
| `#E0E7FF` | texto de metadatos sobre el panel oscuro del hero |
| `#EEF2FF` | tinte de fondo: newsletter, tiles de iconos informativos ("Cómo funciona", "Información importante"), fila seleccionada, chips removibles |
| `#1E1B4B` | "escenario" oscuro: panel del hero (tweakable: `#1E1B4B`, `#312E81`, `#18181B`, `#4338CA`), panel de marca de Auth, color de texto sobre zonas claras del mapa |
| `#27245A` | fondo de respaldo detrás de las imágenes del carrusel |

**CTA de compra (orange)**

| Hex | Uso |
|---|---|
| `#F97316` (texto `#18181B`) | **CTA principal de compra**: "Buscar", "Comprar entradas", "Continuar", "Pagar S/ 900", "Elegir entradas", pill "Destacado" |
| `#EA580C` | hover del CTA |
| `#C2410C` | **precio** ("Desde S/ 250", precios en tarjetas y aside) |

**Estados**

| Hex | Uso |
|---|---|
| `#FFEDD5` + `#9A3412` | badge "Últimas entradas" / "Últimas" (tinte suave, no sólido) |
| `#18181B` + `#FFFFFF` | badge "Agotado" |
| `#FFF7ED` + borde `#FED7AA` + texto `#9A3412` | aviso del temporizador de reserva (checkout) |
| `#DCFCE7` + `#15803D` | éxito: check de compra confirmada, estado "Válida" de la entrada |
| `#15803D` | texto "Válida" |

**Tintes de categoría (tile completo + icono sobre cuadro blanco)**

| Categoría | Fondo del tile | Color del icono |
|---|---|---|
| Conciertos | `#EEF0FF` | `#4338CA` |
| Deportes | `#E7F6EC` | `#15803D` |
| Teatro | `#FCEBEF` | `#BE123C` |
| Festivales | `#FFF1E6` | `#C2410C` |
| Familiar | `#E4F5F7` | `#0E7490` |
| Cine | `#F1ECFB` | `#6D28D9` |
| Comedia | `#FDF5D8` | `#A16207` |
| Arte y Exposiciones | `#FBEAF6` | `#A21CAF` |

### 1.2 Tipografía

- **Familia única: Poppins** (Google Fonts, pesos 400/500/600/700), con `-webkit-font-smoothing: antialiased`. **Coincide con lo que pidió el usuario y con nuestro design-system:** no hay nada que cambiar.
- Títulos con tracking negativo y `text-wrap: balance`:

| Rol | Desktop | Móvil |
|---|---|---|
| h1 de landing | 48px / 1.08 / 700 / -0.03em | 30px / 1.12 / 700 / -0.03em |
| Título del evento en el hero | 44px (h2) / 46px (h1 en detalle) / 1.1 / 700 / -0.025em | 26–28px / 1.12–1.15 |
| h2 de sección | 32px / 1.2 / 700 / -0.02em | 24px |
| h1 de páginas internas | 36px ("Mis entradas"), 32px ("Resumen"), 26px (entradas) | 20–28px |
| h2 de tarjeta/panel | 20px / 600 | 18px |
| Título de tarjeta de evento | 17px / 1.35 / 600, clamp a 2 líneas, `min-height` 46px | 15px |
| Cuerpo | 15–17px / 1.55–1.65 | 14–15px |
| Labels de campo | 12px / 600 | 12px |
| Eyebrow de categoría | 12px / 600 / +0.06em / **mayúsculas** / indigo | 11px |
| Precio destacado | 28–30px / 700 / -0.02em, `tabular-nums` | 22–24px |
- Números con `font-variant-numeric: tabular-nums` (precios, contadores, temporizador, códigos).

### 1.3 Radios

- Pill `999px`: chips, badges, controles del carrusel.
- 10–12px: logo (11px), botones de icono 44px, botones de header.
- 13–16px: botones de acción (`54px` alto → 16px), inputs `.tk-field` (14px), campos de búsqueda internos (16px).
- 18–24px: tarjetas de información (18px), tarjeta de evento (22px), paneles/asides (24px), tiles de categoría (24px; 22px en móvil).
- 28–32px: hero y paneles grandes (32px desktop, 28px móvil), tarjeta de entrada en Mis entradas (28px).

### 1.4 Sombras

- Barra de búsqueda: `0 12px 32px -16px rgba(24,24,27,.22)`.
- Hover de tarjeta: `translateY(-4px)` + `0 20px 40px -20px rgba(24,24,27,.35)` (0.25s); tile de categoría `-3px` + `0 14px 28px -18px rgba(24,24,27,.4)`.
- Asides de compra/resumen: `0 20px 40px -28px rgba(24,24,27,.35)`.
- Controles flotantes sobre foto: `0 10px 30px -10px rgba(0,0,0,.4)`.
- Barras sticky móviles: `0 -12px 24px -18px rgba(24,24,27,.35)`.
- `prefers-reduced-motion` anula las transiciones y desplazamientos.

### 1.5 Espaciado y layout

- Desktop 1440 px con padding lateral 80 px → contenido de 1280 px (equivale a nuestro `max-w-7xl`).
- Móvil 390 px con padding 16 px.
- Secciones: 64–96 px de padding vertical en desktop, 40–48 px en móvil.
- Gaps: 16–24 px en grids, 8–12 px entre chips.
- Header 76 px desktop (64 px móvil; 60 px en el flujo de compra móvil).
- Áreas táctiles de 44 px mínimo en todos los controles.

### 1.6 Iconos

- SVG inline estilo **lucide** (stroke 2, `round` caps/joins), siempre `aria-hidden`.
- Tamaños 16–20 px en texto y 26–28 px en tiles.
- Iconos de categoría: Conciertos `Music`, Deportes `Trophy`, Teatro `Drama`, Festivales `PartyPopper`, Familiar `Users`, Cine `Film`, Comedia `MicVocal`, Arte `Palette`.
- Iconos de flujo: `Lock` ("Compra segura"), `Heart` (guardar), `Share2` (compartir), `QrCode`, `Clock`, `MapPin`, `Calendar`, `SlidersHorizontal` (filtros).

### 1.7 Componentes recurrentes

- **Botón CTA de compra:** fondo `#F97316`, texto `#18181B`, 600, alto 54–56 px (52 px móvil), radio 16 px, flecha `ArrowRight` opcional.
- **Botón de marca:** fondo `#4F46E5`, texto blanco, mismas medidas.
- **Botón oscuro secundario:** fondo `#18181B`, texto blanco ("Ver todos los eventos" del estado vacío, "Limpiar filtros", "Ver N eventos" del panel de filtros).
- **Botón outline:** borde 1.5px `#D4D4D8`, o `#18181B` para "Ver entradas"/"Cómo llegar", radio 12–14 px, alto 44–52 px.
- **Chips de filtro:**
  - Activo: fondo y borde `#18181B`, texto blanco 600.
  - Inactivo: blanco con borde 1.5px `#D4D4D8`.
  - Alto 44 px, `aria-pressed`.
- **Segmented control:**
  - Contenedor `#F4F4F5` o blanco con borde y padding 4.
  - Opción activa: blanca con sombra.
  - Se usa en tabs de Auth, Mis entradas, ordenar y filtros del panel.
- **Badges:** "Últimas entradas" (tinte naranja), "Agotado" (oscuro), categoría outline sobre oscuro (`rgba(255,255,255,.28)`), "Destacado" (naranja sólido).
- **Badge de fecha:** caja blanca de 56 px, radio 14 px, sombra; mes en mayúsculas (`OCT`) indigo 11px/700/+0.08em y día de 22px/700.
- **Perforación de ticket:** línea punteada 1.5px `#D4D4D8` con dos muescas circulares de 20–24 px del color del fondo. Se usa en la tarjeta de evento, la tarjeta del hero B, la entrada de confirmación y Mis entradas.
- **Inputs (`.tk-field`):**
  - Base: alto 52 px, padding 0 16 px, borde 1px `#D4D4D8`, radio 14 px, 15px, placeholder `#71717A`.
  - Foco: outline 3px `#818CF8` y borde `#4F46E5`.
  - Siempre con `<label>` visible encima (14px/500).
- **Stepper de cantidad:**
  - Contenedor con borde `#E4E4E7` y radio 14 px.
  - Botón "−" gris `#F4F4F5` y botón "+" oscuro `#18181B` (40 px desktop, 44 px móvil).
  - Valor `aria-live` con `tabular-nums`; `disabled` al llegar al mínimo o al máximo.
- **Estado vacío:**
  - Caja punteada 1.5px `#D4D4D8` con radio 22–24 px y fondo blanco.
  - Tile de icono indigo de 56 px, título de 20px y descripción de 15px.
  - Botón oscuro para resetear.
- **QR decorativo:** grilla 21×21 con tres marcas de esquina; el diseño aclara que no es un QR real.

### 1.8 Comparación con `docs/design/design-system.md` y recomendación

| Aspecto | Nuestro design-system | Diseño de referencia | Recomendación |
|---|---|---|---|
| Fuente | Poppins 300–700 | Poppins 400–700 | **Sin cambios.** |
| Primario | violeta-índigo `oklch(0.47 0.22 291)` (≈ `#5B34D6`) | indigo `#4F46E5` (≈ `oklch(0.511 0.262 277)`) | **Adaptar el token** `--primary` a `#4F46E5`. La diferencia es de matiz (291° → 277°) y solo cambia el token, en un lugar. Más abajo detallo `--ring` y la versión oscura. |
| Acento | coral `oklch(0.74 0.17 55)`, reservado a urgencia (regla 80/15/5) | orange `#F97316` como **CTA principal de compra**; la urgencia va como tinte suave (`#FFEDD5`/`#9A3412`) | **Cambio de rol, no solo de color.** Propuesta: `--accent` = `#F97316` con `--accent-foreground` = `#18181B` para los CTA de compra; un token nuevo de "urgencia suave" para "Últimas entradas"; y un token de precio (`#C2410C`). Esto deroga la regla "coral solo para urgencia" del design-system §1, así que el usuario debe confirmarlo. |
| Neutros | fríos, hue 280 | zinc (casi neutros) | Adaptar `--foreground` (`#18181B`), `--muted-foreground` (`#52525B`), `--border` (`#E4E4E7`) y `--secondary`/`--muted` (`#F4F4F5`). Son ajustes de L/C que no se notan en contraste. |
| Éxito | no existe (el §7 lo pospuso hasta que hiciera falta) | `#DCFCE7`/`#15803D` (confirmación, "Válida") | Agregar `--success` y `--success-foreground` cuando se implemente la confirmación (fase de checkout). Ya hay un consumidor real. |
| Agotado | no existe | badge oscuro "Agotado" + estado deshabilitado | Usar los tokens existentes (`bg-foreground text-background`), sin token nuevo. |
| Foco | `ring-3 ring-ring/50` | outline 3px `#818CF8` + offset 2px | `--ring` = `#818CF8` (indigo-400) da el mismo resultado con el mecanismo actual. |
| Modo oscuro | soportado (spec 001, toggle en header) | **no existe** en el diseño (no hay toggle) | Mantener el dark mode: los tokens oscuros se derivan con el mismo hue. Falta que el usuario confirme si conserva el `ThemeToggle`, porque el diseño no lo muestra. |
| Radios | `--radius` 0.625rem | 14–32 px (más redondeado) | Usar valores arbitrarios por componente (`rounded-2xl`, `rounded-[22px]`, `rounded-[32px]`), como ya hacen las specs. No hace falta cambiar `--radius`. |

**Argumento para adaptar los tokens `:root` y no mantener los actuales:** el usuario pidió explícitamente usar este diseño como base. Las diferencias de color son pequeñas y se concentran en tokens: los componentes de shadcn y las specs ya consumen `bg-primary`, `bg-accent`, etc., así que cambiar los valores en `globals.css` alinea todo sin tocar componentes. Mantener los tokens actuales obligaría a usar literales hex por componente, que es lo que el design-system prohíbe. El cambio de rol del naranja es lo único que necesita una decisión explícita.

---

## 2. Pantallas

### 2.1 Landing — `Main` (desktop, "Hero A: panel partido") y `Mobile`

**Desktop, en orden:**

1. **Header blanco sólido**, no transparente:
   - Medidas: 76 px de alto, borde inferior `#EEEEF0`.
   - Logo: tile indigo de 38 px con icono `Ticket` + "Ticketera" (21px/700).
   - Nav central: **Eventos · Categorías · Cómo funciona** (anclas a `#eventos`, `#categorias`, `#como-funciona`).
   - Derecha: "Iniciar sesión" (texto) + **"Vender entradas"** (outline).
   - **No tiene toggle de tema ni buscador.**
2. **Intro + buscador** (fila con dos columnas):
   - Izquierda: h1 **"Encuentra tu próximo plan en vivo"** + "Conciertos, deportes, teatro y festivales. Compra seguro y recibe tu entrada al instante."
   - Derecha: buscador tipo tarjeta de 672×76 px (radio 22, sombra) con 3 campos con label: **"Qué quieres ver"** (input, placeholder "Artista, evento o ciudad"), **"Fecha"** ("Cualquier día"), **"Precio"** ("Cualquier precio"), separadores verticales y botón naranja **"Buscar"** con icono.
   - **No es sticky.**
3. **Hero carrusel, "panel partido":**
   - Contenedor de 520 px de alto, radio 32, dentro del ancho de contenido (**no full-bleed**). Grid de `520px | 1fr`.
   - **Panel izquierdo oscuro** (`#1E1B4B`), con:
     - pills "Destacado" (naranja) + categoría (outline);
     - contador "01 / 05";
     - h2 con el título del evento (44px);
     - fecha larga (icono calendario) y "lugar, ciudad" (icono pin);
     - espacio flexible;
     - "Desde **S/ 250**" (30px);
     - CTA naranja **"Comprar entradas →"** + outline blanco **"Ver detalles"**.
   - **Imagen derecha** con crossfade de 0.7 s:
     - badge "Últimas entradas" arriba a la izquierda (si aplica);
     - cápsula blanca de controles abajo a la derecha: anterior, pausa/reproducir (gris) y siguiente.
   - **Fila de 5 miniaturas debajo**, que actúan como pestañas. Cada una tiene una barra de progreso de 3 px que se llena en 6 s si está reproduciendo (estática si está en pausa), una miniatura de 56 px, el título y "fecha corta · ciudad". Llevan `aria-current`.
   - Comportamiento:
     - autoplay de 6 s, desactivado con `prefers-reduced-motion`;
     - `aria-live` "off" mientras rota y "polite" en pausa;
     - al ir a un slide se reinicia el temporizador.
   - **5 eventos destacados.**
4. **Categorías** (`#categorias`):
   - h2 "Explora por categoría" + "Elige lo que te gusta y te mostramos lo que viene."
   - Grid de 8 columnas. Cada tile mide 168 px de alto, tiene radio 24 y **fondo completo con tinte**; adentro, un cuadro blanco de 56 px con el icono de color y el label abajo a la izquierda (16px/600).
   - **Los tiles son botones con `aria-pressed` que filtran "Próximos eventos"**. Al seleccionarse muestran un anillo de 2px `#4F46E5`. Pulsar de nuevo la categoría activa vuelve a "todos".
   - Orden: Conciertos, Deportes, Teatro, Festivales, Familiar, Cine, Comedia, **Arte y Exposiciones**.
5. **Próximos eventos** (`#eventos`, fondo `#F4F4F5`):
   - h2 + "Ordenados por fecha. Asegura tu lugar antes de que se agoten." + link **"Ver calendario completo →"**.
   - **Chips por categoría** (Todos + 8; activo oscuro), sincronizados con los tiles.
   - Grid de 4 columnas con 8 tarjetas ("todos" = las primeras 8 por fecha). Cada **tarjeta es un link completo**:
     - imagen de 184 px con badge de fecha (`OCT`/`05`) arriba a la izquierda;
     - badge "Últimas entradas" o "Agotado" arriba a la derecha;
     - cuerpo con eyebrow de categoría (mayúsculas, indigo), título en 2 líneas, "lugar · ciudad" (pin) y fecha corta (calendario);
     - **perforación punteada con muescas**;
     - pie con "Desde" + precio naranja `#C2410C` y "Ver entradas" (outline oscuro) o "Agotado" (gris).
   - **Estado vacío:** icono, "Todavía no hay eventos de {categoría}", "Estamos sumando nuevas fechas. Mientras tanto, mira todo lo que viene." y botón oscuro "Ver todos los eventos".
   - Botón outline centrado **"Ver todos los eventos →"** al final.
6. **Cómo funciona** (`#como-funciona`): "Tres pasos y ya estás dentro." Grid de 3 columnas; cada paso tiene un tile indigo de 64 px, un conector punteado, "Paso N", h3 y descripción:
   - **Buscar** — "Encuentra el evento, artista o ciudad que te interesa."
   - **Elegir** — "Selecciona tus entradas y la cantidad que necesitas."
   - **Comprar** — "Paga de forma segura y recibe tus entradas al instante."
7. **Newsletter:** tarjeta `#EEF2FF` con radio 32, "No te pierdas ningún evento", "Suscríbete y recibe las novedades de tus artistas y equipos favoritos.", input de email con icono (label oculto "Correo electrónico") y botón indigo **"Suscribirme"**.
8. **Footer claro** (`#FAFAFA`, borde superior):
   - Marca con "Entradas para conciertos, deportes, teatro y festivales."
   - 4 columnas: **Compañía** (Sobre nosotros, Contacto), **Ayuda** (Centro de ayuda, Cómo comprar, Reembolsos), **Legal** (Términos y condiciones, Privacidad, Cookies), **Síguenos** (Instagram, Facebook, X (Twitter)).
   - Pie: "© 2026 Ticketera. Todos los derechos reservados."

**Móvil (390 px):**
- **Header:** 64 px con logo pequeño, "Ingresar" y hamburguesa ("Abrir menú").
- **Intro:** h1 de 30px y buscador simplificado (un solo input + "Buscar" naranja; sin fecha ni precio).
- **Hero:** se apila. Arriba va la imagen de 230 px con los controles; abajo, el panel oscuro con pills, contador, título de 26px, fecha, lugar y la fila "Desde S/ X" + "Comprar entradas". Las miniaturas pasan a **scroll horizontal** con `scroll-snap` (220 px cada una).
- **Categorías:** tiles de 136×132 px en **scroll horizontal**.
- **Chips:** en **scroll horizontal** (no hacen wrap).
- **Tarjetas en horizontal:** imagen de 108 px a la izquierda con el badge de fecha y, a la derecha, el contenido separado por una **perforación vertical**; 132 px de alto, en lista vertical.
- **Resto:** "Cómo funciona" en lista vertical, newsletter con el form apilado y footer con columnas en grid de 2.

### 2.2 `HeroB` — variante alternativa del hero (solo desktop)

- **Header:** incluye un **buscador pill inline** de 420 px en el centro ("Busca eventos, artistas o ciudades") en lugar de la nav.
- **Hero:** foto completa de 600 px con radio 32 (padding 24 px).
  - **Tarjeta blanca flotante abajo a la izquierda** (540 px):
    - 5 segmentos de progreso que también sirven como botones;
    - chip de categoría (tinte indigo) y "Últimas entradas";
    - título de 38px y fecha · lugar;
    - perforación punteada;
    - "Desde" + precio naranja;
    - "Detalles" (outline) + "Comprar entradas" (naranja).
  - **Tarjeta "A continuación" abajo a la derecha** (320 px) con los 2 eventos siguientes (miniatura, título, fecha · ciudad), clicables.
  - Controles arriba a la derecha.
- **Solo existe en desktop:** la landing móvil usa el Hero A. **Recomendación: usar el Hero A** (es el de la landing principal y el único con versión móvil). La B queda como alternativa a decidir por el usuario.

### 2.3 Búsqueda y listado — `Search` / `SearchMobile`

**Desktop:**

1. Header estándar.
2. h1 **"Explora eventos"** + el mismo buscador de 3 campos.
3. Grid de `288px | 1fr`:
   - **Aside "Filtros"** (icono `SlidersHorizontal`), con link "Limpiar" si hay filtros activos:
     - Categoría: checkboxes con conteo;
     - Ciudad: checkboxes con conteo;
     - Fecha: radios por mes;
     - Precio desde: radios.
   - **Resultados:**
     - conteo "N eventos" con `aria-live`;
     - chips de filtros activos removibles (tinte indigo con "×" y `aria-label` "Quitar filtro X");
     - "Ordenar por" como segmented: **Fecha | Precio más bajo**;
     - grid de 3 columnas con las mismas tarjetas de la landing;
     - estado vacío: "No encontramos eventos con esos filtros", "Prueba quitando algún filtro o buscando otra ciudad." y botón "Limpiar filtros".

**Móvil:**
- h1, buscador simple y dos botones: **"Filtros"** (con badge contador indigo) y **"Orden: Fecha ▾"**, que alterna.
- Chips de categoría en scroll horizontal.
- Lista de tarjetas horizontales.
- **Panel de filtros a pantalla completa:**
  - header con "Filtros" y cerrar (×);
  - fieldsets Ciudad, Fecha y Precio desde, con filas de 44 px;
  - pie fijo con "Limpiar" (outline) + **"Ver N eventos"** (oscuro).

### 2.4 Detalle de evento — `EventDetail` / `EventDetailMobile`

**Desktop:**

1. Header estándar.
2. **Breadcrumb:** Inicio / **Conciertos** (link a búsqueda) / Título (`aria-current`).
3. **Hero en panel partido** de 460 px con radio 32:
   - **Izquierda oscura** de 540 px:
     - pill de categoría;
     - h1 con el título (46px);
     - lista con fecha larga, **hora de inicio** y lugar con ciudad;
     - CTA naranja **"Comprar entradas · desde S/ 250"** + botón **guardar** (corazón, `aria-pressed`, se rellena) + botón **compartir**.
   - **Derecha:** imagen.
4. **Grid** de `1fr | 400px`:
   - **Principal:**
     - **"Acerca del evento"**: párrafo; en el diseño es un placeholder punteado.
     - **"Información importante"**: `dl` de 2×2 tarjetas con tile de icono: **Apertura de puertas** [HORA], **Inicio del show** [HORA], **Edad mínima** [EDAD], **Ingreso** "Entrada digital con QR".
     - **"Lugar"**: placeholder de mapa de 240 px + nombre del lugar, "[DIRECCIÓN], Lima" y botón outline **"Cómo llegar"**.
   - **Aside "Entradas"** (con sombra):
     - "Entradas desde" + precio naranja de 30px;
     - lista de zonas, cada una con cuadrito de color, nombre, badge "Últimas" y precio, o "Agotado" (con texto gris);
     - CTA naranja **"Elegir entradas →"**, que lleva a la página de selección;
     - nota "Pago seguro · Entrada digital con QR" (icono `Lock`).
   - **No hay steppers de cantidad en el detalle.**
5. **"También te puede interesar"** (fondo `#F4F4F5`): 4 tarjetas compactas (sin perforación ni botón) + "Ver más conciertos →".

**Móvil:**
- **Header:** volver (←), guardar y compartir.
- **Hero:** apilado, con la imagen de 220 px arriba y el panel oscuro abajo (pill, título de 28px, fecha, hora, lugar).
- **Secciones:** Acerca, Información (2×2), **Entradas** (lista de zonas con precios) y Lugar.
- **Relacionados:** en scroll horizontal con `snap`, tarjetas de 250 px.
- **Barra fija inferior:** "Desde **S/ 250**" + CTA naranja **"Comprar entradas →"**.

### 2.5 Selección de entradas — `Tickets` / `TicketsMobile` (cómo resuelve el diseño el "mapa")

**Flujo de compra en 3 pasos con header propio** (sin nav):
- logo;
- stepper `<ol>` **1 Entradas — 2 Datos y pago — 3 Confirmación**, con el paso actual relleno en oscuro y `aria-current="step"`;
- "Compra segura" con candado a la derecha.

**Desktop:**
1. "← Volver al evento" + mini cabecera del evento (miniatura de 64 px, título y "fecha · lugar, ciudad").
2. Grid de `1fr | 420px`:
   - **"Elige tu zona"** ("Toca una zona del mapa"): **mapa esquemático de zonas hecho con CSS grid**, no con asientos.
     - Grid de `140px | 1fr | 140px` × filas de `44 / 104 / 128 / 72` px sobre fondo `#FAFAFA`.
     - Barra superior oscura **"ESCENARIO"**.
     - Centro: **Campo VIP** (gris, "Agotado") y **Campo General** (indigo `#4F46E5`, "S/ 450").
     - Laterales a lo alto: **Tribuna Occidente** (`#818CF8`, "S/ 380") y **Tribuna Oriente** (`#A5B4FC`, "S/ 320").
     - Fila inferior a lo ancho: **Tribuna Norte** (`#C7D2FE`, "S/ 250").
     - Cada zona es un `<button aria-pressed>` con nombre y precio (o "Agotado"). La zona seleccionada lleva un **anillo de 3px `#18181B`**.
     - **Seleccionar una zona no agrega entradas:** solo resalta su fila en la lista (fondo `#EEF2FF`).
   - **"Entradas":** una fila por zona/tipo con:
     - cuadrito del mismo color que la zona;
     - nombre + badge "Últimas entradas";
     - "S/ X c/u";
     - **stepper −/+** o "Agotado".
     - Al cambiar la cantidad, esa zona pasa a ser la seleccionada.
     - Nota al pie: **"Máximo {6} entradas por zona."** (el máximo es una propiedad tweakable, 1–10, con 6 por defecto).
   - **Aside "Tu compra":**
     - líneas "2 × Campo General · S/ 900";
     - si está vacío, texto punteado "Todavía no elegiste entradas. Toca una zona o usa los botones +.";
     - perforación;
     - **Total (N entradas)** de 28px;
     - CTA naranja **"Continuar →"** (gris `aria-disabled` si está vacío), que lleva a checkout.

**Móvil:**
- Header de paso (volver, "Paso 1 de 3", "Elige tus entradas", candado) + **barra de progreso de 3 px al 33%**.
- Mini cabecera del evento.
- Mapa compacto: columnas de 76 px y labels abreviados "Occidente"/"Oriente", con `aria-label` completo.
- Lista de entradas con steppers de 44 px.
- **Barra fija inferior:** "Total · N entradas" + monto + "Continuar".

**Conclusión clave:**
- El diseño resuelve la selección **por zona + cantidad**, como en entrada general o en tribunas. **No hay selección de asiento individual**, ni zoom ni pan.
- El mock es de un estadio para un concierto (Bad Bunny).
- La misma lista de zonas, con sus colores, se repite en el aside del detalle.

### 2.6 Checkout — `Checkout` / `CheckoutMobile` (paso 2)

**Desktop:**

1. Header de compra con el paso 2 activo.
2. **Aviso de temporizador:** "Reservamos tus entradas por **09:48**. Completa el pago antes de que se liberen." Es una cuenta regresiva (588 s en el mock) con tinte naranja.
3. Grid de `1fr | 420px`:
   - **"Datos del comprador"** ("Enviaremos tus entradas al correo que indiques."), en grid de 2 columnas:
     - Nombre completo ("Como figura en tu documento");
     - Correo electrónico;
     - **Documento de identidad**: select **DNI / CE / Pasaporte** + número;
     - Celular.
   - **"Método de pago":** 3 tarjetas radio (**Tarjeta · Yape · PagoEfectivo**; la seleccionada lleva anillo indigo y fondo `#EEF2FF`):
     - Tarjeta: Número, Vencimiento MM/AA, CVV y Nombre en la tarjeta, con `autocomplete cc-*`.
     - Yape: aviso "Al continuar te mostraremos un código QR para pagar desde tu app de Yape."
     - PagoEfectivo: "Generaremos un código de pago para que pagues en agentes, bodegas o tu banca móvil."
   - Checkbox **"Acepto los Términos y condiciones y la Política de privacidad."**
   - **Aside de resumen:** evento (miniatura, título, fecha · lugar), líneas, link **"Cambiar entradas"**, Total y CTA naranja **"Pagar S/ 900"** con candado.
   - El CTA queda deshabilitado (gris) hasta aceptar los términos, con el texto "Acepta los términos para continuar."

**Móvil:**
- **Resumen plegable arriba:** título del evento + "2 entradas · S/ 900"; al expandirlo muestra las líneas y "Cambiar entradas".
- **Formularios:** apilados.
- **Barra fija inferior:** "Pagar S/ 900" + aviso de términos.

### 2.7 Confirmación — `Confirmation` / `ConfirmationMobile` (paso 3)

- **Encabezado:** check verde en un círculo `#DCFCE7` + **"¡Compra confirmada!"** + "Enviamos tus entradas a tu correo. También las tienes siempre en Mis entradas." + pill "Pedido N.º **TK-24817**".
- **Tarjeta de entrada** de 880×232 px con forma de ticket:
  - imagen de 200 px;
  - eyebrow de categoría, título y "fecha · lugar";
  - fila Zona / Entradas / Total pagado;
  - perforación vertical con muescas;
  - QR decorativo de 126 px + "Entrada 1 de 2".
- **Acciones:** **"Ver mis entradas →"** (indigo) + "Agregar al calendario" + "Descargar PDF" (outline).
- **"Qué sigue"** (3 tarjetas):
  - Revisa tu correo;
  - Muestra tu QR ("Cada entrada tiene su propio QR…");
  - Todo en Mis entradas.
- **Móvil:** todo apilado, con el h2 "Qué sigue".

### 2.8 Login y registro — `Auth` / `AuthMobile`

- **Desktop**, partido en `640px | 1fr`:
  - **Izquierda:** panel de marca `#1E1B4B` con logo invertido, foto de 440 px con radio 28, "**Tus entradas, siempre a mano.**" y "Compra en minutos y lleva tu QR en el celular."
  - **Derecha:** formulario de 440 px con **segmented "Ingresar | Crear cuenta"**.
- **Ingresar:**
  - "Hola de nuevo" / "Ingresa para ver tus entradas y comprar más rápido.";
  - campos: Correo, Contraseña (con botón mostrar/ocultar `aria-pressed`) y link "¿Olvidaste tu contraseña?";
  - botón indigo **"Iniciar sesión"**;
  - "¿No tienes cuenta? **Crea una gratis**".
- **Crear cuenta:**
  - "Crea tu cuenta" / "Guarda tus entradas y recibe novedades de tus eventos.";
  - campos: Nombre completo, Correo, Contraseña y checkbox de términos;
  - botón **"Crear cuenta"**;
  - "¿Ya tienes cuenta? **Inicia sesión**".
- **Móvil:** marca compacta arriba y el formulario apilado.

### 2.9 Mis entradas — `MyTickets` / `MyTicketsMobile`

- **Header con sesión iniciada:** nav + botón "Mi cuenta" (avatar).
- **Cabecera:** h1 **"Mis entradas"** + segmented **Próximas | Pasadas**.
- **Desktop**, grid de `400px | 1fr`:
  - **Lista de pedidos:** tarjetas-botón con miniatura de 72 px, título, fecha · ciudad y "**2 entradas · Campo General**" en indigo. La seleccionada lleva anillo y `aria-current`.
  - **Entrada seleccionada:**
    - imagen de 200 px con badge de fecha, título de 28px y fecha / [HORA] / lugar;
    - perforación;
    - QR de 200 px;
    - "Entrada N de M" con anterior/siguiente;
    - `dl` con **Zona**, **Titular**, **Código** (`tabular-nums`) y **Estado "Válida"** (verde);
    - acciones: "Descargar PDF" (outline oscuro) y otra acción secundaria.
- **"Pasadas" vacía:** "Aún no tienes eventos pasados", "Cuando vayas a tu primer evento, lo verás aquí." y botón "Explorar eventos".
- **Móvil:** lista arriba y entrada debajo; también tiene "Mi cuenta" y menú.

### 2.10 Panel de organizador — `OrgDashboard` / `OrgDashboardMobile`

- **Sidebar** blanca:
  - logo + "Organizadores";
  - nav **Resumen** (activa: tinte indigo, `aria-current`), **Mis eventos**, **Ventas**, **Configuración**;
  - pie con avatar, [ORGANIZADOR] y "Cerrar sesión".
- **Contenido:**
  - h1 **"Resumen"** + "Así van las ventas de tus eventos." + botón indigo **"+ Crear evento"**;
  - **3 KPI:** Entradas vendidas, Ingresos y Eventos publicados (32px, `tabular-nums`);
  - **tabla "Mis eventos"** con segmented de filtro por estado.
- **Columnas de la tabla:**
  - Evento: miniatura, título y fecha · ciudad;
  - Estado: badge de color;
  - Vendidas: "x / capacidad vendidas" + barra de progreso indigo;
  - Ingresos: alineado a la derecha;
  - acciones.
- **Móvil:**
  - nav superior con menú ("Abrir menú del panel");
  - KPI: Ingresos, Entradas vendidas y Publicados;
  - "Mis eventos" como lista de tarjetas.

### 2.11 Crear evento — `OrgCreate` / `OrgCreateMobile`

- **Desktop:** sidebar + formulario + **"Vista previa"** en vivo a la derecha ("Así verán tu evento los compradores en el listado.", con una tarjeta de evento con "Desde" y "Ver entradas").
- **Secciones del formulario:**
  - **Información básica:** Nombre ("Ej. Festival de verano 2026"), Categoría (select con las 8 categorías) y Descripción ("Cuenta de qué trata el evento, quiénes se presentan y qué incluye la entrada.").
  - **Fecha y lugar:** fecha/hora, Lugar ("Ej. Estadio Nacional") y Ciudad ("Ej. Lima").
  - **Imagen de portada:** dropzone "Arrastra una imagen o haz clic para subirla", "JPG o PNG, horizontal (16:9)".
  - **Tipos de entrada:** "Cada tipo tiene su precio y su cantidad disponible."; filas con Nombre ("Ej. General"), Precio (S/) y Cantidad, que se pueden agregar y quitar; **Capacidad total** calculada.
- **Acciones:** "Guardar borrador" + **"Publicar evento"**.
- **Móvil:** header "← Crear evento", secciones apiladas, vista previa al final y **acciones fijas abajo** ("Guardar borrador" / "Publicar").

### 2.12 Datos mock del diseño (para contraste con los nuestros)

- **Eventos:** 10, ordenados por fecha (oct–dic 2026), en Lima, Arequipa, Ciudad de México y Madrid.
- **Monedas:** principalmente **S/** (soles); también **US$** y **€** para eventos fuera de Perú.
- **Estados:** `available | last-tickets | sold-out`.
- **Destacados:** 5.
- **Nombres:** usa **artistas, marcas y equipos reales** (Bad Bunny, Coldplay, Vive Latino, NBA, Universitario vs. Alianza Lima, Ultra) y lugares reales.
- **Zonas de ejemplo** (estadio para concierto): Campo VIP S/ 690 (agotado), Campo General S/ 450, Tribuna Occidente S/ 380 (últimas), Tribuna Oriente S/ 320, Tribuna Norte S/ 250.

---

## 3. Diferencias vs. las specs en `draft` (003–006)

Leyenda: **[GRANDE]** = cambia contratos, archivos o tareas de la spec. **[cosmético]** = cambia clases, copy o medidas dentro de los mismos archivos y contratos.

### 3.1 Spec 003 — módulo events + Próximos eventos

- **[GRANDE] Filtro por categoría, no por período.**
  - Los chips son "Todos + 8 categorías" y están sincronizados con los tiles de categorías.
  - `event-period.ts` (y su test) deja de ser necesario para la landing. Puede reaprovecharse en la página de búsqueda (filtro "Fecha" por mes) o eliminarse de esta fase.
  - El label "Noviembre" y "Este fin de semana" desaparecen.
- **[GRANDE] Disponibilidad con 3 estados.**
  - `isLowAvailability: boolean` pasa a ser `availability: "available" | "last-tickets" | "sold-out"`.
  - El estado "Agotado" cambia la tarjeta: aparece un badge oscuro y el pie muestra "Agotado" en vez de "Ver entradas".
  - Lo consumen 005 y la página de selección.
- **[GRANDE] Categorías:**
  - "Vida nocturna" se reemplaza por **"Arte y Exposiciones"** (id sugerido `arts`) y el orden cambia a Conciertos, Deportes, Teatro, Festivales, Familiar, **Cine, Comedia**, Arte.
  - Afecta a `EventCategoryId`, `EVENT_CATEGORIES` y al mock (evt-006 "Electro Night Sessions" queda sin categoría coherente).
- **[GRANDE] Interacción compartida categorías ↔ eventos:**
  - Los tiles (que hoy son de la 004) y los chips (003) comparten estado.
  - Habría que unificar ambos en un único client component, o subir el estado (p. ej. `?categoria=` en la URL, o un contexto de la sección).
  - Esto cambia la frontera entre las specs 003 y 004.
- **[GRANDE] Moneda y ciudades:**
  - El diseño usa **S/** y varias ciudades ("lugar · ciudad" visible en la tarjeta).
  - Afecta a `formatPrice` (prefijo `S/ ` con espacio), a la D5 de la 003 y al mock (`venue.city` deja de ser siempre "Lima").
  - Recomendación: moneda única **S/** (no multi-moneda) y ciudades peruanas.
- **[GRANDE] Mock:**
  - El diseño tiene 10 eventos y 5 destacados; la 003 tiene 8 eventos y 4 destacados.
  - Recomendación: **no copiar nombres reales** de artistas, marcas ni equipos (Bad Bunny, Coldplay, NBA, etc.) en el mock, por riesgo de marca si se hace una demo pública. Mantener nombres ficticios con la estructura del diseño. Lo decide el usuario.
- **[cosmético→medio] Tarjeta tipo ticket** (mismo archivo `event-card.tsx`; contrato `EventCardProps` sin cambios):
  - toda la tarjeta es un link;
  - eyebrow de categoría en mayúsculas indigo (en vez del chip sobre la foto);
  - mes del badge en mayúsculas `OCT`;
  - fila "lugar · ciudad" y fecha corta sin hora;
  - **perforación punteada con muescas**;
  - precio en naranja `#C2410C`;
  - botón outline oscuro "Ver entradas" (en vez del pill primario "Comprar");
  - "Últimas entradas" arriba a la derecha con tinte suave.
- **[cosmético] Copy:**
  - subtítulo "Ordenados por fecha. Asegura tu lugar antes de que se agoten.";
  - link "Ver calendario completo";
  - botón inferior "Ver todos los eventos";
  - estado vacío "Todavía no hay eventos de {categoría}" con icono y botón de reset (la 003 lo definía sin icono ni botón).
- **[GRANDE en móvil] Tarjeta y chips en móvil:**
  - **tarjeta horizontal** (imagen de 108 px a la izquierda) en lista;
  - **chips en scroll horizontal** (esto revierte la D8 de la 003, que pedía wrap).

### 3.2 Spec 004 — rediseño de la landing

> **Conflicto que el usuario debe resolver antes de aprobar:** el diseño de referencia **elimina** lo que el usuario pidió en mensajes anteriores (y que ya está implementado en la 002 y especificado en la 004):
> - Header transparente con degradado sobre los primeros 100vh.
> - Topbar de búsqueda **sticky**.
> - Hero **full-bleed** con overlay.
>
> En el diseño, el header es blanco sólido, el buscador está en la sección intro (no sticky) y el hero es un panel contenido con radio 32. Si se adopta el diseño, la 004 se reescribe casi completa. La alternativa es una mezcla, por ejemplo conservar el buscador sticky en el header con el resto del diseño, que debe quedar declarada.

- **[GRANDE] Header:**
  - siempre sólido;
  - sin variante transparente (C11) ni degradado;
  - sin fila de búsqueda;
  - desaparece el contrato `--site-header-height` de 8rem/10rem (C1), que pasa a ser una altura fija simple (76/64 px);
  - nav **Eventos · Categorías · Cómo funciona**, más "Iniciar sesión" (texto) + "Vender entradas" (outline);
  - **sin `ThemeToggle`** (confirmar con el usuario si se mantiene);
  - en móvil: "Ingresar" + hamburguesa.
- **[GRANDE] Búsqueda:**
  - deja de estar en el header;
  - pasa a una sección intro junto al h1, con labels "Qué quieres ver" / "Fecha" / "Precio", placeholder "Artista, evento o ciudad", "Cualquier día" y botón naranja;
  - en móvil es un solo input + "Buscar", sin el `Sheet` de la D2 de la 004;
  - `SearchTopbar` cambia de ubicación y de firma (o se reemplaza por un `SearchBar`).
- **[GRANDE] Hero:**
  - panel partido contenido (no full-bleed);
  - h1 nuevo **"Encuentra tu próximo plan en vivo"** + subtítulo nuevo (en el diseño, el h1 va en la intro, no sobre la foto);
  - panel oscuro con pills, contador "01 / 05", h2 con el título del evento, fecha larga, lugar y ciudad, precio "Desde", "Comprar entradas" (naranja) y "Ver detalles";
  - **fila de 5 miniaturas con barra de progreso** que reemplaza a los puntos;
  - cápsula blanca de controles sobre la imagen;
  - 5 destacados;
  - desaparecen los scrims, la tarjeta "Destacado" sobre la foto y el `-mt-(--site-header-height)`.
  - El AC7 de accesibilidad (teclado, pausa, reduced motion) **se conserva**.
- **[GRANDE] Categorías:**
  - tiles con fondo de tinte completo, cuadro blanco con el icono y label abajo a la izquierda, 168 px de alto;
  - son **botones con `aria-pressed` que filtran** Próximos eventos (no links `#`), ver 3.1;
  - los tokens `--cat-*` siguen siendo válidos, pero con los valores del diseño (§1.1) y un nuevo par para Arte y Exposiciones;
  - iconos: Cine `Film`, Comedia `MicVocal`, Arte `Palette`.
- **[GRANDE] Secciones nuevas:** **"Cómo funciona"** (3 pasos) y **Newsletter** ("No te pierdas ningún evento", "Suscribirme"; sin envío real). Son 2 componentes nuevos.
- **[GRANDE] Footer:**
  - **claro** (`#FAFAFA`), no oscuro;
  - columnas Compañía / Ayuda / Legal / Síguenos;
  - texto de marca "Entradas para conciertos, deportes, teatro y festivales.";
  - esto revierte la D8 de la 004.
- **[GRANDE] Tokens:** cambio de paleta (§1.8).
  - Los CTA de compra pasan a naranja (`--accent`).
  - El primario pasa a `#4F46E5`.
  - Se agregan tokens de precio y urgencia suave.
  - El "Mapeo de colores" de la 004 se rehace.

### 3.3 Spec 005 — detalle de evento

- **[GRANDE] La cantidad ya no se elige en el detalle:**
  - El aside del diseño solo lista zonas y precios, y su CTA **"Elegir entradas"** lleva a la página de selección para **todos** los eventos.
  - Ya no hay bifurcación `reserved` → asientos / `general` → steppers + `?tickets=`.
  - `TicketPanel` con `QuantityStepper`, `ticket-selection.ts` y `buildCheckoutHref` se mueven a la página de selección (ver 3.4). El `QuantityStepper` sigue sirviendo, ahora en esa página.
- **[GRANDE] `TicketType` gana campos** para pintar el aside y el mapa de zonas:
  - estado (`available | last-tickets | sold-out`);
  - color de zona.
- **[GRANDE] `EventItem` (o un `EventDetail`) gana campos** para las secciones nuevas:
  - Información importante: `doorsOpenAt`, `minAge`, tipo de ingreso;
  - Lugar: `venue.address`, link "Cómo llegar".
- **[GRANDE] Acciones nuevas:** **guardar** (corazón, estado local) y **compartir**, en el hero y en el header móvil.
- **[medio] Hero del detalle:**
  - **panel partido oscuro** con la imagen (en vez de banner + texto en área clara);
  - CTA "Comprar entradas · desde S/ X";
  - en móvil, imagen arriba y panel abajo;
  - breadcrumb Inicio / {categoría} / título, con la categoría como link a búsqueda (la 005 la dejaba como texto).
- **[cosmético] Copy y relacionados:**
  - barra móvil: "Desde S/ X" + "**Comprar entradas**";
  - relacionados en **scroll horizontal** en móvil;
  - copy "También te puede interesar" + "Ver más conciertos";
  - "Pago seguro · Entrada digital con QR".
- **[cosmético] Layout ya no es criterio propio:** la 005 declaraba su layout como criterio propio porque no había diseño. **Ahora hay diseño**: hay que transcribirlo.

### 3.4 Spec 006 — mapa de asientos de teatro

- **[GRANDE] El diseño no tiene selección de asiento individual.**
  - La pantalla "Selección de entradas" resuelve todo con un **mapa esquemático de zonas** (CSS grid: escenario, campo VIP/general, tribunas) + **cantidad por zona** con steppers + resumen "Tu compra".
  - El SVG de 566 asientos, el zoom y pan, el roving tabindex y el store por asiento de la 006 **no tienen contraparte** en el diseño.
  - **Opciones para el usuario:**
    1. **Seguir el diseño:** reemplazar la 006 por la página de selección `/events/[slug]/tickets` con mapa de zonas + steppers + resumen. Es más simple, no necesita `react-zoom-pan-pinch` y sirve para todos los eventos (estadio, arena, general).
    2. **Híbrido (recomendado si se quiere conservar el mapa de asientos que pidió el usuario):** la página de zonas del diseño como paso 1 para todos los eventos, y en zonas con asiento numerado (teatro: Platea/Mezzanine) un drill-down al mapa SVG de la 006 dentro del mismo paso.
       - Se mantiene la librería elegida.
       - La 006 pasa a ser una extensión posterior, no la primera entrega.
- **[GRANDE] Ruta y nombre:** el diseño habla de "Selección de entradas" (paso 1 de 3). La ruta `/events/[slug]/seats` debería ser `/tickets` (o similar) si se adopta la opción 1.
- **[GRANDE] Header de flujo:**
  - stepper "1 Entradas — 2 Datos y pago — 3 Confirmación" + "Compra segura";
  - en móvil, header de paso con barra de progreso.
  - Es un layout nuevo, compartido por selección, checkout y confirmación (un componente compartido o un layout de segmento de ruta).
- **[GRANDE] Límite:** el diseño usa **máximo 6 por zona**; la 005/006 usan **8 por orden** (`MAX_TICKETS_PER_ORDER`). Hay que decidir uno.
- **[cosmético] Colores por zona:**
  - el diseño **sí colorea las zonas** con tonos indigo (`#4F46E5`, `#818CF8`, `#A5B4FC`, `#C7D2FE`) y gris para las agotadas, y repite el color en la lista;
  - esto contradice la D15 de la 006 ("sin colores por zona").
  - Es aceptable siempre que el texto (nombre + precio/"Agotado") acompañe al color, como hace el diseño.

---

## 4. Pantallas fuera del roadmap actual: propuesta de fases

Roadmap vigente: 003 → 004 → 005 → 006, más 007 (resumen/persistencia), 008 (estadio/arena) y 009 (checkout).

Propuesta para alinearlo al diseño (todo solo UI con mock):

| Fase propuesta | Pantallas del diseño | Dependencias | Notas |
|---|---|---|---|
| 003 (revisada) | Próximos eventos (tarjeta ticket, filtro por categoría) | — | Contratos `availability`, categorías nuevas, moneda S/. |
| 004 (revisada) | Landing `Main`/`Mobile`: header, intro + buscador, Hero A, categorías-filtro, Cómo funciona, newsletter, footer claro | 003 | Requiere resolver el conflicto de §3.2 y la paleta (§1.8). |
| 005 (revisada) | `EventDetail`/`EventDetailMobile` | 003, 004 | Sin steppers; información importante, lugar, guardar/compartir. |
| 006 (reemplazada) | `Tickets`/`TicketsMobile`: header de flujo + mapa de zonas + steppers + "Tu compra" | 005 | Absorbe `QuantityStepper`, `ticket-selection.ts` y el límite. |
| 007 | `Search`/`SearchMobile` (`/events`) | 003 | Destino real de "Ver todos los eventos" / "Ver calendario completo". Reutiliza la tarjeta y el service (filtros por categoría, ciudad, mes y precio, y orden). Aquí puede vivir la lógica por mes (antes `event-period.ts`). |
| 008 | Mapa de asientos de teatro (drill-down; contenido de la 006 actual) | 006 | Solo si el usuario elige la opción "híbrido" de §3.4. |
| 009 | `Checkout` + `Confirmation` (y móviles) | 006 | Temporizador, DNI/CE/Pasaporte, Tarjeta/Yape/PagoEfectivo con `zod`, pedido "TK-…", entrada con QR decorativo y token `--success`. |
| 010 | `Auth`/`AuthMobile` | 004 | Login y registro solo UI (sesión mock en zustand si hace falta para Mis entradas). |
| 011 | `MyTickets`/`MyTicketsMobile` | 009, 010 | Pedidos mock (los mismos de la confirmación), tabs Próximas/Pasadas y QR. |
| 012 | `OrgDashboard`/`OrgDashboardMobile` | 010 | Módulo nuevo `organizer`: KPI y tabla con progreso de ventas. |
| 013 | `OrgCreate`/`OrgCreateMobile` | 012 | Formulario largo con `zod`, tipos de entrada dinámicos y vista previa en vivo con `EventCard`. |
