# 022 — Seed desde mocks (preparado, NO ejecutado) (Bloque C)

- **Estado:** done
- **Aprobación:** aprobada por el usuario con defaults Q1–Q9 (ver "Decisiones aprobadas").
- **Modo:** SDD
- **Módulo(s):**
  - `src/db/seed/` (infraestructura de datos, System Design §3.2).
  - `package.json` (script `db:seed`, devDependency `tsx`).
- **Fuentes:** System Design §3.4 (variables), §4.1 (espejo y webhook), §4.2 (roles, la base manda), §4.3 (guards), §4.4 (matriz), §4.5 (alta de organizador), §6.4 (`users`, `organizer_profiles`, `webhook_events`, `audit_logs`, catálogo y eventos). Spec 019 (esquema). Specs 013, 014, 015 (auth, ver "Relación con 013–015").
- **Depende de:** **020 `done`** (migración `0001` aplicada, `slugify` en `src/lib/slug.ts`, usuarios/organizadores en la base). Independiente de 021; un organizador `active` puede crearse desde `/admin/users` (021) o por otro medio manual.
- **Specs hermanas:** 020 (Bloque A) y 021 (Bloque B).

## Objetivo

3. **Bloque C — Seed preparado, NO ejecutado.** Script `npm run db:seed` que crea categorías, recintos, planos, secciones, asientos, eventos y tipos de entrada desde los mocks, asociados a un organizador recibido por parámetro. **En esta fase no se ejecuta contra ninguna base** (ver C-D1).

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
- Bloques A y B de la spec original: identidad/sync/guards (020) y administración de usuarios (021).

## Decisiones

### D10 — Seed (ver bloque C)
- C-D1: el script **no se ejecuta en esta fase** (ni lo corre el developer ni el reviewer, salvo `--dry-run`, que no abre conexión).
- C-D2: parámetro obligatorio de organizador; falla claro si no existe o no está `active`.

## Decisiones aprobadas (defaults Q1–Q9 aplicados)


- **Q1** La spec original se parte en tres: 020 (A), 021 (B), 022 (C).
- **Q6** (a) Recintos propios del organizador (no curados). (b) `cover_key` = URL de Unsplash del mock (TEMPORAL, hasta GCS). (c) Capacidad de zonas generales `DEFAULT_ZONE_CAPACITY = 500`. (d) Se conserva `--date-offset-days`.
- Super admin: `haroldmip89@gmail.com` (no interviene en el seed).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `slugify`, `getDb()`, esquema 22 tablas + `0001` | reutilizar | `src/lib/slug.ts`, `src/db/**` | De 019/020. |
| Mocks de eventos y seating | reutilizar (solo lectura) | `src/modules/events/data/*.mock.ts`, `src/modules/seating/data/*.mock.ts`, `src/modules/events/data/event-categories.ts` | El seed los importa (excepción deliberada a "solo lo importa el service": es infraestructura). No se modifican. |
| `buildTheaterLayout`, tipos `EventSeatMap`/`ZoneMap` | reutilizar | `src/modules/seating/**` | |
| `tsx` | agregar (devDependency) | `package.json` | Ya está en `node_modules` como transitiva; se declara explícita para `db:seed`. |

## Contratos

### C7 — Seed (`src/db/seed/`)

