import { describe, expect, it } from "vitest"
import { retornoValido } from "@/src/entrada/retorno"

describe("retorno ap?s entrada", () => {
  it.each(["/app/grupo/123?aba=1", "/gerir-comunidades?origem=app"])("aceita %s", (valor) => {
    expect(retornoValido(valor)).toBe(valor)
  })
  it.each([
    "https://x",
    "//x",
    "/\\x",
    "javascript:alert(1)",
    "/login",
    "",
    "/app/../login",
    "/gerir-comunidades/outra",
    null,
  ])("recusa %s", (valor) => {
    expect(retornoValido(valor)).toBeNull()
  })
})
