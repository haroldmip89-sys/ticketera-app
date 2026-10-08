"use client"

import {
  Ban,
  CircleCheck,
  Lock,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react"
import { useRef, useState } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import {
  deleteUserAction,
  setOrganizerStatusAction,
  setUserActiveAction,
} from "../actions/admin-users.actions"
import { setOrganizerStatusSchema } from "../schemas/admin-user.schema"
import type {
  AdminActionResult,
  AdminUserListItem,
} from "../types/admin-user.types"
import {
  getApplicableActions,
  getDisplayName,
  LOCK_LABELS,
} from "../utils/user-presentation"
import { EditUserDialog } from "./edit-user-dialog"
import { useUsersNotice } from "./users-notice"

export type UserRowActionsProps = {
  user: AdminUserListItem
  layout: "icons" | "labeled"
}

type ConfirmAction =
  | "suspend-organizer"
  | "reactivate-organizer"
  | "deactivate-user"
  | "reactivate-user"
  | "delete-user"

type ConfirmCopy = {
  label: string
  icon: LucideIcon
  title: (name: string) => string
  description: string
  confirm: string
  inputLabel?: string
  destructive?: boolean
  withText?: boolean
}

const COPY: Record<ConfirmAction, ConfirmCopy> = {
  "suspend-organizer": {
    label: "Suspender",
    icon: Ban,
    title: (name) => `Suspender a ${name}`,
    description: "No podrá gestionar sus eventos mientras esté suspendido.",
    confirm: "Suspender",
    inputLabel: "Motivo de la suspensión",
    withText: true,
  },
  "reactivate-organizer": {
    label: "Aprobar",
    icon: CircleCheck,
    title: (name) => `Aprobar a ${name}`,
    description: "Podrá crear y gestionar sus eventos.",
    confirm: "Aprobar",
    withText: true,
  },
  "deactivate-user": {
    label: "Desactivar",
    icon: UserX,
    title: (name) => `Desactivar a ${name}`,
    description: "Perderá el acceso a la plataforma.",
    confirm: "Desactivar",
  },
  "reactivate-user": {
    label: "Reactivar",
    icon: UserCheck,
    title: (name) => `Reactivar a ${name}`,
    description: "Recuperará el acceso a la plataforma.",
    confirm: "Reactivar",
  },
  "delete-user": {
    label: "Eliminar",
    icon: Trash2,
    title: (name) => `¿Eliminar a ${name}?`,
    description:
      "Perderá el acceso a Ticketera. Esta acción no se puede deshacer.",
    confirm: "Eliminar",
    destructive: true,
  },
}

const CONFIRM_ORDER: ConfirmAction[] = [
  "reactivate-organizer",
  "suspend-organizer",
  "deactivate-user",
  "reactivate-user",
  "delete-user",
]

type Prepared = { error: string } | { run: () => Promise<AdminActionResult> }

function prepareAction(
  action: ConfirmAction,
  userId: string,
  value: string,
): Prepared {
  switch (action) {
    case "delete-user":
      return { run: () => deleteUserAction({ userId }) }
    case "deactivate-user":
    case "reactivate-user":
      return {
        run: () =>
          setUserActiveAction({ userId, active: action === "reactivate-user" }),
      }
    case "reactivate-organizer":
      return {
        run: () => setOrganizerStatusAction({ userId, status: "active" }),
      }
    case "suspend-organizer": {
      const parsed = setOrganizerStatusSchema.safeParse({
        userId,
        status: "suspended",
        reason: value,
      })
      return parsed.success
        ? { run: () => setOrganizerStatusAction(parsed.data) }
        : { error: parsed.error.issues[0]?.message ?? "Dato inválido" }
    }
  }
}

function failureMessage(result: Extract<AdminActionResult, { ok: false }>) {
  const first = Object.values(result.fieldErrors ?? {})[0]?.[0]
  return first ?? result.message
}

export function UserRowActions({ user, layout }: UserRowActionsProps) {
  const { show } = useUsersNotice()
  const lastTriggerRef = useRef<HTMLElement | null>(null)
  const editRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState<ConfirmAction | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [value, setValue] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const name = getDisplayName(user)

  if (user.lock) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="size-4" aria-hidden="true" />
        {LOCK_LABELS[user.lock]}
      </span>
    )
  }

  const applicable = getApplicableActions(user)
  const canEdit = applicable.includes("edit-user")
  const confirmActions = CONFIRM_ORDER.filter((a) => applicable.includes(a))
  if (!canEdit && confirmActions.length === 0) return null

  const copy = pending ? COPY[pending] : null
  const inputId = `action-input-${user.id}`
  const errorId = `${inputId}-error`

  function open(action: ConfirmAction, trigger: HTMLElement) {
    lastTriggerRef.current = trigger
    setPending(action)
    setValue("")
    setFieldError(null)
    setFormError(null)
  }

  async function confirm() {
    if (!pending || loading) return
    const prepared = prepareAction(pending, user.id, value)
    if ("error" in prepared) {
      setFieldError(prepared.error)
      return
    }
    setFieldError(null)
    setFormError(null)
    setLoading(true)
    try {
      const result = await prepared.run()
      if (result.ok) {
        const base =
          pending === "delete-user" ? `${name} fue eliminado.` : result.message
        show(result.warning ? `${base} ${result.warning}` : base)
        setPending(null)
      } else {
        setFormError(failureMessage(result))
      }
    } catch {
      setFormError("No se pudo completar la acción. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {canEdit ? (
        <>
          <Button
            ref={editRef}
            type="button"
            variant="ghost"
            size={layout === "labeled" ? "default" : "icon"}
            className={cn(
              "focus-ring",
              layout === "labeled" ? "min-h-11 px-3" : "size-11",
            )}
            aria-label={`Editar a ${name}`}
            title="Editar"
            onClick={() => setEditOpen(true)}
          >
            <Pencil aria-hidden="true" />
            {layout === "labeled" ? "Editar" : null}
          </Button>
          <EditUserDialog
            user={user}
            open={editOpen}
            onOpenChange={setEditOpen}
            triggerRef={editRef}
          />
        </>
      ) : null}
      {confirmActions.map((action) => {
        const item = COPY[action]
        const Icon = item.icon
        const showText = layout === "labeled" && item.withText
        return (
          <Button
            key={action}
            type="button"
            variant="ghost"
            size={showText ? "default" : "icon"}
            className={cn(
              "focus-ring",
              showText ? "min-h-11 px-3" : "size-11",
              item.destructive && "text-destructive hover:text-destructive",
            )}
            aria-label={`${item.label} a ${name}`}
            title={item.label}
            onClick={(event) => open(action, event.currentTarget)}
          >
            <Icon aria-hidden="true" />
            {showText ? item.label : null}
          </Button>
        )
      })}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(next) => {
          if (!next && !loading) setPending(null)
        }}
      >
        <AlertDialogContent finalFocus={lastTriggerRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy?.title(name)}</AlertDialogTitle>
            <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {copy?.inputLabel ? (
            <Field data-invalid={fieldError ? true : undefined}>
              <FieldLabel htmlFor={inputId}>{copy.inputLabel}</FieldLabel>
              <Input
                id={inputId}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? errorId : undefined}
              />
              {fieldError ? (
                <FieldError id={errorId}>{fieldError}</FieldError>
              ) : null}
            </Field>
          ) : null}
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <Button
              variant={copy?.destructive ? "destructive" : "default"}
              onClick={confirm}
              disabled={loading}
              aria-busy={loading}
              className="focus-ring"
            >
              {loading ? "Procesando…" : copy?.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
