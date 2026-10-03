"use client"

import { useId, useState, type FormEvent } from "react"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function NewsletterSection() {
  const emailId = useId()
  const [isSubscribed, setIsSubscribed] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (event.currentTarget.checkValidity()) setIsSubscribed(true)
  }

  return (
    <section aria-labelledby="newsletter-title">
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-24">
        <div className="flex flex-col gap-6 rounded-[28px] bg-primary/10 p-6 lg:flex-row lg:items-center lg:justify-between lg:rounded-[32px] lg:px-14 lg:py-12">
          <div className="flex flex-col gap-2">
            <h2
              id="newsletter-title"
              className="text-2xl font-bold tracking-[-0.02em] lg:text-[1.875rem]"
            >
              No te pierdas ningún evento
            </h2>
            <p className="text-muted-foreground">
              Suscríbete y recibe las novedades de tus artistas y equipos favoritos.
            </p>
          </div>

          {isSubscribed ? (
            <p role="status" className="font-semibold lg:w-[30rem]">
              ¡Listo! Te avisaremos de los próximos eventos.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row lg:w-[30rem]">
              <div className="relative flex-1">
                <label htmlFor={emailId} className="sr-only">
                  Correo electrónico
                </label>
                <Mail
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id={emailId}
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  className="h-13 rounded-[14px] border-primary/30 bg-card pl-11 text-[0.9375rem] md:text-[0.9375rem] dark:bg-card"
                />
              </div>
              <Button
                type="submit"
                className="h-13 rounded-[14px] bg-primary px-6 text-[0.9375rem] font-semibold text-primary-foreground"
              >
                Suscribirme
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
