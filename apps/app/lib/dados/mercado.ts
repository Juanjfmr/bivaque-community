import { enviar, FalhaDaApi, ler } from "../api/cliente"

/**
 * A porta do Mercado (LAN-F06, no molde da porta de eventos / ADR-20261105 §2):
 * fala só com `/api/app/mercado` e traduz o corpo para o que a tela desenha.
 *
 * Regra do molde: um campo obrigatório que chega torto é FALHA de serviço, nunca
 * lista vazia nem item silencioso. Renderizar resposta quebrada como "nada
 * anunciado" é o bug que o `apps/app/AGENTS.md` chama pelo nome.
 *
 * Este módulo não conhece a demonstração: nada de `@/lib/dados` (índice) aqui.
 */

export type AnuncioTipo = "item" | "property"

export type AnuncioDaLista = Readonly<{
  id: string
  tipo: AnuncioTipo
  titulo: string
  descricao: string | null
  precoCents: number | null
  deal: string | null
  bairro: string | null
  cidade: string | null
  status: string
  condicao: string | null
  categoria: string | null
  quartos: number | null
  tipoImovel: string | null
  areaM2: number | null
  condoFeeCents: number | null
  /** URL assinada pronta, ou null quando o anúncio não tem foto. */
  foto: string | null
  criadoEm: string | null
}>

export type AnuncioDetalhado = Readonly<
  AnuncioDaLista & {
    /** Só existe para o nível que o anunciante escolheu — a tela nunca mostra. */
    endereco: string | null
    donoId: string
    donoNome: string | null
    fotos: readonly string[]
    meu: boolean
    salvo: boolean
  }
>

/** O que a tela pede. `tipo` é obrigatório; os filtros de imóvel não valem para item. */
export type FiltrosDoMercado = Readonly<{
  tipo: AnuncioTipo
  ordem?: "recent" | "price_asc" | "price_desc"
  quartos?: number
  valorMax?: number
  tipoImovel?: string
  depois?: string
}>

export type ListaDoMercado = Readonly<{
  anuncios: readonly AnuncioDaLista[]
  /** Cursor opaco da próxima página: a tela só devolve o que recebeu. */
  proximo: string | null
  cidade: string | null
}>

type Corpo = Record<string, unknown>

function foraDoContrato(): FalhaDaApi {
  return new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor !== "" ? valor : null
}

function exigirTexto(corpo: Corpo, chave: string): string {
  const valor = texto(corpo[chave])
  if (valor === null) throw foraDoContrato()
  return valor
}

function exigirRegistro(valor: unknown): Corpo {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) throw foraDoContrato()
  return valor as Corpo
}

/** Ausência é null (campo sem dado); valor torto é falha de contrato. */
function numeroOuNulo(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor !== "number" || !Number.isFinite(valor)) throw foraDoContrato()
  return valor
}

function exigirTipo(valor: unknown): AnuncioTipo {
  if (valor === "item" || valor === "property") return valor
  throw foraDoContrato()
}

function lerAnuncio(corpo: Corpo): AnuncioDaLista {
  return {
    id: exigirTexto(corpo, "id"),
    tipo: exigirTipo(corpo["tipo"]),
    titulo: exigirTexto(corpo, "titulo"),
    descricao: texto(corpo["descricao"]),
    precoCents: numeroOuNulo(corpo["precoCents"]),
    deal: texto(corpo["deal"]),
    bairro: texto(corpo["bairro"]),
    cidade: texto(corpo["cidade"]),
    status: exigirTexto(corpo, "status"),
    condicao: texto(corpo["condicao"]),
    categoria: texto(corpo["categoria"]),
    quartos: numeroOuNulo(corpo["quartos"]),
    tipoImovel: texto(corpo["tipoImovel"]),
    areaM2: numeroOuNulo(corpo["areaM2"]),
    condoFeeCents: numeroOuNulo(corpo["condoFeeCents"]),
    foto: texto(corpo["foto"]),
    criadoEm: texto(corpo["criadoEm"]),
  }
}

/**
 * Anúncios reais da cidade da sessão, por aba. Os filtros de imóvel (`quartos`,
 * `valor_max`, `tipo_imovel`) só vão na query com `tipo=property`: com item o
 * servidor os recusaria, e montar parâmetro inválido é o mesmo erro.
 */
export async function lerMercado(
  filtros: FiltrosDoMercado,
  opcoes: { signal?: AbortSignal } = {},
): Promise<ListaDoMercado> {
  const busca = new URLSearchParams({ tipo: exigirTipo(filtros.tipo) })
  if (filtros.ordem !== undefined) busca.set("ordem", filtros.ordem)
  if (filtros.tipo === "property") {
    if (filtros.quartos !== undefined && filtros.quartos > 0) {
      busca.set("quartos", String(filtros.quartos))
    }
    if (filtros.valorMax !== undefined && filtros.valorMax > 0) {
      busca.set("valor_max", String(filtros.valorMax))
    }
    if (
      filtros.tipoImovel !== undefined &&
      filtros.tipoImovel !== "" &&
      filtros.tipoImovel !== "todos"
    ) {
      busca.set("tipo_imovel", filtros.tipoImovel)
    }
  }
  if (filtros.depois !== undefined) busca.set("depois", filtros.depois)

  const corpo = await ler(`/api/app/mercado?${busca.toString()}`, opcoes)
  const lista = corpo["anuncios"]
  if (!Array.isArray(lista)) throw foraDoContrato()
  return {
    anuncios: lista.map((linha) => lerAnuncio(exigirRegistro(linha))),
    proximo: texto(corpo["proximo"]),
    cidade: texto(corpo["cidade"]),
  }
}

export async function buscarAnuncio(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<AnuncioDetalhado> {
  const corpo = exigirRegistro(
    (await ler(`/api/app/mercado/${encodeURIComponent(id)}`, opcoes))["anuncio"],
  )
  const fotos = corpo["fotos"]
  if (!Array.isArray(fotos) || !fotos.every((foto) => typeof foto === "string"))
    throw foraDoContrato()
  return {
    ...lerAnuncio(corpo),
    endereco: texto(corpo["endereco"]),
    donoId: exigirTexto(corpo, "donoId"),
    donoNome: texto(corpo["donoNome"]),
    fotos,
    meu: corpo["meu"] === true,
    salvo: corpo["salvo"] === true,
  }
}

/** "Tenho interesse": abre (ou reaproveita) a conversa com quem anuncia. */
export async function abrirInteresse(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<string> {
  const corpo = await enviar(
    "POST",
    `/api/app/mercado/${encodeURIComponent(id)}/interesse`,
    {},
    opcoes,
  )
  return exigirTexto(corpo, "conversaId")
}
