import type { GrupoReal } from "@/lib/dados/grupos"

/**
 * Modo Pergunta do compositor do grupo (RUN-178): a pergunta feita num grupo
 * Aberto também aparece nas Indicações da cidade, com o nome do grupo
 * (ADR-20261024 §1). As réguas do texto são as mesmas que o banco cobra —
 * título de 8 a 300 caracteres e assunto de até 60 (20261024110000).
 */

export const MINIMO_DO_TITULO = 8
export const LIMITE_DO_TITULO = 300
export const LIMITE_DO_ASSUNTO = 60

/** A copy prometida desde o protótipo (ADR-20261023 §4). */
export const AVISO_DA_CIDADE = "Sua pergunta aparecerá na cidade com o nome do grupo."

/** Só grupo Aberto oferece a opção; o banco veta a escrita de qualquer jeito. */
export function podePerguntar(grupo: Pick<GrupoReal, "fechado">): boolean {
  return !grupo.fechado
}

export type TextoDaPergunta = Readonly<{ titulo: string; assunto: string }>

export function errosDaPerguntaDoGrupo(texto: TextoDaPergunta): Readonly<{
  titulo?: string
  assunto?: string
}> {
  const titulo = texto.titulo.trim()
  const erros: { titulo?: string; assunto?: string } = {}
  if (titulo.length < MINIMO_DO_TITULO) {
    erros.titulo = `Escreva a pergunta com pelo menos ${MINIMO_DO_TITULO} caracteres.`
  } else if (titulo.length > LIMITE_DO_TITULO) {
    erros.titulo = `Sua pergunta tem ${titulo.length} caracteres; o limite é ${LIMITE_DO_TITULO}.`
  }
  if (texto.assunto.trim().length > LIMITE_DO_ASSUNTO) {
    erros.assunto = `O assunto tem ${texto.assunto.trim().length} caracteres; o limite é ${LIMITE_DO_ASSUNTO}.`
  }
  return erros
}

export function perguntaValida(texto: TextoDaPergunta): boolean {
  return Object.keys(errosDaPerguntaDoGrupo(texto)).length === 0
}

/**
 * O corpo do POST leva só o texto. Autor, cidade e grupo NUNCA saem daqui: o
 * servidor os deriva do grupo.
 */
export function corpoDaPergunta(texto: TextoDaPergunta): TextoDaPergunta {
  return { titulo: texto.titulo.trim(), assunto: texto.assunto.trim() }
}
