import { describe, expect, it } from "vitest"
import {
  type EntradaDaCidade,
  type EscolhaDaCidade,
  montarEscolhaDaCidade,
} from "../src/entrada/cidade-canonica-regras"

// A etapa canônica coleta o modelo do provisionamento: cidade pelo código IBGE
// do catálogo, momento do fluxo e data de calendário real. A função é pura, então
// este teste roda em nó, sem DOM, sem rede e com `hoje` injetado.

const HOJE = "2026-11-04"
const MANAUS = "1302603"
const SAO_PAULO = "3304557"

function entrada(mudancas: Partial<EntradaDaCidade> = {}): EntradaDaCidade {
  return {
    uf: "AM",
    cidadeIbge: MANAUS,
    cidadeNome: "Manaus",
    momento: "morando",
    dataChegada: "",
    dataSaida: "",
    destinoIbge: "",
    ...mudancas,
  }
}

function recusa(resultado: EscolhaDaCidade): { campo: string; texto: string } {
  if (resultado.ok) throw new Error("esperava uma recusa de validação, veio uma escolha válida")
  return resultado
}

describe("montarEscolhaDaCidade", () => {
  it("chegando: aceita a data e limpa saída e destino", () => {
    const resultado = montarEscolhaDaCidade(
      entrada({
        momento: "chegando",
        dataChegada: "2026-12-01",
        dataSaida: "2027-01-31",
        destinoIbge: SAO_PAULO,
      }),
      HOJE,
    )
    expect(resultado).toEqual({
      ok: true,
      mudancas: {
        cidade: "Manaus",
        cidadeIbge: MANAUS,
        momento: "chegando",
        dataChegada: "2026-12-01",
        dataSaida: null,
        destinoIbge: null,
      },
    })
  })

  it("chegando: a data de hoje é aceita", () => {
    const resultado = montarEscolhaDaCidade(
      entrada({ momento: "chegando", dataChegada: HOJE }),
      HOJE,
    )
    expect(resultado.ok).toBe(true)
  })

  it("saindo: aceita data e destino e limpa a chegada", () => {
    const resultado = montarEscolhaDaCidade(
      entrada({
        momento: "saindo",
        dataChegada: "2026-12-01",
        dataSaida: "2027-01-31",
        destinoIbge: SAO_PAULO,
      }),
      HOJE,
    )
    expect(resultado).toEqual({
      ok: true,
      mudancas: {
        cidade: "Manaus",
        cidadeIbge: MANAUS,
        momento: "saindo",
        dataChegada: null,
        dataSaida: "2027-01-31",
        destinoIbge: SAO_PAULO,
      },
    })
  })

  it("morando: não leva data nem destino e limpa o que havia", () => {
    const resultado = montarEscolhaDaCidade(
      entrada({
        momento: "morando",
        dataChegada: "2026-12-01",
        dataSaida: "2027-01-31",
        destinoIbge: SAO_PAULO,
      }),
      HOJE,
    )
    expect(resultado).toEqual({
      ok: true,
      mudancas: {
        cidade: "Manaus",
        cidadeIbge: MANAUS,
        momento: "morando",
        dataChegada: null,
        dataSaida: null,
        destinoIbge: null,
      },
    })
  })

  it("recusa a data ausente quando o momento a exige", () => {
    const semChegada = recusa(
      montarEscolhaDaCidade(entrada({ momento: "chegando", dataChegada: "" }), HOJE),
    )
    expect(semChegada.campo).toBe("dataChegada")
    expect(semChegada.texto).not.toBe("")

    const semSaida = recusa(
      montarEscolhaDaCidade(
        entrada({ momento: "saindo", dataSaida: "", destinoIbge: SAO_PAULO }),
        HOJE,
      ),
    )
    expect(semSaida.campo).toBe("dataSaida")
    expect(semSaida.texto).not.toBe("")
  })

  it("recusa data anterior a hoje", () => {
    const chegada = recusa(
      montarEscolhaDaCidade(entrada({ momento: "chegando", dataChegada: "2026-11-03" }), HOJE),
    )
    expect(chegada.campo).toBe("dataChegada")
    expect(chegada.texto).toContain("anterior a hoje")

    const saida = recusa(
      montarEscolhaDaCidade(
        entrada({ momento: "saindo", dataSaida: "2026-10-31", destinoIbge: SAO_PAULO }),
        HOJE,
      ),
    )
    expect(saida.campo).toBe("dataSaida")
    expect(saida.texto).toContain("anterior a hoje")
  })

  it("recusa data que não existe no calendário", () => {
    for (const data of ["2026-02-30", "2026-13-01", "2026-04-31", "31/01/2027", "2026-1-01"]) {
      const resultado = recusa(
        montarEscolhaDaCidade(entrada({ momento: "chegando", dataChegada: data }), HOJE),
      )
      expect(resultado.campo).toBe("dataChegada")
    }
  })

  it("recusa código IBGE fora de sete dígitos", () => {
    for (const codigo of ["", "130260", "13026030", "Manaus"]) {
      const resultado = recusa(montarEscolhaDaCidade(entrada({ cidadeIbge: codigo }), HOJE))
      expect(resultado.campo).toBe("cidade")
    }

    const destino = recusa(
      montarEscolhaDaCidade(
        entrada({ momento: "saindo", dataSaida: "2027-01-31", destinoIbge: "33045" }),
        HOJE,
      ),
    )
    expect(destino.campo).toBe("destinoIbge")
  })

  it("recusa saindo sem a cidade de destino", () => {
    const resultado = recusa(
      montarEscolhaDaCidade(entrada({ momento: "saindo", dataSaida: "2027-01-31" }), HOJE),
    )
    expect(resultado.campo).toBe("destinoIbge")
    expect(resultado.texto).not.toBe("")
  })

  it("recusa momento fora do vocabulário do fluxo", () => {
    for (const momento of ["", "morando-fora"]) {
      const resultado = recusa(montarEscolhaDaCidade(entrada({ momento }), HOJE))
      expect(resultado.campo).toBe("momento")
    }
  })

  it("recusa estado não escolhido", () => {
    const resultado = recusa(montarEscolhaDaCidade(entrada({ uf: "  " }), HOJE))
    expect(resultado.campo).toBe("uf")
  })
})
