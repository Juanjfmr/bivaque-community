import type { NextRequest, NextResponse } from "next/server"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import {
  enviarConvite,
  lerFamilia,
  validarEmailDeConvite,
} from "../../../../../lib/convite/familia"
import { respostaDaFalhaDeConvite } from "./_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A família do titular (F10 / LAN-F10, RUN-018): os convites pendentes e o
 * envio de um novo.
 *
 * Estas são as duas únicas rotas da jornada que usam o cliente de serviço, e
 * por um motivo medido: `public.create_family_invitation`,
 * `revoke_family_invitation`, `list_pending_invites_with_hint` e
 * `is_verified_holder` recebem `p_user_id` e têm `execute` SÓ para
 * `service_role` (migration 20260806160942). O privilégio só é aberto DEPOIS
 * de `exigirSessao` e só para essas quatro funções; o id passado é sempre
 * `auth.sessao.usuario.id`, nunca um campo do corpo.
 *
 * O corpo não devolve token, hash nem e-mail completo: só o rótulo mascarado
 * que a tela antiga já mostra. O link e o código chegam por e-mail.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const client = clienteDeServicoOuNulo()
  if (client === null) return responder(request, { erro: "familia-indisponivel" }, 503)
  try {
    const familia = await lerFamilia(client, auth.sessao.usuario.id)
    return responder(request, { familia }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  // Só `email` é lido: um `user_id` no corpo é ignorado, porque o dono é a sessão.
  const email = lido.corpo["email"]
  const problema = validarEmailDeConvite(email)
  if (problema !== null)
    return responder(request, { erro: "dados-invalidos", mensagem: problema }, 400)

  const client = clienteDeServicoOuNulo()
  if (client === null) return responder(request, { erro: "familia-indisponivel" }, 503)
  try {
    const { convite } = await enviarConvite(client, auth.sessao.usuario.id, email)
    return responder(request, { convite }, 201)
  } catch (falha) {
    return respostaDaFalhaDeConvite(request, falha)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
