import { enviar, FalhaDaApi, ler } from "../api/cliente"

export type ResumoDoNegocio = Readonly<{
  id: string
  nome: string
  categoria: string
  categoriaNome: string
  descricao: string | null
}>
export type Negocio = ResumoDoNegocio &
  Readonly<{
    cidade: string
    podePedir: boolean
    servicos: readonly Readonly<{ id: string; titulo: string; descricao: string | null }>[]
    foto: string | null
    fotoDescricao: string | null
  }>
export type ListaDeNegocios = Readonly<{
  negocios: readonly ResumoDoNegocio[]
  categorias: readonly Readonly<{ id: string; nome: string }>[]
  cidade: string
  proximo: string | null
}>
export type SituacaoDoPedido = "open" | "in_conversation" | "closed" | "cancelled"
export type PedidoDeServico = Readonly<{
  id: string
  negocioId: string
  negocioNome: string
  categoriaNome: string
  descricao: string
  quando: string | null
  situacao: SituacaoDoPedido
  criadoEm: string
  atualizadoEm: string
  conversaId: string | null
}>
export type ListaDePedidos = Readonly<{
  pedidos: readonly PedidoDeServico[]
  proximo: string | null
}>
export type DadosDoPedido = Readonly<{ descricao: string; quando: string; chave: string }>

type Corpo = Record<string, unknown>

function foraDoContrato(): never {
  throw new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}
function registro(valor: unknown): Corpo {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) foraDoContrato()
  return valor as Corpo
}
function texto(corpo: Corpo, chave: string): string {
  const valor = corpo[chave]
  if (typeof valor !== "string" || valor.trim() === "") foraDoContrato()
  return valor
}
function opcional(corpo: Corpo, chave: string): string | null {
  const valor = corpo[chave]
  if (valor === null) return null
  if (typeof valor !== "string") foraDoContrato()
  return valor
}
function lista(corpo: Corpo, chave: string): unknown[] {
  const valor = corpo[chave]
  if (!Array.isArray(valor)) foraDoContrato()
  return valor
}
function resumo(valor: unknown): ResumoDoNegocio {
  const corpo = registro(valor)
  return {
    id: texto(corpo, "id"),
    nome: texto(corpo, "nome"),
    categoria: texto(corpo, "categoria"),
    categoriaNome: texto(corpo, "categoriaNome"),
    descricao: opcional(corpo, "descricao"),
  }
}
function pedidoDe(valor: unknown): PedidoDeServico {
  const corpo = registro(valor)
  const situacao = corpo["situacao"]
  if (
    situacao !== "open" &&
    situacao !== "in_conversation" &&
    situacao !== "closed" &&
    situacao !== "cancelled"
  )
    foraDoContrato()
  return {
    id: texto(corpo, "id"),
    negocioId: texto(corpo, "negocioId"),
    negocioNome: texto(corpo, "negocioNome"),
    categoriaNome: texto(corpo, "categoriaNome"),
    descricao: texto(corpo, "descricao"),
    quando: opcional(corpo, "quando"),
    situacao,
    criadoEm: texto(corpo, "criadoEm"),
    atualizadoEm: texto(corpo, "atualizadoEm"),
    conversaId: opcional(corpo, "conversaId"),
  }
}

export async function lerNegocios(
  opcoes: { signal?: AbortSignal; categoria?: string; depois?: string } = {},
): Promise<ListaDeNegocios> {
  const busca = new URLSearchParams()
  if (opcoes.categoria) busca.set("categoria", opcoes.categoria)
  if (opcoes.depois) busca.set("depois", opcoes.depois)
  const corpo = await ler(`/api/app/negocios${busca.size === 0 ? "" : `?${busca}`}`, opcoes)
  return {
    negocios: lista(corpo, "negocios").map(resumo),
    categorias: lista(corpo, "categorias").map((valor) => {
      const categoria = registro(valor)
      return { id: texto(categoria, "id"), nome: texto(categoria, "nome") }
    }),
    cidade: texto(corpo, "cidade"),
    proximo: opcional(corpo, "proximo"),
  }
}

export async function buscarNegocio(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<Negocio> {
  const corpo = registro(
    (await ler(`/api/app/negocios/${encodeURIComponent(id)}`, opcoes))["negocio"],
  )
  if (typeof corpo["podePedir"] !== "boolean") foraDoContrato()
  return {
    ...resumo(corpo),
    cidade: texto(corpo, "cidade"),
    podePedir: corpo["podePedir"],
    foto: opcional(corpo, "foto"),
    fotoDescricao: opcional(corpo, "fotoDescricao"),
    servicos: lista(corpo, "servicos").map((valor) => {
      const servico = registro(valor)
      return {
        id: texto(servico, "id"),
        titulo: texto(servico, "titulo"),
        descricao: opcional(servico, "descricao"),
      }
    }),
  }
}

export async function criarPedido(
  id: string,
  dados: DadosDoPedido,
  opcoes: { signal?: AbortSignal } = {},
): Promise<PedidoDeServico> {
  const corpo = await enviar(
    "POST",
    `/api/app/negocios/${encodeURIComponent(id)}/pedidos`,
    dados,
    opcoes,
  )
  return pedidoDe(corpo["pedido"])
}

export async function lerPedidos(
  opcoes: { signal?: AbortSignal; depois?: string } = {},
): Promise<ListaDePedidos> {
  const busca = opcoes.depois === undefined ? "" : `?depois=${encodeURIComponent(opcoes.depois)}`
  const corpo = await ler(`/api/app/pedidos${busca}`, opcoes)
  return { pedidos: lista(corpo, "pedidos").map(pedidoDe), proximo: opcional(corpo, "proximo") }
}

export async function buscarPedido(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<PedidoDeServico> {
  return pedidoDe((await ler(`/api/app/pedidos/${encodeURIComponent(id)}`, opcoes))["pedido"])
}
