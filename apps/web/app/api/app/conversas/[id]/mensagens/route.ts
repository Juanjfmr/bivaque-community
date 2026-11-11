import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { canSendQuestion, normalizeQuestion } from "../../../../../../lib/events/question-thread"
import { conversaDaSessao, mensagemDaLinha, UUID } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

const CHAVE_MAXIMA = 120

type Chave = { readonly ok: true; readonly chave: string | null } | { readonly ok: false }

/** A chave de idempotência opcional do corpo: ausente vira `null`. */
function chaveDoCorpo(corpo: Record<string, unknown>): Chave {
  const valor = corpo["clientKey"]
  if (valor === undefined) return { ok: true, chave: null }
  if (typeof valor !== "string") return { ok: false }
  const chave = valor.trim()
  if (chave === "" || chave.length > CHAVE_MAXIMA) return { ok: false }
  return { ok: true, chave }
}

type LinhaDaMensagem = {
  id: string
  content: string
  sender_id: string
  created_at: string
}

/** A RPC devolve `to_jsonb` da linha: só aceita o formato que a tela conhece. */
function linhaDaMensagem(valor: unknown): LinhaDaMensagem | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null
  const linha = valor as Record<string, unknown>
  if (
    typeof linha["id"] !== "string" ||
    typeof linha["content"] !== "string" ||
    typeof linha["sender_id"] !== "string" ||
    typeof linha["created_at"] !== "string"
  )
    return null
  return {
    id: linha["id"],
    content: linha["content"],
    sender_id: linha["sender_id"],
    created_at: linha["created_at"],
  }
}

export async function POST(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const corpo = await lerCorpoJson(request)
  if (!corpo.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const bruto = corpo.corpo["texto"]
  if (typeof bruto !== "string" || !canSendQuestion(bruto))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const chave = chaveDoCorpo(corpo.corpo)
  if (!chave.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const texto = normalizeQuestion(bruto)
  try {
    const client = auth.sessao.cliente
    if (!(await conversaDaSessao(client, id)))
      return responder(request, { erro: "nao-encontrado" }, 404)
    // A RPC já existe e concentra idempotência, autorização de participante e a
    // transição do pedido com o aviso da primeira resposta. `p_client_key` só
    // vai quando existe: o DEFAULT NULL da função cobre a ausência.
    const { data, error } = await client.rpc("send_conversation_message", {
      p_conversation_id: id,
      p_content: texto,
      ...(chave.chave === null ? {} : { p_client_key: chave.chave }),
    })
    if (error) {
      if (error.code === "22023" || error.code === "23514")
        return responder(request, { erro: "corpo-invalido" }, 400)
      if (error.code === "42501") return responder(request, { erro: "recusado" }, 403)
      throw error
    }
    const linha = linhaDaMensagem(data)
    if (!linha) throw new Error("sem resultado")
    return responder(request, { mensagem: mensagemDaLinha(linha, auth.sessao.usuario.id) }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
