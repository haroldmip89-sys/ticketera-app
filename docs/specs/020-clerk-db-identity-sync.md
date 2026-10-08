# 020 — Clerk ↔ base de datos: identidad, sincronización de usuarios, roles y permisos desde la DB (Bloque A)

- **Estado:** done
- **Aprobación:** aprobada por el usuario con defaults Q1–Q9 (ver "Decisiones aprobadas").
- **Modo:** SDD
- **Módulo(s):**
  - `src/db` (schema + migración `0001`, infraestructura de datos, System Design §3.2).
  - `src/lib/auth/` (matriz de permisos pura, helpers de rol, guards server-side) y `src/lib/slug.ts`.
  - `src/modules/users` (módulo nuevo): sync Clerk → `users`, contexto de acceso, adaptador de la Backend API de Clerk.
  - `src/modules/audit` (módulo nuevo, transversal): escritura de `audit_logs`.
  - `src/app/api/webhooks/clerk` (route handler delgado).
- **Fuentes:** System Design §3.4 (variables), §4.1 (espejo y webhook), §4.2 (roles, la base manda), §4.3 (guards), §4.4 (matriz), §4.5 (alta de organizador), §6.4 (`users`, `organizer_profiles`, `webhook_events`, `audit_logs`, catálogo y eventos). Spec 019 (esquema). Specs 013, 014, 015 (auth, ver "Relación con 013–015").
- **Depende de:** 019 `done` (22 tablas migradas en Neon `dev`) y **013 `done`** (proxy, `src/lib/auth/auth-routes.ts`, `HeaderSessionActions`/`UserMenu`). La 015 **no** debe implementarse tal como está redactada (ver abajo).
- **Specs hermanas (partición de la spec original, Q1):** 021 (administración de usuarios, depende de 020) y 022 (seed sin ejecutar, depende de 020). Esta spec contiene solo el Bloque A.

## Objetivo

1. **Bloque A — Identidad en la base.**
   - Todo usuario de Clerk tiene su fila en `users` (webhook `user.created|updated|deleted` + upsert on-demand en el primer request autenticado), idempotente con `webhook_events`.
   - Rol y permisos se resuelven **desde la DB** (`users.staff_role`, `organizer_profiles`, `users.deactivated_at`) con guards server-side `requireUser`, `requireOrganizer`, `requireStaff`, `requirePermission`. Los roles provisionales de `publicMetadata` (015) dejan de decidir permisos.
   - El super admin es el usuario cuyo email verificado coincide con `SUPER_ADMIN_EMAIL` (bootstrap idempotente al sincronizar).

## Relación con 013–015 (decisión explícita)

- **015 (roles provisionales) queda reemplazada en su parte de datos.** Esta spec implementa `src/lib/auth/guards.ts` y `roles.ts` con la **misma API pública** que la 015 (C1/C2: `requireUser`, `requireOrganizer`, `getOrganizerAccess`, `OrganizerUser`, `GuardOptions`) pero respaldada por la DB. Cambios de contrato sobre la 015:
  - `requireUser()` devuelve `AccessContext` (incluye `userId` = **`users.id` uuid**, no el id de Clerk; el id de Clerk va en `clerkUserId`). Los consumidores (016–018) deben usar `userId` como FK.
  - `requireOrganizer()` exige `organizer_profiles.status = 'active'` (lo que la 015 anticipaba en su D1).
  - `publicMetadata` pasa a ser **solo copia** (System Design §4.2): `{ staffRole, isOrganizer }`, escrita por el service que cambia el rol, nunca usada para autorizar. `isOrganizer(publicMetadata)` se conserva únicamente como pista de UI.
- **No se implementan** de la 015: `becomeOrganizer` (escribe metadata), el CTA "Activar cuenta de organizador" ni el criterio D1. El destino de `/organizer/onboarding` y del "auto-alta" se decide en Q2 aprobada: pantalla informativa "solicita acceso", fuera de 020–022 (esta spec no lo toca; los guards redirigen a `ORGANIZER_ONBOARDING_PATH` de la 013 si el usuario no es organizador activo).
- Las specs 013/014/015/017 **no se editan aquí**; el humano decide si se marcan como parcialmente reemplazadas al aprobar.

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
- Bloques B y C de la spec original: administración de usuarios (021) y seed (022).

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

