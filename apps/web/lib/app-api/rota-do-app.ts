import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { createServerClient } from "../supabase/server"
import {
  avaliarEscrita,
  cabecalhosDeCors,
  cabecalhosDePreflight,
  origemPermitida,
  VALOR_DO_CABECALHO_DO_APP,
} from "./contrato"
import {
  type CookieParaGravar,
  resolverSessaoDaRequisicao,
  type SessaoDaRequisicao,
} from "./sessao-do-next"

/**
 * O encanamento comum das rotas `/api/app` (SPA ADR §5): origem, CSRF, CORS,
 * sessão e corpo. Cada rota escreve só o que é dela; o resto vem daqui, para
 * não existir uma cópia da regra por rota — foi assim que o primeiro lote
 * duplicou `origensPermitidas` e `responder` em três arquivos.
 */

export type Porta = "ok" | "origem-recusada" | "cabecalho-ausente"

export type SessaoAutenticada = Extract<SessaoDaRequisicao, { estado: "autenticada" }>

/**
 * As origens aceitas numa escrita por cookie: a do próprio pedido e as da
 * lista explícita do ambiente.
 *
 * A origem do pedido também vem do `Host` que a plataforma entregou, não só de
 * `new URL(request.url).origin`: em execução local o Next normaliza o host do
 * `url` para `localhost` mesmo quando o navegador abriu `127.0.0.1`, e o
 * `Origin` do navegador é o endereço real da barra. Comparar `Origin` com o
 * `Host` é a checagem de mesma origem; usar só o `url` recusava uma origem
 * legítima. O `x-forwarded-proto` da borda define o esquema quando existe.
 */
export function origensPermitidas(request: Request): string[] {
  const doAmbiente = (process.env["BIVAQUE_APP_ORIGINS"] ?? "")
    .split(",")
    .map((origem) => origem.trim())
    .filter((origem) => origem !== "")
  const doPedido = new URL(request.url).origin
  return [...new Set([doPedido, origemDoPedido(request), ...doAmbiente])]
}

/**
 * A origem que o navegador abriu, reconstruída do `Host` que a plataforma
 * entregou e do `x-forwarded-proto` da borda. É ela — nunca um domínio fixo —
 * que o OAuth usa no `redirectTo`: o callback volta ao mesmo endereço que
 * iniciou o fluxo, seja local, prévia ou produção. Sem `Host`, vale a origem do
 * `url` do pedido.
 */
export function origemDoPedido(request: Request): string {
  const host = request.headers.get("host")
  if (host === null || host === "") return new URL(request.url).origin
  const protocolo =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    new URL(request.url).protocol.replace(":", "")
  return `${protocolo}://${host}`
}

/**
 * Cookies renovados por requisição. `exigirSessao` registra a lista e
 * `responder` a aplica em QUALQUER resposta daquela requisição — inclusive as de
 * recusa e erro: o token renovado já foi consumido no GoTrue (a rotação invalida
 * o antigo), então perdê-lo por um 400 deixaria a pessoa sem sessão.
 */
const cookiesDaRequisicao = new WeakMap<Request, readonly CookieParaGravar[]>()

/** Grava na resposta os cookies que o `@supabase/ssr` pediu (opções do callback). */
export function aplicarCookies(
  resposta: NextResponse,
  cookies: readonly CookieParaGravar[],
): NextResponse {
  for (const cookie of cookies) {
    if (cookie.options === undefined) {
      resposta.cookies.set(cookie.name, cookie.value)
    } else {
      resposta.cookies.set(cookie.name, cookie.value, cookie.options as never)
    }
  }
  return resposta
}

export function responder(
  request: Request,
  corpo: unknown,
  status: number,
  extras: Readonly<Record<string, string>> = {},
): NextResponse {
  const resposta = NextResponse.json(corpo, {
    status,
    headers: {
      "cache-control": "no-store",
      ...cabecalhosDeCors(request.headers.get("origin"), origensPermitidas(request)),
      ...extras,
    },
  })
  return aplicarCookies(resposta, cookiesDaRequisicao.get(request) ?? [])
}

