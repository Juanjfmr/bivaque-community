"use server"

import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"
import { classifySignUp, passwordProblem } from "../../../lib/auth/password-auth"
import {
  type FamilyInviteCodeStatus,
  INVITE_CODE_FORMAT,
  inviteMessageForStatus,
  isInviteCodeShape,
  normalizeInviteCode,
} from "../../../lib/convite/code"
import {
  inviteCodeHash,
  inviteEmailDigest,
  inviteOriginDigest,
  originFromForwardedFor,
} from "../../../lib/convite/digest"
import {
  acceptFamilyInviteCode,
  type FamilyInvitePreview,
  previewFamilyInviteCode,
} from "../../../lib/convite/provision"
import { log } from "../../../lib/logger"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// PORT-006 (lote 4 da entrada) — as ações da tela /convite.
//
// A ordem importa e é a mesma das duas telas do protótipo:
//   1. o código é validado ANTES de existir conta (preview), porque um convite
//      errado não pode deixar conta criada. Quem já tem sessão com o e-mail do
//      formulário não cria conta, então o preview é dispensado e o próprio
//      aceite valida o código — é o que permite retomar um convite já aceito
//      cujo provisionamento ficou pela metade;
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
const NAME_REJECTED = "Confira o nome informado e tente de novo."

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

// Endereço canônico do app, para o link de confirmação voltar para cá.
async function requestOrigin(): Promise<string> {
  const configured = process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "")
  if (configured) return configured
  const headerBag = await headers()
  const origin = headerBag.get("origin")
  if (origin) return origin.replace(/\/$/, "")
  const host = headerBag.get("host") ?? "127.0.0.1:3000"
  return `http://${host}`
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

// O banco devolve status, não exceção (20261023120000): a exceção desfaria o
// insert da tentativa e o limite nunca contaria erro. Só `email_mismatch` tem
// frase própria — a pessoa tem o código certo e digitou outro e-mail; errado,
// vencido, revogado, usado e limite genérico saem de `inviteMessageForStatus`.
function previewMessageFor(status: FamilyInviteCodeStatus): string {
  return status === "email_mismatch" ? EMAIL_MISMATCH : inviteMessageForStatus(status)
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

    if (preview.status !== "ok") {
      // Tentativa errada é caminho normal, não incidente: o banco já gravou a
      // tentativa (é isso que faz o limite contar) e a tela recebe a frase
      // única de sempre.
      log.warn("family invite code preview denied", { status: preview.status })
      return { ok: false, message: previewMessageFor(preview.status) }
    }

    return {
      ok: true,
      expiresAt: preview.expiresAt,
      inviteeEmailHint: preview.inviteeEmailHint,
      inviterName: preview.inviterName,
    }
  } catch (error) {
    // Aqui sim é falha de infraestrutura (RPC indisponível, resposta quebrada):
    // a tela não pode prometer convite válido nem inventar um status.
    log.error("family invite code preview failed", {
      errorCode: errorCode(error),
      message: error instanceof Error ? error.message : "unknown",
    })
    return { ok: false, message: inviteMessageForStatus("unavailable") }
  }
}

