// RECON-015: modelo de entrega da linha de conversa e formatacao de tempo da
// prancha 15. "sending" = ainda nao ha confirmacao do servidor; "sent" = o
// insert foi confirmado; "failed" = o servidor recusou e o texto continua na
// tela com nova tentativa. O schema de dm_messages (20260802001500) nao tem
// entrega, leitura ou presenca — a tela nao inventa tique de "lido" nem "online".

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export type DeliveryStatus = "sending" | "sent" | "failed"

export type ThreadMessage = MessageRow & {
  status: DeliveryStatus
  failure: string | null
}

// Tempo relativo no eixo da prancha 15 ("há 2 h"). Sem data absoluta
// resolvida (registro corrompido), retorna vazio em vez de "Invalid Date".
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const minutes = Math.floor((Date.now() - then) / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "ontem"
  if (days < 7) return `há ${days} dias`
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

// Rotulo de falha para a pessoa: a mensagem fica visivel como nao enviada com
// o motivo em linguagem clara. O erro cru do servidor nao vai para a tela.
export function sendFailureLabel(message: string | undefined): string {
  if (message?.includes("blocked")) {
    return "Não é possível enviar: conversa bloqueada ou não autorizada."
  }
  if (message?.includes("pii")) {
    return "Mensagem bloqueada: não compartilhe dados pessoais."
  }
  return "Não foi possível enviar. Verifique sua conexão e tente novamente."
}
