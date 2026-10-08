# 021 — Administración de usuarios: invitar/crear administradores y organizadores, roles, suspensión y desactivación (Bloque B)

- **Estado:** done (TB4 reemplazada por el sidebar de la spec 023; UI de TB3 rediseñada en 023)
- **Aprobación:** aprobada por el usuario con defaults Q1–Q9 (ver "Decisiones aprobadas").
- **Modo:** SDD
- **Módulo(s):**
  - `src/modules/users` (extiende 020): `user-roles.service.ts`.
  - `src/modules/admin` (módulo nuevo): Server Actions, schemas y UI de administración de usuarios.
  - `src/modules/auth` (solo `user-menu.tsx`, acceso desde el header).
  - `src/app/(admin)/admin/**` (routing delgado).
- **Fuentes:** System Design §3.4 (variables), §4.1 (espejo y webhook), §4.2 (roles, la base manda), §4.3 (guards), §4.4 (matriz), §4.5 (alta de organizador), §6.4 (`users`, `organizer_profiles`, `webhook_events`, `audit_logs`, catálogo y eventos). Spec 019 (esquema). Specs 013, 014, 015 (auth, ver "Relación con 013–015").
- **Depende de:** **020 `done`** (esquema `0001` con `user_invitations` y `users.deactivated_at`, guards, `permissions.ts`, `roles.ts`, `usersService`, `clerkAdminService`, `auditService`, `slugify`, webhook). Los contratos C0–C5 de 020 se consumen tal cual; aquí no se redefinen.
- **Specs hermanas:** 020 (identidad, Bloque A) y 022 (seed, Bloque C, independiente de esta).

## Objetivo

2. **Bloque B — Administración.** El super admin (y, con permisos acotados, el admin) gestiona desde `/admin/users`: lista de usuarios, invitar/crear administradores y organizadores, cambiar rol, suspender organizadores y desactivar usuarios. Todo con guard server-side y registro en `audit_logs`.

## Fuera de alcance

- Stripe Connect y `account.updated` (§4.5 pasos 2–4): el organizador creado por un admin queda `active` **TEMPORAL** (D5).
- Pasar `eventsService`/`seatingService`/`checkoutService` a Drizzle y retirar los mocks; Mis entradas (016), panel (017) y crear evento (018) sobre la DB.
- Permisos por usuario (overrides) o roles personalizados: los permisos se derivan del rol (D2, Q4).
- Crear usuarios con contraseña desde la Backend API (`users.createUser`): se usa **invitación** (D6).
- Asignar `super_admin` desde la UI o API: solo por bootstrap (D4).
- `platform_settings` (fila `id = 1`) y su pantalla; el seed no la crea.
- Manejo del `__clerk_ticket` de invitaciones en el formulario propio de sign-up (014): aceptado (Q7), el rol se aplica por email verificado.
- Reasignar eventos entre organizadores, borrar usuarios, exportar, buscar por texto completo.
- Cron, Stripe webhooks, `src/lib/env.ts`.
- **Ejecutar el seed**, aplicar la migración a producción.
- Bloques A y C de la spec original: identidad/sync/guards (020) y seed (022).
- Pantalla informativa "solicita acceso" para clientes (Q2) y `becomeOrganizer`: spec posterior.

## Decisiones

### D1 — La DB manda; Clerk solo autentica
- `auth()` da identidad (`userId` de Clerk); permisos y rol salen de `users`/`organizer_profiles` por `clerk_user_id` en **cada request** protegido (memoizado con `React.cache`). No se personaliza el session token ni se leen claims (consistente con 015 D1). El proxy solo exige sesión en `/admin/**` (se agrega a `isProtectedPath`); la autorización real vive en layout, páginas y acciones.
- Usuario desactivado (`deactivated_at` no nulo) o anonimizado (`deleted_at`): los guards lo tratan como sin acceso (`redirect("/")`), aunque su sesión de Clerk siga viva.

