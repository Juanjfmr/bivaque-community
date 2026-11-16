import { FalhaDaApi } from "@/lib/api/cliente"

export function validarPedido(descricao: string, quando: string, cep = ""): string | null {
  if (descricao.trim() === "") return "Descreva o que você precisa."
  if (descricao.trim().length > 500) return "A descrição passa de 500 caracteres."
  if (quando.trim().length > 120) return "O prazo desejado passa de 120 caracteres."
  // O CEP é opcional (LOC-IMPL L2): vazio passa, preenchido tem que ter os oito
  // dígitos. Mesma régua do servidor (`validateRequestCep`), sem minlength nativo.
  const digitos = cep.replace(/\D/g, "")
  if (digitos.length !== 0 && digitos.length !== 8) return "Informe os oito dígitos do CEP."
  return null
}

/**
 * A distância como o servidor a calcula: metros arredondados à centena, do ponto
 * de vista de quem lê. "3,1 km" — nunca mais preciso do que o dado é.
 */
export function textoDaDistancia(metros: number): string {
  return `${(metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`
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

/** Cancelar/encerrar: o estado decidido no banco é a verdade, e a frase diz isso. */
export function mensagemDaAcao(falha: unknown): string {
  if (falha instanceof FalhaDaApi) {
    if (falha.mensagem !== null) return falha.mensagem
    if (falha.codigo === "sem-sessao") return "Entre de novo para continuar."
    if (falha.codigo === "conflito") return "Este pedido já mudou de situação. Recarregue a tela."
    if (falha.codigo === "recusado") return "Só quem participa do pedido pode fazer isso."
  }
  return "Não foi possível concluir agora. Tente novamente."
}

/** A ficha e o catálogo do Meu negócio (mesmos limites da validação do servidor). */
export function validarFicha(nome: string, categoria: string, descricao: string): string | null {
  if (nome.trim().length < 2 || nome.trim().length > 80)
    return "O nome do negócio precisa ter entre 2 e 80 caracteres."
  if (categoria === "") return "Escolha uma categoria."
  if (descricao.trim().length > 800) return "A descrição passa de 800 caracteres."
  return null
}

export function validarServico(titulo: string, descricao: string): string | null {
  if (titulo.trim().length < 2 || titulo.trim().length > 120)
    return "O título precisa ter entre 2 e 120 caracteres."
  if (descricao.trim().length > 600) return "A descrição passa de 600 caracteres."
  return null
}

export function mensagemDaFicha(falha: unknown): string {
  if (falha instanceof FalhaDaApi) {
    if (falha.mensagem !== null) return falha.mensagem
    if (falha.codigo === "sem-sessao") return "Entre de novo para gerenciar seu negócio."
    if (falha.codigo === "conflito") return "Sua página de negócio já existe."
  }
  return "Não foi possível salvar agora. Seus dados continuam preenchidos; tente novamente."
}

export const SITUACOES_DO_PEDIDO = {
  open: "Em aberto",
  in_conversation: "Em conversa",
  closed: "Encerrado",
  cancelled: "Cancelado",
} as const
