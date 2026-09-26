import { describe, expect, it } from "vitest"
import {
  ASK_INDICATION_HREF,
  categoryLabel,
  guideMatches,
  INDICATIONS_HREF,
  indicationHref,
  indicationStatus,
  queryTerms,
  relativeAge,
  suggestCategory,
  titleProblem,
} from "../../../apps/web/lib/indications/indications"
import {
  indicacoesRedirect,
  recommendationsRedirect,
} from "../../../apps/web/lib/indications/legacy-routes"

describe("categoria sugerida pelo pedido", () => {
  it.each([
    ["Alguém indica pediatra que atenda FuSEx?", "saude_bem_estar"],
    ["Dentista para criança na zona centro-sul", "saude_bem_estar"],
    ["Transportadora para mudança Manaus → Brasília", "transporte"],
    ["Escola bilíngue perto do Dom Pedro", "educacao"],
    ["Eletricista de confiança", "servicos_locais"],
    ["Natação para criança de 5 anos", "esporte_lazer"],
    ["Restaurante para aniversário", "alimentacao"],
    ["MÉDICO ORTOPEDISTA", "saude_bem_estar"],
  ])("%s → %s", (text, expected) => {
    expect(suggestCategory(text)).toBe(expected)
  })

  it("sem pista, não inventa categoria", () => {
    expect(suggestCategory("Alguém sabe de algo?")).toBeNull()
  })
})

describe("pedido pronto para publicar", () => {
  it("vazio ou curto demais pede o que falta", () => {
    expect(titleProblem("  ")).toBe("Escreva o que você procura.")
    expect(titleProblem("ab")).toBe("Escreva o que você procura.")
  })

  it("uma frase curta basta", () => {
    expect(titleProblem("Pediatra")).toBeNull()
  })

  it("acima do teto do banco, pede para encurtar", () => {
    expect(titleProblem("a".repeat(201))).toContain("200")
  })
})

describe("estado do pedido", () => {
  it("resolvido vence respostas", () => {
    expect(indicationStatus({ is_resolved: true, reply_count: 0 })).toBe("resolvido")
  })
  it("com resposta e sem marca é respondido", () => {
    expect(indicationStatus({ is_resolved: false, reply_count: 2 })).toBe("respondido")
  })
  it("sem resposta", () => {
    expect(indicationStatus({ is_resolved: false, reply_count: 0 })).toBe("sem_resposta")
  })
})

describe("idade da dica", () => {
  const now = new Date("2026-09-25T12:00:00Z")
  it.each([
    ["2026-09-25T08:00:00Z", "hoje"],
    ["2026-09-24T08:00:00Z", "ontem"],
    ["2026-09-15T12:00:00Z", "há 10 dias"],
    ["2026-07-20T12:00:00Z", "há 2 meses"],
    ["2025-08-01T12:00:00Z", "há 1 ano"],
  ])("%s → %s", (iso, expected) => {
    expect(relativeAge(iso, now)).toBe(expected)
  })
})

describe("um pedido, um endereço", () => {
  it("o detalhe mora em /indicacoes/<id>", () => {
    expect(indicationHref("abc")).toBe("/indicacoes/abc")
  })
  it("as indicações moram na Comunidade, e pedir abre a caixa focada", () => {
    expect(INDICATIONS_HREF).toBe("/community?vista=indicacoes")
    expect(ASK_INDICATION_HREF).toBe("/community?vista=indicacoes&pedir=1")
  })
  it("rótulo de categoria desconhecida cai em Outros", () => {
    expect(categoryLabel("outros")).toBe("Outros")
    expect(categoryLabel("saude_bem_estar")).toBe("Saúde")
  })
})

describe("o Guia antes de pedir", () => {
  const guide = [
    {
      id: "h",
      name: "Hospital de Guarnição",
      description: "Pronto-socorro e pediatria",
      category: "hospital",
    },
    {
      id: "c",
      name: "Colégio Militar",
      description: "Ensino fundamental e médio",
      category: "school",
    },
    {
      id: "t",
      name: "Rota Norte Mudanças",
      description: "Transportadora de mudança",
      category: "transporter",
    },
  ]

  it("tira acento e palavras de pergunta", () => {
    expect(queryTerms("Alguém indica um médico pediatra?")).toEqual(["medico", "pediatra"])
  })

  it("acha pelo nome ou pela descrição, sem acento", () => {
    expect(guideMatches(guide, "Alguém indica pediatria?").map((entry) => entry.id)).toEqual(["h"])
    expect(guideMatches(guide, "colegio para meu filho").map((entry) => entry.id)).toEqual(["c"])
  })

  it("quem casa mais termos vem primeiro, e só palavras de pergunta não trazem nada", () => {
    expect(guideMatches(guide, "transportadora mudança").map((entry) => entry.id)).toEqual(["t"])
    expect(guideMatches(guide, "alguém indica?")).toEqual([])
  })
})

// /indicacoes e /recommendations continuam só para link antigo chegar ao lugar.
describe("endereços antigos", () => {
  const id = "80000000-0000-4000-8000-000000000f01"

  it("/indicacoes vai à vista, e ?pedir=1 à caixa de pedir", () => {
    expect(indicacoesRedirect({})).toBe("/community?vista=indicacoes")
    expect(indicacoesRedirect({ pedir: "1" })).toBe("/community?vista=indicacoes&pedir=1")
  })

  it("/recommendations?focus=<id> abre o próprio pedido", () => {
    expect(recommendationsRedirect({ focus: id })).toBe(`/indicacoes/${id}`)
  })

  it("focus que não é id não vira endereço", () => {
    expect(recommendationsRedirect({ focus: "../admin" })).toBe("/community?vista=indicacoes")
  })

  it("cada aba antiga tem destino", () => {
    expect(recommendationsRedirect({ aba: "request" })).toBe("/community?vista=indicacoes&pedir=1")
    expect(recommendationsRedirect({ aba: "saved" })).toBe("/salvos?aba=indicacao")
    expect(recommendationsRedirect({ aba: "browse" })).toBe("/community?vista=indicacoes")
    expect(recommendationsRedirect({})).toBe("/community?vista=indicacoes")
  })
})
