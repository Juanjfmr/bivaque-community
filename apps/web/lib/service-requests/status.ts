// RECON-024 — a situação do pedido é um objeto, não a última mensagem.
// ADR-20260909-pedidos-e-conversa-contextual D1: as abas Novos / Em conversa /
// Encerrados leem esta coluna. Funções puras para serem provadas em unidade,
// sem banco.

export const SERVICE_REQUEST_STATUSES = ["open", "in_conversation", "closed", "cancelled"] as const

export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number]

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  open: "Novo",
  in_conversation: "Em conversa",
  closed: "Encerrado",
  cancelled: "Cancelado",
}

export const QUEUE_TAB_IDS = ["novos", "em_conversa", "encerrados"] as const
export type QueueTabId = (typeof QUEUE_TAB_IDS)[number]

export const QUEUE_TABS: ReadonlyArray<{ id: QueueTabId; label: string }> = [
  { id: "novos", label: "Novos" },
  { id: "em_conversa", label: "Em conversa" },
  { id: "encerrados", label: "Encerrados" },
]

// A aba é derivada da situação. `cancelled` é um estado terminal do lado do
// solicitante e aparece junto dos encerrados, sem inventar uma quarta aba que
// a prancha 23 não desenha.
export function tabForStatus(status: ServiceRequestStatus): QueueTabId {
  if (status === "open") return "novos"
  if (status === "in_conversation") return "em_conversa"
  return "encerrados"
}

export function statusInTab(status: ServiceRequestStatus, tab: QueueTabId): boolean {
  return tabForStatus(status) === tab
}

// O pedido não tem campo de título próprio: o formulário do RECON-022 descreve
// a necessidade num único campo. O painel exibe a primeira linha como título e
// o restante como corpo — apresentação sobre o campo real, sem inventar coluna.
export function requestTitle(description: string, maxLength = 72): string {
  const firstLine = description.split(/\r?\n/).find((line) => line.trim().length > 0) ?? description
  const clean = firstLine.trim().replace(/\s+/g, " ")
  if (clean.length <= maxLength) return clean
  const cut = clean.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export function requestBody(description: string): string {
  const lines = description.split(/\r?\n/)
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
  if (firstContentIndex < 0) return ""
  return lines
    .slice(firstContentIndex + 1)
    .join("\n")
    .trim()
}

// "Recebido há 20min". Recebe `now` por parâmetro para o teste ser determinístico.
export function formatReceived(createdAtIso: string, now: Date = new Date()): string {
  const created = new Date(createdAtIso)
  const diffMs = now.getTime() - created.getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return "agora mesmo"
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "agora mesmo"
  if (minutes < 60) return `há ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days}d`
  const months = Math.floor(days / 30)
  return `há ${months} ${months === 1 ? "mês" : "meses"}`
}
