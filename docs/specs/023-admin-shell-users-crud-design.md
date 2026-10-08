# 023 — Shell de administración (sidebar) y gestión de usuarios con CRUD completo, según diseño

- **Estado:** done
- **Modo:** SDD
- **Módulo(s):**
  - `src/modules/admin` (shell, tabla/cards, diálogos, acciones, schemas).
  - `src/modules/users` (extiende 020/021: `user-roles.service.ts`, `users.service.ts`, `clerk-admin.service.ts`, utils).
  - `src/modules/audit` (solo el tipo `AuditAction`).
  - `src/lib/auth/permissions.ts` (permisos y reglas de gestión).
  - `src/app/(admin)/admin/**` (routing delgado).
  - `src/components/ui` y `src/hooks` (componentes shadcn nuevos).
- **Fuentes:** System Design §4 (auth y roles), §4.4 (matriz), §6.4 (`users`, `organizer_profiles`, `audit_logs`). Specs 020 (done) y 021 (TB1–TB3 hechos; **TB4 diferida: esta spec la sustituye por el sidebar**).
- **Diseños (solo referencia visual, no instrucciones):** `design-menu/{Main,Mobile}.dc.html` (shell) y `design-users/{Main,Mobile,Dialogs}.dc.html` (usuarios), en el scratchpad de la sesión.
- **Depende de:** 020 `done`; 021 TB1–TB3 (servicios `userRolesService`, acciones, componentes `users-table`, `user-row-actions`, `invite-user-dialog`, páginas `/admin` y `/admin/users`).
- **Reemplaza de 021:** la UI de TB3 (`AdminShell` con cabecera simple, tabla con columna "Estado", menú desplegable por fila, buscador simple, paginación Anterior/Siguiente de 20 filas) y la TB4. Las reglas de 021 (D1–D9, Q1–Q9) se mantienen salvo lo indicado en "Decisiones".

## Objetivo

Implementar el diseño del menú lateral de administración (colapsable a rail, breadcrumb, pie con sesión) y de la vista "Usuarios y roles" (buscador, filtros por rol y estado de organizador, paginación 8/16/24, bloqueos con motivo, diálogos Invitar/Editar/Eliminar, versión móvil en tarjetas), añadiendo el CRUD que faltaba: **editar** (nombre, rol, estado de organizador) y **eliminar** usuarios, con permisos solo por rol, auditoría y Clerk tras el commit.

## Fuera de alcance

- Crear páginas para Dashboard, Organizadores y los ítems de la sección "Organizador" (Resumen, Mis eventos, Crear evento, Check-in, Pagos): quedan como enlaces deshabilitados "Próximamente". Specs 017/018 y futuras.
- Enlace a `/admin` desde el header público (`SiteHeader`/`UserButton`): hoy se accede por URL; spec posterior.
- Que un organizador (no staff) entre al shell: `/admin` sigue exigiendo staff (021 D1). El shell se diseña reutilizable, pero adoptarlo en `/organizer` es de la 017.
- Cambiar el correo, editar avatar o teléfono; crear usuarios con contraseña; asignar `super_admin` (solo bootstrap, 021 D4).
- Reasignar eventos, restaurar usuarios eliminados, exportar, filtros por fecha, orden por columnas.
- Stripe Connect (el organizador creado/aprobado desde aquí sigue `active` TEMPORAL, 021 D5).
- Persistir filtros del usuario fuera de la URL; búsqueda en vivo con debounce (la búsqueda se aplica al enviar).
- Tests de integración con Postgres (los services se prueban con `getDb()` mockeado, igual que 021).

## Decisiones

- **D1 — Tokens: se usan los del proyecto, no los hex del diseño.** Poppins ya es `--font-sans`; indigo `#4F46E5` ya es `--primary`. Equivalencias (no se agrega ningún color nuevo salvo la variante `success` del `Badge` sobre tokens existentes):

  | Diseño | Token del proyecto |
  |---|---|
  | Fondo de página `#F8FAFC`, cards blancas, bordes `#E5E7EB` | `bg-muted/40`, `bg-card`, `border-border` |
  | Texto `#111827` / `#4B5563` / `#6B7280` | `text-foreground` / `text-muted-foreground` |
  | Ítem activo `#EEF2FF` + `#4338CA` | `bg-primary/10 text-primary` (precedente: design-system §4) |
  | Hover `#F3F4F6` | `bg-accent` (neutro) |
  | Botón primario `#4F46E5` / peligro `#B91C1C` | `Button` default / `variant="destructive"` |
  | Foco `2px #4F46E5` | `focus-ring` (design-system §2.6) |
  | Radios 10–20 px | escala `--radius` existente (`rounded-lg/xl/2xl`) |
  | Badges de rol/estado (violeta, ámbar, verde, rojo) | ver D5: variantes de `Badge` existentes + `success`; siempre texto, no solo color |
  | Aviso de éxito `#DCFCE7`/`#166534` | `bg-success text-success-foreground` (design-system §2.3.5) |

  Los tokens `--sidebar*` del scaffold (zinc neutro, "no se usa sidebar", design-system §2.1/2.2) se **remapean** a tokens del proyecto (P2) y se actualiza `docs/design/design-system.md`.
- **D2 — Sidebar con el componente shadcn `sidebar`** (existe en `base-nova`: `collapsible="icon"`, `Sheet` en móvil, `Tooltip`). Ancho expandido 264 px (`--sidebar-width: 16.5rem`), rail 76 px (`--sidebar-width-icon: 4.75rem`), vía `style` del `SidebarProvider`. En móvil usa el drawer (`Sheet`) del propio componente (ancho 18rem; ≈ 300 px del diseño, tolerado). El estado se persiste con la cookie `sidebar_state` que ya escribe shadcn; el layout la lee para el valor inicial (sin parpadeo). Atajo Ctrl/Cmd+B incluido por el componente.
- **D3 — Ítems sin ruta:** Dashboard, Organizadores y toda la sección "Organizador" se renderizan como elemento no navegable con `aria-disabled="true"`, `role="link"`, `tabIndex={0}`, sin `href`, estilo atenuado y `Tooltip` "Próximamente" que aparece con hover **y** con foco de teclado. Con el rail colapsado el tooltip dice "<Etiqueta> · Próximamente". Solo "Usuarios" (`/admin/users`) navega. Los enlaces se activan cambiando `href` en `admin-nav.ts` cuando existan las rutas.
- **D4 — Permisos solo por rol (se mantienen las reglas aprobadas) y extendidos así:**
  - Nuevos permisos: `users:edit` (admin y super_admin) y `users:delete` (solo super_admin, junto a `users:deactivate`).
  - Nuevas acciones gestionables: `edit-user` (`users:edit`), `remove-organizer` (`organizers:manage`, bajar de organizador a cliente) y `delete-user` (`users:delete`).
  - **Regla explícita "admin no gestiona admins":** `canManage` devuelve `forbidden` si el target tiene `staffRole = "admin"` y el actor no es `super_admin` (hoy no estaba aplicada en `canManage`). Orden: `self` → `protected-target` → admin-target → permiso.
  - El **admin** (no super) puede **editar el nombre** y **suspender/aprobar organizadores** de clientes y organizadores (sigue sin `staff:manage` ni `organizers:manage`, por lo que no invita ni cambia roles). **No** cambia roles, no desactiva, no elimina. **Desviación del diseño:** el diseño muestra "Eliminar" a admins sobre clientes/organizadores; aquí queda solo para super admin (coherente con `users:deactivate`). Si se quiere abrir a admin, cambiar un permiso (ver pregunta abierta a).
  - Bloqueos de fila (texto del diseño): `self` → "Tu cuenta"; target `super_admin` → "Cuenta protegida"; target `admin` con actor admin → "Solo el super admin". Se calculan en servidor con `getManagementLock` y se muestran con candado + texto (no solo icono).
