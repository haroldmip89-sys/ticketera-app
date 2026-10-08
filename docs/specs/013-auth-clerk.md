# 013 — Autenticación con Clerk: protección de rutas, redirecciones y sesión en el header

- **Estado:** draft
- **Modo:** SDD
- **Módulo(s):**
  - `src/proxy.ts` (Next 16): sesión de Clerk y protección de rutas (hoy solo `clerkMiddleware()`).
  - `src/lib/auth/auth-routes.ts`: helper puro nuevo `getAuthRedirect` (el resto del archivo ya existe).
  - `src/app/layout.tsx`: props de rutas en `ClerkProvider`.
  - `src/app/sign-in/[[...sign-in]]/page.tsx` y `src/app/sign-up/[[...sign-up]]/page.tsx`: redirección posterior validada.
  - `src/components/shared/site-header.tsx`: enlace "Mis entradas" en el menú de cuenta.
  - `src/app/(site)/my-tickets/page.tsx` (placeholder protegido; la 016 lo reemplaza).
  - `src/modules/checkout/components/confirmation-not-found.tsx`: una línea (constante compartida).

> **Actualizada tras 019–023 (2026-10-08).** Esta spec se redactó el 2026-10-07 asumiendo UI propia de auth, `isOrganizer` en `publicMetadata` y sin base de datos. Desde entonces se implementaron la 019 (DB), la 020 (identidad Clerk↔DB, guards y roles desde la DB), la 021/023 (`/admin`) y parte de lo previsto aquí con componentes prearmados de Clerk. Cambios:
> - **Recortado por estar hecho:** instalación de `@clerk/nextjs` (hoy `^7.9.12`, más `@clerk/ui`), `ClerkProvider` con `appearance={{ theme: shadcn }}`, `.env`/`.env.example` y `.gitignore`, páginas `/sign-in` y `/sign-up` (con `<SignIn/>` y `<SignUp/>` prearmados), `src/lib/auth/auth-routes.ts` con `isProtectedPath` (ya cubre `/admin`), `isAuthPath`, `getSafeRedirectPath`, `resolveAfterAuthPath`, `buildSignInHref`, `ADMIN_PATH` y sus tests (creados por la 020), header con `Show`/`SignInButton`/`SignUpButton`/`UserButton`, y el menú de cuenta en el sidebar de `/admin`.
> - **Eliminado (quedó obsoleto o contradice la DB):** UI propia de ingreso (`src/modules/auth`: `SignInForm`, `GoogleSignInButton`, `VerificationCodeForm`, `AuthShell`, `SsoCallbackView`, schemas, `auth-errors`, `finalize-navigation`, `HeaderSessionActions`/`UserMenu`, `BrandLogo` invertido, route group `(auth)`, `/sso-callback`, `dropdown-menu`), pin exacto de la versión (D2), `ClerkProvider` sin `appearance`, y la división 013/014/015. La **015 (roles provisionales con `publicMetadata`)** queda reemplazada por la 020: rol y permisos salen de la DB (`users.staff_role`, `organizer_profiles`, `deactivated_at`) mediante `src/lib/auth/guards.ts`; `publicMetadata` es solo copia para pistas de UI (System Design §4.2) y esta spec no lo lee para autorizar.
> - **Conservado y adaptado:** protección por proxy, `redirect_url` seguro, vuelta al checkout con `tickets`/`seats`, redirección de `/sign-in` con sesión, "Mis entradas" en el menú, placeholder `/my-tickets`, criterios AC de protección y tests de `auth-routes`.
> - **Nuevo:** `getAuthRedirect` (lógica del proxy como función pura testeable) y la verificación de que `/admin/**` queda protegido por el proxy (capa 1) y autorizado por guards (capa 2, spec 020).

