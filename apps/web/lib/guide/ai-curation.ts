import { scrubPii } from "@bivaque/domain"

export const ARRIVAL_GUIDE_CATEGORIES = ["school", "hospital", "transporter", "courier"] as const

export type ArrivalGuideCategory = (typeof ARRIVAL_GUIDE_CATEGORIES)[number]

export interface GuideExtractionDraft {
  category: ArrivalGuideCategory
  name: string
  description: string
  website_url: string | null
  phone: string | null
  confidence: number | null
}

const MAX_SOURCE_LENGTH = 2000
const CEP = /\b\d{5}-\d{3}\b/g

export function sanitizeGuideSource(text: string): string {
  return scrubPii(text).replace(CEP, "[CEP REMOVIDO]").trim().slice(0, MAX_SOURCE_LENGTH)
}

export function buildGuideExtractionPrompt(text: string): string {
  return [
    "Extraia do texto abaixo referências para o Guia de Chegada de Manaus.",
    "Responda apenas com JSON, sem markdown, nesta forma:",
    '{"suggestions":[{"category":"school|hospital|transporter|courier","name":"...","description":"...","website_url":"https://...|null","phone":"...|null","confidence":0}]}',
    "Regras: não invente; use somente o texto; descrição máx. 500; confiança 0-100.",
    `Texto: ${sanitizeGuideSource(text)}`,
  ].join("\n")
}

function isCategory(value: unknown): value is ArrivalGuideCategory {
  return (
    typeof value === "string" && ARRIVAL_GUIDE_CATEGORIES.includes(value as ArrivalGuideCategory)
  )
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null
  const trimmed = value.trim()
  return /^https?:\/\//.test(trimmed) ? trimmed.slice(0, 500) : null
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null
  const trimmed = value.trim()
  return /^\+?[0-9() -]{8,30}$/.test(trimmed) ? trimmed.slice(0, 30) : null
}

function normalizeConfidence(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.min(100, Math.round(numeric)))
}

function parseDraft(value: unknown): GuideExtractionDraft | null {
  if (value === null || typeof value !== "object") return null
  const record = value as Record<string, unknown>

  const category = record["category"]
  const name = record["name"]
  const description = record["description"]

  if (!isCategory(category)) return null
  if (typeof name !== "string") return null
  const trimmedName = name.trim()
  if (trimmedName.length < 2 || trimmedName.length > 120) return null

  const rawDescription = typeof description === "string" ? description.trim() : ""
  if (rawDescription.length > 500) return null

  return {
    category,
    name: trimmedName,
    description: rawDescription,
    website_url: normalizeUrl(record["website_url"]),
    phone: normalizePhone(record["phone"]),
    confidence: normalizeConfidence(record["confidence"]),
  }
}

export function parseGuideExtractionResponse(raw: string): GuideExtractionDraft[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  let payload: unknown
  try {
    payload = JSON.parse(trimmed)
  } catch {
    return []
  }

  if (Array.isArray(payload)) return payload.map(parseDraft).filter((item) => item !== null)

  if (payload !== null && typeof payload === "object") {
    const suggestions = (payload as Record<string, unknown>)["suggestions"]
    if (Array.isArray(suggestions)) {
      return suggestions.map(parseDraft).filter((item) => item !== null)
    }
  }

  const direct = parseDraft(payload)
  return direct ? [direct] : []
}