### D3 — Sync: webhook + upsert on-demand, mismo código
- Un único `usersService.ensureUserFromClerk(snapshot)` (upsert por `clerk_user_id`) lo usan el webhook y el guard (`currentUser()` cuando no hay fila). Dos adaptadores puros convierten `UserJSON` (webhook) y `User` (Backend API) a `ClerkUserSnapshot`.
- `user.deleted` **anonimiza** (§4.1): email `deleted+<users.id>@deleted.invalid`, nombre/avatar/teléfono nulos, `auth_providers` vacío, `staff_role` nulo, `deleted_at` y `deactivated_at` con fecha. No borra filas.
- Orden de eventos no garantizado: `user.updated` antes de `user.created` funciona porque ambos hacen upsert.
- Idempotencia con `webhook_events` (§6.4): se inserta el id de Svix (`svix-id`) con `ON CONFLICT DO NOTHING`; si ya existe con `processed_at` → 200 sin hacer nada; si existe sin `processed_at` (falló antes) → se reprocesa. `processed_at` se marca al terminar. Error de proceso → 500 (Clerk reintenta); firma inválida → 400.
- Email sin verificar o ausente: sin email no se crea fila (usuarios solo con teléfono no se soportan; se registra y se marca el evento procesado). El bootstrap y las invitaciones exigen email **verificado**.

### D4 — Super admin por bootstrap idempotente
- Variable `SUPER_ADMIN_EMAIL` (configuración, no secreto; valor en `.env`/entorno del despliegue, nunca en código ni en el repo).
- `ensureUserFromClerk`, tras el upsert, si `lower(email) === lower(SUPER_ADMIN_EMAIL)` **y** el email está verificado **y** `staff_role` no es `super_admin` → lo asigna, escribe `audit_logs` (`staff.bootstrapped`, actor nulo) y copia la metadata a Clerk. Si ya es `super_admin`, no hace nada (idempotente). Nunca degrada: cambiar o borrar la variable no quita el rol.
- Cubre usuarios nuevos (webhook) y existentes (primer request autenticado tras el despliegue). **No hay script aparte** (YAGNI): el super admin debe iniciar sesión al menos una vez. Esto extiende System Design §4.2 ("script de seed con el email de una variable"): mismo origen (variable), distinto disparador.

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

## Decisiones aprobadas (defaults Q1–Q9 aplicados)

