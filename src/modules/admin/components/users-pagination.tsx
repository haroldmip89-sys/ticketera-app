"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId } from "react"

import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import {
  USERS_PAGE_SIZES,
  type ListUsersQuery,
} from "../schemas/admin-user.schema"
import { buildUsersHref, getPageWindow } from "../utils/users-href"

const PAGE_SIZE_ITEMS = Object.fromEntries(
  USERS_PAGE_SIZES.map((size) => [String(size), String(size)]),
)

const controlClass = cn(
  buttonVariants({ variant: "outline" }),
  "focus-ring h-10 min-w-10",
)

type StepProps = {
  href: string | null
  direction: "prev" | "next"
}

function Step({ href, direction }: StepProps) {
  const prev = direction === "prev"
  const content = prev ? (
    <>
      <ChevronLeft aria-hidden="true" />
      Anterior
    </>
  ) : (
    <>
      Siguiente
      <ChevronRight aria-hidden="true" />
    </>
  )
  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        className={cn(controlClass, "pointer-events-none opacity-50")}
      >
        {content}
      </span>
    )
  }
  return (
    <Link href={href} className={controlClass}>
      {content}
    </Link>
  )
}

export function UsersPagination({
  query,
  total,
}: {
  query: ListUsersQuery
  total: number
}) {
  const router = useRouter()
  const sizeLabelId = useId()
  const { page, pageSize } = query
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const prevHref = page > 1 ? buildUsersHref({ ...query, page: page - 1 }) : null
  const nextHref =
    page < pageCount ? buildUsersHref({ ...query, page: page + 1 }) : null

  return (
    <nav aria-label="Paginación" className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Step href={prevHref} direction="prev" />
        <span className="text-muted-foreground">
          Página {page} de {pageCount}
        </span>
        <Step href={nextHref} direction="next" />
      </div>
      <div className="hidden items-center justify-between gap-4 md:flex">
        <p className="text-muted-foreground">
          {total === 0
            ? "0 resultados"
            : `Mostrando ${from}–${to} de ${total}`}
        </p>
        <div className="flex items-center gap-1">
          <Step href={prevHref} direction="prev" />
          {getPageWindow(page, pageCount).map((n) =>
            n === page ? (
              <span
                key={n}
                aria-current="page"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "h-10 min-w-10 pointer-events-none",
                )}
              >
                {n}
              </span>
            ) : (
              <Link
                key={n}
                href={buildUsersHref({ ...query, page: n })}
                aria-label={`Página ${n}`}
                className={controlClass}
              >
                {n}
              </Link>
            ),
          )}
          <Step href={nextHref} direction="next" />
        </div>
        <div className="flex items-center gap-2">
          <span id={sizeLabelId} className="text-muted-foreground">
            Filas
          </span>
          <Select
            value={String(pageSize)}
            items={PAGE_SIZE_ITEMS}
            onValueChange={(value) =>
              router.push(
                buildUsersHref({
                  ...query,
                  pageSize: Number(value),
                  page: 1,
                }),
              )
            }
          >
            <SelectTrigger
              aria-labelledby={sizeLabelId}
              className="focus-ring h-10 w-20"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USERS_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </nav>
  )
}
