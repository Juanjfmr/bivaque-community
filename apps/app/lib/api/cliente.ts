/**
 * O cliente único do app para `/api/app/*` (ADR-20261105 §1).
 *
 * O app é servido em `/app` pelo mesmo Next, então a sessão é o cookie e vai
 * sozinha (`credentials: "include"`). O app de loja usa este mesmo caminho
 * enquanto a ponte de token não existir.
 *
 * Três decisões que este arquivo existe para garantir:
 *
 * - **cabeçalho do app em toda chamada**: o servidor recusa escrita por cookie
 *   sem `x-bivaque-app` (CSRF), e mais ninguém manda esse cabeçalho;
 * - **sem retentativa em escrita**: repetir um POST duplica a pergunta e a
 *   presença. Quem decide repetir é a tela, com o botão na frente;
 * - **erro tipado**: a tela decide pelo `status`, nunca pelo texto da resposta.
 */

export const CABECALHOS_DO_APP: Readonly<Record<string, string>> = {
  "x-bivaque-app": "bivaque-spa",
}

export type CodigoDeFalha =
  | "rede"
  | "sem-sessao"
  | "recusado"
  | "nao-encontrado"
  | "conflito"
  | "limite"
  | "indisponivel"

const POR_STATUS: Readonly<Record<number, CodigoDeFalha>> = {
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
  /** Texto que o servidor mandou para a pessoa, quando mandou. */
  readonly mensagem: string | null

  constructor(codigo: CodigoDeFalha, status: number, mensagem: string | null = null) {
    super(`api: ${codigo} (${status})`)
    this.name = "FalhaDaApi"
    this.codigo = codigo
    this.status = status
    this.mensagem = mensagem
  }
}

function textoOuNulo(corpo: Record<string, unknown>, chave: string): string | null {
  const valor = corpo[chave]
  return typeof valor === "string" && valor.trim() !== "" ? valor : null
}

function falhaDe(status: number, corpo: Record<string, unknown>): FalhaDaApi {
  const codigo = POR_STATUS[status] ?? "indisponivel"
  return new FalhaDaApi(codigo, status, textoOuNulo(corpo, "mensagem"))
}

async function chamar(
  metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  caminho: string,
  corpo: unknown,
  signal: AbortSignal | undefined,
): Promise<Record<string, unknown>> {
  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      credentials: "include",
      headers:
        corpo === undefined
          ? CABECALHOS_DO_APP
          : { ...CABECALHOS_DO_APP, "content-type": "application/json" },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      ...(signal === undefined ? {} : { signal }),
    })
  } catch (erro: unknown) {
    // Abortar é decisão de quem chamou, não falha de rede: o erro sobe inteiro.
    if (erro instanceof DOMException && erro.name === "AbortError") throw erro
    throw new FalhaDaApi("rede", 0)
  }

  const lido = (await resposta.json().catch(() => ({}))) as unknown
  const dados =
    lido !== null && typeof lido === "object" && !Array.isArray(lido)
      ? (lido as Record<string, unknown>)
      : {}

  if (!resposta.ok) throw falhaDe(resposta.status, dados)
  return dados
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
