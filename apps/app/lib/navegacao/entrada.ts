import type { Aba } from "./rotas"

/**
 * A parte do app que viaja com cada entrada do histórico.
 *
 * O roteador é o único dono do histórico: este registro entra no estado da
 * entrada pela API do TanStack Router, nunca por `pushState` cru. Cada entrada
 * tem o seu — não existe origem nem filtro compartilhado entre entradas.
 */
export const CHAVE_DA_ENTRADA = "bivaqueEntrada"

// O roteador é quem guarda o estado da entrada; declarar o campo aqui é o jeito
// suportado de dizer que este registro viaja junto (o próprio roteador declara
// os campos internos dele do mesmo modo).
declare module "@tanstack/history" {
  interface HistoryState {
    bivaqueEntrada?: EstadoDaEntrada
  }
}

export type DescritorDeFoco =
  | { readonly tipo: "id"; readonly id: string }
  | { readonly tipo: "acao"; readonly acao: string; readonly valor: string }

/** Sobreposição aberta sobre a entrada: um diálogo, uma folha ou o menu Criar. */
export type Sobreposicao = "dialogo" | "folha" | "menu-criar"

export type EstadoDaEntrada = {
  readonly versao: 1
  /** Identidade da entrada; não muda quando só o estado dela é reescrito. */
  readonly chave: string
  readonly origem: Aba
  /** Nome da rota de onde a pessoa veio, quando veio de dentro do app. */
  readonly pai: string | null
  readonly rolagem: number
  readonly foco: DescritorDeFoco | null
  readonly filtros: Readonly<Record<string, string>>
  readonly sobreposicao: Sobreposicao | null
}

export type MudancaDaEntrada = {
  readonly origem?: Aba
  readonly pai?: string | null
  readonly rolagem?: number
  readonly foco?: DescritorDeFoco | null
  readonly filtros?: Readonly<Record<string, string>>
  readonly sobreposicao?: Sobreposicao | null
}

export type OpcoesDaEntradaPadrao = {
  readonly origem?: Aba
  readonly pai?: string | null
  readonly chave?: string
}

function novaChave(): string {
  const aleatorio = globalThis.crypto
  if (aleatorio && typeof aleatorio.randomUUID === "function") return aleatorio.randomUUID()
  return `entrada-${Math.random().toString(36).slice(2)}`
}

/** Identidade nova de entrada; uma sobreposição aberta é entrada própria. */
export function novaChaveDeEntrada(): string {
  return novaChave()
}

/**
 * Identidade de uma entrada que ainda não tem registro no histórico. É fixa, e
 * não sorteada: `lerEntrada` é chamada a cada leitura, e uma identidade diferente
 * por leitura faria a restauração reiniciar a cada re-render. O registro de
 * verdade é materializado uma vez, pelo roteador, com `materializarEntrada`.
 */
export const CHAVE_SEM_REGISTRO = "entrada-sem-registro"

export function entradaPadrao(opcoes: OpcoesDaEntradaPadrao = {}): EstadoDaEntrada {
  return {
    versao: 1,
    chave: opcoes.chave ?? novaChave(),
    origem: opcoes.origem ?? "inicio",
    pai: opcoes.pai ?? null,
    rolagem: 0,
    foco: null,
    filtros: {},
    sobreposicao: null,
  }
}

export const SOBREPOSICOES: readonly Sobreposicao[] = ["dialogo", "folha", "menu-criar"]

const ABAS: readonly Aba[] = ["inicio", "comunidade", "mercado", "voce"]

function comoRegistro(valor: unknown): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null ? (valor as Record<string, unknown>) : null
}

function lerDescritor(valor: unknown): DescritorDeFoco | null {
  const registro = comoRegistro(valor)
  if (!registro) return null
  const tipo = registro["tipo"]
  const id = registro["id"]
  const acao = registro["acao"]
  const marca = registro["valor"]
  if (tipo === "id" && typeof id === "string" && id !== "") {
    return { tipo: "id", id }
  }
  if (tipo === "acao" && typeof acao === "string" && acao !== "") {
    return { tipo: "acao", acao, valor: typeof marca === "string" ? marca : "" }
  }
  return null
}

