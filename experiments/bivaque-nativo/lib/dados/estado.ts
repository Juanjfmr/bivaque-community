// Estado de demonstração da sessão: o que a pessoa publica e conversa fica em memória,
// sobre os dados iniciais. Nada é enviado a servidor.
import { useSyncExternalStore } from "react"
import { ANUNCIOS, CONVERSAS, foto, PERFIL, POSTS } from "./index"
import type { Anuncio, CategoriaAnuncio, Conversa, Mensagem, Post, TipoPost } from "./tipos"

interface Estado {
  posts: Post[]
  anuncios: Anuncio[]
  conversas: Conversa[]
  /** Útil marcado por publicação. */
  uteis: Record<string, boolean>
}

let estado: Estado = {
  posts: [...POSTS],
  anuncios: [...ANUNCIOS],
  conversas: [...CONVERSAS],
  uteis: {},
}

const ouvintes = new Set<() => void>()
let sequencia = 0

function proximoId(prefixo: string): string {
  sequencia += 1
  return `${prefixo}-sessao-${sequencia}`
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

function atualizar(mudanca: Partial<Estado>): void {
  estado = { ...estado, ...mudanca }
  for (const ouvinte of ouvintes) ouvinte()
}

function useEstado<T>(selecionar: (atual: Estado) => T): T {
  return useSyncExternalStore(
    assinar,
    () => selecionar(estado),
    () => selecionar(estado),
  )
}

export function usePosts(): Post[] {
  return useEstado((atual) => atual.posts)
}

export function useAnuncios(): Anuncio[] {
  return useEstado((atual) => atual.anuncios)
}

export function useConversas(): Conversa[] {
  return useEstado((atual) => atual.conversas)
}

export function usePost(id: string): Post | undefined {
  return useEstado((atual) => atual.posts.find((post) => post.id === id))
}

export function useAnuncio(id: string): Anuncio | undefined {
  return useEstado((atual) => atual.anuncios.find((anuncio) => anuncio.id === id))
}

export function useConversa(id: string): Conversa | undefined {
  return useEstado((atual) => atual.conversas.find((conversa) => conversa.id === id))
}

export function useUtil(postId: string): boolean {
  return useEstado((atual) => atual.uteis[postId] === true)
}

export function publicarPost(entrada: {
  texto: string
  tipo: TipoPost
  grupoId?: string
}): Post {
  const post: Post = {
    id: proximoId("po"),
    autorId: PERFIL.id,
    bairro: PERFIL.bairro,
    tempo: "agora",
    texto: entrada.texto,
    uteis: 0,
    comentarios: 0,
    tipo: entrada.tipo,
    grupoId: entrada.grupoId,
  }
  atualizar({ posts: [post, ...estado.posts] })
  return post
}

export function publicarAnuncio(entrada: {
  titulo: string
  preco: number
  descricao: string
  categoria: CategoriaAnuncio
}): Anuncio {
  const id = proximoId("an")
  const anuncio: Anuncio = {
    id,
    titulo: entrada.titulo,
    preco: entrada.preco,
    categoria: entrada.categoria,
    bairro: PERFIL.bairro,
    descricao: entrada.descricao,
    foto: foto(id),
    vendedorId: PERFIL.id,
  }
  atualizar({ anuncios: [anuncio, ...estado.anuncios] })
  return anuncio
}

/** A conversa entre a pessoa e aquele vendedor sobre aquele anúncio; cria se não existir. */
export function abrirOuCriarConversa(anuncio: Anuncio): string {
  const existente = estado.conversas.find(
    (conversa) => conversa.anuncioId === anuncio.id && conversa.pessoaId === anuncio.vendedorId,
  )
  if (existente) return existente.id

  const conversa: Conversa = {
    id: proximoId("co"),
    pessoaId: anuncio.vendedorId,
    naoLidas: 0,
    anuncioId: anuncio.id,
    mensagens: [
      {
        id: proximoId("m"),
        deMim: true,
        texto: `Oi! Tenho interesse em "${anuncio.titulo}".`,
        hora: "agora",
      },
    ],
  }
  atualizar({ conversas: [conversa, ...estado.conversas] })
  return conversa.id
}

export function enviarMensagem(conversaId: string, texto: string): void {
  const limpo = texto.trim()
  if (limpo.length === 0) return

  const mensagem: Mensagem = { id: proximoId("m"), deMim: true, texto: limpo, hora: "agora" }
  atualizar({
    conversas: estado.conversas.map((conversa) =>
      conversa.id === conversaId
        ? { ...conversa, mensagens: [...conversa.mensagens, mensagem] }
        : conversa,
    ),
  })
}

export function alternarUtil(postId: string): void {
  atualizar({ uteis: { ...estado.uteis, [postId]: !estado.uteis[postId] } })
}
