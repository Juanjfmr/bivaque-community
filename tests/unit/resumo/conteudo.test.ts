import { afterEach, describe, expect, it, vi } from "vitest"
import { createChannelAdapters, renderEmail } from "web/lib/outbox/adapters"

const id = "d0000000-0000-4000-8000-000000000001"
const token = "a".repeat(64)
const message = {
  id,
  recipient: "membro@example.invalid",
  channel: "email" as const,
  type: "city_digest",
  attempts: 0,
  updatedAt: 0,
  payload: {
    unsubscribe_token: token,
    content: {
      city: "Manaus",
      questions: [
        { id, title: "Escolas do bairro", email: "segredo@example.invalid", address: "proibido" },
      ],
      events: [
        { id, title: "Caminhada", starts_at: "2026-11-08T12:00:00Z", venue: "endereço proibido" },
      ],
      replies: [{ id, title: "Minha pergunta", author: "Ana", body: "corpo não deve sair" }],
    },
  },
}
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("resumo da cidade no e-mail do outbox", () => {
  it("neutraliza links em títulos e autoria sem alterar os links do Bivaque", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bivaque.example.invalid")
    const titulo =
      "Veja HTTPS://site-falso.example.invalid www.site-falso.example.invalid a@example.invalid"
    const neutro =
      "Veja HTTPS[:]//site-falso.example.invalid www[.]site-falso.example.invalid a[@]example.invalid"
    const email = renderEmail({
      ...message,
      payload: {
        ...message.payload,
        content: {
          ...message.payload.content,
          questions: [{ id, title: titulo }],
          events: [{ id, title: titulo, starts_at: "2026-11-08T12:00:00Z" }],
          replies: [{ id, title: titulo, author: titulo }],
        },
      },
    })
    expect(email.text.split(neutro)).toHaveLength(5)
    expect(email.text).not.toContain(titulo)
    expect(email.text).toContain(`https://bivaque.example.invalid/app/pergunta/${id}`)
    expect(email.text).toContain(`https://bivaque.example.invalid/app/evento/${id}`)
    expect(email.text).toContain(
      `https://bivaque.example.invalid/api/app/resumo/descadastro?token=${token}`,
    )
  })
  it("traz as três seções e descadastro, sem copiar dados extras do payload", () => {
    const email = renderEmail(message)
    expect(email.subject).toContain("Manaus")
    expect(email.text).toContain("08/11/2026 UTC")
    expect(email.text).toContain("vale até o próximo resumo")
    expect(email.text).not.toContain("30 dias")
    for (const texto of [
      "Escolas do bairro",
      "Caminhada",
      "Minha pergunta",
      "Ana",
      "/app/pergunta/",
      "/app/evento/",
      `/api/app/resumo/descadastro?token=${token}`,
    ])
      expect(email.text).toContain(texto)
    for (const proibido of ["segredo@example.invalid", "proibido", "corpo não deve sair"])
      expect(email.text).not.toContain(proibido)
  })
  it("o adaptador recusa payload inválido sem chamar o provedor", async () => {
    vi.stubEnv("RESEND_API_KEY", "synthetic-key")
    vi.stubEnv("RESEND_FROM_EMAIL", "avisos@example.invalid")
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect(await createChannelAdapters().email.send({ ...message, payload: {} })).toEqual({
      ok: false,
      error: "invalid email payload",
    })
    expect(fetch).not.toHaveBeenCalled()
  })
  it("recusa payload incompleto em vez de mandar resumo sem descadastro", () => {
    expect(() => renderEmail({ ...message, payload: {} })).toThrow()
  })
})
