import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// RUN-020: o outbox é fila de E-MAIL. Convite de comunidade e de evento não
// têm endereço do convidado — o de comunidade é um link que o dono compartilha,
// o de evento chega pelo aviso dentro do app. Nada destes dois pode ser
// enfileirado; o destinatário inventado (`owner-link@local`,
// `event-invite:{id}`) era entrega para ninguém.

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => undefined })),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { createServerClient as createAuthClient } from "@supabase/ssr"
import { sendCommunityInviteAction } from "web/app/(shell)/communities/community-invite-actions"
import { createServerClient as createServiceClient } from "web/lib/supabase/server"

const USER = "20000000-0000-4000-8000-000000000001"
const COMUNIDADE = "40000000-0000-4000-8000-000000000001"
const CONVITE = "70000000-0000-4000-8000-000000000001"

type Chamada = { tabela: string; metodo: string; argumentos: unknown[] }

function autenticar(opcoes: { convitesGravados?: number } = {}) {
  const chamadas: Chamada[] = []

  const authClient = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: USER } }, error: null })) },
    from: vi.fn((tabela: string) => ({
      upsert: vi.fn(async () => {
        chamadas.push({ tabela, metodo: "upsert", argumentos: [] })
        return {
          data: Array.from({ length: opcoes.convitesGravados ?? 1 }, () => ({})),
          error: null,
        }
      }),
    })),
  }

  const serviceClient = {
    from: vi.fn((tabela: string) => ({
      insert: vi.fn(async (valor: unknown) => {
        chamadas.push({ tabela, metodo: "insert", argumentos: [valor] })
        return { error: null }
      }),
      select: vi.fn(() => {
        chamadas.push({ tabela, metodo: "select", argumentos: [] })
        return { eq: () => ({ contains: () => ({ gte: async () => ({ count: 0 }) }) }) }
      }),
    })),
    rpc: vi.fn(async () => {
      chamadas.push({ tabela: "rpc", metodo: "create_community_invitation", argumentos: [] })
      return { data: CONVITE, error: null }
    }),
  }

  vi.mocked(createAuthClient).mockReturnValue(authClient as never)
  vi.mocked(createServiceClient).mockReturnValue(serviceClient as never)
  return { chamadas, serviceClient }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Só o cliente de Auth lê estas: valores descartáveis, nenhum segredo real.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://local.example.invalid")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-de-teste")
  // Sem Upstash a cota de convites é aberta; o limite de família é outro teste.
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("convites sem endereço de e-mail", () => {
  it("convite de comunidade devolve o link do dono e não enfileira nada", async () => {
    const { chamadas, serviceClient } = autenticar()

    const formData = new FormData()
    formData.set("communityId", COMUNIDADE)
    const resultado = await sendCommunityInviteAction(formData)

    expect(resultado?.inviteId).toBe(CONVITE)
    expect(resultado?.token).toMatch(/^[0-9a-f]{64}$/)
    expect(serviceClient.from).not.toHaveBeenCalled()
    expect(chamadas.some((chamada) => chamada.tabela === "outbox")).toBe(false)
  })
})
