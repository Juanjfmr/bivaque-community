import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  filtrarExemplos,
  ITENS_DE_EXEMPLO,
  normalizarBusca,
  separarPorTipo,
  TIPOS,
  type Cenario,
  type TipoDeFiltro,
} from "@/src/previa-vnext/modelo"

const filtrar = (
  busca = "",
  tipo: TipoDeFiltro = "todos",
  cenario: Cenario = "completo",
) => filtrarExemplos(ITENS_DE_EXEMPLO, { busca, tipo, cenario })

describe("Laboratório F02 — fixtures de comparação", () => {
  it("usa um único conjunto de oito registros identificáveis em ambas as composições", () => {
    expect(ITENS_DE_EXEMPLO).toHaveLength(8)
    expect(new Set(ITENS_DE_EXEMPLO.map((x) => x.id)).size).toBe(8)
    expect(ITENS_DE_EXEMPLO.every((x) => x.titulo && x.resumo && x.contexto && x.local)).toBe(true)
    expect(ITENS_DE_EXEMPLO.map((x) => x.tipo).sort()).toEqual([
      "evento", "evento", "imovel", "imovel", "negocio", "negocio", "pergunta", "pergunta",
    ])
    expect(TIPOS.map((x) => x.id)).toEqual(["todos", "pergunta", "negocio", "imovel", "evento"])
  })

  it("normaliza acentos e maiúsculas no termo de busca", () => {
    expect(normalizarBusca("  MUDANÇA  ")).toBe("mudanca")
    expect(filtrar("mudanca").some((x) => x.id === "n-mudanca")).toBe(true)
    expect(filtrar("PARQUE DEZ").some((x) => x.id === "i-apto")).toBe(true)
  })

  it("combina termo, tipo e escopo sem inventar itens", () => {
    expect(filtrar("manaus", "imovel").map((x) => x.id)).toEqual(["i-casa"])
    expect(filtrar("escola", "pergunta").map((x) => x.id)).toEqual(["p-escola"])
    expect(filtrar("escola", "negocio")).toEqual([])
    expect(filtrar("coisa inexistente")).toEqual([])
  })

  it("não confunde vazio, falha e carregamento com conteúdo preenchido", () => {
    for (const cenario of ["vazio", "erro", "carregando"] as const) {
      expect(filtrar("", "todos", cenario)).toEqual([])
    }
    expect(filtrar("", "todos", "escasso").map((x) => x.id)).toEqual([
      "p-escola", "n-reparos",
    ])
  })

  it("classifica todos os resultados uma vez e não muda as fixtures", () => {
    const copia = JSON.stringify(ITENS_DE_EXEMPLO)
    const grupos = separarPorTipo(filtrar())
    expect(Object.values(grupos).flat().map((x) => x.id).sort()).toEqual(
      [...ITENS_DE_EXEMPLO].map((x) => x.id).sort(),
    )
    expect(JSON.stringify(ITENS_DE_EXEMPLO)).toBe(copia)
  })

  it("não expõe atributos fabricados de reputação, pagamento ou pessoa", () => {
    for (const item of ITENS_DE_EXEMPLO) {
      expect(Object.keys(item).some((chave) => /rating|avaliacao|estrelas|cpf|telefone|preco/.test(chave))).toBe(false)
    }
  })
})

describe("Laboratório F02 — isolamento de produção", () => {
  it("mantém a prévia atrás da guarda DEV no main, sem rota de produto", () => {
    const main = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8")
    const roteador = readFileSync(new URL("../src/roteador.tsx", import.meta.url), "utf8")
    expect(main).toContain('import.meta.env.DEV && caminho.startsWith(`${prefixo}vnext`)')
    expect(main).toContain('import("@/src/previa-vnext/PreviaVNext")')
    expect(roteador).not.toContain("PreviaVNext")
    expect(roteador).not.toContain("previa-vnext")
  })
})