- **Q1** La spec original se parte en tres: 020 (A), 021 (B), 022 (C).
- **Q2** "Vender entradas"/auto-alta: pantalla informativa "solicita acceso" (no auto-servicio). No se implementa `becomeOrganizer`. La pantalla en sí no forma parte de 020–022 (los guards siguen redirigiendo a `ORGANIZER_ONBOARDING_PATH`); se tratará en una spec posterior.
- **Q3** Solo el super admin crea/invita organizadores (`organizers:manage`); el admin NO.
- **Q4** Permisos solo por rol, matriz fija en código (sin overrides por usuario).
- **Q5** Organizador creado por admin nace `active` sin Stripe (TEMPORAL).
- **Q6** (aplica a 022) recintos propios del organizador, `cover_key` = URL Unsplash, capacidad 500 en zonas generales, `--date-offset-days`.
- **Q7** Aceptado: el rol se aplica por coincidencia de email verificado, no por `__clerk_ticket`.
- **Q8** Usuario desactivado: sin pantalla extra, redirige a `/`.
- **Q9** Aceptado: conflicto de email → 500 e intervención manual (sin regla de fusión).
- Super admin: `SUPER_ADMIN_EMAIL=haroldmip89@gmail.com` (ya aplicado en `.env`; nunca en código ni repo).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| Esquema 22 tablas, `getDb()` | reutilizar | `src/db/schema/*`, `src/db/client.ts` | `users`, `organizer_profiles`, `webhook_events`, `audit_logs`, catálogo, eventos ya existen (019). |
| `users.deactivated_at`, tabla `user_invitations`, enums `invitation_status`/`invited_role` | crear (migración `0001`) | `src/db/schema/identity.ts`, `enums.ts`, `src/db/migrations/` | C0. `identity.ts` y `enums.ts` se extienden; no se duplica nada. |
| `clerkMiddleware`, proxy, `auth-routes` (`buildSignInHref`, `isProtectedPath`, `ORGANIZER_ONBOARDING_PATH`) | reutilizar / extender | `src/proxy.ts`, `src/lib/auth/auth-routes.ts` (013) | Se agrega `ADMIN_PATH = "/admin"` a `isProtectedPath`. El proxy no cambia. `/api/webhooks/clerk` debe seguir **público** (no está en `isProtectedPath`). |
| `auth()`, `currentUser()`, `clerkClient()` | reutilizar | `@clerk/nextjs/server` | |
| `verifyWebhook` | reutilizar | `@clerk/nextjs/webhooks` | Incluye Svix (bundled en `@clerk/backend`): **no** se instala `svix`. Lee `CLERK_WEBHOOK_SIGNING_SECRET` (ya en `.env.example`). |
| `clerk.invitations.createInvitation`, `users.banUser/unbanUser/updateUserMetadata` | reutilizar | `@clerk/backend` | Verificados en 3.23.1. |
| Guards 015 (`requireUser`, `requireOrganizer`, `getOrganizerAccess`), `roles.ts` | crear (reemplazan a la 015) | `src/lib/auth/guards.ts`, `roles.ts` | `src/lib/auth/` hoy solo existe en la 013 (`auth-routes`); la 015 no está implementada. |
| Matriz de permisos y `canManage` | crear | `src/lib/auth/permissions.ts` | Puro, sin Clerk ni DB (reutilizable en cliente/servidor/tests). |
| `slugify` | crear | `src/lib/slug.ts` | No existe equivalente (grep). Lo usan organizer y seed (DRY). |
| `usersService`, mappers Clerk, `clerk-admin.service`, `user-roles.service`, webhook service | crear | `src/modules/users/**` | Único lugar que importa `@/db` para identidad (System Design §3.2). |
| `auditService.record` | crear | `src/modules/audit/services/audit.service.ts` | Reutilizable por futuras specs (reembolsos, suspensión de eventos). |

## Contratos

### C0 — Cambios de schema y migración `0001` (Preparación A)

Justificación: el modelo §6.4 no tiene (a) estado reversible de usuario desactivado ni (b) dónde guardar el rol pendiente de quien aún no se registró. Mínimo necesario; sin tocar nada más.

```ts
// enums.ts (agregados)
export const invitationStatus = pgEnum("invitation_status", ["pending", "accepted", "revoked"])
export const invitedRole = pgEnum("invited_role", ["admin", "organizer"])

// identity.ts
// users: + deactivatedAt: timestamp("deactivated_at", { withTimezone: true })   // null = activo
export const userInvitations = pgTable("user_invitations", {
  id: uuid pk defaultRandom,
  email: text not null,
  role: invitedRole not null,
  organizerDisplayName: text,                       // obligatorio si role = 'organizer' (check)
  status: invitationStatus not null default "pending",
  clerkInvitationId: text unique,
  invitedBy: uuid -> users.id on delete set null,
  acceptedUserId: uuid -> users.id on delete set null,
  acceptedAt: timestamptz,
  ...timestamps,
})
// índices: unique parcial (lower(email)) WHERE status = 'pending'  → una invitación pendiente por email
// check: role <> 'organizer' OR organizer_display_name IS NOT NULL
// export type UserInvitation / NewUserInvitation
```

La migración se genera con `npm run db:generate` (nombre `0001_*`); no se edita a mano. `db:generate` posterior no debe producir cambios. Aplicarla a Neon `dev` es el paso manual M3.

### C1 — Permisos (`src/lib/auth/permissions.ts`, puro)

