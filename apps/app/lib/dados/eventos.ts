import { enviar, FalhaDaApi, ler } from "../api/cliente"

/**
 * A porta da jornada de eventos (ADR-20261105 §2): fala só com
 * `/api/app/eventos` e traduz o corpo para o que a tela desenha.
 *
 * Não conhece HTTP, cabeçalho nem status — isso é do cliente. O que mora aqui é
 * o contrato do corpo: um campo obrigatório que chega torto é falha de serviço,
 * não lista vazia. Renderizar resposta quebrada como "nenhum encontro" é o bug
 * que o `apps/app/AGENTS.md` chama pelo nome.
 */

export type EncontroDaAgenda = Readonly<{
  id: string
  titulo: string
  local: string | null
  comecaEm: string
  situacao: string
}>

export type AgendaDaCidade = Readonly<{
  encontros: readonly EncontroDaAgenda[]
  /** Cidade do vínculo `current` de quem está na sessão — a que a lista mostra. */
  cidade: string
  /**
   * Cursor opaco da próxima página (`comecaEm|id`). Opaco de propósito: a ordem
   * é do servidor, e a tela só devolve o que recebeu.
   */
  proximo: string | null
}>

export type PresencaDoEncontro = "going" | "interested" | "not_going"

export type Presenca = Readonly<{
  confirmados: number
  minha: PresencaDoEncontro | null
}>

export type Encontro = Readonly<{
  id: string
  titulo: string
  descricao: string | null
  local: string | null
  comecaEm: string
  terminaEm: string | null
  situacao: string
  /** Cidade do evento — não a de quem está olhando. */
  cidade: string
  /** Presença só existe para quem é da cidade do encontro. */
  presenca: Presenca | null
  souOrganizador: boolean
  /** Encontro de outra cidade: abre para ler, sem presença e sem pergunta. */
  visitante: boolean
}>

/** O que a tela manda criar ou editar. O escopo não entra: é da sessão. */
export type DadosDoEncontro = Readonly<{
  titulo: string
  descricao: string
  comecaEm: string
  local: string
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

export function presencaDe(valor: unknown): PresencaDoEncontro | null {
  return valor === "going" || valor === "interested" || valor === "not_going" ? valor : null
}

function lerPresenca(valor: unknown): Presenca {
  const corpo = exigirRegistro(valor)
  const confirmados = corpo["confirmados"]
  // Zero é uma contagem legítima; ausência é resposta quebrada. Tratar ausência
  // como zero inventaria "ninguém confirmou".
  if (typeof confirmados !== "number" || !Number.isFinite(confirmados)) throw foraDoContrato()
  return { confirmados, minha: presencaDe(corpo["minha"]) }
}

function lerEncontro(corpo: Corpo): Encontro {
  const evento = exigirRegistro(corpo["evento"])
  const visitante = corpo["visitante"] === true
  return {
    id: exigirTexto(evento, "id"),
    titulo: exigirTexto(evento, "titulo"),
    descricao: texto(evento["descricao"]),
    local: texto(evento["local"]),
    comecaEm: exigirTexto(evento, "comecaEm"),
    terminaEm: texto(evento["terminaEm"]),
    situacao: texto(evento["situacao"]) ?? "upcoming",
    cidade: texto(evento["cidade"]) ?? "",
    presenca: visitante ? null : lerPresenca(corpo["presenca"]),
    souOrganizador: corpo["souOrganizador"] === true,
    visitante,
  }
}

/** A agenda da cidade de quem está na sessão, futuros primeiro. */
export async function lerAgenda(
  opcoes: { signal?: AbortSignal; depois?: string } = {},
): Promise<AgendaDaCidade> {
  const busca = opcoes.depois === undefined ? "" : `?depois=${encodeURIComponent(opcoes.depois)}`
  const corpo = await ler(`/api/app/eventos${busca}`, opcoes)
  const lista = corpo["eventos"]
  if (!Array.isArray(lista)) throw foraDoContrato()
  return {
    encontros: lista.map((linha) => {
      const encontro = exigirRegistro(linha)
      return {
        id: exigirTexto(encontro, "id"),
        titulo: exigirTexto(encontro, "titulo"),
        local: texto(encontro["local"]),
        comecaEm: exigirTexto(encontro, "comecaEm"),
        situacao: texto(encontro["situacao"]) ?? "upcoming",
      }
    }),
    proximo: texto(corpo["proximo"]),
    cidade: texto(corpo["cidade"]) ?? "",
  }
}

export async function buscarEncontro(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<Encontro> {
  return lerEncontro(await ler(`/api/app/eventos/${encodeURIComponent(id)}`, opcoes))
}

/** "Vou", "Não vou" ou "Tenho interesse". Devolve a presença já gravada. */
export async function marcarPresenca(
  id: string,
  situacao: PresencaDoEncontro,
  opcoes: { signal?: AbortSignal } = {},
): Promise<Presenca> {
  const corpo = await enviar(
    "PUT",
    `/api/app/eventos/${encodeURIComponent(id)}/presenca`,
    { situacao },
    opcoes,
  )
  return lerPresenca(corpo["presenca"])
}

/** Cancelar é apagar a linha da ocorrência: a contagem volta a não incluir a pessoa. */
export async function cancelarPresenca(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<Presenca> {
  const corpo = await enviar(
    "DELETE",
    `/api/app/eventos/${encodeURIComponent(id)}/presenca`,
    undefined,
    opcoes,
  )
  return lerPresenca(corpo["presenca"])
}

export async function criarEncontro(
  dados: DadosDoEncontro,
  opcoes: { signal?: AbortSignal } = {},
): Promise<string> {
  const corpo = await enviar("POST", "/api/app/eventos", dados, opcoes)
  return exigirTexto(exigirRegistro(corpo["evento"]), "id")
}

export async function editarEncontro(
  id: string,
  dados: DadosDoEncontro,
  opcoes: { signal?: AbortSignal } = {},
): Promise<void> {
  await enviar("PATCH", `/api/app/eventos/${encodeURIComponent(id)}`, dados, opcoes)
}

/** Pergunta ao organizador: a conversa é do evento e o destinatário vem do banco. */
export async function perguntarAoOrganizador(
  id: string,
  textoDaPergunta: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<string> {
  const corpo = await enviar(
    "POST",
    `/api/app/eventos/${encodeURIComponent(id)}/perguntas`,
    { texto: textoDaPergunta },
    opcoes,
  )
  return exigirTexto(corpo, "conversaId")
}
