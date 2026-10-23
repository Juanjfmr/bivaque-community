import { createServerClient as createAuthClient } from "@supabase/ssr"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { acceptInviteAction } from "web/app/(preauth)/convite/actions"
import { acceptFamilyInviteCode, previewFamilyInviteCode } from "web/lib/convite/provision"
import { createServerClient as createServiceClient } from "web/lib/supabase/server"

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => undefined })),
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.9" })),
}))

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))

vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

vi.mock("web/lib/logger", () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock("web/lib/convite/provision", () => ({
  previewFamilyInviteCode: vi.fn(),
  acceptFamilyInviteCode: vi.fn(),
}))

// PORT-006 (lote 4 da entrada) — a ordem das ações do servidor, provada pelo
// comportamento. A revisão da correção anterior recusou a prova por posição de
// texto no arquivo: `indexOf("previewFamilyInviteCode") < indexOf("signUp")` não
// mostra a ordem em que as chamadas acontecem, nem o efeito de cada falha.
//
// Aqui a Server Action roda de verdade, com o cliente Supabase e as duas
// funções de provisionamento simulados, e o que se observa é a sequência.
// O contrato:
//   * sem sessão: preview → signUp → consentimento → aceite;
//   * com sessão do MESMO e-mail: consentimento → aceite, sem preview e sem
//     signUp (é o caminho da retomada: o convite já aceito não passa pelo
//     preview, que responderia `unavailable`);
//   * preview recusado: nada é criado;
//   * aceite recusado depois do cadastro: a resposta diz que a conta existe.

const EMAIL = "familiar@exemplo.com"
const SENHA_DE_TESTE = "segredo123"
const CODE = "7K4M9QRT"
const USER_ID = "10000000-0000-4000-8000-000000000002"

const calls: string[] = []

const mockGetUser = vi.fn()
const mockSignUp = vi.fn()
const mockRpc = vi.fn()

function formData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  data.set("code", CODE)
  data.set("name", "Maria da Silva")
  data.set("email", EMAIL)
  data.set("password", SENHA_DE_TESTE)
  data.set("consent", "on")
  for (const [key, value] of Object.entries(overrides)) data.set(key, value)
  return data
}

function signedIn(email = EMAIL) {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email } }, error: null })
}

function previewDenied(status: string) {
  ;(previewFamilyInviteCode as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    calls.push("preview")
    return { status }
  })
}

function signUpWith(reply: { data: unknown; error: unknown }) {
  mockSignUp.mockImplementation(async () => {
    calls.push("signUp")
    return reply
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bivaque.example")

  calls.length = 0

  // Sem sessão por padrão: é o caminho em que a conta nasce.
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
  mockSignUp.mockImplementation(async () => {
    calls.push("signUp")
    return { data: { user: { id: USER_ID }, session: { access_token: "token" } }, error: null }
  })
  mockRpc.mockImplementation(async (name: string) => {
    calls.push(name)
    return { data: null, error: null }
  })

  const auth = { auth: { getUser: mockGetUser, signUp: mockSignUp } }
  ;(createAuthClient as ReturnType<typeof vi.fn>).mockReturnValue(auth)
  ;(createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
    rpc: mockRpc,
  })

  ;(previewFamilyInviteCode as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    calls.push("preview")
    return {
      status: "ok",
      expiresAt: "2026-10-30T12:00:00+00:00",
      inviteeEmailHint: "fa***@ex***.com",
      inviterName: "Member One",
    }
  })

  ;(acceptFamilyInviteCode as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    calls.push("accept")
    return { status: "ok", linkId: "40000000-0000-4000-8000-000000000001", localityMember: true }
  })
})

describe("aceite do convite pela tela", () => {
  it("sem conta: confere o convite, cria a conta, grava o aceite e vincula", async () => {
    const result = await acceptInviteAction(formData())

    expect(result).toEqual({ ok: true })
    expect(calls).toEqual(["preview", "signUp", "record_consent_acceptance", "accept"])
  })

  it("com sessão do mesmo e-mail: não cria conta nem repete o preview", async () => {
    // É o que faz a retomada chegar ao banco: um convite já aceito responde
    // `unavailable` no preview, mas `ok` (o mesmo vínculo) no aceite.
    signedIn()

    const result = await acceptInviteAction(formData())

    expect(result).toEqual({ ok: true })
    expect(calls).toEqual(["record_consent_acceptance", "accept"])
    expect(mockSignUp).not.toHaveBeenCalled()
    expect(previewFamilyInviteCode).not.toHaveBeenCalled()
  })

  it("convite recusado antes do cadastro não cria conta", async () => {
    previewDenied("unavailable")

    const result = await acceptInviteAction(formData())

    expect(result).toMatchObject({ ok: false, field: "code" })
    expect(calls).toEqual(["preview"])
    expect(mockSignUp).not.toHaveBeenCalled()
    expect(acceptFamilyInviteCode).not.toHaveBeenCalled()
  })

  it("limite de tentativas tem frase própria, não a de convite inválido", async () => {
    previewDenied("rate_limited")

    const result = await acceptInviteAction(formData())

    expect(result).toMatchObject({ ok: false, field: "code" })
    if (result.ok) throw new Error("expected a denial")
    expect(result.message).toContain("tentativas")
  })

  it("e-mail diferente do convite volta para o campo do e-mail", async () => {
    previewDenied("email_mismatch")

    const result = await acceptInviteAction(formData())

    expect(result).toMatchObject({ ok: false, field: "email" })
  })

  it("aceite recusado depois do cadastro assume que a conta existe", async () => {
    // Substitui a prova por `toContain("NO_LINK")`: o que importa é a resposta
    // que a pessoa recebe quando a conta nasceu e o vínculo não foi criado.
    ;(acceptFamilyInviteCode as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "unavailable",
    })

    const result = await acceptInviteAction(formData())

    expect(result).toMatchObject({ ok: false, field: "code" })
    if (result.ok) throw new Error("expected a denial")
    expect(result.message).toBe(
      "Sua conta foi criada, mas o convite não pôde ser aceito agora. Fale com quem convidou.",
    )
    expect(calls).toContain("signUp")
  })

  it("exceção no aceite não vira sucesso silencioso", async () => {
    ;(acceptFamilyInviteCode as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("family invite acceptance failed: the inviting holder has no current locality"),
    )

    const result = await acceptInviteAction(formData())

    expect(result).toMatchObject({ ok: false, field: "code" })
    expect(calls).toContain("signUp")
  })

  it("cadastro barrado pelo provedor para antes do consentimento", async () => {
    signUpWith({
      data: { user: null, session: null },
      error: { code: "user_already_exists", message: "User already registered" },
    })

    const result = await acceptInviteAction(formData())

    expect(result).toMatchObject({ ok: false, field: "email" })
    expect(calls).toEqual(["preview", "signUp"])
  })

  it("confirmação de e-mail pendente não promete convite aceito", async () => {
    signUpWith({ data: { user: { id: USER_ID }, session: null }, error: null })

    const result = await acceptInviteAction(formData())

    expect(result).toMatchObject({ ok: false, field: "email" })
    if (result.ok) throw new Error("expected a denial")
    expect(result.message).toContain("Confirme o e-mail")
    expect(calls).toEqual(["preview", "signUp"])
  })
})