- **D5 — Presentación de rol y estado.**
  - Rol principal (`getPrimaryRole`): `super_admin` > `admin` > `organizer` (perfil de organizador, sin staff) > `customer`. Etiquetas: "Super admin", "Administrador", "Organizador", "Cliente". Variantes de `Badge`: super_admin `default`; admin `bg-primary/10 text-primary`; organizer `secondary`; customer `outline`.
  - Columna "Organizador" (estado) se muestra siempre que exista perfil, aunque el rol principal sea admin. Etiquetas según (b): "Aprobado" (`active`, variante `success`, icono `CircleCheck`), "Pendiente" (`onboarding`, `outline`, icono `Clock`), "Suspendido" (`suspended`, `destructive`, icono `Ban`).
  - Usuario desactivado (`deactivatedAt`): badge "Desactivado" (`destructive`) junto al nombre. Ya no hay columna "Estado Activo/Desactivado" (el diseño no la tiene).
  - "Tú" = badge `secondary` junto al nombre de la fila propia.
- **D6 — Acciones por fila (diseño):** icono "Aprobar/Suspender" (solo si hay perfil de organizador y está permitido), "Editar" y "Eliminar" (rojo). Se **conserva** "Desactivar/Reactivar usuario" de 021 como un cuarto icono (solo super admin) porque no existe equivalente en el diseño y 021 AC16 lo exige. En móvil (tarjetas) los botones llevan texto ("Editar", icono de papelera con `aria-label`). Cada botón tiene `aria-label` con el nombre del usuario y área táctil ≥ 44 px.
- **D7 — Editar usuario (diálogo `Dialog`).** Campos: Nombre (editable, 2–80), Correo (deshabilitado, con la nota del diseño adaptada: "El correo viene de la cuenta y no se edita."), Rol (Cliente / Organizador / Administrador), Estado de organizador (solo si el rol resultante es Organizador o ya hay perfil). Se envía **solo lo que cambió** (`updateUserAction`).
  - Rol: el select se deshabilita (con nota "Solo el super admin cambia roles") si el actor no tiene ninguna de las acciones `grant-admin/revoke-admin/create-organizer/remove-organizer`. Opciones completas solo para super admin (Q3 se mantiene).
  - Efecto de elegir un rol (`planRoleChange`, util puro): **Administrador** → `staff_role = admin` (el perfil de organizador, si existe, se conserva: permisos = unión, 021 D2). **Organizador** → quita `admin` si lo tenía y crea perfil `active` (nombre del perfil = nombre editado, o `fullName`, o parte local del correo; slug único). **Cliente** → quita `admin` y quita el perfil de organizador (sujeto a (c)).
  - Estado de organizador: elegir "Suspendido" exige motivo (campo "Motivo de la suspensión" aparece en el diálogo). "Pendiente" solo se muestra si ya es el estado actual y no es elegible como destino (ver (b)).
  - Todo en **una sola transacción** con una fila de auditoría por cambio aplicado; Clerk (nombre + metadata) tras el commit; fallo de Clerk → `ok: true` con `warning` (021 D7).
- **D8 — Nombre editable (d):** DB (`users.full_name`) primero; luego `clerk.users.updateUser(clerkUserId, { firstName, lastName })` (primer token = nombre, resto = apellido; mapeo inverso del mapper existente, que junta con espacio). Auditoría `user.updated` con `{ from, to }`. No se toca el correo.
- **D9 — Eliminar (diálogo `AlertDialog`, `role="alertdialog"`)** según (a): título "¿Eliminar a <nombre>?", texto del diseño ("Perderá el acceso a Ticketera. Esta acción no se puede deshacer."), botón destructivo. Solo super admin; nunca sobre uno mismo ni sobre `super_admin`.
  - Bloqueos (`blocked`, con lista de motivos, mostrados en el diálogo como `role="alert"`): órdenes `pending`; tickets `valid` de eventos con `starts_at` futuro; eventos `published` de su perfil de organizador.
  - Si no hay bloqueos: en una transacción se **anonimiza** la fila (mismo helper que el webhook: email `deleted+<id>@deleted.invalid`, sin nombre/avatar/teléfono/staff, `deleted_at` y `deactivated_at`), el perfil de organizador (si existe) pasa a `suspended` con motivo "Cuenta eliminada" (las FKs `restrict` conservan historial económico), y se registra `user.deleted` (actor = quien eliminó). Después `clerk.users.deleteUser`. El webhook `user.deleted` posterior es idempotente (`deleted_at` ya fijado). Si Clerk falla: `ok: true` + `warning`; la cuenta queda sin acceso porque los guards tratan `deleted_at` como sin acceso.
