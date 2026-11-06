import { enviar, FalhaDaApi, ler } from "../api/cliente"

export type GrupoReal = Readonly<{
  id: string
  nome: string
  descricao: string
  regras: string
  fechado: boolean
  membro: boolean
  pendente: boolean
  admin: boolean
  membros: number | null
  fixada: string | null
}>
export type PublicacaoReal = Readonly<{
  id: string
  grupoId: string
  texto: string
  criadaEm: string
  autor: string
  propria: boolean
  comentarios: number
  uteis: number
  util: boolean
  salva: boolean
  oculta: boolean
  fotos: readonly string[]
}>
export type ListaDeGrupos = Readonly<{
  grupos: readonly GrupoReal[]
  cidade: string
  proximo: string | null
}>
export type DetalheDoGrupo = Readonly<{
  grupo: GrupoReal
  publicacoes: readonly PublicacaoReal[]
  proximo: string | null
}>
type Opcoes = { signal?: AbortSignal }
type Registro = Record<string, unknown>

function falha(): never {
  throw new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}
function registro(valor: unknown): Registro {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return falha()
  return valor as Registro
}
function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : falha()
}
function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= 0 ? valor : falha()
}
function booleano(valor: unknown): boolean {
  return typeof valor === "boolean" ? valor : falha()
}
function cursor(valor: unknown): string | null {
  return valor === null ? null : texto(valor)
}
function lista<T>(valor: unknown, converter: (item: unknown) => T): readonly T[] {
  return Array.isArray(valor) ? valor.map(converter) : falha()
}
function grupo(valor: unknown): GrupoReal {
  const g = registro(valor)
  return {
    id: texto(g["id"]),
    nome: texto(g["nome"]),
    descricao: texto(g["descricao"]),
    regras: texto(g["regras"]),
    fechado: booleano(g["fechado"]),
    membro: booleano(g["membro"]),
    pendente: booleano(g["pendente"]),
    admin: booleano(g["admin"]),
    membros: g["membros"] === null ? null : numero(g["membros"]),
    fixada: cursor(g["fixada"]),
  }
}
function publicacao(valor: unknown): PublicacaoReal {
  const p = registro(valor)
  return {
    id: texto(p["id"]),
    grupoId: texto(p["grupoId"]),
    texto: texto(p["texto"]),
    criadaEm: texto(p["criadaEm"]),
    autor: texto(p["autor"]),
    propria: booleano(p["propria"]),
    comentarios: numero(p["comentarios"]),
    uteis: numero(p["uteis"]),
    util: booleano(p["util"]),
    salva: booleano(p["salva"]),
    oculta: booleano(p["oculta"]),
    fotos: lista(p["fotos"], texto),
  }
}
export async function lerGrupos(opcoes: Opcoes & { depois?: string } = {}): Promise<ListaDeGrupos> {
  const busca = opcoes.depois === undefined ? "" : `?depois=${encodeURIComponent(opcoes.depois)}`
  const corpo = await ler(`/api/app/grupos${busca}`, opcoes)
  return {
    grupos: lista(corpo["grupos"], grupo),
    cidade: texto(corpo["cidade"]),
    proximo: cursor(corpo["proximo"]),
  }
}
export async function buscarGrupo(
  id: string,
  opcoes: Opcoes & { depois?: string; ordem?: OrdemDoGrupo } = {},
): Promise<DetalheDoGrupo> {
  const busca = new URLSearchParams({ ordem: opcoes.ordem ?? "recentes" })
  if (opcoes.depois !== undefined) busca.set("depois", opcoes.depois)
  const corpo = await ler(`/api/app/grupos/${encodeURIComponent(id)}?${busca}`, opcoes)
  return {
    grupo: grupo(corpo["grupo"]),
    publicacoes: lista(corpo["publicacoes"], publicacao),
    proximo: cursor(corpo["proximo"]),
  }
}

export async function mudarParticipacao(
  id: string,
  entrar: boolean,
  motivo = "",
  opcoes: Opcoes = {},
): Promise<GrupoReal> {
  const corpo = await enviar(
    entrar ? "PUT" : "DELETE",
    `/api/app/grupos/${encodeURIComponent(id)}/participacao`,
    entrar ? { motivo } : undefined,
    opcoes,
  )
  return grupo(corpo["grupo"])
}

