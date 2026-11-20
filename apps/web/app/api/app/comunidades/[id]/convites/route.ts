import type { NextRequest } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { callCommunityInviteRpc } from "../../../../../../lib/community-invite-rpcs"
import { digestDoConvite, gerarTokenDeConvite } from "../../../../../../lib/invites-bytea"
import { erroDoConvite } from "../../../convites/_comum"
import { ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao(request)
  if (!auth.ok)
    return auth.resposta.status === 401
      ? responder(request, { erro: "nao-autenticado", mensagem: "Entre para continuar." }, 401)
      : auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok")
    return responder(request, { erro: porta, mensagem: "Escrita não autorizada." }, 403)
  const { id } = await params
  if (!ehUuid(id)) return erroDoConvite(request, "P0002")
  const token = gerarTokenDeConvite()
  const digest = digestDoConvite(token)
  if (!digest) return erroDoConvite(request)
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  try {
    const { error } = await callCommunityInviteRpc(
      auth.sessao.cliente,
      "create_community_invitation_for_app",
      {
        p_community_id: id,
        p_token_digest: digest,
        p_expires_at: expiraEm,
      },
    )
    if (error) return erroDoConvite(request, error.code)
    return responder(request, { link: `/invite/${token}`, expiraEm }, 201)
  } catch {
    return erroDoConvite(request)
  }
}
export function OPTIONS(request: NextRequest) {
  return opcoesDoApp(request)
}
