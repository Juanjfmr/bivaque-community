import type { EligibilityClass, PortalApiResponse, VerificationResult } from "./types"

const FEDERAL_MILITARY_ORGAOS = new Set([
  "COMANDO DA AERONÁUTICA",
  "COMANDO DO EXÉRCITO",
  "COMANDO DA MARINHA",
  "MINISTÉRIO DA DEFESA",
])

const ACTIVE_FEDERAL_STATUSES = new Set([
  "ATIVO PERMANENTE",
  "ATIVO",
  "MILITAR DA ATIVA",
  "NOMEADO",
  "EXERCÍCIO",
])

const REFORMADO_STATUSES = new Set(["REFORMADO"])

const PENSIONER_STATUSES = new Set(["PENSIONISTA MILITAR", "PENSIONISTA"])

const AMBIGUOUS_STATUSES = new Set([
  "CEDIDO",
  "DISPONIBILIDADE",
  "LICENÇA",
  "EXONERADO",
  "DEMITIDO",
])

type PortalRecord = Record<string, unknown>

type NormalizedPortalRecord = {
  orgao: string
  situacao: string
  tipoServidor: string
  hasFichaMilitar: boolean
  hasFichaReformado: boolean
  hasFichaPensaoMilitar: boolean
  // P0 Task 5: só o nome civil atravessa a fronteira do payload, em memória,
  // para preencher o campo do passo pós-elegibilidade. Nunca é persistido
  // aqui (D11): o que persiste é a declaração da pessoa.
  nomeCivil: string
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  return value.trim().toUpperCase()
}

// P0 Task 5 / Task 7 follow-up: the suggested name is the only field that
// crosses the verification boundary into the post-eligibility step. The
// Portal payload hands it in the original casing, and the post-eligibility
// screen must show it the way the member wrote it - not as "JOÃO DA
// SILVA". `normalizeString` uppercases for classification against the
// Set of orgão and situação, and that contract is enforced; adding a
// non-uppercasing variant here is the line that keeps the two
// requirements from pulling each other apart.
function trimmedString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  return value.trim()
}

function asRecord(value: unknown): PortalRecord | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as PortalRecord
  }
  return null
}

function firstString(values: unknown[]): string {
  for (const value of values) {
    const normalized = normalizeString(value)
    if (normalized) {
      return normalized
    }
  }
  return ""
}

function objectString(record: PortalRecord | null, key: string): string {
  if (!record) {
    return ""
  }
  return normalizeString(record[key])
}

function nestedObjectString(record: PortalRecord | null, key: string, innerKey: string): string {
  if (!record) {
    return ""
  }
  return objectString(asRecord(record[key]), innerKey)
}

function firstFicha(record: PortalRecord | null, keys: string[]): PortalRecord | null {
  if (!record) {
    return null
  }
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value) && value.length > 0) {
      const first = asRecord(value[0])
      if (first) {
        return first
      }
    }
  }
  return null
}

function normalizePortalRecord(record: PortalRecord): NormalizedPortalRecord {
  const servidor = asRecord(record["servidor"])
  const nomeCivil = trimmedString(asRecord(servidor?.["pessoa"])?.["nome"])
  const fichaMilitar =
    firstFicha(record, ["fichasMilitar"]) ?? firstFicha(servidor, ["fichasMilitar"])
  const fichaReformado =
    firstFicha(record, ["fichasReformado"]) ?? firstFicha(servidor, ["fichasReformado"])
  const fichaPensaoMilitar =
    firstFicha(record, ["fichasPensaoMilitar"]) ?? firstFicha(servidor, ["fichasPensaoMilitar"])

  const orgao = firstString([
    fichaMilitar ? objectString(fichaMilitar, "orgao") : "",
    fichaMilitar ? objectString(fichaMilitar, "orgaoServidorLotacao") : "",
    nestedObjectString(servidor, "orgaoServidorLotacao", "nome"),
    nestedObjectString(servidor, "orgaoServidorExercicio", "nome"),
    objectString(record, "orgao_servidor"),
    objectString(record, "orgao"),
    objectString(record, "orgao_lotacao"),
  ])

  const situacao = firstString([
    fichaMilitar ? objectString(fichaMilitar, "situacaoServidor") : "",
    objectString(servidor, "situacao"),
    objectString(record, "situacao_funcional"),
    objectString(record, "situacao"),
  ])

  const tipoServidor = firstString([
    objectString(servidor, "tipoServidor"),
    objectString(record, "tipo_servidor"),
  ])

  return {
    orgao,
    situacao,
    tipoServidor,
    hasFichaMilitar: fichaMilitar !== null,
    hasFichaReformado: fichaReformado !== null,
    hasFichaPensaoMilitar: fichaPensaoMilitar !== null,
    nomeCivil,
  }
}

