import Link from "next/link"
import { TicketX } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"

export function EventNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
      <Empty className="rounded-3xl border-[1.5px] border-dashed border-input bg-card px-5 py-12 md:py-18">
        <EmptyHeader className="max-w-[26rem]">
          <EmptyMedia className="size-14 rounded-2xl bg-primary/10 text-primary">
            <TicketX aria-hidden="true" />
          </EmptyMedia>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            No encontramos este evento
          </h1>
          <EmptyDescription className="text-sm text-muted-foreground md:text-[0.9375rem]">
            Puede que el enlace esté mal escrito o que el evento ya no esté disponible.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-[14px] bg-foreground px-5 font-semibold text-background focus-ring hover:bg-foreground/90"
          >
            Volver al inicio
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  )
}