```ts
// seed-args.ts
export type SeedOrganizerRef = { by: "email"; email: string } | { by: "id"; id: string }
export type SeedOptions = { organizer: SeedOrganizerRef; dryRun: boolean; dateOffsetDays: number }
/** argv: --organizer-email <email> | --organizer-id <uuid> (exactamente uno) · --dry-run · --date-offset-days <int> (default 0).
 *  Fallback de entorno: SEED_ORGANIZER_EMAIL / SEED_ORGANIZER_ID (el argumento gana). Sin organizador, ambos a la vez,
 *  uuid/email inválido o flag desconocida → lanza SeedArgsError con mensaje accionable (indica el uso correcto). */
export function parseSeedArgs(argv: string[], env: Record<string, string | undefined>): SeedOptions

// seed-organizer.ts
export type SeedOrganizer = { organizerId: string; userId: string; email: string; displayName: string; status: "onboarding" | "active" | "suspended" }
/** Lanza SeedOrganizerError con mensaje claro y distinto por caso:
 *  - null → "No existe un usuario con <ref>. Debe haber iniciado sesión (se sincroniza con Clerk) y tener rol de organizador."
 *  - sin perfil de organizador → "El usuario <email> no es organizador. Créalo en /admin/users (Convertir en organizador)."
 *  - status ≠ active → "El organizador <slug|email> está <status>; debe estar active."
 *  - usuario desactivado/anonimizado → mensaje propio. */
export function assertSeedableOrganizer(found: (SeedOrganizer & { deactivated: boolean }) | null, ref: SeedOrganizerRef): SeedOrganizer
export async function findOrganizer(ref: SeedOrganizerRef): Promise<(SeedOrganizer & { deactivated: boolean }) | null>   // consulta con Drizzle (email por lower())

// seed-data.ts (puro: mocks → filas; sin DB, sin Date.now ni aleatoriedad)
export type SeedPlan = {
  categories: NewCategory[]; venues: Omit<NewVenue, "ownerOrganizerId" | "createdBy">[]
  layouts: ...; sections: ...; seats: ...; events: ...; ticketTypes: ...    // cada fila lleva claves naturales (slug, code, (row,number)) para resolver FKs
}
export function buildSeedPlan(input: { dateOffsetDays: number }): SeedPlan
export const DEFAULT_ZONE_CAPACITY = 500

// index.ts (CLI): loadEnvConfig → parseSeedArgs → (dryRun: imprime conteos y termina, sin conexión) →
//   findOrganizer + assertSeedableOrganizer → una transacción con inserts idempotentes → imprime resumen → exit 0; cualquier error → mensaje a stderr y exit 1.
```

**Mapeo mocks → tablas (obligatorio, deriva de 019 D6):**
- `categories`: 8 filas de `EVENT_CATEGORIES` (`slug` = `id`, `name` = `label`, `sort_order` = índice). `ON CONFLICT (slug) DO UPDATE` de nombre/orden.
- `venues`: una por `event.venue.id` distinto (`slug` = id, `address_line` = `address`, `city`, `country = 'PE'`, `timezone = 'America/Lima'` (offset `-05:00` de los mocks), `is_curated = false`, `owner_organizer_id` = organizador del parámetro, `created_by` = su `users.id`). No curados porque `is_curated = true` exige dueño nulo y los curados son del catálogo de admins (Q6).
- `venue_layouts` / `layout_sections` / `seats`:
  - eventos con mapa de asientos (`SEAT_MAPS_MOCK`: evt-001, evt-004): layout `kind = 'seated'`, nombre "Sala principal", `stage` = `layout.stage`; una sección por zona (`code` = id de zona, `kind = 'seated'`, `capacity` nulo, `sort_order` = índice); un `seat` por asiento (`row_label`, `seat_number` = número como texto, `x`, `y`, `is_accessible` = `accessible`).
  - eventos con mapa de zonas (`ZONE_MAPS_MOCK`): un layout `kind = 'zones'` por evento (nombre `Zonas — <slug>`, `stage` = `{ label, area, columns, rows }`); una sección por `ticketTypeId` (`code` = sufijo tras `<eventId>-`, `kind = 'general_admission'`, `capacity` = `DEFAULT_ZONE_CAPACITY`, `map_area` = `area`).
  - eventos sin ningún mapa: `layout_id` y `ticket_types.section_id` nulos.
- `events`: `slug`, `title`, `description`, `category_id` (por slug), `venue_id`, `layout_id`, `starts_at` / `doors_open_at` desde el ISO con offset (+ `dateOffsetDays` días), `min_age`, `is_featured`, `status = 'published'`, `published_at` = fecha de ejecución (único valor no determinista: se inyecta desde `index.ts`, no lo calcula `buildSeedPlan`), `cover_key` = `imageUrl` del mock (**TEMPORAL**: la columna espera una key de GCS; el alt del mock no se guarda, no hay columna), `organizer_id` = parámetro. `ON CONFLICT (slug) DO NOTHING`: si el slug ya existe con **otro** organizador, el script falla con mensaje claro (no pisa eventos ajenos).
- `ticket_types`: uno por `TICKET_TYPES_MOCK` (`name`, `price_cents = Math.round(price * 100)`, `sort_order` = orden del mock, `section_id` según arriba). `capacity`: zonas con asiento → número de asientos de la sección; generales → `DEFAULT_ZONE_CAPACITY`. `sold_count`: `availability = "sold-out"` → `capacity`; `"last-tickets"` en general → `capacity - 10`; resto → `0`. En zonas con asiento `sold_count = 0` y **no** se crean `seat_allocations`, órdenes ni tickets (los `soldSeatIds` del mock no se persisten; fase de services).
- Idempotencia: re-ejecutar no duplica (claves únicas de 019: slug de categoría/venue/evento, `(layout_id, code)`, `(section_id, row_label, seat_number)`, `(event_id, section_id)`); los `ticket_types` sin `section_id` se evitan duplicar con `NOT EXISTS (event_id, name)` o equivalente.
- Documentación: `src/db/seed/README.md` (uso, parámetros, prerrequisitos, qué crea, qué no, idempotencia, advertencia "no ejecutar en producción"; el script aborta si `NODE_ENV === "production"`).

