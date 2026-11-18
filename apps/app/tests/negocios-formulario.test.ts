import { describe, expect, it } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import { mensagemDoPedido, textoDaDistancia, validarPedido } from "@/src/negocios/formulario"

describe("formulário do pedido", () => {
  it("aceita a descrição e um prazo opcional", () => {
    expect(validarPedido("Limpar o ar", "")).toBeNull()
    expect(validarPedido("a".repeat(500), "a".repeat(120))).toBeNull()
  })
  // RUN-179: o CEP é opcional (ADR-20261022 §3). Vazio passa; preenchido tem que
  // ter os oito dígitos — a mesma régua do servidor.
  it("o CEP opcional só recusa o que não tem oito dígitos", () => {
    expect(validarPedido("Limpar o ar", "", "")).toBeNull()
    expect(validarPedido("Limpar o ar", "", "69000-000")).toBeNull()
    expect(validarPedido("Limpar o ar", "", "6900-000")).toMatch(/oito dígitos/)
  })
  it("mostra a distância que o servidor calculou, arredondada à centena", () => {
    expect(textoDaDistancia(3100)).toBe("3,1 km")
    expect(textoDaDistancia(0)).toBe("0 km")
  })
  it.each([
    [" ", ""],
    ["a".repeat(501), ""],
    ["Limpar", "a".repeat(121)],
  ])("recusa dados fora dos limites", (descricao, quando) => {
    expect(validarPedido(descricao, quando)).not.toBeNull()
  })
  it("a falha principal preserva o texto e oferece nova tentativa", () => {
    expect(mensagemDoPedido(new FalhaDaApi("rede", 0))).toMatch(/texto continua aqui/)
  })
  it("traduz sessão e acesso sem mensagem técnica", () => {
    expect(mensagemDoPedido(new FalhaDaApi("sem-sessao", 401))).toMatch(/Entre de novo/)
    expect(mensagemDoPedido(new FalhaDaApi("recusado", 403))).toMatch(/não pode/)
    expect(mensagemDoPedido(new FalhaDaApi("nao-encontrado", 404))).toMatch(/disponível/)
  })
  it("usa a orientação pronta do servidor, nunca error.message", () => {
    expect(mensagemDoPedido(new FalhaDaApi("limite", 429, "limite", "Feche um pedido."))).toBe(
      "Feche um pedido.",
    )
    expect(mensagemDoPedido(new Error("segredo"))).not.toContain("segredo")
  })
})
