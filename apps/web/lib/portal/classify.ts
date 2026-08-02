import type { EligibilityClass, PortalApiResponse, VerificationResult } from "./types"

const FEDERAL_MILITARY_ORGAOS = new Set([
  "Comando da Aeronáutica",
  "Comando do Exército",
  "Comando da Marinha",
  "Ministério da Defesa",
])

const ACTIVE_FEDERAL_STATUSES = new Set(["ATIVO PERMANENTE", "ATIVO", "NOMEADO", "EXERCÍCIO"])

const REFORMADO_STATUSES = new Set(["REFORMADO", "reformado"])

const PENSIONER_STATUSES = new Set(["PENSIONISTA MILITAR", "PENSIONISTA"])

type PortalRecord = Record<string, unknown>

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  return value.trim().toUpperCase()
}

function isFederalMilitary(record: PortalRecord): boolean {
  const orgao = normalizeString(
    record["orgao_servidor"] ?? record["orgao"] ?? record["orgao_lotacao"],
  )
  return FEDERAL_MILITARY_ORGAOS.has(
    Array.from(FEDERAL_MILITARY_ORGAOS).find((o) => orgao === o.toUpperCase()) ?? "",
  )
}

function isNonFederalMilitary(record: PortalRecord): boolean {
  const orgao = normalizeString(
    record["orgao_servidor"] ?? record["orgao"] ?? record["orgao_lotacao"],
  )
  if (!orgao) {
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
  const isMilitary = militaryTerms.some((term) => orgao.includes(term))
  return isMilitary && !isFederalMilitary(record)
}

function isCivilian(record: PortalRecord): boolean {
  const orgao = normalizeString(
    record["orgao_servidor"] ?? record["orgao"] ?? record["orgao_lotacao"],
  )
  if (!orgao) {
    return false
  }
  const militaryTerms = ["MILITAR", "EXÉRCITO", "AERONÁUTICA", "MARINHA", "DEFESA"]
  return !militaryTerms.some((term) => orgao.includes(term))
}

function isMilitaryPensioner(record: PortalRecord): boolean {
  const situacao = normalizeString(record["situacao_funcional"] ?? record["situacao"] ?? "")
  return PENSIONER_STATUSES.has(situacao)
}

function isReformado(record: PortalRecord): boolean {
  const situacao = normalizeString(record["situacao_funcional"] ?? record["situacao"] ?? "")
  return REFORMADO_STATUSES.has(situacao)
}

function isActiveFederal(record: PortalRecord): boolean {
  if (!isFederalMilitary(record)) {
    return false
  }
  const situacao = normalizeString(record["situacao_funcional"] ?? record["situacao"] ?? "")
  return ACTIVE_FEDERAL_STATUSES.has(situacao)
}

function determineEligibilityClass(record: PortalRecord): EligibilityClass | null {
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

function isAmbiguousRecord(record: PortalRecord): boolean {
  const situacao = normalizeString(record["situacao_funcional"] ?? record["situacao"] ?? "")
  const ambiguousStatuses = ["CEDIDO", "DISPONIBILIDADE", "LICENÇA", "EXONERADO", "DEMITIDO"]
  if (ambiguousStatuses.includes(situacao)) {
    return true
  }
  const orgao = normalizeString(
    record["orgao_servidor"] ?? record["orgao"] ?? record["orgao_lotacao"],
  )
  if (orgao.includes("MILITAR") && orgao.includes("POLÍCIA")) {
    return false
  }
  return false
}

export function classifyPortalResponse(response: PortalApiResponse): VerificationResult {
  if (response.length === 0) {
    return { status: "rejected" }
  }

  if (isMultipleMatch(response)) {
    return { status: "rejected" }
  }

  const record = response[0]
  if (record === undefined) {
    return { status: "rejected" }
  }

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
    return { status: "verified", eligibilityClass }
  }

  return { status: "rejected" }
}
