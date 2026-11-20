import type { NextRequest } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { callCommunityInviteRpc } from "../../../../../../lib/community-invite-rpcs"
import { digestDoConvite } from "../../../../../../lib/invites-bytea"
import { erroDoConvite } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const auth = await exigirSessao(request)
  if (!auth.ok)
    return auth.resposta.status === 401
      ? responder(request, { erro: "nao-autenticado", mensagem: "Entre para continuar." }, 401)
      : auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok")
    return responder(request, { erro: porta, mensagem: "Escrita não autorizada." }, 403)
  const { token } = await params
  const digest = digestDoConvite(token)
  if (!digest) return erroDoConvite(request, "P0002")
  try {
    const { data, error } = await callCommunityInviteRpc(
      auth.sessao.cliente,
      "accept_community_invitation_for_app",
      { p_token_digest: digest },
    )
    if (error) return erroDoConvite(request, error.code)
    if (!data) return erroDoConvite(request)
    return responder(request, { communityId: data }, 200)
  } catch {
    return erroDoConvite(request)
  }
}
export function OPTIONS(request: NextRequest) {
  return opcoesDoApp(request)
}