### D2 — Modelo de permisos: rol → permisos (matriz en código)
- Roles: cliente (implícito), organizador (`organizer_profiles.status = 'active'`), `admin`, `super_admin`. Un usuario puede ser organizador **y** staff: permisos = unión.
- La matriz traduce System Design §4.4 a permisos con nombre (C1). `super_admin` ⊇ `admin`. El permiso `organizer:*` solo aplica con perfil `active`.
- **Quién otorga qué** (regla pura `canManage`, C1):

  | Acción | Permiso requerido | Quién |
  |---|---|---|
  | `grant-admin` / `revoke-admin` | `staff:manage` | super admin |
  | `create-organizer` (perfil + invitación) | `organizers:manage` | super admin (Q3: solo super admin; el admin NO) |
  | `suspend-organizer` / `reactivate-organizer` | `organizers:suspend` | admin, super admin (§4.4) |
  | `deactivate-user` / `reactivate-user` | `users:deactivate` | super admin |
  | ver lista de usuarios | `users:read` | admin, super admin (§4.4 "soporte") |

  Invariantes (aplican siempre, en el service y en la UI): nadie actúa sobre sí mismo (`self`); un `super_admin` no se modifica ni desactiva por UI/API (`protected-target`), así el sistema nunca se queda sin super admin.

### D5 — Organizador creado por un admin: `active` TEMPORAL
- Hasta que exista Stripe Connect, el perfil creado por el super admin se inserta con `status = 'active'`, `charges_enabled = false` (§4.5 pedía `onboarding` → `active` por Stripe). **TEMPORAL**; aprobado (Q5). `slug` se genera con `slugify(displayName)` + sufijo numérico si choca.

### D6 — Crear usuarios en Clerk: invitaciones, no contraseñas
- Si el email ya existe en `users` (no anonimizado ni desactivado): se aplica el rol **de inmediato** (staff_role / perfil de organizador) y se copia la metadata.
- Si no existe: se guarda una fila en `user_invitations` (`pending`) y se llama a `clerk.invitations.createInvitation({ emailAddress, redirectUrl: <NEXT_PUBLIC_APP_URL>/sign-up, ignoreExisting: true, notify: true })` (Backend API de Clerk, verificado en `@clerk/backend` 3.23: `CreateParams`). Cuando esa persona se registra (email verificado igual a la invitación, con o sin Google), `ensureUserFromClerk` aplica el rol, marca la invitación `accepted` y registra auditoría (`invitation.accepted` + `staff.granted`/`organizer.created`, actor = quien invitó). Si se registra con otro email, el rol no se aplica (se documenta en la UI).
- El rol vive en nuestra tabla `user_invitations`, no en la metadata de la invitación de Clerk (la DB manda).
- Falla la llamada a Clerk → se revierte la fila y se devuelve error; no queda invitación huérfana.

### D7 — Consistencia DB ↔ Clerk
- La DB se confirma primero (transacción con auditoría). Después se llama a Clerk (`updateUserMetadata`, `banUser`/`unbanUser`). Si Clerk falla tras el commit, la acción devuelve `ok: true` con `warning`; la DB sigue mandando (los guards bloquean por `deactivated_at` aunque el ban falle) y el siguiente `ensureUserFromClerk` reintenta copiar la metadata si difiere.
- `updateUserMetadata` hace merge profundo (spec 015 verificó 7.9.11); `updateUser({ publicMetadata })` está deprecado y no se usa.
- El handler del webhook no escribe metadata (evita bucles `user.updated` → metadata → `user.updated`), salvo el bootstrap, que solo escribe cuando cambia el rol.

### D8 — Desactivar = columna nueva + ban en Clerk
- `users.deleted_at` significa "anonimizado" (§6.4) y no es reversible; se necesita un estado reversible: `users.deactivated_at`. Cambia el schema (migración `0001`, justificada en C0). Desactivar = `deactivated_at = now()` + `clerk.users.banUser`; reactivar = `null` + `unbanUser`.

### D9 — UI mínima de administración
- Una sola pantalla `/admin/users` (tabla shadcn `Table`, buscador GET por `q`, paginación por `page`, 20 por página, `searchParams` es `Promise` en Next 16: se hace `await`). Sin `@tanstack/react-table` ni react-query (KISS: es server-rendered y las mutaciones son Server Actions + `revalidatePath`).
- Las acciones permitidas por fila se calculan **en el servidor** con `canManage` y se pasan como props; la UI no decide permisos. Sigue `docs/design/design-system.md` (tokens semánticos de §2.3, `focus-ring` §2.6, tipografía §3, espaciado §4; sin colores nuevos; `Badge` existente). `/admin` redirige a `/admin/users`; el área no está en el sitio público (layout propio, sin footer).

