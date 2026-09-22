// RECON-025 — lógica pura do Mercado: categorias, filtros, preço, validação do
// anúncio e o caminho do objeto no bucket. Sem I/O e sem React, para ser
// provada por teste unitário antes de qualquer tela.

export const LISTING_CATEGORIES = [
  { value: "casa_moveis", label: "Casa e móveis" },
  { value: "eletronicos", label: "Eletrônicos" },
  { value: "esporte", label: "Esporte" },
  { value: "infantil", label: "Infantil" },
  { value: "veiculos", label: "Veículos" },
  { value: "outros", label: "Outros" },
] as const

export type ListingCategory = (typeof LISTING_CATEGORIES)[number]["value"]

export const LISTING_CATEGORY_VALUES: readonly ListingCategory[] = LISTING_CATEGORIES.map(
  (category) => category.value,
)

export function isListingCategory(value: string): value is ListingCategory {
  return (LISTING_CATEGORY_VALUES as readonly string[]).includes(value)
}

export function categoryLabel(value: string): string {
  return LISTING_CATEGORIES.find((category) => category.value === value)?.label ?? "Outros"
}

// O domínio canônico (`public.listing_condition`) tem duas faixas. O Mercado
// original tinha três: "usado em bom estado" e "usado com marcas de uso"
// desaguam as duas em `used`, porque a distinção não existe no canônico e o ADR
// registra que o Mercado nasce sem linhas a migrar (nada é descartado em
// silêncio — a terceira faixa tem destino).
export const LISTING_CONDITIONS = [
  { value: "new", label: "Novo" },
  { value: "used", label: "Usado" },
] as const

export type ListingCondition = (typeof LISTING_CONDITIONS)[number]["value"]

export const LISTING_CONDITION_VALUES: readonly ListingCondition[] = LISTING_CONDITIONS.map(
  (condition) => condition.value,
)

export function isListingCondition(value: string): value is ListingCondition {
  return (LISTING_CONDITION_VALUES as readonly string[]).includes(value)
}

// Traduz a faixa legada (três valores) para a canônica (dois) na borda de
// escrita. `used_good` e `used_fair` são a mesma coisa para o banco.
export function toCanonicalCondition(value: string): ListingCondition | null {
  if (value === "new") return "new"
  if (value === "used" || value === "used_good" || value === "used_fair") return "used"
  return null
}

export function conditionLabel(value: string): string {
  return LISTING_CONDITIONS.find((condition) => condition.value === value)?.label ?? "Usado"
}

export const LISTING_SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
] as const

export type ListingSort = (typeof LISTING_SORT_OPTIONS)[number]["value"]

export const DEFAULT_LISTING_SORT: ListingSort = "recent"

export function isListingSort(value: string): value is ListingSort {
  return LISTING_SORT_OPTIONS.some((option) => option.value === value)
}

// A prancha 63 diz, na tela, "Você pode adicionar até 6 fotos."
export const MAX_LISTING_PHOTOS = 6

export const LISTING_PAGE_SIZE = 12

// Guarda superior de sanidade para o campo de preço de um item. Não é regra de
// negócio de Moradia (esse fluxo é o RECON-027).
export const MAX_LISTING_PRICE_CENTS = 100_000_000

export type ListingAudienceType = "locality" | "community"

export interface ListingSearchState {
  categories: ListingCategory[]
  conditions: ListingCondition[]
  neighborhood: string | null
  priceMin: number | null
  priceMax: number | null
  sort: ListingSort
  page: number
}

export const EMPTY_LISTING_SEARCH: ListingSearchState = {
  categories: [],
  conditions: [],
  neighborhood: null,
  priceMin: null,
  priceMax: null,
  sort: DEFAULT_LISTING_SORT,
  page: 1,
}

export interface SearchParamsLike {
  get(key: string): string | null
  getAll(key: string): string[]
}

function readCategories(params: SearchParamsLike): ListingCategory[] {
  return params
    .getAll("categoria")
    .filter(isListingCategory)
    .filter((value, index, list) => list.indexOf(value) === index)
}

function readConditions(params: SearchParamsLike): ListingCondition[] {
  return params
    .getAll("condicao")
    .filter(isListingCondition)
    .filter((value, index, list) => list.indexOf(value) === index)
}

