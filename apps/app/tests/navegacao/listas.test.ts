import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { atualizarEntrada, entradaPadrao } from "../../lib/navegacao/entrada"
import {
  lerDaLista,
  lerTextoDaLista,
  listaPronta,
  mudancaDaLista,
} from "../../lib/navegacao/listas"

const RAIZ = join(import.meta.dirname, "..", "..")

describe("lista guardada na entrada — aba e filtros", () => {
  it("devolve a opção guardada quando ela ainda existe", () => {
    const filtros = { "salvos-aba": "imoveis", "comunidade-filtro": "mine" }
    expect(lerDaLista(filtros, "salvos-aba", ["desapegos", "imoveis"], "desapegos")).toBe("imoveis")
    expect(lerDaLista(filtros, "comunidade-filtro", ["help", "ok", "mine"], "help")).toBe("mine")
  })

  it("volta ao padrão quando o valor sumiu ou não é opção da tela", () => {
    expect(lerDaLista({}, "salvos-aba", ["desapegos", "imoveis"], "desapegos")).toBe("desapegos")
    expect(lerDaLista({ "salvos-aba": "vendidos" }, "salvos-aba", ["desapegos"], "desapegos")).toBe(
      "desapegos",
    )
  })

  it("o texto livre da busca volta como foi digitado", () => {
    expect(lerTextoDaLista({ "salvos-busca": "sofá" }, "salvos-busca")).toBe("sofá")
    expect(lerTextoDaLista({}, "salvos-busca")).toBe("")
  })

  it("a mudança grava na entrada e a leitura seguinte a devolve", () => {
    const antes = entradaPadrao({ chave: "entrada-da-prova" })
    const depois = atualizarEntrada(antes, mudancaDaLista("grupo-ordem", "salvas"))
    expect(depois.chave).toBe(antes.chave)
    expect(
      lerDaLista(depois.filtros, "grupo-ordem", ["recentes", "salvas"], "recentes"),
    ).toBe("salvas")
  })

  it("a restauração espera o dado: carregando não está pronta, falha já está", () => {
    expect(listaPronta(true, false)).toBe(false)
    expect(listaPronta(false, false)).toBe(true)
    expect(listaPronta(true, true)).toBe(true)
  })
})

describe("lista guardada na entrada — as telas reais usam a carga", () => {
  const TELAS = [
    "src/telas/Inicio.tsx",
    "src/telas/Comunidade.tsx",
    "src/telas/Grupo.tsx",
    "src/telas/Mercado.tsx",
    "src/telas/Busca.tsx",
    "src/telas/Salvos.tsx",
  ]

  it("cada lista restaura a rolagem depois da carga, e não antes do dado", () => {
    for (const tela of TELAS) {
      const fonte = readFileSync(join(RAIZ, tela), "utf8")
      expect(fonte, tela).toContain("useCargaDaLista(")
      expect(fonte, tela).toContain("useRolagemEFoco(carga)")
    }
  })

  it("as telas com aba ou filtro os guardam na entrada", () => {
    for (const tela of [
      "src/telas/Comunidade.tsx",
      "src/telas/Grupo.tsx",
      "src/telas/Busca.tsx",
      "src/telas/Salvos.tsx",
    ]) {
      const fonte = readFileSync(join(RAIZ, tela), "utf8")
      expect(fonte, tela).toContain("mudancaDaLista(")
    }
  })

  it("nada voltou a usar a carga concluída nessas listas", () => {
    for (const tela of TELAS) {
      expect(readFileSync(join(RAIZ, tela), "utf8"), tela).not.toContain("CARGA_CONCLUIDA")
    }
  })
})
