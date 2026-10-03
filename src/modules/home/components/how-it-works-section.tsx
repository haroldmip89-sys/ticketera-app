import { QrCode, Search, Ticket, type LucideIcon } from "lucide-react"

import { SectionHeader } from "@/components/shared/section-header"

type Step = { title: string; description: string; icon: LucideIcon }

const STEPS: Step[] = [
  {
    title: "Buscar",
    description: "Encuentra el evento, artista o ciudad que te interesa.",
    icon: Search,
  },
  {
    title: "Elegir",
    description: "Selecciona tus entradas y la cantidad que necesitas.",
    icon: Ticket,
  },
  {
    title: "Comprar",
    description: "Paga de forma segura y recibe tus entradas al instante.",
    icon: QrCode,
  },
]

export function HowItWorksSection() {
  return (
    <section id="como-funciona" aria-labelledby="how-it-works-title">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-12 sm:px-6 lg:gap-12 lg:px-8 lg:py-24">
        <SectionHeader
          titleId="how-it-works-title"
          title="Cómo funciona"
          description="Tres pasos y ya estás dentro."
        />

        <ol className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-8">
          {STEPS.map(({ title, description, icon: Icon }, index) => (
            <li key={title} className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
                  <Icon className="size-7" aria-hidden="true" />
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    className="hidden flex-1 border-t-2 border-dashed border-input lg:block"
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="text-sm font-semibold text-primary">Paso {index + 1}</p>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="text-[0.9375rem] text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
