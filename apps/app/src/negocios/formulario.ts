import { FalhaDaApi } from "@/lib/api/cliente"

export function validarPedido(descricao: string, quando: string): string | null {
  if (descricao.trim() === "") return "Descreva o que você precisa."
  if (descricao.trim().length > 500) return "A descrição passa de 500 caracteres."
  if (quando.trim().length > 120) return "O prazo desejado passa de 120 caracteres."
  return null
}

export function mensagemDoPedido(falha: unknown): string {
  if (falha instanceof FalhaDaApi) {
    if (falha.mensagem !== null) return falha.mensagem
    if (falha.codigo === "sem-sessao") return "Entre de novo para enviar seu pedido."
    if (falha.codigo === "recusado") return "Sua conta não pode enviar um pedido a este negócio."
    if (falha.codigo === "nao-encontrado") return "Este negócio não está mais disponível."
  }
  return "Não foi possível confirmar o pedido agora. Seu texto continua aqui — tente novamente."
}

export const SITUACOES_DO_PEDIDO = {
  open: "Em aberto",
  in_conversation: "Em conversa",
  closed: "Encerrado",
  cancelled: "Cancelado",
} as const