Scripts npm (`package.json`): `"db:seed": "tsx src/db/seed/index.ts"`. Ejemplos documentados: `npm run db:seed -- --organizer-email organizer@example.com`, `npm run db:seed -- --organizer-id <uuid> --dry-run`.

## Tareas

### Bloque C — Seed (tras A; independiente de B)

**Preparación C (serie)**
- **PC1** Dependencia y script. Archivos: `package.json`, `package-lock.json` (`npm i -D tsx`; agregar `"db:seed"`).

**Paralelo C**
- **TC1** Plan de datos. Archivos: `src/db/seed/seed-data.ts` + `seed-data.test.ts`.
- **TC2** CLI y documentación. Archivos: `src/db/seed/seed-args.ts` + `.test.ts`, `src/db/seed/seed-organizer.ts` + `.test.ts`, `src/db/seed/index.ts`, `src/db/seed/README.md`.

## Criterios de aceptación

- [ ] AC22 Existe `npm run db:seed` y `src/db/seed/README.md` documenta uso, parámetros, qué crea y qué no, idempotencia y la advertencia de no ejecutar en producción.
- [ ] AC23 **En esta fase el seed no se ejecuta**: ninguna fila de `categories`, `venues`, `events`, etc. es creada por el developer/reviewer (verificable en `db:studio`/consulta: las tablas del catálogo siguen vacías). Solo `--dry-run` (sin conexión) y los tests unitarios están permitidos.
- [ ] AC24 `npm run db:seed` sin organizador, con ambos (`--organizer-email` y `--organizer-id`) o con un valor inválido termina con exit 1 y un mensaje que explica el uso. `--dry-run` imprime conteos (categorías 8, eventos 10, tipos de entrada 23, secciones, asientos) y termina con exit 0 sin leer `DATABASE_URL`.
- [ ] AC25 Con organizador inexistente, sin perfil, no `active` o desactivado, el script falla (exit 1) con el mensaje específico de C7 **antes** de insertar nada.
- [ ] AC26 `buildSeedPlan` es determinista (dos llamadas iguales ⇒ resultados iguales), no depende de la hora ni de la red, genera precios en centavos enteros, cubre los 10 eventos y los 23 tipos de entrada del mock, asientos únicos por `(sección, fila, número)`, `sold_count ≤ capacity` y `starts_at` desplazado por `dateOffsetDays`.
- [ ] AC27 El script aborta si `NODE_ENV === "production"`. No lee ni escribe secretos; el organizador solo entra por parámetro/entorno.
- [ ] AC28 `npm run lint`, `npm run test` y `npm run build` pasan al cerrar cada bloque. Las specs 013 (login, header, rutas protegidas) siguen funcionando.

## Tests obligatorios (Vitest)

- `src/db/seed/seed-args.test.ts` — email, id, ambos, ninguno, fallback de entorno (el argumento gana), `--dry-run`, `--date-offset-days` (válido/no entero), flag desconocida, uuid/email inválidos.
- `src/db/seed/seed-organizer.test.ts` — `assertSeedableOrganizer`: los 5 casos con su mensaje y el caso válido.
- `src/db/seed/seed-data.test.ts` — AC26 (conteos 8/10/23, determinismo, centavos, unicidad de asientos, `sold_count ≤ capacity`, capacidad de zonas con asiento = nº de asientos, desplazamiento de fechas, eventos sin mapa con `layout`/`section` nulos, venues no curados).

Nota de tests con DB: no hay Postgres en CI (019 dejó los tests de integración fuera de alcance); los services se prueban con el `getDb()` mockeado (cadena de Drizzle simulada o funciones de acceso a datos inyectadas). Si el developer separa las consultas en funciones pequeñas inyectables para evitar mocks frágiles, es preferible (SRP/DIP). No se agrega Postgres de pruebas en esta spec.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (el reviewer, al cerrar)
  - C: solo `npm run db:seed -- --organizer-email organizer@example.com --dry-run`. **No ejecutar sin `--dry-run`.**

## Pasos manuales del usuario

| **M5** | Después (fuera de esta spec) | Para el seed: crear/invitar al organizador desde `/admin/users` y luego `npm run db:seed -- --organizer-email <email>`. |
