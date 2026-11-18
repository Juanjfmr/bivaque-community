import { describe, expect, it } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import { forcaDoValor, OPCOES_DE_FORCA, SEM_FORCA, valorDaForca } from "@/lib/voce/afiliacao"
import {
  DIAS_DE_SAIDA,
  DIAS_MAXIMOS_DE_SAIDA,
  dataLegivel,
  destinoDoEndereco,
  mensagemDaMudanca,
  prazoMaximo,
  prazoPadrao,
} from "@/lib/voce/cidade"

// A conta do formulário de mudança de cidade e os valores da afiliação
// (RUN-170). O que se prova aqui é o que a tela decide sozinha: o prazo que o
// campo já traz, o teto, a data por extenso, o destino que vem do endereço e a
// frase da recusa. Quem grava é a rota — e ela chama o módulo compartilhado.

const HOJE = new Date("2026-11-15T12:00:00Z")
const RIO = "00000000-0000-4000-8000-000000000002"

describe("prazos da mudança", () => {
  it("o campo abre com 30 dias, como o provisionamento", () => {
    expect(prazoPadrao(HOJE)).toBe("2026-12-15")
    expect(DIAS_DE_SAIDA).toBe(30)
  })

  it("o teto do campo é 180 dias", () => {
    expect(prazoMaximo(HOJE)).toBe("2027-05-14")
    expect(DIAS_MAXIMOS_DE_SAIDA).toBe(180)
  })
})

describe("data por extenso", () => {
  it("escreve a data do banco em português", () => {
    expect(dataLegivel("2026-12-05")).toBe("5 de dezembro de 2026")
    expect(dataLegivel("2026-12-05T00:00:00Z")).toBe("5 de dezembro de 2026")
  })

  it("sem data é vazio, nunca 'Invalid Date' na tela", () => {
    expect(dataLegivel("")).toBe("")
    expect(dataLegivel("amanhã")).toBe("")
    expect(dataLegivel("2026-13-05")).toBe("")
  })
})

describe("destino vindo do endereço", () => {
  it("lê o id do parâmetro mudar", () => {
    expect(destinoDoEndereco({ mudar: RIO })).toBe(RIO)
    expect(destinoDoEndereco({ mudar: ` ${RIO} ` })).toBe(RIO)
  })

  it("o que não é id de cidade é ignorado", () => {
    expect(destinoDoEndereco({})).toBeNull()
    expect(destinoDoEndereco({ mudar: "manaus" })).toBeNull()
    expect(destinoDoEndereco({ mudar: 42 })).toBeNull()
  })
})

describe("frase da falha da mudança", () => {
  it("usa a frase pronta do servidor, inclusive a de mudança em andamento", () => {
    const falha = new FalhaDaApi(
      "conflito",
      409,
      "mudanca-em-andamento",
      "Você já tem uma mudança em andamento.",
    )
    expect(mensagemDaMudanca(falha)).toBe("Você já tem uma mudança em andamento.")
  })

  it("sessão sem cidade tem frase própria", () => {
    expect(mensagemDaMudanca(new FalhaDaApi("conflito", 409, "sem-cidade"))).toContain(
      "Não encontramos a sua cidade",
    )
  })

  it("falha sem frase do servidor não vira texto técnico", () => {
    const mensagem = mensagemDaMudanca(new FalhaDaApi("indisponivel", 503))
    expect(mensagem).toBe("Não foi possível mudar a sua cidade agora. Tente de novo.")
    expect(mensagemDaMudanca(new Error("boom"))).toBe(mensagem)
  })
})

describe("Força Armada na tela", () => {
  it("oferece as três forças mais a opção de não declarar", () => {
    expect(OPCOES_DE_FORCA.map((opcao) => opcao.valor)).toEqual([
      SEM_FORCA,
      "marinha",
      "exercito",
      "aeronautica",
    ])
  })

  it("o que o banco devolveu é o que a tela marca; fora do enum é 'Nenhuma'", () => {
    expect(forcaDoValor("marinha")).toBe("marinha")
    expect(forcaDoValor(null)).toBe(SEM_FORCA)
    expect(forcaDoValor("fuzileiros")).toBe(SEM_FORCA)
  })

  it("'Nenhuma' no corpo é ausência: a rota apaga a linha", () => {
    expect(valorDaForca(SEM_FORCA)).toBeNull()
    expect(valorDaForca("exercito")).toBe("exercito")
  })
})
