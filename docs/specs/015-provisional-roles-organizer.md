# 015 — Pantalla "Solicita acceso" de organizador y destino de "Vender entradas"

- **Estado:** draft
- **Modo:** SDD
- **Actualizada tras 019–023** (2026-10-08). Reescrita: la versión original (roles provisionales en `publicMetadata` y auto-alta `becomeOrganizer`) fue reemplazada por 020/021/023. Esta versión cubre solo lo que falta.
- **Módulo(s):**
  - `src/modules/organizers` (módulo nuevo; dominio "organizers", System Design §3.2): vista informativa y utilidad de estado.
  - `src/app/(site)/organizer`: `/organizer/onboarding` y placeholder `/organizer`.
  - `src/components/shared`: destino real de "Vender entradas".
- **Depende de:** 020 `done` (guards y `getAccessContext` ya existen en `src/lib/auth/guards.ts`). No depende de 013/014: hoy el header usa `UserButton` de Clerk (013 sigue en draft).
- **Roadmap:** 013 Auth base · 014 Registro · **015 Pantalla "solicita acceso" (esta)** · 016 Mis entradas · 017 Panel de organizador · 018 Crear evento.

## Reemplazado por 020/021/023

| Parte original de la 015 | Estado | Dónde quedó |
|---|---|---|
| Rol organizador en `publicMetadata.isOrganizer` (D1, C1) | Reemplazado | Los roles salen de la DB (`users.staff_role`, `organizer_profiles.status`). `src/lib/auth/roles.ts` queda solo como pista de UI (020 C1). |
| Guards `requireUser`, `requireOrganizer`, `getOrganizerAccess` (C2) | Hecho, con otro contrato | `src/lib/auth/guards.ts` (020): `requireUser` devuelve `AccessContext`; `requireOrganizer` exige `status = 'active'` y devuelve `organizerId`; además `requireStaff`, `requirePermission`, `checkPermission`, `getAccessContext`. Permisos en `src/lib/auth/permissions.ts`. |
| `becomeOrganizer` y CTA "Activar cuenta de organizador" (C3, C4, D3) | Descartado | Decisión Q2 (020): no hay auto-alta. Solo el super admin crea y aprueba organizadores desde `/admin/users` (021/023). |
| `P1` roles/guards con tests | Hecho | 020. |
| `ORGANIZER_PATH`, `ORGANIZER_ONBOARDING_PATH` | Hecho | `src/lib/auth/auth-routes.ts`. |
| Ítem "Administración" en el menú | Fuera de esta spec | 021 TB4 (condicionado a `UserMenu`, que depende de 013). |

## Objetivo

1. `/organizer/onboarding`, destino al que ya redirige `requireOrganizer`, existe y muestra una pantalla informativa según el estado real del usuario, sin acción de auto-alta:
   - sin perfil de organizador: "solicita acceso";
   - perfil `onboarding`: solicitud pendiente de aprobación;
   - perfil `suspended`: cuenta suspendida.
2. "Vender entradas" (desktop y menú móvil) lleva a `/organizer` en vez de `#`.
3. `/organizer` no da 404 para un organizador `active`: placeholder temporal que la 017 reemplaza.

## Fuera de alcance

- Cualquier forma de solicitud automática (formulario, `becomeOrganizer`, escritura de metadata): descartado por Q2. Si luego se quiere un formulario de solicitud, es otra spec.
- Panel real (017) y crear evento (018). Stripe Connect (§4.5).
- `UserMenu`/"Panel de organizador"/"Administración" en el menú de sesión: dependen de 013 (hoy `UserButton`); se tratan allí o en 021 TB4.
- Cambios en guards, permisos, proxy o DB.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `getAccessContext`, `requireOrganizer` | reutilizar | `src/lib/auth/guards.ts` | `getAccessContext()` da `organizer: { id, status } \| null`, memoizado por request. `getOrganizerAccess` no distingue `onboarding`/`suspended` (devuelve `customer`), por eso no basta aquí. |
| `buildSignInHref`, `ORGANIZER_PATH`, `ORGANIZER_ONBOARDING_PATH` | reutilizar | `src/lib/auth/auth-routes.ts` | |
| `OrganizerStatus` | reutilizar | `src/lib/auth/permissions.ts` | |
| `Empty*`, `Button` | reutilizar | `src/components/ui` | Ya existen (`empty.tsx`). Ver `ConfirmationNotFound` como patrón de composición. |
| Estado → contenido de la pantalla | crear | `src/modules/organizers/utils/onboarding-state.ts` | Función pura, testeable; evita lógica condicional en la página. |
| Vista informativa | crear | `src/modules/organizers/components/organizer-access-info.tsx` | Componente de presentación (sin `"use client"`). |
| Link "Vender entradas" | extender | `src/components/shared/site-header.tsx`, `site-mobile-menu.tsx` | `<a href="#">` → `Link href={ORGANIZER_PATH}`. |
| `ADMIN_PATH` | reutilizar | `src/lib/auth/auth-routes.ts` | No se usa aquí. |

