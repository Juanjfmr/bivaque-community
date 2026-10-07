import { describe, expect, it } from "vitest"
import { hasSameMediaOrigin } from "../../../apps/web/lib/listings/media-origin"

describe("listing media request origin", () => {
  it("accepts browser authority despite Next loopback normalization", () => {
    expect(
      hasSameMediaOrigin(
        new Request("http://localhost:3012/imoveis/id/fotos", {
          headers: { host: "127.0.0.1:3012", origin: "http://127.0.0.1:3012" },
        }),
      ),
    ).toBe(true)
  })
  it("accepts the exact HTTPS authority", () => {
    expect(
      hasSameMediaOrigin(
        new Request("https://bivaque.example.invalid/imoveis/id/fotos", {
          headers: { host: "bivaque.example.invalid", origin: "https://bivaque.example.invalid" },
        }),
      ),
    ).toBe(true)
  })
  it.each([
    { host: "127.0.0.1:3012", origin: "https://outside.example.invalid" },
    { host: "127.0.0.1:3012", origin: "http://127.0.0.1:3013" },
    { host: "127.0.0.1:3012", origin: "https://127.0.0.1:3012" },
    { host: "127.0.0.1:3012", origin: "null" },
    { host: "127.0.0.1:3012" },
    { origin: "http://127.0.0.1:3012" },
    { host: "outside.example.invalid@127.0.0.1:3012", origin: "http://127.0.0.1:3012" },
    {
      host: "127.0.0.1:3012",
      origin: "http://outside.example.invalid",
      "x-forwarded-host": "outside.example.invalid",
    },
  ])("rejects mismatched, missing or forwarded authority %j", (headers) => {
    expect(
      hasSameMediaOrigin(new Request("http://localhost:3012/imoveis/id/fotos", { headers })),
    ).toBe(false)
  })
})
