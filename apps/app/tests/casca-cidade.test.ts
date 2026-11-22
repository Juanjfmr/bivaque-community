import { describe, expect, it } from "vitest"
import { type CidadeDaCasca, cidadeDoInicio, cidadesDaCasca, comCidadeTrocada } from "@/lib/casca"

// O chip de cidade da casca (BUG-CIDADE-GRUPOS): a cidade do topo e a cidade de
// casa vêm da SESSÃO. Com vínculo, o padrão de demonstração não aparece; trocar
// pelo chip muda a cidade consultada, e a Início nomeia a mesma do chip.

const PADRAO = "Manaus"

describe("cidade da casca", () => {
  it("sessão com cidade X mostra X no chip e em casa, sem o padrão", () => {
    const cidades = cidadesDaCasca("Rio de Janeiro", {}, PADRAO)
    expect(cidades).toEqual({ cidade: "Rio de Janeiro", cidadeDeCasa: "Rio de Janeiro" })
    expect(cidades.cidade).not.toBe(PADRAO)
  })

  it("sem cidade na sessão o padrão vale, e a semente da prova manda", () => {
    expect(cidadesDaCasca(null, {}, PADRAO)).toEqual({
      cidade: PADRAO,
      cidadeDeCasa: PADRAO,
    })
    // Cidade vazia não é cidade: quem tem vínculo sem nome ainda cai no padrão,
    // nunca numa casca sem rótulo.
    expect(cidadesDaCasca("   ", {}, PADRAO).cidade).toBe(PADRAO)
    expect(cidadesDaCasca("Rio de Janeiro", { cidade: "Recife" }, PADRAO)).toEqual({
      cidade: "Recife",
      cidadeDeCasa: "Rio de Janeiro",
    })
  })

  it("trocar pelo chip muda a consultada e preserva a de casa", () => {
    const emCasa: CidadeDaCasca = { cidade: "Rio de Janeiro", cidadeDeCasa: "Rio de Janeiro" }
    const consultando = comCidadeTrocada(emCasa, "  Recife ")
    expect(consultando).toEqual({ cidade: "Recife", cidadeDeCasa: "Rio de Janeiro" })
    // Cidade em branco não muda nada.
    expect(comCidadeTrocada(consultando, " ")).toEqual(consultando)
  })

  it("a Início mostra a mesma cidade do chip, em casa e consultando", () => {
    const emCasa: CidadeDaCasca = { cidade: "Rio de Janeiro", cidadeDeCasa: "Rio de Janeiro" }
    expect(cidadeDoInicio(emCasa, "Rio de Janeiro")).toBe("Rio de Janeiro")
    // Sem o dado da consulta, a tela usa a cidade do chip em vez de inventar.
    expect(cidadeDoInicio(emCasa, null)).toBe("Rio de Janeiro")
    // Consultando outra cidade, o nome do topo acompanha o chip.
    const consultando = comCidadeTrocada(emCasa, "Recife")
    expect(cidadeDoInicio(consultando, "Rio de Janeiro")).toBe("Recife")
  })
})