## Decisiones

### D1 — Un único destino para "Vender entradas"

`/organizer` resuelve todos los casos sin lógica en el header:

1. sin sesión: el proxy manda a `/sign-in?redirect_url=%2Forganizer`;
2. con sesión y sin perfil `active`: `requireOrganizer` redirige a `/organizer/onboarding`;
3. organizador `active`: placeholder del panel.

### D2 — La pantalla lee la DB, no `getOrganizerAccess`

`/organizer/onboarding` usa `getAccessContext()` (memoizado, sin segunda consulta) para conocer `organizer.status` y mostrar el mensaje correcto.

### D3 — Sin acción en la pantalla

No hay botón que escriba datos. La pantalla informa y ofrece "Volver al inicio". El canal para solicitar acceso queda en Preguntas abiertas.

## Contratos

### C1 — Estado de la pantalla (`src/modules/organizers/utils/onboarding-state.ts`)

```ts
import type { OrganizerStatus } from "@/lib/auth/permissions"

export type OnboardingVariant = "request-access" | "pending" | "suspended"
export type OnboardingContent = { variant: OnboardingVariant; title: string; description: string }

/** null (sin perfil) → request-access; "onboarding" → pending; "suspended" → suspended.
 *  "active" no tiene contenido: la página redirige a ORGANIZER_PATH antes de llamar. */
export function getOnboardingContent(status: Exclude<OrganizerStatus, "active"> | null): OnboardingContent
```

Textos (criterio propio; el diseño no trae esta pantalla):

| variant | title | description |
|---|---|---|
| `request-access` | "Solicita acceso para vender entradas" | "Las cuentas de organizador las habilita el equipo de Ticketera. Solicita acceso y te avisaremos cuando tu cuenta esté lista." |
| `pending` | "Tu solicitud está en revisión" | "Tu cuenta de organizador aún no está aprobada. Te avisaremos cuando puedas crear eventos." |
| `suspended` | "Tu cuenta de organizador está suspendida" | "No puedes crear ni gestionar eventos por ahora. Contacta al equipo de Ticketera para más información." |

### C2 — Vista (`src/modules/organizers/components/organizer-access-info.tsx`)

```ts
export type OrganizerAccessInfoProps = { content: OnboardingContent }
export function OrganizerAccessInfo(props: OrganizerAccessInfoProps): React.JSX.Element
```

- Layout: `mx-auto max-w-xl px-4 py-16 md:py-24`, tarjeta `rounded-3xl border border-border bg-card p-6 md:p-10`.
- Tile de icono `aria-hidden` (`size-14 rounded-2xl bg-primary/10 text-primary`): `Store` (request-access), `Clock` (pending), `Ban` (suspended, con `bg-destructive/10 text-destructive`).
- `<h1>` con `title` (`text-2xl md:text-3xl font-bold tracking-tight`); `<p>` con `description` (`text-muted-foreground`).
- Link "Volver al inicio" → `/` (Button variante outline, vía `render={<Link />}` de base-nova).

### C3 — Páginas

- **`src/app/(site)/organizer/onboarding/page.tsx`**:
  - `metadata: { title: "Vender entradas — Ticketera", robots: { index: false } }`;
  - `const ctx = await getAccessContext()`;
    - `null` → `redirect(buildSignInHref(ORGANIZER_ONBOARDING_PATH))` (sin sesión o usuario desactivado; defensa en profundidad, el proxy ya cubre sin sesión);
    - `ctx.organizer?.status === "active"` → `redirect(ORGANIZER_PATH)`;
    - si no → `<OrganizerAccessInfo content={getOnboardingContent(ctx.organizer?.status ?? null)} />`.
  - Nota: un usuario desactivado hace que `requireUser` redirija a `/`; para evitar bucle de redirects, este caso (`null` con sesión) debe terminar en `/` y no en sign-in. El developer resuelve usando `requireUser({ returnTo: ORGANIZER_ONBOARDING_PATH })` en lugar de `getAccessContext()` (mismo resultado, ya cubre ambos casos).
- **`src/app/(site)/organizer/page.tsx`** (placeholder **TEMPORAL**, la 017 lo reemplaza):
  - `metadata: { title: "Panel de organizador — Ticketera", robots: { index: false } }`;
  - `await requireOrganizer({ returnTo: ORGANIZER_PATH })`;
  - compone `Empty*`: icono `LayoutDashboard`, `<h1>` "Panel de organizador", "Tu cuenta de organizador está activa. Muy pronto podrás crear eventos y ver tus ventas aquí.", link "Volver al inicio" → `/`.

