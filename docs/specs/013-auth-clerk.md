# 013 — Autenticación con Clerk: base, Ingresar (email y Google), rutas protegidas y header con sesión

- **Estado:** draft
- **Modo:** SDD
- **Módulo(s):**
  - Dependencia npm nueva: `@clerk/nextjs` **7.9.11** (fijada exacta, ver D2).
  - `src/proxy.ts` (nuevo, Next 16): sesión de Clerk y protección de rutas.
  - `src/app/layout.tsx`: `ClerkProvider`.
  - `src/lib/auth/` (nuevo): rutas de auth y validación de `redirect_url` (helpers puros).
  - `src/modules/auth` (módulo nuevo, singular por ser un concepto único): formulario de ingreso, botón de Google, verificación por código, callback SSO, shell visual de las páginas de auth, acciones de sesión del header.
  - `src/app/(auth)` (route group nuevo, sin header del sitio): `/sign-in` y `/sso-callback`.
  - `src/app/(site)/my-tickets` (placeholder protegido; la 016 lo reemplaza).

> **Actualización 2026-10-07 (archivos de entorno ya creados fuera del flujo SDD):**
> - Ya existen `.env.example` (versionado, sin valores, con Clerk, Stripe y Neon), `.env` (ignorado, variables vacías) y en `.gitignore` las líneas `!.env.example` y `.clerk/`. **P1 no los recrea ni los modifica:** solo verifica que estén. Las variables de Stripe, Neon y `CLERK_WEBHOOK_SIGNING_SECRET` no se usan en esta spec.
> - Donde esta spec y las 014–018 dicen `.env.local`, vale igual `.env` (Next carga ambos; `.env.local` tiene prioridad). AC3 y AC23 también aplican a `.env`: debe estar ignorado y fuera de `git status`.
> - Contexto de arquitectura: System Design §3.4 (variables) y §4.1.1 (login con Google).
  - `src/components/shared`: `SiteHeader` (sesión) y `BrandLogo` (variante invertida).
  - `src/components/ui/dropdown-menu.tsx` (shadcn, nuevo).
  - `src/modules/checkout/components/confirmation-not-found.tsx`: solo `MY_TICKETS_HREF` pasa a leer la constante compartida.
- **Depende de:** 001–012 en `done` (cumplido). Consume `Button`, `Input`, `Field*`, `Separator`, `Empty*`, `BrandLogo`, `ThemeToggle`, `focus-ring`, tokens `--stage*`, y el patrón de formularios de la 010 (`noValidate`, zod, foco al primer error).
- **Roadmap** (renumerado por esta spec):
  - **013 Auth base e Ingresar (esta)** · **014 Registro con verificación y recuperación de contraseña** · **015 Roles provisionales y alta de organizador** · 016 Mis entradas · 017 Panel de organizador · 018 Crear evento.
  - El pedido del usuario (login y registro reales con Clerk, desktop y móvil) no cabe en una sesión: son ~60 archivos en total. Se divide en 013–015 (ver D3). Las tres specs se redactan juntas y en `draft`: `docs/specs/014-auth-sign-up-reset.md` y `docs/specs/015-provisional-roles-organizer.md`.
  - La 012 anunciaba "013 Mis entradas". Pasa a ser la **016**. Las specs `done` no se editan.

## Objetivo

1. Clerk queda instalado y configurado (Core 3, `@clerk/nextjs` 7.9.11) con sesión real.
2. `/sign-in` permite ingresar con:
   - **email y contraseña**, incluida la verificación por código de dispositivo nuevo (Device Trust);
   - **Google** (OAuth), con su ruta de callback `/sso-callback`.
   La UI es propia y sigue el diseño `Auth`/`AuthMobile`, con errores en español y estados de carga.
3. `src/proxy.ts` exige sesión en `/my-tickets`, `/organizer/**` y `/events/[slug]/checkout`. Lleva a `/sign-in?redirect_url=…` y, tras ingresar, vuelve a la ruta original con su query (`tickets`/`seats`). A quien ya tiene sesión y entra a `/sign-in`, lo redirige.
4. El header muestra "Iniciar sesión"/"Ingresar" sin sesión. Con sesión muestra el botón "Mi cuenta" con menú: Mis entradas y Cerrar sesión.
5. `/my-tickets` existe como placeholder protegido, para que ningún link quede muerto.

Todo lo demás (eventos, entradas, pedidos) sigue mock. No hay base de datos. El proyecto queda en verde.

## Fuera de alcance

- **Registro** (`/sign-up`), verificación de email al registrarse, segmented "Ingresar | Crear cuenta", link "¿No tienes cuenta? Crea una gratis" y **recuperación de contraseña** (`/reset-password`): van en la **014**.
  - En 013 la página de ingreso **no** muestra el segmented ni esos links, para no dejar links muertos (D11).
  - Mientras tanto, una cuenta nueva se crea con "Continuar con Google": Clerk transfiere el ingreso a un registro automáticamente. También se puede crear desde el Dashboard (paso manual M3).
- **Roles** (`isOrganizer`), guards de servidor (`requireUser`, `requireOrganizer`), alta de organizador, `/organizer` y "Panel de organizador" en el menú: van en la **015**.
  - En 013, "Vender entradas" mantiene `href="#"`, igual que hoy.
  - `/organizer/**` ya queda protegido por el proxy (solo autenticación): sin página da 404 con sesión, igual que hoy sin sesión.
- Mis entradas real (016). "Ver mis entradas" de la confirmación conserva su mensaje mock de la 011/012 (la 016 lo conecta).
- Prellenar el checkout con nombre/email del usuario.
- Sincronizar usuarios con una base de datos (webhooks de Clerk, tabla `users`) y `src/lib/env.ts`: llegan con la base de datos (System Design §3.2, §4.1).
- Componentes prearmados de Clerk (`<SignIn/>`, `<UserButton/>`, etc.) y `localization` de Clerk: la UI es propia y los errores los traducimos nosotros (D10).
- MFA/2FA (`needs_second_factor`), passkeys, email links, teléfono y username: se muestra un mensaje si aparecen, pero no se implementan.
- Mensaje específico cuando el usuario cancela en la pantalla de Google: vuelve a `/sign-in` sin error (D9).
- Instancia de producción de Clerk y OAuth client propio de Google (ver M5).
- Cambios en `src/components/ui/**` salvo agregar `dropdown-menu` con la CLI.

## Precondiciones (bloqueantes)

- **M1 (usuario, antes de P1):** existe una aplicación de Clerk (instancia Development) y `.env.local` en la raíz tiene `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` (ver "Pasos manuales").
  - Sin claves, `npm run build` falla: fuera de desarrollo no hay modo keyless (ver D2).
  - Si P1 no encuentra las claves: hace los cambios de código, corre lint y test, y reporta `BLOCKED` (`origen: entorno`) solo para el build. No inventa claves ni corre `clerk init`.
