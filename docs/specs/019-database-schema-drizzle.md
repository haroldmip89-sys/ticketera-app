# 019 — Base de datos: esquema completo con Drizzle ORM sobre Neon Postgres

- **Estado:** done
- **Modo:** SDD
- **Módulo(s):** `src/db` (carpeta transversal de infraestructura de datos, System Design §3.2; no es un dominio de negocio). Config en la raíz (`drizzle.config.ts`). Sin cambios en `src/modules/**` ni en `src/app/**`.
- **Fuente del modelo:** `docs/superpowers/specs/2026-10-04-system-design-design.md` §6 (MER, enums, tablas, índices). `docs/architecture/erd.md` no existe; no se usa. Otras secciones citadas: §3.2, §3.3, §3.4, §4.1, §4.2, §5.2, §5.8, §7, §8.
- **Depende de:** `DATABASE_URL` de Neon (branch `dev`) en `.env` para aplicar la migración (la generación no la necesita). `.env.example` ya la declara (spec 013).

## Objetivo

Dejar definido en código y versionado el esquema completo de Postgres del System Design §6: **22 tablas, 13 enums, FKs con `onDelete`, checks e índices**, más el cliente Drizzle, la configuración de drizzle-kit, los scripts npm y la migración inicial generada. Al terminar, `db:generate` no produce cambios pendientes, `tsc`/build pasan y la migración se puede aplicar a Neon. Ningún service ni pantalla lee todavía de la base.

## Fuera de alcance

- **Pasar los services a Drizzle** (`eventsService`, `seatingService`, `checkoutService`...) y retirar los mocks: fase posterior (sin número). Los contratos de UI actuales no cambian.
- **Seed de datos** (categorías, recintos, planos y eventos desde los mocks, primer super admin por variable de entorno, `platform_settings` fila `id = 1`): spec posterior. Hasta entonces la tabla `platform_settings` queda vacía.
- Webhooks de Clerk/Stripe, upsert de `users` en el primer request, guards que leen la base (reemplazo de los roles provisionales de la 015), `src/lib/env.ts`.
- Server Actions y transacciones de reserva (`createReservation`, `FOR UPDATE`), cron de vencimiento, concurrencia (System Design §5, §8). Esta spec solo deja las restricciones que las hacen posibles.
- Tests de integración contra Postgres real y `drizzle-kit check` en CI (§8).
- Búsqueda de texto completo o `pg_trgm` para el buscador `/events` (spec 009): hoy se filtra por categoría, fecha y ciudad; YAGNI hasta que haya volumen.
- Producción (Cloud SQL, Cloud SQL Connector, pipeline de migraciones, §3.3).
- Row Level Security: la autorización vive en services y guards (§4.3).

## Decisiones de diseño

