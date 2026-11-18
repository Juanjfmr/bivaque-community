import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import { log } from "../../../../lib/logger"
import { validarDestino, validarInscricao } from "../../../../lib/push/inscricao"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A inscrição de push deste aparelho (RUN-188, ADR-20261107).
 *
 * - `GET` diz se o servidor tem as chaves VAPID — e devolve só a chave pública,
 *   nunca a privada. Sem configuração, o app não oferece o push.
 * - `POST` grava a inscrição do aparelho da sessão pela função
 *   `register_push_subscription` (o `user_id` vem da sessão; o corpo só carrega
 *   destino e chaves públicas). Reinscrever o mesmo destino só troca o dono
 *   quando as chaves enviadas batem com a inscrição existente — o mesmo
 *   navegador em outra conta; destino alheio com chaves diferentes devolve 409.
 * - `DELETE` apaga a inscrição deste aparelho (a saída do app e o pedido da
 *   pessoa usam este caminho).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta

  const chavePublica = process.env["WEB_PUSH_PUBLIC_KEY"]
  const chavePrivada = process.env["WEB_PUSH_PRIVATE_KEY"]
  const configurado = Boolean(chavePublica && chavePrivada)

  return responder(request, { configurado, chavePublica: configurado ? chavePublica : null }, 200)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const lido = await lerCorpoJson(request)
  const inscricao = lido.ok ? validarInscricao(lido.corpo) : null
  if (inscricao === null) return responder(request, { erro: "dados-invalidos" }, 400)

  const userId = auth.sessao.usuario.id
  try {
    const { error } = await auth.sessao.cliente.rpc("register_push_subscription", {
      p_kind: inscricao.kind,
      p_destination: inscricao.destination,
      p_key_p256dh: inscricao.keyP256dh,
      p_key_auth: inscricao.keyAuth,
      p_label: inscricao.label,
    })

    if (error) {
      if (error.code === "23505") return responder(request, { erro: "conflito" }, 409)
      throw error
    }

    return responder(request, { inscrito: true }, 201)
  } catch (error) {
    log.error("app push: subscribe failed", { codigo: codigoDoErro(error), userId })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request)
  const destino = lido.ok ? validarDestino(lido.corpo) : null
  if (destino === null) return responder(request, { erro: "dados-invalidos" }, 400)

  const userId = auth.sessao.usuario.id
  try {
    const { data, error } = await auth.sessao.cliente
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("destination", destino)
      .select("id")

    if (error) throw error
    return responder(request, { removidos: data?.length ?? 0 }, 200)
  } catch (error) {
    log.error("app push: unsubscribe failed", { codigo: codigoDoErro(error), userId })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

// SQLSTATE: cinco caracteres entre dígito e maiúscula. Qualquer outra string
// em `code` pode carregar a entrada da rota (endpoint, chaves) e não entra
// no log.
const CODIGO_SQLSTATE = /^[0-9A-Z]{5}$/

/**
 * Só o código do erro do banco, nunca a mensagem: a mensagem pode carregar o
 * destino (endpoint do provedor de push), que é dado do titular e não entra em
 * log. O `code` só entra quando tem cara de SQLSTATE; qualquer outra string
 * ganha a categoria fixa "desconhecido".
 */
function codigoDoErro(erro: unknown): string {
  const codigo = (erro as { code?: unknown } | null)?.code
  return typeof codigo === "string" && CODIGO_SQLSTATE.test(codigo) ? codigo : "desconhecido"
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
