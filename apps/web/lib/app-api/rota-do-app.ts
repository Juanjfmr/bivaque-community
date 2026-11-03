import { NextResponse } from "next/server"
import {
  avaliarEscrita,
  cabecalhosDeCors,
  cabecalhosDePreflight,
  origemPermitida,
  VALOR_DO_CABECALHO_DO_APP,
} from "./contrato"
import { resolverSessaoDaRequisicao, type SessaoDaRequisicao } from "./sessao-do-next"

/**
 * O encanamento comum das rotas `/api/app` (SPA ADR §5): origem, CSRF, CORS,
 * sessão e corpo. Cada rota escreve só o que é dela; o resto vem daqui, para
 * não existir uma cópia da regra por rota — foi assim que o primeiro lote
 * duplicou `origensPermitidas` e `responder` em três arquivos.
 */

export type Porta = "ok" | "origem-recusada" | "cabecalho-ausente"

export type SessaoAutenticada = Extract<SessaoDaRequisicao, { estado: "autenticada" }>

/** A origem da própria web entra sozinha (o app é servido em /app no mesmo domínio). */
export function origensPermitidas(request: Request): string[] {
  const doAmbiente = (process.env["BIVAQUE_APP_ORIGINS"] ?? "")
    .split(",")
    .map((origem) => origem.trim())
    .filter((origem) => origem !== "")
  return [new URL(request.url).origin, ...doAmbiente]
}

export function responder(
  request: Request,
  corpo: unknown,
  status: number,
  extras: Readonly<Record<string, string>> = {},
): NextResponse {
  return NextResponse.json(corpo, {
    status,
    headers: {
      "cache-control": "no-store",
      ...cabecalhosDeCors(request.headers.get("origin"), origensPermitidas(request)),
      ...extras,
    },
  })
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
  if (sessao.estado === "recusada") {
    return {
      ok: false,
      resposta: responder(request, { autenticado: false, motivo: sessao.sessao.motivo }, 401),
    }
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
