import { FalhaDaApi } from "@/lib/api/cliente"
import type { DadosDoNovoGrupo } from "@/lib/dados/grupos"

/**
 * A régua do formulário de criar grupo no app.
 *
 * Ela repete os limites do servidor (`apps/web/lib/grupos/criacao.ts`) porque o
 * app é outro pacote e não importa código do servidor para o bundle. Quem manda
 * é o servidor: aqui só se evita mandar o que já se sabe que volta 400.
 */
export const LIMITES_DO_GRUPO = {
  nome: 80,
  descricao: 500,
  regras: 600,
} as const

/** O nome precisa de pelo menos 3 letras, como na tela antiga. */
export const NOME_MIN = 3

export type RascunhoDoGrupo = Readonly<{
  nome: string
  descricao: string
  regras: string
  fechado: boolean
}>

export type CampoDoGrupo = "nome" | "descricao" | "regras"

/** Cada erro fica no campo que o originou, nunca só no rodapé. */
export type ErrosDoGrupo = Readonly<Partial<Record<CampoDoGrupo, string>>>

/** Os erros por campo; vazio quando dá para enviar. */
export function errosDoGrupo(entrada: RascunhoDoGrupo): ErrosDoGrupo {
  const erros: Partial<Record<CampoDoGrupo, string>> = {}
  const nome = entrada.nome.trim()
  if (nome.length < NOME_MIN) erros.nome = "Dê um nome ao grupo, com pelo menos 3 letras."
  else if (nome.length > LIMITES_DO_GRUPO.nome) {
    erros.nome = `O nome do grupo pode ter no máximo ${LIMITES_DO_GRUPO.nome} caracteres.`
  }
  if (entrada.descricao.trim().length > LIMITES_DO_GRUPO.descricao) {
    erros.descricao = `A descrição pode ter no máximo ${LIMITES_DO_GRUPO.descricao} caracteres.`
  }
  if (entrada.regras.trim().length > LIMITES_DO_GRUPO.regras) {
    erros.regras = `As regras podem ter no máximo ${LIMITES_DO_GRUPO.regras} caracteres.`
  }
  return erros
}

/** `true` quando os obrigatórios estão certos: é o que habilita a ação primária. */
export function grupoValido(entrada: RascunhoDoGrupo): boolean {
  return Object.keys(errosDoGrupo(entrada)).length === 0
}

/** O corpo enviado: sem espaço sobrando. */
export function corpoDoGrupo(entrada: RascunhoDoGrupo): DadosDoNovoGrupo {
  return {
    nome: entrada.nome.trim(),
    descricao: entrada.descricao.trim(),
    regras: entrada.regras.trim(),
    fechado: entrada.fechado,
  }
}

/**
 * O que a pessoa lê quando a criação falha. A frase do SERVIDOR vem primeiro —
 * é a única que sabe o motivo exato ("já existe um grupo com esse nome", "sua
 * conta não pode criar grupos nesta cidade") —, e só no fim a frase padrão.
 */
export function mensagemDaCriacao(falha: unknown): string {
  if (!(falha instanceof FalhaDaApi)) return "Não foi possível criar o grupo. Tente de novo."
  if (falha.codigo === "sem-sessao") return "Sua sessão expirou. Entre de novo para continuar."
  if (falha.codigo === "limite") return "Muitas tentativas seguidas. Espere um pouco."
  if (falha.motivoDoServidor === "sem-cidade") {
    return "Escolha a sua cidade antes de criar um grupo."
  }
  if (falha.mensagem !== null) return falha.mensagem
  if (falha.codigo === "recusado") {
    return "Sua conta não pode criar grupos nesta cidade."
  }
  return "Não foi possível criar o grupo. Tente de novo."
}

/** A chamada foi cancelada porque a folha fechou: não é falha para mostrar. */
export function foiAbortada(falha: unknown): boolean {
  return falha instanceof DOMException && falha.name === "AbortError"
}
