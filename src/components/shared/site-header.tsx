import Link from "next/link"

import { BrandLogo } from "@/components/shared/brand-logo"
import { SiteMobileMenu } from "@/components/shared/site-mobile-menu"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export type SiteNavLink = { href: string; label: string }

export const siteNavLinks: SiteNavLink[] = [
  { href: "/#eventos", label: "Eventos" },
  { href: "/#categorias", label: "Categorías" },
  { href: "/#como-funciona", label: "Cómo funciona" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-(--site-header-height) max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Ticketera, ir al inicio"
          className="focus-ring rounded-xl"
        >
          <BrandLogo size="md" className="hidden lg:inline-flex" />
          <BrandLogo size="sm" className="lg:hidden" />
        </Link>

        <nav aria-label="Principal" className="hidden gap-9 lg:flex">
          {siteNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring rounded-md text-[0.9375rem] font-medium text-foreground/80 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <a
            href="#"
            className="focus-ring inline-flex h-11 items-center rounded-xl px-[18px] text-[0.9375rem] font-medium hover:bg-muted"
          >
            Iniciar sesión
          </a>
          <a
            href="#"
            className="focus-ring inline-flex h-11 items-center rounded-xl border-[1.5px] border-input px-[18px] text-[0.9375rem] font-semibold hover:bg-muted"
          >
            Vender entradas
          </a>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <a
            href="#"
            className="focus-ring inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium"
          >
            Ingresar
          </a>
          <SiteMobileMenu links={siteNavLinks} />
        </div>
      </div>
    </header>
  )
}
