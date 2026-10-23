/**
 * PORT-004 (lote 4 da entrada, frente B): o que a elegibilidade tem de lógica,
 * separado da tela para poder ser medido sem navegador.
 *
 * A fonte é `prototypes/bivaque-html/src/features/entry/account.js`:
 * `renderEntryResult` e `renderEntryPending` montam os mesmos textos, na mesma
 * ordem, e `entryDocLabel`/`when` formatam o documento enviado. Nada aqui fala
 * com o servidor: a situação vem de `readDocumentStatus` e do resultado da
 * conferência, e a tela só decide qual bloco desenhar.
 *
 * O protótipo mostrava dois dados que o Next não tem: o tipo e o tamanho do
 * arquivo (o bucket guarda o arquivo, não metadados legíveis) e a hora local do
 * aparelho. O que sobra — a data do envio — é formatada no fuso de Manaus,
 * porque a página é renderizada no servidor e o relógio de quem lê não está
 * disponível ali. A diferença está registrada no relatório da frente.
 */

export type PendingStepState = "done" | "now" | "todo"

export interface PendingStep {
  detail: string
  state: PendingStepState
  title: string
}

export interface PendingTimelineInput {
  /** E-mail da conta criada — o passo 1 do protótipo mostra o endereço. */
  email: string
  /** A equipe pediu outro documento (`needs_replacement`). */
  askedForReplacement: boolean
  /** Data do envio do documento; `null` quando ainda não há arquivo. */
  uploadedAt: string | null
}

export interface PendingHeadlineInput {
  askedForReplacement: boolean
  hasDocument: boolean
}

const UPLOADED_AT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Manaus",
})

/** "13/10, 16:00", como `when()` no protótipo. Vazio quando a data não é válida. */
export function formatUploadedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return UPLOADED_AT.format(date)
}

/** A máscara do campo de CPF do protótipo (`000.000.000-00`). */
export function formatCpfInput(digits: string): string {
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export function pendingHeadline({
  askedForReplacement,
  hasDocument,
}: PendingHeadlineInput): string {
  if (hasDocument) return "Recebemos seu documento."
  if (askedForReplacement) return "A equipe pediu outro documento."
  return "Sua elegibilidade está em análise."
}

export function pendingLead(hasDocument: boolean): string {
  const closed = "Enquanto a equipe confere, o conteúdo do Bivaque fica fechado."
  if (hasDocument) return closed
  return `${closed} Para adiantar, envie um documento que mostre o vínculo, como o contracheque ou a identidade militar.`
}

/**
 * Os quatro passos de `renderEntryPending`, na ordem do protótipo. O passo do
 * documento troca de estado conforme o envio; o da equipe é sempre o atual e o
 * da cidade é sempre o seguinte.
 */
export function pendingTimeline({
  askedForReplacement,
  email,
  uploadedAt,
}: PendingTimelineInput): PendingStep[] {
  const hasDocument = uploadedAt !== null
  const uploadedLabel = hasDocument ? formatUploadedAt(uploadedAt) : ""

  return [
    { detail: email, state: "done", title: "Conta criada" },
    hasDocument
      ? { detail: uploadedLabel, state: "done", title: "Documento enviado" }
      : {
          detail: askedForReplacement
            ? "A equipe pediu outro documento"
            : "A fonte oficial pediu uma conferência",
          state: "now",
          title: "Consulta feita",
        },
    {
      detail: "Até 2 dias úteis · normalmente no mesmo dia",
      state: "now",
      title: "Análise da equipe",
    },
    { detail: "Assim que liberar", state: "todo", title: "Escolher sua cidade" },
  ]
}
