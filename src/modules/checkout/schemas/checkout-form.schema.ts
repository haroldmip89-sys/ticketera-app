import { z } from "zod"

/** Valores controlados del formulario (todo string salvo el checkbox). Tarjeta es el único método de pago:
 *  no hay campo de método (las billeteras llegan con Stripe real). */
export type CheckoutFormValues = {
  fullName: string
  email: string
  /** "" = no informado. */
  phone: string
  cardNumber: string
  cardExpiry: string
  cardCvc: string
  cardName: string
  acceptTerms: boolean
}

export type CheckoutFieldName = keyof CheckoutFormValues

export type CheckoutFormData = {
  fullName: string
  email: string
  phone: string | null
  card: { number: string; expiry: string; cvc: string; name: string }
  acceptTerms: true
}

export const EMPTY_CHECKOUT_FORM: CheckoutFormValues = {
  fullName: "",
  email: "",
  phone: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvc: "",
  cardName: "",
  acceptTerms: false,
}

/** Orden visual de los campos: sirve para enfocar el primer campo inválido. */
export const CHECKOUT_FIELD_ORDER: readonly CheckoutFieldName[] = [
  "fullName",
  "email",
  "phone",
  "cardNumber",
  "cardExpiry",
  "cardCvc",
  "cardName",
  "acceptTerms",
]

const MIN_NAME_LENGTH = 2
const MAX_NAME_LENGTH = 100
const NAME_TOO_LONG = "El nombre puede tener hasta 100 caracteres."

const PHONE_ALLOWED = /^\+?[\d\s().-]+$/
const US_PHONE = /^[2-9]\d{9}$/
const CARD_NUMBER = /^\d{13,19}$/
const CARD_EXPIRY = /^(\d{2}) ?\/ ?(\d{2})$/
const CARD_CVC = /^\d{3,4}$/

const emailFormat = z.email()

type FieldResult<T> = { value: T } | { error: string }

/** String recortado con `trim` y validado por `parse`; cada campo produce como mucho un mensaje. */
function textField<T>(parse: (value: string) => FieldResult<T>) {
  return z.string().transform((raw, ctx): T => {
    const result = parse(raw.trim())
    if ("error" in result) {
      ctx.addIssue({ code: "custom", message: result.error })
      return z.NEVER
    }
    return result.value
  })
}

function nameField(missingMessage: string) {
  return textField<string>((value) => {
    if (value.length < MIN_NAME_LENGTH) return { error: missingMessage }
    if (value.length > MAX_NAME_LENGTH) return { error: NAME_TOO_LONG }
    return { value }
  })
}

function passesLuhn(digits: string): boolean {
  let sum = 0
  for (let index = 0; index < digits.length; index++) {
    let digit = Number(digits[digits.length - 1 - index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

function parsePhone(value: string): FieldResult<string | null> {
  if (!value) return { value: null }
  const invalid = { error: "Ingresa un celular de EE. UU. de 10 dígitos." }
  if (!PHONE_ALLOWED.test(value)) return invalid

  let digits = value.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1)
  return US_PHONE.test(digits) ? { value: digits } : invalid
}

function parseCardNumber(value: string): FieldResult<string> {
  const digits = value.replace(/[\s-]/g, "")
  if (!digits) return { error: "Ingresa el número de tu tarjeta." }
  if (!CARD_NUMBER.test(digits) || !passesLuhn(digits)) return { error: "Revisa el número de tu tarjeta." }
  return { value: digits }
}

/** Vale hasta el último día del mes de vencimiento (año = 2000 + AA). */
function parseCardExpiry(value: string, now: Date): FieldResult<string> {
  if (!value) return { error: "Ingresa el vencimiento." }
  const match = CARD_EXPIRY.exec(value)
  const month = match ? Number(match[1]) : 0
  if (!match || month < 1 || month > 12) return { error: "Usa el formato MM/AA." }

  const year = 2000 + Number(match[2])
  const expiryMonthIndex = year * 12 + (month - 1)
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth()
  if (expiryMonthIndex < currentMonthIndex) return { error: "La tarjeta está vencida." }
  return { value: `${match[1]}/${match[2]}` }
}

function parseCardCvc(value: string): FieldResult<string> {
  if (!value) return { error: "Ingresa el CVC." }
  return CARD_CVC.test(value) ? { value } : { error: "Ingresa el CVC de 3 o 4 dígitos." }
}

/** `now` solo se usa para rechazar tarjetas vencidas (inyectable en tests). */
export function createCheckoutFormSchema(
  now: Date = new Date()
): z.ZodType<CheckoutFormData, CheckoutFormValues> {
  return z
    .object({
      fullName: nameField("Ingresa tu nombre completo."),
      email: textField<string>((value) => {
        if (!value) return { error: "Ingresa tu correo electrónico." }
        return emailFormat.safeParse(value).success
          ? { value }
          : { error: "Ingresa un correo válido, por ejemplo tu@email.com." }
      }),
      phone: textField(parsePhone),
      cardNumber: textField(parseCardNumber),
      cardExpiry: textField((value) => parseCardExpiry(value, now)),
      cardCvc: textField(parseCardCvc),
      cardName: nameField("Ingresa el nombre que figura en la tarjeta."),
      acceptTerms: z.boolean().transform((accepted, ctx): true => {
        if (!accepted) {
          ctx.addIssue({ code: "custom", message: "Acepta los términos para continuar." })
          return z.NEVER
        }
        return true
      }),
    })
    .transform(({ cardNumber, cardExpiry, cardCvc, cardName, ...rest }) => ({
      ...rest,
      card: { number: cardNumber, expiry: cardExpiry, cvc: cardCvc, name: cardName },
    }))
}

function isCheckoutFieldName(value: unknown): value is CheckoutFieldName {
  return CHECKOUT_FIELD_ORDER.includes(value as CheckoutFieldName)
}

/** Primer mensaje por campo; {} si es válido. Los campos de tarjeta son siempre obligatorios. */
export function getCheckoutFieldErrors(
  values: CheckoutFormValues,
  now?: Date
): Partial<Record<CheckoutFieldName, string>> {
  const result = createCheckoutFormSchema(now).safeParse(values)
  if (result.success) return {}

  const errors: Partial<Record<CheckoutFieldName, string>> = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (isCheckoutFieldName(field) && !(field in errors)) errors[field] = issue.message
  }
  return errors
}
