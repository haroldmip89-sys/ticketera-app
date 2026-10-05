import { ArrowLeft, Check, Lock } from "lucide-react"
import Link from "next/link"

import { BrandLogo } from "@/components/shared/brand-logo"
import { cn } from "@/lib/utils"

export type PurchaseStep = 1 | 2 | 3

export type PurchaseFlowHeaderProps = { currentStep: PurchaseStep } & (
  | { backHref: string; backLabel: string; mobileTitle: string }
  | { backHref?: undefined; backLabel?: undefined; mobileTitle?: undefined }
)

const PURCHASE_STEPS = ["Entradas", "Datos y pago", "Confirmación"] as const

export function PurchaseFlowHeader({
  currentStep,
  backHref,
  backLabel,
  mobileTitle,
}: PurchaseFlowHeaderProps) {
  const stepLabel = `Paso ${currentStep} de ${PURCHASE_STEPS.length}`

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto hidden h-19 max-w-7xl items-center justify-between px-8 lg:flex">
        <div className="flex w-60">
          <Link href="/" aria-label="Ticketera, ir al inicio" className="focus-ring rounded-xl">
            <BrandLogo />
          </Link>
        </div>

        <ol aria-label="Pasos de la compra" className="flex items-center gap-3 text-sm">
          {PURCHASE_STEPS.map((label, index) => {
            const step = index + 1
            const isCurrent = step === currentStep
            const isDone = step < currentStep

            return (
              <li
                key={label}
                aria-current={isCurrent ? "step" : undefined}
                className="flex items-center gap-3"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-full text-[13px] font-semibold",
                      isCurrent && "bg-foreground text-background",
                      isDone && "bg-primary text-primary-foreground",
                      !isCurrent && !isDone && "border-[1.5px] border-input text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="size-4" aria-hidden="true" /> : step}
                  </span>
                  <span className={isCurrent ? "font-semibold" : "text-muted-foreground"}>
                    {label}
                  </span>
                </span>
                {step < PURCHASE_STEPS.length && (
                  <span
                    aria-hidden="true"
                    data-completed={isDone || undefined}
                    className={cn("h-[1.5px] w-10", isDone ? "bg-primary" : "bg-input")}
                  />
                )}
              </li>
            )
          })}
        </ol>

        <div className="flex w-60 items-center justify-end gap-2 text-sm text-muted-foreground">
          {backHref !== undefined && (
            <>
              <Lock className="size-4" aria-hidden="true" />
              Compra segura
            </>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        {backHref === undefined ? (
          <div className="flex h-15 items-center justify-between px-4">
            <Link
              href="/"
              aria-label="Ticketera, ir al inicio"
              className="focus-ring inline-flex min-h-11 items-center rounded-xl"
            >
              <BrandLogo size="sm" />
            </Link>
            <span className="text-xs text-muted-foreground">{stepLabel}</span>
          </div>
        ) : (
          <div className="flex h-15 items-center gap-1 pr-3 pl-1.5">
            <Link
              href={backHref}
              aria-label={backLabel}
              className="focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-xl"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-muted-foreground">{stepLabel}</span>
              <span className="truncate text-base font-semibold">{mobileTitle}</span>
            </div>
            <Lock className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Compra segura</span>
          </div>
        )}
        <div aria-hidden="true" className="h-[3px] bg-border">
          <div
            className="h-full bg-primary"
            style={{ width: `${(currentStep / PURCHASE_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </header>
  )
}
