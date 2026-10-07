# 015 — Roles provisionales, guards de servidor y alta de organizador

- **Estado:** draft
- **Modo:** SDD
- **Módulo(s):**
  - `src/lib/auth/`: helper de rol `isOrganizer` y guards `requireUser`, `requireOrganizer` y `getOrganizerAccess` (System Design §4.3).
  - `src/modules/organizers` (módulo nuevo; dominio "organizers" de System Design §3.2): Server Action `becomeOrganizer` y CTA de alta.
  - `src/app/(site)/organizer`: `/organizer/onboarding` y el placeholder `/organizer`.
  - `src/modules/auth/components`: "Panel de organizador" en el menú y "Vender entradas" con destino real.
  - `src/components/shared/site-mobile-menu.tsx`: "Vender entradas" con destino real.
- **Depende de:** **013 en `done`** (proxy, `auth-routes`, `HeaderSessionActions`, `UserMenu`). No depende de la 014: se puede implementar antes o después.
- **Roadmap:** 013 Auth base e Ingresar · 014 Registro y recuperación · **015 Roles provisionales y alta de organizador (esta)** · 016 Mis entradas · 017 Panel de organizador · 018 Crear evento.

## Objetivo

1. Hay roles mínimos sin base de datos:
   - todo usuario autenticado es **cliente**;
   - **organizador** es quien tiene `user.publicMetadata.isOrganizer === true` en Clerk.

   **TEMPORAL** hasta que existan `users` y `organizer_profiles` (System Design §4.2).
2. Toda página o acción que lo necesite valida la sesión y el rol **en el servidor**, con `requireUser()` / `requireOrganizer()`. Ocultar botones no reemplaza la validación (System Design §4.3).
3. "Vender entradas" lleva a `/organizer`:
   - sin sesión → el proxy manda a ingresar;
   - con sesión y sin rol → `/organizer/onboarding`, donde el usuario activa su cuenta de organizador (Server Action `becomeOrganizer`);
   - con rol → el placeholder `/organizer`.

   Este alta reemplaza temporalmente el onboarding de Stripe (System Design §4.5).
4. El menú "Mi cuenta" muestra "Panel de organizador" solo a organizadores.

## Fuera de alcance

- Panel real (017) y crear evento (018). `/organizer` es un placeholder que la 017 reemplaza (y que puede mover a un route group con sidebar).
- Stripe Connect, `organizer_profiles`, el estado `onboarding`/`active`/`suspended`, roles de staff (`requireStaff`, admin, super admin) y la tabla `users`.
- Quitar el rol desde la app: solo desde el Dashboard (M4).
- Personalizar el session token de Clerk: los guards leen la metadata con `currentUser()` (Backend API), así no hace falta configurar claims.
- Cambios en el proxy: `/organizer/**` ya exige sesión desde la 013.

## Precondiciones

- 013 en `done`. `CLERK_SECRET_KEY` en `.env.local` (necesaria para `currentUser()` y `clerkClient()`).
- Sin dependencias npm nuevas.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `auth()`, `currentUser()`, `clerkClient()` | reutilizar (Clerk) | `@clerk/nextjs/server` | Verificado en 7.9.11: `auth()` es async y devuelve `isAuthenticated`/`userId`. `currentUser(): Promise<User \| null>`. `clerkClient(): Promise<ClerkClient>`. `users.updateUserMetadata(userId, { publicMetadata })` hace merge profundo; `updateUser({ publicMetadata })` está **deprecado** y no se usa. |
| `redirect` | reutilizar (Next) | `next/navigation` | En Server Components y Server Actions. |
| `buildSignInHref`, `ORGANIZER_PATH`, `ORGANIZER_ONBOARDING_PATH` | reutilizar | `src/lib/auth/auth-routes.ts` (013) | |
| Helper de rol | crear | `src/lib/auth/roles.ts` | Puro. Lo usan el header (cliente) y los guards (servidor): va a `src/lib/auth/`. |
| Guards | crear | `src/lib/auth/guards.ts` | System Design §4.3. |
| `becomeOrganizer` | crear | `src/modules/organizers/actions/become-organizer.ts` | Server Action (`"use server"`). Va en el módulo de dominio, no en `src/app` (SETUP §1.2). |
| CTA de alta | crear | `src/modules/organizers/components/organizer-onboarding.tsx` | |
| `Empty*`, `Button` | reutilizar | `src/components/ui` | Placeholder de `/organizer` y CTA. |
| `UserMenu`, `HeaderSessionActions` | extender | `src/modules/auth/components/` | |
| `SiteMobileMenu` | extender | `src/components/shared/site-mobile-menu.tsx` | "Vender entradas" `href="#"` → `ORGANIZER_PATH`. |