```ts
export type StaffRole = "admin" | "super_admin"
export type OrganizerStatus = "onboarding" | "active" | "suspended"
export type AccessSubject = { staffRole: StaffRole | null; organizerStatus: OrganizerStatus | null }

export const PERMISSIONS = [
  // organizador activo (§4.4)
  "events:manage-own", "sales:view-own", "checkin:own", "refunds:own",
  // admin y super admin
  "events:moderate", "events:feature", "organizers:suspend", "venues:manage",
  "checkin:any", "refunds:any", "support:read", "users:read",
  // solo super admin
  "staff:manage", "organizers:manage", "users:deactivate", "platform:configure",
] as const
export type Permission = (typeof PERMISSIONS)[number]

/** Unión de: organizador activo → 4 permisos "own"; admin → bloque admin; super_admin → admin + bloque super admin.
 *  organizerStatus distinto de "active" no aporta permisos. */
export function getPermissions(subject: AccessSubject): ReadonlySet<Permission>
export function hasPermission(subject: AccessSubject, permission: Permission): boolean

export type ManagedUserAction =
  | "grant-admin" | "revoke-admin" | "create-organizer"
  | "suspend-organizer" | "reactivate-organizer" | "deactivate-user" | "reactivate-user"
export type ManagementDenial = "forbidden" | "self" | "protected-target"
/** Orden de evaluación: self → protected-target (target.staffRole === "super_admin") → forbidden (falta el permiso de D2). */
export function canManage(
  actor: AccessSubject & { id: string },
  action: ManagedUserAction,
  target: AccessSubject & { id: string },
): { ok: true } | { ok: false; reason: ManagementDenial }
/** Subconjunto de acciones que `actor` puede ejecutar sobre `target` (alimenta la UI). */
export function getAllowedActions(actor: AccessSubject & { id: string }, target: AccessSubject & { id: string }): ManagedUserAction[]
```

### C2 — Roles como pista de UI (`src/lib/auth/roles.ts`, puro, sin Clerk)

```ts
export const STAFF_ROLE_METADATA_KEY = "staffRole"
export const ORGANIZER_METADATA_KEY = "isOrganizer"      // misma clave que la 015 C1
export type RoleMetadata = { staffRole: StaffRole | null; isOrganizer: boolean }
/** Estricto: staffRole solo "admin" | "super_admin"; isOrganizer solo `=== true`. Cualquier otra forma → valores seguros. */
export function readRoleMetadata(publicMetadata: unknown): RoleMetadata
export function isOrganizer(publicMetadata: unknown): boolean      // compat. 015 (solo UI)
```
Comentario obligatorio en el archivo: "copia no autoritativa; no usar para autorizar".

### C3 — Guards (`src/lib/auth/guards.ts`, solo servidor)

```ts
export type GuardOptions = { returnTo?: string }
export type AccessContext = {
  userId: string            // users.id (uuid)
  clerkUserId: string
  email: string
  displayName: string | null
  staffRole: StaffRole | null
  organizer: { id: string; status: OrganizerStatus } | null
  permissions: ReadonlySet<Permission>
}
export type OrganizerAccess = "signed-out" | "customer" | "organizer"   // 015 C2
export type OrganizerUser = { userId: string; organizerId: string; displayName: string | null; email: string | null }

/** Sin sesión Clerk → null. Con sesión: fila en users (si falta, upsert on-demand con currentUser()); desactivada/anonimizada → null.
 *  Memoizada por request (React cache). Aplica el bootstrap de super admin vía ensureUserFromClerk. */
export async function getAccessContext(): Promise<AccessContext | null>

/** Sin sesión → redirect(buildSignInHref(returnTo)); desactivado → redirect("/"). */
export async function requireUser(options?: GuardOptions): Promise<AccessContext>
/** requireUser + organizer.status === "active"; si no → redirect(ORGANIZER_ONBOARDING_PATH). */
export async function requireOrganizer(options?: GuardOptions): Promise<OrganizerUser>
/** requireUser + staffRole cumple `min` (super_admin cumple "admin"); si no → notFound(). */
export async function requireStaff(min: StaffRole, options?: GuardOptions): Promise<AccessContext>
/** requireUser + hasPermission; si no → notFound(). Para páginas/layouts. */
export async function requirePermission(permission: Permission, options?: GuardOptions): Promise<AccessContext>

export type PermissionCheck =
  | { ok: true; context: AccessContext }
  | { ok: false; reason: "signed-out" | "forbidden" }
/** Versión sin redirect/notFound para Server Actions y Route Handlers (devuelven resultado, no navegan). */
export async function checkPermission(permission: Permission): Promise<PermissionCheck>
/** 015: "signed-out" | "customer" | "organizer" (organizer activo). */
export async function getOrganizerAccess(): Promise<OrganizerAccess>
```
Los redirects/`notFound()` lanzan errores internos de Next: no se capturan (patrón 015 C3). `guards.ts` no se importa desde componentes cliente.

