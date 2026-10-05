import { describe, expect, it } from "vitest"

import {
  CHECKOUT_FIELD_ORDER,
  createCheckoutFormSchema,
  EMPTY_CHECKOUT_FORM,
  getCheckoutFieldErrors,
  type CheckoutFieldName,
  type CheckoutFormValues,
} from "@/modules/checkout/schemas/checkout-form.schema"

const NOW = new Date(2026, 9, 4, 12, 0, 0)

const VALID: CheckoutFormValues = {
  fullName: "Ana Pérez",
  email: "ana@email.com",
  phone: "",
  cardNumber: "4242 4242 4242 4242",
  cardExpiry: "12/30",
  cardCvc: "123",
  cardName: "Ana Pérez",
  acceptTerms: true,
}

function parse(overrides: Partial<CheckoutFormValues>) {
  return createCheckoutFormSchema(NOW).safeParse({ ...VALID, ...overrides })
}

function errorFor(field: CheckoutFieldName, value: CheckoutFormValues[CheckoutFieldName]) {
  return getCheckoutFieldErrors({ ...VALID, [field]: value }, NOW)[field]
}

describe("EMPTY_CHECKOUT_FORM", () => {
  it("starts with empty strings and unaccepted terms", () => {
    expect(EMPTY_CHECKOUT_FORM).toEqual({
      fullName: "",
      email: "",
      phone: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvc: "",
      cardName: "",
      acceptTerms: false,
    })
  })
})

describe("createCheckoutFormSchema", () => {
  it("accepts a valid card payment and normalizes the output", () => {
    const result = parse({ fullName: "  Ana Pérez  " })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      fullName: "Ana Pérez",
      email: "ana@email.com",
      phone: null,
      card: { number: "4242424242424242", expiry: "12/30", cvc: "123", name: "Ana Pérez" },
      acceptTerms: true,
    })
  })

  it("accepts a card that expires in the current month", () => {
    expect(parse({ cardExpiry: "10/26" }).success).toBe(true)
    expect(parse({ cardExpiry: "10 / 26" }).success).toBe(true)
  })

  it("always requires the card fields", () => {
    const errors = getCheckoutFieldErrors(
      { ...VALID, cardNumber: "", cardExpiry: "", cardCvc: "", cardName: "" },
      NOW
    )
    expect(errors).toEqual({
      cardNumber: "Ingresa el número de tu tarjeta.",
      cardExpiry: "Ingresa el vencimiento.",
      cardCvc: "Ingresa el CVC.",
      cardName: "Ingresa el nombre que figura en la tarjeta.",
    })
  })

  it.each(["", "   "])("maps an empty phone (%j) to null", (phone) => {
    const result = parse({ phone })
    expect(result.success).toBe(true)
    expect(result.data?.phone).toBeNull()
  })

  it.each(["(555) 123-4567", "555.123.4567", "+1 555 123 4567"])(
    "normalizes the US phone %j to 10 digits",
    (phone) => {
      expect(parse({ phone }).data?.phone).toBe("5551234567")
    }
  )
})

describe("validation messages", () => {
  it.each<[CheckoutFieldName, CheckoutFormValues[CheckoutFieldName], string]>([
    ["fullName", "", "Ingresa tu nombre completo."],
    ["fullName", "A", "Ingresa tu nombre completo."],
    ["fullName", "a".repeat(101), "El nombre puede tener hasta 100 caracteres."],
    ["email", "", "Ingresa tu correo electrónico."],
    ["email", "ana@", "Ingresa un correo válido, por ejemplo tu@email.com."],
    ["phone", "555-1234", "Ingresa un celular de EE. UU. de 10 dígitos."],
    ["phone", "123 456 7890", "Ingresa un celular de EE. UU. de 10 dígitos."],
    ["phone", "abc", "Ingresa un celular de EE. UU. de 10 dígitos."],
    ["cardNumber", "", "Ingresa el número de tu tarjeta."],
    ["cardNumber", "4242 4242 4242 4241", "Revisa el número de tu tarjeta."],
    ["cardNumber", "4242 4242 4242", "Revisa el número de tu tarjeta."],
    ["cardNumber", "4242 4242 4242 424a", "Revisa el número de tu tarjeta."],
    ["cardExpiry", "", "Ingresa el vencimiento."],
    ["cardExpiry", "13/30", "Usa el formato MM/AA."],
    ["cardExpiry", "1230", "Usa el formato MM/AA."],
    ["cardExpiry", "09/26", "La tarjeta está vencida."],
    ["cardCvc", "12", "Ingresa el CVC de 3 o 4 dígitos."],
    ["cardCvc", "12a", "Ingresa el CVC de 3 o 4 dígitos."],
    ["cardName", "", "Ingresa el nombre que figura en la tarjeta."],
    ["acceptTerms", false, "Acepta los términos para continuar."],
  ])("%s = %j → %s", (field, value, message) => {
    expect(parse({ [field]: value }).success).toBe(false)
    expect(errorFor(field, value)).toBe(message)
  })

  it("accepts a 4-digit CVC and hyphenated card numbers", () => {
    expect(parse({ cardCvc: "1234", cardNumber: "4242-4242-4242-4242" }).success).toBe(true)
  })
})

describe("getCheckoutFieldErrors", () => {
  it("returns {} for valid values", () => {
    expect(getCheckoutFieldErrors(VALID, NOW)).toEqual({})
  })

  it("returns one message per invalid field, only for known fields", () => {
    const errors = getCheckoutFieldErrors(EMPTY_CHECKOUT_FORM, NOW)
    expect(errors).toEqual({
      fullName: "Ingresa tu nombre completo.",
      email: "Ingresa tu correo electrónico.",
      cardNumber: "Ingresa el número de tu tarjeta.",
      cardExpiry: "Ingresa el vencimiento.",
      cardCvc: "Ingresa el CVC.",
      cardName: "Ingresa el nombre que figura en la tarjeta.",
      acceptTerms: "Acepta los términos para continuar.",
    })
    for (const key of Object.keys(errors)) {
      expect(CHECKOUT_FIELD_ORDER).toContain(key)
    }
  })
})