- **Fuentes:** System Design §3.4 (variables), §4.1 (login con Google, espejo en DB), §4.2 (la DB manda), §4.3 (guards). Specs 020 (guards y `auth-routes`), 021/023 (`/admin`).
- **Depende de:** 001–012 y 019–023 en `done`/implementadas. Consume `Empty*`, `Button`, `auth-routes.ts`, `guards.ts` (solo como contexto: el proxy no los usa).
- **Roadmap vigente:** **013 (esta)** · 014 Registro y recuperación (se alinea aparte con esta base) · ~~015 Roles provisionales~~ (reemplazada por la 020; la pantalla informativa "solicita acceso" de `/organizer/onboarding` queda para una spec posterior, 020 Q2) · 016 Mis entradas · 017 Panel de organizador · 018 Crear evento.

## Objetivo

1. `src/proxy.ts` exige sesión en `/my-tickets/**`, `/organizer/**`, `/admin/**` y `/events/[slug]/checkout`. Redirige a `/sign-in?redirect_url=…` y, tras ingresar, se vuelve a la ruta original con su query (`tickets`/`seats`). A quien ya tiene sesión y entra a `/sign-in`, `/sign-up` o `/reset-password`, lo redirige a un destino seguro.
2. `/sign-in` y `/sign-up` aplican el `redirect_url` solo si pasa `getSafeRedirectPath` (nunca fuera del sitio).
3. El menú de cuenta del header ofrece "Mis entradas", y `/my-tickets` existe como placeholder protegido para que ningún enlace quede muerto.

La autorización por rol sigue en los guards de la 020; el proxy solo decide "hay sesión / no hay sesión". El proyecto queda en verde.

## Fuera de alcance

- **UI propia de auth** (diseño `Auth`/`AuthMobile`: pantalla partida, formulario propio, Device Trust, Google propio, `/sso-callback`): se mantienen los componentes prearmados de Clerk con `theme: shadcn`. Ver Pregunta abierta P1.
- **Roles, `publicMetadata`, `becomeOrganizer`, `requireUser`/`requireOrganizer`, alta de organizador y "Vender entradas" con destino real:** 020 (guards) y spec posterior (pantalla "solicita acceso"). "Vender entradas" mantiene `href="#"`.
- Enlace "Administración" en el header para staff: lo decide la 023/spec posterior; aquí no se toca.
- Recuperación de contraseña y registro propios (`/reset-password`): 014. `/reset-password` solo está registrada en `isAuthPath`.
- Mis entradas real (016); prellenar el checkout con datos del usuario.
- Webhooks y sincronización con la DB (020, hecho); instancia de producción de Clerk y OAuth propio de Google.
- Cambios en `src/components/ui/**` y en `src/lib/auth/guards.ts`, `permissions.ts`, `roles.ts`.

## Precondiciones

