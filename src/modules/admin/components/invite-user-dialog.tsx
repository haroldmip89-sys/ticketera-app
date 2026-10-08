"use client"

import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

import { inviteUserAction } from "../actions/admin-users.actions"
import { inviteUserSchema } from "../schemas/admin-user.schema"
import { useUsersNotice } from "./users-notice"

export type InviteUserDialogProps = {
  canInviteAdmin: boolean
  canInviteOrganizer: boolean
}

type Role = "admin" | "organizer"
type FieldName = "email" | "role" | "organizerDisplayName"

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  organizer: "Organizador",
}

const FIELD_ORDER: FieldName[] = ["email", "role", "organizerDisplayName"]
const FIELD_IDS: Record<FieldName, string> = {
  email: "invite-email",
  role: "invite-role",
  organizerDisplayName: "invite-organizer-name",
}

export function InviteUserDialog({
  canInviteAdmin,
  canInviteOrganizer,
}: InviteUserDialogProps) {
  const { show } = useUsersNotice()
  const roles: Role[] = [
    ...(canInviteAdmin ? (["admin"] as const) : []),
    ...(canInviteOrganizer ? (["organizer"] as const) : []),
  ]
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role | "">(
    roles.length === 1 ? roles[0] : "",
  )
  const [organizerName, setOrganizerName] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (roles.length === 0) return null

  function reset() {
    setEmail("")
    setRole(roles.length === 1 ? roles[0] : "")
    setOrganizerName("")
    setErrors({})
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    const parsed = inviteUserSchema.safeParse({
      email,
      role: role || undefined,
      organizerDisplayName: organizerName,
    })
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldName
        if (FIELD_ORDER.includes(key) && !next[key]) next[key] = issue.message
      }
      setErrors(next)
      setFormError(null)
      const first = FIELD_ORDER.find((name) => next[name])
      if (first) document.getElementById(FIELD_IDS[first])?.focus()
      return
    }

    setErrors({})
    setFormError(null)
    setLoading(true)
    try {
      const result = await inviteUserAction(parsed.data)
      if (result.ok) {
        show(result.warning ?? result.message)
        reset()
        setOpen(false)
      } else {
        const first = Object.values(result.fieldErrors ?? {})[0]?.[0]
        setFormError(first ?? result.message)
      }
    } catch {
      setFormError("No se pudo enviar la invitación. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="focus-ring" />}>
        Invitar usuario
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>
            Si el correo ya tiene cuenta, se cambia su rol. Si no, recibe una
            invitación.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="grid gap-4">
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor={FIELD_IDS.email}>Correo</FieldLabel>
            <Input
              id={FIELD_IDS.email}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "invite-email-error" : undefined}
            />
            {errors.email ? (
              <FieldError id="invite-email-error">{errors.email}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={errors.role ? true : undefined}>
            <FieldLabel htmlFor={FIELD_IDS.role}>Rol</FieldLabel>
            <Select
              value={role}
              onValueChange={(next) => setRole(next as Role)}
            >
              <SelectTrigger
                id={FIELD_IDS.role}
                className="w-full"
                aria-invalid={errors.role ? true : undefined}
                aria-describedby={errors.role ? "invite-role-error" : undefined}
              >
                <SelectValue placeholder="Elige un rol">
                  {(value: string) =>
                    value ? ROLE_LABELS[value as Role] : "Elige un rol"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role ? (
              <FieldError id="invite-role-error">{errors.role}</FieldError>
            ) : null}
          </Field>
          {role === "organizer" ? (
            <Field
              data-invalid={errors.organizerDisplayName ? true : undefined}
            >
              <FieldLabel htmlFor={FIELD_IDS.organizerDisplayName}>
                Nombre del organizador
              </FieldLabel>
              <Input
                id={FIELD_IDS.organizerDisplayName}
                value={organizerName}
                onChange={(event) => setOrganizerName(event.target.value)}
                aria-invalid={errors.organizerDisplayName ? true : undefined}
                aria-describedby={
                  errors.organizerDisplayName
                    ? "invite-organizer-name-error"
                    : undefined
                }
              />
              {errors.organizerDisplayName ? (
                <FieldError id="invite-organizer-name-error">
                  {errors.organizerDisplayName}
                </FieldError>
              ) : null}
            </Field>
          ) : null}
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="focus-ring"
          >
            {loading ? "Enviando…" : "Enviar invitación"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
