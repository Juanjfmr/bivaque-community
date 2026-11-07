import { FalhaDaApi, ler } from "../api/cliente"

/**
 * A porta do Início e da Busca (ADR-20261105 §2): fala só com `/api/app/inicio`
 * e `/api/app/busca`. Campo obrigatório torto é falha de serviço, nunca lista
 * vazia; campo que o banco não tem (imagem, autor) fica de fora, não inventado.
 */

export type PerguntaDoInicio = Readonly<{
  id: string
  title: string
  respostas: number
  resolvida: boolean
  grupo: string | null
}>
export type EventoDoInicio = Readonly<{
  id: string
  title: string
  local: string | null
  comecaEm: string | null
}>
export type AnuncioDoInicio = Readonly<{
  id: string
  title: string
  tipo: string
  precoCentavos: number | null
  bairro: string | null
}>
export type NegocioDoInicio = Readonly<{ id: string; nome: string; categoria: string }>
export type GrupoDoInicio = Readonly<{ id: string; nome: string; membros: number }>
export type ItemDoInicio = Readonly<{ id: string; title: string; detalhe: string | null }>

export type InicioDaCidade = Readonly<{
  cidade: string
  perguntas: PerguntaDoInicio[]
  eventos: EventoDoInicio[]
  anuncios: AnuncioDoInicio[]
  negocios: NegocioDoInicio[]
  grupos: GrupoDoInicio[]
  proximo: number | null
}>
export type BuscaDaCidade = Readonly<{
  cidade: string
  perguntas: PerguntaDoInicio[]
  grupos: GrupoDoInicio[]
  anuncios: AnuncioDoInicio[]
  negocios: NegocioDoInicio[]
  guia: ItemDoInicio[]
}>

type Linha = Record<string, unknown>

function invalido(): never {
  throw new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}

function exigirTexto(linha: Linha, chave: string): string {
  const valor = linha[chave]
  return typeof valor === "string" ? valor : invalido()
}

function textoOuNulo(linha: Linha, chave: string): string | null {
  const valor = linha[chave]
  return typeof valor === "string" && valor !== "" ? valor : null
}

function numeroOuNulo(linha: Linha, chave: string): number | null {
  const valor = linha[chave]
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null
}

function lista<T>(corpo: Linha, chave: string, mapear: (linha: Linha) => T): T[] {
  const valor = corpo[chave]
  if (!Array.isArray(valor)) return invalido()
  return valor.map((item: unknown) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return invalido()
    return mapear(item as Linha)
  })
}

const pergunta = (l: Linha): PerguntaDoInicio => ({
  id: exigirTexto(l, "id"),
  title: exigirTexto(l, "title"),
  respostas: numeroOuNulo(l, "reply_count") ?? 0,
  resolvida: l["is_resolved"] === true,
  grupo: textoOuNulo(l, "group_name"),
})
const evento = (l: Linha): EventoDoInicio => ({
  id: exigirTexto(l, "id"),
  title: exigirTexto(l, "title"),
  local: textoOuNulo(l, "venue"),
  comecaEm: textoOuNulo(l, "starts_at"),
})
const anuncio = (l: Linha): AnuncioDoInicio => ({
  id: exigirTexto(l, "id"),
  title: exigirTexto(l, "title"),
  tipo: textoOuNulo(l, "kind") ?? "",
  precoCentavos: numeroOuNulo(l, "price_cents"),
  bairro: textoOuNulo(l, "neighborhood"),
})
const negocio = (l: Linha): NegocioDoInicio => ({
  id: exigirTexto(l, "id"),
  nome: exigirTexto(l, "display_name"),
  categoria: textoOuNulo(l, "category") ?? "",
})
const grupo = (l: Linha): GrupoDoInicio => ({
  id: exigirTexto(l, "id"),
  nome: exigirTexto(l, "name"),
  membros: numeroOuNulo(l, "members") ?? 0,
})
const guia = (l: Linha): ItemDoInicio => ({
  id: exigirTexto(l, "id"),
  title: exigirTexto(l, "name"),
  detalhe: textoOuNulo(l, "description"),
})

function cidade(corpo: Linha): string {
  const nome = corpo["cidade"]
  return typeof nome === "string" && nome !== "" ? nome : invalido()
}

export async function lerInicio(
  opcoes: { signal?: AbortSignal; pagina?: number } = {},
): Promise<InicioDaCidade> {
  const sufixo = opcoes.pagina === undefined ? "" : `?pagina=${opcoes.pagina}`
  const corpo = await ler(`/api/app/inicio${sufixo}`, opcoes)
  const proximo = corpo["proximo"]
  if (proximo !== null && (typeof proximo !== "number" || !Number.isInteger(proximo)))
    return invalido()
  return {
    cidade: cidade(corpo),
    perguntas: lista(corpo, "perguntas", pergunta),
    eventos: lista(corpo, "eventos", evento),
    anuncios: lista(corpo, "anuncios", anuncio),
    negocios: lista(corpo, "negocios", negocio),
    grupos: lista(corpo, "grupos", grupo),
    proximo,
  }
}

export async function buscarNaCidade(
  termo: string,
  opcoes: { signal?: AbortSignal; topico?: string | undefined } = {},
): Promise<BuscaDaCidade> {
  const sufixo =
    opcoes.topico === undefined || opcoes.topico === ""
      ? ""
      : `&topico=${encodeURIComponent(opcoes.topico)}`
  const corpo = await ler(`/api/app/busca?q=${encodeURIComponent(termo)}${sufixo}`, opcoes)
  return {
    cidade: cidade(corpo),
    perguntas: lista(corpo, "perguntas", pergunta),
    grupos: lista(corpo, "grupos", grupo),
    anuncios: lista(corpo, "anuncios", anuncio),
    negocios: lista(corpo, "negocios", negocio),
    guia: lista(corpo, "guia", guia),
  }
}