### C4 — Users module

```ts
// src/modules/users/types/user.types.ts
export type ClerkUserSnapshot = {
  clerkUserId: string
  email: string | null          // email primario
  emailVerified: boolean
  fullName: string | null       // `${firstName} ${lastName}` recortado; null si vacío
  avatarUrl: string | null      // solo si el usuario tiene imagen propia (has_image / hasImage)
  authProviders: ("password" | "google")[]   // password_enabled → "password"; external account google u oauth_google → "google"; sin duplicados
}
export type AdminUserRow = {
  id: string; email: string; fullName: string | null; avatarUrl: string | null
  staffRole: StaffRole | null; organizer: { id: string; status: OrganizerStatus } | null
  authProviders: string[]; deactivatedAt: Date | null; createdAt: Date
}

// src/modules/users/utils/clerk-user-mapper.ts (puro)
export function fromWebhookUser(data: unknown): ClerkUserSnapshot          // payload UserJSON (snake_case); lanza si no tiene id
export function fromBackendUser(user: User /* @clerk/backend */): ClerkUserSnapshot

// src/modules/users/services/users.service.ts
export const usersService = {
  getAccessContextByClerkId(clerkUserId: string): Promise<AccessContext | null>,
  ensureAccessContext(clerkUserId: string, loadSnapshot: () => Promise<ClerkUserSnapshot | null>): Promise<AccessContext | null>,
  /** Transacción: upsert por clerk_user_id (email, full_name, avatar_url, auth_providers) →
   *  bootstrap super admin (D4) → aplicar invitación pendiente de ese email verificado (D6) → auditoría.
   *  Si hubo cambio de rol, copia la metadata a Clerk fuera de la transacción (D7). Sin email → lanza MissingEmailError. */
  ensureUserFromClerk(snapshot: ClerkUserSnapshot): Promise<{ userId: string; created: boolean }>,
  anonymizeByClerkId(clerkUserId: string): Promise<void>,           // D3
  listForAdmin(query: { q?: string; page: number; pageSize: number }): Promise<{ rows: AdminUserRow[]; total: number }>,
  // q: ilike sobre email y full_name; orden created_at desc; excluye filas anonimizadas (deleted_at no nulo)
}

// src/modules/users/services/clerk-admin.service.ts (adaptador fino de la Backend API; único que llama a clerkClient() para admin)
export const clerkAdminService = {
  syncRoleMetadata(clerkUserId: string, role: RoleMetadata): Promise<void>,   // updateUserMetadata({ publicMetadata })
  banUser(clerkUserId: string): Promise<void>,
  unbanUser(clerkUserId: string): Promise<void>,
  inviteByEmail(input: { email: string; redirectUrl: string }): Promise<{ clerkInvitationId: string }>,
}
```

```ts
// src/modules/users/services/clerk-webhook.service.ts
export type ClerkWebhookOutcome = "processed" | "duplicate" | "ignored"
/** id = cabecera svix-id. Tipos: user.created | user.updated → ensureUserFromClerk(fromWebhookUser(data));
 *  user.deleted → anonymizeByClerkId(data.id); cualquier otro → se registra y "ignored".
 *  Flujo de idempotencia en D3. Errores de proceso se propagan (el route responde 500). */
export async function processClerkWebhook(event: { id: string; type: string; data: unknown }): Promise<ClerkWebhookOutcome>
```

```ts
// src/app/api/webhooks/clerk/route.ts (delgado)
export async function POST(req: NextRequest): Promise<Response>
// verifyWebhook(req) → falla: 400. Sin cabecera svix-id: 400. processClerkWebhook → 200 { status }. Excepción: 500.
```

### C5 — Auditoría (`src/modules/audit/services/audit.service.ts`)

