"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { SiteNavLink } from "@/components/shared/site-header"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export type SiteMobileMenuProps = {
  links: SiteNavLink[]
}

export function SiteMobileMenu({ links }: SiteMobileMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl"
            aria-label="Abrir menú"
          />
        }
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>
        <nav aria-label="Principal" className="flex flex-col px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="focus-ring flex min-h-11 items-center rounded-md text-base font-medium hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="px-4">
          <a
            href="#"
            className="focus-ring inline-flex h-11 items-center rounded-xl border-[1.5px] border-input px-[18px] text-[0.9375rem] font-semibold hover:bg-muted"
          >
            Vender entradas
          </a>
        </div>
        <SheetFooter>
          <ThemeToggle />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