## Decisiones

### D1 — Organizador por `publicMetadata` y leído con `currentUser()` (TEMPORAL)

- `publicMetadata` solo se escribe desde el Backend API, así que el usuario no puede auto-asignarse el rol desde el navegador.
- Los guards leen la metadata con `currentUser()`, que es una llamada al Backend API por request. Así están siempre al día y no dependen del session token, que tarda hasta su refresco en reflejar cambios.
- El proxy **no** mira el rol (013 D5).
- Cuando exista la base:
  - `requireUser()` exigirá la fila en `users`;
  - `requireOrganizer()` exigirá `organizer_profiles.status = 'active'`;
  - `publicMetadata` pasará a ser solo una copia (System Design §4.2).

### D2 — "Vender entradas" → `/organizer` en todos los estados

Un único destino resuelve los tres casos sin lógica en el header:

1. sin sesión, el proxy redirige a `/sign-in?redirect_url=%2Forganizer`;
2. con sesión y sin rol, `requireOrganizer` redirige a `/organizer/onboarding`;
3. con rol, se ve el panel (placeholder).

### D3 — La acción devuelve un resultado; el cliente refresca y navega

- `becomeOrganizer()` no hace `redirect()`: devuelve `{ ok: true }` o `{ ok: false, message }`.
- Si sale bien, el CTA:
  1. llama a `await user.reload()` (`useUser`), para que el menú "Mi cuenta" muestre de inmediato "Panel de organizador";
  2. navega con `router.push(ORGANIZER_PATH)`.
- Si la acción redirigiera, el `user` del cliente quedaría con la metadata vieja hasta recargar.
- La acción valida la sesión con `requireUser()`: sin sesión redirige a ingresar. Es idempotente.

### D4 — Ubicación de las páginas

- `/organizer` y `/organizer/onboarding` viven en `src/app/(site)/organizer/…`, con el header y el footer del sitio, porque hoy son pantallas simples.
- La 017 decidirá si el panel pasa a un route group propio con sidebar (diseño `OrgDashboard`). Mover la página no cambia las rutas.

## Contratos

### C1 — Rol (`src/lib/auth/roles.ts`)

```ts
/** TEMPORAL (sin base de datos): clave de publicMetadata que marca a un organizador. */
export const ORGANIZER_METADATA_KEY = "isOrganizer"
/** true solo si publicMetadata es un objeto (no null ni array) y publicMetadata.isOrganizer === true (estricto). */
export function isOrganizer(publicMetadata: unknown): boolean
```

### C2 — Guards (`src/lib/auth/guards.ts`, solo servidor)

```ts
export type GuardOptions = { returnTo?: string }   // ruta interna a la que volver tras ingresar
export type SessionUser = { userId: string }
export type OrganizerUser = { userId: string; displayName: string | null; email: string | null }
export type OrganizerAccess = "signed-out" | "customer" | "organizer"

/** auth(): sin sesión → redirect(buildSignInHref(options?.returnTo)). No llama al Backend API. */
export async function requireUser(options?: GuardOptions): Promise<SessionUser>

/** currentUser(): null → "signed-out"; isOrganizer(user.publicMetadata) → "organizer"; si no → "customer". */
export async function getOrganizerAccess(): Promise<OrganizerAccess>

/** Sin sesión → redirect(buildSignInHref(options?.returnTo)); cliente → redirect(ORGANIZER_ONBOARDING_PATH);
 *  organizador → { userId: user.id, displayName: user.fullName, email: user.primaryEmailAddress?.emailAddress ?? null }. */
export async function requireOrganizer(options?: GuardOptions): Promise<OrganizerUser>
```

- Importa de `@clerk/nextjs/server` y `next/navigation`.
- Cada función lleva un comentario **TEMPORAL** con lo que cambiará con la base (D1).

