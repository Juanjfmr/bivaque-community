import { FalhaDaApi, ler } from "../api/cliente"

export type ItemDoInicio = Readonly<{ id: string; title: string; detalhe: string | null }>
export type InicioDaCidade = Readonly<{
  cidade: string
  perguntas: ItemDoInicio[]
  eventos: ItemDoInicio[]
  anuncios: ItemDoInicio[]
  proximo: number | null
}>
export type BuscaDaCidade = Readonly<{
  cidade: string
  perguntas: ItemDoInicio[]
  grupos: ItemDoInicio[]
  anuncios: ItemDoInicio[]
  negocios: ItemDoInicio[]
  guia: ItemDoInicio[]
}>

function invalido(): never {
  throw new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}

function lista(
  corpo: Record<string, unknown>,
  chave: string,
  titulo: string,
  detalhe: string,
): ItemDoInicio[] {
  const valor = corpo[chave]
  if (!Array.isArray(valor)) return invalido()
  return valor.map((item: unknown) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return invalido()
    const linha = item as Record<string, unknown>
    if (typeof linha["id"] !== "string" || typeof linha[titulo] !== "string") return invalido()
    return {
      id: linha["id"],
      title: linha[titulo],
      detalhe: typeof linha[detalhe] === "string" ? linha[detalhe] : null,
    }
  })
}

function cidade(corpo: Record<string, unknown>): string {
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
    perguntas: lista(corpo, "perguntas", "title", "body"),
    eventos: lista(corpo, "eventos", "title", "starts_at"),
    anuncios: lista(corpo, "anuncios", "title", "neighborhood"),
    proximo,
  }
}

export async function buscarNaCidade(
  termo: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<BuscaDaCidade> {
  const corpo = await ler(`/api/app/busca?q=${encodeURIComponent(termo)}`, opcoes)
  return {
    cidade: cidade(corpo),
    perguntas: lista(corpo, "perguntas", "title", "body"),
    grupos: lista(corpo, "grupos", "name", "description"),
    anuncios: lista(corpo, "anuncios", "title", "neighborhood"),
    negocios: lista(corpo, "negocios", "display_name", "bio"),
    guia: lista(corpo, "guia", "name", "description"),
  }
}
