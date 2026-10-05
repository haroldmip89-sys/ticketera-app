import { describe, expect, it } from "vitest"

import {
  buildEventCalendar,
  DEFAULT_EVENT_DURATION_MINUTES,
  escapeIcsText,
  foldIcsLine,
  formatIcsDateTime,
  getCalendarFileName,
} from "@/modules/checkout/utils/event-calendar"

const utf8Length = (value: string) => new TextEncoder().encode(value).length

const REFERENCE_EVENT = {
  id: "evt-002",
  title: "Clásico del Fútbol: Final de Temporada",
  startsAt: "2026-10-04T16:00:00-05:00",
  doorsOpenAt: "2026-10-04T13:30:00-05:00",
  venue: {
    id: "estadio-nacional",
    name: "Estadio Nacional",
    city: "Lima",
    address: "Av. del Deporte 1200, Lima",
  },
}
const REFERENCE_NOW = new Date("2026-10-04T17:00:00Z")

function buildReference(now = REFERENCE_NOW) {
  return buildEventCalendar({ event: REFERENCE_EVENT, orderCode: "TK-24817", now })
}

describe("escapeIcsText", () => {
  it("escapa la barra invertida", () => {
    expect(escapeIcsText("a\\b")).toBe("a\\\\b")
  })

  it("escapa comas y punto y coma", () => {
    expect(escapeIcsText("a,b;c")).toBe("a\\,b\\;c")
  })

  it.each(["l1\nl2", "l1\r\nl2", "l1\rl2"])("convierte el salto de línea de %j en \\n literal", (value) => {
    expect(escapeIcsText(value)).toBe("l1\\nl2")
  })

  it("escapa la barra antes que el resto", () => {
    expect(escapeIcsText("\\,")).toBe("\\\\\\,")
  })
})

describe("foldIcsLine", () => {
  it("no pliega una línea de 75 octetos", () => {
    const line = "X".repeat(75)
    expect(foldIcsLine(line)).toBe(line)
  })

  it("pliega una línea de 76 octetos", () => {
    expect(foldIcsLine("X".repeat(76))).toBe(`${"X".repeat(75)}\r\n X`)
  })

  it("cuenta octetos UTF-8 sin partir caracteres multibyte", () => {
    const segments = foldIcsLine(`SUMMARY:${"á".repeat(40)}`).split("\r\n")

    expect(segments.map(utf8Length)).toEqual([74, 15])
    expect(segments[0]).toBe(`SUMMARY:${"á".repeat(33)}`)
    expect(segments[1]).toBe(` ${"á".repeat(7)}`)
  })

  it("toda continuación empieza con espacio y ningún segmento supera 75 octetos", () => {
    const segments = foldIcsLine(`DESCRIPTION:${"Ñandú, ".repeat(40)}`).split("\r\n")

    expect(segments.length).toBeGreaterThan(2)
    for (const segment of segments) expect(utf8Length(segment)).toBeLessThanOrEqual(75)
    for (const segment of segments.slice(1)) expect(segment.startsWith(" ")).toBe(true)
  })
})

describe("formatIcsDateTime", () => {
  it("convierte un ISO con offset a UTC", () => {
    expect(formatIcsDateTime("2026-10-04T16:00:00-05:00")).toBe("20261004T210000Z")
  })

  it("refleja el cambio de día en UTC", () => {
    expect(formatIcsDateTime("2026-10-03T20:00:00-05:00")).toBe("20261004T010000Z")
  })

  it("acepta Date", () => {
    expect(formatIcsDateTime(new Date("2026-10-04T17:00:00Z"))).toBe("20261004T170000Z")
  })

  it("lanza RangeError con una fecha inválida", () => {
    expect(() => formatIcsDateTime("no-es-fecha")).toThrow(RangeError)
  })
})

describe("buildEventCalendar", () => {
  it("genera las líneas exactas del ejemplo de referencia", () => {
    expect(buildReference()).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Ticketera//Ticketera//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:TK-24817-evt-002@ticketera",
        "DTSTAMP:20261004T170000Z",
        "DTSTART:20261004T210000Z",
        "DTEND:20261005T000000Z",
        "SUMMARY:Clásico del Fútbol: Final de Temporada",
        "LOCATION:Estadio Nacional\\, Av. del Deporte 1200\\, Lima",
        "DESCRIPTION:Pedido N.º TK-24817\\nApertura de puertas: 1:30 p. m. (hora loc",
        " al)",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n")
    )
  })

  it("empieza y termina con CRLF y no tiene LF sin CR", () => {
    const calendar = buildReference()

    expect(calendar.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true)
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true)
    expect(calendar).not.toMatch(/(?<!\r)\n/)
  })

  it("ninguna línea supera 75 octetos", () => {
    for (const line of buildReference().split("\r\n")) {
      expect(utf8Length(line)).toBeLessThanOrEqual(75)
    }
  })

  it("DTEND es DTSTART + la duración por defecto", () => {
    const calendar = buildReference()
    const parse = (name: string) => {
      const match = calendar.match(new RegExp(`^${name}:(\\d{4})(\\d{2})(\\d{2})T(\\d{2})(\\d{2})(\\d{2})Z`, "m"))
      if (!match) throw new Error(`Falta ${name}`)
      const [, y, mo, d, h, mi, s] = match
      return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
    }

    expect(parse("DTEND") - parse("DTSTART")).toBe(DEFAULT_EVENT_DURATION_MINUTES * 60_000)
  })

  it("el UID es estable con distinto now", () => {
    const other = buildReference(new Date("2027-01-01T00:00:00Z"))
    const uid = (calendar: string) => calendar.match(/^UID:.*$/m)?.[0]

    expect(uid(other)).toBe("UID:TK-24817-evt-002@ticketera")
    expect(uid(other)).toBe(uid(buildReference()))
  })

  it("no contiene @ salvo en el UID", () => {
    const calendar = buildReference()

    expect(calendar.match(/@/g)).toHaveLength(1)
    expect(calendar).toContain("UID:TK-24817-evt-002@ticketera\r\n")
  })
})

describe("getCalendarFileName", () => {
  it("usa el código de pedido", () => {
    expect(getCalendarFileName("TK-24817")).toBe("ticketera-TK-24817.ics")
  })
})