## Decisiones aprobadas (defaults Q1–Q9 aplicados)


- **Q1** La spec original se parte en tres: 020 (A), 021 (B), 022 (C).
- **Q3** Solo el super admin crea/invita organizadores (`organizers:manage`); el admin NO.
- **Q4** Permisos solo por rol, matriz fija en código.
- **Q5** Organizador creado por admin nace `active` sin Stripe (TEMPORAL).
- **Q7** Aceptado: el rol se aplica por coincidencia de email verificado, no por `__clerk_ticket`.
- **Q8** Usuario desactivado: sin pantalla extra, redirige a `/`.
- **Q9** Aceptado: conflicto de email → 500 e intervención manual.
- Super admin: `haroldmip89@gmail.com` (ya aplicado vía `SUPER_ADMIN_EMAIL`).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| Todo lo de 020 (guards, `permissions.ts`, `roles.ts`, `slugify`, `usersService`, `clerkAdminService`, `auditService`, tabla `user_invitations`) | reutilizar | ver 020 | No se modifica. |
| `clerk.invitations.createInvitation`, `users.banUser/unbanUser/updateUserMetadata` | reutilizar | `@clerk/backend` | Verificados en 3.23.1. |
| `Table`, `Dialog`, `AlertDialog`, `DropdownMenu` | agregar de shadcn | `src/components/ui/` | `npx shadcn@latest add table dialog alert-dialog dropdown-menu` (`dropdown-menu` puede venir de la 013: omitir si existe; verificar cada uno con `npx shadcn@latest view <c>`, estilo `base-nova`/Base UI). |
| `Button`, `Input`, `Field*`, `Select`, `Badge`, `Card`, `Empty*`, `Separator`, `Label` | reutilizar | `src/components/ui/` | |
| `BrandLogo`, `focus-ring`, tokens | reutilizar | `src/components/shared`, `globals.css` | Cabecera del shell de admin. |
| `UserMenu` (013/015) | extender | `src/modules/auth/components/user-menu.tsx` | Ítem "Administración" para staff (pista de `publicMetadata.staffRole`, solo visual). |

## Contratos

Consume C0–C5 de 020 (`canManage`, `getAllowedActions`, `checkPermission`, `usersService.listForAdmin`, `clerkAdminService`, `auditService`).

### C4 (parte B) — `user-roles.service.ts`

```ts
// src/modules/users/services/user-roles.service.ts  (Bloque B)
export type RoleServiceError = "forbidden" | "self" | "protected-target" | "not-found" | "conflict" | "clerk-failed"
export type RoleServiceResult<T = Record<string, never>> = ({ ok: true; warning?: "clerk-sync-failed" } & T) | { ok: false; error: RoleServiceError }
export const userRolesService = {
  setStaffRole(i: { actorId: string; targetId: string; staffRole: "admin" | null }): Promise<RoleServiceResult>,
  createOrganizer(i: { actorId: string; targetId: string; displayName: string }): Promise<RoleServiceResult>,
  setOrganizerStatus(i: { actorId: string; targetId: string; status: "active" | "suspended"; reason?: string }): Promise<RoleServiceResult>,
  setUserActive(i: { actorId: string; targetId: string; active: boolean }): Promise<RoleServiceResult>,
  inviteUser(i: { actorId: string; email: string; role: "admin" | "organizer"; organizerDisplayName?: string }): Promise<RoleServiceResult<{ outcome: "applied" | "invited" }>>,
}
```
Reglas comunes de `userRolesService`: cada método carga actor y target dentro de la transacción, valida con `canManage` (C1), aplica el cambio, escribe auditoría (C5) en la **misma** transacción y después llama a Clerk (D7). Idempotentes: repetir el mismo cambio devuelve `ok: true` sin duplicar auditoría. `inviteUser`: email normalizado (trim + lowercase); si ya hay una invitación pendiente para ese email → `conflict`; rol `admin` exige `staff:manage` y rol `organizer` exige `organizers:manage` (se evalúa con `canManage` sobre `grant-admin`/`create-organizer`).

