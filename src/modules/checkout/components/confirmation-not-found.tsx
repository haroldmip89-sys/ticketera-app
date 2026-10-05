import Link from "next/link"
import { TicketX } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"

/** Ruta prevista de Mis entradas (013). Hasta que exista, el link da 404 (se acepta, como entre 010 y 011). */
export const MY_TICKETS_HREF = "/my-tickets"

export function ConfirmationNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <Empty className="rounded-3xl border-[1.5px] border-dashed border-input bg-card px-5 py-12 md:py-18">
        <EmptyHeader className="max-w-[26rem]">
          <EmptyMedia className="size-14 rounded-2xl bg-primary/10 text-primary">
            <TicketX aria-hidden="true" />
          </EmptyMedia>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            No encontramos tu pedido
          </h1>
          <EmptyDescription className="text-sm text-muted-foreground md:text-[0.9375rem]">
            El enlace de confirmación está incompleto o no es válido. Si ya compraste, tus
            entradas están en Mis entradas.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="gap-3 sm:flex-row sm:justify-center">
          <Link
            href={MY_TICKETS_HREF}
            className="inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-foreground px-5 font-semibold text-background focus-ring hover:bg-foreground/90 sm:w-auto"
          >
            Mis entradas
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-[14px] border-[1.5px] border-input bg-card px-5 font-medium focus-ring hover:bg-secondary sm:w-auto"
          >
            Volver al inicio
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  )
}
