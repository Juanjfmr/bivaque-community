import { FalhaDaApi } from "@/lib/api/cliente"
import type { CategoriaDoGuia } from "@/lib/dados/guia"
import type { NomeDeIcone } from "@/lib/icones"

/**
 * O que a jornada do Guia repete em mais de uma tela: o rótulo e o ícone da
 * categoria (o enum do banco), a frase de cada falha e os limites que evitam
 * mandar para o servidor o que já se sabe que volta 400.
 */

export const ROTULO_DA_CATEGORIA: Readonly<Record<CategoriaDoGuia, string>> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

export const ICONE_DA_CATEGORIA: Readonly<Record<CategoriaDoGuia, NomeDeIcone>> = {
  school: "school",
  hospital: "volunteer_activism",
  transporter: "local_shipping",
  courier: "request_quote",
}

export const LIMITE_DA_DESCRICAO = 2000
export const LIMITE_DA_REFERENCIA = 500

/** A frase para a pessoa, ou `null` quando dá para enviar. */
export function validarSugestao(descricao: string, referencia: string): string | null {
  if (descricao.trim() === "") return "Escreva o que precisa mudar neste verbete."
  if (descricao.trim().length > LIMITE_DA_DESCRICAO) {
    return `A sugestão pode ter no máximo ${LIMITE_DA_DESCRICAO} caracteres.`
  }
  if (referencia.trim().length > LIMITE_DA_REFERENCIA) {
    return `A referência pode ter no máximo ${LIMITE_DA_REFERENCIA} caracteres.`
  }
  return null
}

export function sessaoVencida(falha: unknown): boolean {
  return falha instanceof FalhaDaApi && falha.codigo === "sem-sessao"
}

export function acessoNegado(falha: unknown): boolean {
  return falha instanceof FalhaDaApi && falha.codigo === "recusado"
}

export function foiAbortada(falha: unknown): boolean {
  return falha instanceof DOMException && falha.name === "AbortError"
}

/** O motivo do servidor vem primeiro; a frase da ação é o último recurso. */
export function mensagemDaFalha(falha: unknown, padrao: string): string {
  if (!(falha instanceof FalhaDaApi)) return padrao
  if (falha.codigo === "sem-sessao") return "Sua sessão expirou. Entre de novo para continuar."
  if (falha.motivoDoServidor === "sem-artigo") {
    return "Esta referência ainda não tem ficha publicada para atualizar."
  }
  if (falha.mensagem !== null) return falha.mensagem
  if (falha.codigo === "nao-encontrado") return "Esta referência não está mais disponível."
  return padrao
}
