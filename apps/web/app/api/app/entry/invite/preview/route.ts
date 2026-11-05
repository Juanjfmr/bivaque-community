import type { NextRequest, NextResponse } from "next/server"
import { ipConfiavel } from "../../../../../../lib/app-api/entrada-limite"
import {
  clienteDeServicoOuNulo,
  conferirPorta,
  lerCorpoJson,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../../lib/app-api/rota-do-app"
import { isInviteCodeShape, normalizeInviteCode } from "../../../../../../lib/convite/code"
import {
  inviteCodeHash,
  inviteEmailDigest,
  inviteOriginDigest,
} from "../../../../../../lib/convite/digest"
import { previewFamilyInviteCode } from "../../../../../../lib/convite/provision"
import { log } from "../../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Prévia do convite familiar pelo app (RUN-004).
//
// O app valida o código ANTES de pedir o envio do código por e-mail: o envio
// cria conta para o endereço, então um convite inválido não pode chegar ao
// GoTrue. A validação, o limite e a resposta única continuam no banco
// (`family_invite_code_preview`); aqui só se resolve o nome de quem convidou e o
// e-mail que o convite declara.
//
// O código é credencial: vai no corpo do POST, nunca na URL. Quem tem o código
// pode ver o endereço para que ele foi emitido — é o próprio destinatário, e é
// o que permite a etapa de e-mail vir preenchida e só de leitura. O endereço
// continua sem entrar em log.

const CORPO_MAXIMO = 4 * 1024

export async function POST(request: NextRequest): Promise<NextResponse> {
  const porta = conferirPorta(request, "cookie")
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request, CORPO_MAXIMO)
  if (!lido.ok) {
    const erro = lido.status === 413 ? "grande-demais" : "corpo-invalido"
    return responder(request, { erro }, lido.status)
  }

  const codigo = normalizeInviteCode(
    typeof lido.corpo["codigo"] === "string" ? lido.corpo["codigo"] : "",
  )
  if (!isInviteCodeShape(codigo)) {
    return responder(request, { erro: "convite-invalido" }, 400)
  }

  const emailBruto = lido.corpo["email"]
  const email = typeof emailBruto === "string" ? emailBruto.trim().toLowerCase() : null

  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)

  const codeHash = inviteCodeHash(codigo)
  const originDigest = inviteOriginDigest(ipConfiavel(request.headers))

  try {
    const preview = await previewFamilyInviteCode(servico, {
      codeHash,
      ...(email === null ? {} : { emailDigest: inviteEmailDigest(email) }),
      originDigest,
    })

    if (preview.status === "rate_limited") {
      return responder(request, { erro: "convite-limite" }, 429)
    }
    if (preview.status === "email_mismatch") {
      return responder(request, { erro: "email-nao-confere" }, 400)
    }
    if (preview.status !== "ok") {
      return responder(request, { erro: "convite-invalido" }, 400)
    }

    // O convite é emitido com o e-mail no destinatário do outbox; o banco guarda
    // só o digest da tabela do convite. O endereço só é devolvido a quem tem o
    // código, e nunca vai para log.
    const { data: mensagens, error: outboxError } = await servico
      .from("outbox")
      .select("recipient")
      .eq("type", "family_invite")
      .filter("payload->>invite_code", "eq", codigo)
      .order("created_at", { ascending: false })
      .limit(1)

    if (outboxError) {
      log.error("entry invite preview: outbox lookup failed", { message: outboxError.message })
    }

    const destinatario = mensagens?.[0]?.recipient ?? null

    return responder(
      request,
      {
        inviterName: preview.inviterName,
        email: destinatario,
        emailHint: preview.inviteeEmailHint,
      },
      200,
    )
  } catch (erro) {
    log.error("entry invite preview failed", {
      message: erro instanceof Error ? erro.message : "unknown",
    })
    return responder(request, { erro: "convite-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