```ts
export type AuditAction =
  | "staff.bootstrapped" | "staff.granted" | "staff.revoked"
  | "organizer.created" | "organizer.suspended" | "organizer.reactivated"
  | "user.invited" | "invitation.accepted" | "user.deactivated" | "user.reactivated" | "user.anonymized"
export type AuditEntry = {
  actorUserId: string | null     // null = sistema (webhook, bootstrap)
  action: AuditAction
  entityType: "user" | "organizer_profile" | "user_invitation"
  entityId: string
  metadata?: Record<string, unknown>   // from/to, reason, email (invitaciones)
}
/** Inserta en audit_logs usando el ejecutor recibido (db o tx) para quedar en la misma transacción. */
export const auditService = { record(executor: DbExecutor, entry: AuditEntry): Promise<void> }
```
`DbExecutor` = tipo de `getDb()` o de su transacción (`Parameters<Parameters<Database["transaction"]>[0]>[0]`), exportado desde `src/db/client.ts` **solo si hace falta** (si se agrega, es parte de la Preparación A).

## Tareas

### Bloque A — Identidad, sync, roles y guards

**Preparación A (serie)** — nadie más trabaja en paralelo; incluye `src/lib`, schema, config y contratos compartidos.
- **PA1** Schema y migración (C0). Archivos: `src/db/schema/enums.ts`, `src/db/schema/identity.ts`, `src/db/schema/schema.test.ts` (ampliar), `src/db/migrations/0001_*.sql` + `src/db/migrations/meta/*` (generados con `npm run db:generate`). Si se necesita `DbExecutor`: `src/db/client.ts` + `src/db/client.test.ts`.
- **PA2** Entorno y rutas. Archivos: `.env.example` (agregar `SUPER_ADMIN_EMAIL=` y `NEXT_PUBLIC_APP_URL=` con comentario; sin valores), `src/lib/auth/auth-routes.ts` + `auth-routes.test.ts` (013: agregar `ADMIN_PATH` y que `isProtectedPath` cubra `/admin` y `/admin/**`; `/administrator` → false; `/api/webhooks/clerk` → false).
- **PA3** Librerías puras (C1, C2, slug). Archivos: `src/lib/auth/permissions.ts` + `.test.ts`, `src/lib/auth/roles.ts` + `.test.ts`, `src/lib/slug.ts` + `.test.ts`.
- **PA4** Guards (C3). Archivos: `src/lib/auth/guards.ts` + `guards.test.ts`. Depende del contrato `usersService` (C4); los tests lo mockean. Se implementa en serie **después** de los paralelos si el `usersService` aún no existe en disco, para que `build` pase (o con un stub tipado que reemplaza TA1; preferible: ejecutar PA4 al final del bloque).

**Paralelo A (tras PA1–PA3; archivos disjuntos; nadie corre `npm install` ni `npm run build`)**
- **TA1** Users + audit. Archivos: `src/modules/users/types/user.types.ts`, `src/modules/users/utils/clerk-user-mapper.ts` + `.test.ts`, `src/modules/users/services/users.service.ts` + `.test.ts`, `src/modules/users/services/clerk-admin.service.ts` + `.test.ts`, `src/modules/audit/services/audit.service.ts` + `.test.ts`.
- **TA2** Webhook. Archivos: `src/modules/users/services/clerk-webhook.service.ts` + `.test.ts`, `src/app/api/webhooks/clerk/route.ts`.

Al terminar A: `npm run lint`, `npm run test`; el reviewer corre `npm run build`.

## Criterios de aceptación