- **D1 — Ubicación `src/db/`** (no `src/lib/db`): lo fija System Design §3.2. Estructura: `src/db/client.ts`, `src/db/schema/*.ts`, `src/db/migrations/`. Solo los services de `src/modules/*` podrán importar `@/db` (§3.2); no se impone con lint en esta spec.
- **D2 — Sufijo de archivos de schema:** los archivos de tablas **no** usan `.schema.ts`, porque SETUP §1 reserva ese sufijo para Zod y §3.2 del System Design lo evita expresamente. Son `src/db/schema/<grupo>.ts` en kebab-case e inglés. Ver pregunta Q1.
- **D3 — Driver:** `@neondatabase/serverless` con `drizzle-orm/neon-serverless` y `Pool` (WebSocket). Motivo: la reserva y el webhook necesitan **transacciones interactivas** con `SELECT … FOR UPDATE` (§5.2, §5.4), que `neon-http` no soporta. **Se aparta** de System Design §3.3 ("mismo driver `postgres` para Neon y Cloud SQL"): **TEMPORAL** hasta decidir producción; cambiar de driver solo toca `src/db/client.ts`. Ver pregunta Q2.
- **D4 — Identidad de Clerk:** `users.clerk_user_id` (`text`, único, not null) es el **único** lugar donde aparece el id de Clerk (§4.1). Todas las demás tablas referencian `users.id` (uuid). El código que hoy usa el `userId` de Clerk (guards de la 015, Mis entradas de la 016) lo resolverá a `users.id` mediante `users.clerk_user_id` cuando se conecte la base (fase posterior).
- **D5 — Dinero y fechas:** centavos enteros (`integer`, sufijo `_cents`); `timestamptz` en UTC; imágenes como `*_key` (§6.1). Los mocks actuales usan unidades decimales (`TicketType.price`, `EventItem.priceFrom`): la conversión es de la fase de services, no de esta.
- **D6 — Mapeo con los tipos actuales** (informativo, para la fase de services):
  - `EventCategory.id` ("concerts"...) ↔ `categories.slug`; `EventItem.slug` ↔ `events.slug`; `Venue.address` ↔ `venues.address_line`.
  - `EventItem.seatSelection` ("zone" | "seat") se **deriva** de `venue_layouts.kind` (`zones` | `seated`); `VenueLayout.kind = "theater"` ↔ `seated`.
  - `availability` ("available" | "last-tickets" | "sold-out") **no** se guarda: se calcula de `capacity`, `sold_count` y lo reservado vigente (§6.4 `ticket_types`).
  - Los ids de texto de los mocks (`evt-001-platea`, `platea-F-12`) pasan a uuid; el seed conserva la correspondencia por `slug`/`code`/`(row_label, seat_number)`.
- **D7 — Agrupación en archivos y orden de dependencias** (sin ciclos de importación): `enums` → `identity` → `catalog` → `events` → `purchase` → `operations`. `seat_allocations` (listada en "Eventos" en §6.4) se define en `purchase.ts` porque referencia `reservations` y `tickets`; así `events.ts` no importa de `purchase.ts`.
- **D8 — Convenciones de columnas:** PK `uuid` con `.defaultRandom()` salvo `platform_settings.id` (smallint), `webhook_events.id` (text, id del proveedor) y `saved_events` (PK compuesta). `created_at` en todas; `updated_at` (con `$onUpdate`) en las tablas editables. Helper compartido en `columns.ts` (DRY).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| ORM, driver y kit | agregar | `package.json` | `drizzle-orm`, `@neondatabase/serverless` (deps); `drizzle-kit` (dev). Hoy no hay ORM. Si el driver de WebSocket lo exige en la versión instalada, `ws` + `@types/ws` (dev); decidirlo P1 según la doc de la versión instalada |
| `@next/env` | reutilizar | ya instalado con `next` | `drizzle.config.ts` carga `.env`/`.env.local` con `loadEnvConfig` (drizzle-kit no los lee solo). No se agrega `dotenv` |
| `DATABASE_URL` | reutilizar | `.env.example` (spec 013) | no se modifica; cadena con pooling de Neon |
| `.gitignore` | reutilizar | `.gitignore` | `src/db/migrations` **sí** se versiona (§3.3) |
| Zod | reutilizar | ya instalado | no se usa en esta spec (no se agrega `drizzle-zod`: YAGNI) |
| Helpers `timestamps` y nombres de enum | crear | `src/db/schema/columns.ts` | evita repetir `created_at`/`updated_at` en 20 tablas |
| 13 enums de §6.3 | crear | `src/db/schema/enums.ts` | `pgEnum`, valores exactos de §6.3 |
| Tablas de identidad | crear | `src/db/schema/identity.ts` | `users`, `organizer_profiles`, `platform_settings` |
| Tablas de catálogo | crear | `src/db/schema/catalog.ts` | `categories`, `venues`, `venue_layouts`, `layout_sections`, `seats` |
| Tablas de eventos | crear | `src/db/schema/events.ts` | `events`, `ticket_types`, `saved_events` |
| Tablas de compra | crear | `src/db/schema/purchase.ts` | `reservations`, `reservation_items`, `orders`, `order_items`, `refunds`, `tickets`, `ticket_transfers`, `seat_allocations` |
| Tablas de operación | crear | `src/db/schema/operations.ts` | `webhook_events`, `audit_logs`, `newsletter_subscribers` |
| Barrel del esquema | crear | `src/db/schema/index.ts` | `export *` de los 6 archivos; punto de entrada de drizzle-kit y del cliente |
| Cliente Drizzle | crear | `src/db/client.ts` | `getDb()` perezoso; no existe equivalente (no hay `src/lib/axios.ts` de base) |
| Config drizzle-kit | crear | `drizzle.config.ts` | raíz del repo |
| Migración inicial | crear (generada) | `src/db/migrations/` | salida de `npm run db:generate`; no se escribe a mano |
| Test del esquema | crear | `src/db/schema/schema.test.ts` | lectura estructural con `getTableConfig`, sin conexión |
| Test del cliente | crear | `src/db/client.test.ts` | solo la validación de `DATABASE_URL` |
| `src/lib/env.ts` (§3.2) | no crear | — | fuera de alcance; el cliente lee `DATABASE_URL` directo con error claro |
| Mocks y types de `events`/`seating` | reutilizar sin cambios | `src/modules/**` | solo referencia para D6 |

