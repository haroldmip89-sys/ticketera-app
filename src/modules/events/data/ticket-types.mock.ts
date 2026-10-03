import type { TicketType } from "@/modules/events/types/event.types"

/** Por evento y precio ascendente. Solo lo importa events.service.ts. */
export const TICKET_TYPES_MOCK: readonly TicketType[] = [
  { id: "evt-001-mezzanine", eventId: "evt-001", name: "Mezzanine", price: 45, availability: "available" },
  { id: "evt-001-platea", eventId: "evt-001", name: "Platea", price: 85, availability: "last-tickets" },
  { id: "evt-002-norte", eventId: "evt-002", name: "Norte", price: 30, availability: "available" },
  { id: "evt-002-sur", eventId: "evt-002", name: "Sur", price: 30, availability: "available" },
  { id: "evt-002-oriente", eventId: "evt-002", name: "Oriente", price: 70, availability: "available" },
  { id: "evt-002-occidente", eventId: "evt-002", name: "Occidente", price: 95, availability: "sold-out" },
  { id: "evt-003-general", eventId: "evt-003", name: "General", price: 60, availability: "last-tickets" },
  { id: "evt-003-vip", eventId: "evt-003", name: "VIP", price: 150, availability: "sold-out" },
  { id: "evt-004-mezzanine", eventId: "evt-004", name: "Mezzanine", price: 35, availability: "available" },
  { id: "evt-004-platea", eventId: "evt-004", name: "Platea", price: 55, availability: "available" },
  { id: "evt-005-general", eventId: "evt-005", name: "General", price: 25, availability: "available" },
  { id: "evt-005-vip", eventId: "evt-005", name: "VIP", price: 45, availability: "available" },
  { id: "evt-006-general", eventId: "evt-006", name: "General", price: 40, availability: "sold-out" },
  { id: "evt-006-vip", eventId: "evt-006", name: "VIP", price: 90, availability: "sold-out" },
  { id: "evt-007-platea-alta", eventId: "evt-007", name: "Platea alta", price: 55, availability: "available" },
  { id: "evt-007-platea-baja", eventId: "evt-007", name: "Platea baja", price: 95, availability: "available" },
  { id: "evt-007-campo", eventId: "evt-007", name: "Campo", price: 130, availability: "available" },
  { id: "evt-008-general", eventId: "evt-008", name: "General", price: 38, availability: "available" },
  { id: "evt-008-vip", eventId: "evt-008", name: "VIP", price: 75, availability: "available" },
  { id: "evt-009-general", eventId: "evt-009", name: "General", price: 20, availability: "available" },
  { id: "evt-009-preferencial", eventId: "evt-009", name: "Preferencial", price: 35, availability: "available" },
  { id: "evt-010-general", eventId: "evt-010", name: "General", price: 15, availability: "available" },
  { id: "evt-010-visita-guiada", eventId: "evt-010", name: "Visita guiada", price: 25, availability: "available" },
]