- **Única dependencia npm nueva:** `@clerk/nextjs@7.9.11`, que trae `@clerk/react` 6.17.6, `@clerk/shared` 4.39.0 y `@clerk/backend` 3.23.0. Peer deps: `next ^16.1.0-0` y `react ~19.2.3`, compatibles con next 16.3.8 y react 19.2.8.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `@clerk/nextjs` | agregar (npm) | `package.json` | `npm install --save-exact @clerk/nextjs@7.9.11` (D2). |
| `ClerkProvider` | reutilizar (Clerk) | `src/app/layout.tsx` | Dentro de `<body>`, envolviendo al `ThemeProvider` existente (C5). |
| `clerkMiddleware` | reutilizar (Clerk) | `src/proxy.ts` (nuevo) | Next 16 renombró `middleware` → `proxy`. Con `src/`, el archivo va en `src/proxy.ts`, al nivel de `app` (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`). Corre en Node.js por defecto. No se usa `createRouteMatcher`: la lógica de rutas vive en helpers puros con tests (D4). |
| `useSignIn`, `useUser`, `useClerk`, `AuthenticateWithRedirectCallback` | reutilizar (Clerk) | `@clerk/nextjs` | **API Core 3 / signal** (D1). `useSignIn()` devuelve `{ signIn, errors, fetchStatus }`. |
| Rutas de auth y `redirect_url` seguro | crear | `src/lib/auth/auth-routes.ts` | No existe nada equivalente. Lo usan el proxy, las páginas de auth y el header: transversal, va a `src/lib/auth/` (System Design §3.2). |
| `MY_TICKETS_HREF` | extender (1 línea) | `src/modules/checkout/components/confirmation-not-found.tsx` | Hoy `"/my-tickets"` literal, con un comentario que dice que da 404. Pasa a `= MY_TICKETS_PATH` (DRY con el header) y se corrige el comentario. El nombre exportado no cambia. |
| `Button` | reutilizar | `src/components/ui/button.tsx` | Submit, Google, mostrar contraseña. `disabled` + `focusableWhenDisabled` para carga (patrón de la 012). |
| `Input` | reutilizar | `src/components/ui/input.tsx` | Mismas clases de campo que `checkout-fields.tsx` (`h-13 rounded-[14px] …`), en la constante `AUTH_INPUT_CLASS_NAME` (C9). |
| `Field`, `FieldLabel`, `FieldError`, `FieldSeparator` | reutilizar | `src/components/ui/field.tsx` | `FieldError` ya tiene `role="alert"`. `FieldSeparator` sirve para el "o" entre Google y el formulario. |
| `Separator` | reutilizar (indirecto) | `src/components/ui/separator.tsx` | Vía `FieldSeparator`. |
| `Empty*` | reutilizar | `src/components/ui/empty.tsx` | Placeholder de `/my-tickets` (mismo patrón que `ConfirmationNotFound`). |
| `DropdownMenu*` | agregar de shadcn | `src/components/ui/dropdown-menu.tsx` | **Verificado** con `npx shadcn@latest view dropdown-menu`: existe en `base-nova` sobre `@base-ui/react/menu` (Base UI 1.8.0 instalado). `npx shadcn@latest add dropdown-menu`. No se edita a mano. |
| `BrandLogo` | extender | `src/components/shared/brand-logo.tsx` | Prop nueva `tone?: "default" \| "inverted"` para el panel de marca oscuro (C10). Los usos actuales no cambian. |
| `SiteHeader` | extender | `src/components/shared/site-header.tsx` | Reemplaza los links "Iniciar sesión", "Vender entradas" (desktop) e "Ingresar" (móvil) por `HeaderSessionActions` (C11). |
| `SiteMobileMenu` | reutilizar (sin cambios) | `src/components/shared/site-mobile-menu.tsx` | Su "Vender entradas" lo cambia la 015. |
| `ThemeToggle` | reutilizar (sin cambios) | `src/components/shared/theme-toggle.tsx` | Sigue en el header. Las páginas de auth no lo muestran (D12). |
| `focus-ring`, tokens `--stage`, `--stage-foreground`, `--stage-subtle`, `--primary`, `--muted`, `--card`, `--input` | reutilizar | `src/app/globals.css` | El panel de marca `#1E1B4B` **es** `--stage`, y `#C7D2FE` es `--stage-subtle`. No hacen falta tokens nuevos. |
| Schemas del formulario de ingreso y del código | crear | `src/modules/auth/schemas/auth-form.schema.ts` | La 014 agrega aquí registro y reset. |
| Mapeo de errores de Clerk → español | crear | `src/modules/auth/utils/auth-errors.ts` | Puro, sin importar Clerk (duck typing). La 014 lo amplía. |
| Navegación tras `finalize()` | crear | `src/modules/auth/utils/finalize-navigation.ts` | Puro e inyectable. Lo reusa la 014 (registro y reset). |
| `PasswordInput`, `GoogleSignInButton`, `VerificationCodeForm`, `SignInForm`, `SsoCallbackView`, `AuthShell`, `HeaderSessionActions`, `UserMenu` | crear | `src/modules/auth/components/*` | No existen. Diseñados para que la 014 y la 015 los reutilicen (contratos en C7–C12). |
| Mensajes de email en zod | no se extrae | — | `checkout-form.schema.ts` usa los mismos dos textos de email. Repetir dos strings es más simple que extraer un helper con un solo consumidor más. Se extrae a `src/lib` si aparece un tercer formulario (KISS). |
| `input-otp` / `OTPField` | no se usa | — | Base UI 1.8 trae `OTPField`, pero el diseño no tiene pantalla de código. Un `Input` único con `autoComplete="one-time-code"` es accesible y suficiente (D13). |
| `@clerk/localizations` | no se usa | — | UI propia, ver D10. |

## Decisiones

### D1 — API de Clerk: Core 3 "signal" (`SignInFuture`), no la legacy

Verificado en los `.d.ts` de `@clerk/nextjs@7.9.11` (descargado al scratchpad, sin instalar en el proyecto):

- Core 3 eliminó `<SignedIn>`/`<SignedOut>`: renderizarlos lanza error. Se reemplazan por `<Show when="signed-in">`. Esta spec no los usa.
- `useSignIn()` de `@clerk/nextjs` devuelve `SignInSignalValue = { signIn: SignInFutureResource; errors: SignInErrors; fetchStatus: "idle" | "fetching" }`. La API anterior (`isLoaded`, `setActive`, `authenticateWithRedirect`) quedó en `@clerk/nextjs/legacy`: **prohibido usarla**.
- Métodos que se usan. Todos devuelven `Promise<{ error: ClerkError | null }>` (no lanzan por errores de API):
  - `signIn.password({ emailAddress, password })`;
  - `signIn.mfa.sendEmailCode()` y `signIn.mfa.verifyEmailCode({ code })` (Device Trust, D7);
  - `signIn.sso({ strategy: "oauth_google", redirectUrl, redirectCallbackUrl })`:
    - `redirectUrl` es el **destino final** tras completar (pasa a `actionCompleteRedirectUrl`);
    - `redirectCallbackUrl` es la **página de callback** a la que vuelve el proveedor (pasa al `redirect_url` de OAuth).
    Verificado en el código de `@clerk/clerk-js@6.38.0`.
  - `signIn.finalize({ navigate })`, con `navigate: ({ session, decorateUrl }) => void`;
  - `signIn.reset()`.
- `signIn.status: "needs_identifier" | "needs_first_factor" | "needs_second_factor" | "needs_client_trust" | "needs_new_password" | "needs_protect_check" | "complete"`. El objeto `signIn` del hook es un proxy sobre el estado actual, así que tras `await` se lee el `status` actualizado.
- `useUser()`: `{ isLoaded: false } | { isLoaded: true; isSignedIn: false; user: null } | { isLoaded: true; isSignedIn: true; user: UserResource }`. `user.fullName`, `user.primaryEmailAddress?.emailAddress`.
- `useClerk().signOut({ redirectUrl })`.
- Servidor: `auth()` de `@clerk/nextjs/server` es async y devuelve `{ isAuthenticated, userId, … }`. En el proxy se recibe como primer argumento del handler de `clerkMiddleware`.

Si al instalar algún nombre no coincide con lo anterior, el developer de P1 lo anota en su reporte y T1–T3 se ajustan **sin cambiar el comportamiento** de los AC. Si el cambio altera un contrato, se reporta `BLOCKED` con `origen: spec`.

### D2 — Instalación manual y controlada (no `clerk init`)

- P1 corre `npm install --save-exact @clerk/nextjs@7.9.11`.
- **Exacta** (sin `^`) porque la API de Clerk cambia entre versiones (D1) y esta spec está verificada contra 7.9.11. El resto del `package.json` usa `^`: es una excepción declarada.
- No se usa `clerk init`: escribe `layout`/middleware por su cuenta y podría crear `middleware.ts` en vez de `src/proxy.ts`, y el developer no debe manejar secretos.
- Las claves las pone el usuario en `.env.local` (M1):
  - `.gitignore` ya ignora `.env*`;
  - se agrega `!.env.example` para versionar una plantilla sin valores.
- **Keyless:** existe en 7.9.11, solo en `NODE_ENV=development` y desactivable con `NEXT_PUBLIC_CLERK_KEYLESS_DISABLED`.
  - Sin claves, `next dev` crea `.clerk/` (con una secret key temporal) y la agrega al `.gitignore` por su cuenta.
  - P1 agrega `.clerk/` al `.gitignore` de antemano, para que nunca se commitee.
  - Keyless sirve para probar rápido y "reclamar" la app, pero **no** sirve para `next build`. Por eso M1 es precondición.
- **Nunca se commitean claves.** AC23 lo verifica.

### D3 — División en tres specs

| Spec | Contenido | Archivos aprox. |
|---|---|---|
| **013** (esta) | Clerk, proxy, `redirect_url`, ingreso con email + Device Trust + Google, callback SSO, header con sesión, placeholder `/my-tickets` | 32 (10 de tests/config) |
| 014 | Registro + verificación por código, recuperación de contraseña, segmented y links entre pantallas | 16 |
| 015 | `isOrganizer`, `requireUser`/`requireOrganizer`, `becomeOrganizer`, `/organizer/onboarding`, placeholder `/organizer`, "Vender entradas" y "Panel de organizador" | 14 |

013 supera la guía de ~8 archivos. Es el mínimo verificable de punta a punta: ingresar, ver la sesión en el header, cerrar sesión y probar la protección. Un tercio son tests y config. El trabajo se reparte en tres tareas paralelas.

### D4 — Lógica de rutas en helpers puros; proxy delgado

- `src/proxy.ts` solo:
  1. obtiene `isAuthenticated` con `await auth()`;
  2. llama a `isProtectedPath` / `isAuthPath` / `buildSignInHref` / `resolveAfterAuthPath` (C1);
  3. redirige con `NextResponse.redirect(new URL(path, req.url))`.
- No se usa `auth.protect()`: redirige con la URL **absoluta** de Clerk y su propio parámetro, y queremos `redirect_url` relativo y validado.
- No se usa `createRouteMatcher`: su sintaxis de patrones (`"/organizer(.*)"`) también capturaría `/organizers`.

### D5 — Rutas protegidas

| Ruta | ¿Sesión? | Motivo |
|---|---|---|
| `/my-tickets`, `/my-tickets/**` | sí | Datos del usuario. |
| `/organizer`, `/organizer/**` | sí (solo autenticación; el rol lo valida un guard de servidor en la 015) | System Design §4.3. |
| `/events/{slug}/checkout` | **sí** | Decisión del orquestador, coherente con System Design §5 (la reserva/orden pertenece a un usuario). Al volver se conservan `tickets` y `seats`. |
| `/events/{slug}/confirmation` | **no** | No muestra datos personales: el pedido mock viaja en la URL y la 010 prohíbe que la PII viaje. Solo se llega desde un checkout que ya exige sesión. Cuando existan órdenes reales, el control de propiedad va en la página/service (`orders.user_id`), no en el proxy. Protegerla hoy no agrega seguridad, y obligaría a ingresar para reabrir un link de confirmación. |
| `/`, `/events`, `/events/{slug}`, `/events/{slug}/tickets`, `/events/{slug}/seats` | no | Navegación pública. |
| `/sign-in`, `/sign-up`, `/reset-password` | no; **con sesión → redirige** a `redirect_url` válido o `/` | Evita mostrar el login a quien ya ingresó. |
| `/sso-callback` | no, y **sin** redirección por sesión | Debe poder terminar el flujo OAuth. |

### D6 — Header: componente cliente con estado de carga (sin `dynamic`)

- `HeaderSessionActions` es `"use client"` y lee `useUser()`.
- Mientras `isLoaded === false` (SSR y primer render) muestra un **placeholder neutro** (`aria-hidden`) del tamaño del botón "Mi cuenta" y no muestra ni "Iniciar sesión" ni "Mi cuenta". Así el HTML del servidor y el del cliente coinciden (sin hydration mismatch) y no parpadea "Iniciar sesión" a quien ya tiene sesión.
- **No** se usa `<ClerkProvider dynamic>` ni `currentUser()` en el layout: harían dinámicas todas las páginas, incluida la landing estática.

### D7 — Device Trust (`needs_client_trust`)

- En Core 3, un ingreso con contraseña desde un dispositivo nuevo puede devolver `status === "needs_client_trust"`: Clerk exige un código por email antes de crear la sesión ("Device Trust", ver la doc de `SignInFutureResource.status`).
- Si no se maneja, el ingreso queda colgado. Por eso `SignInForm`:
  1. llama a `signIn.mfa.sendEmailCode()`;
  2. muestra `VerificationCodeForm`;
  3. verifica con `signIn.mfa.verifyEmailCode({ code })`;
  4. hace `finalize`.
- `VerificationCodeForm` es genérico: la 014 lo reutiliza para verificar el email al registrarse.

### D8 — Botón "Continuar con Google": posición y texto (criterio propio)

- El diseño no trae login social.
- **Posición:** arriba del formulario, bajo el encabezado "Hola de nuevo", seguido de un separador con el texto "o ingresa con tu correo". Es el patrón más común (Google primero, el email como alternativa) y deja el botón indigo "Iniciar sesión" como cierre del formulario.
- **Texto:** "Continuar con Google". Sirve igual para ingresar y para crear cuenta (la 014 lo reutiliza tal cual).
- **Estilo:** botón outline (`h-13.5`, `rounded-2xl`, `border-[1.5px] border-input`, `bg-card`, `text-[0.9375rem] font-semibold`).
- **Logo:** la "G" multicolor oficial de Google como SVG inline `aria-hidden`. Sus 4 colores de marca (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) son la única excepción a "sin hex", porque las guías de marca de Google exigen el logo original (misma excepción que el QR de la 011).
- **Degradación:**
  - si Google no está habilitado en el Dashboard, o `sso()` devuelve error, se muestra "No pudimos conectar con Google. Inténtalo de nuevo o ingresa con tu correo." bajo el botón (`role="alert"`) y el botón vuelve a estar activo;
  - nunca lanza;
  - el formulario de email sigue funcionando.

### D9 — Callback SSO con `AuthenticateWithRedirectCallback`

- `@clerk/react` tiene `HandleSSOCallback` (el componente pensado para la API signal), pero **`@clerk/nextjs@7.9.11` no lo exporta**. Verificado en `dist/types/index.d.ts` y `dist/esm/index.js`.
- No se importa `@clerk/react` directo: es una dependencia transitiva.
- Se usa `AuthenticateWithRedirectCallback` (exportado por `@clerk/nextjs`), que llama a `clerk.handleRedirectCallback`. Este:
  - termina el flujo;
  - si el usuario de Google no existe, **transfiere a un registro** y crea la cuenta (`transferable` por defecto);
  - navega al destino final que se pasó en `sso({ redirectUrl })`.
- Si el usuario cancela en Google, vuelve a `signInUrl` (`/sign-in`) sin mensaje (fuera de alcance).
- Se incluye `<div id="clerk-captcha" />` en la vista del callback. La transferencia a registro puede requerir el captcha de bot protection, y Clerk lo monta ahí si existe.

### D10 — Sin `localization` de Clerk

La UI es propia. Los textos visibles son nuestros y los errores se traducen en `auth-errors.ts` por **código** (no por `message`, que viene en inglés). `@clerk/localizations` (esES) solo traduce los componentes prearmados, que no usamos (YAGNI).

### D11 — Sin segmented ni links a registro/reset en la 013

Ver Fuera de alcance. `AuthShell` recibe el contenido como `children`. La 014 agrega `AuthModeTabs` dentro de los formularios, sin tocar el shell.

### D12 — Páginas de auth sin header del sitio ni `ThemeToggle`

- Route group `(auth)` con su propio layout (diseño `Auth`: pantalla partida, sin header).
- El logo del panel lleva al inicio.
- El tema elegido se conserva (`next-themes`) y la columna del formulario usa tokens, así que funciona en claro y oscuro. El panel de marca es `--stage` en ambos temas, como el hero de la 005.

### D13 — Detalles de accesibilidad (criterio propio sobre el diseño)

- **Mostrar contraseña:**
  - el diseño cambia a la vez el `aria-label` ("Mostrar/Ocultar contraseña") y `aria-pressed`. Combinar ambos confunde al lector ("Ocultar contraseña, presionado");
  - se usa un **label fijo** "Mostrar contraseña" con `aria-pressed` `"false"`/`"true"` y `aria-controls` = id del input. El icono es `Eye` / `EyeOff`.
- **Texto del panel:** el diseño desktop usa `<h2>` antes del `<h1>` del formulario. Se renderiza como `<p>` (como hace el diseño móvil), para que el `<h1>` sea el único y primer encabezado de la página.
- **Imagen del panel:** decorativa (`alt=""`). El mensaje lo da el texto.
- **Código:** un único `Input` con `inputMode="numeric"`, `autoComplete="one-time-code"` y `maxLength={6}`.

## Contratos

### C1 — Rutas de auth (`src/lib/auth/auth-routes.ts`)

```ts
export const SIGN_IN_PATH = "/sign-in"
export const SIGN_UP_PATH = "/sign-up"                    // página en la 014
export const RESET_PASSWORD_PATH = "/reset-password"      // página en la 014
export const SSO_CALLBACK_PATH = "/sso-callback"
export const MY_TICKETS_PATH = "/my-tickets"              // placeholder 013 → página real 016
export const ORGANIZER_PATH = "/organizer"                // página en la 015 (placeholder) → 017
export const ORGANIZER_ONBOARDING_PATH = "/organizer/onboarding" // página en la 015
export const DEFAULT_AFTER_AUTH_PATH = "/"
export const REDIRECT_URL_PARAM = "redirect_url"

/** true si la ruta exige sesión:
 *  - "/my-tickets" y todo lo que empiece con "/my-tickets/";
 *  - "/organizer" y todo lo que empiece con "/organizer/";
 *  - "/events/{slug}/checkout", con o sin "/" final, donde slug es un solo segmento no vacío.
 *  Recibe solo el pathname (sin query). "/my-ticketsx", "/organizers", "/events/a/b/checkout" → false. */
export function isProtectedPath(pathname: string): boolean

/** true para SIGN_IN_PATH, SIGN_UP_PATH y RESET_PASSWORD_PATH, exactos o con subruta ("/sign-in/…").
 *  SSO_CALLBACK_PATH → false. */
export function isAuthPath(pathname: string): boolean

/** Devuelve una ruta interna segura (pathname + search + hash) o null. Acepta string | string[] | null | undefined
 *  (los arrays de searchParams usan su primer elemento). Rechaza (→ null):
 *  - todo lo que no sea string, el string vacío o más de 2048 caracteres;
 *  - lo que no empiece con "/", o empiece con "//" o "/\";
 *  - cualquier "\", o caracteres de control (U+0000–U+001F, U+007F);
 *  - URLs absolutas o con esquema ("https://…", "javascript:…");
 *  - lo que, resuelto con new URL(value, "http://localhost"), tenga un origen distinto de "http://localhost";
 *  - las rutas de auth: isAuthPath(pathname) o pathname === SSO_CALLBACK_PATH (evita bucles).
 *  Ej.: "/events/x/checkout?tickets=a:1" → "/events/x/checkout?tickets=a:1";
 *       "//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/sign-in" → null. */
export function getSafeRedirectPath(value: string | string[] | null | undefined): string | null

/** getSafeRedirectPath(value) ?? DEFAULT_AFTER_AUTH_PATH. */
export function resolveAfterAuthPath(value: string | string[] | null | undefined): string

/** "/sign-in" si returnTo no es seguro o es "/"; si no, "/sign-in?redirect_url=" + encodeURIComponent(path seguro).
 *  Ej.: buildSignInHref("/events/x/checkout?tickets=a:1,b:2")
 *       → "/sign-in?redirect_url=%2Fevents%2Fx%2Fcheckout%3Ftickets%3Da%3A1%2Cb%3A2". */
export function buildSignInHref(returnTo?: string | null): string
```

`src/lib/auth/` no importa nada de Clerk en este archivo: es puro y se usa en el proxy, en servidor y en cliente.

### C2 — Proxy (`src/proxy.ts`)

```ts
import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export default clerkMiddleware(async (auth, req) => {
  // 1. const { isAuthenticated } = await auth()
  // 2. !isAuthenticated && isProtectedPath(req.nextUrl.pathname)
  //      → NextResponse.redirect(new URL(buildSignInHref(req.nextUrl.pathname + req.nextUrl.search), req.url))
  // 3. isAuthenticated && isAuthPath(req.nextUrl.pathname)
  //      → NextResponse.redirect(new URL(resolveAfterAuthPath(req.nextUrl.searchParams.get(REDIRECT_URL_PARAM)), req.url))
  // 4. si no, no devuelve nada (sigue la petición)
})

export const config = {
  matcher: [
    // Matcher recomendado por Clerk: excluye internos de Next y archivos estáticos.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
```

- Sin `runtime`: Next 16 lo prohíbe en proxy, que corre en Node.js.
- Es el único proxy del proyecto.

### C3 — Schemas (`src/modules/auth/schemas/auth-form.schema.ts`)

```ts
export type SignInFormValues = { email: string; password: string }
export type SignInFieldName = keyof SignInFormValues
export type SignInFormData = { email: string; password: string }   // email recortado; password tal cual
export const EMPTY_SIGN_IN_FORM: SignInFormValues = { email: "", password: "" }
/** Orden visual: sirve para enfocar el primer campo inválido. */
export const SIGN_IN_FIELD_ORDER: readonly SignInFieldName[] = ["email", "password"]

export const signInFormSchema: z.ZodType<SignInFormData, SignInFormValues>
/** Primer mensaje por campo; {} si es válido. */
export function getSignInFieldErrors(values: SignInFormValues): Partial<Record<SignInFieldName, string>>

/** Quita espacios internos y en los bordes ("123 456" → "123456") y exige exactamente 6 dígitos. */
export const verificationCodeSchema: z.ZodType<string, string>
/** Mensaje de error o null. */
export function getVerificationCodeError(value: string): string | null
```

Mensajes (exactos):

| Campo | Caso | Mensaje |
|---|---|---|
| email | vacío tras `trim` | "Ingresa tu correo electrónico." |
| email | formato inválido (`z.email()`) | "Ingresa un correo válido, por ejemplo tu@email.com." |
| password | vacío (sin `trim`: una contraseña de espacios es válida para zod) | "Ingresa tu contraseña." |
| código | vacío tras quitar espacios | "Ingresa el código que te enviamos." |
| código | no son exactamente 6 dígitos | "El código tiene 6 dígitos." |

En el ingreso no se valida largo ni complejidad de la contraseña: eso es del registro (014) y del servidor.

### C4 — Errores de Clerk (`src/modules/auth/utils/auth-errors.ts`)

```ts
export type AuthErrorFlow = "sign-in" | "google"     // la 014 agrega "sign-up" | "reset-password"
export type AuthErrorField = "email" | "password" | "code" | "form"
export type AuthErrorMessage = { field: AuthErrorField; message: string }

/** Código del primer error de Clerk, sin importar Clerk (duck typing):
 *  - objeto con errors: [{ code: string }, …] (ClerkAPIResponseError) → errors[0].code;
 *  - si no, objeto con code: string (ClerkError) → code;
 *  - si no → null. */
export function getClerkErrorCode(error: unknown): string | null

/** Traduce un error a un mensaje en español y al campo donde mostrarlo. Nunca lanza. Nunca devuelve el message
 *  original de Clerk (está en inglés). */
export function getAuthErrorMessage(error: unknown, flow: AuthErrorFlow): AuthErrorMessage
```

Tabla (en orden de prioridad):

| Condición | field | message |
|---|---|---|
| `flow === "google"` (cualquier error) | form | "No pudimos conectar con Google. Inténtalo de nuevo o ingresa con tu correo." |
| `form_identifier_not_found`, `form_password_incorrect`, `form_password_or_identifier_incorrect` | form | "El correo o la contraseña no son correctos." (no revela si el correo existe) |
| `form_param_format_invalid` | email | "Ingresa un correo válido, por ejemplo tu@email.com." |
| `strategy_for_user_invalid` | form | "Esta cuenta no usa contraseña. Prueba con «Continuar con Google»." |
| `form_password_pwned`, `form_password_pwned__sign_in` | form | "Por seguridad, esta contraseña ya no se puede usar porque apareció en una filtración de datos." |
| `user_locked` | form | "Tu cuenta está bloqueada temporalmente por demasiados intentos. Inténtalo más tarde." |
| `too_many_requests` | form | "Hiciste demasiados intentos. Espera un momento e inténtalo de nuevo." |
| `session_exists`, `identifier_already_signed_in` | form | "Ya iniciaste sesión." |
| `form_code_incorrect` | code | "El código no es correcto. Revísalo e inténtalo de nuevo." |
| `verification_expired` | code | "El código venció. Pide uno nuevo con «Reenviar código»." |
| `verification_failed` | code | "Superaste el número de intentos. Pide un código nuevo con «Reenviar código»." |
| `captcha_invalid`, `captcha_unavailable`, `captcha_missing_token` | form | "No pudimos verificar que no eres un robot. Recarga la página e inténtalo de nuevo." |
| `not_allowed_access` | form | "Este correo no tiene permitido el acceso." |
| cualquier otro (incluido `null`, errores de red o valores que no son error) | form | "Algo salió mal. Inténtalo de nuevo." |

### C5 — `ClerkProvider` (`src/app/layout.tsx`)

```tsx
<body className="min-h-full flex flex-col">
  <ClerkProvider signInUrl={SIGN_IN_PATH} signUpUrl={SIGN_UP_PATH} afterSignOutUrl={DEFAULT_AFTER_AUTH_PATH}>
    <ThemeProvider>{children}</ThemeProvider>
  </ClerkProvider>
</body>
```

- `ClerkProvider` se importa de `@clerk/nextjs` (componente de servidor). Es async y lee `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` del entorno.
- Sin `dynamic` (D6), sin `localization` (D10) y sin `appearance`.
- `metadata`, la fuente, `lang="es"` y `suppressHydrationWarning` no cambian.

### C6 — Navegación tras `finalize()` (`src/modules/auth/utils/finalize-navigation.ts`)

```ts
export type AuthNavigation = { push: (url: string) => void; assign: (url: string) => void }

/** Devuelve la función `navigate` para signIn.finalize / signUp.finalize:
 *  url = decorateUrl(target); si url empieza con "http" → navigation.assign(url) (refresco de cookies de Safari ITP);
 *  si no → navigation.push(url). Ignora session.currentTask (las tasks de Clerk no están habilitadas, ver M2). */
export function createFinalizeNavigate(
  navigation: AuthNavigation,
  target: string
): (params: { decorateUrl: (url: string) => string }) => void
```

En componentes: `createFinalizeNavigate({ push: router.push, assign: (url) => window.location.assign(url) }, redirectPath)`.

### C7 — Componentes de formulario (`src/modules/auth/components/`)

```ts
// password-input.tsx ("use client")
export const AUTH_INPUT_CLASS_NAME: string
// = "h-13 rounded-[14px] border-input bg-card px-4 text-base focus-visible:border-primary focus-visible:ring-0
//    focus-ring md:text-base lg:text-[0.9375rem] dark:bg-card" (las mismas clases que checkout-fields.tsx)
export type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  id: string
  autoComplete: "current-password" | "new-password"
}
/** Input + botón 44×44 dentro del campo (absolute, top/right 4px, rounded-[10px], text-muted-foreground,
 *  pr-14 en el input). Botón: type="button", aria-label fijo "Mostrar contraseña", aria-pressed, aria-controls={id},
 *  icono Eye (oculta) / EyeOff (visible). Alterna type="password" | "text". */
export function PasswordInput(props: PasswordInputProps): React.JSX.Element

// google-sign-in-button.tsx ("use client")
export type GoogleSignInButtonProps = { redirectPath: string }   // destino final ya validado
/** Llama a signIn.sso({ strategy: "oauth_google", redirectUrl: redirectPath, redirectCallbackUrl: SSO_CALLBACK_PATH }).
 *  Mientras espera: disabled + focusableWhenDisabled + aria-busy, y Loader2 (animate-spin
 *  motion-reduce:animate-none) en lugar del logo; el texto no cambia. Con error: getAuthErrorMessage(error, "google")
 *  en un <p role="alert"> bajo el botón, y el botón se rehabilita. Guard con useRef contra doble clic. */
export function GoogleSignInButton(props: GoogleSignInButtonProps): React.JSX.Element

// verification-code-form.tsx ("use client")
export type VerificationCodeFormProps = {
  title: string                 // se renderiza como <h1>
  description: React.ReactNode
  submitLabel: string
  /** Verifica el código ya validado por zod. Devuelve el error a mostrar o null si salió bien. */
  onVerify: (code: string) => Promise<AuthErrorMessage | null>
  /** Reenvía el código. Devuelve el error a mostrar o null. */
  onResend: () => Promise<AuthErrorMessage | null>
  onBack: () => void
  backLabel: string
}
export function VerificationCodeForm(props: VerificationCodeFormProps): React.JSX.Element

// sign-in-form.tsx ("use client")
export type SignInFormProps = { redirectPath: string }   // resolveAfterAuthPath(searchParams.redirect_url)
export function SignInForm(props: SignInFormProps): React.JSX.Element
```

### C8 — Callback SSO

```ts
// src/modules/auth/components/sso-callback-view.tsx ("use client")
/** <h1>Conectando con Google…</h1>, <p role="status">Esto solo toma unos segundos.</p>, <div id="clerk-captcha" />
 *  y <AuthenticateWithRedirectCallback signInUrl={SIGN_IN_PATH} signUpUrl={SIGN_IN_PATH}
 *  continueSignUpUrl={SIGN_IN_PATH} firstFactorUrl={SIGN_IN_PATH} secondFactorUrl={SIGN_IN_PATH} />.
 *  En 013, signUpUrl/continueSignUpUrl apuntan a /sign-in porque /sign-up no existe; la 014 los cambia a SIGN_UP_PATH. */
export function SsoCallbackView(): React.JSX.Element
```

### C9 — Shell de auth (`src/modules/auth/components/auth-shell.tsx`, servidor)

```ts
export type AuthShellProps = { children: React.ReactNode }
export function AuthShell(props: AuthShellProps): React.JSX.Element
```

Estructura (transcrita del diseño; medidas en px del lienzo):

- **Contenedor:** `min-h-dvh`. Por debajo de `lg` es una columna. Desde `lg`, `grid lg:grid-cols-2 xl:grid-cols-[640px_minmax(0,1fr)]`.
  - Criterio propio: con 640 px fijos, a 1024 px el formulario de 440 px no cabría. Por eso de `lg` a `xl` las columnas son 1fr/1fr, y desde `xl` el panel mide 640 como en el diseño.
- **Panel de marca:** `<section aria-label="Ticketera">`, `bg-stage text-stage-foreground`.
  - **Desktop (≥ lg):**
    - `p-10` (40), `flex flex-col gap-8` (32);
    - logo `BrandLogo size="md" tone="inverted"` dentro de `<Link href="/" aria-label="Ticketera, ir al inicio" className="focus-ring rounded-xl">`;
    - imagen de 440 de alto, `w-full`, `rounded-[28px]`, `object-cover`;
    - bloque de texto `gap-2.5` (10): `<p>` 34px / 1.15 / 700 / −0.025em "Tus entradas, siempre a mano." y `<p>` 16px / 1.55 `text-stage-subtle` "Compra en minutos y lleva tu QR en el celular.".
  - **Móvil (< lg):**
    - banda de 210 de alto, `relative overflow-hidden`, `p-4` (16), `flex flex-col justify-between`;
    - imagen `absolute right-0 top-0 h-full w-[170px] rounded-bl-[40px] object-cover`;
    - logo `BrandLogo size="sm" tone="inverted"` (32 px; enlazado igual), `relative`;
    - bloque de texto `relative w-[190px] gap-1.5` (6): `<p>` 22px / 1.2 / 700 / −0.02em y `<p>` 13px / 1.45 `text-stage-subtle`, con los mismos textos.
  - **Imagen:** una sola `next/image` para ambos layouts (`fill` dentro de un contenedor posicionado, `sizes="(min-width: 1024px) 560px, 170px"`, `alt=""`).
    - URL: `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=70`. Es la foto de festival con manos en alto que ya usa el mock "Festival Sonidos del Sur". `images.unsplash.com` ya está en `remotePatterns`.
    - Constante nombrada en el archivo.
- **Columna del formulario:** `<main>`.
  - Móvil: `px-4 pt-6 pb-8` (24/16/32).
  - Desktop: `flex items-center justify-center`, con el contenido en `w-full max-w-[440px]` (`px-8 xl:px-0`).
  - Fondo `bg-background`.

### C10 — `BrandLogo` (extender)

```ts
export type BrandLogoProps = { size?: "md" | "sm"; tone?: "default" | "inverted"; className?: string }
```

- `tone="inverted"`: cuadro `bg-stage-foreground` (blanco) con icono `text-primary dark:text-stage`, y texto `text-stage-foreground`.
  - En oscuro, `--primary` (`#818CF8`) sobre blanco da 2.98:1, menos de 3:1. Por eso el icono pasa a `--stage` (16:1).
- `tone="default"` (por defecto): idéntico a hoy.

### C11 — Header con sesión

```ts
// src/modules/auth/components/header-session-actions.tsx ("use client")
export type HeaderSessionActionsProps = { variant: "desktop" | "mobile" }
export function HeaderSessionActions(props: HeaderSessionActionsProps): React.JSX.Element

// src/modules/auth/components/user-menu.tsx ("use client")
export type UserMenuProps = {
  variant: "desktop" | "mobile"
  displayName: string | null   // user.fullName
  email: string | null         // user.primaryEmailAddress?.emailAddress
  onSignOut: () => void
}
export function UserMenu(props: UserMenuProps): React.JSX.Element
```

`HeaderSessionActions` lee `useUser()`, `useClerk()` y `usePathname()`.

- `returnTo` = `pathname` (sin query: leer la query exigiría `useSearchParams` y un `Suspense` en páginas estáticas; KISS).
- `signInHref = buildSignInHref(pathname)`. En `/` queda `/sign-in`.

| Estado | `variant="desktop"` (contenedor `flex items-center gap-2`) | `variant="mobile"` |
|---|---|---|
| `isLoaded === false` | link "Vender entradas" + placeholder `<span aria-hidden="true">` `size-11 rounded-full bg-muted` | placeholder `size-11 rounded-xl bg-muted` |
| sin sesión | link "Iniciar sesión" → `signInHref` (las clases actuales del header) + link "Vender entradas" (`href="#"`, clases actuales) | link "Ingresar" → `signInHref` (clases actuales) |
| con sesión | link "Mis entradas" (`hidden xl:inline-flex`) + "Vender entradas" + `UserMenu variant="desktop"` | `UserMenu variant="mobile"` |

- **Link "Mis entradas" (desktop)**, transcrito de `MyTickets`:
  - `h-11 px-4 gap-2 rounded-xl text-[0.9375rem]`, icono `Ticket` de 18 px (`aria-hidden`), `focus-ring`;
  - en `/my-tickets` o una subruta: `aria-current="page"` + `bg-primary/10 text-primary font-semibold`;
  - si no: `font-medium hover:bg-muted`.
  - Solo desde `xl`, porque en `lg` (1024) no entran los 4 controles. El menú siempre lo ofrece.
- **`UserMenu`:**
  - **Trigger:** `DropdownMenuTrigger` con `render={<Button …/>}`, `aria-label="Mi cuenta"`, icono `CircleUserRound` de 22 px (`aria-hidden`).
    - desktop: `size-11 rounded-full border-[1.5px] border-input bg-card`;
    - móvil: `size-11 rounded-xl` ghost.
  - **Contenido:** `DropdownMenuContent align="end"` con `min-w-56`.
    1. Un bloque no interactivo (`<div>` en `px-2 py-1.5`) con `displayName` (`text-sm font-semibold`, se omite si es `null`) y `email` (`text-xs text-muted-foreground`, se omite si es `null`).
    2. `DropdownMenuSeparator`.
    3. `DropdownMenuItem render={<Link href={MY_TICKETS_PATH} />}`: icono `Ticket` + "Mis entradas".
    4. `DropdownMenuSeparator`.
    5. `DropdownMenuItem onClick={onSignOut}`: icono `LogOut` + "Cerrar sesión".
  - `onSignOut` = `() => signOut({ redirectUrl: DEFAULT_AFTER_AUTH_PATH })`.
  - La 015 agrega "Panel de organizador" entre los ítems 3 y 4.

`SiteHeader`:

- en el grupo desktop, reemplaza los dos `<a href="#">` por `<HeaderSessionActions variant="desktop" />` (tras `ThemeToggle`);
- en el grupo móvil, reemplaza el `<a href="#">Ingresar</a>` por `<HeaderSessionActions variant="mobile" />` (antes de `SiteMobileMenu`).

El resto del header no cambia, y `SiteHeader` sigue siendo componente de servidor.

### C12 — Placeholder de Mis entradas (`src/app/(site)/my-tickets/page.tsx`)

- Página de servidor. Protegida por el proxy (C2).
- `metadata: { title: "Mis entradas — Ticketera", robots: { index: false } }`.
- Compone `Empty*` como `ConfirmationNotFound`:
  - icono `Ticket` en `EmptyMedia` `size-14 rounded-2xl bg-primary/10 text-primary`;
  - `<h1>` "Mis entradas";
  - descripción "Muy pronto verás aquí todas tus entradas. Por ahora, las encuentras en la confirmación de cada compra.";
  - link "Explorar eventos" → `/events`, con el estilo del botón oscuro de `ConfirmationNotFound`.
- Es composición de primitivos sin lógica, y es **temporal**: la 016 la reemplaza por `MyTicketsView`.

### C13 — Comportamiento de `SignInForm`

Paso **credenciales** (inicial). Estructura y textos transcritos de `Auth`/`AuthMobile`, salvo los marcados como criterio propio:

1. Encabezado (`flex flex-col gap-1.5`, móvil `gap-1`):
   - `<h1>` "Hola de nuevo" (30px / 1.15 / 700 / −0.025em; móvil 26px);
   - `<p>` "Ingresa para ver tus entradas y comprar más rápido." (15px `text-muted-foreground`; móvil 14px).
2. `GoogleSignInButton` (criterio propio, D8).
3. `FieldSeparator` con "o ingresa con tu correo" (criterio propio).
4. `<form noValidate>` (`flex flex-col gap-4.5`, móvil `gap-4`):
   - **"Correo electrónico"**: `Input type="email"`, `autoComplete="email"`, `placeholder="tu@email.com"`, `spellCheck={false}`, `AUTH_INPUT_CLASS_NAME`, id `sign-in-email`.
   - **"Contraseña"**: `PasswordInput` con `autoComplete="current-password"`, id `sign-in-password`, sin placeholder.
   - Labels (`FieldLabel`, 14px / 500) y errores (`FieldError` con id `{id}-error`, `text-[0.8125rem]`).
   - Con error visible: `aria-invalid` + `aria-describedby="{id}-error"`. Sin error, ninguno de los dos.
   - Error de nivel formulario: `<p role="alert" className="text-sm text-destructive">` sobre el botón. Solo se renderiza si hay mensaje.
   - **Submit:** `Button type="submit"` `mt-1.5 h-13.5 w-full rounded-2xl text-base font-semibold`, `bg-primary` (variante default) "Iniciar sesión".
5. Al enviar:
   1. Valida con `getSignInFieldErrors`. Si hay errores, los muestra, enfoca el primer campo inválido (`SIGN_IN_FIELD_ORDER`) y **no** llama a Clerk.
   2. Tras el primer intento, los errores de zod se recalculan al escribir (patrón de la 010).
   3. Con datos válidos: estado de carga (submit `disabled` + `focusableWhenDisabled` + `aria-busy` + `Loader2`; el texto no cambia; guard con `useRef` contra doble envío) y `await signIn.password({ emailAddress: email, password })`.
   4. Si devuelve `error`, aplica `getAuthErrorMessage(error, "sign-in")`:
      - `field === "email"` → error del campo, con foco en él;
      - `"form"` → error de formulario;
      - `"password"` → error del campo.
   5. Si no hay error, según `signIn.status`:
      - `"complete"` → `await signIn.finalize({ navigate: createFinalizeNavigate(…, redirectPath) })`. El botón sigue en carga hasta navegar.
      - `"needs_client_trust"` → `await signIn.mfa.sendEmailCode()`:
        - si sale bien, pasa al paso **dispositivo** con el foco en el input del código;
        - si falla, muestra el error de formulario.
      - `"needs_second_factor"` → error de formulario "Tu cuenta tiene verificación en dos pasos, que todavía no está disponible aquí." (fuera de alcance).
      - `"needs_new_password"` → error de formulario "Debes cambiar tu contraseña antes de ingresar. Escríbenos para ayudarte." La 014 lo conecta a `/reset-password`.
      - cualquier otro → "Algo salió mal. Inténtalo de nuevo.".
   6. Termina el estado de carga, salvo en `complete`.

Paso **dispositivo** (`VerificationCodeForm`; textos de criterio propio):

- **Props:**
  - `title` "Confirma que eres tú";
  - `description` "Es la primera vez que ingresas desde este dispositivo. Te enviamos un código de 6 dígitos a **{email}**.";
  - `submitLabel` "Verificar y entrar";
  - `backLabel` "Volver".
- **`onVerify(code)`:** `signIn.mfa.verifyEmailCode({ code })`.
  - con error → `getAuthErrorMessage(error, "sign-in")`;
  - si `status === "complete"` → `finalize` como arriba y devuelve `null`;
  - si no → "Algo salió mal. Inténtalo de nuevo.".
- **`onResend()`:** `signIn.mfa.sendEmailCode()`.
- **`onBack()`:** `await signIn.reset()` y vuelve al paso credenciales, conservando el email y vaciando la contraseña.
- **`VerificationCodeForm` renderiza:**
  - `<h1>` (mismo estilo que "Hola de nuevo") y la descripción;
  - un `<form noValidate>` con el campo "Código de verificación" (`Input`, id `verification-code`, `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength={6}`, `AUTH_INPUT_CLASS_NAME`, `text-center tracking-[0.3em] tabular-nums`), validado con `getVerificationCodeError`;
  - el submit (mismas clases y estado de carga que "Iniciar sesión");
  - dos botones `variant="link"` de 44 px de alto: "Reenviar código" (mientras reenvía: `disabled` + `focusableWhenDisabled`; al terminar, "Te enviamos un código nuevo." en un `<p role="status">`) y `backLabel`;
  - errores:
    - `field === "code"` → error del campo, con `aria-invalid`/`aria-describedby` y foco;
    - otros → error de formulario (`role="alert"`).

## Tareas

### Preparación (serie)

- **P1** Dependencia, entorno, proxy, provider, shadcn y rutas de auth. Archivos:
  - `package.json`
  - `package-lock.json`
  - `.gitignore`: después de `.env*` agrega `!.env.example`; agrega la sección `# clerk keyless (incluye secretos)` con `.clerk/`.
  - `.env.example` (nuevo), con un comentario de una línea por variable y **sin valores**:
    ```
    # Clerk — dashboard.clerk.com → API keys (Next.js). Copia este archivo a .env.local y completa los valores.
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
    CLERK_SECRET_KEY=
    ```
  - `src/proxy.ts` (C2)
  - `src/app/layout.tsx` (C5)
  - `src/components/ui/dropdown-menu.tsx`: `npx shadcn@latest add dropdown-menu`. Si la CLI pide sobrescribir algún archivo existente, responder **no**. Si toca otro archivo que no sea `dropdown-menu.tsx`, se revierte.
  - `src/lib/auth/auth-routes.ts` (C1)
  - `src/lib/auth/auth-routes.test.ts`
  - `src/modules/checkout/components/confirmation-not-found.tsx`: `export const MY_TICKETS_HREF = MY_TICKETS_PATH`, importado de `@/lib/auth/auth-routes`. El comentario pasa a "Ruta de Mis entradas: placeholder protegido en la 013; vista real en la 016.".

  Pasos:
  1. `npm install --save-exact @clerk/nextjs@7.9.11`. Comprobar con `npm ls @clerk/nextjs @clerk/react @clerk/shared @clerk/backend`.
  2. Revisar en `node_modules/@clerk/**` los nombres de D1 (`useSignIn` signal, `signIn.mfa`, `signIn.sso`, `finalize`, `AuthenticateWithRedirectCallback`, `clerkMiddleware`, `auth().isAuthenticated`). Si algo difiere, anotarlo en el reporte para T1–T3.
  3. Implementar los archivos.
  4. Correr `npm run lint` y `npm run test`. Con M1 cumplido, también `npm run build`: no debe haber ningún warning de "middleware deprecated". Además, `npm run dev`: abrir `/` debe responder 200 sin errores de Clerk en consola, y `/my-tickets` sin sesión debe redirigir a `/sign-in?redirect_url=%2Fmy-tickets` (404, porque la página llega en T1).

### Paralelo (tras P1; archivos disjuntos; nadie corre `npm install` ni `npm run build`)

Verificación acotada por tarea: `npx vitest run <tests de la tarea>` y `npx eslint <archivos de la tarea>`.

- **T1** Ingreso: schemas, errores, navegación, formulario, Google, código y página. Archivos:
  - `src/modules/auth/schemas/auth-form.schema.ts` (C3)
  - `src/modules/auth/schemas/auth-form.schema.test.ts`
  - `src/modules/auth/utils/auth-errors.ts` (C4)
  - `src/modules/auth/utils/auth-errors.test.ts`
  - `src/modules/auth/utils/finalize-navigation.ts` (C6)
  - `src/modules/auth/utils/finalize-navigation.test.ts`
  - `src/modules/auth/components/password-input.tsx` (C7)
  - `src/modules/auth/components/google-sign-in-button.tsx` (C7, D8)
  - `src/modules/auth/components/verification-code-form.tsx` (C7, C13)
  - `src/modules/auth/components/sign-in-form.tsx` (C7, C13)
  - `src/modules/auth/components/sign-in-form.test.tsx`
  - `src/app/(auth)/sign-in/page.tsx`: página de servidor.
    - `metadata: { title: "Iniciar sesión — Ticketera" }`;
    - `const { redirect_url } = await props.searchParams` (`PageProps<"/sign-in">`);
    - renderiza `<SignInForm redirectPath={resolveAfterAuthPath(redirect_url)} />`.
- **T2** Shell, layout de auth, logo invertido y callback SSO. Archivos:
  - `src/components/shared/brand-logo.tsx` (C10)
  - `src/modules/auth/components/auth-shell.tsx` (C9)
  - `src/app/(auth)/layout.tsx`: `export default function AuthLayout({ children }: LayoutProps<"/">)`. Devuelve `<AuthShell>{children}</AuthShell>`. El developer ajusta el tipo de `LayoutProps` al que genere Next para el grupo.
  - `src/modules/auth/components/sso-callback-view.tsx` (C8)
  - `src/app/(auth)/sso-callback/page.tsx`: `metadata: { title: "Conectando… — Ticketera", robots: { index: false } }`. Renderiza `<SsoCallbackView />`.
- **T3** Header con sesión y placeholder de Mis entradas. Archivos:
  - `src/modules/auth/components/user-menu.tsx` (C11)
  - `src/modules/auth/components/header-session-actions.tsx` (C11)
  - `src/modules/auth/components/header-session-actions.test.tsx`
  - `src/components/shared/site-header.tsx` (C11)
  - `src/app/(site)/my-tickets/page.tsx` (C12)

**Dependencias entre tareas:** ninguna en tiempo de compilación.

- T1 solo importa de P1 (`@/lib/auth/auth-routes`) y de primitivos existentes.
- T2 no importa nada de T1. La página `/sign-in` (T1) no importa el layout (T2): Next los compone.
- T3 no importa nada de T1 ni de T2.
- Con T1 sin T2, `/sign-in` se ve sin panel de marca. Con T2 sin T1, `/sso-callback` funciona solo.

**Tamaño:** 32 archivos: 22 de código (incluidas 4 páginas/layouts delgados y 1 ajuste de 1 línea), 6 de test y 4 de dependencias/config/entorno. Ver D3.

## Criterios de aceptación

**A. Instalación y entorno**

- [ ] AC1 `package.json` tiene `"@clerk/nextjs": "7.9.11"` (exacto) y es la única dependencia nueva. `npm ls @clerk/nextjs` muestra 7.9.11.
- [ ] AC2 Existe `src/proxy.ts` y **no** existe `middleware.ts` en la raíz ni en `src/`. El build no muestra el aviso de `middleware` deprecado.
- [ ] AC3 `.env.example` está versionado (`git ls-files .env.example`) y no tiene valores. `.env.local` y `.clerk/` están ignorados (`git check-ignore .env.local .clerk/` los lista).
- [ ] AC4 `src/app/layout.tsx` envuelve `ThemeProvider` con `ClerkProvider` dentro de `<body>`, con `signInUrl="/sign-in"`, `signUpUrl="/sign-up"` y `afterSignOutUrl="/"`, sin `dynamic` ni `localization`. La landing `/` sigue siendo estática en la salida de `npm run build` (marcada `○`). Si Clerk la volviera dinámica, el developer no lo fuerza con configuración: reporta `BLOCKED` con `origen: spec`.

**B. Protección de rutas (proxy)**

- [ ] AC5 Sin sesión, `/my-tickets` redirige a `/sign-in?redirect_url=%2Fmy-tickets`, y `/organizer` a `/sign-in?redirect_url=%2Forganizer`.
- [ ] AC6 Sin sesión, `/events/clasico-del-futbol-final-de-temporada/checkout?tickets=evt-002-sur:2` redirige a `/sign-in?redirect_url=` + la ruta y la query codificadas. Tras ingresar (email o Google) se vuelve a ese checkout con `tickets=evt-002-sur:2` intacto. Lo mismo con un teatro (`tickets` + `seats`).
- [ ] AC7 Sin sesión siguen accesibles sin redirección: `/`, `/events`, `/events/{slug}`, `/events/{slug}/tickets`, `/events/{slug}/seats` y `/events/{slug}/confirmation?…`.
- [ ] AC8 Con sesión, `/sign-in` redirige a `/`. `/sign-in?redirect_url=%2Fevents` redirige a `/events`. `/sign-in?redirect_url=https%3A%2F%2Fevil.com`, `…=%2F%2Fevil.com` y `…=%2Fsign-in` redirigen a `/` (nunca fuera del sitio).
- [ ] AC9 `/sign-in?redirect_url=//evil.com` (sin sesión) muestra el formulario, y al ingresar navega a `/`.

**C. Ingreso con email y contraseña (`/sign-in`)**

- [ ] AC10 Desktop (≥ 1280 px):
  - pantalla partida, con el panel de marca `bg-stage` de 640 px a la izquierda:
    - logo invertido enlazado a `/`;
    - foto de 440 px con `rounded-[28px]`;
    - "Tus entradas, siempre a mano." y "Compra en minutos y lleva tu QR en el celular.";
  - el formulario de máx. 440 px centrado a la derecha;
  - de 1024 a 1279 px las columnas son 1fr/1fr y nada se desborda;
  - no hay header del sitio.

  Móvil (390 px):
  - banda de marca de 210 px, con la foto a la derecha (170 px, esquina inferior izquierda redondeada) y el logo pequeño;
  - el formulario apilado debajo.

  En claro y oscuro el formulario usa tokens y el panel es igual en ambos temas.
- [ ] AC11 Se ven, en este orden:
  - "Hola de nuevo" (único `<h1>` de la página) y "Ingresa para ver tus entradas y comprar más rápido.";
  - el botón "Continuar con Google";
  - el separador "o ingresa con tu correo";
  - "Correo electrónico" (placeholder `tu@email.com`, `autocomplete="email"`);
  - "Contraseña" (`autocomplete="current-password"`);
  - el botón indigo "Iniciar sesión".

  **No** aparecen el segmented, "¿Olvidaste tu contraseña?" ni "¿No tienes cuenta?" (llegan en la 014).
- [ ] AC12 El botón del ojo tiene `aria-label="Mostrar contraseña"` fijo, `aria-pressed` `false`/`true` y `aria-controls` hacia el input. Alterna el `type` entre `password` y `text`, y su área es de 44×44.
- [ ] AC13 "Iniciar sesión" con el formulario vacío:
  - muestra "Ingresa tu correo electrónico." e "Ingresa tu contraseña.";
  - pone `aria-invalid="true"` y `aria-describedby` en ambos campos;
  - enfoca "Correo electrónico";
  - no hace ninguna petición a Clerk (pestaña Red).

  Un correo `ana@` muestra "Ingresa un correo válido, por ejemplo tu@email.com.".
- [ ] AC14 Con un usuario existente (M3) y la contraseña correcta, se crea la sesión y se navega a `redirect_url` (o a `/`). El header pasa a mostrar "Mi cuenta".
- [ ] AC15 Con una contraseña incorrecta, o un correo inexistente, se ve "El correo o la contraseña no son correctos." (`role="alert"`), y el botón se rehabilita.
- [ ] AC16 Durante la petición, el botón tiene `aria-busy="true"` y `aria-disabled="true"`, conserva el foco y muestra un spinner, y un segundo clic no envía otra vez.
- [ ] AC17 **Device Trust:** si Clerk responde `needs_client_trust`:
  - llega un correo con un código;
  - se ve "Confirma que eres tú" con el email del usuario y el foco en "Código de verificación" (`autocomplete="one-time-code"`, `inputmode="numeric"`);
  - un código incorrecto muestra "El código no es correcto. Revísalo e inténtalo de nuevo.";
  - el código correcto crea la sesión y navega al destino;
  - "Reenviar código" muestra "Te enviamos un código nuevo.";
  - "Volver" regresa al formulario con el email conservado.

  Se verifica en manual si la instancia lo exige (p. ej. ingresando desde una ventana privada), y siempre en el test de T1.

**D. Google**

- [ ] AC18 Con Google habilitado (M2), "Continuar con Google" lleva a la pantalla de Google.
  - Con un usuario nuevo, la cuenta se crea (transferencia a registro) y se vuelve a `redirect_url` o a `/` con sesión iniciada.
  - Con un usuario existente, simplemente se ingresa.
  - El paso intermedio `/sso-callback` muestra "Conectando con Google…".
- [ ] AC19 Con Google **deshabilitado** en el Dashboard, el clic muestra bajo el botón "No pudimos conectar con Google. Inténtalo de nuevo o ingresa con tu correo." (`role="alert"`). La página no se rompe, el botón se rehabilita y el ingreso con email sigue funcionando.

**E. Header y sesión**

- [ ] AC20 Sin sesión:
  - desktop: "Iniciar sesión" y "Vender entradas" (`href="#"`, sin cambios);
  - móvil: "Ingresar";
  - en `/events/clasico-del-futbol-final-de-temporada`, "Iniciar sesión" apunta a `/sign-in?redirect_url=%2Fevents%2Fclasico-del-futbol-final-de-temporada`, y en `/` apunta a `/sign-in`.

  Con sesión, al recargar no aparece "Iniciar sesión" ni por un instante: durante la carga se ve un placeholder gris sin texto, y no hay warnings de hidratación en la consola.
- [ ] AC21 Con sesión:
  - desktop: "Vender entradas", el botón redondo "Mi cuenta" (44 px, borde) y, desde 1280 px, el link "Mis entradas" (con `aria-current="page"` y tinte indigo en `/my-tickets`);
  - móvil: el botón "Mi cuenta" junto a "Abrir menú".
  - El menú se abre con clic y con teclado (Enter/Espacio, flechas, Escape devuelve el foco al trigger). Muestra el nombre y el email, "Mis entradas" (navega a `/my-tickets`) y "Cerrar sesión".
  - "Cerrar sesión" termina la sesión y lleva a `/`. Si estaba en `/my-tickets`, no queda en una página protegida.
- [ ] AC22 `/my-tickets` con sesión muestra el placeholder "Mis entradas" con "Explorar eventos". `ConfirmationNotFound` → "Mis entradas" ya no da 404.

**F. Calidad**

- [ ] AC23 Ninguna clave aparece en el repo: `git grep -nE "pk_(test|live)_|sk_(test|live)_"` no devuelve resultados, y `git status` no muestra `.env.local` ni `.clerk/`.
- [ ] AC24 Nadie importa `@clerk/nextjs/legacy`, `@clerk/react`, `SignedIn`, `SignedOut`, `<SignIn`, `<SignUp` ni `<UserButton` (`git grep`). `auth-routes.ts` y `auth-errors.ts` no importan nada de Clerk.
- [ ] AC25 Sin hex en los archivos nuevos, salvo los 4 colores del logo de Google (D8). Sin lógica de negocio en `src/app`. El resto del sitio (landing, búsqueda, detalle, selección, asientos, checkout con sesión y confirmación) funciona igual.

## Tests obligatorios

- **`src/lib/auth/auth-routes.test.ts`**:
  - `isProtectedPath`:
    - `true`: `/my-tickets`, `/my-tickets/abc`, `/organizer`, `/organizer/onboarding`, `/events/x/checkout`, `/events/x/checkout/`;
    - `false`: `/`, `/my-ticketsx`, `/organizers`, `/events`, `/events/x`, `/events/x/tickets`, `/events/x/seats`, `/events/x/confirmation`, `/events/a/b/checkout`, `/events//checkout`.
  - `isAuthPath`:
    - `true`: `/sign-in`, `/sign-in/factor`, `/sign-up`, `/reset-password`;
    - `false`: `/sso-callback`, `/sign-inx`, `/`.
  - `getSafeRedirectPath`:
    - devuelve igual: `/`, `/events`, `/events/x/checkout?tickets=a:1,b:2&seats=s1`, `/events#faq`;
    - array → usa el primero (`["/events", "/x"]` → `/events`);
    - `null`: `undefined`, `null`, `""`, `"events"`, `"//evil.com"`, `"/\\evil.com"`, `"/a\\b"`, `"https://evil.com"`, `"http:/evil.com"`, `"javascript:alert(1)"`, `"/\u0000x"`, `"/\tx"`, un string de 2049 caracteres, `"/sign-in"`, `"/sign-in?redirect_url=/x"`, `"/sso-callback"`, `"/reset-password"`.
  - `resolveAfterAuthPath`: válido → igual; inválido → `"/"`.
  - `buildSignInHref`:
    - `undefined`, `null` y `"/"` → `"/sign-in"`;
    - `"https://evil.com"` → `"/sign-in"`;
    - el ejemplo de checkout de C1 → la cadena exacta;
    - `new URL(href, "http://x").searchParams.get("redirect_url")` devuelve la ruta original.
- **`src/modules/auth/schemas/auth-form.schema.test.ts`**:
  - `signInFormSchema` / `getSignInFieldErrors`:
    - válido (`" ana@mail.com "` → email recortado, password sin tocar);
    - vacío → los dos mensajes;
    - `"ana@"` → mensaje de formato;
    - password `"   "` → válido;
    - un solo error por campo.
  - `verificationCodeSchema` / `getVerificationCodeError`:
    - `"123456"` y `" 123 456 "` → válido (`"123456"`);
    - `""` → "Ingresa el código que te enviamos.";
    - `"12345"`, `"1234567"` y `"12a456"` → "El código tiene 6 dígitos.".
- **`src/modules/auth/utils/auth-errors.test.ts`**:
  - `getClerkErrorCode`:
    - `{ errors: [{ code: "form_password_incorrect" }] }` → ese código;
    - `{ code: "x" }` → `"x"`;
    - `new Error("x")`, `null`, `"str"` y `{ errors: [] }` → `null`.
  - `getAuthErrorMessage`:
    - una fila por cada código de la tabla C4, con su `field` y `message` exactos;
    - `flow: "google"` con cualquier código → mensaje de Google;
    - código desconocido → genérico;
    - nunca devuelve el `message` original (pasar `{ errors: [{ code: "zzz", message: "Raw english" }] }` y comprobar que no contiene "Raw english").
- **`src/modules/auth/utils/finalize-navigation.test.ts`**:
  - `decorateUrl` identidad → `push(target)`, sin `assign`;
  - `decorateUrl` devuelve `"https://clerk.x/v1/client/touch?redirect_url=…"` → `assign` con esa URL, sin `push`;
  - `decorateUrl` recibe exactamente `target`.
- **`src/modules/auth/components/sign-in-form.test.tsx`** (`vi.mock("@clerk/nextjs")` con un `useSignIn` fake cuyo `signIn` tiene `status` mutable y métodos `vi.fn`; `vi.mock("next/navigation")` con `useRouter().push` espiado):
  1. enviar vacío → dos errores, `aria-invalid` en ambos, foco en email, y `password` no fue llamado;
  2. `ana@` → error de formato;
  3. válido + `status: "complete"`:
     - `password` recibió `{ emailAddress: "ana@mail.com", password: "secreto123" }`;
     - `finalize` fue llamado;
     - al invocar su `navigate` con `decorateUrl` identidad → `push("/events/x/checkout?tickets=a:1")` (el `redirectPath` del prop).
  4. `password` devuelve `{ error: { errors: [{ code: "form_password_incorrect" }] } }` → alerta "El correo o la contraseña no son correctos." y el botón sin `aria-busy`;
  5. promesa pendiente → botón con `aria-busy="true"`, y un segundo submit no vuelve a llamar a `password`;
  6. `status: "needs_client_trust"`:
     - `mfa.sendEmailCode` fue llamado;
     - aparece el heading "Confirma que eres tú" con el email;
     - el foco está en "Código de verificación";
     - con `"12"` → "El código tiene 6 dígitos." sin llamar a `verifyEmailCode`;
     - con `"123456"` y `verifyEmailCode` devolviendo `form_code_incorrect` → mensaje del código;
     - con éxito (`status` pasa a `"complete"`) → `finalize`;
     - "Reenviar código" → `sendEmailCode` otra vez y "Te enviamos un código nuevo.";
     - "Volver" → `reset` y el formulario con el email conservado.
  7. `status: "needs_second_factor"` → mensaje de 2FA;
  8. el ojo alterna `type` y `aria-pressed`, con `aria-label` constante;
  9. "Continuar con Google":
     - `sso` recibió `{ strategy: "oauth_google", redirectUrl: "/events/x/checkout?tickets=a:1", redirectCallbackUrl: "/sso-callback" }`;
     - si `sso` devuelve error → mensaje de Google y el botón se rehabilita.
- **`src/modules/auth/components/header-session-actions.test.tsx`** (`vi.mock("@clerk/nextjs")` para `useUser`/`useClerk`; `vi.mock("next/navigation")` para `usePathname`):
  1. `isLoaded: false` → no hay "Iniciar sesión", "Ingresar" ni "Mi cuenta";
  2. sin sesión, desktop, en `/events/x` → link "Iniciar sesión" con `href="/sign-in?redirect_url=%2Fevents%2Fx"` y "Vender entradas"; en `/` → `href="/sign-in"`;
  3. sin sesión, móvil → link "Ingresar";
  4. con sesión, desktop → botón "Mi cuenta" y link "Mis entradas" (`href="/my-tickets"`), sin "Iniciar sesión"; en `/my-tickets` el link tiene `aria-current="page"`;
  5. abrir el menú → muestra nombre y email, el ítem "Mis entradas" con `href="/my-tickets"` y "Cerrar sesión", que llama a `signOut({ redirectUrl: "/" })`;
  6. con `fullName: null` → solo el email.
- **Tests existentes en verde sin cambios:** todos los de la 001–012. `confirmation-view.test.tsx` y `confirmation-actions.test.tsx` no dependen del valor del comentario.

No requieren test unitario (SETUP): `password-input`, `auth-shell`, `brand-logo`, `sso-callback-view`, `user-menu` (se cubre en el test del header), las páginas y `src/proxy.ts` (su lógica está en `auth-routes`, con tests; el proxy se verifica en manual con AC5–AC9).

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (requiere M1)
- **Manual** (`npm run dev`, con M1–M3 cumplidos), en desktop (1440 y 1100 px) y móvil (390 px), claro y oscuro:
  - AC5–AC9 en una ventana privada sin sesión:
    - `/my-tickets`;
    - el checkout de `clasico-del-futbol-final-de-temporada` con `?tickets=evt-002-sur:2`;
    - el de `noche-de-rock-sinfonico` tras elegir asientos;
    - `/sign-in?redirect_url=https://evil.com`.
  - `/sign-in`: layout y textos (AC10–AC12), validación (AC13), credenciales malas y buenas (AC14–AC16), Device Trust si aparece (AC17).
  - Google con un usuario nuevo y uno existente (AC18). Luego deshabilitar Google en el Dashboard y repetir (AC19). Volver a habilitarlo.
  - Header en `/`, `/events` y `/my-tickets` con y sin sesión. Recargar con sesión observando que no parpadea (AC20). Menú con teclado y cerrar sesión (AC21–AC22).
  - Lector de pantalla (NVDA o VoiceOver) en `/sign-in`:
    - los errores se anuncian;
    - el ojo anuncia "Mostrar contraseña, botón de alternancia, no presionado";
    - el menú "Mi cuenta" anuncia sus ítems.
- `git grep` de AC23–AC25.

## Pasos manuales del usuario

| # | Cuándo | Qué hacer |
|---|---|---|
| **M1** | **Antes de P1** | Entrar a <https://dashboard.clerk.com> y crear una aplicación ("Ticketera"). En el asistente, elegir **Email** y **Google**. En **API keys** (framework Next.js), copiar las dos claves a un archivo **`.env.local`** en la raíz del proyecto: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…` y `CLERK_SECRET_KEY=sk_test_…` (plantilla en `.env.example`, que crea P1). **Alternativa sin cuenta (keyless):** dejar `.env.local` sin claves y correr `npm run dev` tras P1. Clerk crea `.clerk/` y muestra un aviso para "reclamar" la app. Reclamarla con tu cuenta y copiar las claves a `.env.local`, porque el build las necesita igual. Luego se puede borrar `.clerk/`. |
| **M2** | Tras P1, antes de la verificación manual | En el Dashboard (instancia Development) → **Configure → User & authentication**: (1) **Email address**: activado como identificador y para registrarse; verificación con **Email verification code** activada (la usa la 014); "Email verification link" desactivado. (2) **Password**: activado. (3) **Phone number**: desactivado. (4) **Username**: desactivado. Si teléfono o username quedan activos y obligatorios, el registro quedaría en `missing_requirements` y el alta por Google fallaría. (5) **First and last name**: activado pero **no obligatorio** (la 014 los envía; Google los trae). (6) **SSO connections → Google**: activado. En Development usa las credenciales compartidas de Clerk y no hay que configurar nada en Google Cloud. (7) **Multi-factor**: desactivado. (8) **Organizations**: desactivado, para que no aparezcan "session tasks". (9) **Legal consent / "Require express consent"**: desactivado (el checkbox de términos de la 014 es de UI). (10) **Attack protection / Device Trust (Client Trust)** y **Bot protection**: dejar los valores por defecto. La app los maneja (D7, D9). |
| **M3** | Antes de probar AC14–AC17 | Crear un usuario de prueba con contraseña en **Users → Create user** (email + contraseña). El registro desde la app llega en la 014. Con Google no hace falta: el primer ingreso crea la cuenta. |
| **M4** | Para AC19 | Desactivar temporalmente **Google** en SSO connections, probar y volver a activarlo. |
| **M5** | Producción (fuera de alcance) | La instancia de **Production** de Clerk exige un OAuth client propio de Google (Google Cloud Console → Credentials → OAuth client ID, tipo Web), con el **Authorized redirect URI** que muestra Clerk en la conexión de Google. Además: dominio propio verificado y las claves `pk_live_…`/`sk_live_…` como secretos del entorno (System Design §3.3). |
| — | Variables en `.env.local` | Solo `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`. No hace falta `NEXT_PUBLIC_CLERK_SIGN_IN_URL` ni similares: las rutas van como props de `ClerkProvider` (C5). |

## Contratos que consumen 014–018

| Contrato | Archivo | Consumidor |
|---|---|---|
| `SIGN_IN_PATH`, `SIGN_UP_PATH`, `RESET_PASSWORD_PATH`, `SSO_CALLBACK_PATH`, `MY_TICKETS_PATH`, `ORGANIZER_PATH`, `ORGANIZER_ONBOARDING_PATH`, `DEFAULT_AFTER_AUTH_PATH`, `REDIRECT_URL_PARAM` | `src/lib/auth/auth-routes.ts` | 014 (páginas), 015 (guards, onboarding), 016–018 |
| `getSafeRedirectPath`, `resolveAfterAuthPath`, `buildSignInHref`, `isProtectedPath`, `isAuthPath` | `src/lib/auth/auth-routes.ts` | 014 (`redirect_url` entre pantallas), 015 (`requireUser` redirige con `buildSignInHref`) |
| Proxy: sesión obligatoria en `/my-tickets/**`, `/organizer/**`, `/events/{slug}/checkout` | `src/proxy.ts` | 016–018 no necesitan más protección por proxy; sí guards de servidor (015) |
| `auth-form.schema.ts` (`verificationCodeSchema`, mensajes de email) | `src/modules/auth/schemas/` | 014 agrega `signUpFormSchema` y los schemas de reset |
| `getAuthErrorMessage`, `getClerkErrorCode`, `AuthErrorMessage` | `src/modules/auth/utils/auth-errors.ts` | 014 agrega los flujos `"sign-up"` y `"reset-password"` |
| `createFinalizeNavigate` | `src/modules/auth/utils/finalize-navigation.ts` | 014 |
| `PasswordInput`, `AUTH_INPUT_CLASS_NAME`, `GoogleSignInButton`, `VerificationCodeForm` | `src/modules/auth/components/` | 014 |
| `AuthShell`, `(auth)/layout.tsx` | `src/modules/auth/components/auth-shell.tsx` | 014 (`/sign-up`, `/reset-password` heredan el layout) |
| `SsoCallbackView` | `src/modules/auth/components/sso-callback-view.tsx` | 014 cambia `signUpUrl`/`continueSignUpUrl` a `SIGN_UP_PATH` |
| `HeaderSessionActions`, `UserMenu` (ítems; prop nueva para "Panel de organizador" en la 015) | `src/modules/auth/components/` | 015 |
| Placeholder `/my-tickets` | `src/app/(site)/my-tickets/page.tsx` | 016 lo reemplaza |
| `MY_TICKETS_HREF` (= `MY_TICKETS_PATH`) | `src/modules/checkout/components/confirmation-not-found.tsx` | 016 ("Ver mis entradas") |

## Preguntas abiertas

Ninguna bloqueante. Hay decisiones de criterio propio que el usuario puede querer revisar al aprobar:

1. **División en 013/014/015 (D3)**: el orquestador sugería dos specs. Con ~60 archivos, la 013 quedaría muy por encima de una sesión. ¿Se acepta la división en tres y el corrimiento de Mis entradas → 016, Panel → 017 y Crear evento → 018?
2. **Confirmación pública (D5)**: ¿se acepta dejar `/events/{slug}/confirmation` sin exigir sesión hasta que existan órdenes reales?
3. **Ingreso sin segmented en la 013 (D11)**: hasta la 014, `/sign-in` no muestra "Ingresar | Crear cuenta" y las cuentas nuevas se crean solo con Google o desde el Dashboard. ¿OK?
