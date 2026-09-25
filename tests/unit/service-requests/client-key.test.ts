import { describe, expect, it } from "vitest"
import { newClientKey, shouldRotateClientKey } from "web/lib/service-requests/client-key"

describe("chave de repetição segura da resposta do prestador", () => {
  it("chave ainda não usada não precisa girar", () => {
    expect(shouldRotateClientKey(null, "qualquer texto")).toBe(false)
  })

  it("retry do mesmo texto (só espaço nas pontas mudou) mantém a chave", () => {
    expect(shouldRotateClientKey("Posso ir amanhã", " Posso ir amanhã ")).toBe(false)
  })

  it("texto editado depois de uma tentativa gira a chave", () => {
    expect(shouldRotateClientKey("Posso ir amanhã", "Posso ir amanhã às 9h")).toBe(true)
  })

  it("gera chaves distintas", () => {
    expect(newClientKey()).not.toBe(newClientKey())
  })
})