## Contratos

### Scripts npm (P1)

```jsonc
"db:generate": "drizzle-kit generate",
"db:migrate":  "drizzle-kit migrate",
"db:push":     "drizzle-kit push",   // solo desarrollo local; nunca contra producción
"db:studio":   "drizzle-kit studio"
```

### `drizzle.config.ts`

`defineConfig({ dialect: "postgresql", schema: "./src/db/schema/index.ts", out: "./src/db/migrations", dbCredentials: { url: process.env.DATABASE_URL! } })`. Carga el entorno con `loadEnvConfig(process.cwd())` de `@next/env` antes. `generate` no debe fallar si `DATABASE_URL` está vacía; `migrate`/`push`/`studio` sí fallan con el error de drizzle-kit.

### `src/db/client.ts`

```ts
export type Database = NodePgDatabase-like // el tipo que devuelve drizzle(pool, { schema }) de neon-serverless
export function getDb(): Database           // crea el Pool y el cliente la primera vez; reutiliza la instancia (singleton de módulo)
// Lanza Error("DATABASE_URL is not set") si falta o está vacía. No lanza al importar el módulo.
```

El pool es chico (§3.3). El cliente pasa `{ schema }` (importado de `./schema`) para habilitar `db.query.*`.

### `src/db/schema/columns.ts`

```ts
export const timestamps: { createdAt: ...; updatedAt: ... }   // created_at not null default now(); updated_at not null default now() $onUpdate
export const createdAt: ...                                    // solo created_at (tablas inmutables)
```

### `src/db/schema/enums.ts` (nombre Postgres → valores, exactos de §6.3)

| Export | Tipo Postgres | Valores |
|---|---|---|
| `staffRole` | `staff_role` | `admin`, `super_admin` |
| `organizerStatus` | `organizer_status` | `onboarding`, `active`, `suspended` |
| `layoutKind` | `layout_kind` | `zones`, `seated` |
| `sectionKind` | `section_kind` | `general_admission`, `seated` |
| `eventStatus` | `event_status` | `draft`, `published`, `cancelled`, `suspended` |
| `seatAllocationStatus` | `seat_allocation_status` | `held`, `sold` |
| `reservationStatus` | `reservation_status` | `active`, `converted`, `expired`, `cancelled` |
| `orderStatus` | `order_status` | `pending`, `paid`, `failed`, `refunded` |
| `refundStatus` | `refund_status` | `pending`, `succeeded`, `failed` |
| `ticketStatus` | `ticket_status` | `valid`, `used`, `void` |
| `transferStatus` | `transfer_status` | `pending`, `accepted`, `cancelled` |
| `webhookProvider` | `webhook_provider` | `stripe`, `clerk` |
| `authProvider` | `auth_provider` | `password`, `google` |