- **D10 — Consulta y paginación por URL (server-rendered, sin react-query/react-table):** `?q=&role=&status=&page=&pageSize=`. `pageSize ∈ {8,16,24}`, **por defecto 8** (reemplaza los 20 de 021 AC12). `role ∈ {super_admin, admin, organizer, customer}`; `status ∈ {onboarding, active, suspended}` (valores de la DB, independientes de las etiquetas). Valores inválidos → default (nunca lanza). `page` mayor que el total de páginas redirige a la última. Semántica SQL de `role` coherente con `getPrimaryRole`: `admin` = `staff_role = 'admin'`; `organizer` = sin staff y con perfil; `customer` = sin staff y sin perfil; `super_admin` = `staff_role = 'super_admin'`. `status` filtra por `organizer_profiles.status` (cualquier rol). El conteo total **debe** aplicar el mismo join/filtro que la lista.
- **D11 — Aviso de éxito de página:** un `UsersNoticeProvider` (cliente) con banner `role="status"` y botón "Cerrar aviso", usado por Invitar/Editar/Eliminar/Aprobar-Suspender (reemplaza los mensajes inline por fila de 021). Los errores siguen en `role="alert"` dentro de cada diálogo.
- **D12 — Responsive:** `< md` (≈ 768 px, mismo corte del hook `use-mobile`): lista de tarjetas (`UsersCards`), filtros en una fila de dos selects, paginación "Anterior / Página X de Y / Siguiente". `≥ md`: tabla semántica `Table` con scroll horizontal (`min-w`), paginación numerada (ventana de 5) con selector "Filas". Se renderizan ambas vistas y se alternan con clases (`hidden md:block` / `md:hidden`) para evitar parpadeo de hidratación.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Button`, `Input`, `Field*`, `Select*`, `Badge`, `Empty*`, `Table*`, `Dialog*`, `AlertDialog*`, `DropdownMenu*`, `Sheet`, `Separator`, `Breadcrumb*`, `Label`, `Card` | reutilizar | `src/components/ui/` | Ya instalados. `DropdownMenu` deja de usarse en las filas (iconos del diseño). |
| `Badge` | extender | `src/components/ui/badge.tsx` | Variante `success` (`bg-success text-success-foreground`). |
| `Sidebar*`, `Tooltip*`, `Skeleton`, `useIsMobile` | agregar de shadcn | `src/components/ui/{sidebar,tooltip,skeleton}.tsx`, `src/hooks/use-mobile.ts` | `npx shadcn@latest add sidebar tooltip skeleton` (verificado: existe en `base-nova`; trae `use-mobile`). No sobrescribir los componentes ya presentes. Skeleton lo exige `sidebar`. |
| `--sidebar*` tokens | extender | `src/app/globals.css` | Remapear a tokens del proyecto (P2). |
| `BrandLogo`, `focus-ring`, `ThemeToggle` | reutilizar | `src/components/shared`, `globals.css` | Logo en el sidebar; `ThemeToggle` en el header del shell. |
| `canManage`, `getAllowedActions`, `getPermissions` | extender | `src/lib/auth/permissions.ts` | Nuevas acciones/permisos/regla admin-target; nuevo `getManagementLock`. |
| `AuditAction` | extender | `src/modules/audit/services/audit.service.ts` | `user.updated`, `organizer.removed`, `user.deleted`. |
| `userRolesService` (`setStaffRole`, `createOrganizer`, `setOrganizerStatus`, `setUserActive`, `inviteUser`) | reutilizar + extender | `src/modules/users/services/user-roles.service.ts` | Se agregan `updateUser` y `deleteUser` reutilizando helpers privados existentes (`authorize`, `execute`, `applyStaffRole`, `applyOrganizer`) (DRY). |
| `usersService.listForAdmin`, `anonymizeByClerkId` | extender | `src/modules/users/services/users.service.ts` | Filtros `role`/`status`, conteo con el mismo join; `anonymizeByClerkId` pasa a usar el helper compartido. |
| `clerkAdminService` | extender | `src/modules/users/services/clerk-admin.service.ts` | `updateName`, `deleteUser`. |
| Helper de anonimizado | crear | `src/modules/users/utils/anonymize-user.ts` | Hoy vive dentro de `usersService.anonymizeByClerkId`; ahora lo necesitan dos (webhook y `deleteUser`) → extraer. |
| Planificador de cambios de rol | crear | `src/modules/users/utils/role-change.ts` | Puro, compartido por UI (rol principal) y service. |
| Schemas/tipos admin | extender | `src/modules/admin/schemas/admin-user.schema.ts`, `types/admin-user.types.ts` | Ver Contratos. |
| Acciones | extender | `src/modules/admin/actions/admin-users.actions.ts` | `updateUserAction`, `deleteUserAction`. |
| `AdminShell` | extender (reescribir) | `src/modules/admin/components/admin-shell.tsx` | Sidebar + header; mismo nombre y export. |
| Navegación, sidebar, header | crear | `src/modules/admin/utils/admin-nav.ts`, `components/admin-sidebar.tsx`, `components/admin-header.tsx` | No existe equivalente; reusable por 017 (entonces mover a `src/components/shared`). |
| `UsersTable` | extender (reescribir) | `src/modules/admin/components/users-table.tsx` | Columnas del diseño. |
| `UserRowActions` | extender (reescribir) | `src/modules/admin/components/user-row-actions.tsx` | Iconos + diálogos; sale el `DropdownMenu`. |
| `InviteUserDialog` | extender | `src/modules/admin/components/invite-user-dialog.tsx` | Aviso vía `useUsersNotice`; texto del diseño; rol por defecto según permisos. |
| Edición, cards, toolbar, paginación, badges, aviso, helpers | crear | ver Tareas | No existen equivalentes. |
| Páginas | extender | `src/app/(admin)/admin/layout.tsx`, `users/page.tsx` | Delgadas. `admin/page.tsx` sin cambios (redirige a `/admin/users`). |

## Contratos

### Permisos (`src/lib/auth/permissions.ts`)

```ts
// Nuevos permisos: ADMIN_PERMISSIONS += "users:edit"; SUPER_ADMIN_PERMISSIONS += "users:delete"
export type ManagedUserAction =
  | "grant-admin" | "revoke-admin" | "create-organizer" | "remove-organizer"
  | "suspend-organizer" | "reactivate-organizer"
  | "deactivate-user" | "reactivate-user" | "edit-user" | "delete-user"
// ACTION_PERMISSION: remove-organizer→organizers:manage, edit-user→users:edit, delete-user→users:delete
// canManage: orden self → protected-target → (target.staffRole==="admin" && actor.staffRole!=="super_admin" → forbidden) → permiso
export type ManagementLock = "self" | "protected" | "super-admin-only"
export function getManagementLock(actor: ManagedSubject, target: ManagedSubject): ManagementLock | null
```

### Schemas y tipos admin

```ts
// schemas/admin-user.schema.ts
export const USERS_PAGE_SIZES = [8, 16, 24] as const
export const USER_ROLE_FILTERS = ["super_admin", "admin", "organizer", "customer"] as const
export const ORGANIZER_STATUS_FILTERS = ["onboarding", "active", "suspended"] as const
export const listUsersQuerySchema   // { q?: string (trim, ≤100), role?: (typeof USER_ROLE_FILTERS)[number],
                                    //   status?: (typeof ORGANIZER_STATUS_FILTERS)[number],
                                    //   page: int ≥1 (def. 1), pageSize: 8|16|24 (def. 8) }; todo inválido → default, nunca lanza
export type ListUsersQuery = z.output<typeof listUsersQuerySchema>
export const updateUserSchema       // { userId: uuid, fullName?: trim 2–80, role?: "customer"|"organizer"|"admin",
                                    //   organizerStatus?: "active"|"suspended", reason?: trim ≤280 }
                                    // refine: organizerStatus==="suspended" ⇒ reason obligatorio ("Ingresa el motivo de la suspensión")
                                    // refine: al menos uno de fullName/role/organizerStatus ("No hay cambios que guardar")
