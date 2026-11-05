import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { padraoDoTermo, resolveTerm, termoBuscavel } from "../../../../lib/search/params"
import { cidadeDaSessao } from "../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const LIMITE = 20

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const params = new URL(request.url).searchParams
  const termo = resolveTerm((chave) => params.get(chave))
  if (!termoBuscavel(termo)) return responder(request, { erro: "parametro-invalido" }, 400)
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, auth.sessao.usuario.id)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const padrao = padraoDoTermo(termo)
    const [perguntas, grupos, anuncios, negocios, guia] = await Promise.all([
      client.rpc("list_indications", { p_locality_id: cidade.id, p_query: termo, p_limit: LIMITE }),
      client
        .from("groups")
        .select("id,name,group_memberships(count)")
        .eq("locality_id", cidade.id)
        .eq("is_deleted", false)
        .eq("group_memberships.status", "approved")
        .ilike("name", padrao)
        .order("name")
        .limit(LIMITE),
      client
        .from("listings")
        .select("id,title,kind,price_cents,neighborhood")
        .eq("locality_id", cidade.id)
        .eq("status", "active")
        .ilike("title", padrao)
        .order("created_at", { ascending: false })
        .limit(LIMITE),
      client.rpc("search_providers", { p_query: termo }),
      client
        .from("arrival_guide_entries")
        .select("id,name,description")
        .eq("locality_id", cidade.id)
        .eq("status", "approved")
        .ilike("name", padrao)
        .order("name")
        .limit(LIMITE),
    ])
    if ([perguntas, grupos, anuncios, negocios, guia].some((resultado) => resultado.error)) {
      throw new Error("leitura indisponível")
    }
    return responder(
      request,
      {
        cidade: cidade.nome,
        perguntas: (perguntas.data ?? []).map((linha) => ({
          id: linha.id,
          title: linha.title,
          reply_count: linha.reply_count,
          is_resolved: linha.is_resolved,
          group_name: linha.group_name,
        })),
        grupos: (grupos.data ?? []).map((linha) => ({
          id: linha.id,
          name: linha.name,
          members: linha.group_memberships?.[0]?.count ?? 0,
        })),
        anuncios: anuncios.data ?? [],
        negocios: (negocios.data ?? []).slice(0, LIMITE).map((linha) => ({
          id: linha.id,
          display_name: linha.display_name,
          category: linha.category,
        })),
        guia: guia.data ?? [],
      },
      200,
    )
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