export type ComentarioReal = Readonly<{
  id: string
  texto: string
  criadaEm: string
  autor: string
  propria: boolean
  parentId: string | null
  respondeA: string | null
  para: string
  uteis: number
  util: boolean
}>
export type DetalheDaPublicacao = Readonly<{
  publicacao: PublicacaoReal
  grupo: GrupoReal
  comentarios: readonly ComentarioReal[]
  proximo: string | null
}>
function comentario(valor: unknown): ComentarioReal {
  const c = registro(valor)
  return {
    id: texto(c["id"]),
    texto: texto(c["texto"]),
    criadaEm: texto(c["criadaEm"]),
    autor: texto(c["autor"]),
    propria: booleano(c["propria"]),
    parentId: cursor(c["parentId"]),
    respondeA: cursor(c["respondeA"]),
    para: texto(c["para"]),
    uteis: numero(c["uteis"]),
    util: booleano(c["util"]),
  }
}
export async function buscarPublicacao(
  id: string,
  opcoes: Opcoes & { depois?: string } = {},
): Promise<DetalheDaPublicacao> {
  const busca = opcoes.depois === undefined ? "" : `?depois=${encodeURIComponent(opcoes.depois)}`
  const corpo = await ler(`/api/app/grupos/publicacoes/${encodeURIComponent(id)}${busca}`, opcoes)
  return {
    publicacao: publicacao(corpo["publicacao"]),
    grupo: grupo(corpo["grupo"]),
    comentarios: lista(corpo["comentarios"], comentario),
    proximo: cursor(corpo["proximo"]),
  }
}
export async function publicarNoGrupo(
  id: string,
  dados: { texto: string; fotos: readonly string[] },
  opcoes: Opcoes = {},
): Promise<string> {
  const corpo = await enviar(
    "POST",
    `/api/app/grupos/${encodeURIComponent(id)}/publicacoes`,
    dados,
    opcoes,
  )
  return texto(registro(corpo["publicacao"])["id"])
}
export async function anexarFotoAoGrupo(
  id: string,
  foto: string,
  opcoes: Opcoes = {},
): Promise<string> {
  const partes = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(foto)
  if (!partes) throw new FalhaDaApi("invalido", 400)
  const corpo = await enviar(
    "POST",
    `/api/app/grupos/${encodeURIComponent(id)}/fotos`,
    { tipo: partes[1], conteudo: partes[2] },
    opcoes,
  )
  return texto(corpo["caminho"])
}
export async function comentarPublicacao(
  id: string,
  conteudo: string,
  respondeA: string | null = null,
  opcoes: Opcoes = {},
): Promise<ComentarioReal> {
  const corpo = await enviar(
    "POST",
    `/api/app/grupos/publicacoes/${encodeURIComponent(id)}/comentarios`,
    { texto: conteudo, respondeA },
    opcoes,
  )
  return comentario(corpo["comentario"])
}

export type PedidosDoGrupo = Readonly<{
  pedidos: readonly Readonly<{ id: string; nome: string; motivo: string }>[]
  proximo: string | null
}>
export async function lerPedidosDoGrupo(
  id: string,
  opcoes: Opcoes & { depois?: string } = {},
): Promise<PedidosDoGrupo> {
  const busca = opcoes.depois === undefined ? "" : `?depois=${encodeURIComponent(opcoes.depois)}`
  const corpo = await ler(`/api/app/grupos/${encodeURIComponent(id)}/pedidos${busca}`, opcoes)
  return {
    pedidos: lista(corpo["pedidos"], (valor) => {
      const p = registro(valor)
      return { id: texto(p["id"]), nome: texto(p["nome"]), motivo: texto(p["motivo"]) }
    }),
    proximo: cursor(corpo["proximo"]),
  }
}

export type OrdemDoGrupo = "recentes" | "discutidas" | "salvas" | "ocultadas"
export type AcaoDaPublicacao = "util" | "salvar" | "fixar" | "ocultar"
export async function agirNaPublicacao(
  id: string,
  acao: AcaoDaPublicacao,
  valor: boolean,
  opcoes: Opcoes = {},
) {
  const corpo = await enviar(
    "PUT",
    `/api/app/grupos/publicacoes/${encodeURIComponent(id)}/acoes`,
    { acao, valor },
    opcoes,
  )
  return { publicacao: publicacao(corpo["publicacao"]), fixada: cursor(corpo["fixada"]) }
}
export async function marcarComentarioUtil(
  id: string,
  comentarioId: string,
  valor: boolean,
  opcoes: Opcoes = {},
) {
  const corpo = await enviar(
    "PUT",
    `/api/app/grupos/publicacoes/${encodeURIComponent(id)}/acoes`,
    { acao: "util", valor, comentarioId },
    opcoes,
  )
  const c = registro(corpo["comentario"])
  return { id: texto(c["id"]), uteis: numero(c["uteis"]), util: booleano(c["util"]) }
}

export async function denunciarPublicacao(
  id: string,
  motivo: string,
  explicacao: string,
  opcoes: Opcoes = {},
): Promise<string> {
  const corpo = await enviar(
    "POST",
    `/api/app/grupos/publicacoes/${encodeURIComponent(id)}/denuncia`,
    { motivo, explicacao },
    opcoes,
  )
  return texto(registro(corpo["denuncia"])["id"])
}