export const deleteUserSchema       // { userId: uuid }
// (se mantienen inviteUserSchema, setStaffRoleSchema, createOrganizerSchema, setOrganizerStatusSchema, setUserActiveSchema)

// types/admin-user.types.ts
export type AdminActionErrorCode = /* actuales */ | "blocked"
export type AdminUserListItem = AdminUserRow & {
  isSelf: boolean
  allowedActions: ManagedUserAction[]
  lock: ManagementLock | null
}
```

### Planificador de roles (`src/modules/users/utils/role-change.ts`)

```ts
export type PrimaryRole = "super_admin" | "admin" | "organizer" | "customer"
export type EditableRole = "customer" | "organizer" | "admin"
export type RoleOp = "grant-admin" | "revoke-admin" | "create-organizer" | "remove-organizer"
export function getPrimaryRole(s: { staffRole: StaffRole | null; hasOrganizer: boolean }): PrimaryRole
export function planRoleChange(
  current: { staffRole: StaffRole | null; hasOrganizer: boolean },
  desired: EditableRole,
): RoleOp[]   // [] si ya coincide. admin: [grant-admin] si no era admin (perfil intacto). organizer: [revoke-admin?, create-organizer?]. customer: [revoke-admin?, remove-organizer?]
```

### Servicios

```ts
// user-roles.service.ts — tipos
export type RoleServiceError = /* actuales */ | "blocked" | "invalid-change"
export type DeleteBlocker = "pending-orders" | "valid-tickets" | "published-events"
export type RoleServiceResult<T extends object = object> =
  | ({ ok: true; warning?: "clerk-sync-failed" } & T)
  | { ok: false; error: RoleServiceError; blockers?: DeleteBlocker[] }

userRolesService.updateUser(i: {
  actorId: string; targetId: string
  fullName?: string; role?: EditableRole
  organizerStatus?: "active" | "suspended"; reason?: string
}): Promise<RoleServiceResult>
// Una transacción. Carga actor/target; por cada cambio exige canManage (edit-user para nombre; ops de planRoleChange;
// suspend/reactivate-organizer para estado). Sin cambios efectivos → ok sin auditoría (idempotente).
// organizerStatus sin perfil resultante → "invalid-change". remove-organizer con eventos → "conflict" (ver regla de (c) abajo).
// Auditoría una fila por cambio: user.updated {from,to}, staff.granted/revoked, organizer.created/removed/suspended/reactivated.
// Clerk tras commit: updateName (si cambió el nombre) + syncRoleMetadata (si cambió rol/estado); fallo → warning.

userRolesService.deleteUser(i: { actorId: string; targetId: string }): Promise<RoleServiceResult>
// canManage "delete-user" → blockers → anonymizeUser(tx,…) + organizer suspended("Cuenta eliminada") + audit user.deleted → commit → clerkAdminService.deleteUser.

// users.service.ts
usersService.listForAdmin(query: {
  q?: string; role?: (typeof USER_ROLE_FILTERS)[number]; status?: (typeof ORGANIZER_STATUS_FILTERS)[number]
  page: number; pageSize: number
}): Promise<{ rows: AdminUserRow[]; total: number }>

// clerk-admin.service.ts
clerkAdminService.updateName(clerkUserId: string, fullName: string): Promise<void>
clerkAdminService.deleteUser(clerkUserId: string): Promise<void>

// utils/anonymize-user.ts
export async function anonymizeUser(tx: Tx, user: { id: string }, actorUserId: string | null): Promise<void>
// Aplica la anonimización y registra audit: "user.deleted" si actorUserId, "user.anonymized" si null (webhook).
```

Regla de (c) en el contrato de `updateUser`: bajar a **Cliente** un organizador que tiene **cualquier** evento (FK `restrict`) devuelve `{ ok:false, error:"conflict" }` (mensaje: "Tiene eventos; suspéndelo en su lugar"); sin eventos se elimina el perfil (`organizer.removed`).

### Acciones (`admin-users.actions.ts`, "use server"; mismo patrón `checkPermission → safeParse → service → revalidatePath("/admin/users") → AdminActionResult`)

```ts
export async function updateUserAction(input: unknown): Promise<AdminActionResult>  // permiso base users:edit; la autorización fina (rol/estado) la hace el service con canManage
export async function deleteUserAction(input: unknown): Promise<AdminActionResult>  // users:delete
```
Mapeo de errores a español: `blocked` → `code: "blocked"`, mensaje "No se puede eliminar: tiene compras pendientes / entradas vigentes / eventos publicados." (según `blockers`); `invalid-change` → `code: "invalid"`; `conflict` en `updateUser` → "Tiene eventos; suspéndelo en su lugar." Éxito: "Cambios guardados." / "<nombre> fue eliminado." (el nombre lo arma el cliente; la acción devuelve "Usuario eliminado.").

### Navegación y shell

```ts
// utils/admin-nav.ts
export type AdminNavItem = { id: string; label: string; icon: LucideIcon; href: string | null }  // href null = Próximamente
export type AdminNavSection = { id: "admin" | "organizer"; label: string; items: AdminNavItem[] }
export function getAdminNav(staffRole: StaffRole | null): AdminNavSection[]
// "Administración" [Dashboard(null), Usuarios(/admin/users), Organizadores(null)] solo si staffRole !== null;
// "Organizador" [Resumen, Mis eventos, Crear evento, Check-in, Pagos] (todos null) siempre.
export function findNavMatch(pathname: string, sections: AdminNavSection[]): { section: AdminNavSection; item: AdminNavItem } | null

// components
export type AdminShellProps = { children: React.ReactNode; userName: string | null; email: string; staffRole: StaffRole | null; defaultOpen: boolean }
export function AdminShell(props: AdminShellProps): JSX.Element            // servidor: SidebarProvider + TooltipProvider + AdminSidebar + SidebarInset(AdminHeader + <main>)
export function AdminSidebar(props: { sections: AdminNavSection[]; userName: string | null; email: string; roleLabel: string }): JSX.Element  // "use client": usa usePathname para aria-current="page"
export function AdminHeader(props: { sections: AdminNavSection[] }): JSX.Element  // "use client": SidebarTrigger (aria-label "Contraer menú"/"Expandir menú", aria-expanded), breadcrumb "Sección / Título", ThemeToggle
```
Pie del sidebar: "Ver sitio" (link a `/`), "Cerrar sesión" (`useClerk().signOut({ redirectUrl: "/" })`), avatar-icono + nombre (o correo) + rol ("Super admin"/"Administrador"). En rail se ocultan textos (quedan iconos con tooltip y `aria-label`); los encabezados de sección se sustituyen por un separador.

### Vista de usuarios

```ts
// utils/user-presentation.ts
export const ROLE_LABELS: Record<PrimaryRole, string>
export const ORGANIZER_STATUS_LABELS: Record<OrganizerStatus, string>   // Aprobado | Pendiente | Suspendido
export const LOCK_LABELS: Record<ManagementLock, string>                // Tu cuenta | Cuenta protegida | Solo el super admin
export function getInitials(name: string): string                       // 2 letras, mayúsculas
export function getDisplayName(u: Pick<AdminUserRow,"fullName"|"email">): string
export function getApplicableActions(row: AdminUserListItem): ManagedUserAction[]
//   filtra allowedActions por estado (create-organizer solo sin perfil; remove-organizer con perfil; suspend-organizer si status≠suspended;
//   reactivate-organizer si status≠active — "Aprobar" cuando es onboarding; deactivate/reactivate-user según deactivatedAt; grant/revoke-admin según staffRole)