### C3 — Server Action (`src/modules/organizers/actions/become-organizer.ts`)

```ts
"use server"
export type BecomeOrganizerResult = { ok: true } | { ok: false; message: string }
/** 1. const { userId } = await requireUser({ returnTo: ORGANIZER_ONBOARDING_PATH })
 *  2. const client = await clerkClient()
 *     await client.users.updateUserMetadata(userId, { publicMetadata: { [ORGANIZER_METADATA_KEY]: true } })
 *  3. { ok: true }
 *  Si el paso 2 lanza → { ok: false, message: "No pudimos activar tu cuenta de organizador. Inténtalo de nuevo." }.
 *  El redirect de requireUser (sin sesión) no se captura: se deja propagar. */
export async function becomeOrganizer(): Promise<BecomeOrganizerResult>
```

### C4 — CTA (`src/modules/organizers/components/organizer-onboarding.tsx`, `"use client"`)

```ts
export function OrganizerOnboarding(): React.JSX.Element
```

Textos de criterio propio (el diseño no trae esta pantalla). Layout: `mx-auto max-w-xl px-4 py-16 md:py-24`, tarjeta `rounded-3xl border border-border bg-card p-6 md:p-10`.

- Tile de icono `Store` (`size-14 rounded-2xl bg-primary/10 text-primary`, icono `aria-hidden`).
- `<h1>` "Vende entradas con Ticketera" (`text-2xl md:text-3xl font-bold tracking-tight`).
- `<p>` "Activa tu cuenta de organizador para crear eventos y vender entradas desde tu panel." (`text-muted-foreground`).
- `<p>` (`text-sm text-muted-foreground`): "Por ahora es una cuenta de prueba: todavía no se procesan pagos reales."
- **Botón** "Activar cuenta de organizador":
  - variante default (`bg-primary`), `h-13.5 w-full rounded-2xl text-base font-semibold sm:w-auto sm:px-7`;
  - en carga: `disabled` + `focusableWhenDisabled` + `aria-busy` + `Loader2` (`motion-reduce:animate-none`), con guard `useRef` contra doble clic.
- **Flujo:**
  1. `await becomeOrganizer()`;
  2. `ok` → `await user?.reload()` → `router.push(ORGANIZER_PATH)`. El botón sigue en carga hasta navegar;
  3. no `ok`, o la promesa rechaza → `<p role="alert" className="text-sm text-destructive">` con el `message` (o "No pudimos activar tu cuenta de organizador. Inténtalo de nuevo." si rechazó) y el botón se rehabilita.

### C5 — Páginas

- **`src/app/(site)/organizer/onboarding/page.tsx`:**
  - `metadata: { title: "Vende entradas — Ticketera", robots: { index: false } }`;
  - `const access = await getOrganizerAccess()`:
    - `"signed-out"` → `redirect(buildSignInHref(ORGANIZER_ONBOARDING_PATH))` (defensa en profundidad; el proxy ya lo cubre);
    - `"organizer"` → `redirect(ORGANIZER_PATH)`;
    - si no → `<OrganizerOnboarding />`.
- **`src/app/(site)/organizer/page.tsx`** (placeholder **temporal**, la 017 lo reemplaza):
  - `metadata: { title: "Panel de organizador — Ticketera", robots: { index: false } }`;
  - `await requireOrganizer({ returnTo: ORGANIZER_PATH })`;
  - compone `Empty*` como `ConfirmationNotFound`:
    - icono `LayoutDashboard`;
    - `<h1>` "Panel de organizador";
    - "Tu cuenta de organizador está activa. Muy pronto podrás crear eventos y ver tus ventas aquí.";
    - link "Volver al inicio" → `/`.

### C6 — Header (cambios sobre la 013, C11)

```ts
export type UserMenuProps = {
  variant: "desktop" | "mobile"
  displayName: string | null
  email: string | null
  isOrganizer: boolean          // nuevo
  onSignOut: () => void
}
```

- **`UserMenu`:** si `isOrganizer`, agrega `DropdownMenuItem render={<Link href={ORGANIZER_PATH} />}` con icono `LayoutDashboard` + "Panel de organizador", justo después de "Mis entradas" y antes del separador de "Cerrar sesión".
- **`HeaderSessionActions`:**
  - pasa `isOrganizer={isOrganizer(user.publicMetadata)}`;
  - el link "Vender entradas" (desktop, en todos los estados) pasa de `href="#"` a `Link href={ORGANIZER_PATH}`.
