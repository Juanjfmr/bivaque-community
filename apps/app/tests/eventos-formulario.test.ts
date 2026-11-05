import { describe, expect, it } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  corpoDoEncontro,
  mensagemDaFalha,
  paraCampoDeDataHora,
  validarEncontro,
} from "@/src/eventos/formulario"

/**
 * A régua do formulário no app. Ela não substitui a do servidor — evita mandar
 * o que já se sabe que volta 400, e mantém os mesmos limites para a mensagem
 * aparecer antes do pedido.
 */

const valido = {
  titulo: "Café da manhã",
  descricao: "Encontro aberto.",
  comecaEm: "2026-11-10T09:00",
  local: "Praça do centro",
}

describe("validação do encontro", () => {
  it("aceita o formulário completo", () => {
    expect(validarEncontro(valido)).toBeNull()
  })

  it("exige título com pelo menos dois caracteres", () => {
    expect(validarEncontro({ ...valido, titulo: " a " })).toBe(
      "O título precisa de pelo menos 2 caracteres.",
    )
  })

  it("recusa título, descrição e local acima do teto do servidor", () => {
    expect(validarEncontro({ ...valido, titulo: "x".repeat(201) })).toContain("200")
    expect(validarEncontro({ ...valido, descricao: "x".repeat(2001) })).toContain("2000")
    expect(validarEncontro({ ...valido, local: "x".repeat(201) })).toContain("200")
  })

  it("exige data e recusa data impossível", () => {
    expect(validarEncontro({ ...valido, comecaEm: "  " })).toBe(
      "Informe a data e a hora do encontro.",
    )
    expect(validarEncontro({ ...valido, comecaEm: "2026-13-45T99:99" })).toBe(
      "Data e hora inválidas.",
    )
  })
})

describe("corpo enviado", () => {
  it("tira espaço sobrando e manda o instante em ISO", () => {
    const corpo = corpoDoEncontro({ ...valido, titulo: "  Café  ", local: "  Praça  " })
    expect(corpo.titulo).toBe("Café")
    expect(corpo.local).toBe("Praça")
    expect(corpo.comecaEm).toBe(new Date("2026-11-10T09:00").toISOString())
  })
})

describe("ida e volta do campo de data", () => {
  it("o valor do campo volta igual ao que foi digitado", () => {
    const iso = new Date("2026-11-10T09:30").toISOString()
    expect(paraCampoDeDataHora(iso)).toBe("2026-11-10T09:30")
  })

  it("data inválida não vira campo preenchido", () => {
    expect(paraCampoDeDataHora("nada")).toBe("")
  })
})

// Item 4 da revisão: cada ação tem a sua frase, e a frase do servidor vem
// primeiro. Antes, todo 403 virava "Só quem organiza…" — inclusive a pergunta.
describe("mensagem de falha por ação", () => {
  const semMensagem = (motivo: string | null) => new FalhaDaApi("recusado", 403, motivo)

  it("403 sem motivo usa a frase da própria ação", () => {
    expect(mensagemDaFalha(semMensagem(null), "pergunta")).toBe(
      "Não foi possível enviar. Seu texto foi mantido.",
    )
    expect(mensagemDaFalha(semMensagem(null), "presenca")).toBe(
      "Não foi possível registrar sua presença. Tente de novo.",
    )
    expect(mensagemDaFalha(semMensagem(null), "criar")).toBe(
      "Não foi possível criar o encontro. Tente de novo.",
    )
  })

  it("a mensagem do servidor vence a frase da ação", () => {
    const falha = new FalhaDaApi(
      "recusado",
      403,
      "recusado",
      "Você já tem conversa com esta pessoa.",
    )
    expect(mensagemDaFalha(falha, "pergunta")).toBe("Você já tem conversa com esta pessoa.")
  })

  it("só a edição por quem não organiza acusa autoria", () => {
    expect(mensagemDaFalha(semMensagem("nao-organiza"), "editar")).toBe(
      "Só quem organiza pode mudar este encontro.",
    )
    expect(mensagemDaFalha(semMensagem(null), "pergunta")).not.toContain("organiza pode mudar")
  })

  it("criar sem cidade e presença de outra cidade têm frase própria", () => {
    expect(mensagemDaFalha(semMensagem("sem-cidade"), "criar")).toBe(
      "Escolha a sua cidade antes de criar um encontro.",
    )
    expect(mensagemDaFalha(semMensagem("de-outra-cidade"), "presenca")).toContain("outra cidade")
  })

  it("sessão vencida pede entrar de novo, em qualquer ação", () => {
    const falha = new FalhaDaApi("sem-sessao", 401)
    expect(mensagemDaFalha(falha, "presenca")).toContain("sessão expirou")
  })

  it("pedido inválido mostra a correção que o servidor apontou", () => {
    const falha = new FalhaDaApi(
      "invalido",
      400,
      "dados-invalidos",
      "O título precisa de 2 caracteres.",
    )
    expect(mensagemDaFalha(falha, "criar")).toBe("O título precisa de 2 caracteres.")
  })

  it("falha que nem é da API cai na frase da ação", () => {
    expect(mensagemDaFalha(new Error("boom"), "encontro")).toBe(
      "Não foi possível carregar o encontro. Tente de novo.",
    )
  })
})
