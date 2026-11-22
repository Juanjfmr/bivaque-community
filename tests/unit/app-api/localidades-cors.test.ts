import { describe, expect, it, vi } from "vitest"

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: () => ({
    rpc: async () => ({ data: [{ state_code: "AM" }], error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [{ id: "1", city_name: "Manaus", ibge_code: "1" }],
            error: null,
          }),
        }),
      }),
    }),
  }),
}))
import * as estados from "web/app/api/localities/route"
import * as cidades from "web/app/api/localities/[uf]/route"

describe.each(["capacitor://localhost", "https://localhost", "https://estranha.example.invalid"])(
  "CORS %s",
  (origin) => {
    it("responde aos dois endpoints e seus preflights", async () => {
      const req = new Request("https://api.example.invalid/api/localities", { headers: { origin } })
      const esperado = origin.includes("localhost") ? origin : null
      const respostas = [
        await estados.GET(req),
        await cidades.GET(req, { params: Promise.resolve({ uf: "AM" }) }),
        estados.OPTIONS(req),
        cidades.OPTIONS(req),
      ]
      for (const resposta of respostas) {
        expect(resposta.headers.get("access-control-allow-origin")).toBe(esperado)
        expect(resposta.headers.get("access-control-allow-credentials")).toBeNull()
      }
      expect(respostas[2]?.status).toBe(204)
      expect(respostas[3]?.status).toBe(204)
      if (esperado)
        expect(respostas[2]?.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS")
    })
  },
)
