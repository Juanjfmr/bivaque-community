// Vocabulário fechado e canônico do motivo de denúncia (pranchas 56 e 58).
//
// A prancha 56, do membro, desenha Spam / Conteúdo inadequado / Informação
// enganosa / Outro. A 58, da operação, desenha Spam / Propaganda / Atividade
// suspeita / Informação incorreta. O conflito está registrado na leitura de
// pranchas: É UMA LISTA SÓ, e a reconciliação entra neste lote. Quem escolhe o
// motivo é quem denuncia — a lista da 56 é a de entrada; a operação filtra e
// exibe os mesmos valores, nunca um vocabulário paralelo.
//
// `reports.reason` é uma coluna de texto (1..1000) e criar coluna ou CHECK é
// proibido neste lote, então a categoria vive como prefixo legível do motivo —
// `Label: explicação` — exatamente como o modal do membro já grava hoje. A
// validação server-side acontece na action que insere; o parse abaixo é o que
// as duas pontas usam para ler de volta.

export interface ReportReasonOption {
  value: string
  label: string
}

export const REPORT_REASONS: readonly ReportReasonOption[] = [
  { value: "spam", label: "Spam" },
  { value: "conteudo-inadequado", label: "Conteúdo inadequado" },
  { value: "informacao-enganosa", label: "Informação enganosa" },
  { value: "outro", label: "Outro" },
]

export const EXPLANATION_MAX = 300

export function reportReasonLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? null
}

export function isReportReasonValue(value: string | null | undefined): boolean {
  return reportReasonLabel(value) !== null
}

export interface ParsedReportReason {
  /** Rótulo canônico quando o texto segue o prefixo gravado pela action. */
  categoryLabel: string | null
  /** Explicação opcional gravada junto do rótulo. */
  explanation: string | null
  /** Texto integral, para nunca se perder linha legada de texto livre. */
  raw: string
}

const SEPARATOR = ": "

export function composeReportReason(categoryLabel: string, explanation: string): string {
  const trimmed = explanation.trim()
  return trimmed.length > 0 ? `${categoryLabel}${SEPARATOR}${trimmed}` : categoryLabel
}

export function parseReportReason(reason: string | null | undefined): ParsedReportReason {
  const raw = (reason ?? "").trim()
  if (raw.length === 0) return { categoryLabel: null, explanation: null, raw }
  const known = REPORT_REASONS.find((item) => item.label === raw)
  if (known) return { categoryLabel: known.label, explanation: null, raw }
  const cut = raw.indexOf(SEPARATOR)
  if (cut > 0) {
    const prefix = raw.slice(0, cut)
    const knownPrefix = REPORT_REASONS.find((item) => item.label === prefix)
    if (knownPrefix) {
      return { categoryLabel: knownPrefix.label, explanation: raw.slice(cut + 2).trim(), raw }
    }
  }
  return { categoryLabel: null, explanation: null, raw }
}

/** O filtro Motivo da operação casa pelo rótulo canônico; linha legada de
 *  texto livre não pertence a nenhuma categoria e só aparece sem filtro. */
export function reasonMatchesCategory(reason: string, categoryLabel: string): boolean {
  return parseReportReason(reason).categoryLabel === categoryLabel
}
