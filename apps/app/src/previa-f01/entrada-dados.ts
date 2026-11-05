import type { NomeDoSelo } from "@/src/pecas/pecas"
import type { IdDaEtapa, Via } from "./fluxo"

/**
 * Dados e tipos que as etapas compartilhadas usam sem falar com o servidor.
 *
 * A prévia de design passa seu conteúdo simulado por `DadosDaPrevia`; o caminho
 * real não importa nada do módulo da prévia — a lista de assuntos é
 * configuração de produto e o resto vem das rotas `/api/app/entry/*`.
 */

export type EventoDoFunil = {
  /** Número de ordem do evento na sessão. */
  seq: number
  acao: "vista" | "concluida" | "voltou" | "erro" | "pulou"
  etapa: IdDaEtapa
  versao: number
  via: Via | null
  /** Milissegundos desde que a etapa apareceu (só em "concluida"). */
  ms?: number
  /** Código fechado do motivo (só em "erro"), nunca texto livre. */
  motivo?: "codigo-invalido" | "cpf-invalido" | "email-invalido" | "documento-invalido"
}

/** Os assuntos da etapa de interesses: produto, não dado de servidor. */
export const INTERESSES: readonly string[] = [
  "Escola e creche",
  "Saúde",
  "Mudança",
  "Imóveis",
  "Desapegos",
  "Pets",
  "Esporte",
  "Cônjuges",
  "Filhos pequenos",
  "Trabalho e renda",
  "Passeios",
  "Serviços da casa",
]

export type PerguntaDaPrevia = Readonly<{ texto: string; respostas: number }>

export type CidadeDaPrevia = Readonly<{
  nome: string
  uf: string
  /** A cidade já tem gente bastante para mostrar conteúdo. */
  comGente: boolean
  perguntas: readonly PerguntaDaPrevia[]
  encontro: { titulo: string; quando: string } | null
}>

export type SugestaoDaPrevia = Readonly<{
  id: string
  nome: string
  membros: number
  selo: NomeDoSelo
  motivo: string
}>

/** O que a prévia de design injeta nas etapas; o caminho real não passa nada. */
export type DadosDaPrevia = Readonly<{
  cidades: readonly { valor: string; rotulo: string }[]
  cidade: CidadeDaPrevia | null
  sugestoes: readonly SugestaoDaPrevia[]
}>