### C4 — Links "Vender entradas"

- `site-header.tsx`: `<a href="#">` → `<Link href={ORGANIZER_PATH}>` con las mismas clases.
- `site-mobile-menu.tsx`: igual, con `onClick={() => setOpen(false)}`.

## Tareas

### Paralelo (archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Pantalla de acceso. Archivos:
  - `src/modules/organizers/utils/onboarding-state.ts` (C1)
  - `src/modules/organizers/utils/onboarding-state.test.ts`
  - `src/modules/organizers/components/organizer-access-info.tsx` (C2)
  - `src/modules/organizers/components/organizer-access-info.test.tsx`
  - `src/app/(site)/organizer/onboarding/page.tsx` (C3)
  - `src/app/(site)/organizer/page.tsx` (C3)
- **T2** Links de "Vender entradas". Archivos:
  - `src/components/shared/site-header.tsx` (C4)
  - `src/components/shared/site-mobile-menu.tsx` (C4)

Verificación acotada: `npx vitest run <tests de la tarea>` y `npx eslint <archivos de la tarea>`. El reviewer corre el build.

**Tamaño:** 8 archivos (4 de código, 2 de test y 2 páginas).

## Criterios de aceptación

- [ ] AC1 Sin sesión, "Vender entradas" (desktop y móvil) lleva a `/sign-in?redirect_url=%2Forganizer`.
- [ ] AC2 Un usuario autenticado sin perfil de organizador que abre `/organizer` es redirigido a `/organizer/onboarding` y ve "Solicita acceso para vender entradas". No hay botón que modifique datos.
- [ ] AC3 Con perfil `onboarding` ve "Tu solicitud está en revisión"; con `suspended` ve "Tu cuenta de organizador está suspendida".
- [ ] AC4 Un organizador `active` que abre `/organizer/onboarding` es redirigido a `/organizer` y ve el placeholder "Panel de organizador" (sin 404).
- [ ] AC5 Tras "Aprobar" desde `/admin/users` (021/023), el usuario pendiente accede a `/organizer` en el siguiente request, sin cerrar sesión.
- [ ] AC6 Un usuario desactivado no entra en bucle de redirects (termina en `/`).
- [ ] AC7 No se escribe `publicMetadata` ni se crea `becomeOrganizer` (`git grep becomeOrganizer src/` vacío).
- [ ] AC8 `OrganizerAccessInfo` y las páginas no importan `@clerk/nextjs/server` directamente; el acceso a rol pasa por `src/lib/auth/guards.ts`.
- [ ] AC9 Lo existente (login, header, rutas de compra, `/admin`) sigue funcionando.

## Tests obligatorios

- **`src/modules/organizers/utils/onboarding-state.test.ts`** — `null` → `request-access`; `"onboarding"` → `pending`; `"suspended"` → `suspended`; cada resultado con `title` y `description` no vacíos.
- **`src/modules/organizers/components/organizer-access-info.test.tsx`** — renderiza `<h1>` y descripción de cada variante; link "Volver al inicio" con `href="/"`; no hay `button` de acción.

Las páginas y los links no requieren test unitario (composición). La lógica de roles ya está testeada en 020 (`guards.test.ts`).

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- **Manual** (`npm run dev`): AC1–AC6 con un usuario cliente, uno `onboarding` y uno `suspended` (crear/cambiar estado desde `/admin/users`, o con la seed de 022).

## Contratos que consumen otras fases

| Contrato | Archivo | Consumidor |
|---|---|---|
| Placeholder `/organizer` | `src/app/(site)/organizer/page.tsx` | 017 lo reemplaza (puede moverlo a un route group con sidebar sin cambiar la ruta). |
| `requireOrganizer()` → `{ userId, organizerId, displayName, email }` | `src/lib/auth/guards.ts` (020) | 017, 018. |
| `requireUser()` → `AccessContext` | `src/lib/auth/guards.ts` (020) | 016. |

## Preguntas abiertas

1. **Canal para "solicitar acceso".** Q2 dice pantalla informativa, no auto-servicio, pero no define cómo pide acceso el usuario. Opciones: (a) solo texto sin canal (la spec actual); (b) `mailto:` o link de contacto (¿qué dirección/URL?); (c) formulario que cree un perfil `onboarding` (contradice "no auto-alta"; sería otra spec). La spec asume (a) y los textos de C1 prometen "te avisaremos": ¿se confirma o se cambia el texto?
2. **Actualización de dependencias entre specs.** 013 sigue en `draft` y el header usa `UserButton`; los ítems "Panel de organizador" y "Administración" del menú se difieren a 013/021 TB4. ¿Se acepta, o se quiere que esta spec los agregue sobre `UserButton` (p. ej. `UserButton.MenuItems`)?