### Tablas: export, nombre SQL y notas por archivo

Nombres de columnas SQL en `snake_case` (TS en camelCase). Tipos y nulabilidad **exactamente** como §6.4; aquí solo se fijan los exports, `onDelete`, checks e índices. Cada tabla exporta además `type X = typeof x.$inferSelect` y `type NewX = typeof x.$inferInsert` desde su mismo archivo (sin archivos `.types.ts` aparte: son derivados del esquema).

**`identity.ts`**

| Export (tabla) | Checks / índices | FKs (`onDelete`) |
|---|---|---|
| `users` (`users`) | único `clerk_user_id`; **único sobre `lower(email)`**; `auth_providers` = `auth_provider[]` not null default `{}`; `deleted_at` null | — |
| `organizerProfiles` (`organizer_profiles`) | único `user_id`; único `slug`; único `stripe_account_id` (nullable); `status` default `onboarding`; `charges_enabled`/`payouts_enabled` default false | `user_id → users` **restrict** |
| `platformSettings` (`platform_settings`) | check `id = 1`; `reservation_minutes` default 10; `max_tickets_per_zone` default 6; check de valores ≥ 0 en bps, fijo y minutos > 0 | `updated_by → users` **set null** |

**`catalog.ts`**

| Export | Checks / índices | FKs (`onDelete`) |
|---|---|---|
| `categories` | único `slug`; índice `sort_order` | — |
| `venues` | único `slug`; check `(is_curated = true) = (owner_organizer_id IS NULL)`; índice `city` (filtro de búsqueda); `country` `char(2)` default `US`; `lat`/`lng` `numeric(9,6)` | `owner_organizer_id → organizer_profiles` **restrict**; `created_by → users` **set null** |
| `venueLayouts` (`venue_layouts`) | **único `(id, venue_id)`** (soporta la FK compuesta de `events`); índice `venue_id`; `stage` jsonb | `venue_id → venues` **cascade** |
| `layoutSections` (`layout_sections`) | único `(layout_id, code)`; check `kind <> 'general_admission' OR capacity IS NOT NULL`; `map_area` jsonb | `layout_id → venue_layouts` **cascade** |
| `seats` | único `(section_id, row_label, seat_number)`; `x`/`y` numeric; `is_accessible` default false | `section_id → layout_sections` **cascade** |

**`events.ts`**

| Export | Checks / índices | FKs (`onDelete`) |
|---|---|---|
| `events` | único `slug`; check `doors_open_at IS NULL OR doors_open_at < starts_at`; índices `(status, starts_at)`, `(category_id, starts_at)`, `organizer_id`, `venue_id`; **índice parcial** `(starts_at) WHERE is_featured AND status = 'published'` (landing/carrusel destacado); `status` default `draft`; `is_featured` default false | `organizer_id → organizer_profiles` **restrict**; `category_id → categories` **restrict**; `venue_id → venues` **restrict**; **FK compuesta** `(layout_id, venue_id) → venue_layouts(id, venue_id)` **restrict** (garantiza "el layout pertenece al recinto"; con `layout_id` null no aplica) |
| `ticketTypes` (`ticket_types`) | check `price_cents >= 0`, `capacity >= 0`, `sold_count >= 0`, `sold_count <= capacity`; **único parcial `(event_id, section_id) WHERE section_id IS NOT NULL`**; índice `event_id` | `event_id → events` **cascade** (borrar un borrador); `section_id → layout_sections` **restrict** |
| `savedEvents` (`saved_events`) | PK `(user_id, event_id)`; índice `event_id` | ambas FK **cascade** |

**`purchase.ts`**