- [ ] AC1 `npm run db:generate` produce una migración `0001` con exactamente: columna `users.deactivated_at`, enums `invitation_status` e `invited_role`, tabla `user_invitations` con su índice único parcial y su check; ejecutarlo de nuevo no genera cambios.
- [ ] AC2 `POST /api/webhooks/clerk` sin firma válida responde 400 y no escribe en la DB; sin `svix-id` responde 400.
- [ ] AC3 Un evento `user.created` válido crea una fila en `users` (`clerk_user_id`, `email`, `full_name`, `avatar_url`, `auth_providers`) y una fila en `webhook_events` con `processed_at`. Reenviar el mismo `svix-id` responde 200 sin crear ni modificar filas.
- [ ] AC4 `user.updated` actualiza los datos de la fila existente (y la crea si llegó antes `user.updated` que `user.created`). `user.deleted` anonimiza (`email = deleted+<id>@deleted.invalid`, nombre/avatar/teléfono nulos, `staff_role` nulo, `deleted_at` y `deactivated_at` con fecha) sin borrar la fila; queda `audit_logs` `user.anonymized`.
- [ ] AC5 Un usuario con sesión de Clerk y sin fila en `users` obtiene su fila al entrar a una página protegida por los guards (upsert on-demand), sin depender del webhook.
- [ ] AC6 Con `SUPER_ADMIN_EMAIL=<email>` definido, el usuario con ese email **verificado** queda con `staff_role = 'super_admin'` al sincronizarse (webhook o primer request), con una sola fila `staff.bootstrapped` en `audit_logs`; sincronizarlo otra vez no cambia nada ni duplica auditoría. Un usuario con ese email **sin verificar** no recibe el rol. Sin la variable, nadie recibe el rol. El email no aparece en ningún archivo de código ni en el repo (`git grep` del correo en `src/` → 0).
- [ ] AC7 `getPermissions`: cliente → vacío; organizador `active` → los 4 permisos `own`; organizador `onboarding`/`suspended` → vacío; `admin` ⊉ `staff:manage`; `super_admin` ⊇ `admin` y tiene `staff:manage`, `organizers:manage`, `users:deactivate`. `canManage` devuelve `self`, `protected-target` y `forbidden` según el orden de C1.
- [ ] AC8 `requireUser` sin sesión redirige a `/sign-in?redirect_url=…`; con sesión desactivada redirige a `/`. `requireOrganizer` redirige a `/organizer/onboarding` si no hay perfil `active`. `requireStaff("admin")` y `requirePermission` devuelven 404 (`notFound`) a un cliente autenticado; `super_admin` cumple `requireStaff("admin")`. `checkPermission` nunca redirige: devuelve `signed-out` o `forbidden`.
- [ ] AC9 Cambiar `publicMetadata` en el Dashboard de Clerk (poner `staffRole: "super_admin"` a un cliente) **no** otorga acceso: `/admin/users` sigue devolviendo 404 para ese usuario.
- [ ] AC10 `guards.ts`, `users.service.ts` y los services no se importan desde componentes cliente; `roles.ts`, `permissions.ts` y `slug.ts` no importan Clerk, Next ni `@/db`; `git grep "updateUser("` en `src/` → 0; `/api/webhooks/clerk` no exige sesión (no está en `isProtectedPath`).
- [ ] AC28 `npm run lint`, `npm run test` y `npm run build` pasan al cerrar cada bloque. Las specs 013 (login, header, rutas protegidas) siguen funcionando.

## Tests obligatorios (Vitest)

- `src/lib/auth/permissions.test.ts` — matriz completa por rol (cliente, organizador activo/onboarding/suspendido, admin, super admin, organizador+admin); `super_admin ⊇ admin`; `canManage`: cada acción × (permitida, `forbidden`, `self`, `protected-target`), orden de evaluación; `getAllowedActions` para super admin→admin, admin→organizador, admin→admin, cualquiera→super admin.
- `src/lib/auth/roles.test.ts` — `readRoleMetadata`/`isOrganizer`: válidos; `{isOrganizer:"true"}`, `1`, `null`, `undefined`, `[]`, string, `staffRole: "root"` → seguros.
- `src/lib/slug.test.ts` — acentos, mayúsculas, espacios y símbolos, vacío→cadena vacía o error documentado, longitud máxima.
- `src/lib/auth/auth-routes.test.ts` (ampliar) — `/admin`, `/admin/users`, `/admin/` protegidos; `/administrator`, `/api/webhooks/clerk` no.
- `src/lib/auth/guards.test.ts` (mock de `@clerk/nextjs/server`, `next/navigation` con redirect/notFound que lanzan centinela, y `usersService`) — cada guard × (sin sesión, sin fila→upsert, desactivado, cliente, organizador activo/onboarding/suspendido, admin, super admin); `checkPermission` sin lanzar; memoización (una sola consulta por request).
- `src/modules/users/utils/clerk-user-mapper.test.ts` — webhook y Backend User → snapshot: email primario según `primary_email_address_id`, `emailVerified`, nombre completo/solo nombre/vacío, avatar con y sin imagen propia, proveedores (`password_enabled`, `google` y `oauth_google`, sin duplicados), payload sin id lanza.
- `src/modules/users/services/users.service.test.ts` (DB mockeada; ver nota) — upsert crea/actualiza; bootstrap: asigna con email verificado, no con no verificado ni sin variable, idempotente, nunca degrada; invitación pendiente aplicada (admin y organizador) y marcada `accepted`; sin email lanza `MissingEmailError`; anonimización; `listForAdmin` (q, paginación, excluye anonimizados); `ensureAccessContext` usa el snapshot solo si falta la fila.
- `src/modules/users/services/clerk-admin.service.test.ts` (`vi.mock` de `clerkClient`) — payload exacto de `updateUserMetadata`, `banUser`, `unbanUser`, `createInvitation` (`redirectUrl`, `ignoreExisting: true`).
- `src/modules/audit/services/audit.service.test.ts` — inserta con el ejecutor recibido y los campos exactos.
- `src/modules/users/services/clerk-webhook.service.test.ts` — `processed`, `duplicate` (procesado), reproceso si `processed_at` nulo, `ignored` para otros tipos, error propagado sin marcar `processed_at`, `user.deleted` → anonimiza.
- `src/db/schema/schema.test.ts` (ampliar) — `user_invitations` y `users.deactivated_at` presentes; enums nuevos.

