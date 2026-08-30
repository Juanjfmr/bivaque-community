export type RecommendationScope = {
  locality_id: string | null
  group_id: string | null
}

export type RecommendationSimilarityInput = RecommendationScope & {
  category: string
  title: string
  body: string
}

export type RecommendationSimilarityCandidate = RecommendationScope & {
  id: string
  category: string
  title: string
  body: string
  created_at: string
  is_resolved: boolean
}

export type RankedRecommendationCandidate = RecommendationSimilarityCandidate & {
  similarity: number
}

const STOP_WORDS = new Set([
  "algum",
  "alguma",
  "alguem",
  "busco",
  "conhece",
  "conhecem",
  "indica",
  "indicacao",
  "indicacoes",
  "indicar",
  "preciso",
  "procuro",
  "procurando",
  "queria",
  "quero",
  "recomendacao",
  "recomendacoes",
  "recomenda",
  "saber",
  "uma",
  "uns",
  "umas",
  "para",
  "por",
  "com",
  "que",
  "tem",
  "ter",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "o",
  "a",
  "os",
  "as",
  "e",
])

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function normalizeToken(token: string): string {
  // A conservative singular fold catches common Portuguese plural variants
  // without trying to be a language model or a general stemmer.
  if (token.length > 5 && token.endsWith("s")) return token.slice(0, -1)
  return token
}

function significantTokens(value: string): Set<string> {
  const normalized = normalizeText(value)
  if (!normalized) return new Set()

  return new Set(
    normalized
      .split(" ")
      .map(normalizeToken)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  )
}

function sameScope(a: RecommendationScope, b: RecommendationScope): boolean {
  if (a.locality_id && b.locality_id) {
    return a.locality_id === b.locality_id && !a.group_id && !b.group_id
  }
  if (a.group_id && b.group_id) {
    return a.group_id === b.group_id && !a.locality_id && !b.locality_id
  }
  return false
}

function setIntersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0
  for (const value of a) {
    if (b.has(value)) count += 1
  }
  return count
}

export function hasUsefulRecommendationQuery(title: string, body: string): boolean {
  const normalized = normalizeText(`${title} ${body}`)
  if (normalized.length < 5) return false
  return significantTokens(normalized).size >= 1
}

export function recommendationTextSimilarity(query: string, candidate: string): number {
  const a = significantTokens(query)
  const b = significantTokens(candidate)
  if (a.size === 0 || b.size === 0) return 0

  const intersection = setIntersectionSize(a, b)
  if (intersection === 0) return 0

  const union = a.size + b.size - intersection
  const jaccard = intersection / union
  const containment = intersection / Math.min(a.size, b.size)

  const normalizedA = normalizeText(query)
  const normalizedB = normalizeText(candidate)
  const phraseBoost =
    normalizedA.length >= 6 &&
    normalizedB.length >= 6 &&
    (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA))
      ? 0.15
      : 0

  return Math.min(1, containment * 0.65 + jaccard * 0.35 + phraseBoost)
}

export function rankSimilarRecommendationRequests(
  input: RecommendationSimilarityInput,
  candidates: RecommendationSimilarityCandidate[],
  options: { limit?: number; minScore?: number } = {},
): RankedRecommendationCandidate[] {
  if (!hasUsefulRecommendationQuery(input.title, input.body)) return []

  const limit = Math.max(1, options.limit ?? 3)
  const minScore = options.minScore ?? 0.44
  const queryText = `${input.title} ${input.body}`

  return candidates
    .filter((candidate) => candidate.category === input.category && sameScope(input, candidate))
    .map((candidate) => ({
      ...candidate,
      similarity: recommendationTextSimilarity(queryText, `${candidate.title} ${candidate.body}`),
    }))
    .filter((candidate) => candidate.similarity >= minScore)
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .slice(0, limit)
}
