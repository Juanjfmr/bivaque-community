import { FalhaDaApi, ler } from "../api/cliente"

/**
 * A porta da consulta de cidade (CIDADE-169), no molde de `lib/dados/guia.ts`.
 *
 * A leitura no servidor é a aprovada pelo dono em 25/09/2026
 * (`ADR-20260925-consulta-outra-cidade`): o app nunca lê outra cidade direto do
 * banco, e sim desta rota, que fala pela RLS da sessão. O literal `atual` é o
 * único jeito de pedir "a minha cidade" — o nome da cidade não é endereço.
 *
 * Resposta fora do contrato sobe como falha de serviço, nunca vira lista vazia:
 * "essa cidade não tem nada" e "o servidor respondeu torto" são telas
 * diferentes.
 */

export const CIDADE_ATUAL = "atual"

export const CATEGORIAS_DO_GUIA_NA_CONSULTA = ["school", "hospital", "transporter", "courier"]

export type CidadeDaConsulta = Readonly<{ id: string; nome: string; uf: string }>
export type ReferenciaDaConsulta = Readonly<{
  id: string
  nome: string
  /** Enum do Guia quando conhecido; o rótulo é da tela. */
  categoria: string
}>
export type EncontroDaConsulta = Readonly<{
  id: string
  titulo: string
  comecaEm: string
  local: string | null
}>
export type AnuncioDaConsulta = Readonly<{
  id: string
  titulo: string
  /** Só os desapegos têm preço na lista; a vitrine de imóveis mostra o bairro. */
  precoCents: number | null
  bairro: string | null
}>
export type ImovelDaConsulta = Readonly<{ id: string; titulo: string; bairro: string | null }>

export type ConsultaDeCidade = Readonly<{
  cidade: CidadeDaConsulta
  /** A cidade da sessão, para o caminho de volta. `null` sem vínculo current. */
  atual: Readonly<{ id: string; nome: string }> | null
  /** A cidade consultada é a da própria pessoa. */
  minha: boolean
  guia: readonly ReferenciaDaConsulta[]
  encontros: readonly EncontroDaConsulta[]
  desapegos: readonly AnuncioDaConsulta[]
  imoveis: readonly ImovelDaConsulta[]
}>

export type CidadeDoCatalogo = Readonly<{ id: string; nome: string }>

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

function registro(valor: unknown): Corpo {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) throw foraDoContrato()
  return valor as Corpo
}

function lista(corpo: Corpo, chave: string): readonly Corpo[] {
  const valor = corpo[chave]
  if (!Array.isArray(valor)) throw foraDoContrato()
  return valor.map(registro)
}

function numeroOuNulo(valor: unknown): number | null {
  return typeof valor === "number" ? valor : null
}

function cidadeDe(registro: Corpo): { id: string; nome: string } {
  return { id: exigirTexto(registro, "id"), nome: exigirTexto(registro, "nome") }
}

/** O agregado de uma cidade: a da pessoa (`atual`) ou a de um id do catálogo. */
export async function lerCidadeConsulta(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<ConsultaDeCidade> {
  const corpo = await ler(`/api/app/cidade/${encodeURIComponent(id)}`, opcoes)
  const cidade = registro(corpo["cidade"])
  const atual = corpo["atual"] === null ? null : cidadeDe(registro(corpo["atual"]))
  return {
    cidade: {
      id: exigirTexto(cidade, "id"),
      nome: exigirTexto(cidade, "nome"),
      uf: exigirTexto(cidade, "uf"),
    },
    atual,
    minha: corpo["minha"] === true,
    guia: lista(corpo, "guia").map((linha) => ({
      id: exigirTexto(linha, "id"),
      nome: exigirTexto(linha, "nome"),
      categoria: exigirTexto(linha, "categoria"),
    })),
    encontros: lista(corpo, "encontros").map((linha) => ({
      id: exigirTexto(linha, "id"),
      titulo: exigirTexto(linha, "titulo"),
      comecaEm: exigirTexto(linha, "comecaEm"),
      local: texto(linha["local"]),
    })),
    desapegos: lista(corpo, "desapegos").map((linha) => ({
      id: exigirTexto(linha, "id"),
      titulo: exigirTexto(linha, "titulo"),
      precoCents: numeroOuNulo(linha["precoCents"]),
      bairro: texto(linha["bairro"]),
    })),
    imoveis: lista(corpo, "imoveis").map((linha) => ({
      id: exigirTexto(linha, "id"),
      titulo: exigirTexto(linha, "titulo"),
      bairro: texto(linha["bairro"]),
    })),
  }
}

/**
 * O catálogo público de cidades (`/api/localities`), o mesmo da entrada. O
 * painel de cidade precisa do ID da cidade para navegar de verdade; o nome
 * sozinho não é endereço de nada.
 */
export async function lerEstados(
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly string[]> {
  const corpo = await ler("/api/localities", opcoes)
  const ufs = corpo["ufs"]
  if (!Array.isArray(ufs)) throw foraDoContrato()
  return ufs.filter((uf): uf is string => typeof uf === "string")
}

export async function lerCidadesDaUf(
  uf: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly CidadeDoCatalogo[]> {
  const corpo = await ler(`/api/localities/${encodeURIComponent(uf)}`, opcoes)
  const municipios = corpo["municipalities"]
  if (!Array.isArray(municipios)) throw foraDoContrato()
  return municipios.flatMap((linha): CidadeDoCatalogo[] => {
    if (linha === null || typeof linha !== "object") return []
    const dados = linha as Corpo
    const id = texto(dados["id"])
    const nome = texto(dados["cityName"])
    return id === null || nome === null ? [] : [{ id, nome }]
  })
}
