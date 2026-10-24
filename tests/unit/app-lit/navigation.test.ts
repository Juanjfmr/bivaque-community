import { describe, expect, it } from "vitest"
import {
  activeAppTab,
  appHash,
  type NavigationContext,
  parseAppHash,
} from "../../../apps/web/lib/app-lit/navigation"

const origin: NavigationContext["origin"] = "inicio"

describe("navegação Lit de /app", () => {
  it("usa Início para fragmento ausente e codifica IDs de pergunta", () => {
    expect(parseAppHash("")).toEqual({ name: "inicio", id: null })
    const route = { name: "pergunta", id: "e0000000-0000-4000-8000-00000000f001" } as const
    expect(appHash(route)).toBe("#pergunta/e0000000-0000-4000-8000-00000000f001")
    expect(parseAppHash(appHash(route))).toEqual(route)
  })

  it("rejeita rota desconhecida, segmentos extras e identificador inválido", () => {
    expect(parseAppHash("#outra")).toEqual({ name: "indisponivel", id: null })
    expect(parseAppHash("#comunidade/extra")).toEqual({ name: "indisponivel", id: null })
    expect(parseAppHash("#pergunta/%E0%A4%A")).toEqual({ name: "indisponivel", id: null })
    expect(parseAppHash("#pergunta/invalido")).toEqual({ name: "indisponivel", id: null })
  })

  it("mantém a aba da comunidade para pergunta e Minhas", () => {
    expect(
      activeAppTab({ name: "pergunta", id: "e0000000-0000-4000-8000-00000000f001" }, origin),
    ).toBe("comunidade")
    expect(activeAppTab({ name: "minhas", id: null }, "voce")).toBe("comunidade")
    expect(activeAppTab({ name: "conversas", id: null }, origin)).toBe("conversas")
  })
})
