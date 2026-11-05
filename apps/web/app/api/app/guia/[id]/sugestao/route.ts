import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { sugestaoDoCorpo } from "../../../../../../lib/guide/app-guia"
import { log } from "../../../../../../lib/logger"
import { ehUuid, interpretarErroDoBanco } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * "Sugerir atualização" de um verbete (F08).
 *
 * Sugerir NÃO publica: cria uma linha em `guide_correction_requests`, com o
 * solicitante vindo da sessão e o artigo achado no banco. A curadoria decide
 * depois, como na web antiga (a mesma tabela e a mesma policy).
 *
 * Sem artigo publicado a sugestão não tem onde pousar; a rota diz isso em vez
 * de gravar uma linha órfã.
 */
export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "entrada-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Envie a sugestão em JSON." },
      400,
    )
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const sugestao = sugestaoDoCorpo(lido.corpo)
  if (sugestao === null) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Descreva o que precisa mudar neste verbete." },
      400,
    )
  }
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const entrada = await client
      .from("arrival_guide_entries")
      .select("id")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle()
    if (entrada.error) throw entrada.error
    if (!entrada.data) return responder(request, { erro: "entrada-nao-encontrada" }, 404)

    const artigo = await client
      .from("guide_articles")
      .select("id")
      .eq("entry_id", id)
      .eq("status", "published")
      .maybeSingle()
    if (artigo.error) throw artigo.error
    if (!artigo.data) {
      return responder(
        request,
        {
          erro: "sem-artigo",
          mensagem: "Esta referência ainda não tem ficha publicada para atualizar.",
        },
        400,
      )
    }

    const result = await client
      .from("guide_correction_requests")
      .insert({
        article_id: artigo.data.id,
        requester_id: userId,
        description: sugestao.descricao,
        reference_text: sugestao.referencia,
      })
      .select("id")
      .single()
    if (result.error) {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Só quem mora nesta cidade pode sugerir atualização.",
        dados: "Revise a sugestão: algo não é aceito.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw result.error
    }
    if (!result.data) throw new Error("insert without result")
    return responder(request, { sugestao: { id: result.data.id } }, 201)
  } catch (error) {
    log.error("app guia: suggestion failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
