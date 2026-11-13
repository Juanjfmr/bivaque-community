import { describe, expect, it } from "vitest"

import { errosDaPergunta, errosDoDesapego, precoBRL, semErros } from "@/src/criar/formularios"

/**
 * A régua dos formulários do Criar, por campo: os limites são os do servidor
 * (`apps/web/lib/listings/catalog.ts` e `.../indications/indications.ts`), e a
 * frase de cada erro é a mesma que a pessoa leria de volta do servidor.
 */

describe("pergunta", () => {
  const valida = {
    titulo: "Indicam um serviço de manutenção de bicicletas?",
    assunto: "Serviços",
  }

  it("aceita o pedido com contexto", () => {
    expect(errosDaPergunta(valida)).toEqual({})
    expect(semErros(errosDaPergunta(valida))).toBe(true)
  })

  it("o pedido curto acusa o título, e só ele", () => {
    expect(errosDaPergunta({ ...valida, titulo: "Bike?" })).toEqual({
      titulo: "Escreva o que você procura com um pouco mais de contexto.",
    })
  })

  it("recusa título acima de 300 e assunto acima de 60", () => {
    expect(errosDaPergunta({ ...valida, titulo: "x".repeat(301) }).titulo).toBe(
      "Encurte o pedido para até 300 caracteres.",
    )
    expect(errosDaPergunta({ ...valida, assunto: "x".repeat(61) }).assunto).toBe(
      "O assunto vai até 60 caracteres.",
    )
  })
})

describe("desapego", () => {
  const valido = {
    titulo: "Mesa com quatro cadeiras",
    bairro: "Flores",
    preco: "750.50",
    descricao: "Mesa de madeira em bom estado. Retirada a combinar.",
  }

  it("aceita o anúncio completo", () => {
    expect(errosDoDesapego(valido)).toEqual({})
  })

  it("cada obrigatório vazio volta no próprio campo", () => {
    expect(errosDoDesapego({ ...valido, titulo: "" }).titulo).toBe(
      "O título precisa de pelo menos 3 caracteres.",
    )
    expect(errosDoDesapego({ ...valido, bairro: " " }).bairro).toBe("Informe o bairro.")
    expect(errosDoDesapego({ ...valido, preco: "" }).preco).toBe("Informe o preço do item.")
    expect(errosDoDesapego({ ...valido, descricao: "" }).descricao).toBe("Descreva o item.")
  })

  it("o preço aceita ponto ou vírgula com centavos e recusa o resto", () => {
    expect(errosDoDesapego({ ...valido, preco: "650" }).preco).toBeUndefined()
    expect(errosDoDesapego({ ...valido, preco: "650,00" }).preco).toBeUndefined()
    expect(errosDoDesapego({ ...valido, preco: "abc" }).preco).toBe(
      "Informe um valor como 650 ou 650,00.",
    )
    expect(errosDoDesapego({ ...valido, preco: "0" }).preco).toBe(
      "Informe um valor como 650 ou 650,00.",
    )
  })

  it("o preço tem o teto do servidor", () => {
    expect(errosDoDesapego({ ...valido, preco: "1000000.01" }).preco).toBe(
      "O valor informado é alto demais.",
    )
  })

  it("o preço aparece em reais na revisão", () => {
    // O Intl separa "R$" do número com espaço fixo; a tela não depende disso.
    expect(precoBRL("750.5").replace(/\u00a0/g, " ")).toBe("R$ 750,50")
    expect(precoBRL("")).toBe("R$ —")
  })
})
