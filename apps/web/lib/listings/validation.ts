// RECON-027 — validação de borda do anúncio de Moradia.
//
// A prancha 65 tem que ser possível cadastrar (contrato: "não desenhar somente o
// detalhe e deixar o anúncio impossível de cadastrar"). A validação é por tipo:
// `property` exige negócio e tipo de imóvel e custos coerentes com o negócio;
// nenhum custo é obrigatório — ausente é estado válido, não erro. A mesma
// função é usada pela Server Action e pelos testes unitários.

import {
  LISTING_DEAL_LABELS,
  type ListingDeal,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
  TITLE_MAX,
  TITLE_MIN,
} from "./types"

export type FieldValidation = { ok: true } | { ok: false; field: string; message: string }

const ok: FieldValidation = { ok: true }

function fail(field: string, message: string): FieldValidation {
  return { ok: false, field, message }
}

export function firstFailure(...results: FieldValidation[]): FieldValidation {
  return results.find((result) => !result.ok) ?? ok
}

export interface PropertyDraftInput {
  title: string
  deal: string
  propertyType: string
  rent: string
  condoFee: string
  iptu: string
  salePrice: string
  bedrooms: string
  suites: string
  parkingSpots: string
  areaM2: string
  description: string
  neighborhood: string
  availableFrom: string
}

export function validateTitle(value: string): FieldValidation {
  const trimmed = value.trim()
  if (trimmed.length < TITLE_MIN || trimmed.length > TITLE_MAX) {
    return fail("title", `O título precisa ter entre ${TITLE_MIN} e ${TITLE_MAX} caracteres.`)
  }
  return ok
}

export function validateDeal(value: string): FieldValidation {
  if (value !== "rent" && value !== "sale") {
    return fail("deal", "Escolha aluguel ou venda.")
  }
  return ok
}

export function validatePropertyType(value: string): FieldValidation {
  if (!(value in PROPERTY_TYPE_LABELS)) {
    return fail("propertyType", "Escolha o tipo do imóvel.")
  }
  return ok
}

// Custo opcional: vazio é válido (não informado); preenchido precisa ser
// inteiro não negativo em reais, convertido para centavos.
function optionalCents(value: string, field: string): FieldValidation {
  const trimmed = value.trim()
  if (trimmed === "") return ok
  if (!/^\d+$/.test(trimmed)) {
    return fail(field, "Informe um valor em reais, sem centavos e sem símbolo.")
  }
  const parsed = Number.parseInt(trimmed, 10)
  if (parsed > 100_000_000) {
    return fail(field, "Valor acima do limite permitido.")
  }
  return ok
}

function optionalCount(value: string, field: string, max: number): FieldValidation {
  const trimmed = value.trim()
  if (trimmed === "") return ok
  if (!/^\d+$/.test(trimmed)) {
    return fail(field, "Informe um número inteiro.")
  }
  const parsed = Number.parseInt(trimmed, 10)
  if (parsed > max) {
    return fail(field, "Número acima do limite.")
  }
  return ok
}

function optionalArea(value: string): FieldValidation {
  const trimmed = value.trim()
  if (trimmed === "") return ok
  const normalized = trimmed.replace(",", ".")
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return fail("areaM2", "Informe a área em metros quadrados.")
  }
  const parsed = Number.parseFloat(normalized)
  if (parsed <= 0 || parsed > 100_000) {
    return fail("areaM2", "Área fora do intervalo permitido.")
  }
  return ok
}

function optionalLength(value: string, field: string, max: number): FieldValidation {
  if (value.trim().length > max) {
    return fail(field, `Texto acima de ${max} caracteres.`)
  }
  return ok
}

// Coerência de negócio: aluguel e venda são exclusivos, como o check do banco.
// Informar os dois é erro de formulário — não é "somar", é impedir dado ambíguo.
export function validateDealCosts(deal: string, rent: string, salePrice: string): FieldValidation {
  const rentInformed = rent.trim() !== ""
  const saleInformed = salePrice.trim() !== ""
  if (deal === "rent" && saleInformed) {
    return fail("salePrice", "Um imóvel de aluguel não tem preço de venda.")
  }
  if (deal === "sale" && rentInformed) {
    return fail("rent", "Um imóvel de venda não tem aluguel mensal.")
  }
  return ok
}

export function validatePropertyDraft(input: PropertyDraftInput): FieldValidation {
  return firstFailure(
    validateTitle(input.title),
    validateDeal(input.deal),
    validatePropertyType(input.propertyType),
    validateDealCosts(input.deal, input.rent, input.salePrice),
    optionalCents(input.rent, "rent"),
    optionalCents(input.condoFee, "condoFee"),
    optionalCents(input.iptu, "iptu"),
    optionalCents(input.salePrice, "salePrice"),
    optionalCount(input.bedrooms, "bedrooms", 20),
    optionalCount(input.suites, "suites", 20),
    optionalCount(input.parkingSpots, "parkingSpots", 20),
    optionalArea(input.areaM2),
    optionalLength(input.description, "description", 2000),
    optionalLength(input.neighborhood, "neighborhood", 80),
  )
}

export function parseOptionalCents(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  return Number.parseInt(trimmed, 10) * 100
}

export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  return Number.parseInt(trimmed, 10)
}

export function parseOptionalArea(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  return Number.parseFloat(trimmed.replace(",", "."))
}

export function dealLabel(deal: ListingDeal): string {
  return LISTING_DEAL_LABELS[deal]
}

export function propertyTypeLabel(propertyType: PropertyType): string {
  return PROPERTY_TYPE_LABELS[propertyType]
}
