import { loadEnvConfig } from "@next/env"
import { inArray, sql } from "drizzle-orm"

import { getDb } from "@/db/client"
import {
  categories,
  events,
  layoutSections,
  seats,
  ticketTypes,
  venueLayouts,
  venues,
} from "@/db/schema"

import { buildSeedPlan, type SeedPlan } from "./seed-data"
import { parseSeedArgs, SeedArgsError } from "./seed-args"
import { assertSeedableOrganizer, findOrganizer, type SeedOrganizer } from "./seed-organizer"

const CHUNK_SIZE = 1000

function chunk<T>(rows: T[]): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) chunks.push(rows.slice(i, i + CHUNK_SIZE))
  return chunks
}

function summarize(plan: SeedPlan): string {
  return [
    `  categorías:       ${plan.categories.length}`,
    `  recintos:         ${plan.venues.length}`,
    `  planos:           ${plan.layouts.length}`,
    `  secciones:        ${plan.sections.length}`,
    `  asientos:         ${plan.seats.length}`,
    `  eventos:          ${plan.events.length}`,
    `  tipos de entrada: ${plan.ticketTypes.length}`,
  ].join("\n")
}

type Db = ReturnType<typeof getDb>
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]

async function applyPlan(tx: Tx, plan: SeedPlan, organizer: SeedOrganizer, publishedAt: Date) {
  // categorías
  for (const rows of chunk(plan.categories)) {
    await tx
      .insert(categories)
      .values(rows)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: sql`excluded.name`, sortOrder: sql`excluded.sort_order` },
      })
  }
  const categoryRows = await tx.select({ id: categories.id, slug: categories.slug }).from(categories)
  const categoryId = new Map(categoryRows.map((row) => [row.slug, row.id]))

  // recintos (propios del organizador)
  await tx
    .insert(venues)
    .values(
      plan.venues.map((venue) => ({
        ...venue,
        ownerOrganizerId: organizer.organizerId,
        createdBy: organizer.userId,
      })),
    )
    .onConflictDoNothing({ target: venues.slug })
  const venueRows = await tx
    .select({ id: venues.id, slug: venues.slug, owner: venues.ownerOrganizerId })
    .from(venues)
    .where(inArray(venues.slug, plan.venues.map((venue) => venue.slug)))
  const foreignVenue = venueRows.find((row) => row.owner !== organizer.organizerId)
  if (foreignVenue) {
    throw new Error(`El recinto "${foreignVenue.slug}" ya existe con otro dueño; el seed no pisa datos ajenos.`)
  }
  const venueId = new Map(venueRows.map((row) => [row.slug, row.id]))

  // planos (sin clave única propia: se busca por recinto + nombre)
  const existingLayouts = await tx
    .select({ id: venueLayouts.id, venueId: venueLayouts.venueId, name: venueLayouts.name })
    .from(venueLayouts)
    .where(inArray(venueLayouts.venueId, [...venueId.values()]))
  const layoutId = new Map<string, string>()
  const missingLayouts = plan.layouts.filter((layout) => {
    const found = existingLayouts.find(
      (row) => row.venueId === venueId.get(layout.venueSlug) && row.name === layout.name,
    )
    if (found) layoutId.set(layout.layoutKey, found.id)
    return !found
  })
  if (missingLayouts.length > 0) {
    const inserted = await tx
      .insert(venueLayouts)
      .values(
        missingLayouts.map((layout) => ({
          name: layout.name,
          kind: layout.kind,
          stage: layout.stage,
          venueId: venueId.get(layout.venueSlug)!,
        })),
      )
      .returning({ id: venueLayouts.id })
    inserted.forEach((row, index) => layoutId.set(missingLayouts[index].layoutKey, row.id))
  }

  // secciones
  for (const rows of chunk(plan.sections)) {
    await tx
      .insert(layoutSections)
      .values(rows.map(({ layoutKey, ...section }) => ({ ...section, layoutId: layoutId.get(layoutKey)! })))
      .onConflictDoNothing()
  }
  const sectionRows = await tx
    .select({ id: layoutSections.id, layoutId: layoutSections.layoutId, code: layoutSections.code })
    .from(layoutSections)
    .where(inArray(layoutSections.layoutId, [...layoutId.values()]))
  const sectionId = new Map(sectionRows.map((row) => [`${row.layoutId}:${row.code}`, row.id]))
  const resolveSection = (layoutKey: string, code: string) =>
    sectionId.get(`${layoutId.get(layoutKey)!}:${code}`)!

  // asientos
  for (const rows of chunk(plan.seats)) {
    await tx
      .insert(seats)
      .values(
        rows.map(({ layoutKey, sectionCode, ...seat }) => ({
          ...seat,
          sectionId: resolveSection(layoutKey, sectionCode),
        })),
      )
      .onConflictDoNothing()
  }

  // eventos (si el slug existe con otro organizador, falla)
  await tx
    .insert(events)
    .values(
      plan.events.map(({ categorySlug, venueSlug, layoutKey, ...event }) => ({
        ...event,
        organizerId: organizer.organizerId,
        categoryId: categoryId.get(categorySlug)!,
        venueId: venueId.get(venueSlug)!,
        layoutId: layoutKey ? layoutId.get(layoutKey)! : null,
        publishedAt,
      })),
    )
    .onConflictDoNothing({ target: events.slug })
  const eventRows = await tx
    .select({ id: events.id, slug: events.slug, organizerId: events.organizerId })
    .from(events)
    .where(inArray(events.slug, plan.events.map((event) => event.slug)))
  const foreignEvent = eventRows.find((row) => row.organizerId !== organizer.organizerId)
  if (foreignEvent) {
    throw new Error(`El evento "${foreignEvent.slug}" ya existe con otro organizador; el seed no pisa datos ajenos.`)
  }
  const eventId = new Map(eventRows.map((row) => [row.slug, row.id]))

  // tipos de entrada (los que ya existen por (evento, sección) o (evento, nombre) se omiten)
  const existingTypes = await tx
    .select({ eventId: ticketTypes.eventId, sectionId: ticketTypes.sectionId, name: ticketTypes.name })
    .from(ticketTypes)
    .where(inArray(ticketTypes.eventId, [...eventId.values()]))
  const newTypes = plan.ticketTypes
    .map(({ eventSlug, layoutKey, sectionCode, ...type }) => ({
      ...type,
      eventId: eventId.get(eventSlug)!,
      sectionId: layoutKey && sectionCode ? resolveSection(layoutKey, sectionCode) : null,
    }))
    .filter(
      (type) =>
        !existingTypes.some(
          (row) =>
            row.eventId === type.eventId &&
            (type.sectionId ? row.sectionId === type.sectionId : row.sectionId === null && row.name === type.name),
        ),
    )
  for (const rows of chunk(newTypes)) {
    await tx.insert(ticketTypes).values(rows).onConflictDoNothing()
  }
  return newTypes.length
}

async function main() {
  loadEnvConfig(process.cwd(), true)
  if (process.env.NODE_ENV === "production") {
    throw new Error("El seed no puede ejecutarse con NODE_ENV=production.")
  }

  const options = parseSeedArgs(process.argv.slice(2), process.env)
  const plan = buildSeedPlan({ dateOffsetDays: options.dateOffsetDays })

  if (options.dryRun) {
    console.log("Dry run (sin conexión a la base). Se crearían, como máximo:")
    console.log(summarize(plan))
    return
  }

  const organizer = assertSeedableOrganizer(await findOrganizer(options.organizer), options.organizer)
  console.log(`Organizador: ${organizer.displayName} <${organizer.email}>`)

  const newTicketTypes = await getDb().transaction((tx) => applyPlan(tx, plan, organizer, new Date()))
  console.log("Seed completado (idempotente: las filas existentes se omiten).")
  console.log(summarize(plan))
  console.log(`  tipos de entrada nuevos: ${newTicketTypes}`)
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(error instanceof SeedArgsError ? message : `Error: ${message}`)
    process.exit(1)
  })