### C6 — Admin module (`src/modules/admin`)

```ts
// schemas/admin-user.schema.ts (Zod; mensajes en español)
export const inviteUserSchema: z.ZodType<{ email: string; role: "admin" | "organizer"; organizerDisplayName?: string }>
//   email: trim + lowercase + formato válido; organizerDisplayName: obligatorio (2–80, trim) si role = "organizer"; ignorado si "admin"
export const setStaffRoleSchema        // { userId: uuid, staffRole: "admin" | null }
export const createOrganizerSchema     // { userId: uuid, displayName: 2–80 }
export const setOrganizerStatusSchema  // { userId: uuid, status: "active" | "suspended", reason?: ≤ 280 ; reason obligatorio si suspended }
export const setUserActiveSchema       // { userId: uuid, active: boolean }
export const listUsersQuerySchema      // { q?: string (trim, ≤ 100), page: int ≥ 1 (default 1) }; entradas inválidas → defaults, nunca lanza

// types/admin-user.types.ts
export type AdminActionResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; code: "signed-out" | "forbidden" | "invalid" | "self" | "protected-target" | "not-found" | "conflict" | "failed"; message: string; fieldErrors?: Record<string, string[]> }

// actions/admin-users.actions.ts ("use server"; todas: checkPermission → safeParse → userRolesService → revalidatePath("/admin/users") → AdminActionResult)
export async function inviteUserAction(input: unknown): Promise<AdminActionResult>          // permiso según rol pedido (staff:manage | organizers:manage)
export async function setStaffRoleAction(input: unknown): Promise<AdminActionResult>        // staff:manage
export async function createOrganizerAction(input: unknown): Promise<AdminActionResult>     // organizers:manage
export async function setOrganizerStatusAction(input: unknown): Promise<AdminActionResult>  // organizers:suspend
export async function setUserActiveAction(input: unknown): Promise<AdminActionResult>       // users:deactivate
```
Mensajes de error en español, sin filtrar detalles internos. `signed-out` no navega: devuelve resultado.

Componentes (`src/modules/admin/components/`):

```ts
export function AdminShell(props: { children: React.ReactNode; userName: string | null }): JSX.Element  // servidor: BrandLogo + "Administración" + link "Volver al sitio" (/) + <main>
export function UsersTable(props: {
  rows: (AdminUserRow & { allowedActions: ManagedUserAction[]; isSelf: boolean })[]
}): JSX.Element                                    // semántico <table>, <caption class="sr-only">; columnas Usuario, Rol, Estado, Alta, Acciones; vacío → Empty "No hay usuarios"
export function UserRowActions(props: { user: Pick<AdminUserRow, "id" | "email" | "fullName">; allowedActions: ManagedUserAction[] }): JSX.Element
  // "use client": DropdownMenu con solo las acciones permitidas (ninguna → no renderiza el botón); confirmación con AlertDialog;
  // "Suspender organizador" pide motivo (Input obligatorio); "Convertir en organizador" pide nombre; usa las actions; error en role="alert"; botón en carga (aria-busy, sin doble envío)
export function InviteUserDialog(props: { canInviteAdmin: boolean; canInviteOrganizer: boolean }): JSX.Element
  // "use client": Dialog con Field/Input "Correo", Select "Rol" (opciones según props), Input "Nombre del organizador" (solo si rol = Organizador);
  // validación con inviteUserSchema (noValidate, foco al primer error, patrón 010); éxito → cierra y muestra mensaje; error → role="alert"
```
Rol mostrado: `super_admin` → "Super admin", `admin` → "Administrador", organizador → "Organizador" (+ "En alta" / "Suspendido" si no `active`), sin ninguno → "Cliente". Estado: "Activo" / "Desactivado". Los textos son criterio propio (el diseño no incluye esta pantalla).

Páginas (delgadas, `src/app/(admin)/admin/`):
- `layout.tsx`: `metadata { robots: { index: false } }`; `const ctx = await requireStaff("admin", { returnTo: "/admin/users" })`; `<AdminShell userName={ctx.displayName}>`.
- `page.tsx`: `redirect("/admin/users")`.
- `users/page.tsx`: `await requirePermission("users:read")`; `await searchParams` → `listUsersQuerySchema`; `usersService.listForAdmin`; por fila `getAllowedActions(actor, target)`; compone buscador (`<form method="get">` con `Input name="q"`), `InviteUserDialog`, `UsersTable` y paginación "Anterior/Siguiente" (links que conservan `q`).

