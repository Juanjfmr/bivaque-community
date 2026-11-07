import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { log } from "../../../../lib/logger"
import {
  type AvisoDoBanco,
  destinoDoAviso,
  rotuloDoAviso,
} from "../../../../lib/notifications/destino-do-app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_PADRAO = 20
const LIMITE_MAXIMO = 50

/**
 * Os avisos do próprio membro (F09), pela caixa que a web antiga usa
 * (`public.notifications`, RLS por destinatário).
 *
 * A pessoa vem da sessão: `recipient_user_id` nunca é lido da query nem do
 * corpo. A cidade não entra — aviso é pessoal.
 *
 * A contagem de não lidos é sempre do destinatário inteiro, e não da página:
 * o contador da casca não pode divergir da lista quando ela passa de uma
 * página. Falha de leitura é 503, nunca lista vazia.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const url = new URL(request.url)

  const brutoFiltro = url.searchParams.get("filtro")
  const filtro = brutoFiltro ?? "todas"
  const brutoDepois = url.searchParams.get("depois")
  const depois = brutoDepois === null ? 0 : Number(brutoDepois)
  const brutoLimite = url.searchParams.get("limite")
  const limite = brutoLimite === null ? LIMITE_PADRAO : Number(brutoLimite)
  if (
    (filtro !== "todas" && filtro !== "nao-lidas") ||
    !Number.isInteger(depois) ||
    depois < 0 ||
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > LIMITE_MAXIMO
  ) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    let consulta = client
      .from("notifications")
      .select("id,type,action,target_type,target_id,actor_user_id,read_at,created_at")
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .range(depois, depois + limite - 1)
    if (filtro === "nao-lidas") consulta = consulta.is("read_at", null)

    const [pagina, contagem] = await Promise.all([
      consulta,
      client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", userId)
        .is("read_at", null),
    ])
    if (pagina.error) throw pagina.error
    if (contagem.error) throw contagem.error

    const linhas = pagina.data ?? []
    const avisos = linhas.map((linha) => {
      const aviso: AvisoDoBanco = {
        id: linha.id,
        tipo: linha.type,
        acao: linha.action,
        alvoTipo: linha.target_type,
        alvoId: linha.target_id,
        atorId: linha.actor_user_id,
        lida: linha.read_at !== null,
        criadaEm: linha.created_at,
      }
      return {
        id: aviso.id,
        tipo: aviso.tipo,
        texto: rotuloDoAviso(aviso),
        destino: destinoDoAviso(aviso),
        lida: aviso.lida,
        criadaEm: aviso.criadaEm,
      }
    })

    return responder(
      request,
      {
        avisos,
        proximo: linhas.length === limite ? String(depois + limite) : null,
        naoLidos: contagem.count ?? 0,
      },
      200,
    )
  } catch (error) {
    log.error("app avisos: read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
