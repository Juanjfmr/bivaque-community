import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { revogarConvite } from "../../../../../../lib/convite/familia"
import { ehUuid } from "../../../eventos/_comum"
import { respostaDaFalhaDeConvite } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * Revoga um convite pendente do próprio titular (RUN-018).
 *
 * O dono vem da sessão, não do pedido: `revoke_family_invitation` é pública, só
 * tem `execute` para `authenticated` e deriva o titular de `auth.uid()`
 * (migration 20261116221048). Convite de outra pessoa responde 404, igual a um
 * id que nunca existiu — não vira oráculo. A escrita usa o cliente da sessão;
 * esta rota não abre privilégio nenhum.
 */
export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "nao-encontrado" }, 404)

  try {
    await revogarConvite(auth.sessao.cliente, id)
    return responder(request, { removido: true }, 200)
  } catch (falha) {
    return respostaDaFalhaDeConvite(request, falha)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
