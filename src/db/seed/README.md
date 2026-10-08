# Seed desde mocks

Crea el catálogo (categorías, recintos, planos, secciones, asientos, eventos y tipos de entrada) a partir de los mocks de `src/modules/events` y `src/modules/seating`, asociado a un organizador existente.

> **No ejecutar en producción.** El script aborta si `NODE_ENV === "production"`. En esta fase solo se permite `--dry-run`.

## Uso

```bash
npm run db:seed -- --organizer-email organizer@example.com
npm run db:seed -- --organizer-id <uuid> --dry-run
```

| Parámetro | Descripción |
|---|---|
| `--organizer-email <email>` | Organizador por email (comparación sin distinguir mayúsculas). |
| `--organizer-id <uuid>` | Organizador por `users.id`. |
| `--dry-run` | Imprime conteos y termina; no abre conexión ni lee `DATABASE_URL`. |
| `--date-offset-days <n>` | Entero (default 0) que desplaza `starts_at` y `doors_open_at` de los eventos. |

Exactamente uno de `--organizer-email` / `--organizer-id`. Fallback por entorno: `SEED_ORGANIZER_EMAIL` / `SEED_ORGANIZER_ID` (el argumento gana). El organizador no se lee de ningún otro lugar.

## Prerrequisitos

- `DATABASE_URL` configurada (no se necesita con `--dry-run`) y migraciones aplicadas.
- El organizador existe: el usuario inició sesión (sync con Clerk), tiene perfil de organizador, está `active` y no está desactivado. Si no, el script falla con exit 1 y un mensaje específico, antes de insertar nada. Se crea desde `/admin/users`.

## Qué crea

- 8 categorías (upsert de nombre y orden por `slug`).
- Recintos propios del organizador (no curados), con sus planos, secciones y asientos.
- 10 eventos `published` y 23 tipos de entrada. `cover_key` guarda la URL de Unsplash del mock (TEMPORAL, hasta GCS).
- Zonas generales con capacidad 500 (`DEFAULT_ZONE_CAPACITY`).

## Qué no crea

- Órdenes, tickets ni `seat_allocations` (`sold_count = 0` en zonas con asiento).
- `platform_settings`, usuarios, organizadores ni curación de recintos.

## Idempotencia

Todo se ejecuta en una sola transacción y re-ejecutarlo no duplica filas (claves únicas: slug, `(layout, code)`, `(sección, fila, número)`, `(evento, sección)`; tipos sin sección por `(evento, nombre)`). Si un slug de evento o recinto ya existe con otro organizador, el script falla sin pisarlo.
