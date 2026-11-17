import type { ImageSourcePropType } from "react-native"

// Dados de demonstração sintéticos do app nativo de teste. Nenhum dado real.

export interface Pessoa {
  id: string
  nome: string
  bairro: string
}

export type TipoPost = "pergunta" | "publicacao"

export interface Post {
  id: string
  autorId: string
  bairro: string
  tempo: string
  texto: string
  uteis: number
  comentarios: number
  tipo: TipoPost
  /** Grupo em que a publicação aparece; ausente no feed da cidade. */
  grupoId?: string
}

export interface Resposta {
  id: string
  postId: string
  autorId: string
  tempo: string
  texto: string
}

export interface Grupo {
  id: string
  nome: string
  descricao: string
  membros: number
  bairro: string
  capa: ImageSourcePropType
}

export type CategoriaAnuncio = "desapego" | "imovel"

export interface Anuncio {
  id: string
  titulo: string
  /** Em reais; 0 significa que está sendo doado. */
  preco: number
  categoria: CategoriaAnuncio
  bairro: string
  descricao: string
  /** Ausente no anúncio publicado na sessão: a demonstração não envia foto. */
  foto?: ImageSourcePropType
  vendedorId: string
}

export interface Mensagem {
  id: string
  deMim: boolean
  texto: string
  hora: string
}

export interface Conversa {
  id: string
  pessoaId: string
  naoLidas: number
  mensagens: Mensagem[]
  /** Anúncio que originou a conversa; aparece no topo dela. */
  anuncioId?: string
}

export interface Evento {
  id: string
  titulo: string
  quando: string
  local: string
  participantes: number
  capa: ImageSourcePropType
}
