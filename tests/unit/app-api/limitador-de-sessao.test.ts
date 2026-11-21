import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { afterEach, describe, expect, it, vi } from "vitest"
import { chaveDeLimite } from "web/lib/app-api/entrada-limite"
import { consumirSessaoNativa } from "web/lib/app-api/limitador-de-sessao"

afterEach(() => vi.unstubAllEnvs())

describe("limitador de sessão nativa", () => {
  it.each([
    ["token", 20],
    ["renovar", 120],
  ] as const)("consome %s com o teto correto", async (escopo, teto) => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null })
    const servico = { rpc } as unknown as SupabaseClient<Database>
    expect(await consumirSessaoNativa(servico, escopo, "203.0.113.9")).toBe("liberado")
    expect(rpc).toHaveBeenCalledWith("sessao_nativa_attempt", {
      p_scope: escopo,
      p_key_hash: chaveDeLimite("ip", "203.0.113.9"),
      p_max: teto,
      p_window_seconds: 600,
    })
  })

  it("conta o balde sem IP e recusa quando esgotado", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null })
    const servico = { rpc } as unknown as SupabaseClient<Database>
    expect(await consumirSessaoNativa(servico, "token", null)).toBe("estourou")
    expect(rpc.mock.calls[0]?.[1].p_key_hash).toBe(chaveDeLimite("ip", "sem-ip"))
  })

  it("fecha em falhas do serviço, resposta inválida ou segredo ausente", async () => {
    expect(await consumirSessaoNativa(null, "token", null)).toBe("indisponivel")
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: new Error() })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockRejectedValueOnce(new Error())
    const servico = { rpc } as unknown as SupabaseClient<Database>
    for (let i = 0; i < 3; i++)
      expect(await consumirSessaoNativa(servico, "token", null)).toBe("indisponivel")
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("BIVAQUE_LIMITER_PEPPER", "")
    expect(await consumirSessaoNativa(servico, "token", null)).toBe("indisponivel")
    expect(rpc).toHaveBeenCalledTimes(3)
  })
})
