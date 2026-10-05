import type { ComponentProps, ReactNode } from "react"
import { CreditCard, Lock } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type {
  CheckoutFieldName,
  CheckoutFormValues,
} from "@/modules/checkout/schemas/checkout-form.schema"

export function getCheckoutFieldId(name: CheckoutFieldName): string {
  return `checkout-${name}`
}

export function getCheckoutErrorId(name: CheckoutFieldName): string {
  return `checkout-${name}-error`
}

export type CheckoutFieldsProps = {
  values: CheckoutFormValues
  /** Solo los errores que ya se deben mostrar (campo tocado o intento de pago). */
  errors: Partial<Record<CheckoutFieldName, string>>
  onValueChange: <K extends CheckoutFieldName>(name: K, value: CheckoutFormValues[K]) => void
  onFieldBlur: (name: CheckoutFieldName) => void
}

type TextFieldName = Exclude<CheckoutFieldName, "acceptTerms">

type TextFieldConfig = { label: string; placeholder: string; isRequired: boolean } & Pick<
  ComponentProps<"input">,
  "type" | "inputMode" | "autoComplete" | "maxLength" | "spellCheck"
>

const TEXT_FIELDS: Record<TextFieldName, TextFieldConfig> = {
  fullName: {
    label: "Nombre completo",
    isRequired: true,
    type: "text",
    autoComplete: "name",
    placeholder: "Como figura en tu documento",
  },
  email: {
    label: "Correo electrónico",
    isRequired: true,
    type: "email",
    autoComplete: "email",
    placeholder: "tu@email.com",
    spellCheck: false,
  },
  phone: {
    label: "Celular (opcional)",
    isRequired: false,
    type: "tel",
    inputMode: "tel",
    autoComplete: "tel",
    placeholder: "(555) 123-4567",
  },
  cardNumber: {
    label: "Número de tarjeta",
    isRequired: true,
    type: "text",
    inputMode: "numeric",
    autoComplete: "cc-number",
    placeholder: "1234 1234 1234 1234",
    maxLength: 23,
    spellCheck: false,
  },
  cardExpiry: {
    label: "Vencimiento",
    isRequired: true,
    type: "text",
    inputMode: "numeric",
    autoComplete: "cc-exp",
    placeholder: "MM/AA",
    maxLength: 7,
  },
  cardCvc: {
    label: "CVC",
    isRequired: true,
    type: "text",
    inputMode: "numeric",
    autoComplete: "cc-csc",
    placeholder: "3 o 4 dígitos",
    maxLength: 4,
  },
  cardName: {
    label: "Nombre en la tarjeta",
    isRequired: true,
    type: "text",
    autoComplete: "cc-name",
    placeholder: "Como aparece en la tarjeta",
  },
}

/**
 * Asterisco decorativo: el lector anuncia "obligatorio" por aria-required, no por este span.
 * Los controles no llevan `required` nativo: la única validación es la de zod (el form es noValidate).
 */
function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  )
}

/** aria-invalid y aria-describedby solo cuando el error está visible. */
function getErrorProps(name: CheckoutFieldName, error: string | undefined) {
  return error
    ? { "aria-invalid": true, "aria-describedby": getCheckoutErrorId(name) }
    : {}
}

function FieldMessage({ name, error }: { name: CheckoutFieldName; error?: string }) {
  if (!error) return null
  return (
    <FieldError id={getCheckoutErrorId(name)} className="text-[0.8125rem]">
      {error}
    </FieldError>
  )
}

type TextFieldProps = Pick<CheckoutFieldsProps, "values" | "errors" | "onValueChange" | "onFieldBlur"> & {
  name: TextFieldName
  className?: string
}

