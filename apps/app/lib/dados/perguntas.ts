import { enviar, FalhaDaApi, ler } from "../api/cliente"

/**
 * A porta da jornada de perguntas da cidade (F04), no molde do F05: fala só com
 * `/api/app/perguntas` e traduz o corpo para o que a tela desenha.
 *
 * Não conhece HTTP, cabeçalho nem status — isso é do cliente. O que mora aqui é
 * o contrato do corpo: campo obrigatório que chega torto é falha de serviço, não
 * lista vazia. Renderizar resposta quebrada como "ninguém perguntou nada" é o
 * bug que o `apps/app/AGENTS.md` chama pelo nome.
 */

export type FiltroDePerguntas = "ajuda" | "resolvidas" | "minhas"

export type PerguntaDaLista = Readonly<{
  id: string
  titulo: string
  /** Categoria do pedido, já em português; vazio quando o servidor não souber. */
  assunto: string
  criadaEm: string
  /** Nome público de quem perguntou; a tela decide o que dizer quando é vazio. */
  autor: string
  propria: boolean
  resolvida: boolean
  respostas: number
}>

export type ListaDePerguntas = Readonly<{
  perguntas: readonly PerguntaDaLista[]
  /** Posição da próxima página, opaca: a tela só devolve o que recebeu. */
  proximo: string | null
  /** Cidade do vínculo `current` de quem está na sessão. */
  cidade: string
  /** Quantas perguntas da cidade já foram resolvidas (o número do cabeçalho). */
  resolvidas: number
}>

export type RespostaDaConversa = Readonly<{
  id: string
  corpo: string
  autor: string
  propria: boolean
  criadaEm: string
  /** Removida pela moderação: sem texto e sem autor, só o aviso. */
  removida: boolean
}>

export type PerguntaDaConversa = Readonly<{
  pergunta: Readonly<{
    id: string
    titulo: string
    corpo: string
    assunto: string
    criadaEm: string
    resolvida: boolean
    propria: boolean
    autor: string
    cidade: string
  }>
  respostas: readonly RespostaDaConversa[]
}>

type Corpo = Record<string, unknown>

/** Rótulos das categorias do banco. Categoria desconhecida vira vazio, não chute. */
const ASSUNTOS: Readonly<Record<string, string>> = {
  saude_bem_estar: "Saúde",
  servicos_locais: "Serviços",
  educacao: "Educação",
  moradia: "Moradia",
  transporte: "Transporte e mudança",
  alimentacao: "Comer e comprar",
  esporte_lazer: "Esporte e lazer",
  outros: "Outros",
}

/**
 * A lista fechada de tópicos (ADR-20261107 item 5) — é o enum `category` do
 * banco, e é a única fonte: escolha ao perguntar e filtro da lista aceitam só
 * estes ids. Tópico livre não existe.
 */
export const TOPICOS_DAS_PERGUNTAS: ReadonlyArray<{
  readonly id: string
  readonly rotulo: string
}> = Object.entries(ASSUNTOS).map(([id, rotulo]) => ({ id, rotulo }))

export function rotuloDoTopico(id: string): string {
  return ASSUNTOS[id] ?? ""
}

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

function exigirNumero(corpo: Corpo, chave: string): number {
  const valor = corpo[chave]
  if (typeof valor !== "number" || !Number.isFinite(valor)) throw foraDoContrato()
  return valor
}

function assunto(valor: unknown): string {
  return typeof valor === "string" ? (ASSUNTOS[valor] ?? "") : ""
}

function lerPergunta(linha: unknown): PerguntaDaLista {
  const pergunta = exigirRegistro(linha)
  return {
    id: exigirTexto(pergunta, "id"),
    titulo: exigirTexto(pergunta, "titulo"),
    assunto: assunto(pergunta["categoria"]),
    criadaEm: exigirTexto(pergunta, "criadaEm"),
    autor: texto(pergunta["autor"]) ?? "",
    propria: pergunta["propria"] === true,
    resolvida: pergunta["resolvida"] === true,
    respostas: exigirNumero(pergunta, "respostas"),
  }
}

function lerResposta(linha: unknown): RespostaDaConversa {
  const resposta = exigirRegistro(linha)
  return {
    id: exigirTexto(resposta, "id"),
    corpo: typeof resposta["corpo"] === "string" ? resposta["corpo"] : "",
    autor: texto(resposta["autor"]) ?? "",
    propria: resposta["propria"] === true,
    criadaEm: exigirTexto(resposta, "criadaEm"),
    removida: resposta["removida"] === true,
  }
}

/** As perguntas da cidade de quem está na sessão, já filtradas e ordenadas no servidor. */
export async function lerPerguntas(
  opcoes: {
    signal?: AbortSignal
    filtro?: FiltroDePerguntas
    depois?: string
    /** Id de TOPICOS_DAS_PERGUNTAS; vazio ou ausente é "todos". */
    topico?: string | undefined
  } = {},
): Promise<ListaDePerguntas> {
  const parametros = new URLSearchParams({ filtro: opcoes.filtro ?? "ajuda" })
  if (opcoes.depois !== undefined) parametros.set("depois", opcoes.depois)
  if (opcoes.topico !== undefined && opcoes.topico !== "") parametros.set("topico", opcoes.topico)
  const corpo = await ler(`/api/app/perguntas?${parametros.toString()}`, opcoes)
  const lista = corpo["perguntas"]
  if (!Array.isArray(lista)) throw foraDoContrato()
  return {
    perguntas: lista.map(lerPergunta),
    proximo: corpo["proximo"] === null ? null : exigirTexto(corpo, "proximo"),
    cidade: texto(corpo["cidade"]) ?? "",
    resolvidas: exigirNumero(corpo, "resolvidas"),
  }
}

export async function buscarPergunta(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<PerguntaDaConversa> {
  const corpo = await ler(`/api/app/perguntas/${encodeURIComponent(id)}`, opcoes)
  const respostas = corpo["respostas"]
  if (!Array.isArray(respostas)) throw foraDoContrato()
  const pergunta = exigirRegistro(corpo["pergunta"])
  return {
    pergunta: {
      id: exigirTexto(pergunta, "id"),
      titulo: exigirTexto(pergunta, "titulo"),
      corpo: typeof pergunta["corpo"] === "string" ? pergunta["corpo"] : "",
      assunto: assunto(pergunta["categoria"]),
      criadaEm: exigirTexto(pergunta, "criadaEm"),
      resolvida: pergunta["resolvida"] === true,
      propria: pergunta["propria"] === true,
      autor: texto(pergunta["autor"]) ?? "",
      cidade: texto(pergunta["cidade"]) ?? "",
    },
    respostas: respostas.map(lerResposta),
  }
}

/** Responde pela sessão e devolve a resposta GRAVADA, não o texto enviado. */
export async function responderPergunta(
  id: string,
  textoDaResposta: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<RespostaDaConversa> {
  const corpo = await enviar(
    "POST",
    `/api/app/perguntas/${encodeURIComponent(id)}/respostas`,
    { texto: textoDaResposta },
    opcoes,
  )
  const gravada = exigirRegistro(corpo["resposta"])
  return {
    id: exigirTexto(gravada, "id"),
    corpo: exigirTexto(gravada, "corpo"),
    // Quem acabou de responder é quem está na sessão: a tela mostra "Você".
    autor: "",
    propria: true,
    criadaEm: exigirTexto(gravada, "criadaEm"),
    removida: false,
  }
}
