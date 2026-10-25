import { describe, expect, it } from "vitest"

import {
  atualizarEntrada,
  CHAVE_DA_ENTRADA,
  CHAVE_SEM_REGISTRO,
  descritorDaAcao,
  descritorDoElemento,
  type EstadoDaEntrada,
  entradaPadrao,
  lerEntrada,
  seletorDoDescritor,
  temEntrada,
} from "../../lib/navegacao/entrada"

describe("estado por entrada", () => {
  it("nasce com origem, pai e o resto zerado", () => {
    expect(entradaPadrao({ origem: "comunidade", pai: "inicio", chave: "e-1" })).toEqual({
      versao: 1,
      chave: "e-1",
      origem: "comunidade",
      pai: "inicio",
      rolagem: 0,
      foco: null,
      filtros: {},
      sobreposicao: null,
    })
  })

  it("dá identidade própria a cada entrada", () => {
    const primeira = entradaPadrao()
    const segunda = entradaPadrao()
    expect(typeof primeira.chave).toBe("string")
    expect(primeira.chave).not.toBe("")
    expect(primeira.chave).not.toBe(segunda.chave)
    expect(primeira.origem).toBe("inicio")
    expect(primeira.pai).toBeNull()
  })

  it("guarda o registro sob uma chave própria do app", () => {
    expect(CHAVE_DA_ENTRADA).toBe("bivaqueEntrada")
    expect(CHAVE_DA_ENTRADA.startsWith("bivaque")).toBe(true)

    const registro = {
      [CHAVE_DA_ENTRADA]: entradaPadrao({ origem: "voce" }),
      outraChave: 7,
    }
    const estado = atualizarEntrada(lerEntrada(registro), { origem: "mercado", rolagem: 240 })
    expect(estado.origem).toBe("mercado")
    expect(estado.rolagem).toBe(240)
    expect(lerEntrada({ [CHAVE_DA_ENTRADA]: estado, outraChave: "seja o que for" })).toEqual(estado)
  })

  it("cai no padrão quando o estado é ausente, inválido ou de versão antiga", () => {
    const padrao = entradaPadrao()
    for (const bruto of [
      undefined,
      null,
      "texto",
      42,
      {},
      { [CHAVE_DA_ENTRADA]: null },
      { [CHAVE_DA_ENTRADA]: "texto" },
      { [CHAVE_DA_ENTRADA]: { versao: 0 } },
      { [CHAVE_DA_ENTRADA]: { versao: 1, origem: "inexistente" } },
    ]) {
      expect(lerEntrada(bruto)).toMatchObject({
        versao: padrao.versao,
        origem: padrao.origem,
        pai: padrao.pai,
        rolagem: padrao.rolagem,
        foco: padrao.foco,
        filtros: padrao.filtros,
        sobreposicao: padrao.sobreposicao,
      })
    }
  })

  it("descarta só o campo inválido e mantém o resto", () => {
    const lido = lerEntrada({
      [CHAVE_DA_ENTRADA]: {
        versao: 1,
        chave: "e-2",
        origem: "voce",
        pai: 12,
        rolagem: "muito",
        foco: { tipo: "acao", acao: "abrir-item", valor: "item-3" },
        filtros: { ordenacao: "preco-baixo", invalido: 3 },
        sobreposicao: "sobreposicao-que-nao-existe",
      },
    })
    expect(lido).toEqual({
      versao: 1,
      chave: "e-2",
      origem: "voce",
      pai: null,
      rolagem: 0,
      foco: { tipo: "acao", acao: "abrir-item", valor: "item-3" },
      filtros: { ordenacao: "preco-baixo" },
      sobreposicao: null,
    })
  })

  it("atualiza sem perder chaves e mescla filtros", () => {
    const base: EstadoDaEntrada = {
      versao: 1,
      chave: "e-3",
      origem: "inicio",
      pai: "comunidade",
      rolagem: 100,
      foco: descritorDaAcao("abrir-item", "item-1"),
      filtros: { ordenacao: "recente" },
      sobreposicao: null,
    }
    const comFiltro = atualizarEntrada(base, { filtros: { aba: "resolvidas" } })
    expect(comFiltro.filtros).toEqual({ ordenacao: "recente", aba: "resolvidas" })
    expect(comFiltro.pai).toBe("comunidade")
    expect(comFiltro.rolagem).toBe(100)
    expect(comFiltro.chave).toBe("e-3")

    const comRolagem = atualizarEntrada(comFiltro, { rolagem: 512 })
    expect(comRolagem.rolagem).toBe(512)
    expect(comRolagem.filtros).toEqual({ ordenacao: "recente", aba: "resolvidas" })

    const semFoco = atualizarEntrada(comRolagem, { foco: null })
    expect(semFoco.foco).toBeNull()
    // `pai: null` é uma mudança de verdade, não um campo ausente.
    expect(atualizarEntrada(semFoco, { pai: null }).pai).toBeNull()
    expect(atualizarEntrada(semFoco, {}).pai).toBe("comunidade")
  })

  it("não troca de identidade quando a entrada ainda não tem registro", () => {
    expect(lerEntrada(undefined).chave).toBe(CHAVE_SEM_REGISTRO)
    expect(lerEntrada(undefined).chave).toBe(lerEntrada({}).chave)

    const comRegistro = { [CHAVE_DA_ENTRADA]: entradaPadrao({ chave: "e-registrada" }) }
    expect(lerEntrada(comRegistro).chave).toBe("e-registrada")
    expect(temEntrada(comRegistro)).toBe(true)
    expect(temEntrada({})).toBe(false)
    expect(temEntrada({ [CHAVE_DA_ENTRADA]: { versao: 0 } })).toBe(false)
  })

  it("traduz descritor em seletor e seletor em descritor", () => {
    expect(seletorDoDescritor(descritorDaAcao("abrir-item", "item-30"))).toBe(
      '[data-acao="abrir-item"][data-valor="item-30"]',
    )
    expect(seletorDoDescritor({ tipo: "id", id: "titulo-da-tela" })).toBe("#titulo-da-tela")

    const elemento = (atributos: Record<string, string>, id = "") => ({
      id,
      getAttribute: (nome: string) => atributos[nome] ?? null,
    })
    expect(
      descritorDoElemento(elemento({ "data-acao": "abrir-detalhe", "data-valor": "q-1" })),
    ).toEqual({ tipo: "acao", acao: "abrir-detalhe", valor: "q-1" })
    expect(descritorDoElemento(elemento({}, "titulo-da-tela"))).toEqual({
      tipo: "id",
      id: "titulo-da-tela",
    })
    expect(descritorDoElemento(elemento({}))).toBeNull()
  })
})