## Tareas

### Bloque B — Administración de usuarios (tras A en `done`)

**Preparación B (serie)**
- **PB1** shadcn y contratos. Comandos: `npx shadcn@latest add table dialog alert-dialog dropdown-menu` (omitir los ya presentes). Archivos: `src/components/ui/table.tsx`, `dialog.tsx`, `alert-dialog.tsx`, (`dropdown-menu.tsx` si falta), `src/modules/admin/types/admin-user.types.ts` (C6), `src/modules/admin/schemas/admin-user.schema.ts` + `.test.ts` (C6).

**Paralelo B**
- **TB1** Servicio de roles. Archivos: `src/modules/users/services/user-roles.service.ts` + `.test.ts` (C4).
- **TB2** Server Actions. Archivos: `src/modules/admin/actions/admin-users.actions.ts` + `.test.ts` (mockea `userRolesService` y `checkPermission`).
- **TB3** UI y páginas. Archivos: `src/modules/admin/components/admin-shell.tsx`, `users-table.tsx` + `users-table.test.tsx`, `user-row-actions.tsx` + `user-row-actions.test.tsx`, `invite-user-dialog.tsx` + `invite-user-dialog.test.tsx`, `src/app/(admin)/admin/layout.tsx`, `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/users/page.tsx`.
- **TB4** Acceso desde el header. Archivos: `src/modules/auth/components/user-menu.tsx` (+ el test de `header-session-actions` solo si existe). Ítem "Administración" → `/admin/users` si `readRoleMetadata(user.publicMetadata).staffRole` no es nulo (solo visual; el acceso real lo decide el guard). Si 015 no está implementada, agregar la prop `showAdminLink: boolean` en `UserMenuProps` y pasarla desde `HeaderSessionActions` (`header-session-actions.tsx` entra a TB4 en ese caso).

## Criterios de aceptación

- [ ] AC11 `/admin/users` sin sesión redirige a ingresar; con cliente u organizador → 404; con `admin` y `super_admin` muestra la tabla. `/admin` redirige a `/admin/users`.
- [ ] AC12 La tabla lista usuarios no anonimizados, más recientes primero, 20 por página; el buscador `?q=` filtra por email o nombre; "Siguiente/Anterior" conservan `q`; sin resultados muestra "No hay usuarios" (Empty). Cada fila muestra rol (Super admin / Administrador / Organizador con "En alta"/"Suspendido" / Cliente) y estado (Activo / Desactivado) con texto, no solo color.
- [ ] AC13 El super admin invita a un email **nuevo** como Administrador: se crea una fila `user_invitations` `pending`, se llama a la invitación de Clerk con `redirectUrl` = `<NEXT_PUBLIC_APP_URL>/sign-up`, hay `audit_logs` `user.invited`. Al registrarse esa persona con ese email verificado, queda `staff_role = 'admin'`, la invitación pasa a `accepted` y hay `invitation.accepted` + `staff.granted`.
- [ ] AC14 Invitar un email **ya existente** aplica el rol de inmediato (`outcome: "applied"`): Administrador → `staff_role = 'admin'`; Organizador → fila en `organizer_profiles` (`active`, `charges_enabled = false`, `slug` único generado del nombre) con `organizer.created`. En ambos casos `publicMetadata` de Clerk queda `{ staffRole, isOrganizer }` coherente con la DB.
- [ ] AC15 Un segundo invitar al mismo email con invitación pendiente devuelve `conflict` (mensaje en español) y no crea otra fila. Si Clerk falla al invitar, no queda fila pendiente y se muestra error.
- [ ] AC16 El super admin puede revocar admin (`staff_role = null`, `staff.revoked`), convertir un usuario en organizador, suspender (con motivo obligatorio, `organizer.suspended`) y reactivar organizadores, y desactivar/reactivar usuarios (`deactivated_at` + ban/unban en Clerk, `user.deactivated`/`user.reactivated`). Un usuario desactivado pierde acceso a páginas protegidas aunque la llamada a Clerk falle.
- [ ] AC17 Un `admin` ve la lista y solo las acciones "Suspender/Reactivar organizador"; no ve "Invitar administrador", "Revocar admin" ni "Desactivar" (los botones no se renderizan) y, si invoca las acciones directamente, recibe `forbidden` sin cambios en la DB. Un `admin` no ve "Invitar organizador" (Q3).
- [ ] AC18 Ninguna acción es posible sobre uno mismo (`self`) ni sobre un `super_admin` (`protected-target`), tanto por UI (acciones ausentes) como por Server Action (resultado de error, sin cambios).
- [ ] AC19 Cada mutación exitosa de B deja exactamente una fila en `audit_logs` con `actor_user_id` = quien actuó, `entity_type`/`entity_id` correctos y `metadata` con el cambio (from/to, reason); repetir el mismo cambio no duplica la fila.
- [ ] AC20 Teclado y a11y: tabla con `<caption>` y `<th scope>`; menú de acciones, diálogos y formulario operables con teclado, foco visible (`focus-ring`) y devuelto al disparador al cerrar; errores con `role="alert"`; botones en carga con `aria-busy` y sin doble envío; con ancho móvil la tabla hace scroll horizontal sin romper el layout.
- [ ] AC21 El menú "Mi cuenta" muestra "Administración" solo si la metadata trae `staffRole`; ocultarlo o mostrarlo no cambia el acceso real (AC9).
- [ ] AC28 `npm run lint`, `npm run test` y `npm run build` pasan al cerrar cada bloque. Las specs 013 (login, header, rutas protegidas) siguen funcionando.

