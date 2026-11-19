import { describe, expect, it } from "vitest"
import type { PreferenciasDeAviso } from "@/lib/dados/avisos"
import { canalDe, comCanal } from "@/src/avisos/PreferenciasDeAvisos"

const preferencias: PreferenciasDeAviso = {
  comments: true,
  events: true,
  indications: true,
  messages: true,
  productNews: false,
  resumoCidade: "off",
  channels: [
    { notificationType: "product_news", channel: "email", enabled: true },
    { notificationType: "comments", channel: "in_app", enabled: true },
    { notificationType: "comments", channel: "email", enabled: true },
  ],
}

describe("preferencias por canal", () => {
  it("mostra o estado efetivo e liga Novidades sem reativar canais antigos", () => {
    expect(canalDe(preferencias, "product_news", "email")).toBe(false)
    const ligado = comCanal(preferencias, "product_news", "in_app", true)
    expect(ligado.productNews).toBe(true)
    expect(canalDe(ligado, "product_news", "in_app")).toBe(true)
    expect(canalDe(ligado, "product_news", "email")).toBe(false)
    expect(comCanal(ligado, "product_news", "in_app", false).productNews).toBe(false)
  })
  it("mantem o tipo enquanto outro canal estiver ligado e desliga o ultimo", () => {
    const parcial = comCanal(preferencias, "comments", "email", false)
    expect(parcial.comments).toBe(true)
    expect(canalDe(parcial, "comments", "email")).toBe(false)
    expect(comCanal(parcial, "comments", "in_app", false).comments).toBe(false)
  })
})
