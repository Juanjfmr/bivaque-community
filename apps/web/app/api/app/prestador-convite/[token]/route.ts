import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
  sessaoOpcional,
} from "../../../../../lib/app-api/rota-do-app"
import {
  aceitarConviteDePrestador,
  lerConviteDePrestador,
  TOKEN_DO_CONVITE,
} from "../../../../../lib/providers/convite-prestador"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ token: string }> }

// TROCA-005 — o convite de prestador pela porta do app.
//
// GET é público, como o link: quem abre ainda não tem conta, e a RPC de leitura
// é executável por `anon`. Token malformado e desconhecido devolvem o mesmo 404,
// sem oráculo de existência. A sessão é opcional e só serve para a tela saber se
// já há alguém para aceitar — ela nunca muda QUEM leu o convite.
//
// POST aceita com a sessão; o e-mail vem do servidor e o banco confere. Um id de
// outra pessoa não é parâmetro: o convite é identificado pelo token.

const MENSAGENS = {
  "convite-nao-encontrado": "Não encontramos este convite. Confira o link recebido.",
  "convite-expirado": "Este convite expirou. Peça um novo à comunidade que indicou você.",
  "convite-usado": "Este convite já foi usado. Entre na conta de prestador para continuar.",
  "conta-recusada": "Esta conta é de membro e não pode aceitar convite de prestador.",
  "outro-email": "O convite não corresponde ao e-mail da sua conta.",
  indisponivel: "Não foi possível aceitar o convite agora. Tente novamente.",
} as const

export async function GET(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const { token } = await params
  if (!TOKEN_DO_CONVITE.test(token)) {
    return responder(request, { erro: "convite-nao-encontrado" }, 404)
  }
  const sessao = await sessaoOpcional(request)
  if (sessao.estado === "indisponivel") {
    return responder(request, { erro: "indisponivel" }, 503)
  }
  try {
    const convite = await lerConviteDePrestador(token)
    if (convite === null) return responder(request, { erro: "convite-nao-encontrado" }, 404)
    return responder(
      request,
      {
        // O app não tem tela de comunidade: o id não viaja e não vira oráculo.
        convite: { comunidade: convite.comunidade, estado: convite.estado },
        emailDaSessao: sessao.estado === "autenticada" ? sessao.sessao.usuario.email : null,
      },
      200,
    )
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { token } = await params
  if (!TOKEN_DO_CONVITE.test(token)) {
    return responder(request, { erro: "convite-nao-encontrado" }, 404)
  }
  try {
    const resultado = await aceitarConviteDePrestador(
      auth.sessao.cliente,
      token,
      auth.sessao.usuario.email,
    )
    if (resultado.ok) return responder(request, { aceito: true }, 200)
    return responder(
      request,
      { erro: resultado.motivo, mensagem: MENSAGENS[resultado.motivo] },
      resultado.motivo === "indisponivel" ? 503 : 409,
    )
  } catch {
    return responder(request, { erro: "indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
