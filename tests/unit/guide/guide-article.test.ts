import { describe, expect, it } from "vitest"
import {
  buildGuideToc,
  correctionStatusLabel,
  type GuideArticleSection,
  isMissingRelationError,
  isSafeAnchor,
  slugifyAnchor,
} from "../../../apps/web/lib/guide/guide-article"

function section(overrides: Partial<GuideArticleSection>): GuideArticleSection {
  return {
    id: overrides.id ?? "s1",
    position: overrides.position ?? 0,
    anchor: overrides.anchor ?? "secao",
    title: overrides.title ?? "Seção",
    body: overrides.body ?? "Corpo",
  }
}

describe("slugifyAnchor", () => {
  it("normaliza acento, caixa e espaços", () => {
    expect(slugifyAnchor("Antes de contratar")).toBe("antes-de-contratar")
    expect(slugifyAnchor("Documentos e cadastros")).toBe("documentos-e-cadastros")
    expect(slugifyAnchor("Dúvidas frequentes")).toBe("duvidas-frequentes")
  })

  it("colapsa símbolos e remove hífen nas pontas", () => {
    expect(slugifyAnchor("  -- Ao chegar! --  ")).toBe("ao-chegar")
    expect(slugifyAnchor("Checklist rápido (2026)")).toBe("checklist-rapido-2026")
  })

  it("usa fallback quando não sobra caractere seguro", () => {
    expect(slugifyAnchor("!!!")).toBe("secao")
    expect(slugifyAnchor("")).toBe("secao")
  })
})

describe("isSafeAnchor", () => {
  it("aceita âncoras geradas pelo slugify e recusa o resto", () => {
    expect(isSafeAnchor("antes-de-contratar")).toBe(true)
    expect(isSafeAnchor("secao")).toBe(true)
    expect(isSafeAnchor("-comeca-com-hifen")).toBe(false)
    expect(isSafeAnchor("termina-com-hifen-")).toBe(false)
    expect(isSafeAnchor("Maiuscula")).toBe(false)
    expect(isSafeAnchor("com espaço")).toBe(false)
    expect(isSafeAnchor("")).toBe(false)
  })
})

describe("buildGuideToc", () => {
  it("ordena por position e deriva o índice das seções", () => {
    const toc = buildGuideToc([
      section({ id: "b", position: 2, anchor: "ao-chegar", title: "Ao chegar" }),
      section({ id: "a", position: 0, anchor: "antes-de-contratar", title: "Antes de contratar" }),
    ])

    expect(toc.map((item) => item.anchor)).toEqual(["antes-de-contratar", "ao-chegar"])
    expect(toc.map((item) => item.id)).toEqual(["a", "b"])
  })

  it("descarta âncora inválida em vez de emitir link quebrado", () => {
    const toc = buildGuideToc([
      section({ id: "ok", position: 0, anchor: "valida" }),
      section({ id: "bad", position: 1, anchor: "Inválida" }),
    ])

    expect(toc).toHaveLength(1)
    expect(toc[0]?.anchor).toBe("valida")
  })
})

describe("isMissingRelationError", () => {
  it("trata tabela ausente como extensão indisponível", () => {
    expect(isMissingRelationError(null)).toBe(false)
    expect(isMissingRelationError({ code: "42P01", message: "relation does not exist" })).toBe(true)
    expect(isMissingRelationError({ code: "PGRST205", message: "Could not find the table" })).toBe(
      true,
    )
    expect(
      isMissingRelationError({
        message: "Could not find the table 'public.guide_articles' in the schema cache",
      }),
    ).toBe(true)
  })

  it("não engole erro que não é de relação ausente", () => {
    expect(isMissingRelationError({ code: "42501", message: "permission denied" })).toBe(false)
    expect(isMissingRelationError({ message: "JWT expired" })).toBe(false)
  })
})

describe("correctionStatusLabel", () => {
  it("rotula os estados conhecidos e não inventa os desconhecidos", () => {
    expect(correctionStatusLabel("received")).toBe("Recebida")
    expect(correctionStatusLabel("applied")).toBe("Aplicada")
    expect(correctionStatusLabel("rejected")).toBe("Rejeitada")
    expect(correctionStatusLabel("misterio")).toBe("Status desconhecido")
  })
})