## Tests obligatorios (Vitest)

- `src/modules/admin/schemas/admin-user.schema.test.ts` — `inviteUserSchema` (email válido normalizado; inválido; organizador sin nombre rechaza; admin con nombre lo ignora), `setOrganizerStatusSchema` (suspender sin motivo rechaza), uuid inválido, `listUsersQuerySchema` (page 0/NaN/texto → 1, q largo recortado).
- `src/modules/users/services/user-roles.service.test.ts` — por método: ok, `forbidden`, `self`, `protected-target`, `not-found`, `conflict`; auditoría una sola vez e idempotencia; Clerk falla tras commit → `ok` con `warning`; `inviteUser` aplicado vs. invitado; rollback de la fila si Clerk falla; slug con sufijo ante colisión.
- `src/modules/admin/actions/admin-users.actions.test.ts` — por acción: `signed-out`, `forbidden`, `invalid` (con `fieldErrors`), mapeo de errores del service a `code`/mensaje en español, éxito llama a `revalidatePath("/admin/users")`; el permiso exigido es el de C6.
- `src/modules/admin/components/users-table.test.tsx`, `user-row-actions.test.tsx`, `invite-user-dialog.test.tsx` (RTL, acciones mockeadas) — roles/estados con texto; sin acciones permitidas no hay botón de menú; solo se muestran las permitidas; confirmación antes de ejecutar; suspender exige motivo; error con `role="alert"`; carga sin doble envío; opciones de rol según props; validación y foco al primer error.

Nota de tests con DB: no hay Postgres en CI (019 dejó los tests de integración fuera de alcance); los services se prueban con el `getDb()` mockeado (cadena de Drizzle simulada o funciones de acceso a datos inyectadas). Si el developer separa las consultas en funciones pequeñas inyectables para evitar mocks frágiles, es preferible (SRP/DIP). No se agrega Postgres de pruebas en esta spec.

No requieren test: páginas y layouts de `src/app/**`, `route.ts` (delgado; la lógica está en `processClerkWebhook`), `admin-shell.tsx`, `index.ts` y `README.md` del seed (la lógica está en args/organizer/data).

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (el reviewer, al cerrar)
- **Manual, con 020 completo y la migración aplicada (M3 de 020):**
  - B: con el super admin, abrir `/admin/users` y recorrer AC13–AC18; con un usuario cliente comprobar el 404 (AC9, AC11); con un admin comprobar AC17.

## Pasos manuales del usuario

Los pasos M1–M3 de 020 deben estar hechos. No hay pasos adicionales.
