import { enviar, FalhaDaApi, ler } from "../api/cliente"

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
  if (typeof valor !== "string" || valor === "") foraDoContrato()
  return valor
}

function textoOuNulo(corpo: Corpo, chave: string): string | null {
  const valor = corpo[chave]
  if (valor !== null && typeof valor !== "string") foraDoContrato()
  return valor
}

function lista(corpo: Corpo, chave: string): readonly unknown[] {
  const valor = corpo[chave]
  if (!Array.isArray(valor)) foraDoContrato()
  return valor
}

// TROCA-005 — as denúncias do membro na Ajuda do app. A lista e o detalhe são
// do PRÓPRIO denunciante (RLS): nada aqui identifica autor de denúncia nem o
// resultado interno da moderação, porque o servidor não manda esses campos.

export const MOTIVOS_DA_DENUNCIA = [
  { valor: "spam", rotulo: "Spam" },
  { valor: "conteudo-inadequado", rotulo: "Conteúdo inadequado" },
  { valor: "informacao-enganosa", rotulo: "Informação enganosa" },
  { valor: "outro", rotulo: "Outro" },
] as const

export const EXPLICACAO_MAX = 300

/**
 * Os tipos de alvo que a denúncia conhece (o mesmo enum do banco). A Ajuda
 * oferece publicações e grupos; o link `?denunciar=<tipo>:<id>` pode apontar
 * outros, e o servidor confere a visibilidade do alvo no insert.
 */
export const TIPOS_DE_ALVO = [
  "post",
  "comment",
  "group",
  "message",
  "recommendation_request",
  "recommendation_reply",
] as const

export type TipoDoAlvoDenuncia = (typeof TIPOS_DE_ALVO)[number]

export type AlvoDeDenuncia = Readonly<{
  tipo: "post" | "group"
  id: string
  titulo: string
}>

/** O alvo escolhido para denunciar, venha da lista ou da URL. */
export type AlvoEscolhido = Readonly<{
  tipo: TipoDoAlvoDenuncia
  id: string
  titulo: string
}>

function alvoDe(valor: unknown): AlvoDeDenuncia {
  const corpo = registro(valor)
  const tipo = corpo["tipo"]
  if (tipo !== "post" && tipo !== "group") foraDoContrato()
  return { tipo, id: texto(corpo, "id"), titulo: texto(corpo, "titulo") }
}

export async function lerAlvosDeDenuncia(
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly AlvoDeDenuncia[]> {
  return lista(await ler("/api/app/denuncias/alvos", opcoes), "alvos").map(alvoDe)
}

export type Denuncia = Readonly<{
  id: string
  rotuloDoAlvo: string
  previaDeAlvo: string | null
  motivo: string
  explicacao: string | null
  resolvida: boolean
  criadaEm: string
  resolvidaEm: string | null
}>

function denunciaDe(valor: unknown, detalhada: boolean): Denuncia {
  const corpo = registro(valor)
  const motivo = detalhada
    ? registro(corpo["motivo"])
    : { label: texto(corpo, "reason"), explanation: null }
  return {
    id: texto(corpo, "id"),
    rotuloDoAlvo: texto(corpo, "targetLabel"),
    previaDeAlvo: textoOuNulo(corpo, "targetPreview"),
    motivo: texto(motivo, "label"),
    explicacao: textoOuNulo(motivo, "explanation"),
    resolvida: corpo["status"] === "resolved",
    criadaEm: texto(corpo, "createdAt"),
    resolvidaEm: textoOuNulo(corpo, "resolvedAt"),
  }
}

export async function lerDenuncias(
  opcoes: { depois?: string; signal?: AbortSignal } = {},
): Promise<Readonly<{ denuncias: readonly Denuncia[]; proximo: string | null }>> {
  const caminho =
    opcoes.depois === undefined
      ? "/api/app/denuncias"
      : `/api/app/denuncias?depois=${encodeURIComponent(opcoes.depois)}`
  const resposta = registro(await ler(caminho, opcoes))
  return {
    denuncias: lista(resposta, "denuncias").map((valor) => denunciaDe(valor, false)),
    proximo: textoOuNulo(resposta, "proximo"),
  }
}

export async function lerDenuncia(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<Denuncia> {
  return denunciaDe(
    (await ler(`/api/app/denuncias/${encodeURIComponent(id)}`, opcoes))["denuncia"],
    true,
  )
}

export async function enviarDenuncia(
  dados: Readonly<{
    tipo: TipoDoAlvoDenuncia
    alvo: string
    motivo: string
    explicacao: string
  }>,
  opcoes: { signal?: AbortSignal } = {},
): Promise<string> {
  return texto(
    registro((await enviar("POST", "/api/app/denuncias", dados, opcoes))["denuncia"]),
    "id",
  )
}
