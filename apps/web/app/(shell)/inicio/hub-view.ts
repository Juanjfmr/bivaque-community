import { formatCount, type Loaded } from "./hub-loaders"
import { countInWindow, type NoveltyWindow } from "./novelty"
import type { HubData } from "./use-hub-data"

// O que a página decide a partir dos dados: que seção existe, quanto cada uma
// tem de novo, e em que ordem a descoberta aparece. Puro, testado sem rede.

/** Pronto e sem nada: a seção não ocupa a página (carregando e erro ficam). */
export function isReadyEmpty<T>(state: Loaded<T>, isEmpty: (data: T) => boolean): boolean {
  return state.status === "ready" && isEmpty(state.data)
}

export interface HubVisibility {
  events: boolean
  market: boolean
  questions: boolean
  guide: boolean
  properties: boolean
}

export function hubVisibility(data: HubData): HubVisibility {
  return {
    events: !isReadyEmpty(data.events, (events) => events.length === 0),
    market: !isReadyEmpty(data.market, (items) => items.length === 0),
    questions: !isReadyEmpty(data.questions, (questions) => questions.items.length === 0),
    guide: !isReadyEmpty(data.guide, (guide) => guide.items.length === 0),
    properties: !isReadyEmpty(data.properties, (properties) => properties.items.length === 0),
  }
}

export interface HubNovelty {
  market: number
  questions: number
  guide: number
  properties: number
}

const NONE: HubNovelty = { market: 0, questions: 0, guide: 0, properties: 0 }

function timesOf<T>(state: Loaded<T>, pick: (data: T) => readonly string[]): readonly string[] {
  return state.status === "ready" ? pick(state.data) : []
}

/** Quanto cada vertical tem de novo na janela; tudo zero sem visita anterior. */
export function hubNovelty(data: HubData, span: NoveltyWindow | null | undefined): HubNovelty {
  if (!span) return NONE
  return {
    market: countInWindow(
      timesOf(data.listingTimes, (times) => times),
      span,
    ),
    questions: countInWindow(
      timesOf(data.questions, (questions) => questions.createdAts),
      span,
    ),
    guide: countInWindow(
      timesOf(data.guide, (guide) => guide.createdAts),
      span,
    ),
    properties: countInWindow(
      timesOf(data.properties, (properties) => properties.createdAts),
      span,
    ),
  }
}

/** A ordem só muda quando a descoberta inteira chegou: nada pula enquanto carrega. */
export function discoverySettled(data: HubData): boolean {
  return [data.market, data.questions, data.guide, data.properties, data.listingTimes].every(
    (state) => state.status !== "loading",
  )
}

/** "3 novos", "1 nova", "50+ novos" — o selo de novidade de seção e atalho. */
export function newLabel(count: number, gender: "m" | "f"): string {
  const word = gender === "m" ? "novo" : "nova"
  return `${formatCount(count)} ${count === 1 ? word : `${word}s`}`
}
