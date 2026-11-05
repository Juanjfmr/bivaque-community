import { enviar, FalhaDaApi, ler } from "../api/cliente"

/**
 * A porta da jornada do Guia (F08 / ADR-20261105 §2), no molde de
 * `lib/dados/eventos.ts`: fala só com `/api/app/guia` e traduz o corpo para o
 * que a tela desenha.
 *
 * Resposta fora do contrato sobe como falha de serviço, nunca vira lista vazia:
 * "sua cidade não tem guia" e "o servidor respondeu torto" são telas
 * diferentes. A categoria é conferida aqui também porque a tela ramifica por
 * ela — um valor novo do banco não pode virar chip inventado.
 */

export const CATEGORIAS_DO_GUIA = ["school", "hospital", "transporter", "courier"] as const
export type CategoriaDoGuia = (typeof CATEGORIAS_DO_GUIA)[number]

export type EntradaDoGuia = Readonly<{
  id: string
  categoria: CategoriaDoGuia
  nome: string
  descricao: string
  site: string | null
  telefone: string | null
  salvo: boolean
}>

export type GuiaDaCidade = Readonly<{
  entradas: readonly EntradaDoGuia[]
  /** Cursor opaco (`nome|id`) da próxima página. */
  proximo: string | null
  /** Cidade do vínculo `current` de quem está na sessão. */
  cidade: string
}>

export type VerbeteDoGuia = Readonly<{
  entrada: EntradaDoGuia
  /** Só há onde pousar a sugestão quando a referência tem artigo publicado. */
  podeSugerir: boolean
}>

export type DadosDaSugestao = Readonly<{ descricao: string; referencia: string }>

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

function categoriaDoGuia(valor: unknown): CategoriaDoGuia {
  if (typeof valor === "string" && (CATEGORIAS_DO_GUIA as readonly string[]).includes(valor)) {
    return valor as CategoriaDoGuia
  }
  throw foraDoContrato()
}

function lerEntrada(corpo: Corpo): EntradaDoGuia {
  return {
    id: exigirTexto(corpo, "id"),
    categoria: categoriaDoGuia(corpo["categoria"]),
    nome: exigirTexto(corpo, "nome"),
    descricao: texto(corpo["descricao"]) ?? "",
    site: texto(corpo["site"]),
    telefone: texto(corpo["telefone"]),
    salvo: corpo["salvo"] === true,
  }
}

function conferirSalvo(corpo: Corpo): boolean {
  const salvo = corpo["salvo"]
  if (typeof salvo !== "boolean") throw foraDoContrato()
  return salvo
}

/** O diretório da cidade de quem está na sessão, por nome. */
export async function lerGuia(
  opcoes: {
    q?: string
    categoria?: CategoriaDoGuia | null
    depois?: string
    signal?: AbortSignal
  } = {},
): Promise<GuiaDaCidade> {
  const busca = new URLSearchParams()
  if (opcoes.q !== undefined && opcoes.q.trim() !== "") busca.set("q", opcoes.q.trim())
  if (opcoes.categoria !== undefined && opcoes.categoria !== null) {
    busca.set("categoria", opcoes.categoria)
  }
  if (opcoes.depois !== undefined) busca.set("depois", opcoes.depois)
  const consulta = busca.size === 0 ? "" : `?${busca.toString()}`
  const corpo = await ler(`/api/app/guia${consulta}`, opcoes)
  const lista = corpo["entradas"]
  if (!Array.isArray(lista)) throw foraDoContrato()
  return {
    entradas: lista.map((linha) => lerEntrada(exigirRegistro(linha))),
    proximo: texto(corpo["proximo"]),
    cidade: texto(corpo["cidade"]) ?? "",
  }
}

export async function lerVerbete(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<VerbeteDoGuia> {
  const corpo = await ler(`/api/app/guia/${encodeURIComponent(id)}`, opcoes)
  return {
    entrada: lerEntrada(exigirRegistro(corpo["entrada"])),
    podeSugerir: corpo["podeSugerir"] === true,
  }
}

/** Marca ou desmarca: devolve o estado que ficou gravado, nunca o esperado. */
export async function marcarNoGuia(
  id: string,
  salvo: boolean,
  opcoes: { signal?: AbortSignal } = {},
): Promise<boolean> {
  const caminho = `/api/app/guia/${encodeURIComponent(id)}/salvo`
  const corpo = salvo
    ? await enviar("PUT", caminho, undefined, opcoes)
    : await enviar("DELETE", caminho, undefined, opcoes)
  return conferirSalvo(corpo)
}

/** A sugestão vai para a curadoria; devolve o id da sugestão criada. */
export async function sugerirAtualizacao(
  id: string,
  dados: DadosDaSugestao,
  opcoes: { signal?: AbortSignal } = {},
): Promise<string> {
  const corpo = await enviar(
    "POST",
    `/api/app/guia/${encodeURIComponent(id)}/sugestao`,
    { descricao: dados.descricao, referencia: dados.referencia },
    opcoes,
  )
  return exigirTexto(exigirRegistro(corpo["sugestao"]), "id")
}
