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

export type GrupoDaPergunta = Readonly<{ id: string; nome: string }>

export type PerguntaDaLista = Readonly<{
  id: string
  titulo: string
  /** Categoria do pedido, já em português; vazio quando o servidor não souber. */
  assunto: string
  criadaEm: string
  /** Nome público de quem perguntou; a tela decide o que dizer quando é vazio. */
  autor: string
  /** Id de quem perguntou, para abrir o perfil. Vazio quando o banco não deu. */
  autorId: string
  propria: boolean
  resolvida: boolean
  respostas: number
  /** Origem dupla (RUN-178): o grupo em que a pergunta também foi feita. */
  grupo: GrupoDaPergunta | null
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
  /** Id de quem respondeu; vazio na resposta removida pela moderação. */
  autorId: string
  propria: boolean
  criadaEm: string
  /** Removida pela moderação: sem texto e sem autor, só o aviso. */
  removida: boolean
  /** Editada pela autoria: marca do banco (`edited_at`), nunca do cliente. */
  editada: boolean
  /** O verbete do Guia que nasceu desta resposta, quando a moderação aprovou. */
  verbete: VerbeteDaResposta | null
}>

/** O que a resposta virou no Guia: só o id e o título, como a tela antiga lê. */
export type VerbeteDaResposta = Readonly<{ id: string; nome: string }>

export type PerguntaDaConversa = Readonly<{
  pergunta: Readonly<{
    id: string
    titulo: string
    corpo: string
    assunto: string
    criadaEm: string
    /** Editada pela autoria: marca do banco (`edited_at`). */
    editada: boolean
    resolvida: boolean
    /** Id da resposta que resolveu a pergunta; `null` quando não há, ou quando ela resolveu sem resposta. */
    resolvidaPorResposta: string | null
    propria: boolean
    autor: string
    autorId: string
    cidade: string
    /** Origem dupla (RUN-178): o grupo em que a pergunta também foi feita. */
    grupo: GrupoDaPergunta | null
    /** Seguindo respostas: a pessoa salvou a pergunta (`recommendation_saves`). */
    salva: boolean
  }>
  respostas: readonly RespostaDaConversa[]
}>

/** Uma pergunta que a pessoa está seguindo, para a tela Salvos. */
export type PerguntaSalva = Readonly<{
  id: string
  titulo: string
  /** Categoria do pedido, já em português; vazio quando o servidor não souber. */
  assunto: string
  criadaEm: string
  resolvida: boolean
}>

export type AcaoDeResolucao = "resolver" | "reabrir" | "marcar"

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

/** Origem dupla: `null` é pergunta só da cidade. Nome ausente não quebra a tela. */
function grupoDaPergunta(valor: unknown): GrupoDaPergunta | null {
  if (valor === null || valor === undefined) return null
  const grupo = exigirRegistro(valor)
  return { id: exigirTexto(grupo, "id"), nome: texto(grupo["nome"]) ?? "" }
}

function lerPergunta(linha: unknown): PerguntaDaLista {
  const pergunta = exigirRegistro(linha)
  return {
    id: exigirTexto(pergunta, "id"),
    titulo: exigirTexto(pergunta, "titulo"),
    assunto: assunto(pergunta["categoria"]),
    criadaEm: exigirTexto(pergunta, "criadaEm"),
    autor: texto(pergunta["autor"]) ?? "",
    autorId: texto(pergunta["autorId"]) ?? "",
    propria: pergunta["propria"] === true,
    resolvida: pergunta["resolvida"] === true,
    respostas: exigirNumero(pergunta, "respostas"),
    grupo: grupoDaPergunta(pergunta["grupo"]),
  }
}

function lerResposta(linha: unknown): RespostaDaConversa {
  const resposta = exigirRegistro(linha)
  return {
    id: exigirTexto(resposta, "id"),
    corpo: typeof resposta["corpo"] === "string" ? resposta["corpo"] : "",
    autor: texto(resposta["autor"]) ?? "",
    autorId: texto(resposta["autorId"]) ?? "",
    propria: resposta["propria"] === true,
    criadaEm: exigirTexto(resposta, "criadaEm"),
    removida: resposta["removida"] === true,
    editada: resposta["editada"] === true,
    verbete: lerVerbete(resposta["verbete"]),
  }
}

/**
 * O verbete ligado à resposta. Campo aditivo (F09): ausente é `null`, e não
 * falha — a tela sem link é o estado normal de quem ainda não foi ao Guia.
 */
function lerVerbete(valor: unknown): VerbeteDaResposta | null {
  if (valor === null || valor === undefined) return null
  const verbete = exigirRegistro(valor)
  return { id: exigirTexto(verbete, "id"), nome: texto(verbete["nome"]) ?? "" }
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
      editada: pergunta["editada"] === true,
      resolvida: pergunta["resolvida"] === true,
      resolvidaPorResposta: texto(pergunta["resolvidaPorResposta"]),
      propria: pergunta["propria"] === true,
      autor: texto(pergunta["autor"]) ?? "",
      autorId: texto(pergunta["autorId"]) ?? "",
      cidade: texto(pergunta["cidade"]) ?? "",
      grupo: grupoDaPergunta(pergunta["grupo"]),
      salva: pergunta["salva"] === true,
    },
    respostas: respostas.map(lerResposta),
  }
}

/**
 * Seguir respostas (F04): salvar e seguir são a mesma ação, um registro em
 * `recommendation_saves`. Devolve o estado GRAVADO, nunca o esperado.
 */
