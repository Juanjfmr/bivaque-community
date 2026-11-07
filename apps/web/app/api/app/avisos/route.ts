import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { log } from "../../../../lib/logger"
import {
  type AlvoDaDenuncia,
  type AvisoDoBanco,
  destinoDoAviso,
  rotuloDoAviso,
} from "../../../../lib/notifications/destino-do-app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_PADRAO = 20
const LIMITE_MAXIMO = 50

/** A linha agrupada como o app a recebe. */
type LinhaDeAviso = {
  id: string
  tipo: string
  texto: string
  destino: string
  lida: boolean
  criadaEm: string
  grupo: string
  total: number
}

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

    // Avisos agrupados (ADR-20261107 item 3): mesmo tipo, ação e alvo viram uma
    // linha só — a mais recente, com a contagem. A chave do grupo viaja opaca na
    // resposta: quem marca lido devolve a chave e o servidor marca o grupo todo.
    // shortcut: o agrupamento é dentro da página lida; um grupo que cruza a
    // borda da página aparece uma vez em cada página com a contagem parcial.
    const linhas = pagina.data ?? []

    // Denúncia analisada aponta para a linha do report, que não é tela no app.
    // O conteúdo denunciado vem da própria denúncia — leitura pelo cliente da
    // sessão, RLS reporter-only; nada aqui alcança denúncia alheia nem revela
    // quem denunciou. Sem alvo (linha ausente ou consulta falhou), o destino
    // degrada para a tela segura: a caixa de avisos não para por causa dele.
    const alvosDaDenuncia = new Map<string, AlvoDaDenuncia>()
    const idsDeDenuncia = [
      ...new Set(
        linhas.filter((linha) => linha.type === "report_resolved").map((linha) => linha.target_id),
      ),
    ]
    if (idsDeDenuncia.length > 0) {
      const denuncias = await client
        .from("reports")
        .select("id,target_type,target_id")
        .in("id", idsDeDenuncia)
      if (denuncias.error) {
        log.error("app avisos: report targets unreadable", {
          error: denuncias.error.message ?? "unknown",
          userId,
        })
      }
      for (const denuncia of denuncias.data ?? []) {
        alvosDaDenuncia.set(denuncia.id, {
          alvoTipo: denuncia.target_type,
          alvoId: denuncia.target_id,
        })
      }
    }

    const grupos = new Map<string, LinhaDeAviso>()
    for (const linha of linhas) {
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
      const chave = `${aviso.tipo}|${aviso.acao}|${aviso.alvoTipo}|${aviso.alvoId}`
      const existente = grupos.get(chave)
      if (existente === undefined) {
        grupos.set(chave, {
          id: aviso.id,
          tipo: aviso.tipo,
          texto: rotuloDoAviso(aviso),
          destino: destinoDoAviso(aviso, alvosDaDenuncia.get(aviso.alvoId) ?? null),
          lida: aviso.lida,
          criadaEm: aviso.criadaEm,
          grupo: chave,
          total: 1,
        })
      } else {
        existente.total += 1
        if (!aviso.lida) existente.lida = false
      }
    }
    const avisos = [...grupos.values()]

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
