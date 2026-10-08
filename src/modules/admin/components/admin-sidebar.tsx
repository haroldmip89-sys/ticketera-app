"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import {
  Building2,
  CalendarDays,
  CircleUserRound,
  CirclePlus,
  CreditCard,
  ExternalLink,
  Gauge,
  LayoutDashboard,
  LogOut,
  ScanLine,
  Users,
  type LucideIcon,
} from "lucide-react"

import { BrandLogo } from "@/components/shared/brand-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

import {
  isNavItemActive,
  type AdminNavIconId,
  type AdminNavItem,
  type AdminNavSection,
} from "../utils/admin-nav"

const NAV_ICONS: Record<AdminNavIconId, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  organizers: Building2,
  overview: Gauge,
  events: CalendarDays,
  "create-event": CirclePlus,
  "check-in": ScanLine,
  payments: CreditCard,
}

export type AdminSidebarProps = {
  sections: AdminNavSection[]
  userName: string | null
  email: string
  roleLabel: string
}

const HIDE_IN_RAIL = "group-data-[collapsible=icon]:hidden"

function NavItem({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const Icon = NAV_ICONS[item.icon]

  if (item.href === null) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<span role="link" tabIndex={0} aria-disabled="true" />}
          tooltip={{ children: `${item.label} · Próximamente`, hidden: false }}
          className="focus-ring aria-disabled:pointer-events-auto aria-disabled:cursor-not-allowed aria-disabled:text-muted-foreground aria-disabled:opacity-70"
        >
          <Icon aria-hidden="true" />
          <span className={HIDE_IN_RAIL}>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  const active = isNavItemActive(pathname, item)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={active}
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        tooltip={item.label}
        className="focus-ring data-active:bg-primary/10 data-active:text-primary"
      >
        <Icon aria-hidden="true" />
        <span className={HIDE_IN_RAIL}>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AdminSidebar({
  sections,
  userName,
  email,
  roleLabel,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useClerk()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link
          href="/admin/users"
          className="focus-ring rounded-md"
          aria-label="Ticketera, administración"
        >
          <BrandLogo
            size="sm"
            className="group-data-[collapsible=icon]:[&>span:last-child]:hidden"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section, index) => (
          <SidebarGroup key={section.id}>
            {index > 0 ? (
              <SidebarSeparator className="mx-0 mb-2 hidden group-data-[collapsible=icon]:block" />
            ) : null}
            <SidebarGroupLabel className={HIDE_IN_RAIL}>
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label={section.label}>
                {section.items.map((item) => (
                  <NavItem key={item.id} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/" />}
              aria-label="Ver sitio"
              tooltip="Ver sitio"
              className="focus-ring"
            >
              <ExternalLink aria-hidden="true" />
              <span className={HIDE_IN_RAIL}>Ver sitio</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Cerrar sesión"
              tooltip="Cerrar sesión"
              className="focus-ring"
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              <LogOut aria-hidden="true" />
              <span className={HIDE_IN_RAIL}>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <CircleUserRound
            className="size-8 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className={`min-w-0 leading-tight ${HIDE_IN_RAIL}`}>
            <p className="truncate text-sm font-medium">{userName ?? email}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