function lerFiltros(valor: unknown): Record<string, string> {
  const registro = comoRegistro(valor)
  if (!registro) return {}
  const filtros: Record<string, string> = {}
  for (const [chave, entrada] of Object.entries(registro)) {
    if (typeof entrada === "string") filtros[chave] = entrada
  }
  return filtros
}

function lerSobreposicao(valor: unknown): Sobreposicao | null {
  return SOBREPOSICOES.includes(valor as Sobreposicao) ? (valor as Sobreposicao) : null
}

/**
 * Lê a entrada do estado da entrada do histórico. Campo inválido é descartado
 * campo a campo; sem registro válido, cai no padrão.
 */
export function lerEntrada(estado: unknown): EstadoDaEntrada {
  const registro = comoRegistro(estado)
  const bruto = comoRegistro(registro?.[CHAVE_DA_ENTRADA])
  if (!bruto || bruto["versao"] !== 1) return entradaPadrao({ chave: CHAVE_SEM_REGISTRO })

  const chave = bruto["chave"]
  const origem = bruto["origem"]
  const pai = bruto["pai"]
  const rolagem = bruto["rolagem"]

  return {
    versao: 1,
    chave: typeof chave === "string" && chave !== "" ? chave : CHAVE_SEM_REGISTRO,
    origem: ABAS.includes(origem as Aba) ? (origem as Aba) : "inicio",
    pai: typeof pai === "string" && pai !== "" ? pai : null,
    rolagem: typeof rolagem === "number" && rolagem >= 0 ? rolagem : 0,
    foco: lerDescritor(bruto["foco"]),
    filtros: lerFiltros(bruto["filtros"]),
    sobreposicao: lerSobreposicao(bruto["sobreposicao"]),
  }
}

/**
 * Diz se a entrada já foi materializada no histórico. Sem registro, `lerEntrada`
 * devolve um padrão com identidade nova a cada leitura — quem for navegar precisa
 * materializar uma vez antes, senão qualquer re-render reinicia a restauração.
 */
export function temEntrada(estado: unknown): boolean {
  const registro = comoRegistro(estado)
  const bruto = comoRegistro(registro?.[CHAVE_DA_ENTRADA])
  return bruto !== null && bruto["versao"] === 1
}

export function atualizarEntrada(
  atual: EstadoDaEntrada,
  mudanca: MudancaDaEntrada,
): EstadoDaEntrada {
  return {
    versao: 1,
    chave: atual.chave,
    origem: mudanca.origem ?? atual.origem,
    pai: mudanca.pai === undefined ? atual.pai : mudanca.pai,
    rolagem: mudanca.rolagem ?? atual.rolagem,
    foco: mudanca.foco === undefined ? atual.foco : mudanca.foco,
    filtros:
      mudanca.filtros === undefined ? atual.filtros : { ...atual.filtros, ...mudanca.filtros },
    sobreposicao: mudanca.sobreposicao === undefined ? atual.sobreposicao : mudanca.sobreposicao,
  }
}

export function descritorDaAcao(acao: string, valor: string): DescritorDeFoco {
  return { tipo: "acao", acao, valor }
}

export type ElementoDescritivel = {
  readonly id?: string
  getAttribute(nome: string): string | null
}

/** O descritor de foco do elemento que abriu a próxima tela. */
export function descritorDoElemento(elemento: ElementoDescritivel): DescritorDeFoco | null {
  const acao = elemento.getAttribute("data-acao")
  if (acao && acao !== "") {
    return { tipo: "acao", acao, valor: elemento.getAttribute("data-valor") ?? "" }
  }
  if (typeof elemento.id === "string" && elemento.id !== "") return { tipo: "id", id: elemento.id }
  return null
}

function escapar(valor: string): string {
  return valor.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

export function seletorDoDescritor(descritor: DescritorDeFoco): string {
  if (descritor.tipo === "id") return `#${descritor.id}`
  return `[data-acao="${escapar(descritor.acao)}"][data-valor="${escapar(descritor.valor)}"]`
}
