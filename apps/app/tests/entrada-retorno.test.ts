import { describe, expect, it } from "vitest"
import { retornoValido } from "@/src/entrada/retorno"

describe("retorno após entrada", () => {
  it.each([
    "/app/grupo/123?aba=1",
    "/gerir-comunidades?origem=app",
    "/groups/60000000-0000-4000-8000-000000000001?origem=app",
  ])("aceita %s", (valor) => {
    expect(retornoValido(valor)).toBe(valor)
  })
  it.each([
    "https://x",
    "//x",
    "/\\x",
    "javascript:alert(1)",
    "/login",
    "/groups/123",
    "/groups/60000000-0000-4000-8000-000000000001/editar",
    "",
    "/app/../login",
    "/gerir-comunidades/outra",
    null,
  ])("recusa %s", (valor) => {
    expect(retornoValido(valor)).toBeNull()
  })
})
