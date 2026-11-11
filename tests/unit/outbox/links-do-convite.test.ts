import type { OutboxMessage } from "@bivaque/domain"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { createChannelAdapters, renderEmail } from "web/lib/outbox/adapters"

// OUTBOX-INVITE-RECIPIENTS, parte do link: o convite de comunidade e o de
// evento chegam ao e-mail com o destino real. Nada aqui usa endereço de gente
// de verdade nem token de produção: o domínio é `example.invalid` e o token é
// um valor fixo da forma que o aceite lê (64 hex).

const ORIGEM = "https://bivaque.example.invalid"

// O token do convite de comunidade é aleatório de 32 bytes; o aceite lê
// `Buffer.from(token, "hex")`, então o que vai na URL é o hex completo.
const TOKEN = "a1b2c3d4e5f60718293a4b5c6d7e8f90".repeat(2)
const OUTRO_TOKEN = "00112233445566778899aabbccddeeff".repeat(2)

const EVENTO = "90000000-0000-4000-8000-000000000001"
const OUTRO_EVENTO = "90000000-0000-4000-8000-000000000002"

function mensagem(
  type: string,
  payload: Record<string, unknown>,
  recipient = "convidado@example.invalid",
): OutboxMessage {
  return {
    id: "1",
    recipient,
    channel: "email",
    type,
    payload,
    attempts: 0,
    updatedAt: 0,
  }
}

function emailEnviado(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const chamadas = fetchMock.mock.calls as unknown as [string, RequestInit][]
  const primeira = chamadas[0]
  if (!primeira) throw new Error("o adaptador não chamou o provedor")
  return JSON.parse(String(primeira[1].body)) as Record<string, unknown>
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGEM)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it("convite de comunidade leva o token do payload no link de aceite", async () => {
  vi.stubEnv("RESEND_API_KEY", "teste")
  vi.stubEnv("RESEND_FROM_EMAIL", "bivaque@example.invalid")
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
  vi.stubGlobal("fetch", fetchMock)

  const mensagemDoConvite = mensagem("community_invite", { invite_token: TOKEN })
  expect((await createChannelAdapters().email.send(mensagemDoConvite)).ok).toBe(true)

  const enviado = emailEnviado(fetchMock)
  expect(enviado["to"]).toEqual(["convidado@example.invalid"])
  expect(String(enviado["text"])).toContain(`${ORIGEM}/invite/${TOKEN}`)
  expect(String(enviado["text"])).not.toContain("Acesse o Bivaque para aceitar.")
})

it("convite de evento leva o id do evento no link do app", async () => {
  vi.stubEnv("RESEND_API_KEY", "teste")
  vi.stubEnv("RESEND_FROM_EMAIL", "bivaque@example.invalid")
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
  vi.stubGlobal("fetch", fetchMock)

  const mensagemDoConvite = mensagem("event_invite", {
    event_id: EVENTO,
    event_title: "Café dos veteranos",
  })
  expect((await createChannelAdapters().email.send(mensagemDoConvite)).ok).toBe(true)

  const enviado = emailEnviado(fetchMock)
  expect(String(enviado["subject"])).toBe("Convite: Café dos veteranos")
  expect(String(enviado["text"])).toContain(`${ORIGEM}/app/evento/${EVENTO}`)
})

it("cada convite usa o token e o evento da própria mensagem", () => {
  const comunidadeA = renderEmail(mensagem("community_invite", { invite_token: TOKEN }))
  const comunidadeB = renderEmail(mensagem("community_invite", { invite_token: OUTRO_TOKEN }))
  expect(comunidadeA.text).toContain(`/invite/${TOKEN}`)
  expect(comunidadeB.text).toContain(`/invite/${OUTRO_TOKEN}`)
  expect(comunidadeA.text).not.toContain(OUTRO_TOKEN)

  const eventoA = renderEmail(mensagem("event_invite", { event_id: EVENTO }))
  const eventoB = renderEmail(mensagem("event_invite", { event_id: OUTRO_EVENTO }))
  expect(eventoA.text).toContain(`/app/evento/${EVENTO}`)
  expect(eventoB.text).toContain(`/app/evento/${OUTRO_EVENTO}`)
  expect(eventoA.text).not.toContain(OUTRO_EVENTO)
})

it("sem o dado do link, o e-mail fica no aviso de sempre em vez de link quebrado", () => {
  const semToken = renderEmail(mensagem("community_invite", {}))
  expect(semToken.text).toBe(
    "Você foi convidado para uma comunidade. Acesse o Bivaque para aceitar.",
  )
  expect(semToken.text).not.toContain(ORIGEM)
  expect(semToken.text).not.toContain("/invite")

  const semEvento = renderEmail(mensagem("event_invite", {}))
  expect(semEvento.text).toBe("Você foi convidado para um evento. Acesse o Bivaque para responder.")
  expect(semEvento.text).not.toContain(ORIGEM)
  expect(semEvento.text).not.toContain("/app/evento")

  // Valor que não é o que o aceite lê também não vira link: um token curto,
  // com caractere fora do hex, não-UUID de evento, vazio, nulo e número.
  for (const payload of [
    { invite_token: "abc123" },
    { invite_token: `${TOKEN.slice(0, 63)}z` },
    { invite_token: "" },
    { invite_token: null },
    { invite_token: 42 },
  ]) {
    const texto = renderEmail(mensagem("community_invite", payload)).text
    expect(texto).not.toContain("/invite/")
    expect(texto).not.toContain(ORIGEM)
  }

  for (const payload of [
    { event_id: "evento-1" },
    { event_id: "90000000-0000-4000-8000-00000000000" },
    { event_id: "" },
    { event_id: null },
    { event_id: 7 },
  ]) {
    const texto = renderEmail(mensagem("event_invite", payload)).text
    expect(texto).not.toContain("/app/evento/")
    expect(texto).not.toContain(ORIGEM)
  }
})

it("destinatário inválido continua recusado, com ou sem link no payload", async () => {
  vi.stubEnv("RESEND_API_KEY", "teste")
  vi.stubEnv("RESEND_FROM_EMAIL", "bivaque@example.invalid")
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
  vi.stubGlobal("fetch", fetchMock)

  for (const recipient of [
    "owner-link@local",
    "event-invite:123",
    "convite@",
    "@example.invalid",
  ]) {
    for (const type of ["community_invite", "event_invite"]) {
      const payload = type === "community_invite" ? { invite_token: TOKEN } : { event_id: EVENTO }
      const resultado = await createChannelAdapters().email.send(mensagem(type, payload, recipient))
      expect(resultado).toEqual({ ok: false, error: "invalid email recipient" })
    }
  }
  expect(fetchMock).not.toHaveBeenCalled()
})
