// P0 Task 5 e PORT-005 (lote 4 da entrada): validação do passo pós-elegibilidade,
// pura e testável.
//
// A localidade NUNCA é texto livre: é o ibge_code do catálogo canônico,
// validado no servidor antes de provisionar. As três negações distintas:
//   1. ausência / formato errado -> 400 "locality is required";
//   2. formato certo mas ausente do catálogo -> 400 "locality is unknown"
//      (validação de existência, não de formato);
//   3. nome ausente ou curto -> 400 "display_name is required".
// Nenhuma mensagem de erro de banco ecoa para o cliente.
//
// PORT-005 acrescenta o momento da entrada (ADR-20261022-entrada-do-prototipo,
// item 3): Chegando, Moro aqui ou Saindo, com a data que cada um pede e o
// destino da saída. As regras são as do protótipo (entrada/arrive.js,
// `entryFinish`), com a mesma coerência do CHECK da tabela:
//   * chegando: data de chegada; nada de saída, nada de destino;
//   * moro aqui: nenhuma data, nenhum destino;
//   * saindo: data de saída e destino, e o destino é outra cidade.
// A data não pode estar no passado — o campo do protótipo já nasce com
// `min = hoje`, e o servidor não confia no campo. "Hoje" é o mesmo dia nos dois
// lados: a data do formulário é uma data LOCAL, sem hora, e o servidor a compara
// com o dia corrente no fuso mais a oeste do Brasil (America/Rio_Branco, UTC-5).
// Assim a data de ontem em Manaus nunca passa pelo servidor — 21/10 às 12h de
// 22/10 em Manaus é 21/10, e o hoje do servidor também é 22/10 — e a data de
// hoje em Manaus nunca é recusada, mesmo às 22h, quando o dia UTC já virou
// (23/10 02:00Z, 22/10 21:00 em Rio Branco). A folga de um dia em relação ao dia
// UTC, que existia aqui antes, aceitava 21/10 nesse horário: era o bug.
// A subtração de 24h não existe mais; o recorte é de calendário, não de
// aritmética de instante.
//
// A existência no catálogo do destino é conferida pela rota, como a da cidade:
// esta função separa formato de existência para o teste negativo ser possível.

export type EntryMoment = "arriving" | "resident" | "leaving"

export const ENTRY_MOMENTS: readonly EntryMoment[] = ["arriving", "resident", "leaving"] as const

export type ProvisionValidationError =
  | "locality is required"
  | "locality is unknown"
  | "display_name is required"
  | "display_name is too long"
  | "moment is required"
  | "date is invalid"
  | "date is in the past"
  | "arrival_date is required"
  | "departure_date is required"
  | "destination is required"
  | "arrival_date is not allowed"
  | "departure_date is not allowed"
  | "destination is not allowed"
  | "destination must differ from the current city"

export interface ProvisionInput {
  ibgeCode?: string
  displayName?: string
  moment?: string
  arrivalDate?: string
  departureDate?: string
  destinationIbgeCode?: string
}

export interface ProvisionValidationResult {
  ok: boolean
  error?: ProvisionValidationError
  ibgeCode?: string
  displayName?: string
  moment?: EntryMoment
  /** Data de chegada, só no momento `arriving`; nula nos outros dois. */
  arrivalDate?: string | null
  /** Data de saída, só no momento `leaving`; nula nos outros dois. */
  departureDate?: string | null
  /** ibge_code do destino, só no momento `leaving`; ausente nos outros dois. */
  destinationIbgeCode?: string | null
}

/** Nome máximo: o mesmo `maxlength` do campo do protótipo e do CHECK do banco. */
export const DISPLAY_NAME_MAX_LENGTH = 80

const ISO_DATE_PARTS = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * O fuso mais a oeste do Brasil. "Hoje" é o dia de calendário aqui: uma data sem
 * hora, escolhida por quem está em qualquer fuso brasileiro (UTC-2 a UTC-5),
 * nunca fica um dia à frente deste recorte.
 */
const SERVER_TIME_ZONE = "America/Rio_Branco"

const TODAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: SERVER_TIME_ZONE,
  year: "numeric",
})

