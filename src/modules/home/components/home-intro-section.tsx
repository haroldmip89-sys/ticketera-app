import { EventSearchForm } from "@/modules/events/components/event-search-form"

export function HomeIntroSection() {
  return (
    <section aria-labelledby="home-title">
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 pt-5.5 pb-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-8 lg:pt-11 lg:pb-7">
        <div className="flex flex-col gap-2.5 lg:max-w-[35rem] lg:gap-3">
          <h1
            id="home-title"
            className="text-[1.875rem] leading-[1.12] font-bold tracking-[-0.03em] text-balance lg:text-5xl lg:leading-[1.08]"
          >
            Encuentra tu próximo plan en vivo
          </h1>
          <p className="text-[0.9375rem] leading-[1.55] text-muted-foreground lg:text-[1.0625rem]">
            Conciertos, deportes, teatro y festivales. Compra seguro y recibe tu
            entrada al instante.
          </p>
        </div>
        <EventSearchForm />
      </div>
    </section>
  )
}