// utils/users-href.ts
export function buildUsersHref(query: Partial<ListUsersQuery>): string  // omite defaults (page 1, pageSize 8, vacíos)
export function getPageWindow(page: number, pageCount: number, size?: number): number[]  // ventana de 5 como el diseño

// components (todos reciben AdminUserListItem[] ya calculados en servidor; la UI no decide permisos)
UsersNoticeProvider / UsersNotice / useUsersNotice(): { show(message: string): void }
RoleBadge(props: { row: Pick<AdminUserRow,"staffRole"|"organizer"> }) ; OrganizerStatusBadge(props: { status: OrganizerStatus }) ; UserIdentity(props: { row: AdminUserListItem })
UsersTable(props: { rows: AdminUserListItem[] })                                   // ≥ md; Empty "Sin resultados" con botón/link "Limpiar filtros"
UsersCards(props: { rows: AdminUserListItem[] })                                   // < md
UsersToolbar(props: { query: ListUsersQuery })                                     // "use client": búsqueda GET, selects Rol y Estado de organizador, "Limpiar"
UsersPagination(props: { query: ListUsersQuery; total: number })                   // "use client" (selector Filas) + links
UserRowActions(props: { user: AdminUserListItem; layout: "icons" | "labeled" })    // "use client": icono/botón Aprobar-Suspender, Editar, Desactivar-Reactivar, Eliminar o candado+motivo
EditUserDialog(props: { user: AdminUserListItem; open: boolean; onOpenChange(open: boolean): void; triggerRef: React.RefObject<HTMLElement | null> })
InviteUserDialog(props: { canInviteAdmin: boolean; canInviteOrganizer: boolean })  // contrato de 021 sin cambios de props
```
Etiquetas del toolbar (diseño): "Buscar" ("Nombre o correo"), "Rol" (Todos los roles / Super admin / Administrador / Organizador / Cliente), "Estado de organizador" (Todos / Aprobado / Pendiente / Suspendido), botón "Limpiar" (solo si hay q, role o status). Resumen bajo el título: "<total> usuarios registrados" sin filtros; "<total> resultados" con filtros. Rango: "Mostrando a–b de total" / "0 resultados". Título `h1` "Usuarios y roles".

### Páginas

- `(admin)/admin/layout.tsx`: `requireStaff("admin", { returnTo: "/admin/users" })`; `defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"`; `<AdminShell userName email staffRole defaultOpen>`.
- `(admin)/admin/users/page.tsx`: `requirePermission("users:read")`; `await searchParams` → `listUsersQuerySchema.parse`; `listForAdmin`; si `page > pageCount` y `total > 0` → `redirect(buildUsersHref({...query, page: pageCount}))`; por fila `getAllowedActions` + `getManagementLock` → `AdminUserListItem`; compone `UsersNoticeProvider` > cabecera (`h1`, resumen, `InviteUserDialog`) + `UsersNotice` + `UsersToolbar` + `UsersTable` + `UsersCards` + `UsersPagination`.

## Tareas

### Preparación (serie)

- **P1** shadcn: `npx shadcn@latest add sidebar tooltip skeleton` (responder "no" si pide sobrescribir `button`, `input`, `separator`, `sheet`); agregar variante `success` a `Badge` — archivos: `src/components/ui/sidebar.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/skeleton.tsx`, `src/hooks/use-mobile.ts`, `src/components/ui/badge.tsx`
- **P2** Tokens y documentación de diseño: remapear `--sidebar*` en `:root` y `.dark` a tokens del proyecto (`--sidebar`→`var(--card)`, `-foreground`→`var(--foreground)`, `-primary`→`var(--primary)`, `-primary-foreground`→`var(--primary-foreground)`, `-accent`→`var(--accent)`, `-accent-foreground`→`var(--accent-foreground)`, `-border`→`var(--border)`, `-ring`→`var(--ring)`); verificar contraste en ambos temas. Actualizar design-system (§2.1/2.2 filas `--sidebar*`, nueva subsección "Shell de administración": anchos 264/76 px, ítem activo `bg-primary/10 text-primary`, variante `success` de Badge, tabla de equivalencias de D1) — archivos: `src/app/globals.css`, `docs/design/design-system.md`
- **P3** Permisos y auditoría: nuevos permisos/acciones/regla admin-target/`getManagementLock` (con tests de la matriz completa); nuevos `AuditAction` — archivos: `src/lib/auth/permissions.ts`, `src/lib/auth/permissions.test.ts`, `src/modules/audit/services/audit.service.ts`, `src/modules/audit/services/audit.service.test.ts`, y ajuste mínimo de compilación (casos nuevos del `switch`/`COPY`, sin cambio visual): `src/modules/admin/components/users-table.tsx`, `src/modules/admin/components/user-row-actions.tsx`
- **P4** Contratos de dominio: schemas (`listUsersQuerySchema` con role/status/pageSize, `updateUserSchema`, `deleteUserSchema`), tipos (`blocked`, `AdminUserListItem`), `role-change.ts` — archivos: `src/modules/admin/schemas/admin-user.schema.ts`, `src/modules/admin/schemas/admin-user.schema.test.ts`, `src/modules/admin/types/admin-user.types.ts`, `src/modules/users/utils/role-change.ts`, `src/modules/users/utils/role-change.test.ts`
- **P5** Piezas compartidas de presentación: `user-presentation.ts`, `user-badges.tsx` (`RoleBadge`, `OrganizerStatusBadge`, `UserIdentity`), `users-notice.tsx` — archivos: `src/modules/admin/utils/user-presentation.ts`, `src/modules/admin/utils/user-presentation.test.ts`, `src/modules/admin/components/user-badges.tsx`, `src/modules/admin/components/user-badges.test.tsx`, `src/modules/admin/components/users-notice.tsx`, `src/modules/admin/components/users-notice.test.tsx`

