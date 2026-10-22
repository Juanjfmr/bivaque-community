"use server"

import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"
import { classifySignUp, passwordProblem } from "../../../lib/auth/password-auth"
import {
  INVITE_CODE_FORMAT,
  inviteMessageFor,
  isInviteCodeShape,
  normalizeInviteCode,
} from "../../../lib/convite/code"
import {
  inviteCodeHash,
  inviteEmailDigest,
  inviteOriginDigest,
  originFromForwardedFor,
} from "../../../lib/convite/digest"
import { acceptFamilyInviteCode, previewFamilyInviteCode } from "../../../lib/convite/provision"
import { log } from "../../../lib/logger"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// PORT-006 (lote 4 da entrada) — as ações da tela /convite.
//
// A ordem importa e é a mesma das duas telas do protótipo:
//   1. o código é validado ANTES de existir conta (preview), porque um convite
//      errado não pode deixar conta criada;
//   2. a conta nasce aqui, no servidor, com a senha e o aceite gravado no
//      RPC de consentimento — o mesmo `record_consent_acceptance` do cadastro
//      normal (ADR-20260907-consentimento-no-cadastro);
//   3. o vínculo com o titular é feito por `family_invite_code_accept`, que
//      delega a `private.accept_family_invitation`: nenhuma regra familiar é
//      reimplementada no TypeScript.
//
// Criar a conta no servidor (e não no navegador, como o /signup faz) é o que
// permite conferir o e-mail contra o convite antes do signUp. Com o cliente do
// navegador, a conta nasceria antes de qualquer conferência e uma pessoa com o
// código e o e-mail errado ficaria com uma conta órfã.

const EMAIL_MISMATCH =
  "Este convite vale para outro e-mail. Confira o endereço que recebeu o convite."
const CONSENT_FAILED = "Conta criada, mas não foi possível registrar o aceite. Tente entrar."
const NO_LINK =
  "Sua conta foi criada, mas o convite não pôde ser aceito agora. Fale com quem convidou."

export type InvitePreviewResult =
  | {
      ok: true
      expiresAt: string
      inviteeEmailHint: string | null
      inviterName: string
    }
  | { ok: false; message: string }

export type InviteAcceptResult =
  | { ok: true }
  | { ok: false; message: string; field?: "code" | "email" | "name" | "password" | "consent" }

async function requestOriginDigest(): Promise<string> {
  const headerBag = await headers()
  const forwarded = headerBag.get("x-forwarded-for") ?? headerBag.get("x-real-ip")
  return inviteOriginDigest(originFromForwardedFor(forwarded))
}

async function authServerClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      // Numa Server Action o cookie pode ser escrito: é assim que a sessão
      // criada pelo signUp chega ao próximo request do documento.
      setAll(items) {
        for (const { name, options, value } of items) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null
  const code = (error as { code?: unknown }).code
  return typeof code === "string" ? code : null
}

export async function previewInviteAction(formData: FormData): Promise<InvitePreviewResult> {
  const rawCode = formData.get("code")
  const code = normalizeInviteCode(typeof rawCode === "string" ? rawCode : "")

  if (!isInviteCodeShape(code)) {
    return { ok: false, message: INVITE_CODE_FORMAT }
  }

  const supabase = createServiceClient()

  try {
    const preview = await previewFamilyInviteCode(supabase, {
      codeHash: inviteCodeHash(code),
      originDigest: await requestOriginDigest(),
    })
    return {
      ok: true,
      expiresAt: preview.expiresAt,
      inviteeEmailHint: preview.inviteeEmailHint,
      inviterName: preview.inviterName,
    }
  } catch (error) {
    const code_ = errorCode(error)
    log.warn("family invite code preview denied", { errorCode: code_ })
    // P0005 é o único caso que merece frase própria: a pessoa tem o código e
    // digitou outro e-mail. Os demais (inexistente, vencido, usado) respondem
    // a mesma coisa, como manda o ADR.
    return {
      ok: false,
      message: code_ === "P0005" ? EMAIL_MISMATCH : inviteMessageFor({ code: code_ }),
    }
  }
}

export async function acceptInviteAction(formData: FormData): Promise<InviteAcceptResult> {
  const read = (name: string): string => {
    const value = formData.get(name)
    return typeof value === "string" ? value.trim() : ""
  }

  const code = normalizeInviteCode(read("code"))
  const name = read("name").replace(/\s+/g, " ")
  const email = read("email").toLowerCase()
  const password =
    typeof formData.get("password") === "string" ? String(formData.get("password")) : ""
  const accepted = formData.get("consent") === "on"

  if (!isInviteCodeShape(code)) {
    return { ok: false, message: INVITE_CODE_FORMAT, field: "code" }
  }
  if (name.length < 2) {
    return { ok: false, message: "Informe seu nome.", field: "name" }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Confira o e-mail.", field: "email" }
  }
  const problem = passwordProblem(password)
  if (problem) {
    return { ok: false, message: problem, field: "password" }
  }
  if (!accepted) {
    return {
      ok: false,
      message: "Para aceitar o convite, aceite a Política de privacidade e o Código de conduta.",
      field: "consent",
    }
  }

  const service = createServiceClient()
  const originDigest = await requestOriginDigest()
  const codeHash = inviteCodeHash(code)
  const emailDigest = inviteEmailDigest(email)

  // 1. O convite valida o par código + e-mail ANTES de existir conta.
  try {
    await previewFamilyInviteCode(service, { codeHash, emailDigest, originDigest })
  } catch (error) {
    const errorCodeValue = errorCode(error)
    return {
      ok: false,
      message:
        errorCodeValue === "P0005" ? EMAIL_MISMATCH : inviteMessageFor({ code: errorCodeValue }),
      field: errorCodeValue === "P0005" ? "email" : "code",
    }
  }

  // 2. A conta.
  const auth = await authServerClient()
  const { data, error } = await auth.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  })

  if (error) {
    const view = classifySignUp(error)
    return {
      ok: false,
      message: view.message,
      field: view.outcome === "email-taken" ? "email" : "code",
    }
  }

  const userId = data.user?.id
  if (!userId) {
    return {
      ok: false,
      message: "Não foi possível criar a conta agora. Tente novamente.",
      field: "code",
    }
  }

  if (!data.session) {
    // Provedor pedindo confirmação de e-mail: sem sessão não há como gravar o
    // aceite nem aceitar o convite neste instante. A pessoa confirma e volta
    // pelo caminho de entrada normal — o convite continua válido.
    return {
      ok: false,
      message: "Confirme o e-mail que enviamos e entre pelo link para concluir o convite.",
      field: "email",
    }
  }

  // 3. O aceite, no servidor, com o usuário que acabou de nascer — nunca um id
  // vindo do formulário.
  const { error: consentError } = await service.rpc("record_consent_acceptance", {
    p_user_id: userId,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })

  if (consentError) {
    log.error("family invite consent failed", { error: consentError.message })
    return { ok: false, message: CONSENT_FAILED, field: "consent" }
  }

  // 4. O vínculo com o titular (e o provisionamento na localidade dele).
  try {
    await acceptFamilyInviteCode(service, {
      codeHash,
      displayName: name.slice(0, 80),
      originDigest,
      userId,
    })
  } catch (error) {
    log.error("family invite acceptance failed after signup", {
      errorCode: errorCode(error),
      message: error instanceof Error ? error.message : "unknown",
    })
    return { ok: false, message: NO_LINK, field: "code" }
  }

  // O cookie de sessão já está na resposta; quem navega é a tela, com um
  // request de documento (window.location), como no cadastro normal.
  return { ok: true }
}
