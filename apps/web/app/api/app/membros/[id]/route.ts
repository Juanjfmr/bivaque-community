import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { callProfileBioRpc } from "../../../../../lib/profile/profile-bio-rpcs"
import { callProfileRpc } from "../../../../../lib/profile-rpcs"
import { ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * O perfil de outra pessoa no app (F10), pela mesma leitura da web antiga
 * (`profile/[userId]/page.tsx`): visibilidade pela RPC com o viewer DA SESSÃO,
 * nome sob a RLS da sessão, bio por `get_profile_bio`, publicações e eventos
 * pelas RPCs com viewer explícito. O viewer nunca vem do corpo — a RPC recusa
 * quem tentar (anti-spoofing).
 *
 * Alvo invisível é 404, nunca 403: um 403 confirmaria que a pessoa existe.
 *
 * O corpo é só identidade e atividade. Força/OM não entram (BLOCK-AFFILIATION)
 * e cidade, contadores e selos do alvo também não: ler a localidade por fora
 * das RPCs seria contorno de visibilidade.
 */
export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "membro-nao-encontrado" }, 404)
  const viewer = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const visivel = await callProfileRpc(client, "profile_is_visible_to_viewer", {
      p_target_user_id: id,
      p_viewer_user_id: viewer,
    })
    if (visivel.error) throw visivel.error
    if (visivel.data !== true) {
      return responder(request, { erro: "membro-nao-encontrado" }, 404)
    }

    const [perfil, bio, publicacoes, eventos] = await Promise.all([
      client.from("profiles").select("display_name").eq("user_id", id).maybeSingle(),
      callProfileBioRpc(client, "get_profile_bio", { p_user_id: id }),
      callProfileRpc(client, "profile_posts_for", {
        p_target_user_id: id,
        p_viewer_user_id: viewer,
      }),
      callProfileRpc(client, "profile_events_for", {
        p_target_user_id: id,
        p_viewer_user_id: viewer,
      }),
    ])
    if (perfil.error) throw perfil.error
    if (bio.error) throw bio.error
    if (publicacoes.error) throw publicacoes.error
    if (eventos.error) throw eventos.error

    return responder(
      request,
      {
        membro: {
          id,
          nome: perfil.data?.display_name ?? "",
          bio: bio.data ?? "",
          publicacoes: (publicacoes.data ?? []).map((linha) => ({
            id: linha.id,
            texto: linha.content ?? "",
            criadaEm: linha.created_at,
          })),
          eventos: (eventos.data ?? []).map((linha) => ({
            id: linha.id,
            titulo: linha.title,
            comecaEm: linha.starts_at,
          })),
        },
      },
      200,
    )
  } catch (error) {
    log.error("app membros: profile read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId: viewer,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