### Paralelo

(Tras P1–P5 en verde. Durante el bloque nadie corre `npm install` ni `npm run build`; los componentes se prueban contra los contratos con acciones/servicios mockeados.)

- **TA** Backend de usuarios: `listForAdmin` con filtros y conteo coherente; `anonymizeUser` extraído y usado por `anonymizeByClerkId`; `clerkAdminService.updateName/deleteUser`; `userRolesService.updateUser/deleteUser` — archivos: `src/modules/users/services/user-roles.service.ts`, `src/modules/users/services/user-roles.service.test.ts`, `src/modules/users/services/users.service.ts`, `src/modules/users/services/users.service.test.ts`, `src/modules/users/services/clerk-admin.service.ts`, `src/modules/users/services/clerk-admin.service.test.ts`, `src/modules/users/utils/anonymize-user.ts`, `src/modules/users/utils/anonymize-user.test.ts`
- **TB** Server Actions `updateUserAction` y `deleteUserAction` + mapeo de errores — archivos: `src/modules/admin/actions/admin-users.actions.ts`, `src/modules/admin/actions/admin-users.actions.test.ts`
- **TC** Shell: `admin-nav.ts`, `AdminSidebar`, `AdminHeader`, `AdminShell` reescrito, layout — archivos: `src/modules/admin/utils/admin-nav.ts`, `src/modules/admin/utils/admin-nav.test.ts`, `src/modules/admin/components/admin-sidebar.tsx`, `src/modules/admin/components/admin-sidebar.test.tsx`, `src/modules/admin/components/admin-header.tsx`, `src/modules/admin/components/admin-shell.tsx`, `src/app/(admin)/admin/layout.tsx`
- **TD1** Vista de usuarios (desktop) y página: tabla, toolbar, paginación, `users-href`, página — archivos: `src/modules/admin/components/users-table.tsx`, `src/modules/admin/components/users-table.test.tsx`, `src/modules/admin/components/users-toolbar.tsx`, `src/modules/admin/components/users-toolbar.test.tsx`, `src/modules/admin/components/users-pagination.tsx`, `src/modules/admin/components/users-pagination.test.tsx`, `src/modules/admin/utils/users-href.ts`, `src/modules/admin/utils/users-href.test.ts`, `src/app/(admin)/admin/users/page.tsx`
- **TD2** Acciones por fila y diálogos: `UserRowActions` (iconos/labeled, candado+motivo, confirmaciones de aprobar/suspender/desactivar/eliminar con `AlertDialog`), `EditUserDialog`, `InviteUserDialog` ajustado — archivos: `src/modules/admin/components/user-row-actions.tsx`, `src/modules/admin/components/user-row-actions.test.tsx`, `src/modules/admin/components/edit-user-dialog.tsx`, `src/modules/admin/components/edit-user-dialog.test.tsx`, `src/modules/admin/components/invite-user-dialog.tsx`, `src/modules/admin/components/invite-user-dialog.test.tsx`
- **TE** Móvil: `UsersCards` (tarjetas del diseño móvil, `UserRowActions layout="labeled"`) — archivos: `src/modules/admin/components/users-cards.tsx`, `src/modules/admin/components/users-cards.test.tsx`

Los archivos de TA–TE son disjuntos entre sí y con P1–P5. `page.tsx` (TD1) importa `UsersCards` (TE) y `EditUserDialog`/`UserRowActions` (TD2) por contrato; la integración la valida el reviewer con el build final.

## Criterios de aceptación

**Shell**
- [ ] AC1 `/admin/users` (staff) muestra sidebar a la izquierda (264 px) con secciones "Administración" (Dashboard, Usuarios, Organizadores) y "Organizador" (Resumen, Mis eventos, Crear evento, Check-in, Pagos), header con botón de menú y breadcrumb "Administración / Usuarios", y pie con "Ver sitio", "Cerrar sesión", nombre y rol ("Super admin" o "Administrador").
- [ ] AC2 "Usuarios" lleva `aria-current="page"` en `/admin/users`; es el único ítem con enlace. Dashboard, Organizadores y los cinco ítems de "Organizador" tienen `aria-disabled="true"`, no navegan (clic o Enter) y muestran el tooltip "Próximamente" tanto con hover como con foco de teclado.
- [ ] AC3 El botón del header contrae el sidebar a rail de 76 px (sin etiquetas ni encabezados de sección, con tooltip por ítem y `aria-label`), lo expande de nuevo, expone `aria-expanded` y su `aria-label` alterna "Contraer menú"/"Expandir menú". Ctrl/Cmd+B hace lo mismo. El estado persiste al recargar (cookie `sidebar_state`).
- [ ] AC4 Por debajo de 768 px el sidebar no ocupa espacio: el botón del header abre un drawer con la misma navegación y pie, se cierra con Escape, con el scrim o el botón de cierre, y devuelve el foco al botón.
- [ ] AC5 "Cerrar sesión" cierra la sesión de Clerk y redirige a `/`. "Ver sitio" navega a `/`.
- [ ] AC6 Los estilos usan solo tokens del proyecto (sin hex del diseño); `docs/design/design-system.md` documenta el remapeo de `--sidebar*` y la variante `success`; legible en claro y oscuro (contraste de texto ≥ 4.5:1 y foco `focus-ring` visible).

