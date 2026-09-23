import { describe, expect, it } from "vitest"
import { cropStyle, renderReport, resolveScreen } from "../../../scripts/visual/journey-report"

// O relatório põe prancha e tela real lado a lado. Estes testes travam o recorte (a janela
// mostra exatamente o quadro citado), o escape do que vem do registro e os destaques de lacuna e
// atalho — o que o teste verde não conta sozinho.

const frames = {
  boards: {
    "10-web-a": {
      file: "10-web-a.png",
      width: 2000,
      height: 1000,
      frames: [{ x: 0.5, y: 0.2, w: 0.5, h: 0.6 }],
    },
  },
}
const manifest = { artifacts: [{ id: "10-web-a", title: "Prancha A", screens: ["Tela zero"] }] }

function entry(overrides: Record<string, unknown>) {
  return {
    ordem: 1,
    tipo: "passo",
    ref: "10-web-a#0",
    etapa: "Entrada",
    acao: "entra",
    quando: null,
    resultado: "observado",
    persona: null,
    motivo: null,
    atalho: null,
    url: "/a",
    captura: "01-10-web-a_0.png",
    ...overrides,
  }
}

function run(registros: unknown[], extra: Record<string, unknown> = {}) {
  return {
    href: "web-x/desktop-1440",
    registro: {
      jornada: "web-x",
      titulo: "Jornada X",
      persona: "Membro",
      projeto: "desktop-1440",
      estado: "concluida",
      registros,
      passosPendentes: [],
      desviosNaoExercitados: [],
      lacunas: 0,
      atalhos: 0,
      geradoEm: "2026-09-22T00:00:00.000Z",
      ...extra,
    },
  }
}

describe("relatório de jornadas simuladas", () => {
  it("recorta a janela no quadro citado", () => {
    const style = cropStyle(frames.boards["10-web-a"].frames[0], frames.boards["10-web-a"])
    // 0.5*2000 / (0.6*1000) = 1.6667
    expect(style.box).toBe("aspect-ratio:1.6667")
    expect(style.img).toBe("width:200%;left:-100%;top:-33.3333%")
  })

  it("resolve a tela pela prancha e devolve null para geometria ausente", () => {
    expect(resolveScreen("10-web-a#0", frames, manifest)?.label).toBe("Tela zero")
    expect(resolveScreen("10-web-a#3", frames, manifest)).toBeNull()
    expect(resolveScreen("99-web-z#0", frames, manifest)).toBeNull()
  })

  it("destaca lacuna e atalho, com o motivo", () => {
    const html = renderReport(
      [
        run([
          entry({ atalho: "nenhum link leva à lista" }),
          entry({ ordem: 2, resultado: "lacuna", motivo: "ambiente sem Portal", captura: null }),
        ]),
      ],
      frames,
      manifest,
      "../guia",
    )
    expect(html).toContain("observado por atalho")
    expect(html).toContain("nenhum link leva à lista")
    expect(html).toContain('class="badge gap">lacuna')
    expect(html).toContain("sem captura: o passo não foi alcançado")
    expect(html).toContain('src="../guia/10-web-a.png"')
    expect(html).toContain('src="web-x/desktop-1440/01-10-web-a_0.png"')
  })

  it("marca jornada incompleta e os passos que faltaram", () => {
    const html = renderReport(
      [run([entry({})], { estado: "incompleta", passosPendentes: ["11-web-b#0"] })],
      frames,
      manifest,
      "../guia",
    )
    expect(html).toContain("INCOMPLETA")
    expect(html).toContain("Passos não alcançados:</strong> 11-web-b#0")
  })

  it("escapa o texto que vem do registro", () => {
    const html = renderReport(
      [run([entry({ motivo: '<script>alert("x")</script>', resultado: "lacuna" })])],
      frames,
      manifest,
      "../guia",
    )
    expect(html).not.toContain("<script>alert")
    expect(html).toContain("&lt;script&gt;")
  })
})
