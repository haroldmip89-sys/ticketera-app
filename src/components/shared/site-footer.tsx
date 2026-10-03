import { BrandLogo } from "@/components/shared/brand-logo"

const linkColumns = [
  {
    title: "Compañía",
    links: ["Sobre nosotros", "Contacto"],
  },
  {
    title: "Ayuda",
    links: ["Centro de ayuda", "Cómo comprar", "Reembolsos"],
  },
  {
    title: "Legal",
    links: ["Términos y condiciones", "Privacidad", "Cookies"],
  },
  {
    title: "Síguenos",
    links: ["Instagram", "Facebook", "X (Twitter)"],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-12 pb-8 sm:px-6 lg:px-8 lg:pt-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="flex max-w-80 flex-col gap-3">
            <BrandLogo size="sm" />
            <p className="text-sm text-muted-foreground">
              Entradas para conciertos, deportes, teatro y festivales.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:flex lg:gap-16">
            {linkColumns.map((column) => (
              <nav
                key={column.title}
                aria-label={column.title}
                className="flex flex-col gap-3"
              >
                <p className="text-sm font-semibold">{column.title}</p>
                <ul className="flex flex-col gap-2">
                  {column.links.map((label) => (
                    <li key={label}>
                      <a
                        href="#"
                        className="focus-ring inline-flex min-h-6 items-center rounded-sm text-sm text-muted-foreground hover:text-foreground"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="border-t border-border pt-6 text-[0.8125rem] text-muted-foreground">
          © {new Date().getFullYear()} Ticketera. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