**Vista de usuarios**
- [ ] AC7 La página muestra `h1` "Usuarios y roles", el resumen de total, el botón "Invitar usuario" (solo si el actor puede invitar algún rol), buscador, selects "Rol" y "Estado de organizador", "Limpiar" (visible solo con filtros activos) y la tabla con columnas Usuario, Rol, Organizador, Registro y Acciones.
- [ ] AC8 Cada fila muestra iniciales, nombre (o correo), correo, badge de rol principal (Super admin / Administrador / Organizador / Cliente), estado de organizador con texto e icono (Aprobado / Pendiente / Suspendido) cuando hay perfil, fecha de registro, badge "Tú" en la fila propia y badge "Desactivado" si aplica.
- [ ] AC9 Filtros por URL: `?q=` filtra por nombre o correo; `?role=` y `?status=` filtran según D10 (p. ej. `role=customer` solo usuarios sin staff ni perfil; `status=suspended` incluye un admin que además es organizador suspendido); combinables; cambiar un filtro o el tamaño reinicia a la página 1; valores inválidos se ignoran; el conteo total coincide con la lista filtrada. "Limpiar" vuelve a `/admin/users`.
- [ ] AC10 Paginación: filas 8/16/24 (por defecto 8), rango "Mostrando a–b de total", botones Anterior/Siguiente (`aria-disabled` en los extremos), ventana numerada de hasta 5 páginas con `aria-current="page"`, y selector "Filas". `?page` mayor al total redirige a la última página. Sin resultados: mensaje "Sin resultados" con acción "Limpiar filtros".
- [ ] AC11 Bloqueos: la fila propia muestra candado + "Tu cuenta"; la de un super admin "Cuenta protegida"; la de un admin, visto por un admin, "Solo el super admin". Sin botones de acción en esas filas. Un `admin` ve en filas de cliente/organizador solo Aprobar-Suspender (si hay perfil) y Editar, y no ve Eliminar ni Desactivar; el super admin ve además Desactivar/Reactivar y Eliminar.
- [ ] AC12 Aprobar/Suspender: "Suspender" abre un `AlertDialog` que exige motivo (error `role="alert"` si falta); "Aprobar" (desde Pendiente o Suspendido) pide confirmación y deja el perfil `active`. Éxito: aviso `role="status"` verde con botón "Cerrar aviso"; la fila cambia de badge tras `revalidatePath`.
- [ ] AC13 Invitar: el diálogo conserva el comportamiento de 021 (AC13–AC15: aplicar de inmediato si el correo existe, invitación de Clerk si no, `conflict` si hay invitación pendiente), con el texto del diseño, y el éxito se muestra como aviso de página. El admin sin permisos no ve el botón.
- [ ] AC14 Editar: abre un diálogo con Nombre editable, Correo deshabilitado (con su nota), Rol y, si corresponde, Estado de organizador. Guardar envía solo lo cambiado; "Guardar cambios" queda en `aria-busy` sin doble envío; sin cambios muestra "No hay cambios que guardar" sin llamar a la acción; el foco vuelve al botón "Editar" al cerrar; Escape y Cancelar cierran sin guardar.
- [ ] AC15 Editar nombre: se actualiza `users.full_name` y se llama a Clerk `updateUser` con nombre/apellido; hay una fila `audit_logs` `user.updated` con from/to; si Clerk falla, `ok: true` con aviso de sincronización y la DB conserva el cambio. Un admin puede editar el nombre de clientes y organizadores, nunca de admins, super admin ni de sí mismo.
- [ ] AC16 Editar rol (solo super admin; para admin el select está deshabilitado con su nota): Cliente → Organizador crea perfil `active` con slug único; Organizador → Cliente sin eventos elimina el perfil (`organizer.removed`); con eventos devuelve error "Tiene eventos; suspéndelo en su lugar" sin cambios; → Administrador asigna `staff_role = 'admin'` conservando el perfil; Administrador → Cliente/Organizador revoca admin. `publicMetadata` de Clerk queda coherente con la DB. Cada cambio aplicado deja exactamente una fila de auditoría; repetir el mismo guardado no duplica filas.
- [ ] AC17 Editar estado de organizador: Suspendido exige motivo (campo aparece); Aprobado deja `active`; "Pendiente" no es elegible como destino. Disponible para admin y super admin; con rol resultante distinto de Organizador (sin perfil) el campo no se muestra.
- [ ] AC18 Eliminar (solo super admin): `AlertDialog` `role="alertdialog"` con el texto del diseño; Cancelar no cambia nada; Eliminar anonimiza la fila (sin PII, `deleted_at`), suspende el perfil de organizador si existe, registra `user.deleted` con el actor, elimina la cuenta en Clerk tras el commit y la fila desaparece de la lista. Si Clerk falla → éxito con aviso y la cuenta no puede acceder.
- [ ] AC19 Eliminar con bloqueos (órdenes `pending`, tickets `valid` de eventos futuros, eventos `published` del organizador): no cambia nada y el diálogo muestra los motivos en `role="alert"`. Eliminarse a uno mismo o a un super admin es imposible por UI y por acción (`self` / `protected-target`). El webhook `user.deleted` de una cuenta ya eliminada desde aquí no duplica auditoría.
- [ ] AC20 Seguridad de acciones: llamar directamente a `updateUserAction`/`deleteUserAction` (o las existentes) sin permiso devuelve `forbidden` sin cambios en DB; un admin que intenta cambiar el rol, eliminar, desactivar o editar a otro admin recibe `forbidden`. Cada mutación exitosa deja una sola fila en `audit_logs` con actor, entidad y metadata correctos (021 AC19).
- [ ] AC21 Móvil (< 768 px): la lista se muestra como tarjetas (avatar, nombre y correo con truncado, badges, fecha, acciones o candado + motivo; botón "Editar" con texto y papelera con `aria-label`), filtros en una fila de dos selects con etiquetas accesibles, paginación "Anterior / Página X de Y / Siguiente"; no hay scroll horizontal de página; ≥ 768 px se muestra la tabla (con scroll horizontal interno si no cabe).
- [ ] AC22 A11y: tabla con `<caption>` y `<th scope="col">`; todos los controles operables con teclado con `focus-ring`; botones de icono con `aria-label` que incluye el nombre del usuario y área ≥ 44 px; diálogos devuelven el foco al disparador; errores en `role="alert"`; avisos en `role="status"`; estado nunca solo por color.
- [ ] AC23 `npm run lint`, `npm run test` y `npm run build` pasan; 020 y 021 (webhook, guards, invitaciones) siguen funcionando.

## Tests obligatorios (Vitest + RTL)