function readCents(params: SearchParamsLike, key: string): number | null {
  const raw = params.get(key)
  if (raw === null || raw.trim() === "") return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function readPage(params: SearchParamsLike): number {
  const raw = params.get("pagina")
  if (raw === null) return 1
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

export function parseListingSearch(params: SearchParamsLike): ListingSearchState {
  const sortRaw = params.get("ordem")
  return {
    categories: readCategories(params),
    conditions: readConditions(params),
    neighborhood: params.get("regiao"),
    priceMin: readCents(params, "preco_min"),
    priceMax: readCents(params, "preco_max"),
    sort: sortRaw !== null && isListingSort(sortRaw) ? sortRaw : DEFAULT_LISTING_SORT,
    page: readPage(params),
  }
}

export function serializeListingSearch(state: ListingSearchState): string {
  const params = new URLSearchParams()
  for (const category of state.categories) params.append("categoria", category)
  for (const condition of state.conditions) params.append("condicao", condition)
  if (state.neighborhood !== null && state.neighborhood.trim() !== "") {
    params.set("regiao", state.neighborhood.trim())
  }
  if (state.priceMin !== null) params.set("preco_min", String(state.priceMin))
  if (state.priceMax !== null) params.set("preco_max", String(state.priceMax))
  if (state.sort !== DEFAULT_LISTING_SORT) params.set("ordem", state.sort)
  if (state.page > 1) params.set("pagina", String(state.page))
  const query = params.toString()
  return query === "" ? "" : `?${query}`
}

export function hasActiveFilters(state: ListingSearchState): boolean {
  return (
    state.categories.length > 0 ||
    state.conditions.length > 0 ||
    (state.neighborhood !== null && state.neighborhood.trim() !== "") ||
    state.priceMin !== null ||
    state.priceMax !== null
  )
}

export function activeFilterCount(state: ListingSearchState): number {
  let count = state.categories.length + state.conditions.length
  if (state.neighborhood !== null && state.neighborhood.trim() !== "") count += 1
  if (state.priceMin !== null || state.priceMax !== null) count += 1
  return count
}

// "650" → 65000; "650,00" → 65000; "R$ 1.234,56" → 123456; "" → null;
// texto não numérico → "invalid". O centavo é inteiro; nunca float.
export function parsePriceInput(raw: string): number | null | "invalid" {
  const normalized = raw
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "")
  if (normalized === "") return null

  const matches = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(normalized)
  if (matches === null) return "invalid"

  const reaisPart = (matches[1] ?? "").replace(/\./g, "")
  const centsPart = (matches[2] ?? "").padEnd(2, "0")
  const reais = Number.parseInt(reaisPart, 10)
  const cents = Number.parseInt(centsPart, 10)
  if (!Number.isFinite(reais) || !Number.isFinite(cents)) return "invalid"
  return reais * 100 + cents
}

export function formatCentsBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

const RELATIVE_UNITS: readonly { limitSeconds: number; divisor: number; suffix: string }[] = [
  { limitSeconds: 60, divisor: 1, suffix: "s" },
  { limitSeconds: 3600, divisor: 60, suffix: "min" },
  { limitSeconds: 86_400, divisor: 3600, suffix: "h" },
]

export function relativeTime(iso: string, now: number = Date.now()): string {
  const timestamp = Date.parse(iso)
  if (!Number.isFinite(timestamp)) return ""
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  for (const unit of RELATIVE_UNITS) {
    if (seconds < unit.limitSeconds) {
      const value = Math.max(1, Math.floor(seconds / unit.divisor))
      return `há ${value} ${unit.suffix}`
    }
  }
  const days = Math.floor(seconds / 86_400)
  return days === 1 ? "há 1 dia" : `há ${days} dias`
}

// O bairro é o grão máximo de localização (ADR D5). Endereço, número,
// complemento e coordenada são proibidos; o guarda é do servidor de banco, mas
// a tela recusa antes de tentar gravar.
const ADDRESS_LIKE =
  /\b(rua|avenida|av\.?|travessa|alameda|rodovia|estrada|quadra|lote|bloco|apto|apartamento|complemento|cep)\b/i
const HOUSE_NUMBER = /\b\d{1,5}\b/

export function isNeighborhoodLike(raw: string): boolean {
  const value = raw.trim()
  if (value === "") return false
  if (ADDRESS_LIKE.test(value)) return false
  if (HOUSE_NUMBER.test(value)) return false
  return true
}

export interface NewListingDraft {
  title: string
  category: string
  priceInput: string
  condition: string
  description: string
  neighborhood: string
  audienceType: ListingAudienceType
  localityId: string | null
  communityId: string | null
  photoCount: number
}

export interface ValidatedNewListing {
  title: string
  category: ListingCategory
  condition: ListingCondition
  description: string
  neighborhood: string
  priceCents: number
  audienceType: ListingAudienceType
  localityId: string | null
  communityId: string | null
}

export type NewListingField =
  | "title"
  | "category"
  | "price"
  | "condition"
  | "description"
  | "neighborhood"
  | "audience"
  | "photos"

export type NewListingErrors = Partial<Record<NewListingField, string>>

export type NewListingValidation =
  | { ok: true; value: ValidatedNewListing }
  | { ok: false; errors: NewListingErrors }

export function validateNewListing(draft: NewListingDraft): NewListingValidation {
  const errors: NewListingErrors = {}

  const title = draft.title.trim()
  if (title.length < 3) errors.title = "O título precisa de pelo menos 3 caracteres."
  else if (title.length > 120) errors.title = "O título passa de 120 caracteres."

  if (!isListingCategory(draft.category)) errors.category = "Escolha uma categoria."

  const price = parsePriceInput(draft.priceInput)
  if (price === "invalid") errors.price = "Informe um valor como 650 ou 650,00."
  else if (price === null) errors.price = "Informe o preço do item."
  else if (price > MAX_LISTING_PRICE_CENTS) errors.price = "O valor informado é alto demais."

  const condition = toCanonicalCondition(draft.condition)
  if (condition === null) errors.condition = "Escolha a condição do item."

  const description = draft.description.trim()
  if (description.length === 0) errors.description = "Descreva o item."
  else if (description.length > 2000) errors.description = "A descrição passa de 2000 caracteres."

  const neighborhood = draft.neighborhood.trim()
  if (neighborhood.length === 0) errors.neighborhood = "Informe o bairro."
  else if (neighborhood.length > 80) errors.neighborhood = "O bairro passa de 80 caracteres."
  else if (!isNeighborhoodLike(neighborhood)) {
    errors.neighborhood = "Use só o bairro. Endereço, número ou complemento não entram."
  }

  if (draft.audienceType === "locality" && draft.localityId === null) {
    errors.audience = "Escolha a cidade que pode ver o anúncio."
  }
  if (draft.audienceType === "community" && draft.communityId === null) {
    errors.audience = "Escolha a comunidade que pode ver o anúncio."
  }

  if (draft.photoCount > MAX_LISTING_PHOTOS) {
    errors.photos = `Você pode adicionar até ${MAX_LISTING_PHOTOS} fotos.`
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  // Os `if` acima garantem os tipos; a checagem estreita o que o TS não vê.
  if (!isListingCategory(draft.category) || condition === null || typeof price !== "number") {
    return { ok: false, errors: { category: "Confira os campos do anúncio." } }
  }

  return {
    ok: true,
    value: {
      title,
      category: draft.category,
      condition,
      description,
      neighborhood,
      priceCents: price,
      audienceType: draft.audienceType,
      localityId: draft.audienceType === "locality" ? draft.localityId : null,
      communityId: draft.audienceType === "community" ? draft.communityId : null,
    },
  }
}

// O caminho do objeto começa pelo id do anúncio — é assim que a policy de
// storage deriva a leitura do anúncio (ADR de mídia, D2).
export function buildListingPhotoPath(
  listingId: string,
  position: number,
  extension: string,
): string {
  const subtype = extension.includes("/") ? (extension.split("/").pop() ?? "jpg") : extension
  const safeExtension = subtype.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg"
  return `${listingId}/${position}-${Date.now()}.${safeExtension}`
}
