import type { ZoneMap } from "@/modules/seating/types/seating.types"

/** Claves = eventId. Recintos sin plano no aparecen. Solo lo importa seating.service.ts. */
export const ZONE_MAPS_MOCK: Readonly<Record<string, ZoneMap>> = {
  "evt-001": {
    eventId: "evt-001",
    columns: 1,
    rows: ["stage", "lg", "md"],
    stage: { label: "ESCENARIO", area: { column: "1", row: "1" } },
    zones: [
      { ticketTypeId: "evt-001-platea", area: { column: "1", row: "2" } },
      { ticketTypeId: "evt-001-mezzanine", area: { column: "1", row: "3" } },
    ],
  },
  "evt-002": {
    eventId: "evt-002",
    columns: 3,
    rows: ["sm", "lg", "sm"],
    stage: { label: "CAMPO DE JUEGO", area: { column: "2", row: "2" } },
    zones: [
      { ticketTypeId: "evt-002-norte", area: { column: "1 / -1", row: "1" } },
      { ticketTypeId: "evt-002-occidente", area: { column: "1", row: "2" } },
      { ticketTypeId: "evt-002-oriente", area: { column: "3", row: "2" } },
      { ticketTypeId: "evt-002-sur", area: { column: "1 / -1", row: "3" } },
    ],
  },
  "evt-003": {
    eventId: "evt-003",
    columns: 1,
    rows: ["stage", "md", "lg"],
    stage: { label: "ESCENARIO", area: { column: "1", row: "1" } },
    zones: [
      { ticketTypeId: "evt-003-vip", area: { column: "1", row: "2" } },
      { ticketTypeId: "evt-003-general", area: { column: "1", row: "3" } },
    ],
  },
  "evt-004": {
    eventId: "evt-004",
    columns: 1,
    rows: ["stage", "lg", "md"],
    stage: { label: "ESCENARIO", area: { column: "1", row: "1" } },
    zones: [
      { ticketTypeId: "evt-004-platea", area: { column: "1", row: "2" } },
      { ticketTypeId: "evt-004-mezzanine", area: { column: "1", row: "3" } },
    ],
  },
  "evt-007": {
    eventId: "evt-007",
    columns: 1,
    rows: ["stage", "lg", "md", "sm"],
    stage: { label: "ESCENARIO", area: { column: "1", row: "1" } },
    zones: [
      { ticketTypeId: "evt-007-campo", area: { column: "1", row: "2" } },
      { ticketTypeId: "evt-007-platea-baja", area: { column: "1", row: "3" } },
      { ticketTypeId: "evt-007-platea-alta", area: { column: "1", row: "4" } },
    ],
  },
}