| Export | Checks / índices | FKs (`onDelete`) |
|---|---|---|
| `reservations` | **único parcial `(user_id, event_id) WHERE status = 'active'`** (una activa por evento, §5.2); índice `(status, expires_at)` (cron, §5.5); `expires_at` not null | `user_id → users` **restrict**; `event_id → events` **restrict** |
| `reservationItems` (`reservation_items`) | check `quantity >= 1`, `unit_price_cents >= 0`, `seat_id IS NULL OR quantity = 1`; índices `reservation_id` y `ticket_type_id` (suma de "reservado vigente", §5.2) | `reservation_id → reservations` **cascade**; `ticket_type_id → ticket_types` **restrict**; `seat_id → seats` **restrict** |
| `orders` | único `code`; único `reservation_id`; único `stripe_payment_intent_id` (nullable); check `total_cents = subtotal_cents + service_fee_cents` y montos ≥ 0; `currency` `char(3)` default `usd`; índices `(user_id, created_at)` (Mis entradas / pedidos), `(event_id, status)` (ventas del organizador) | `user_id → users` **restrict**; `event_id → events` **restrict**; `reservation_id → reservations` **restrict** |
| `orderItems` (`order_items`) | mismos checks que `reservation_items`; índices `order_id`, `ticket_type_id` | `order_id → orders` **cascade**; `ticket_type_id → ticket_types` **restrict**; `seat_id → seats` **restrict** |
| `refunds` | único `stripe_refund_id`; check `amount_cents > 0`; índice `order_id` | `order_id → orders` **restrict**; `initiated_by → users` **set null** |
| `tickets` | único `qr_token`; índices `holder_user_id` (Mis entradas), `event_id` (check-in), `order_id`, `(event_id, status)`; `status` default `valid` | `order_id → orders` **restrict**; `order_item_id → order_items` **restrict**; `event_id → events` **restrict**; `ticket_type_id → ticket_types` **restrict**; `seat_id → seats` **restrict**; `holder_user_id → users` **restrict**; `checked_in_by → users` **set null** |
| `ticketTransfers` (`ticket_transfers`) | índice `ticket_id`; índice `(to_email, status)` (aceptar traspasos pendientes al registrarse, §5.7); `to_email` guardado en minúsculas por el service | `ticket_id → tickets` **restrict**; `from_user_id → users` **restrict**; `to_user_id → users` **set null** |
| `seatAllocations` (`seat_allocations`) | **único `(event_id, seat_id)`** (un asiento nunca se reserva ni vende dos veces, §5.2); índices `reservation_id` y `ticket_id`; check `status <> 'sold' OR ticket_id IS NOT NULL` | `event_id → events` **cascade**; `seat_id → seats` **restrict**; `reservation_id → reservations` **cascade** (liberar = borrar); `ticket_id → tickets` **set null** |

**`operations.ts`**

| Export | Checks / índices | FKs (`onDelete`) |
|---|---|---|
| `webhookEvents` (`webhook_events`) | PK `id` text (id del proveedor); índice `(provider, type)`; `processed_at` null | — |
| `auditLogs` (`audit_logs`) | índices `(entity_type, entity_id)`, `(actor_user_id, created_at)`; `metadata` jsonb | `actor_user_id → users` **set null** |
| `newsletterSubscribers` (`newsletter_subscribers`) | único `lower(email)` | — |

Regla general de `onDelete`: **restrict** donde hay historial económico o de acceso (órdenes, entradas, usuarios: se anonimizan, no se borran, §4.1); **cascade** solo en hijos que no existen sin su padre (items, asientos, plano del recinto, guardados); **set null** en referencias de auditoría/autoría.

## Tareas

### Preparación (serie)

- **P1** Instalar dependencias, configurar drizzle-kit y scripts. Antes, leer la doc de la versión instalada de `drizzle-orm` (`neon-serverless`, `pgTable`, `check`, índices parciales y FK compuestas) y de `@neondatabase/serverless` (necesidad de `ws` en Node). — archivos: `package.json`, `package-lock.json`, `drizzle.config.ts`
- **P2** Crear los helpers y los enums (contrato compartido por todas las tareas paralelas). — archivos: `src/db/schema/columns.ts`, `src/db/schema/enums.ts`

