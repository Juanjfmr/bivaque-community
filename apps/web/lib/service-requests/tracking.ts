// RECON-023 — acompanhamento do pedido (prancha 17, R43/R44).
//
// Logica pura da lista e do detalhe, separada da Server Component para ser
// exercitada sem banco. Os rotulos espelham a prancha 17 e a coluna de situacao
// da prancha 23; nada aqui deriva situacao de contagem de mensagens (ADR D1).

import { type FieldValidation, SERVICE_REQUEST_DESCRIPTION_MAX } from "./request-form"

export type ServiceRequestStatus = "open" | "in_conversation" | "closed" | "cancelled"

export const REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  open: "Em aberto",
  in_conversation: "Em conversa",
  closed: "Encerrado",
  cancelled: "Cancelado",
}

export type RequestStatusFilter = "all" | "open" | "in_conversation" | "closed"

export const REQUEST_STATUS_FILTERS: { id: RequestStatusFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "open", label: "Em aberto" },
  { id: "in_conversation", label: "Em conversa" },
  { id: "closed", label: "Encerrados" },
]

export const REQUEST_MESSAGE_MAX = 2000

/** Encerrado agrupa `closed` e `cancelled`; as demais abas sao exatas. */
export function statusMatchesFilter(
  status: ServiceRequestStatus,
  filter: RequestStatusFilter,
): boolean {
  if (filter === "all") return true
  if (filter === "closed") return status === "closed" || status === "cancelled"
  return status === filter
}

export function isClosedStatus(status: ServiceRequestStatus): boolean {
  return status === "closed" || status === "cancelled"
}

/**
 * O objeto do pedido nao tem coluna de titulo (ADR D1: descricao, quando,
 * categoria). O titulo da prancha 17 e a primeira linha do que a pessoa
 * escreveu — nunca inventado de outro campo.
 */
export function requestTitle(description: string, fallback: string): string {
  const firstLine = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0)
  if (!firstLine) return fallback
  return firstLine.length > 72 ? `${firstLine.slice(0, 71).trimEnd()}…` : firstLine
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

/** "6 set." — sem ano, como na linha de metadados da prancha. */
export function formatRequestDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export function formatSentLine(iso: string): string {
  const day = formatRequestDate(iso)
  return day ? `Enviado em ${day}` : ""
}

export function formatUpdatedLine(iso: string): string {
  const day = formatRequestDate(iso)
  return day ? `Atualizado em ${day}` : ""
}

export type TrackingMessage = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

/** Nao lida = mensagem do outro participante posterior a ultima leitura. */
export function isUnread(
  message: Pick<TrackingMessage, "sender_id" | "created_at">,
  viewerId: string,
  lastReadAt: string | null,
): boolean {
  if (message.sender_id === viewerId) return false
  if (!lastReadAt) return true
  const seen = new Date(lastReadAt).getTime()
  const created = new Date(message.created_at).getTime()
  if (Number.isNaN(seen) || Number.isNaN(created)) return true
  return created > seen
}

export function countUnread(
  messages: Pick<TrackingMessage, "sender_id" | "created_at">[],
  viewerId: string,
  lastReadAt: string | null,
): number {
  return messages.filter((message) => isUnread(message, viewerId, lastReadAt)).length
}

export function validateMessageContent(value: string): FieldValidation {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { ok: false, field: "message", message: "Escreva uma mensagem." }
  }
  if (trimmed.length > REQUEST_MESSAGE_MAX) {
    return {
      ok: false,
      field: "message",
      message: `A mensagem passa de ${REQUEST_MESSAGE_MAX} caracteres.`,
    }
  }
  return { ok: true }
}

export function validateEditDescription(value: string): FieldValidation {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { ok: false, field: "description", message: "Descreva o que voce precisa." }
  }
  if (trimmed.length > SERVICE_REQUEST_DESCRIPTION_MAX) {
    return {
      ok: false,
      field: "description",
      message: `A descricao passa de ${SERVICE_REQUEST_DESCRIPTION_MAX} caracteres.`,
    }
  }
  return { ok: true }
}
