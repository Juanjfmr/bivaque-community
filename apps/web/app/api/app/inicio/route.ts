import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { cidadeDaSessao } from "../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TAMANHO = 20

type Cliente = SupabaseClient<Database>

/**
 * Os grupos da cidade dos quais a pessoa participa, com a contagem de membros.
 * Tudo sob a RLS da sessão: só aparece o que a própria pessoa já enxerga.
 */
async function gruposDaPessoa(client: Cliente, userId: string, cidadeId: string) {
  const minhas = await client
    .from("group_memberships")
    .select("group_id")
    .eq("user_id", userId)
    .eq("status", "approved")
  if (minhas.error) throw minhas.error
  const ids = (minhas.data ?? []).map((linha) => linha.group_id)
  if (ids.length === 0) return []
  const grupos = await client
    .from("groups")
    .select("id,name,group_memberships(count)")
    .in("id", ids)
    .eq("locality_id", cidadeId)
    .eq("is_deleted", false)
    .eq("group_memberships.status", "approved")
    .order("name")
    .limit(TAMANHO)
  if (grupos.error) throw grupos.error
  return (grupos.data ?? []).map((grupo) => ({
    id: grupo.id,
    name: grupo.name,
    members: grupo.group_memberships?.[0]?.count ?? 0,
  }))
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const valor = new URL(request.url).searchParams.get("pagina")
  const pagina = valor === null ? 1 : Number(valor)
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100) {
    return responder(request, { erro: "parametro-invalido" }, 400)
  }
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, auth.sessao.usuario.id)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const inicio = (pagina - 1) * TAMANHO
    const fim = inicio + TAMANHO
    // Negócios e grupos não têm paginação própria: vêm só na primeira página.
    const primeira = pagina === 1
    const [perguntas, eventos, anuncios, negocios, grupos] = await Promise.all([
      // A RPC já esconde as perguntas que a própria pessoa ocultou (hidden_questions).
      client.rpc("list_indications", {
        p_locality_id: cidade.id,
        p_resolved: false,
        p_limit: TAMANHO + 1,
        p_offset: inicio,
      }),
      client
        .from("events")
        .select("id,title,venue,starts_at")
        .eq("locality_id", cidade.id)
        .eq("status", "upcoming")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .order("id", { ascending: true })
        .range(inicio, fim),
      client
        .from("listings")
        .select("id,title,kind,price_cents,neighborhood")
        .eq("locality_id", cidade.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(inicio, fim),
      // O alcance de cada negócio é decidido dentro da RPC (can_see_provider).
      primeira ? client.rpc("search_providers") : Promise.resolve({ data: [], error: null }),
      primeira ? gruposDaPessoa(client, auth.sessao.usuario.id, cidade.id) : Promise.resolve([]),
    ])
    if (perguntas.error || eventos.error || anuncios.error || negocios.error) {
      throw new Error("leitura indisponível")
    }
    const listas = [perguntas.data ?? [], eventos.data ?? [], anuncios.data ?? []] as const
    return responder(
      request,
      {
        cidade: cidade.nome,
        perguntas: listas[0].slice(0, TAMANHO).map((linha) => ({
          id: linha.id,
          title: linha.title,
          reply_count: linha.reply_count,
          is_resolved: linha.is_resolved,
          group_name: linha.group_name,
        })),
        eventos: listas[1].slice(0, TAMANHO),
        anuncios: listas[2].slice(0, TAMANHO),
        negocios: (negocios.data ?? []).slice(0, TAMANHO).map((linha) => ({
          id: linha.id,
          display_name: linha.display_name,
          category: linha.category,
        })),
        grupos,
        proximo: listas.some((lista) => lista.length > TAMANHO) ? pagina + 1 : null,
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
