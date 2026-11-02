/**
 * Formatação: dinheiro e datas, do protótipo (`utilities/format.js`: `money`,
 * `dateISO`, `dateLabel`, `countDays`). Tudo puro e sem DOM.
 */

const EM_REAIS = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

/** Real sem centavos (protótipo: `money`). */
export function moeda(valor: number): string {
  return EM_REAIS.format(Math.round(valor))
}

function comMeioDia(data: string): Date {
  // Meio-dia local evita o dia pular por fuso (protótipo: `dateLabel` e
  // `countDays` também fixam o horário do meio-dia).
  return new Date(`${data}T12:00:00`)
}

/** `YYYY-MM-DD` local, com deslocamento de dias (protótipo: `dateISO`). */
export function dataISO(deslocamentoDias = 0): string {
  const agora = new Date()
  const alvo = new Date(agora.getTime() + deslocamentoDias * 86_400_000)
  const ano = alvo.getFullYear()
  const mes = String(alvo.getMonth() + 1).padStart(2, "0")
  const dia = String(alvo.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

/** Data por extenso curta em pt-BR (protótipo: `dateLabel`). */
export function rotuloDeData(data: string): string {
  return comMeioDia(data).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
}

/** Dias inteiros até a data, mínimo zero (protótipo: `countDays`). */
export function diasAte(data: string, referencia = new Date()): number {
  const diferenca = comMeioDia(data).getTime() - referencia.getTime()
  return Math.max(0, Math.ceil(diferenca / 86_400_000))
}
