"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { ListUsersQuery } from "../schemas/admin-user.schema"
import {
  ORGANIZER_STATUS_LABELS,
  ROLE_LABELS,
} from "../utils/user-presentation"
import { buildUsersHref } from "../utils/users-href"

const ALL = "all"

const ROLE_ITEMS: Record<string, string> = {
  [ALL]: "Todos los roles",
  super_admin: ROLE_LABELS.super_admin,
  admin: ROLE_LABELS.admin,
  organizer: ROLE_LABELS.organizer,
  customer: ROLE_LABELS.customer,
}

const STATUS_ITEMS: Record<string, string> = {
  [ALL]: "Todos",
  active: ORGANIZER_STATUS_LABELS.active,
  onboarding: ORGANIZER_STATUS_LABELS.onboarding,
  suspended: ORGANIZER_STATUS_LABELS.suspended,
}

type FilterSelectProps = {
  label: string
  value: string
  items: Record<string, string>
  onChange: (value: string) => void
}

function FilterSelect({ label, value, items, onChange }: FilterSelectProps) {
  const labelId = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <Select
        value={value}
        items={items}
        onValueChange={(next) => onChange(next ?? ALL)}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className="focus-ring h-10 w-full md:min-w-44"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function UsersToolbar({ query }: { query: ListUsersQuery }) {
  const router = useRouter()
  const searchId = useId()
  const [search, setSearch] = useState(query.q ?? "")
  const hasFilters = Boolean(query.q || query.role || query.status)

  function go(next: Partial<ListUsersQuery>) {
    router.push(buildUsersHref({ ...query, ...next, page: 1 }))
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:flex-row md:items-end">
      <form
        role="search"
        className="flex min-w-0 flex-1 flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          go({ q: search.trim() || undefined })
        }}
      >
        <label htmlFor={searchId} className="text-sm font-medium">
          Buscar
        </label>
        <div className="flex gap-2">
          <Input
            id={searchId}
            name="q"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o correo"
            className="h-10"
          />
          <Button type="submit" className="focus-ring h-10">
            <Search aria-hidden="true" />
            Buscar
          </Button>
        </div>
      </form>
      <div className="grid grid-cols-2 gap-3 md:flex md:items-end">
        <FilterSelect
          label="Rol"
          value={query.role ?? ALL}
          items={ROLE_ITEMS}
          onChange={(value) =>
            go({ role: value === ALL ? undefined : (value as ListUsersQuery["role"]) })
          }
        />
        <FilterSelect
          label="Estado de organizador"
          value={query.status ?? ALL}
          items={STATUS_ITEMS}
          onChange={(value) =>
            go({
              status:
                value === ALL ? undefined : (value as ListUsersQuery["status"]),
            })
          }
        />
      </div>
      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          className="focus-ring h-10"
          onClick={() => {
            setSearch("")
            router.push(buildUsersHref({}))
          }}
        >
          Limpiar
        </Button>
      ) : null}
    </div>
  )
}
