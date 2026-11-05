import { describe, expect, it } from "vitest"
import { mensagemDoConvite } from "../src/entrada/mensagens"
import { FalhaDaEntrada } from "../src/entrada/servidor"

// RUN-004 rodada 2, item 9: o 400 do aceite tem motivos diferentes e cada um
// precisa da frase certa; código inválido continua com a frase única.

describe("mensagem da falha do convite", () => {
  it.each([
    ["consentimento-pendente", "Aceite os Termos e o Código de Conduta antes de entrar."],
    ["nome-invalido", "Confira o nome informado e tente de novo."],
    ["email-ausente", "Seu e-mail não chegou nesta sessão. Volte e entre de novo."],
    ["convite-invalido", "Código inválido ou vencido. Volte e confira o convite."],
  ])("400 %s tem mensagem própria", (codigo, esperada) => {
    expect(mensagemDoConvite(new FalhaDaEntrada(codigo, 400))).toBe(esperada)
  })

  it("429 e 503 não se confundem com código inválido", () => {
    expect(mensagemDoConvite(new FalhaDaEntrada("convite-limite", 429))).toContain("Muitas")
    expect(mensagemDoConvite(new FalhaDaEntrada("convite-indisponivel", 503))).toContain(
      "indisponível",
    )
  })

  it("falha desconhecida tem a frase genérica", () => {
    expect(mensagemDoConvite(new Error("boom"))).toBe(
      "Não foi possível aceitar o convite agora. Tente de novo.",
    )
  })
})