Nota de tests con DB: no hay Postgres en CI (019 dejó los tests de integración fuera de alcance); los services se prueban con el `getDb()` mockeado (cadena de Drizzle simulada o funciones de acceso a datos inyectadas). Si el developer separa las consultas en funciones pequeñas inyectables para evitar mocks frágiles, es preferible (SRP/DIP). No se agrega Postgres de pruebas en esta spec.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (el reviewer, al cerrar)
- `npm run db:generate` → sin cambios pendientes tras la migración `0001`.
- **Manual, tras aplicar la migración (M3) y con M1/M2 hechos:**
  - A: crear el usuario en Clerk (o iniciar sesión) y comprobar en `npm run db:studio` la fila en `users`, el `webhook_events` y, para el email del super admin, `staff_role = super_admin` + `audit_logs`. Reenviar el evento desde el Dashboard de Clerk (Replay) y comprobar que no cambia nada.

## Pasos manuales del usuario

| # | Cuándo | Qué hacer |
|---|---|---|
| **M1** | Antes de probar A en un entorno real | Clerk Dashboard → Webhooks → Add endpoint `<URL pública>/api/webhooks/clerk`, eventos `user.created`, `user.updated`, `user.deleted`; copiar el Signing secret a `CLERK_WEBHOOK_SIGNING_SECRET`. En local hace falta un túnel (p. ej. el de la CLI de Clerk, ngrok o cloudflared) hacia `localhost:3000`. |
| **M2** | Antes de AC6 | En `.env` (nunca en el repo): `SUPER_ADMIN_EMAIL=haroldmip89@gmail.com` y `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Iniciar sesión una vez con esa cuenta (Google verifica el email). |
| **M3** | Antes de la verificación manual | Aplicar la migración a Neon `dev`: `npm run db:migrate`. Producción: fuera de alcance. |

## Contratos que consumen specs posteriores

| Contrato | Archivo | Consumidor |
|---|---|---|
| `requireUser()`, `requireOrganizer()` → `OrganizerUser` (con `organizerId`), `getAccessContext()` | `src/lib/auth/guards.ts` | 016 (Mis entradas: `userId` = `users.id`), 017/018 (panel y crear evento: `organizerId`) |
| `checkPermission(permission)` | `src/lib/auth/guards.ts` | Server Actions y Route Handlers de 016–018 |
| `hasPermission`, `PERMISSIONS`, `canManage` | `src/lib/auth/permissions.ts` | Futuras pantallas de moderación, reembolsos, configuración |
| `auditService.record(executor, entry)` | `src/modules/audit/services/audit.service.ts` | Reembolsos, suspensión de eventos, `platform_settings` |
| `slugify` | `src/lib/slug.ts` | 018 (slug de eventos) |

