// "O que mudou desde a sua última visita" (25/09/2026). O Início é o atalho do
// que está acontecendo no Bivaque; um total fixo ("12 anúncios") não diz isso,
// "3 novos desde a sua última visita" diz.
//
// A última visita mora no navegador (localStorage), não no banco: é preferência
// de leitura desta pessoa neste aparelho, não dado do produto. Sem registro — a
// primeira visita, uma janela anônima, armazenamento bloqueado — a página cai no
// comportamento de antes, sem selo de novidade e na ordem padrão.

export const LAST_VISIT_KEY = "bivaque:inicio:ultima-visita"

const DAY_MS = 24 * 60 * 60 * 1000
/** Mais que isso e "desde a última visita" deixa de ser notícia: vira o mês. */
export const NOVELTY_MAX_DAYS = 30

interface VisitStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Lê a visita anterior e grava a atual. Devolve o instante da anterior, ou null
 * se não há registro legível. Armazenamento que falha não derruba a página.
 */
export function swapLastVisit(storage: VisitStorage | null, now: Date): number | null {
  if (storage === null) return null
  let previous: number | null = null
  try {
    const raw = storage.getItem(LAST_VISIT_KEY)
    const parsed = raw === null ? Number.NaN : Number(raw)
    previous = Number.isFinite(parsed) && parsed > 0 && parsed <= now.getTime() ? parsed : null
  } catch {
    previous = null
  }
  try {
    storage.setItem(LAST_VISIT_KEY, String(now.getTime()))
  } catch {
    // Sem gravar, a próxima visita apenas não terá selo de novidade.
  }
  return previous
}

/**
 * O intervalo do que é novo: da visita anterior (nunca antes de 30 dias) até
 * a abertura desta. O que a própria pessoa publica depois de abrir o Início
 * não vira "novidade" para ela mesma.
 */
export interface NoveltyWindow {
  since: Date
  until: Date
}

export function noveltyWindow(previous: number | null, now: Date): NoveltyWindow | null {
  if (previous === null) return null
  return {
    since: new Date(Math.max(previous, now.getTime() - NOVELTY_MAX_DAYS * DAY_MS)),
    until: now,
  }
}

/** Quantos instantes caem dentro da janela (depois de `since`, até `until`). */
export function countInWindow(timestamps: readonly string[], span: NoveltyWindow): number {
  const from = span.since.getTime()
  const to = span.until.getTime()
  return timestamps.filter((value) => {
    const at = Date.parse(value)
    return at > from && at <= to
  }).length
}

/**
 * Blocos de descoberta ordenados pelo que tem de novo, do mais para o menos.
 * Empate (inclusive tudo zero) mantém a ordem padrão: sem novidade, a página é
 * a mesma de sempre.
 */
export function orderByNovelty<T extends { novelty: number }>(blocks: readonly T[]): T[] {
  return blocks
    .map((block, index) => ({ block, index }))
    .sort((a, b) => b.block.novelty - a.block.novelty || a.index - b.index)
    .map(({ block }) => block)
}