- **`SiteMobileMenu`:** el `<a href="#">Vender entradas</a>` pasa a `<Link href={ORGANIZER_PATH} onClick={() => setOpen(false)}>`, con las mismas clases.

## Tareas

### Preparación (serie)

- **P1** Rol y guards. Archivos:
  - `src/lib/auth/roles.ts` (C1)
  - `src/lib/auth/roles.test.ts`
  - `src/lib/auth/guards.ts` (C2)
  - `src/lib/auth/guards.test.ts`

  Al terminar: `npm run lint` y `npm run test`.

### Paralelo (tras P1; archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Alta de organizador. Archivos:
  - `src/modules/organizers/actions/become-organizer.ts` (C3)
  - `src/modules/organizers/actions/become-organizer.test.ts`
  - `src/modules/organizers/components/organizer-onboarding.tsx` (C4)
  - `src/modules/organizers/components/organizer-onboarding.test.tsx`
  - `src/app/(site)/organizer/onboarding/page.tsx` (C5)
  - `src/app/(site)/organizer/page.tsx` (C5)
- **T2** Header. Archivos:
  - `src/modules/auth/components/user-menu.tsx` (C6)
  - `src/modules/auth/components/header-session-actions.tsx` (C6)
  - `src/modules/auth/components/header-session-actions.test.tsx`
  - `src/components/shared/site-mobile-menu.tsx` (C6)

Verificación acotada: `npx vitest run <tests de la tarea>` y `npx eslint <archivos de la tarea>`. El reviewer corre el build.

**Tamaño:** 14 archivos (7 de código, 5 de test y 2 páginas).

## Criterios de aceptación

- [ ] AC1 Sin sesión, "Vender entradas" (desktop y menú móvil) lleva a `/sign-in?redirect_url=%2Forganizer`. Tras ingresar con un usuario sin rol, se termina en `/organizer/onboarding`.
- [ ] AC2 `/organizer/onboarding` muestra "Vende entradas con Ticketera", la nota de cuenta de prueba y "Activar cuenta de organizador".
- [ ] AC3 Al pulsar "Activar cuenta de organizador":
  - el botón queda en carga (`aria-busy`, `aria-disabled`, foco conservado, sin doble envío);
  - en el Dashboard, el usuario queda con `publicMetadata` `{ "isOrganizer": true }`, conservando cualquier otra clave;
  - se navega a `/organizer`, con el placeholder "Panel de organizador".
- [ ] AC4 Sin recargar, el menú "Mi cuenta" ya muestra "Panel de organizador" y lleva a `/organizer`. Un usuario sin rol no ve ese ítem.
- [ ] AC5 Un organizador que entra a `/organizer/onboarding` es redirigido a `/organizer`. Un cliente que entra a `/organizer` es redirigido a `/organizer/onboarding`.
- [ ] AC6 Si `updateUserMetadata` falla (p. ej. con una `CLERK_SECRET_KEY` inválida), se ve "No pudimos activar tu cuenta de organizador. Inténtalo de nuevo." (`role="alert"`) y el botón se rehabilita.
- [ ] AC7 Marcar un usuario como organizador desde el Dashboard (M4) y recargar: tiene acceso a `/organizer` y ve "Panel de organizador". Quitar la clave y recargar: `/organizer` lo manda al onboarding.
- [ ] AC8 `roles.ts` no importa nada de Clerk. `guards.ts` y `become-organizer.ts` no se importan desde ningún componente cliente (salvo la acción, vía su referencia de Server Action). `updateUser(` no aparece en `src/` (`git grep`).
- [ ] AC9 Lo de la 013 (y la 014, si ya está) sigue funcionando: ingreso, header, cerrar sesión y protección de rutas.

## Tests obligatorios

- **`src/lib/auth/roles.test.ts`** — `isOrganizer`:
  - `true` solo con `{ isOrganizer: true }` (y con otras claves extra);
  - `false` con `{ isOrganizer: "true" }`, `{ isOrganizer: 1 }`, `{ isOrganizer: false }`, `{}`, `null`, `undefined`, `[]`, `"isOrganizer"`.
