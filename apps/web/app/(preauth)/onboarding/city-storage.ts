// O rascunho da tela de cidade e momento (PORT-005, ADR-20261022, item 3).
//
// Antes eram dois passos (Cidade e depois Perfil), e o sessionStorage levava só
// a cidade de um para o outro. Agora é uma tela só, e o rascunho é o formulário
// inteiro: cidade, momento, datas, destino e o nome. Ele existe para uma recarga
// ou um voltar não apagarem o que a pessoa digitou — é rascunho de navegação,
// descartável, e some quando a entrada conclui.
//
// O módulo é puro quanto à leitura/escrita para poder ser provado sem DOM, e
// tolerante campo a campo: um rascunho pela metade (só o nome, por exemplo) é
// restaurado no que dá, e o que não dá é descartado — nunca uma cidade ou uma
// data inventada.

import { ENTRY_MOMENTS, type EntryMoment } from "../../../lib/onboarding/provision-validation"

export const ENTRY_DRAFT_KEY = "onboarding:entry-draft"

/** O momento nasce em "chegando", como no protótipo (`entryCityData`). */
export const DEFAULT_ENTRY_MOMENT: EntryMoment = "arriving"

export type StoredCity = {
  cityName: string
  ibgeCode: string
  id: string
  stateCode: string
}

export type EntryDraft = {
  name: string
  city: StoredCity | null
  moment: EntryMoment
  /** `AAAA-MM-DD` ou vazio. Só vale no momento `arriving`. */
  arrivalDate: string
  /** `AAAA-MM-DD` ou vazio. Só vale no momento `leaving`. */
  departureDate: string
  /** Destino da saída. Só vale no momento `leaving`. */
  destination: StoredCity | null
}

export const EMPTY_ENTRY_DRAFT: EntryDraft = {
  name: "",
  city: null,
  moment: DEFAULT_ENTRY_MOMENT,
  arrivalDate: "",
  departureDate: "",
  destination: null,
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A cidade só vale inteira: qualquer campo faltando ou de outro tipo vira ausência. */
export function parseStoredCity(value: unknown): StoredCity | null {
  if (!isRecord(value)) return null
  const { id, ibgeCode, cityName, stateCode } = value
  if (
    typeof id === "string" &&
    typeof ibgeCode === "string" &&
    typeof cityName === "string" &&
    typeof stateCode === "string"
  ) {
    return { id, ibgeCode, cityName, stateCode }
  }
  return null
}

function parseMoment(value: unknown): EntryMoment {
  return typeof value === "string" && (ENTRY_MOMENTS as readonly string[]).includes(value)
    ? (value as EntryMoment)
    : DEFAULT_ENTRY_MOMENT
}

function parseDate(value: unknown): string {
  return typeof value === "string" && ISO_DATE.test(value) ? value : ""
}

export function parseEntryDraft(raw: string | null): EntryDraft | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    return {
      // O nome não é dado de persistência: é o texto do campo, e o limite é o
      // mesmo do campo (80) para um rascunho antigo não estourar o input.
      name: typeof parsed["name"] === "string" ? parsed["name"].slice(0, 80) : "",
      city: parseStoredCity(parsed["city"]),
      moment: parseMoment(parsed["moment"]),
      arrivalDate: parseDate(parsed["arrivalDate"]),
      departureDate: parseDate(parsed["departureDate"]),
      destination: parseStoredCity(parsed["destination"]),
    }
  } catch {
    return null
  }
}

type ReadableStorage = Pick<Storage, "getItem">
type WritableStorage = Pick<Storage, "setItem" | "removeItem">

export function readEntryDraft(storage: ReadableStorage): EntryDraft | null {
  return parseEntryDraft(storage.getItem(ENTRY_DRAFT_KEY))
}

export function writeEntryDraft(storage: WritableStorage, draft: EntryDraft): void {
  storage.setItem(ENTRY_DRAFT_KEY, JSON.stringify(draft))
}

/**
 * Concluída a entrada, o rascunho sai. O nome, as datas e o destino não ficam
 * no navegador depois que viraram linha do banco.
 */
export function clearEntryDraft(storage: WritableStorage): void {
  storage.removeItem(ENTRY_DRAFT_KEY)
}
