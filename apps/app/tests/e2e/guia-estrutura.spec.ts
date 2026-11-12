import { mkdirSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import {
  expect,
  SELETOR_CONTEUDO,
  SELETOR_MENU_CRIAR,
  simularGuia,
  simularProgresso,
  test,
} from "./apoio"
import { simularCriar } from "./criar-ajuda"

/**
 * A estrutura editorial do Guia (RUN-142).
 *
 * Mede o que a pessoa vê: a cidade uma vez só, o título numa linha no 375, as
 * seções com âncora de teclado, o cabeçalho preso com o nome da seção em
 * leitura, o caminho real de sugestão no Criar e o contraste do corpo no
 * escuro. A matriz de capturas usa a largura do projeto — 320, 360, 375, 430,
 * 768 e 1440 —, então 375/768/1440 saem dos próprios projetos.
 */

const TEMAS = ["light", "dark"] as const
const CIDADE = "Manaus"
const TELA = '[data-tela="guia"]'
const CABECALHO = '[data-guia="cabecalho"]'
const DIRETORIO_DAS_CAPTURAS = join(process.cwd(), "..", "..", ".visual", "run-142")

async function abrirGuia(page: Page): Promise<void> {
  await page.goto("/app/guia")
  await expect(page.locator(TELA)).toBeVisible()
  await expect(page.locator('[data-guia="secao"]')).toHaveCount(4)
  await expect(page.locator('#referencias [data-linha="lista"]').first()).toBeVisible()
}

type Cor = Readonly<{ r: number; g: number; b: number; a: number }>

function canais(valor: string): Cor {
  const partes = (valor.match(/[\d.]+/g) ?? []).map(Number)
  return { r: partes[0] ?? 0, g: partes[1] ?? 0, b: partes[2] ?? 0, a: partes[3] ?? 1 }
}

function luminancia(cor: Cor): number {
  const canal = (valor: number) => {
    const proporcao = valor / 255
    return proporcao <= 0.03928 ? proporcao / 12.92 : ((proporcao + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(cor.r) + 0.7152 * canal(cor.g) + 0.0722 * canal(cor.b)
}

function contraste(frente: Cor, fundo: Cor): number {
  const claro = luminancia(frente) + 0.05
  const escuro = luminancia(fundo) + 0.05
  return claro > escuro ? claro / escuro : escuro / claro
}

/** Cor do corpo, cor do token, entrelinha e fundo real por trás do texto. */
function medirCorpo(page: Page) {
  return page.evaluate(() => {
    const corpo = document.querySelector<HTMLElement>('p[data-guia="corpo"]')
    if (corpo === null) throw new Error("O Guia não tem corpo de texto")
    const sonda = document.createElement("span")
    sonda.style.color = "var(--on-surface-variant)"
    document.body.append(sonda)
    const token = getComputedStyle(sonda).color
    sonda.remove()

    // O fundo que a pessoa vê é o do primeiro ancestral com cor sólida.
    let alvo: HTMLElement | null = corpo
    let fundo = "rgba(0, 0, 0, 0)"
    while (alvo !== null) {
      fundo = getComputedStyle(alvo).backgroundColor
      if (!fundo.includes("rgba(0, 0, 0, 0)")) break
      alvo = alvo.parentElement
    }

    const estilo = getComputedStyle(corpo)
    return {
      cor: estilo.color,
      token,
      fundo,
      entrelinha: Number.parseFloat(estilo.lineHeight) / Number.parseFloat(estilo.fontSize),
    }
  })
}

async function alcancarComTab(page: Page, alvoSeletor: string, limite = 80): Promise<boolean> {
  await page.evaluate(() => {
    const ativo = document.activeElement
    if (ativo instanceof HTMLElement) ativo.blur()
  })
  for (let volta = 0; volta < limite; volta += 1) {
    await page.keyboard.press("Tab")
    const alcancou = await page.evaluate(
      (seletor) => document.activeElement === document.querySelector(seletor),
      alvoSeletor,
    )
    if (alcancou) return true
  }
  return false
}

test.describe("estrutura do Guia", () => {
  test.beforeEach(async ({ page }) => {
    await simularProgresso(page)
    await simularGuia(page)
  })

  test("a cidade aparece uma vez, no cabeçalho, e 'Guia' cabe numa linha no 375", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await abrirGuia(page)

    const medida = await page.evaluate(
      ({ tela, cidade, cabecalho }) => {
        const raiz = document.querySelector<HTMLElement>(tela)
        const titulo = document.querySelector<HTMLElement>("h1[data-titulo-da-tela]")
        const barra = document.querySelector<HTMLElement>(cabecalho)
        if (raiz === null || titulo === null || barra === null) {
          throw new Error("Guia sem cabeçalho")
        }
        const naTela = (raiz.innerText.match(new RegExp(cidade, "g")) ?? []).length
        const noCabecalho = (barra.innerText.match(new RegExp(cidade, "g")) ?? []).length
        const texto = titulo.firstChild
        if (texto === null) throw new Error("Título sem texto")
        const faixa = document.createRange()
        faixa.selectNodeContents(texto)
        return {
          naTela,
          noCabecalho,
          linhasDoTitulo: faixa.getClientRects().length,
          alturaDoCabecalho: barra.getBoundingClientRect().height,
          alturaDoTitulo: titulo.getBoundingClientRect().height,
          linhaDoTitulo: Number.parseFloat(getComputedStyle(titulo).lineHeight),
        }
      },
      { tela: TELA, cidade: CIDADE, cabecalho: CABECALHO },
    )

    expect(medida.naTela).toBe(1)
    expect(medida.noCabecalho).toBe(1)
    await expect(page.locator('[data-guia="cidade"]')).toHaveText(CIDADE)
    expect(medida.linhasDoTitulo).toBe(1)
    expect(medida.alturaDoTitulo).toBeLessThanOrEqual(medida.linhaDoTitulo * 1.5)
    // Compacto: título, cidade e âncoras ocupam uma faixa de pouco mais de 90 px.
    expect(medida.alturaDoCabecalho).toBeLessThanOrEqual(100)
  })

  test("o teclado abre a seção pela âncora e o cabeçalho fica preso com o nome da seção", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await abrirGuia(page)

    const ancora = '[data-guia="ancora"][data-secao="referencias"]'
    expect(await alcancarComTab(page, ancora)).toBe(true)
    await page.keyboard.press("Enter")

    await expect(page.locator("#referencias-titulo")).toBeFocused()
    await expect(page.locator(ancora)).toHaveAttribute("aria-current", "true")
    await expect(page.locator(ancora)).toHaveText("Referências")

    const posicoes = await page.evaluate(
      ({ conteudo, cabecalho }) => {
        const caixa = document.querySelector<HTMLElement>(conteudo)
        const barra = document.querySelector<HTMLElement>(cabecalho)
        const secao = document.querySelector<HTMLElement>("#referencias")
        if (caixa === null || barra === null || secao === null) throw new Error("sem medidas")
        return {
          rolagem: caixa.scrollTop,
          topoDaCaixa: caixa.getBoundingClientRect().top,
          topoDaBarra: barra.getBoundingClientRect().top,
          topoDaSecao: secao.getBoundingClientRect().top,
          baseDaBarra: barra.getBoundingClientRect().bottom,
        }
      },
      { conteudo: SELETOR_CONTEUDO, cabecalho: CABECALHO },
    )

    expect(posicoes.rolagem).toBeGreaterThan(0)
    // Preso no topo da rolagem, e a seção chega abaixo dele, com o título à vista.
    expect(Math.abs(posicoes.topoDaBarra - posicoes.topoDaCaixa)).toBeLessThanOrEqual(1)
    expect(posicoes.topoDaSecao).toBeGreaterThanOrEqual(posicoes.baseDaBarra - 1)

    // O nome da seção em leitura acompanha a volta ao topo: é o subtítulo que
    // não sai da tela enquanto se rola.
    await page.locator(SELETOR_CONTEUDO).evaluate((elemento) => {
      elemento.scrollTop = 0
    })
    await expect(page.locator('[data-guia="ancora"][data-secao="chegada"]')).toHaveAttribute(
      "aria-current",
      "true",
    )
  })

  test("'Sugerir um lugar para o Guia' abre o caminho real do Criar", async ({ page }) => {
    await simularCriar(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await abrirGuia(page)

    const sugestao = page.locator('[data-guia="contribuicao"] [data-acao="sugerir-lugar"]')
    await expect(sugestao).toHaveText("Sugerir um lugar para o Guia")
    await sugestao.click()
    await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()

    // Negativo: Esc fecha o Criar e o Guia continua na tela.
    await page.keyboard.press("Escape")
    await expect(page.locator(SELETOR_MENU_CRIAR)).toHaveCount(0)
    await expect(page.locator(TELA)).toBeVisible()

    // Positivo: a porta de indicação do Criar é o caminho de sugestão.
    await sugestao.click()
    await page.locator('[data-escolha="indicate"]').click()
    const formulario = page.locator('[data-formulario-criacao="indicate"]')
    await expect(formulario).toBeVisible()
    await expect(formulario.getByRole("heading", { name: "Indicar negócio" })).toBeVisible()
  })

  test("corpo com token secundário, contraste AA, entrelinha e captura nos dois temas", async ({
    page,
  }) => {
    test.setTimeout(180_000)
    mkdirSync(DIRETORIO_DAS_CAPTURAS, { recursive: true })

    const erros: string[] = []
    page.on("pageerror", (erro) => erros.push(`pageerror: ${erro.message}`))
    page.on("console", (mensagem) => {
      if (mensagem.type() !== "error") return
      if (mensagem.text().includes("Failed to load resource")) return
      erros.push(`console: ${mensagem.text()}`)
    })

    const largura = page.viewportSize()?.width ?? 375

    for (const tema of TEMAS) {
      await page.emulateMedia({ colorScheme: tema })
      await abrirGuia(page)
      await page.evaluate(async () => {
        await document.fonts.ready
      })

      const corpo = await medirCorpo(page)
      const frente = canais(corpo.cor)
      expect(frente, `${largura}px ${tema}: o corpo usa o token de texto secundário`).toEqual(
        canais(corpo.token),
      )
      const razao = contraste(frente, canais(corpo.fundo))
      expect(razao, `${largura}px ${tema}: contraste do corpo`).toBeGreaterThanOrEqual(4.5)
      expect(corpo.entrelinha, `${largura}px ${tema}: entrelinha do corpo`).toBeGreaterThanOrEqual(
        1.6,
      )

      const transbordo = await page.evaluate((seletor) => {
        const caixa = document.querySelector<HTMLElement>(seletor)
        if (caixa === null) return { documento: 0, conteudo: 0 }
        return {
          documento: document.documentElement.scrollWidth - window.innerWidth,
          conteudo: caixa.scrollWidth - caixa.clientWidth,
        }
      }, SELETOR_CONTEUDO)
      expect(
        transbordo.documento,
        `${largura}px ${tema}: transbordo do documento`,
      ).toBeLessThanOrEqual(0)
      expect(
        transbordo.conteudo,
        `${largura}px ${tema}: transbordo do conteúdo`,
      ).toBeLessThanOrEqual(0)

      await page.screenshot({
        path: join(DIRETORIO_DAS_CAPTURAS, `guia-${largura}-${tema}.png`),
        fullPage: true,
        animations: "disabled",
      })
    }

    expect(erros).toEqual([])
  })
})
