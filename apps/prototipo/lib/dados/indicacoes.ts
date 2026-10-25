// PROTO-001 — a interface das Indicações.
//
// As telas falam só com este arquivo. Hoje quem responde é a demonstração, em
// memória (`lib/demo/dados.ts`); quando o protótipo virar o app, troca-se a
// fonte por uma que chama o banco e nenhuma tela muda.
//
// O formato é o que o banco devolve: as colunas de `list_indications` e de
// `list_question_replies` (`supabase/database.generated.ts`) aparecem com os
// mesmos nomes. O que a tela precisa e o RPC não devolve — quem perguntou, se a
// pergunta é de quem lê, se a resposta foi útil — vem ao lado, marcado como
// EXCEÇÃO, porque a implementação real precisa juntar o perfil público e o
// estado de quem lê, que o RPC não devolve.

import { criarFonteDeDemonstracao } from "../demo/dados"

export type Categoria =
  | "servicos_locais"
  | "saude_bem_estar"
  | "educacao"
  | "esporte_lazer"
  | "alimentacao"
  | "transporte"
  | "moradia"
  | "outros"

// Os filtros dos chips da Comunidade. Espelham o tri-estado de `p_mine` /
// `p_resolved` de `list_indications`: "para ajudar" é o pedido de outra pessoa
// sem resposta (`p_mine = false`, `p_resolved = false`).
export type FiltroDeIndicacoes = "para-ajudar" | "resolvidas" | "minhas"

export type Autoria = {
  id: string
  nome: string
  iniciais: string
}

export type Indicacao = {
  // colunas de public.list_indications
  id: string
  title: string
  body: string
  category: Categoria
  created_at: string
  is_resolved: boolean
  group_id: string | null
  group_name: string | null
  reply_count: number
  resolved_reply_body: string | null
  matched_reply_body: string | null
  // fora do RPC: quem perguntou e onde, e o estado pessoal de quem lê
  autor: Autoria
  bairro: string | null
  minha: boolean
  seguindo: boolean
}

export type Resposta = {
  // colunas de public.list_question_replies
  id: string
  author_id: string
  body: string
  created_at: string
  edited_at: string | null
  is_removed: boolean
  // fora do RPC: exibição e interação da resposta
  autor: Autoria
  minha: boolean
  // "Útil" conta e marca quem já marcou. A resposta que resolveu é derivada de
  // `recommendation_requests.resolved_reply_id`.
  util: number
  marcada_util: boolean
  ajudou: boolean
}

export type PaginaDeIndicacoes = {
  itens: Indicacao[]
  total: number
  resolvidas: number
}

export type PedidoDeListagem = {
  cidade: string
  filtro: FiltroDeIndicacoes
  limite: number
  deslocamento: number
}

export type NovaIndicacao = {
  titulo: string
  corpo: string
  bairro: string | null
}

export interface FonteDeIndicacoes {
  listar(pedido: PedidoDeListagem): Promise<PaginaDeIndicacoes>
  obter(id: string): Promise<Indicacao | null>
  respostas(indicacaoId: string): Promise<Resposta[]>
  publicar(entrada: NovaIndicacao): Promise<Indicacao>
  responder(indicacaoId: string, corpo: string): Promise<Resposta>
  marcarUtil(respostaId: string): Promise<void>
  resolver(indicacaoId: string, respostaId: string): Promise<void>
  reabrir(indicacaoId: string): Promise<void>
  definirSeguindo(indicacaoId: string, seguindo: boolean): Promise<void>
  minhas(cidade: string): Promise<Indicacao[]>
  parecidas(texto: string, cidade: string): Promise<Indicacao[]>
}

// A única linha que muda quando o banco entrar. A fonte vive no módulo para o
// que foi publicado em memória sobreviver à navegação entre as telas.
let fonte: FonteDeIndicacoes | null = null

export function fonteDeIndicacoes(): FonteDeIndicacoes {
  fonte ??= criarFonteDeDemonstracao()
  return fonte
}