function isFederalMilitary(record: NormalizedPortalRecord): boolean {
  return FEDERAL_MILITARY_ORGAOS.has(record.orgao)
}

function isNonFederalMilitary(record: NormalizedPortalRecord): boolean {
  if (!record.orgao) {
    return false
  }
  const militaryTerms = [
    "MILITAR",
    "EXÉRCITO",
    "AERONÁUTICA",
    "MARINHA",
    "DEFESA",
    "POLÍCIA MILITAR",
    "BOMBEIRO MILITAR",
  ]
  const isMilitary = militaryTerms.some((term) => record.orgao.includes(term))
  return isMilitary && !isFederalMilitary(record)
}

function isCivilian(record: NormalizedPortalRecord): boolean {
  if (!record.orgao && record.tipoServidor !== "MILITAR") {
    return false
  }
  if (record.tipoServidor === "MILITAR") {
    return false
  }
  const militaryTerms = ["MILITAR", "EXÉRCITO", "AERONÁUTICA", "MARINHA", "DEFESA"]
  return !militaryTerms.some((term) => record.orgao.includes(term))
}

function isMilitaryPensioner(record: NormalizedPortalRecord): boolean {
  return record.hasFichaPensaoMilitar || PENSIONER_STATUSES.has(record.situacao)
}

function isReformado(record: NormalizedPortalRecord): boolean {
  return record.hasFichaReformado || REFORMADO_STATUSES.has(record.situacao)
}

function isActiveFederal(record: NormalizedPortalRecord): boolean {
  if (!isFederalMilitary(record)) {
    return false
  }
  return ACTIVE_FEDERAL_STATUSES.has(record.situacao)
}

function determineEligibilityClass(record: NormalizedPortalRecord): EligibilityClass | null {
  if (isActiveFederal(record)) {
    return "active_federal_military"
  }
  if (isReformado(record) && isFederalMilitary(record)) {
    return "veteran"
  }
  if (isMilitaryPensioner(record) && isFederalMilitary(record)) {
    return "military_pensioner"
  }
  return null
}

function isMultipleMatch(response: PortalApiResponse): boolean {
  return response.length > 1
}

function isAmbiguousRecord(record: NormalizedPortalRecord): boolean {
  return AMBIGUOUS_STATUSES.has(record.situacao)
}

export function classifyPortalResponse(response: PortalApiResponse): VerificationResult {
  if (response.length === 0) {
    return { status: "rejected" }
  }

  if (isMultipleMatch(response)) {
    return { status: "rejected" }
  }

  const rawRecord = response[0]
  if (rawRecord === undefined || rawRecord === null || typeof rawRecord !== "object") {
    return { status: "rejected" }
  }

  const record = normalizePortalRecord(rawRecord as PortalRecord)

  if (isCivilian(record)) {
    return { status: "rejected" }
  }

  if (isNonFederalMilitary(record)) {
    return { status: "rejected" }
  }

  if (isAmbiguousRecord(record)) {
    return { status: "rejected" }
  }

  const eligibilityClass = determineEligibilityClass(record)
  if (eligibilityClass !== null) {
    // suggestedName: só o nome, em memória, para preencher o campo. OM, posto
    // e situação não atravessam (AGENTS.md:205, D11).
    if (record.nomeCivil.length > 0) {
      return { status: "verified", eligibilityClass, suggestedName: record.nomeCivil }
    }
    return { status: "verified", eligibilityClass }
  }

  return { status: "rejected" }
}
