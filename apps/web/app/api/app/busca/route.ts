import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { resolveTerm, termoValido } from "../../../../lib/search/params"
import { cidadeDaSessao } from "../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const LIMITE = 20

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const params = new URL(request.url).searchParams
  const termo = resolveTerm((chave) => params.get(chave))
  if (!termoValido(termo)) return responder(request, { erro: "parametro-invalido" }, 400)
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, auth.sessao.usuario.id)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const padrao = `%${termo.replace(/[\\%_]/g, "\\$&")}%`
    const [perguntas, grupos, anuncios, negocios, guia] = await Promise.all([
      client.rpc("list_indications", { p_locality_id: cidade.id, p_query: termo, p_limit: LIMITE }),
      client
        .from("groups")
        .select("id,name,description")
        .eq("locality_id", cidade.id)
        .eq("is_deleted", false)
        .ilike("name", padrao)
        .order("name")
        .limit(LIMITE),
      client
        .from("listings")
        .select("id,title,kind,price_cents,neighborhood,description,status")
        .eq("locality_id", cidade.id)
        .eq("status", "active")
        .ilike("title", padrao)
        .order("created_at", { ascending: false })
        .limit(LIMITE),
      client.rpc("search_providers", { p_query: termo }),
      client
        .from("arrival_guide_entries")
        .select("id,name,description,category")
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
        perguntas: perguntas.data ?? [],
        grupos: grupos.data ?? [],
        anuncios: anuncios.data ?? [],
        negocios: (negocios.data ?? []).slice(0, LIMITE),
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