export async function marcarSalvaPergunta(
  id: string,
  salvar: boolean,
  opcoes: { signal?: AbortSignal } = {},
): Promise<boolean> {
  const caminho = `/api/app/perguntas/${encodeURIComponent(id)}/salvo`
  const corpo = salvar
    ? await enviar("PUT", caminho, undefined, opcoes)
    : await enviar("DELETE", caminho, undefined, opcoes)
  const salvo = corpo["salvo"]
  if (typeof salvo !== "boolean") throw foraDoContrato()
  return salvo
}

/** As perguntas que a pessoa segue, na ordem em que seguiu — a lista de Salvos. */
export async function lerPerguntasSalvas(
  opcoes: { signal?: AbortSignal } = {},
): Promise<readonly PerguntaSalva[]> {
  const corpo = await ler("/api/app/perguntas/salvas", opcoes)
  const lista = corpo["perguntas"]
  if (!Array.isArray(lista)) throw foraDoContrato()
  return lista.map((linha) => {
    const pergunta = exigirRegistro(linha)
    return {
      id: exigirTexto(pergunta, "id"),
      titulo: exigirTexto(pergunta, "titulo"),
      assunto: assunto(pergunta["categoria"]),
      criadaEm: exigirTexto(pergunta, "criadaEm"),
      resolvida: pergunta["resolvida"] === true,
    }
  })
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
    autorId: "",
    propria: true,
    criadaEm: exigirTexto(gravada, "criadaEm"),
    removida: false,
    // A resposta nova não é editada nem gerou verbete: o POST não devolve
    // marca nem link, e presumi-los seria afirmar o que o banco não disse.
    editada: false,
    verbete: null,
  }
}

/** O que a edição devolveu: o texto GRAVADO e a marca de edição do banco. */
export type PerguntaEditada = Readonly<{
  titulo: string
  corpo: string
  editada: boolean
}>

/**
 * Editar a própria pergunta (F09 lote 2). O id só escolhe a linha: quem decide
 * se ela é da pessoa é a rota, com o `author_id` da sessão.
 */
export async function editarPergunta(
  id: string,
  dados: Readonly<{ titulo: string; corpo: string }>,
  opcoes: { signal?: AbortSignal } = {},
): Promise<PerguntaEditada> {
  const corpo = await enviar(
    "PATCH",
    `/api/app/perguntas/${encodeURIComponent(id)}`,
    { titulo: dados.titulo, assunto: dados.corpo },
    opcoes,
  )
  const pergunta = exigirRegistro(corpo["pergunta"])
  return {
    titulo: exigirTexto(pergunta, "titulo"),
    corpo: typeof pergunta["corpo"] === "string" ? pergunta["corpo"] : "",
    editada: pergunta["editada"] === true,
  }
}

/** Excluir a própria pergunta. A conversa inteira sai com ela (cascade). */
export async function excluirPergunta(
  id: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<void> {
  await enviar("DELETE", `/api/app/perguntas/${encodeURIComponent(id)}`, undefined, opcoes)
}

/** O que a edição da resposta devolveu: o texto GRAVADO e a marca do banco. */
export type RespostaEditada = Readonly<{ corpo: string; editada: boolean }>

export async function editarResposta(
  id: string,
  respostaId: string,
  textoDaResposta: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<RespostaEditada> {
  const corpo = await enviar(
    "PATCH",
    `/api/app/perguntas/${encodeURIComponent(id)}/respostas/${encodeURIComponent(respostaId)}`,
    { texto: textoDaResposta },
    opcoes,
  )
  const resposta = exigirRegistro(corpo["resposta"])
  return {
    corpo: exigirTexto(resposta, "corpo"),
    editada: resposta["editada"] === true,
  }
}

/** Excluir a própria resposta. Se ela resolvia a pergunta, o banco a reabre. */
export async function excluirResposta(
  id: string,
  respostaId: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<void> {
  await enviar(
    "DELETE",
    `/api/app/perguntas/${encodeURIComponent(id)}/respostas/${encodeURIComponent(respostaId)}`,
    undefined,
    opcoes,
  )
}

export type DenunciaDaPergunta = Readonly<{
  /** Motivo da lista fechada (spam, conteudo-inadequado, informacao-enganosa, outro). */
  motivo: string
  explicacao: string
  /** Sem ele o alvo é a pergunta; com ele, aquela resposta da pergunta. */
  respostaId?: string
}>

/**
 * Denuncia a pergunta ou uma resposta dela (F04). O mecanismo é o mesmo da
 * publicação de grupo: `reports`, com motivo fechado e autoria da sessão.
 * Devolve o id GRAVADO da denúncia.
 */
export async function denunciarPergunta(
  id: string,
  denuncia: DenunciaDaPergunta,
  opcoes: { signal?: AbortSignal } = {},
): Promise<string> {
  const corpo = await enviar(
    "POST",
    `/api/app/perguntas/${encodeURIComponent(id)}/denuncia`,
    denuncia,
    opcoes,
  )
  return exigirTexto(exigirRegistro(corpo["denuncia"]), "id")
}

/**
 * Resolve a pergunta na resposta escolhida, resolve sem resposta ou reabre.
 *
 * Quem decide se pode é o banco (só a autoria). O que volta é o estado GRAVADO,
 * não o que a tela pediu: a tela mostra a resposta do servidor.
 */
export async function mudarResolucao(
  id: string,
  acao: AcaoDeResolucao,
  respostaId?: string,
  opcoes: { signal?: AbortSignal } = {},
): Promise<{ resolvida: boolean; resolvidaPorResposta: string | null }> {
  const corpo = await enviar(
    "POST",
    `/api/app/perguntas/${encodeURIComponent(id)}/resolucao`,
    respostaId === undefined ? { acao } : { acao, respostaId },
    opcoes,
  )
  return {
    resolvida: corpo["resolvida"] === true,
    resolvidaPorResposta: texto(corpo["resolvidaPorResposta"]),
  }
}
