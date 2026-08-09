/**
 * Health probe do Portal da Transparência — usado pelo operador no check
 * diário (runbook §9) no lugar do teste manual com a chave de produção.
 *
 * Faz UMA requisição mínima ao Portal e devolve apenas um enum. Nunca
 * devolve a chave, o corpo da resposta do Portal, nem qualquer CPF — o
 * operador precisa saber se a chave está válida e o Portal responde, nada
 * além disso.
 *
 * Os nomes dos status são os mesmos que o runbook §4 já cataloga
 * (INVALID_KEY, TIMEOUT, RATE_LIMITED, HTTP_ERROR, SCHEMA_DRIFT) para que o
 * operador não precise traduzir entre o probe e a tabela de diagnóstico.
 */

export type PortalHealthStatus =
  | "ok"
  | "invalid_key"
  | "rate_limited"
  | "timeout"
  | "http_error"
  | "schema_drift"

const PORTAL_BASE_URL = "https://api.portaldatransparencia.gov.br"
const PORTAL_PROBE_TIMEOUT_MS = 10_000

/**
 * Classifica o resultado de uma requisição mínima ao Portal.
 *
 * `statusCode` é o status HTTP; `body` é o corpo já desserializado (ou
 * undefined quando a resposta não é JSON). Um corpo que não seja array é
 * `schema_drift`: o Portal respondeu 2xx com um formato que o produto não
 * sabe ler — exatamente o que o §4 manda investigar sem alterar o
 * classificador.
 */
export function classifyPortalProbe(statusCode: number, body: unknown): PortalHealthStatus {
  if (statusCode === 401) return "invalid_key"
  if (statusCode === 429) return "rate_limited"
  if (statusCode < 200 || statusCode >= 300) return "http_error"
  if (!Array.isArray(body)) return "schema_drift"
  return "ok"
}

/**
 * Sonda o Portal com a chave fornecida. Não lança: qualquer falha vira um
 * status do enum. `apiKey` vazia é `invalid_key` sem rede — o operador vê o
 * problema de configuração sem depender de um 401 externo.
 */
export async function probePortal(apiKey: string): Promise<PortalHealthStatus> {
  if (!apiKey) return "invalid_key"

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PORTAL_PROBE_TIMEOUT_MS)

  try {
    const response = await fetch(`${PORTAL_BASE_URL}/api-de-dados/servidores`, {
      headers: {
        "chave-api-dados": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    })

    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }

    return classifyPortalProbe(response.status, body)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return "timeout"
    }
    return "http_error"
  } finally {
    clearTimeout(timeoutId)
  }
}