### Paralelo (una tarea por archivo de schema; export y nombres fijados en "Contratos")

Cada tarea importa de `./columns`, `./enums` y de los archivos anteriores del orden de D7 usando **solo** los exports nombrados del contrato. No ejecutan `npm install`, `npm run build` ni `drizzle-kit` (compartidos).

- **T1** Tablas de identidad. — archivos: `src/db/schema/identity.ts`
- **T2** Tablas de catálogo (importa `identity`). — archivos: `src/db/schema/catalog.ts`
- **T3** Tablas de eventos (importa `identity`, `catalog`). — archivos: `src/db/schema/events.ts`
- **T4** Tablas de compra (importa `identity`, `catalog`, `events`). — archivos: `src/db/schema/purchase.ts`
- **T5** Tablas de operación (importa `identity`). — archivos: `src/db/schema/operations.ts`

### Cierre (serie, tras T1–T5)

- **C1** Barrel del esquema, cliente y tests; luego `npm run db:generate` y revisar el SQL generado contra el contrato (enums, checks, índices parciales, FK compuesta, índice sobre `lower(email)`). Si falta algo, el developer corrige el schema correspondiente (excepción de ownership: solo en este paso, en serie). — archivos: `src/db/schema/index.ts`, `src/db/client.ts`, `src/db/schema/schema.test.ts`, `src/db/client.test.ts`, `src/db/migrations/**` (generado)

## Criterios de aceptación

- [ ] AC1 `package.json` declara `drizzle-orm`, `@neondatabase/serverless` (dependencies) y `drizzle-kit` (devDependencies), y los scripts `db:generate`, `db:migrate`, `db:push`, `db:studio` con los comandos del contrato; `package-lock.json` actualizado.
- [ ] AC2 `drizzle.config.ts` apunta a `./src/db/schema/index.ts` con salida `./src/db/migrations`, dialecto `postgresql`, y `DATABASE_URL` sale de `.env`/`.env.local`.
- [ ] AC3 `npm run db:generate` termina sin error con `DATABASE_URL` vacía y crea la migración inicial en `src/db/migrations/`; una segunda ejecución responde "nothing to migrate" (sin diferencias).
- [ ] AC4 El SQL generado crea exactamente las **22 tablas** y los **13 tipos enum** de §6 con los valores de §6.3.
- [ ] AC5 Existen en el SQL: único `(event_id, seat_id)` en `seat_allocations`; único parcial `(user_id, event_id) WHERE status = 'active'` en `reservations`; único parcial `(event_id, section_id) WHERE section_id IS NOT NULL` en `ticket_types`; único `(section_id, row_label, seat_number)` en `seats`; único sobre `lower(email)` en `users`; único `clerk_user_id`; únicos `orders.code`, `orders.reservation_id`, `orders.stripe_payment_intent_id`, `tickets.qr_token`, `refunds.stripe_refund_id`.
- [ ] AC6 Existen los checks: `platform_settings.id = 1`; `ticket_types.sold_count <= capacity`; `orders.total_cents = subtotal_cents + service_fee_cents`; `venues` curado ⇔ sin dueño; `events.doors_open_at < starts_at`; `layout_sections` con capacidad si es `general_admission`.
- [ ] AC7 `events` tiene la FK compuesta `(layout_id, venue_id) → venue_layouts(id, venue_id)` y los índices `(status, starts_at)`, `(category_id, starts_at)`, `organizer_id`; `tickets` tiene índices `holder_user_id` y `event_id`; `reservations` tiene `(status, expires_at)`.
- [ ] AC8 Cada FK declara `onDelete` explícito según la tabla de Contratos (ninguna queda en el valor por defecto implícito).
- [ ] AC9 `users.clerk_user_id` es el único campo con id de Clerk en todo el esquema; ninguna otra tabla tiene columna de Clerk (D4).
- [ ] AC10 `getDb()` lanza `DATABASE_URL is not set` si la variable falta o está vacía, y **importar** `src/db/client.ts` no lanza ni abre conexión.
- [ ] AC11 `npx tsc --noEmit` y `npm run build` pasan; `src/db/**` no importa nada de `src/modules/**` ni de `src/app/**`.
- [ ] AC12 (manual, requiere `DATABASE_URL` real) `npm run db:migrate` aplica la migración al branch `dev` de Neon sin error y `npm run db:studio` lista las 22 tablas.
- [ ] AC13 No se modifican archivos de `src/modules/**`, `src/app/**`, `src/components/**` ni `.env.example`; no se commitea `.env`.