function text(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

/** `AAAA-MM-DD` do dia corrente no fuso do servidor (en-CA já emite ISO). */
function toIsoDate(date: Date): string {
  return TODAY_FORMAT.format(date)
}

function isIsoDate(value: string): boolean {
  const parts = ISO_DATE_PARTS.exec(value)
  if (!parts) return false
  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  // O `Date` normaliza 31 de fevereiro para 3 de março em vez de recusar;
  // comparar os três campos de volta é o que separa data real de data
  // impossível. O Postgres recusaria a segunda com 22008, e um 500 não é a
  // resposta certa para um campo de data.
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function isEntryMoment(value: string): value is EntryMoment {
  return (ENTRY_MOMENTS as readonly string[]).includes(value)
}

/**
 * Valida o corpo do `provision` inteiro, momento incluído.
 *
 * `today` é injetado porque "o passado" é a única regra dependente do relógio;
 * a rota passa a data corrente e o teste passa uma fixa.
 */
export function validateProvisionInput(
  input: ProvisionInput,
  today: Date = new Date(),
): ProvisionValidationResult {
  const ibgeCode = text(input.ibgeCode)
  // O protótipo colapsa espaços antes de guardar o nome; o banco conta
  // caracteres do texto já limpo.
  const displayName = text(input.displayName).replace(/\s+/g, " ")

  if (!isLocalityCodeFormat(ibgeCode)) {
    return { ok: false, error: "locality is required" }
  }

  if (displayName.length < 2) {
    return { ok: false, error: "display_name is required" }
  }

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { ok: false, error: "display_name is too long" }
  }

  const moment = text(input.moment)
  if (!isEntryMoment(moment)) {
    return { ok: false, error: "moment is required" }
  }

  const arrivalDate = text(input.arrivalDate)
  const departureDate = text(input.departureDate)
  const destinationIbgeCode = text(input.destinationIbgeCode)
  // O dia de hoje no fuso do servidor. A tela usa o dia local do navegador; a
  // comparação é de data de calendário, então o recorte mais a oeste cobre
  // todos os fusos do Brasil sem aceitar ontem.
  const todayIso = toIsoDate(today)

  const dateProblem = (value: string): ProvisionValidationError | null => {
    if (!isIsoDate(value)) return "date is invalid"
    if (value < todayIso) return "date is in the past"
    return null
  }

  if (moment === "resident") {
    if (arrivalDate.length > 0) return { ok: false, error: "arrival_date is not allowed" }
    if (departureDate.length > 0) return { ok: false, error: "departure_date is not allowed" }
    if (destinationIbgeCode.length > 0) return { ok: false, error: "destination is not allowed" }
    return { ok: true, ibgeCode, displayName, moment, arrivalDate: null, departureDate: null }
  }

  if (moment === "arriving") {
    if (departureDate.length > 0) return { ok: false, error: "departure_date is not allowed" }
    if (destinationIbgeCode.length > 0) return { ok: false, error: "destination is not allowed" }
    if (arrivalDate.length === 0) return { ok: false, error: "arrival_date is required" }
    const problem = dateProblem(arrivalDate)
    if (problem) return { ok: false, error: problem }
    return { ok: true, ibgeCode, displayName, moment, arrivalDate, departureDate: null }
  }

  // leaving
  if (arrivalDate.length > 0) return { ok: false, error: "arrival_date is not allowed" }
  if (departureDate.length === 0) return { ok: false, error: "departure_date is required" }
  const problem = dateProblem(departureDate)
  if (problem) return { ok: false, error: problem }
  if (!isLocalityCodeFormat(destinationIbgeCode)) {
    return { ok: false, error: "destination is required" }
  }
  if (destinationIbgeCode === ibgeCode) {
    return { ok: false, error: "destination must differ from the current city" }
  }

  return {
    ok: true,
    ibgeCode,
    displayName,
    moment,
    arrivalDate: null,
    departureDate,
    destinationIbgeCode,
  }
}

// A existência no catálogo é validada pelo chamador (rota) contra a tabela;
// esta função separa formato de existência para o teste negativo ser possível.
export function isLocalityCodeFormat(value: string): boolean {
  return /^[0-9]{7}$/.test(value)
}
