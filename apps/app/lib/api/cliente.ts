/**
 * O cliente único do app para `/api/app/*` (ADR-20261105 §1).
 *
 * O app é servido em `/app` pelo mesmo Next, então a sessão é o cookie e vai
 * sozinha (`credentials: "include"`). A sessão nativa será tratada em outro lote.
 *
 * Três decisões que este arquivo existe para garantir:
 *
 * - **cabeçalho do app em toda chamada**: o servidor recusa escrita por cookie
 *   sem `x-bivaque-app` (CSRF), e mais ninguém manda esse cabeçalho;
 * - **sem retentativa em escrita**: repetir um POST duplica a pergunta e a
 *   presença. Quem decide repetir é a tela, com o botão na frente;
 * - **erro tipado**: a tela decide pelo `codigo`, nunca pelo texto da resposta.
 *
 * O corpo de erro do servidor é `{ erro, mensagem? }`: `erro` é o código curto
 * que a tela ramifica (`de-outra-cidade`, `nao-organiza`, `sem-cidade`, …) e
 * `mensagem` é o texto pronto para a pessoa, quando o servidor tem um.
 */

import { Capacitor } from "@capacitor/core"
import { acessoAtual, origemDaApi, renovarSessao } from "@/lib/nativo/sessao"

const enderecoInicial =
  typeof window === "undefined"
    ? null
    : {
        caminho: window.location.pathname,
        busca: window.location.search,
      }

let encaminhouParaEntrada = false

export const CABECALHOS_DO_APP: Readonly<Record<string, string>> = {
  "x-bivaque-app": "bivaque-spa",
}

export type CodigoDeFalha =
  | "rede"
  | "sem-sessao"
  | "recusado"
  | "nao-encontrado"
  | "invalido"
  | "conflito"
  | "limite"
  | "indisponivel"

const POR_STATUS: Readonly<Record<number, CodigoDeFalha>> = {
  400: "invalido",
  401: "sem-sessao",
  403: "recusado",
  404: "nao-encontrado",
  409: "conflito",
  429: "limite",
  503: "indisponivel",
}

export class FalhaDaApi extends Error {
  readonly status: number
  readonly codigo: CodigoDeFalha
  /** Código curto que o servidor mandou (`erro`), quando mandou. */
  readonly motivoDoServidor: string | null
  /** Texto que o servidor preparou para a pessoa, quando preparou. */
  readonly mensagem: string | null

  constructor(
    codigo: CodigoDeFalha,
    status: number,
    motivoDoServidor: string | null = null,
    mensagem: string | null = null,
  ) {
    super(`api: ${codigo} (${status})`)
    this.name = "FalhaDaApi"
    this.codigo = codigo
    this.status = status
    this.motivoDoServidor = motivoDoServidor
    this.mensagem = mensagem
  }
}

function textoOuNulo(corpo: Record<string, unknown>, chave: string): string | null {
  const valor = corpo[chave]
  return typeof valor === "string" && valor.trim() !== "" ? valor : null
}

function falhaDe(status: number, corpo: Record<string, unknown>): FalhaDaApi {
  // 500 e qualquer status não mapeado são indisponibilidade: o servidor caiu ou
  // respondeu algo que este cliente não conhece. Só 400 é "o pedido está errado".
  const codigo = POR_STATUS[status] ?? "indisponivel"
  return new FalhaDaApi(codigo, status, textoOuNulo(corpo, "erro"), textoOuNulo(corpo, "mensagem"))
}