## Tests obligatorios

Sin base real (no hay Postgres en la verificación). Según SETUP §3, aplican a utilidades de `lib`/infra con lógica; aquí:

- `src/db/schema/schema.test.ts` (usa `getTableConfig` de `drizzle-orm/pg-core`, sin conexión):
  - exporta las 22 tablas con los nombres SQL de §6.4 y ninguna extra;
  - cada enum de `enums.ts` tiene exactamente los valores de §6.3 (`enumValues`);
  - `seat_allocations` tiene un índice único sobre `(event_id, seat_id)`;
  - `reservations` tiene un índice único parcial con `where` sobre `(user_id, event_id)`;
  - `users` tiene único sobre `clerk_user_id` y ninguna otra tabla tiene una columna llamada `clerk_user_id`;
  - toda FK de todas las tablas tiene `onDelete` definido;
  - `tickets` tiene índices sobre `holder_user_id` y `event_id`.
- `src/db/client.test.ts`:
  - `getDb()` lanza `DATABASE_URL is not set` con la variable ausente y con cadena vacía (`vi.stubEnv`);
  - importar el módulo sin variable no lanza.
- No requieren test: `drizzle.config.ts` y la migración generada (se verifican con AC3–AC8).

## Verificación

- `npm run db:generate` (dos veces: la segunda sin cambios) y revisar el SQL de `src/db/migrations/`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test`
- `npm run build`
- Manual (con `DATABASE_URL` en `.env`): `npm run db:migrate` y `npm run db:studio` → 22 tablas.

## Preguntas abiertas

- **Q1 — Sufijo de archivos.** El pedido sugiere `.schema.ts`, pero SETUP §1 lo reserva a Zod y System Design §3.2 manda `src/db/schema/` sin ese sufijo. La spec usa `identity.ts`, `catalog.ts`, etc. ¿Se confirma?
- **Q2 — Driver.** System Design §3.3 dice driver `postgres` común a Neon y Cloud SQL; el pedido fija `@neondatabase/serverless`. La spec usa `neon-serverless` (Pool/WebSocket) por las transacciones con `FOR UPDATE` y lo declara TEMPORAL. ¿Se acepta, o se prefiere `postgres`/`node-postgres` también en local (y entonces no se instala `@neondatabase/serverless`)?
- **Q3 — Tamaño.** La spec toca ~14 archivos (más de ~8), por el pedido de una tarea por archivo de schema; las tareas T1–T5 son mecánicas y paralelas. ¿Se acepta o se parte en 019a (identidad, catálogo, eventos) y 019b (compra y operación)?
- **Q4 — `doors_open_at`.** §6.4 no indica nulabilidad; se deja **nullable** (con check `< starts_at` si existe), aunque los mocks siempre lo traen y la 018 no lo captura. ¿Se prefiere not null?
- **Q5 — Migraciones iniciales vs. `db:push`.** Se versiona la migración generada (§3.3) y `db:push` queda solo para local. ¿Se confirma que Neon `dev` se usa con `db:migrate`, no con `push`?