export async function acceptInviteAction(formData: FormData): Promise<InviteAcceptResult> {
  const read = (name: string): string => {
    const value = formData.get(name)
    return typeof value === "string" ? value.trim() : ""
  }

  const code = normalizeInviteCode(read("code"))
  // A política de nome do perfil (private.display_name_ok) exige NFC e recusa
  // caractere de controle e de direção de texto: o servidor ajusta antes, para
  // um nome colado de outro lugar não falhar sem a pessoa saber por quê.
  const name = read("name")
    .normalize("NFC")
    .replace(/[\p{Cc}؜‎‏‪- ⁦-⁩]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
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

  // 1. Sessão com ESTE e-mail dispensa conta nova — e dispensa o preview.
  //
  // O preview existe por um motivo só: não criar conta órfã quando o código
  // está errado. Sem cadastro, quem valida o par código + e-mail é o próprio
  // aceite. Pular o preview neste caminho é o que torna a RETOMADA possível:
  // depois de uma falha no provisionamento, o convite já está `accepted`, e o
  // preview responderia `unavailable` antes de o aceite poder devolver o
  // vínculo que existe. Duas chamadas também contariam duas tentativas contra
  // o limite, quando o limite só deve contar falha.
  const auth = await authServerClient()
  const { data: current } = await auth.auth.getUser()
  const currentEmail = current.user?.email?.trim().toLowerCase() ?? null

  let userId: string
  if (current.user && currentEmail === email) {
    userId = current.user.id
  } else {
    // 2. Ainda não existe conta: o convite valida o par código + e-mail ANTES
    // do cadastro. A função devolve status — inclusive `unavailable` e
    // `rate_limited` — e a tentativa que falhou fica gravada; nenhum desses
    // casos vira exceção.
    let preview: FamilyInvitePreview
    try {
      preview = await previewFamilyInviteCode(service, { codeHash, emailDigest, originDigest })
    } catch (error) {
      log.error("family invite preview failed before signup", {
        errorCode: errorCode(error),
        message: error instanceof Error ? error.message : "unknown",
      })
      return { ok: false, message: inviteMessageForStatus("unavailable"), field: "code" }
    }

    if (preview.status !== "ok") {
      log.warn("family invite code denied before signup", { status: preview.status })
      return {
        ok: false,
        message: previewMessageFor(preview.status),
        field: preview.status === "email_mismatch" ? "email" : "code",
      }
    }

    // 3. A conta.
    const { data, error } = await auth.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        // O link de confirmação volta para a mesma tela, com o código: a
        // sessão que ele cria é a que aceita o convite.
        emailRedirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(
          `/convite?codigo=${code}`,
        )}&consent=${encodeURIComponent(String(CONSENT_VERSION))}`,
      },
    })

    if (error) {
      const view = classifySignUp(error)
      return {
        ok: false,
        message: view.message,
        field: view.outcome === "email-taken" ? "email" : "code",
      }
    }

    const created = data.user?.id
    if (!created) {
      return {
        ok: false,
        message: "Não foi possível criar a conta agora. Tente novamente.",
        field: "code",
      }
    }

    if (!data.session) {
      // Provedor pedindo confirmação de e-mail: sem sessão não há como gravar o
      // aceite nem aceitar o convite neste instante. O link do e-mail volta
      // para cá com o código e conclui o aceite.
      return {
        ok: false,
        message: "Confirme o e-mail que enviamos e abra o link para concluir o convite.",
        field: "email",
      }
    }

    userId = created
  }

  // 4. O aceite, no servidor, com o usuário que acabou de nascer — nunca um id
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

  // 5. O vínculo com o titular (e o provisionamento na localidade dele).
  // Falha aqui — e-mail diferente, corrida perdida, limite — volta como status,
  // não como exceção: o RPC confirma a tentativa antes de responder.
  try {
    const acceptance = await acceptFamilyInviteCode(service, {
      codeHash,
      displayName: name.slice(0, 80),
      originDigest,
      userId,
    })

    if (acceptance.status !== "ok") {
      log.warn("family invite acceptance denied after signup", { status: acceptance.status })
      return { ok: false, message: NO_LINK, field: "code" }
    }
  } catch (error) {
    log.error("family invite acceptance failed after signup", {
      errorCode: errorCode(error),
      message: error instanceof Error ? error.message : "unknown",
    })
    // 22023 é a recusa de entrada do RPC; o único valor que vem da pessoa é o
    // nome (os digests e a versão do aceite são do servidor). Apontar o campo
    // evita repetir o envio com o mesmo nome sem saber o que mudar.
    if (errorCode(error) === "22023") {
      return { ok: false, message: NAME_REJECTED, field: "name" }
    }
    return { ok: false, message: NO_LINK, field: "code" }
  }

  // O cookie de sessão já está na resposta; quem navega é a tela, com um
  // request de documento (window.location), como no cadastro normal.
  return { ok: true }
}
