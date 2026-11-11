import { afterEach, describe, expect, it, vi } from "vitest"
import type { PublicacaoReal } from "@/lib/dados/grupos"
import {
  anuncioDaPublicacao,
  colocarNaLista,
  comPublicacaoRecente,
  retemOTopo,
} from "@/src/grupos/lista-do-grupo"

// DS-021 (F03, critério 1): depois de publicar, a publicação é o primeiro item
// da lista exibida — sem perder autor, hora nem a ordenação escolhida.

function publicacao(id: string, extra: Partial<PublicacaoReal> = {}): PublicacaoReal {
  return {
    id,
    grupoId: "g1",
    texto: `Texto ${id}`,
    criadaEm: "2026-11-06T12:00:00Z",
    autor: "Ana",
    propria: false,
    comentarios: 0,
    uteis: 0,
    util: false,
    salva: false,
    oculta: false,
    fotos: [],
    ...extra,
  }
}

/** O que o detalhe do grupo devolve na API; os testes trocam o que precisam. */
function detalhe(corpo: unknown) {
  if (typeof corpo !== "object" || corpo === null) return corpo
  const { grupo: g, ...resto } = corpo as Record<string, unknown>
  return {
    grupo: {
      id: "g1",
      nome: "Grupo de prova",
      descricao: "",
      regras: "",
      fechado: false,
      membro: true,
      pendente: false,
      admin: false,
      membros: null,
      fixada: null,
      ...(typeof g === "object" && g !== null ? (g as Record<string, unknown>) : {}),
    },
    ...resto,
  }
}

function servidor(corpo: unknown, status = 200) {
  const fetch = vi.fn(
    async (..._args: unknown[]) => new Response(JSON.stringify(detalhe(corpo)), { status }),
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}

afterEach(() => vi.unstubAllGlobals())

describe("onde a publicação recém-criada entra", () => {
  const nova = publicacao("p-nova", { propria: true, autor: "Você" })

  it("com a primeira página relida, entra antes dela e sem duplicar", () => {
    const exibidas = comPublicacaoRecente([publicacao("p-1"), publicacao("p-2")], nova, {
      publicacoes: [publicacao("p-1"), publicacao("p-2")],
      proximo: null,
    })
    expect(exibidas.map((p) => p.id)).toEqual(["p-nova", "p-1", "p-2"])
  })

  it("se a releitura já trouxe a publicação, ela não aparece duas vezes", () => {
    const exibidas = comPublicacaoRecente([nova, publicacao("p-1")], nova, {
      publicacoes: [nova, publicacao("p-1")],
      proximo: null,
    })
    expect(exibidas.filter((p) => p.id === "p-nova")).toHaveLength(1)
    expect(exibidas[0]?.id).toBe("p-nova")
  })

  it("sem releitura, entra no começo do que está na tela", () => {
    const exibidas = comPublicacaoRecente(
      [publicacao("p-1"), publicacao("p-2", { oculta: true })],
      nova,
      null,
    )
    expect(exibidas.map((p) => p.id)).toEqual(["p-nova", "p-1", "p-2"])
  })

  it("recentes e salvas retêm o topo; discutidas e ocultadas não reordenam", () => {
    expect(
      ["recentes", "salvas", "discutidas", "ocultadas"].filter((o) => retemOTopo(o as never)),
    ).toEqual(["recentes", "salvas"])
  })
})

describe("anúncio para o leitor de tela", () => {
  it("diz a posição real da publicação na lista", () => {
    expect(anuncioDaPublicacao([publicacao("p-nova"), publicacao("p-1")], "p-nova")).toContain(
      "começo da lista",
    )
    expect(anuncioDaPublicacao([publicacao("p-1"), publicacao("p-nova")], "p-nova")).toContain(
      "posição 2",
    )
  })
})

describe("colocarNaLista lê o servidor antes de dizer que entrou", () => {
  it("só relê a página de cima quando não há segunda página", async () => {
    const fetch = servidor({
      grupo: { id: "g1" },
      publicacoes: [publicacao("p-nova")],
      proximo: null,
    })
    const colocada = await colocarNaLista(
      "g1",
      { publicacao: publicacao("p-nova"), proximo: "p-nova" },
      { ordem: "recentes", proximo: null },
      "recentes",
    )
    expect(colocada).toMatchObject({ entraNaLista: true, proximo: null })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("com a primeira página cheia e maior, procura a publicação na segunda", async () => {
    const cheia = Array.from({ length: 20 }, (_, i) => publicacao(`p-${i + 1}`))
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("depois=")) {
        return new Response(
          JSON.stringify(
            detalhe({
              grupo: { id: "g1" },
              publicacoes: [publicacao("p-20"), publicacao("p-deslocada")],
              proximo: null,
            }),
          ),
          { status: 200 },
        )
      }
      return new Response(
        JSON.stringify(
          detalhe({
            grupo: { id: "g1" },
            publicacoes: [publicacao("p-nova"), ...cheia.slice(0, 19)],
            proximo: "p-19",
          }),
        ),
        { status: 200 },
      )
    })
    vi.stubGlobal("fetch", fetch)
    const colocada = await colocarNaLista(
      "g1",
      { publicacao: publicacao("p-nova"), proximo: "p-nova" },
      { ordem: "recentes", proximo: "p-20" },
      "recentes",
    )
    // O cursor vem da página que abriu depois da releitura e onde a publicação
    // foi achada; o resto da lista continua alcançável por «Ver mais».
    expect(colocada).toEqual({
      anterior: expect.objectContaining({ publicacoes: expect.any(Array) }),
      proximo: "p-19",
      entraNaLista: true,
    })
  })

  it("em ordenação que não põe a mais nova no topo, não relê", async () => {
    const fetch = servidor({})
    expect(
      await colocarNaLista(
        "g1",
        { publicacao: publicacao("p-nova"), proximo: "p-nova" },
        { ordem: "discutidas", proximo: null },
        "discutidas",
      ),
    ).toBeNull()
    expect(
      await colocarNaLista(
        "g1",
        { publicacao: publicacao("p-nova"), proximo: "p-nova" },
        { ordem: "recentes", proximo: null },
        "salvas",
      ),
    ).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