/**
 * O cliente de serviço (`service_role`), ou `null` quando o servidor não tem a
 * configuração. A rota responde 503 em vez de deixar o `throw` virar 500: falta
 * de variável de ambiente é serviço fora, não erro do pedido.
 */
export function clienteDeServicoOuNulo(): SupabaseClient<Database> | null {
  try {
    return createServerClient()
  } catch {
    return null
  }
}

/** A resposta de serviço fora, a mesma em toda rota. */
export function respostaIndisponivel(request: Request): NextResponse {
  return responder(request, { erro: "indisponivel" }, 503)
}

export function opcoesDoApp(request: Request): NextResponse {
  const cabecalhos = cabecalhosDePreflight(
    request.headers.get("origin"),
    origensPermitidas(request),
  )
  if (Object.keys(cabecalhos).length === 0) {
    return new NextResponse(null, { status: 403, headers: { "cache-control": "no-store" } })
  }
  return new NextResponse(null, {
    status: 204,
    headers: { "cache-control": "no-store", ...cabecalhos },
  })
}

/**
 * A porta do app para rota sem sessão (envio de código) ou com sessão resolvida
 * (escrita). Origem presente fora da lista é recusa; ausência é cliente nativo.
 */
export function conferirPorta(request: Request, via: "cookie" | "bearer"): Porta {
  const origem = request.headers.get("origin")
  if (origem !== null && !origemPermitida(origem, origensPermitidas(request))) {
    return "origem-recusada"
  }
  if (via === "cookie" && request.headers.get("x-bivaque-app") !== VALOR_DO_CABECALHO_DO_APP) {
    return "cabecalho-ausente"
  }
  return "ok"
}

export type SessaoOuRecusa =
  | { readonly ok: true; readonly sessao: SessaoAutenticada }
  | { readonly ok: false; readonly resposta: NextResponse }

/** Resolve a sessão e já devolve a resposta 401 pronta quando não há. */
export async function exigirSessao(request: Request): Promise<SessaoOuRecusa> {
  const sessao = await resolverSessaoDaRequisicao(
    request as unknown as Parameters<typeof resolverSessaoDaRequisicao>[0],
  )
  if (sessao.estado === "indisponivel") {
    return { ok: false, resposta: respostaIndisponivel(request) }
  }
  if (sessao.estado === "recusada") {
    return {
      ok: false,
      resposta: responder(request, { autenticado: false, motivo: sessao.sessao.motivo }, 401),
    }
  }
  if (sessao.cookiesParaGravar !== undefined && sessao.cookiesParaGravar.length > 0) {
    cookiesDaRequisicao.set(request, sessao.cookiesParaGravar)
  }
  return { ok: true, sessao }
}

export type CorpoLido =
  | { readonly ok: true; readonly corpo: Record<string, unknown> }
  | { readonly ok: false; readonly status: 400 | 413 }

/** Lê JSON com teto de tamanho; o corpo é sempre objeto. */
export async function lerCorpoJson(request: Request, maximo = 32 * 1024): Promise<CorpoLido> {
  try {
    const texto = await request.text()
    if (texto.length > maximo) return { ok: false, status: 413 }
    const bruto = JSON.parse(texto) as unknown
    if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
      return { ok: false, status: 400 }
    }
    return { ok: true, corpo: bruto as Record<string, unknown> }
  } catch {
    return { ok: false, status: 400 }
  }
}

/** CSRF da escrita: cookie exige origem na lista e o cabeçalho do app. */
export function conferirEscrita(request: Request, via: "cookie" | "bearer"): Porta {
  const veredito = avaliarEscrita({
    via,
    origem: request.headers.get("origin"),
    cabecalhoDoApp: request.headers.get("x-bivaque-app"),
    origensPermitidas: origensPermitidas(request),
  })
  return veredito.ok ? "ok" : veredito.motivo
}