async function interpretar(
  resposta: Response,
  redirecionar = true,
): Promise<Record<string, unknown>> {
  const lido = (await resposta.json().catch(() => ({}))) as unknown
  const dados =
    lido !== null && typeof lido === "object" && !Array.isArray(lido)
      ? (lido as Record<string, unknown>)
      : {}
  if (
    redirecionar &&
    resposta.status === 401 &&
    typeof window !== "undefined" &&
    !encaminhouParaEntrada &&
    !window.location.pathname.startsWith("/app/entrar")
  ) {
    encaminhouParaEntrada = true
    const entrada = new URL("/app/entrar", window.location.origin)
    const busca =
      window.location.search ||
      (enderecoInicial?.caminho === window.location.pathname ? enderecoInicial.busca : "")
    entrada.searchParams.set("redirect", `${window.location.pathname}${busca}`)
    window.location.assign(entrada.href)
  }
  if (!resposta.ok) throw falhaDe(resposta.status, dados)
  return dados
}

async function comRede(
  fazer: () => Promise<Response>,
  redirecionar = true,
): Promise<Record<string, unknown>> {
  let resposta: Response
  try {
    resposta = await fazer()
  } catch (erro: unknown) {
    // Abortar é decisão de quem chamou, não falha de rede: o erro sobe inteiro.
    if (erro instanceof DOMException && erro.name === "AbortError") throw erro
    throw new FalhaDaApi("rede", 0)
  }
  return interpretar(resposta, redirecionar)
}

export async function requisitar(caminho: string, init: RequestInit = {}): Promise<Response> {
  if (!Capacitor.isNativePlatform()) return fetch(caminho, init)
  const publica = caminho.startsWith("/api/app/entry/") || caminho.startsWith("/api/localities")
  const origem = origemDaApi()
  const token = await acessoAtual()
  const fazer = (credencial: string | null) => {
    const headers = new Headers(init.headers)
    headers.set("x-bivaque-app", "bivaque-spa")
    headers.set("x-bivaque-cliente", "loja")
    if (credencial) headers.set("Authorization", `Bearer ${credencial}`)
    return fetch(`${origem}${caminho}`, { ...init, headers, credentials: "omit" })
  }
  const resposta = await fazer(token)
  if (resposta.status === 401 && (init.method ?? "GET") === "GET" && !publica) {
    const novo = await renovarSessao()
    if (novo) return fazer(novo)
  }
  return resposta
}

async function chamar(
  metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  caminho: string,
  corpo: unknown,
  signal: AbortSignal | undefined,
): Promise<Record<string, unknown>> {
  return comRede(
    () =>
      requisitar(caminho, {
        method: metodo,
        credentials: "include",
        headers:
          corpo === undefined
            ? CABECALHOS_DO_APP
            : { ...CABECALHOS_DO_APP, "content-type": "application/json" },
        ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
        ...(signal === undefined ? {} : { signal }),
      }),
    !Capacitor.isNativePlatform() || metodo === "GET",
  )
}

/** Leitura. Pode ser repetida por quem chama (o "Tentar de novo" da tela). */
export function ler(caminho: string, opcoes: { signal?: AbortSignal } = {}) {
  return chamar("GET", caminho, undefined, opcoes.signal)
}

/**
 * Escrita. Nunca repetida pelo cliente: um POST repetido vira duas perguntas.
 * `DELETE` não leva corpo, e um corpo `undefined` não manda `content-type`.
 */
export function enviar(
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  caminho: string,
  corpo?: unknown,
  opcoes: { signal?: AbortSignal } = {},
) {
  return chamar(metodo, caminho, corpo, opcoes.signal)
}

/**
 * Escrita de arquivo (multipart). O `content-type` é do navegador — com
 * `boundary` —, então não entra cabeçalho de JSON; o resto do tratamento de
 * resposta é o mesmo de `enviar`.
 */
export function enviarFormulario(
  caminho: string,
  formulario: FormData,
  opcoes: { signal?: AbortSignal } = {},
) {
  return comRede(
    () =>
      requisitar(caminho, {
        method: "POST",
        credentials: "include",
        headers: CABECALHOS_DO_APP,
        body: formulario,
        ...(opcoes.signal === undefined ? {} : { signal: opcoes.signal }),
      }),
    !Capacitor.isNativePlatform(),
  )
}
