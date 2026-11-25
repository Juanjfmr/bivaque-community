import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import {
  contaDoPrestador,
  salvarContaDoPrestador,
} from "../../../../../lib/providers/prestador-area"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// TROCA-005 — a conta do prestador na aba "Conta" de Meu negócio. O e-mail de
// acesso vem da sessão (nunca do corpo); o telefone é opcional e opt-in, e a
// validação é a de lib/providers/showcase. RLS owner-only: nenhuma escrita aqui alcança ficha de outra pessoa.

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const conta = await contaDoPrestador(
      auth.sessao.cliente,
      auth.sessao.usuario.id,
      auth.sessao.usuario.email,
    )
    return responder(request, { conta }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const telefone = lido.ok ? lido.corpo["telefone"] : undefined
  const publico = lido.ok ? lido.corpo["telefonePublico"] : undefined
  if ((telefone !== null && typeof telefone !== "string") || typeof publico !== "boolean") {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }

  const client = auth.sessao.cliente
  try {
    const resultado = await salvarContaDoPrestador(client, auth.sessao.usuario.id, {
      telefone,
      telefonePublico: publico,
    })
    if (!resultado.ok) {
      const status =
        resultado.motivo === "sem-ficha" ? 404 : resultado.motivo === "sem-permissao" ? 403 : 400
      return responder(request, { erro: resultado.motivo, mensagem: resultado.mensagem }, status)
    }
    const conta = await contaDoPrestador(client, auth.sessao.usuario.id, auth.sessao.usuario.email)
    return responder(request, { conta }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