- `src/lib/auth/permissions.test.ts` — matriz de acciones nuevas por rol; admin sobre admin → `forbidden`; `getManagementLock` (self, protected, super-admin-only, null); orden de denegaciones; admin no obtiene `users:delete`.
- `src/modules/audit/services/audit.service.test.ts` — acepta las acciones nuevas (si el test existente enumera acciones).
- `src/modules/admin/schemas/admin-user.schema.test.ts` — `listUsersQuerySchema`: defaults (page 1, pageSize 8), pageSize inválido (10, "x") → 8, role/status inválidos → undefined, q recortado; `updateUserSchema`: nombre muy corto/largo, suspendido sin motivo rechaza, sin cambios rechaza, rol inválido, uuid inválido, válido; `deleteUserSchema`.
- `src/modules/users/utils/role-change.test.ts` — `getPrimaryRole` (precedencia); `planRoleChange` para las 4×3 combinaciones relevantes (incluye admin+perfil → organizer, organizer → customer, sin cambios → `[]`).
- `src/modules/admin/utils/user-presentation.test.ts` — iniciales, nombre, etiquetas, `getApplicableActions` por estado (onboarding → "Aprobar", suspended, sin perfil, desactivado).
- `src/modules/admin/utils/users-href.test.ts` — `buildUsersHref` omite defaults y codifica `q`; `getPageWindow` (inicio, medio, final, pocas páginas).
- `src/modules/admin/utils/admin-nav.test.ts` — sección "Administración" solo con staff; solo `/admin/users` tiene `href`; `findNavMatch` y breadcrumb.
- `src/modules/users/services/users.service.test.ts` — `listForAdmin` aplica role/status/q y el conteo usa el mismo filtro; `anonymizeByClerkId` sigue idempotente con el helper.
- `src/modules/users/utils/anonymize-user.test.ts` — limpia PII, fija `deleted_at`, audita `user.deleted` (con actor) o `user.anonymized` (sin actor).
- `src/modules/users/services/clerk-admin.service.test.ts` — `updateName` divide nombre/apellido; `deleteUser` llama al SDK.
- `src/modules/users/services/user-roles.service.test.ts` — `updateUser`: nombre, rol (crear/quitar perfil, conflicto con eventos, admin conserva perfil), estado de organizador, `forbidden`/`self`/`protected-target`/`not-found`/`invalid-change`, una auditoría por cambio, idempotencia, Clerk falla tras commit → `warning`. `deleteUser`: ok, cada bloqueo (`pending-orders`, `valid-tickets`, `published-events`), permisos (admin → `forbidden`), perfil suspendido, Clerk falla → `warning`.
- `src/modules/admin/actions/admin-users.actions.test.ts` — para `updateUserAction`/`deleteUserAction`: `signed-out`, `forbidden`, `invalid` con `fieldErrors`, mapeo de errores (incl. `blocked`, `conflict`, `invalid-change`), éxito llama a `revalidatePath("/admin/users")`, permiso exigido.
- `src/modules/admin/components/admin-sidebar.test.tsx` — secciones y etiquetas según rol; ítems deshabilitados (`aria-disabled`, sin navegación, tooltip "Próximamente" por foco); `aria-current`; "Cerrar sesión" llama a `signOut` (mock de Clerk).
- `src/modules/admin/components/users-table.test.tsx`, `users-cards.test.tsx` — columnas/etiquetas, badges con texto, "Tú", "Desactivado", vacío con "Limpiar filtros", `caption`/`scope`.
- `src/modules/admin/components/users-toolbar.test.tsx` — envía `q`, cambiar select navega con `page` reiniciada, "Limpiar" solo con filtros (mock de `next/navigation`).
- `src/modules/admin/components/users-pagination.test.tsx` — rango, prev/next deshabilitados en extremos, `aria-current`, cambiar filas reinicia página.
- `src/modules/admin/components/user-row-actions.test.tsx` — solo botones permitidos; candado + motivo para cada `lock`; suspender exige motivo; confirmación antes de ejecutar; eliminar muestra bloqueos en `role="alert"`; carga sin doble envío; éxito llama a `useUsersNotice().show`.
- `src/modules/admin/components/edit-user-dialog.test.tsx` — correo deshabilitado; envía solo cambios; sin cambios no llama; rol deshabilitado para admin; campo de motivo al elegir Suspendido; error de acción en `role="alert"`; foco devuelto.
- `src/modules/admin/components/invite-user-dialog.test.tsx` — se actualiza el existente (aviso vía provider; opciones de rol según props).
- `src/modules/admin/components/user-badges.test.tsx`, `users-notice.test.tsx` — etiquetas por rol/estado con texto; el aviso aparece con `role="status"` y se cierra.

No requieren test: `admin-header.tsx`, `admin-shell.tsx`, layout y páginas de `src/app/**` (delgados), componentes shadcn generados.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (el reviewer, al cerrar el bloque paralelo)
- **Manual** (con 020 completo y migración aplicada): como super admin abrir `/admin/users` y recorrer AC1–AC22 (contraer/expandir, filtros por URL, editar nombre/rol/estado, eliminar un usuario de prueba sin bloqueos y uno con bloqueos); como `admin` verificar AC11, AC15 y AC20; probar ancho 390 px (AC21) y modo oscuro (AC6).

## Preguntas abiertas

Todas tienen una recomendación que esta spec **asume por defecto** (queda lista para implementar si el usuario no objeta); responder distinto cambia solo lo indicado.

- **a) Semántica de "Eliminar".** El diseño dice "irreversible". **Recomendación (asumida, D9):** anonimizar la fila + eliminar la cuenta en Clerk (el webhook `user.deleted` es idempotente), conservando historial económico por las FKs `restrict`, y **bloquear** si hay órdenes pendientes, tickets vigentes de eventos futuros o eventos publicados. Alternativa: "Eliminar" = solo desactivar (reversible, sin Clerk delete) → se quitaría `deleteUser`/`users:delete`/bloqueos y el botón del diseño reutilizaría `setUserActive`. Sub-decisión relacionada: quién elimina — se asumió solo super admin (el diseño lo mostraba también al admin sobre clientes/organizadores).
- **b) Mapeo de estados.** **Recomendación (asumida, D5/D7):** Aprobado = `active`, Pendiente = `onboarding`, Suspendido = `suspended`. "Pendiente" solo aparece si el perfil ya está en `onboarding` (organizadores futuros con Stripe Connect o auto-registro) y no es destino elegible; se sale de él con "Aprobar" (→ `active`, TEMPORAL sin Stripe, 021 D5) o "Suspender". Alternativa: permitir a admin volver a `onboarding` (exigiría nuevo permiso/auditoría y no tiene sentido hasta Stripe).
- **c) Rol "Cliente" y bajar de organizador.** **Recomendación (asumida, D7):** Cliente = sin `staff_role` y sin perfil. Bajar de organizador a Cliente **elimina el perfil** (`organizer.removed`) solo si no tiene ningún evento; con eventos se rechaza ("suspéndelo en su lugar") para no dejar eventos huérfanos (FK `restrict`). Alternativa: conservar el perfil con un nuevo estado "revoked" (migración de enum) y ocultar sus eventos; o permitir la baja y suspender/cancelar sus eventos publicados automáticamente.
- **d) Editar nombre.** **Recomendación (asumida, D8):** escribir en DB y en Clerk (`updateUser` con `firstName`/`lastName`, primer token / resto) para que el webhook `user.updated` no revierta el cambio. Alternativa: solo DB (se revertiría en la siguiente sincronización desde Clerk, por lo que no se recomienda). Nota: para cuentas de Google, Clerk acepta el cambio por la Backend API; conviene confirmarlo manualmente en el primer uso.

Observaciones (decididas, sin pregunta): esta fase es grande (≈ 45 archivos entre P1–P5 y TA–TE). Si hay que repartirla en sesiones, el corte natural es **sesión 1 = P1–P5 + TA + TB** (backend y contratos, sin UI nueva) y **sesión 2 = TC + TD1 + TD2 + TE** (UI y páginas). Para que el proyecto compile tras P3 (ampliar `ManagedUserAction` rompe el `switch` exhaustivo de `users-table.tsx` y el `COPY` de `user-row-actions.tsx`), P3 incluye un ajuste mínimo de esos dos archivos (casos nuevos sin cambio visual); TD1/TD2 los reescriben después.
