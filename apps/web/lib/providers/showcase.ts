import { PROVIDER_CATEGORIES } from "@bivaque/domain"

// Onda G Task 4, Step 2 — validação na borda do sistema. As Server Actions
// chamam estas funções antes de tocar o banco; os testes unitários as exercitam
// diretamente. Arquivo separado das actions porque um arquivo "use server"
// só pode exportar funções assíncronas.

export type FieldValidation = { ok: true } | { ok: false; field: string; message: string }

const ok: FieldValidation = { ok: true }

function fail(field: string, message: string): FieldValidation {
  return { ok: false, field, message }
}

export function validateDisplayName(value: string): FieldValidation {
  const trimmed = value.trim()
  if (trimmed.length < 2 || trimmed.length > 80) {
    return fail("displayName", "O nome precisa ter entre 2 e 80 caracteres.")
  }
  return ok
}

export function validateBio(value: string | null): FieldValidation {
  if (value === null) return ok
  const trimmed = value.trim()
  if (trimmed.length === 0) return ok
  if (trimmed.length > 800) {
    return fail("bio", "A descrição passa de 800 caracteres.")
  }
  return ok
}

export function validateCategory(value: string): FieldValidation {
  const known = PROVIDER_CATEGORIES.some((candidate) => candidate === value)
  if (!known) {
    return fail("category", "Escolha uma categoria da lista.")
  }
  return ok
}

export function validateContactPhone(value: string | null): FieldValidation {
  if (value === null) return ok
  const trimmed = value.trim()
  if (trimmed.length === 0) return ok
  // Mesmo formato do check da migration da ficha (20260825185327).
  if (!/^\+?[0-9]{10,15}$/.test(trimmed)) {
    return fail(
      "contactPhone",
      "Use apenas números com DDD, opcionalmente com + no início (10 a 15 dígitos).",
    )
  }
  return ok
}

export function validateTitle(value: string): FieldValidation {
  const trimmed = value.trim()
  if (trimmed.length < 2 || trimmed.length > 120) {
    return fail("title", "O título precisa ter entre 2 e 120 caracteres.")
  }
  return ok
}

export function validateDescription(value: string | null): FieldValidation {
  if (value === null) return ok
  const trimmed = value.trim()
  if (trimmed.length === 0) return ok
  if (trimmed.length > 600) {
    return fail("description", "A descrição passa de 600 caracteres.")
  }
  return ok
}

export function validatePriceCents(value: string | null): FieldValidation {
  if (value === null || value.trim() === "") return ok
  const trimmed = value.trim()
  // Inteiro puro: parseInt pararia em "18.50" e deixaria preço quebrado passar.
  if (!/^\d+$/.test(trimmed)) {
    return fail("priceCents", "Informe o preço em centavos, número inteiro não negativo.")
  }
  const parsed = Number.parseInt(trimmed, 10)
  if (parsed > 100000000) {
    return fail("priceCents", "Informe o preço em centavos, número inteiro não negativo.")
  }
  return ok
}

export function firstFailure(...results: FieldValidation[]): FieldValidation {
  return results.find((result) => !result.ok) ?? ok
}
