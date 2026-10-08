import type { StaffRole } from "@/lib/auth/permissions"

/** Id serializable: el cliente lo resuelve a un icono (no se pasan componentes de servidor a cliente). */
export type AdminNavIconId =
  | "dashboard"
  | "users"
  | "organizers"
  | "overview"
  | "events"
  | "create-event"
  | "check-in"
  | "payments"

export type AdminNavItem = {
  id: string
  label: string
  icon: AdminNavIconId
  /** null = todavía sin ruta ("Próximamente") */
  href: string | null
}

export type AdminNavSection = {
  id: "admin" | "organizer"
  label: string
  items: AdminNavItem[]
}

const ADMIN_SECTION: AdminNavSection = {
  id: "admin",
  label: "Administración",
  items: [
    { id: "dashboard", label: "Dashboard", icon: "dashboard", href: null },
    { id: "users", label: "Usuarios", icon: "users", href: "/admin/users" },
    { id: "organizers", label: "Organizadores", icon: "organizers", href: null },
  ],
}

const ORGANIZER_SECTION: AdminNavSection = {
  id: "organizer",
  label: "Organizador",
  items: [
    { id: "overview", label: "Resumen", icon: "overview", href: null },
    { id: "events", label: "Mis eventos", icon: "events", href: null },
    { id: "create-event", label: "Crear evento", icon: "create-event", href: null },
    { id: "check-in", label: "Check-in", icon: "check-in", href: null },
    { id: "payments", label: "Pagos", icon: "payments", href: null },
  ],
}

export function getAdminNav(staffRole: StaffRole | null): AdminNavSection[] {
  return staffRole !== null
    ? [ADMIN_SECTION, ORGANIZER_SECTION]
    : [ORGANIZER_SECTION]
}

export function isNavItemActive(pathname: string, item: AdminNavItem): boolean {
  if (item.href === null) return false
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function findNavMatch(
  pathname: string,
  sections: AdminNavSection[],
): { section: AdminNavSection; item: AdminNavItem } | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (isNavItemActive(pathname, item)) return { section, item }
    }
  }
  return null
}