- **`src/lib/auth/guards.test.ts`** (`vi.mock("@clerk/nextjs/server")` para `auth`/`currentUser`; `vi.mock("next/navigation")` con un `redirect` que lanza un error centinela con la URL):
  - `requireUser`:
    - con sesión → `{ userId }`;
    - sin sesión → redirect a `/sign-in`;
    - con `{ returnTo: "/organizer" }` → redirect a `/sign-in?redirect_url=%2Forganizer`.
  - `getOrganizerAccess`: los 3 valores.
  - `requireOrganizer`:
    - organizador → `{ userId, displayName, email }`;
    - cliente → redirect a `/organizer/onboarding`;
    - sin usuario → redirect a ingresar.
- **`src/modules/organizers/actions/become-organizer.test.ts`** (`vi.mock("@/lib/auth/guards")`, `vi.mock("@clerk/nextjs/server")` con un `clerkClient` fake):
  - éxito → `updateUserMetadata` recibió `("user_123", { publicMetadata: { isOrganizer: true } })` y devuelve `{ ok: true }`;
  - `updateUserMetadata` rechaza → `{ ok: false, message: … }`;
  - `requireUser` lanza (redirect) → la acción propaga el error y no llama a `updateUserMetadata`.
- **`src/modules/organizers/components/organizer-onboarding.test.tsx`** (`vi.mock` de la acción, `useUser` y `useRouter`):
  - éxito → `reload` y luego `push("/organizer")`;
  - en carga → `aria-busy`, y un segundo clic no llama otra vez a la acción;
  - `{ ok: false }` → alerta con el mensaje y el botón rehabilitado;
  - rechazo → mensaje por defecto.
- **`src/modules/auth/components/header-session-actions.test.tsx`** (ampliar):
  - "Vender entradas" tiene `href="/organizer"`;
  - con `publicMetadata: { isOrganizer: true }`, el menú incluye "Panel de organizador" (`href="/organizer"`) entre "Mis entradas" y "Cerrar sesión";
  - sin la metadata, el ítem no existe;
  - los casos de la 013 siguen en verde.

`organizer/page.tsx`, `organizer/onboarding/page.tsx` y `site-mobile-menu.tsx` no requieren test unitario: son composición. La lógica está en los guards, con tests.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- **Manual** (`npm run dev`):
  - AC1–AC5 con un usuario nuevo;
  - AC6 cambiando temporalmente `CLERK_SECRET_KEY` por un valor inválido en `.env.local` y reiniciando `dev` (luego restaurarla);
  - AC7 con M4.

## Pasos manuales del usuario

| # | Cuándo | Qué hacer |
|---|---|---|
| **M4** | Para AC7, o como alternativa al alta desde la app | Dashboard de Clerk → **Users** → elegir el usuario → **Metadata** → **Public** → `{ "isOrganizer": true }` → Save. Para quitar el rol, borrar la clave o poner `false`. El header lo refleja al recargar la página. Los guards lo reflejan en el siguiente request. |

## Contratos que consumen 016–018

| Contrato | Archivo | Consumidor |
|---|---|---|
| `requireUser(options?)` → `{ userId }` | `src/lib/auth/guards.ts` | 016 (Mis entradas: página y acciones) |
| `requireOrganizer(options?)` → `{ userId, displayName, email }` | `src/lib/auth/guards.ts` | 017 (panel), 018 (crear evento: página y Server Action) |
| `getOrganizerAccess()` | `src/lib/auth/guards.ts` | Pantallas que necesitan el rol sin forzar una redirección |
| `isOrganizer(publicMetadata)`, `ORGANIZER_METADATA_KEY` | `src/lib/auth/roles.ts` | UI cliente que muestre u oculte accesos de organizador |
| Placeholder `/organizer` | `src/app/(site)/organizer/page.tsx` | 017 lo reemplaza (puede moverlo a un route group propio) |
| "Panel de organizador" en `UserMenu` | `src/modules/auth/components/user-menu.tsx` | 017 (sin cambios esperados) |

## Preguntas abiertas

Ninguna bloqueante. Hay criterio propio revisable al aprobar: los textos de `/organizer/onboarding` y el destino único de "Vender entradas" (D2).
