import { describe, expect, it } from "vitest"

import {
  errosDaPergunta,
  errosDoDesapego,
  errosDoImovel,
  precoBRL,
  semErros,
} from "@/src/criar/formularios"

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
    expect(errosDoDesapego({ ...valido, preco: "" }).preco).toBe("Informe o preço do item.")
    expect(errosDoDesapego({ ...valido, descricao: "" }).descricao).toBe("Descreva o item.")
  })

  // RUN-175 / ADR-20261022 §2: o desapego pode aparecer só com a cidade.
  it("bairro é opcional: vazio não é erro", () => {
    expect(errosDoDesapego({ ...valido, bairro: "" }).bairro).toBeUndefined()
    expect(errosDoDesapego({ ...valido, bairro: "x".repeat(81) }).bairro).toBe(
      "O bairro passa de 80 caracteres.",
    )
  })

  it("CEP opcional: preenchido, exige oito dígitos", () => {
    expect(errosDoDesapego({ ...valido, cep: "" }).cep).toBeUndefined()
    expect(errosDoDesapego({ ...valido, cep: "69000-000" }).cep).toBeUndefined()
    expect(errosDoDesapego({ ...valido, cep: "6900" }).cep).toBe("Informe um CEP com oito dígitos.")
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

describe("imóvel", () => {
  const valido = {
    titulo: "Apartamento 2 quartos no Centro",
    bairro: "Centro",
    cep: "69000-000",
    valor: "1800",
    quartos: "2",
    vagas: "1",
    area: "62,5",
    descricao: "Próximo ao comércio.",
  }

  it("aceita o imóvel completo e o imóvel sem os opcionais", () => {
    expect(errosDoImovel(valido)).toEqual({})
    expect(errosDoImovel({ ...valido, quartos: "", vagas: "", area: "", descricao: "" })).toEqual(
      {},
    )
  })

  // RUN-175: o imóvel nasce do CEP; sem ele não há geocodificação nem anúncio.
  it("o CEP é obrigatório e precisa ter oito dígitos", () => {
    expect(errosDoImovel({ ...valido, cep: "" }).cep).toBe("Informe o CEP do imóvel.")
    expect(errosDoImovel({ ...valido, cep: "6900" }).cep).toBe("Informe o CEP do imóvel.")
    expect(errosDoImovel({ ...valido, cep: "69000000" }).cep).toBeUndefined()
  })

  // O local exato é o endereço publicado: sem endereço, a escolha não existe.
  it("local exato exige endereço; aproximado não", () => {
    expect(errosDoImovel({ ...valido, localizacaoPublica: "exata" }).localizacaoPublica).toBe(
      "Para o local exato, informe o endereço.",
    )
    expect(
      errosDoImovel({ ...valido, localizacaoPublica: "exata", endereco: "Rua A, 100" })
        .localizacaoPublica,
    ).toBeUndefined()
    expect(
      errosDoImovel({ ...valido, localizacaoPublica: "aproximada" }).localizacaoPublica,
    ).toBeUndefined()
  })

  it("cada obrigatório vazio volta no próprio campo", () => {
    expect(errosDoImovel({ ...valido, titulo: "x" }).titulo).toBe("Dê um título ao imóvel.")
    expect(errosDoImovel({ ...valido, bairro: " " }).bairro).toBe("Informe o bairro.")
    expect(errosDoImovel({ ...valido, valor: "" }).valor).toBe("Informe o valor do imóvel.")
  })

  it("o valor é real inteiro: centavos voltam 400 do servidor", () => {
    expect(errosDoImovel({ ...valido, valor: "1800,50" }).valor).toBe(
      "Informe um valor em reais, sem centavos e sem símbolo.",
    )
    expect(errosDoImovel({ ...valido, valor: "caro" }).valor).toBe(
      "Informe um valor em reais, sem centavos e sem símbolo.",
    )
    expect(errosDoImovel({ ...valido, valor: "100000001" }).valor).toBe(
      "Valor acima do limite permitido.",
    )
  })

  it("área, quartos e vagas seguem o teto do servidor", () => {
    expect(errosDoImovel({ ...valido, area: "0" }).area).toBe("Área fora do intervalo permitido.")
    expect(errosDoImovel({ ...valido, area: "100001" }).area).toBe(
      "Área fora do intervalo permitido.",
    )
    expect(errosDoImovel({ ...valido, area: "62,555" }).area).toBe(
      "Informe a área em metros quadrados.",
    )
    expect(errosDoImovel({ ...valido, quartos: "21" }).quartos).toBe("Número acima do limite.")
    expect(errosDoImovel({ ...valido, vagas: "x" }).vagas).toBe("Informe um número inteiro.")
  })
})
