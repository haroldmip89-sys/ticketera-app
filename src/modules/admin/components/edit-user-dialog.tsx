"use client"

import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getPrimaryRole,
  type EditableRole,
} from "@/modules/users/utils/role-change"

import { updateUserAction } from "../actions/admin-users.actions"
import { updateUserSchema } from "../schemas/admin-user.schema"
import type { AdminUserListItem } from "../types/admin-user.types"
import {
  getDisplayName,
  ORGANIZER_STATUS_LABELS,
  ROLE_LABELS,
} from "../utils/user-presentation"
import { useUsersNotice } from "./users-notice"

export type EditUserDialogProps = {
  user: AdminUserListItem
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

type OrganizerStatusValue = "onboarding" | "active" | "suspended"
type FieldName = "fullName" | "reason"

const EDITABLE_ROLES: EditableRole[] = ["customer", "organizer", "admin"]
const ROLE_ACTIONS = [
  "grant-admin",
  "revoke-admin",
  "create-organizer",
  "remove-organizer",
] as const

function EditUserForm({
  user,
  onOpenChange,
}: Pick<EditUserDialogProps, "user" | "onOpenChange">) {
  const { show } = useUsersNotice()
  const primary = getPrimaryRole({
    staffRole: user.staffRole,
    hasOrganizer: user.organizer !== null,
  })
  const initialRole: EditableRole =
    primary === "super_admin" ? "admin" : primary
  const initialStatus: OrganizerStatusValue = user.organizer?.status ?? "active"
  const canChangeRole = ROLE_ACTIONS.some((a) =>
    user.allowedActions.includes(a),
  )
  // "Pendiente" solo se muestra si ya es el estado actual; no es destino elegible.
  const statusOptions: OrganizerStatusValue[] =
    initialStatus === "onboarding"
      ? ["active", "onboarding", "suspended"]
      : ["active", "suspended"]

  const [fullName, setFullName] = useState(user.fullName ?? "")
  const [role, setRole] = useState<EditableRole>(initialRole)
  const [status, setStatus] = useState<OrganizerStatusValue>(initialStatus)
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const showStatus =
    role === "organizer" || (role === "admin" && user.organizer !== null)
  const suspending = showStatus && status === "suspended"
  const statusChanged =
    showStatus && status !== initialStatus && status !== "onboarding"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    const trimmedName = fullName.trim()
    const parsed = updateUserSchema.safeParse({
      userId: user.id,
      ...(trimmedName !== (user.fullName ?? "")
        ? { fullName: trimmedName }
        : {}),
      ...(role !== initialRole ? { role } : {}),
      ...(statusChanged
        ? {
            organizerStatus: status,
            ...(status === "suspended" ? { reason } : {}),
          }
        : {}),
    })
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {}
      let general: string | null = null
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === "fullName" || key === "reason") {
          if (!next[key]) next[key] = issue.message
        } else if (!general) {
          general = issue.message
        }
      }
      setErrors(next)
      setFormError(general)
      return
    }

    setErrors({})
    setFormError(null)
    setLoading(true)
    try {
      const result = await updateUserAction(parsed.data)
      if (result.ok) {
        show(result.warning ?? result.message)
        onOpenChange(false)
      } else {
        const first = Object.values(result.fieldErrors ?? {})[0]?.[0]
        setFormError(first ?? result.message)
      }
    } catch {
      setFormError("No se pudo guardar. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const id = `edit-${user.id}`

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      <Field data-invalid={errors.fullName ? true : undefined}>
        <FieldLabel htmlFor={`${id}-name`}>Nombre</FieldLabel>
        <Input
          id={`${id}-name`}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={errors.fullName ? `${id}-name-error` : undefined}
        />
        {errors.fullName ? (
          <FieldError id={`${id}-name-error`}>{errors.fullName}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-email`}>Correo</FieldLabel>
        <Input
          id={`${id}-email`}
          value={user.email}
          disabled
          aria-describedby={`${id}-email-note`}
        />
        <p id={`${id}-email-note`} className="text-xs text-muted-foreground">
          El correo viene de la cuenta y no se edita.
        </p>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-role`}>Rol</FieldLabel>
        <Select
          value={role}
          disabled={!canChangeRole}
          onValueChange={(next) => setRole(next as EditableRole)}
        >
          <SelectTrigger
            id={`${id}-role`}
            className="w-full"
            aria-describedby={canChangeRole ? undefined : `${id}-role-note`}
          >
            <SelectValue>
              {(value: string) => ROLE_LABELS[value as EditableRole]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {EDITABLE_ROLES.map((item) => (
              <SelectItem key={item} value={item}>
                {ROLE_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canChangeRole ? null : (
          <p id={`${id}-role-note`} className="text-xs text-muted-foreground">
            Solo el super admin cambia roles
          </p>
        )}
      </Field>
      {showStatus ? (
        <Field>
          <FieldLabel htmlFor={`${id}-status`}>
            Estado de organizador
          </FieldLabel>
          <Select
            value={status}
            onValueChange={(next) => setStatus(next as OrganizerStatusValue)}
          >
            <SelectTrigger id={`${id}-status`} className="w-full">
              <SelectValue>
                {(value: string) =>
                  ORGANIZER_STATUS_LABELS[value as OrganizerStatusValue]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((item) => (
                <SelectItem
                  key={item}
                  value={item}
                  disabled={item === "onboarding"}
                >
                  {ORGANIZER_STATUS_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {suspending ? (
        <Field data-invalid={errors.reason ? true : undefined}>
          <FieldLabel htmlFor={`${id}-reason`}>
            Motivo de la suspensión
          </FieldLabel>
          <Input
            id={`${id}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={errors.reason ? true : undefined}
            aria-describedby={errors.reason ? `${id}-reason-error` : undefined}
          />
          {errors.reason ? (
            <FieldError id={`${id}-reason-error`}>{errors.reason}</FieldError>
          ) : null}
        </Field>
      ) : null}
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="focus-ring"
          disabled={loading}
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="focus-ring"
        >
          {loading ? "Guardando…" : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  triggerRef,
}: EditUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={triggerRef}>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>{getDisplayName(user)}</DialogDescription>
        </DialogHeader>
        <EditUserForm user={user} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}