- Claves de Clerk de la instancia Development en `.env` (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`): ya existen en `.env.example` y se asumen configuradas (sin ellas `npm run build` falla; si faltan, el developer reporta `BLOCKED` con `origen: entorno` solo para el build).
- No hay dependencias npm nuevas.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `@clerk/nextjs`, `@clerk/ui` | reutilizar | `package.json` | Ya instalados (`^7.9.12`, `^1.39.1`). No se fija versión exacta. |
| `ClerkProvider` + `shadcn` theme | extender | `src/app/layout.tsx` | Ya envuelve a `ThemeProvider`. Se agregan `signInUrl`, `signUpUrl`, `afterSignOutUrl` (C3). |
| `clerkMiddleware` | extender | `src/proxy.ts` | Hoy `clerkMiddleware()` sin handler; el `matcher` (incluye `/__clerk/:path*`) se conserva. Se agrega el handler (C2). |
| `SIGN_IN_PATH`, `SIGN_UP_PATH`, `RESET_PASSWORD_PATH`, `SSO_CALLBACK_PATH`, `MY_TICKETS_PATH`, `ORGANIZER_PATH`, `ORGANIZER_ONBOARDING_PATH`, `ADMIN_PATH`, `DEFAULT_AFTER_AUTH_PATH`, `REDIRECT_URL_PARAM`, `isProtectedPath`, `isAuthPath`, `getSafeRedirectPath`, `resolveAfterAuthPath`, `buildSignInHref` | reutilizar | `src/lib/auth/auth-routes.ts` + `auth-routes.test.ts` | Creados por la 020. No se reescriben. |
| `getAuthRedirect` | crear | `src/lib/auth/auth-routes.ts` + test | Combina los helpers anteriores; evita lógica en el proxy y permite probarla (C1). |
| Guards (`requireUser`, `requireStaff`, …) | reutilizar (sin tocar) | `src/lib/auth/guards.ts` | Capa 2 de autorización; redirigen con `buildSignInHref`. |
| `<SignIn/>`, `<SignUp/>` | reutilizar (Clerk) | `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx` | Ya existen; se agregan props de routing y redirección (C4). |
| `Show`, `SignInButton`, `SignUpButton`, `UserButton` | reutilizar (Clerk) | `src/components/shared/site-header.tsx` | Modales de Clerk: quien ingresa desde el header permanece en la página. Se agrega `UserButton.MenuItems`/`UserButton.Link` "Mis entradas" (C5). |
| `Empty*`, `Button` | reutilizar | `src/components/ui/` | Placeholder de `/my-tickets` (patrón de `ConfirmationNotFound`). |
| `MY_TICKETS_HREF` | extender (1 línea) | `src/modules/checkout/components/confirmation-not-found.tsx` | Hoy `"/my-tickets"` literal; pasa a `MY_TICKETS_PATH` (DRY). El nombre exportado no cambia. |
| Página `/my-tickets` | crear | `src/app/(site)/my-tickets/page.tsx` | No existe. Temporal hasta la 016. |

## Decisiones

### D1 — Dos capas: proxy autentica, guards autorizan
- El proxy solo exige sesión (`isAuthenticated`) en rutas protegidas. No consulta la DB ni roles (System Design §4.2, §4.3; spec 020 D1).
- `/admin/**` y `/organizer/**` quedan con sesión obligatoria en el proxy; el rol lo valida `requireStaff`/`requireOrganizer` (404 o redirección según la 020). Nada en esta spec lee `publicMetadata`.
- `/api/webhooks/clerk` **no** es ruta protegida: debe seguir público (verificación por firma, spec 020). `getAuthRedirect` devuelve `null` para él.

### D2 — Lógica del proxy en un helper puro
- `src/proxy.ts` solo obtiene `isAuthenticated` con `await auth()` y delega en `getAuthRedirect`. Si devuelve una ruta, responde `NextResponse.redirect(new URL(ruta, req.url))`; si no, deja pasar.
- No se usa `auth.protect()` (redirige con URL absoluta propia de Clerk y queremos `redirect_url` relativo y validado) ni `createRouteMatcher` (sus patrones capturarían `/organizers`).

### D3 — Rutas protegidas (sin cambios respecto a la versión anterior, más `/admin`)

| Ruta | ¿Sesión? | Motivo |
|---|---|---|
| `/my-tickets`, `/my-tickets/**` | sí | Datos del usuario. |
| `/organizer`, `/organizer/**` | sí (solo sesión; rol por guard) | System Design §4.3. |
| `/admin`, `/admin/**` | sí (solo sesión; rol por `requireStaff`) | Spec 020/021. |
| `/events/{slug}/checkout` | sí | La reserva/orden pertenece a un usuario (System Design §5). Se conservan `tickets` y `seats` al volver. |
| `/events/{slug}/confirmation` | no | El pedido mock viaja en la URL sin PII (010). Con órdenes reales el control de propiedad va en la página/service (`orders.user_id`), no en el proxy. |
| `/`, `/events`, `/events/{slug}`, `/events/{slug}/tickets`, `/events/{slug}/seats` | no | Navegación pública. |
| `/sign-in`, `/sign-up`, `/reset-password` | no; con sesión → redirige a `redirect_url` válido o `/` | Evita mostrar el login a quien ya ingresó. |
| `/api/webhooks/clerk` | no | D1. |

### D4 — Redirección posterior controlada por nosotros
- Las páginas `/sign-in` y `/sign-up` leen `redirect_url` de `searchParams` y pasan `forceRedirectUrl={resolveAfterAuthPath(redirect_url)}` a Clerk. Así solo se usa una ruta interna validada (bloquea `//evil.com`, `https://…`, `/sign-in`).
- El ingreso desde los modales del header no pasa por estas páginas y no redirige (se queda en la página actual).

### D5 — Header: se conservan los componentes de Clerk
- No hay `HeaderSessionActions` propio ni placeholder de carga: `Show` de Clerk resuelve la sesión. El menú de cuenta es el `UserButton` de Clerk con `appearance` shadcn.
- "Mis entradas" se agrega con `UserButton.MenuItems` + `UserButton.Link`, con `href={MY_TICKETS_PATH}`. "Cerrar sesión" y "Gestionar cuenta" vienen de Clerk.
- Los textos de los modales y de `<SignIn/>` los pone Clerk (en inglés si no hay `localization`). Ver P1.

## Contratos

### C1 — `getAuthRedirect` (`src/lib/auth/auth-routes.ts`, puro, sin Clerk ni Next)

```ts
export type AuthRedirectInput = {
  isAuthenticated: boolean
  pathname: string                 // req.nextUrl.pathname
  search: string                   // req.nextUrl.search, "" o "?a=b"
  redirectUrlParam: string | null  // req.nextUrl.searchParams.get(REDIRECT_URL_PARAM)
}

/** Ruta interna a la que redirigir, o null si la petición sigue.
 *  - !isAuthenticated && isProtectedPath(pathname) → buildSignInHref(pathname + search)
 *  - isAuthenticated && isAuthPath(pathname)       → resolveAfterAuthPath(redirectUrlParam)
 *  - cualquier otro caso (incluye SSO_CALLBACK_PATH y /api/webhooks/clerk) → null */
export function getAuthRedirect(input: AuthRedirectInput): string | null
```

### C2 — Proxy (`src/proxy.ts`)

```ts
import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export default clerkMiddleware(async (auth, req) => {
  // const { isAuthenticated } = await auth()
  // const target = getAuthRedirect({ isAuthenticated, pathname: req.nextUrl.pathname, search: req.nextUrl.search,
  //                                  redirectUrlParam: req.nextUrl.searchParams.get(REDIRECT_URL_PARAM) })
  // if (target) return NextResponse.redirect(new URL(target, req.url))
})

export const config = { matcher: [/* los tres patrones actuales, sin cambios */] }
```

Sin `runtime` (Next 16 lo prohíbe en proxy). Es el único proxy del proyecto; no se crea `middleware.ts`.

### C3 — `ClerkProvider` (`src/app/layout.tsx`)

Se conserva el `appearance={{ theme: shadcn }}` actual y se agregan `signInUrl={SIGN_IN_PATH}`, `signUpUrl={SIGN_UP_PATH}` y `afterSignOutUrl={DEFAULT_AFTER_AUTH_PATH}`. Sin `dynamic` (haría dinámicas todas las páginas). `metadata`, fuente, `lang="es"` y `suppressHydrationWarning` no cambian.

### C4 — Páginas de auth (servidor, delgadas)

```tsx
// src/app/sign-in/[[...sign-in]]/page.tsx
export default async function SignInPage({ searchParams }: PageProps<"/sign-in/[[...sign-in]]">) {
  const { redirect_url } = await searchParams
  // <SignIn path={SIGN_IN_PATH} routing="path" signUpUrl={SIGN_UP_PATH}
  //         forceRedirectUrl={resolveAfterAuthPath(redirect_url)} />   (se conserva el contenedor centrado actual)
}
// src/app/sign-up/[[...sign-up]]/page.tsx: análogo con <SignUp path={SIGN_UP_PATH} routing="path"
//   signInUrl={SIGN_IN_PATH} forceRedirectUrl={...} />
```

El developer ajusta el tipo `PageProps<…>` al que genere Next para esas rutas. Sin lógica de negocio en `src/app` (solo composición y validación de un parámetro).

### C5 — Header y placeholder

- `site-header.tsx`: en los dos `UserButton` (desktop y móvil) se agregan hijos
  `<UserButton.MenuItems><UserButton.Link label="Mis entradas" href={MY_TICKETS_PATH} labelIcon={<Ticket …/>} /></UserButton.MenuItems>`. Todo lo demás del header queda igual. Si la API del hijo difiere en la versión instalada, se verifica en `node_modules/@clerk/**` y se reporta.
- `src/app/(site)/my-tickets/page.tsx`: página de servidor, `metadata: { title: "Mis entradas — Ticketera", robots: { index: false } }`, `Empty*` con icono `Ticket` en `EmptyMedia` (`size-14 rounded-2xl bg-primary/10 text-primary`), `<h1>` "Mis entradas", descripción "Muy pronto verás aquí todas tus entradas. Por ahora, las encuentras en la confirmación de cada compra." y enlace "Explorar eventos" → `/events` con el estilo del botón de `ConfirmationNotFound`. Composición sin lógica, **temporal** hasta la 016 (que usará `requireUser()` y `users.id`).
- `confirmation-not-found.tsx`: `export const MY_TICKETS_HREF = MY_TICKETS_PATH` (importado de `@/lib/auth/auth-routes`); se corrige el comentario ("placeholder protegido en la 013; vista real en la 016").

## Tareas

### Preparación (serie)

- **P1** Lógica de rutas, proxy y provider. Archivos:
  - `src/lib/auth/auth-routes.ts` (agregar `getAuthRedirect`, C1)
  - `src/lib/auth/auth-routes.test.ts` (ampliar)
  - `src/proxy.ts` (C2)
  - `src/app/layout.tsx` (C3)

  Pasos: implementar; `npm run lint` y `npm run test`. Con claves de Clerk, `npm run dev`: `/` responde 200 sin errores de Clerk y `/my-tickets` sin sesión redirige a `/sign-in?redirect_url=%2Fmy-tickets`.

### Paralelo (tras P1; archivos disjuntos; nadie corre `npm install` ni `npm run build`)

Verificación acotada: `npx vitest run <tests de la tarea>` y `npx eslint <archivos de la tarea>`.

- **T1** Páginas de auth con redirección validada (C4). Archivos: `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`.
- **T2** Header con "Mis entradas" (C5). Archivos: `src/components/shared/site-header.tsx`.
- **T3** Placeholder `/my-tickets` y constante compartida (C5). Archivos: `src/app/(site)/my-tickets/page.tsx`, `src/modules/checkout/components/confirmation-not-found.tsx`.

Tamaño: 9 archivos (3 de código lib/proxy/layout con 1 test, 5 de UI/páginas, 1 ajuste de 1 línea). Dependencias entre T1–T3: ninguna.

## Criterios de aceptación

**A. Configuración**
- [ ] AC1 Existe `src/proxy.ts` y **no** existe `middleware.ts` en la raíz ni en `src/`. El build no muestra el aviso de `middleware` deprecado.
- [ ] AC2 `ClerkProvider` recibe `signInUrl="/sign-in"`, `signUpUrl="/sign-up"` y `afterSignOutUrl="/"`, conserva `appearance={{ theme: shadcn }}` y no usa `dynamic`. La landing `/` sigue estática (`○`) en la salida de `npm run build`; si Clerk la volviera dinámica, el developer no lo fuerza: reporta `BLOCKED` con `origen: spec`.
- [ ] AC3 Ninguna clave en el repo: `git grep -nE "pk_(test|live)_|sk_(test|live)_"` sin resultados; `.env` y `.clerk/` no aparecen en `git status`.

**B. Protección de rutas (proxy)**
- [ ] AC4 Sin sesión, `/my-tickets` redirige a `/sign-in?redirect_url=%2Fmy-tickets`, `/organizer` a `/sign-in?redirect_url=%2Forganizer` y `/admin/users` a `/sign-in?redirect_url=%2Fadmin%2Fusers`.
- [ ] AC5 Sin sesión, `/events/clasico-del-futbol-final-de-temporada/checkout?tickets=evt-002-sur:2` redirige a `/sign-in?redirect_url=` + ruta y query codificadas. Tras ingresar se vuelve a ese checkout con `tickets=evt-002-sur:2` intacto. Lo mismo con un teatro (`tickets` + `seats`).
- [ ] AC6 Sin sesión siguen accesibles sin redirección: `/`, `/events`, `/events/{slug}`, `/events/{slug}/tickets`, `/events/{slug}/seats`, `/events/{slug}/confirmation?…` y `POST /api/webhooks/clerk` (este responde por su propia verificación de firma, nunca por redirección a `/sign-in`).
- [ ] AC7 Con sesión, `/sign-in` redirige a `/`; `/sign-in?redirect_url=%2Fevents` redirige a `/events`; con `redirect_url` = `https%3A%2F%2Fevil.com`, `%2F%2Fevil.com` o `%2Fsign-in`, redirige a `/`. Idem para `/sign-up`.
- [ ] AC8 `/sign-in?redirect_url=//evil.com` (sin sesión) muestra el formulario de Clerk y, tras ingresar, navega a `/`.
- [ ] AC9 Un usuario autenticado sin rol que abre `/admin/users` **no** es redirigido a `/sign-in` por el proxy y recibe 404 de `requireStaff` (la autorización la dan los guards de la 020, no el proxy ni `publicMetadata`).

**C. Header y Mis entradas**
- [ ] AC10 Sin sesión, el header conserva "Iniciar sesión"/"Registrarse" (desktop) e "Ingresar" (móvil), que abren el modal de Clerk. "Vender entradas" sigue con `href="#"`.
- [ ] AC11 Con sesión, el menú del `UserButton` (desktop y móvil) muestra "Mis entradas", que navega a `/my-tickets`. Cerrar sesión desde `/my-tickets` termina en `/` (o en `/sign-in` por el proxy), nunca en una página protegida sin sesión.
- [ ] AC12 `/my-tickets` con sesión muestra el placeholder con "Explorar eventos". `ConfirmationNotFound` → "Mis entradas" ya no da 404.

**D. Calidad**
- [ ] AC13 Nadie importa `@clerk/nextjs/legacy`, `SignedIn` ni `SignedOut`. `auth-routes.ts` no importa nada de Clerk ni de Next. Esta spec no lee `publicMetadata` ni `isOrganizer`.
- [ ] AC14 Sin hex en archivos nuevos. El resto del sitio (landing, búsqueda, detalle, selección, asientos, checkout con sesión, confirmación, `/admin`) funciona igual.
- [ ] AC15 `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests obligatorios

- **`src/lib/auth/auth-routes.test.ts`** (ampliar; los casos de `isProtectedPath`, `isAuthPath`, `getSafeRedirectPath`, `resolveAfterAuthPath` y `buildSignInHref` creados por la 020 se conservan sin cambios). Casos de `getAuthRedirect`:
  - sin sesión, `/my-tickets` → `/sign-in?redirect_url=%2Fmy-tickets`;
  - sin sesión, `/events/x/checkout` con `search: "?tickets=a:1,b:2&seats=s1"` → `/sign-in?redirect_url=` + `encodeURIComponent("/events/x/checkout?tickets=a:1,b:2&seats=s1")`;
  - sin sesión, `/admin/users` y `/organizer` → redirigen; `/`, `/events`, `/events/x/confirmation`, `/sso-callback`, `/api/webhooks/clerk` → `null`;
  - con sesión, `/sign-in` con `redirectUrlParam` `null` → `/`; `"/events"` → `/events`; `"https://evil.com"`, `"//evil.com"`, `"/sign-in"` → `/`; `/sign-up` y `/reset-password` igual;
  - con sesión, `/my-tickets`, `/admin`, `/events/x/checkout` y `/sso-callback` → `null`.
- Sin test unitario (SETUP): `src/proxy.ts` (lógica en `getAuthRedirect`), páginas de auth, `site-header.tsx` y `/my-tickets` (composición sin lógica); se verifican en manual.
- Los tests existentes (001–012, 019–023) siguen en verde sin cambios.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (requiere claves de Clerk en `.env`)
- **Manual** (`npm run dev`, ventana privada sin sesión y luego con sesión):
  - AC4–AC8: `/my-tickets`, `/organizer`, `/admin/users`, el checkout de `clasico-del-futbol-final-de-temporada` con `?tickets=evt-002-sur:2`, el de `noche-de-rock-sinfonico` tras elegir asientos y `/sign-in?redirect_url=https://evil.com`.
  - AC9: con un usuario cliente (sin staff), `/admin/users` → 404. Cambiar `publicMetadata` a mano en el Dashboard no cambia el resultado.
  - AC10–AC12: header en `/`, `/events` y `/my-tickets` con y sin sesión, en desktop y móvil, tema claro y oscuro.
- `git grep` de AC3 y AC13.

## Pasos manuales del usuario

| # | Cuándo | Qué hacer |
|---|---|---|
| **M1** | Antes de la verificación manual | Confirmar en `.env` las claves `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` (Dashboard de Clerk → API keys). |
| **M2** | Antes de AC5/AC7 | Tener en Clerk (Development) email+contraseña y Google habilitados, y teléfono/username desactivados (si no, el registro queda en `missing_requirements`). Un usuario de prueba con contraseña (Users → Create user) o ingresar con Google. |
| **M3** | Producción (fuera de alcance) | OAuth client propio de Google, dominio verificado y claves `pk_live_…`/`sk_live_…` como secretos del entorno (System Design §3.3). |

## Contratos que consumen specs posteriores

| Contrato | Archivo | Consumidor |
|---|---|---|
| `getAuthRedirect`, helpers y constantes de rutas | `src/lib/auth/auth-routes.ts` | 014 (`/sign-up`, `/reset-password` ya son rutas de auth), 016–018 |
| Proxy: sesión obligatoria en `/my-tickets/**`, `/organizer/**`, `/admin/**`, `/events/{slug}/checkout` | `src/proxy.ts` | 016–018 no repiten protección por proxy; usan guards de la 020 |
| Placeholder `/my-tickets` | `src/app/(site)/my-tickets/page.tsx` | 016 lo reemplaza |
| `MY_TICKETS_HREF` (= `MY_TICKETS_PATH`) | `src/modules/checkout/components/confirmation-not-found.tsx` | 016 ("Ver mis entradas") |

## Preguntas abiertas

1. **P1 — UI de auth: ¿se mantienen los componentes prearmados de Clerk (`<SignIn/>`, `<SignUp/>`, `UserButton`, con `theme: shadcn`) o se retoma la UI propia del diseño `Auth`/`AuthMobile` (formulario con zod, Google, Device Trust, shell partido, `/sso-callback`)?** Esta versión asume lo ya implementado (prearmados) y mueve la UI propia fuera de alcance, para ser una spec independiente si se desea. Implica también si se agrega `localization` esES de Clerk (`@clerk/localizations`) para traducir los textos de los componentes prearmados; hoy no hay. Afecta la 014.
2. **P2 — `/events/{slug}/checkout` protegido por proxy** (decisión previa del orquestador) y **confirmación pública** (D3): se conservan como estaban; confirmar al aprobar que siguen vigentes ahora que existe la DB.
