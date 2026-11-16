import { enviar, enviarFormulario, FalhaDaApi, ler } from "../api/cliente"

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
/** De que lado a pessoa está no pedido: quem pediu, ou quem recebeu. */
export type LadoDoPedido = "solicitante" | "dono"
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
  lado: LadoDoPedido
}>
export type ListaDePedidos = Readonly<{
  pedidos: readonly PedidoDeServico[]
  proximo: string | null
}>
export type DadosDoPedido = Readonly<{ descricao: string; quando: string; chave: string }>

/** Um serviço do catálogo da ficha, como o app o edita. */
export type ServicoDaFicha = Readonly<{ id: string; titulo: string; descricao: string | null }>
export type FotoDaFicha = Readonly<{ id: string; url: string; legenda: string | null }>
/** A ficha do PRÓPRIO negócio (Meu negócio). `null` = ainda não criada. */
export type MinhaFicha = Readonly<{
  id: string
  nome: string
  categoria: string
  categoriaNome: string
  descricao: string | null
  servicos: readonly ServicoDaFicha[]
  fotos: readonly FotoDaFicha[]
}>
export type DadosDaFicha = Readonly<{ nome: string; categoria: string; descricao: string }>

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
  const lado = corpo["lado"]
  if (lado !== "solicitante" && lado !== "dono") foraDoContrato()
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
    lado,
  }
}
function servicoDe(valor: unknown): ServicoDaFicha {
  const corpo = registro(valor)
  return {
    id: texto(corpo, "id"),
    titulo: texto(corpo, "titulo"),
    descricao: opcional(corpo, "descricao"),
  }
}
function fotoDe(valor: unknown): FotoDaFicha {
  const corpo = registro(valor)
  return { id: texto(corpo, "id"), url: texto(corpo, "url"), legenda: opcional(corpo, "legenda") }
}
function minhaFichaDe(valor: unknown): MinhaFicha {
  const corpo = registro(valor)
  return {
    id: texto(corpo, "id"),
    nome: texto(corpo, "nome"),
    categoria: texto(corpo, "categoria"),
    categoriaNome: texto(corpo, "categoriaNome"),
    descricao: opcional(corpo, "descricao"),
    servicos: lista(corpo, "servicos").map(servicoDe),
    fotos: lista(corpo, "fotos").map(fotoDe),
  }
}
function servicosDe(corpo: Corpo): readonly ServicoDaFicha[] {
  return lista(corpo, "servicos").map(servicoDe)
}
function fotosDe(corpo: Corpo): readonly FotoDaFicha[] {
  return lista(corpo, "fotos").map(fotoDe)
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

/** Cancelar (solicitante) ou encerrar (os dois lados). O estado final vem do banco. */
export async function mudarPedido(
  id: string,
  acao: "cancelar" | "encerrar",
  opcoes: { signal?: AbortSignal } = {},
): Promise<PedidoDeServico> {
  const corpo = await enviar(
    "PATCH",
    `/api/app/pedidos/${encodeURIComponent(id)}`,
    { acao },
    opcoes,
  )
  return pedidoDe(corpo["pedido"])
}

// ── Meu negócio (F07): a ficha, o catálogo e as fotos do PRÓPRIO membro ────

export type MinhaFichaLida = Readonly<{
  ficha: MinhaFicha | null
  categorias: readonly Readonly<{ id: string; nome: string }>[]
}>

export async function lerMinhaFicha(
  opcoes: { signal?: AbortSignal } = {},
): Promise<MinhaFichaLida> {
  const corpo = await ler("/api/app/negocio", opcoes)
  return {
    ficha: corpo["negocio"] === null ? null : minhaFichaDe(corpo["negocio"]),
    categorias: lista(corpo, "categorias").map((valor) => {
      const categoria = registro(valor)
      return { id: texto(categoria, "id"), nome: texto(categoria, "nome") }
    }),
  }
}

export async function criarMinhaFicha(
  dados: DadosDaFicha,
  opcoes: { signal?: AbortSignal } = {},
): Promise<MinhaFicha> {
  return minhaFichaDe((await enviar("POST", "/api/app/negocio", dados, opcoes))["negocio"])
}

export async function salvarMinhaFicha(
  dados: DadosDaFicha,
  opcoes: { signal?: AbortSignal } = {},
): Promise<MinhaFicha> {
  return minhaFichaDe((await enviar("PATCH", "/api/app/negocio", dados, opcoes))["negocio"])
}

export async function publicarServico(
  dados: Readonly<{ titulo: string; descricao: string }>,
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly ServicoDaFicha[]> {
  return servicosDe(await enviar("POST", "/api/app/negocio/catalogo", dados, opcoes))
}

export async function moverServico(
  id: string,
  direcao: "cima" | "baixo",
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly ServicoDaFicha[]> {
  return servicosDe(
    await enviar(
      "PATCH",
      `/api/app/negocio/catalogo/${encodeURIComponent(id)}`,
      { direcao },
      opcoes,
    ),
  )
}

export async function removerServico(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly ServicoDaFicha[]> {
  return servicosDe(
    await enviar(
      "DELETE",
      `/api/app/negocio/catalogo/${encodeURIComponent(id)}`,
      undefined,
      opcoes,
    ),
  )
}

export async function publicarFoto(
  arquivo: File,
  legenda: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly FotoDaFicha[]> {
  const formulario = new FormData()
  formulario.set("file", arquivo)
  if (legenda.trim() !== "") formulario.set("legenda", legenda.trim())
  return fotosDe(await enviarFormulario("/api/app/negocio/fotos", formulario, opcoes))
}

export async function legendarFoto(
  id: string,
  legenda: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly FotoDaFicha[]> {
  return fotosDe(
    await enviar("PATCH", `/api/app/negocio/fotos/${encodeURIComponent(id)}`, { legenda }, opcoes),
  )
}

export async function moverFoto(
  id: string,
  direcao: "cima" | "baixo",
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly FotoDaFicha[]> {
  return fotosDe(
    await enviar("PATCH", `/api/app/negocio/fotos/${encodeURIComponent(id)}`, { direcao }, opcoes),
  )
}

export async function removerFoto(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly FotoDaFicha[]> {
  return fotosDe(
    await enviar("DELETE", `/api/app/negocio/fotos/${encodeURIComponent(id)}`, undefined, opcoes),
  )
}
