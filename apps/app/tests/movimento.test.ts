import { describe, expect, it } from "vitest"

import {
  atrasoDaLista,
  atrasoDaSubida,
  BOLD,
  calcularMinimizada,
  distanciaFechaFolha,
  limiteDaCascata,
  paginaEncolhe,
  progressoDaContagem,
  tituloDeveDocar,
  tituloPodeSubir,
  valorDaContagem,
} from "../lib/movimento"

describe("movimento reduzido (§6)", () => {
  it("a contagem mostra o valor final na hora", () => {
    expect(valorDaContagem(0, 120, 0, true)).toBe(120)
    expect(valorDaContagem(0, 120, 0, false)).toBe(0)
    expect(valorDaContagem(0, 120, 1, false)).toBe(120)
  })

  it("a contagem segue a curva do protótipo", () => {
    expect(progressoDaContagem(0)).toBe(0)
    expect(progressoDaContagem(1)).toBe(1)
    expect(progressoDaContagem(0.5)).toBeCloseTo(0.875, 5)
    // A curva sobe rápido no começo: metade do tempo entrega mais da metade.
    expect(progressoDaContagem(0.5)).toBeGreaterThan(0.5)
  })

  it("a cascata é a constante BOLD, com atraso de 120 ms na subida", () => {
    expect(atrasoDaSubida(0)).toBe(120)
    expect(atrasoDaSubida(3)).toBe(120 + 3 * BOLD.cascata)
    expect(atrasoDaLista(4)).toBe(4 * BOLD.cascata)
    expect(limiteDaCascata(30)).toBe(10)
    expect(limiteDaCascata(3)).toBe(3)
  })
})

describe("minimizar a navegação ao rolar (§6.7, §5.3)", () => {
  const base = {
    ultimoY: 0,
    minimizada: false,
    largura: 375,
    raiz: true,
    menuCriarAberto: false,
  }

  it("minimiza descendo além de 140 px, com folga de 6", () => {
    expect(calcularMinimizada({ ...base, y: 140 })).toBe(false)
    expect(calcularMinimizada({ ...base, y: 141 })).toBe(true)
    expect(calcularMinimizada({ ...base, y: 147, ultimoY: 140 })).toBe(true)
    expect(calcularMinimizada({ ...base, y: 145, ultimoY: 140 })).toBe(false)
  })

  it("desminimiza subindo ou voltando ao topo", () => {
    expect(calcularMinimizada({ ...base, y: 100, ultimoY: 200, minimizada: true })).toBe(false)
    expect(calcularMinimizada({ ...base, y: 50, ultimoY: 50, minimizada: true })).toBe(false)
    expect(calcularMinimizada({ ...base, y: 300, ultimoY: 300, minimizada: true })).toBe(true)
  })

  it("não minimiza acima de 720 px, fora das raízes, nem com o Criar aberto", () => {
    expect(calcularMinimizada({ ...base, y: 400, largura: 720 })).toBe(false)
    expect(calcularMinimizada({ ...base, y: 400, raiz: false })).toBe(false)
    expect(calcularMinimizada({ ...base, y: 400, menuCriarAberto: true })).toBe(false)
  })
})

describe("título que sobe (§6.7)", () => {
  it("não existe na Início, na Busca nem na conversa, e some a partir de 720 px", () => {
    expect(tituloPodeSubir("inicio", 375)).toBe(false)
    expect(tituloPodeSubir("busca", 375)).toBe(false)
    expect(tituloPodeSubir("conversa", 375)).toBe(false)
    expect(tituloPodeSubir("salvos", 375)).toBe(true)
    expect(tituloPodeSubir("salvos", 720)).toBe(false)
  })

  it("doca quando o título passa sob a barra, com folga de 4 px", () => {
    expect(tituloDeveDocar(64, 60, true)).toBe(true)
    expect(tituloDeveDocar(65, 60, true)).toBe(false)
    expect(tituloDeveDocar(10, 60, false)).toBe(false)
  })
})

describe("folhas (§6.6)", () => {
  it("arrastar mais de 110 px fecha; 30 px fecham se o gesto for rápido", () => {
    expect(distanciaFechaFolha(111, 0)).toBe(true)
    expect(distanciaFechaFolha(60, 0.1)).toBe(false)
    expect(distanciaFechaFolha(60, 0.6)).toBe(true)
    expect(distanciaFechaFolha(20, 0.9)).toBe(false)
  })

  it("a página de trás encolhe só no celular e fora da gaveta", () => {
    expect(paginaEncolhe(375, false)).toBe(true)
    expect(paginaEncolhe(375, true)).toBe(false)
    expect(paginaEncolhe(768, false)).toBe(false)
  })
})
