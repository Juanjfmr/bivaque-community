import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import type { NextRequest, NextResponse } from "next/server"
import { ipConfiavel } from "../../../../../lib/app-api/entrada-limite"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../lib/app-api/rota-do-app"
import { isInviteCodeShape, normalizeInviteCode } from "../../../../../lib/convite/code"
import {
  inviteCodeHash,
  inviteEmailDigest,
  inviteOriginDigest,
} from "../../../../../lib/convite/digest"
import {
  acceptFamilyInviteCode,
  previewFamilyInviteCode,
} from "../../../../../lib/convite/provision"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Aceite do convite familiar pelo app (RUN-002, lote C parte 1).
//
// Quem chega aqui já tem sessão (o código de 6 dígitos entrou no lugar da
// senha) e já aceitou os textos na etapa de aceite. A rota não cria conta: o
// e-mail é o da sessão, e o banco confere o vínculo do convite com ele. O
// código é credencial — nunca vai para o rascunho, para log ou para a URL.
//
// O trabalho pesado é do banco: `family_invite_code_preview` valida forma,
// e-mail, prazo e limite; `family_invite_code_accept` consome o código e
// provisiona o vínculo com a cidade de quem convidou, na mesma transação. As
// duas respondem status, não exceção, para a tentativa falha contar no limite.

const NOME_MAXIMO = 80

function codigoDoErro(erro: unknown): string | null {
  if (typeof erro !== "object" || erro === null) return null
  const codigo = (erro as { code?: unknown }).code
  return typeof codigo === "string" ? codigo : null
}

function nomeDoConvite(valor: unknown): string | null {
  if (typeof valor !== "string") return null
  const nome = valor
    .normalize("NFC")
    .replace(/[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
  return nome.length >= 2 ? nome.slice(0, NOME_MAXIMO) : null
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const porta = conferirEscrita(request, sessao.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)

  const codigo = normalizeInviteCode(
    typeof lido.corpo["codigo"] === "string" ? lido.corpo["codigo"] : "",
  )
  if (!isInviteCodeShape(codigo)) {
    return responder(request, { erro: "convite-invalido" }, 400)
  }

  const nome = nomeDoConvite(lido.corpo["nome"])
  if (nome === null) return responder(request, { erro: "nome-invalido" }, 400)

  const email = sessao.sessao.usuario.email?.trim().toLowerCase() ?? ""
  if (email === "") return responder(request, { erro: "email-ausente" }, 400)

  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)

  // A etapa de aceite grava o consentimento antes; sem ele, nas versões
  // vigentes, o vínculo não pode ser criado (o convite não substitui o aceite
  // dos textos). `has_accepted_consent` confere as duas versões de uma vez, em
  // vez de contar linhas de qualquer versão antiga.
  const { data: consentimento, error: consentError } = await servico.rpc("has_accepted_consent", {
    p_user_id: sessao.sessao.usuario.id,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })

  if (consentError !== null) {
    log.error("entry invite consent lookup failed", { message: consentError.message })
    return respostaIndisponivel(request)
  }
  if (consentimento !== true) {
    return responder(request, { erro: "consentimento-pendente" }, 400)
  }

  const codeHash = inviteCodeHash(codigo)
  const emailDigest = inviteEmailDigest(email)
  const originDigest = inviteOriginDigest(ipConfiavel(request.headers))

  try {
    const preview = await previewFamilyInviteCode(servico, { codeHash, emailDigest, originDigest })
    if (preview.status === "rate_limited") {
      return responder(request, { erro: "convite-limite" }, 429)
    }
    if (preview.status !== "ok") {
      return responder(request, { erro: "convite-invalido" }, 400)
    }

    const aceite = await acceptFamilyInviteCode(servico, {
      codeHash,
      displayName: nome,
      originDigest,
      userId: sessao.sessao.usuario.id,
    })

    if (aceite.status === "rate_limited") {
      return responder(request, { erro: "convite-limite" }, 429)
    }
    if (aceite.status !== "ok") {
      return responder(request, { erro: "convite-invalido" }, 400)
    }

    // O convite já criou o vínculo. O marcador do rascunho aponta a etapa
    // seguinte do caminho do convite (interesses), para a retomada não voltar
    // ao nome nem pular o combinado. A tela não escreve mais o rascunho a
    // partir daqui.
    const { error: marcadorError } = await servico.from("entry_progress").upsert(
      {
        user_id: sessao.sessao.usuario.id,
        versao: 2,
        etapa: "interesses",
        estado: {},
      },
      { onConflict: "user_id" },
    )
    if (marcadorError) {
      log.error("entry invite: draft marker write failed", { message: marcadorError.message })
    }

    return responder(request, { localityMember: true }, 200, sessao.sessao.cabecalhos)
  } catch (erro) {
    log.error("entry invite failed", {
      errorCode: codigoDoErro(erro),
      message: erro instanceof Error ? erro.message : "unknown",
    })
    if (codigoDoErro(erro) === "22023") {
      return responder(request, { erro: "nome-invalido" }, 400)
    }
    return responder(request, { erro: "convite-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
