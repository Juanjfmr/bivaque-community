import { describe, expect, it } from "vitest"
import {
  contextLabelFor,
  originHrefFor,
} from "../../../apps/web/app/(shell)/messages/conversas-loaders"
import {
  numericFormValues,
  validatePropertyNumbers,
} from "../../../apps/web/lib/listings/validation"

describe("FIGMA-002 validação e contexto", () => {
  it("mantém ausências e aceita números informados", () => {
    expect(validatePropertyNumbers({ rent_reais: "", bedrooms: "3", area_m2: "98,5" })).toBeNull()
    expect(numericFormValues(new FormData())["rent_reais"]).toBe("")
  })
  it.each([
    { rent_reais: "abc" },
    { condo_reais: "-1" },
    { bedrooms: "1.2" },
    { parking_spots: "101" },
    { area_m2: "0" },
    { available_from: "2026-02-31" },
  ])("recusa entrada inválida %o", (values) => {
    expect(validatePropertyNumbers(values)).not.toBeNull()
  })
  it("liga a conversa ao imóvel sem alterar os demais contextos", () => {
    expect(contextLabelFor("listing")).toBe("Anúncio de imóvel")
    expect(originHrefFor("listing", "abc")).toBe("/imoveis/abc")
    expect(originHrefFor("accepted_family", "abc")).toBeNull()
    expect(originHrefFor("provider", "abc")).toBe("/prestadores/abc")
  })
})
