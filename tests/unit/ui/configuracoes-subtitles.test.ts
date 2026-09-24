import { describe, expect, it } from "vitest"

// RECON-042, defeito 3: as quatro subtelas de Configurações herdam o H1 da área
// e usam h2 na página, então o mapa de identidade declarava o mesmo título para
// as quatro — uma captura que aterrissasse na subtela errada passava como
// válida. Com o H1 carregando "Configurações · <subtela>", o mapa passa a
// distinguir cada uma. Título e mapa andam juntos: mudar um só deixa a captura
// vermelha sem que nada esteja errado.
const SUBTELAS = [
  "/configuracoes/notificacoes",
  "/configuracoes/conta",
  "/configuracoes/familia",
  "/configuracoes/bloqueados",
]

describe("RECON-042, defeito 3 — as quatro subtelas de Configurações se distinguem", () => {
  it("o mapa declara um título distinto para cada subtela", async () => {
    const { HEADINGS } = await import("../../../scripts/visual/capture.mjs")
    const titles = SUBTELAS.map((path) => HEADINGS[path])
    expect(titles.every((title) => typeof title === "string" && title.length > 0)).toBe(true)
    expect(new Set(titles).size).toBe(SUBTELAS.length)
  }, 60000)

  it("cada título nomeado no mapa identifica também a área", async () => {
    const { HEADINGS } = await import("../../../scripts/visual/capture.mjs")
    for (const path of SUBTELAS) {
      expect(HEADINGS[path]).toContain("Configurações")
    }
  }, 60000)
})
