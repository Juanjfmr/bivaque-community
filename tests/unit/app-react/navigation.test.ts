import { describe, expect, it } from "vitest"
import { activeAppTab, appHash, parseAppHash } from "../../../apps/web/lib/app-react/navigation"

describe("navigation fragments in /app", () => {
  it("defaults to home and encodes question identifiers", () => {
    expect(parseAppHash("")).toEqual({ name: "inicio" })
    expect(appHash({ name: "pergunta", id: "a/b" })).toBe("#pergunta/a%2Fb")
    expect(parseAppHash("#pergunta/a%2Fb")).toEqual({ name: "pergunta", id: "a/b" })
  })
  it("rejects malformed routes and keeps question details in Community", () => {
    expect(parseAppHash("#pergunta/%E0%A4%A")).toEqual({ name: "indisponivel" })
    expect(parseAppHash("#comunidade/extra")).toEqual({ name: "indisponivel" })
    expect(activeAppTab({ name: "pergunta", id: "q" }, "inicio")).toBe("comunidade")
    expect(activeAppTab({ name: "minhas" }, "voce")).toBe("comunidade")
  })
})
