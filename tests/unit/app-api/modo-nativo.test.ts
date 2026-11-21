import { describe, expect, it } from "vitest"
import { avaliarModoNativo } from "web/lib/app-api/modo-nativo"

describe("modo nativo", () => {
  const avaliar = (headers: Record<string, string>) =>
    avaliarModoNativo(new Request("https://example.invalid", { headers }))
  it("aceita as origens nativas e aus?ncia de origem", () => {
    for (const origin of ["https://localhost", "capacitor://localhost"]) {
      expect(avaliar({ "x-bivaque-cliente": "loja", origin })).toEqual({ nativo: true })
    }
    expect(avaliar({ "x-bivaque-cliente": "loja" })).toEqual({ nativo: true })
  })
  it("recusa origem web, null e cookie de sess?o", () => {
    for (const origin of ["http://localhost:3000", "null"]) {
      expect(avaliar({ "x-bivaque-cliente": "loja", origin })).toEqual({ recusa: 403 })
    }
    expect(
      avaliar({ "x-bivaque-cliente": "loja", cookie: "outro=x; sb-projeto-auth-token=y" }),
    ).toEqual({ recusa: 400 })
  })
  it("trata cabe?alho ausente ou diferente como web", () => {
    expect(avaliar({})).toEqual({ nativo: false })
    expect(avaliar({ "x-bivaque-cliente": "web" })).toEqual({ nativo: false })
  })
})
