"use client"

import { usePathname } from "next/navigation"

import { ThemeToggle } from "@/components/shared/theme-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"

import { findNavMatch, type AdminNavSection } from "../utils/admin-nav"

export type AdminHeaderProps = { sections: AdminNavSection[] }

export function AdminHeader({ sections }: AdminHeaderProps) {
  const pathname = usePathname()
  const { isMobile, open, openMobile } = useSidebar()
  const expanded = isMobile ? openMobile : open
  const match = findNavMatch(pathname, sections)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <SidebarTrigger
        className="focus-ring size-9"
        aria-label={expanded ? "Contraer menú" : "Expandir menú"}
        aria-expanded={expanded}
      />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {match ? (
            <>
              <BreadcrumbItem>{match.section.label}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{match.item.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>Administración</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <ThemeToggle />
    </header>
  )
}