function TextField({ name, values, errors, onValueChange, onFieldBlur, className }: TextFieldProps) {
  const { label, isRequired, ...inputProps } = TEXT_FIELDS[name]
  const id = getCheckoutFieldId(name)
  const error = errors[name]

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id} className="text-sm font-medium">
        {label}
        {isRequired && <RequiredMark />}
      </FieldLabel>
      <Input
        {...inputProps}
        id={id}
        name={name}
        aria-required={isRequired || undefined}
        value={values[name]}
        onChange={(event) => onValueChange(name, event.target.value)}
        onBlur={() => onFieldBlur(name)}
        {...getErrorProps(name, error)}
        className="h-13 rounded-[14px] border-input bg-card px-4 text-base focus-visible:border-primary focus-visible:ring-0 focus-ring md:text-base lg:text-[0.9375rem] dark:bg-card"
      />
      <FieldMessage name={name} error={error} />
    </Field>
  )
}

type SectionProps = { title: string; description?: ReactNode; children: ReactNode }

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-card px-4 py-5 lg:gap-5 lg:rounded-3xl lg:p-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold lg:text-xl">{title}</h2>
        {description && (
          <p className="text-[0.8125rem] text-muted-foreground lg:text-sm">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export function CheckoutFields({ values, errors, onValueChange, onFieldBlur }: CheckoutFieldsProps) {
  const fieldProps = { values, errors, onValueChange, onFieldBlur }
  const termsError = errors.acceptTerms
  const termsId = getCheckoutFieldId("acceptTerms")

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <p className="px-1 text-[0.8125rem] text-muted-foreground lg:px-0">
        Los campos marcados con <RequiredMark />
        <span className="sr-only">asterisco</span> son obligatorios.
      </p>

      <Section
        title="Datos del comprador"
        description={
          <>
            <span className="lg:hidden">Enviaremos tus entradas a este correo.</span>
            <span className="hidden lg:inline">Enviaremos tus entradas al correo que indiques.</span>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-x-5 lg:gap-y-4.5">
          <TextField name="fullName" {...fieldProps} />
          <TextField name="email" {...fieldProps} />
          <TextField name="phone" {...fieldProps} />
        </div>
      </Section>

      <Section title="Método de pago">
        <div className="lg:grid lg:grid-cols-3 lg:gap-3">
          <div className="flex h-15 items-center gap-3 rounded-[14px] border-2 border-primary bg-primary/10 px-4.5 text-[0.9375rem] font-semibold lg:h-19 lg:rounded-2xl">
            <CreditCard className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="lg:hidden">Tarjeta de crédito o débito</span>
            <span className="hidden lg:inline">Tarjeta</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-4.5">
          <TextField name="cardNumber" className="col-span-2" {...fieldProps} />
          <TextField name="cardExpiry" {...fieldProps} />
          <TextField name="cardCvc" {...fieldProps} />
          <TextField name="cardName" className="col-span-2 lg:col-span-4" {...fieldProps} />
        </div>

        <p className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground">
          <Lock className="mt-px size-4 shrink-0" aria-hidden="true" />
          Modo demo: no se procesa ningún pago ni se envían los datos de tu tarjeta.
        </p>
      </Section>

      <div className="flex flex-col gap-2 px-1 lg:px-0">
        <div className="flex min-h-11 items-start gap-3">
          <Checkbox
            id={termsId}
            checked={values.acceptTerms}
            onCheckedChange={(checked) => onValueChange("acceptTerms", checked)}
            onBlur={() => onFieldBlur("acceptTerms")}
            aria-required
            {...getErrorProps("acceptTerms", termsError)}
            className="mt-px size-[22px] lg:size-5"
          />
          <label
            htmlFor={termsId}
            className="cursor-pointer text-sm leading-normal text-foreground/80"
          >
            Acepto los <span className="font-medium text-foreground">Términos y condiciones</span>{" "}
            y la <span className="font-medium text-foreground">Política de privacidad</span>.{" "}
            <RequiredMark />
          </label>
        </div>
        <FieldMessage name="acceptTerms" error={termsError} />
      </div>
    </div>
  )
}
