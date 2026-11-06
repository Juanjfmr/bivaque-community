import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { cidadeDaSessao, ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * O verbete do guia (F08).
 *
 * A leitura é nacional (migration 20260925161111): referência aprovada de outra
 * cidade abre com 200. A escrita não é — salvar e sugerir exigem a cidade da
 * sessão, então a resposta já diz que não dá (`podeSalvar`, `podeSugerir`) em
 * vez de deixar a tela oferecer um botão que a RLS recusaria. Entrada pendente
 * na curadoria continua 404: ela não é legível e um 403 confirmaria que existe.
 *
 * `podeSugerir` só é verdadeiro quando a referência é da cidade de quem lê e há
 * artigo publicado que a sugestão possa referenciar.
 */
export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "entrada-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const result = await client
      .from("arrival_guide_entries")
      .select("id,category,name,description,website_url,phone,locality_id")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle()
    if (result.error) throw result.error
    if (!result.data) return responder(request, { erro: "entrada-nao-encontrada" }, 404)

    const [cidade, salvo, artigo] = await Promise.all([
      cidadeDaSessao(client, userId),
      client.from("guide_entry_saves").select("entry_id").eq("entry_id", id).maybeSingle(),
      client
        .from("guide_articles")
        .select("id")
        .eq("entry_id", id)
        .eq("status", "published")
        .maybeSingle(),
    ])
    if (salvo.error) throw salvo.error
    if (artigo.error) throw artigo.error
    const daCidade = cidade !== null && result.data.locality_id === cidade.id

    return responder(
      request,
      {
        entrada: {
          id: result.data.id,
          categoria: result.data.category,
          nome: result.data.name,
          descricao: result.data.description,
          site: result.data.website_url,
          telefone: result.data.phone,
          salvo: salvo.data !== null,
        },
        podeSalvar: daCidade,
        podeSugerir: daCidade && artigo.data !== null,
      },
      200,
    )
  } catch (error) {
    log.error("app guia: entry read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
