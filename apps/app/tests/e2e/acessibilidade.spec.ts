import AxeBuilder from "@axe-core/playwright"
import type { Locator, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import type { AxeResults } from "axe-core"
import {
  abrir,
  abrirGaleria,
  EVENTO_DA_PROVA,
  SELETOR_AVISOS,
  SELETOR_BARRA,
  SELETOR_CONVERSAS,
  SELETOR_CRIAR,
  SELETOR_MENU_CRIAR,
  SELETOR_NAVEGACAO,
  simularEvento,
  simularGuia,
  simularNegocios,
  simularProgresso,
  test as testDaProva,
} from "./apoio"
import { simularConversas } from "./conversas-ajuda"
import { simularInicio } from "./inicio-ajuda"
import { aplicarStubMercado } from "./stub-mercado"

/**
 * Acessibilidade das superfícies reais e da casca (§5.9).
 *
 * A matriz de axe roda nas cinco superfícies do lançamento, em 375, 768 e 1440,
 * nos dois temas, pelas tags WCAG A/AA e 2.1 AA, e falha em impacto sério ou
 * crítico — contraste AA entra por aí, sem limiar afrouxado. Teclado, foco,
 * movimento reduzido e o botão «Não vou» do encontro são medidos no navegador,
 * não deduzidos do código.
 *
 * As checagens antigas da casca continuam aqui e seguem no modo de prova: elas
 * medem os controles fictícios que o modo desenha, e é isso que as tornava
 * estáveis. As telas reais não usam esse modo — nelas o roteador monta as telas
 * de produto, com as rotas de dado simuladas por `page.route`.
 */

const LARGURAS = [375, 768, 1440] as const
const TEMAS = ["light", "dark"] as const
const TAGS_DO_AXE = ["wcag2a", "wcag2aa", "wcag21aa"] as const

type Superficie = Readonly<{
  nome: string
  caminho: string
  seletor: string
  preparar: (page: Page) => Promise<void> | void
}>

const SUPERFICIES: readonly Superficie[] = [
  {
    nome: "Início",
    caminho: "/app/inicio",
    seletor: '[data-tela="inicio"]',
    preparar: simularInicio,
  },
  {
    nome: "Mercado",
    caminho: "/app/mercado",
    seletor: '[data-tela="desapegos"]',
    preparar: aplicarStubMercado,
  },
  {
    nome: "Negócios",
    caminho: "/app/negocios",
    seletor: '[data-tela="negocios"]',
    preparar: simularNegocios,
  },
  {
    nome: "Guia",
    caminho: "/app/guia",
    seletor: '[data-tela="guia"]',
    preparar: simularGuia,
  },
  {
    nome: "Conversas",
    caminho: "/app/conversas",
    seletor: '[data-tela="conversas"]',
    preparar: simularConversas,
  },
]

function descrever(
  superficie: string,
  largura: number,
  tema: string,
  violacoes: AxeResults["violations"],
): string {
  const linhas = violacoes.map(
    (violacao) =>
      `- [${violacao.impact ?? "sem impacto"}] ${violacao.id}: ${violacao.help} (${violacao.nodes.length} nó(s))`,
  )
  return `${superficie} em ${largura}px, tema ${tema}:\n${linhas.join("\n")}`
}

/** Espera as animações finitas da entrada acabarem; o teto evita travar em laço. */
async function aguardarAnimacoes(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const limite = new Promise<void>((resolver) => {
      setTimeout(resolver, 2000)
    })
    const animacoes = document
      .getAnimations()
      .map((animacao) => animacao.finished.catch(() => undefined))
    await Promise.race([Promise.all(animacoes).then(() => undefined), limite])
  })
}

test.describe("axe nas telas reais", () => {
  for (const superficie of SUPERFICIES) {
    test(`${superficie.nome}: sem violação séria em 375/768/1440, claro e escuro`, async ({
      page,
    }, info) => {
      // A matriz fixa as três larguras de dentro de um projeto só; rodar nos seis
      // projetos repetiria as mesmas trinta análises seis vezes.
      test.skip(info.project.name !== "desktop-1440", "a matriz fixa as três larguras")
      test.setTimeout(180_000)
      await simularProgresso(page)
      await superficie.preparar(page)

      for (const largura of LARGURAS) {
        await page.setViewportSize({ width: largura, height: 900 })
        for (const tema of TEMAS) {
          await page.emulateMedia({ colorScheme: tema })
          await page.goto(superficie.caminho)
          await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
          await expect(page.locator(superficie.seletor)).toBeVisible()
          await aguardarAnimacoes(page)

          const resultado = await new AxeBuilder({ page }).withTags([...TAGS_DO_AXE]).analyze()
          const graves = resultado.violations.filter(
            (violacao) => violacao.impact === "serious" || violacao.impact === "critical",
          )
          expect(graves, descrever(superficie.nome, largura, tema, graves)).toEqual([])
        }
      }
    })
  }
})

test.describe("teclado e foco nas telas reais", () => {
  test("Tab alcança a ação primária, Enter ativa, Esc fecha e devolve o foco", async ({ page }) => {
    await simularProgresso(page)
    await simularInicio(page)
    await page.goto("/app/inicio")
    await expect(page.locator('[data-tela="inicio"]')).toBeVisible()

    // Começa sem ponto privilegiado: tira o foco de onde a entrada o deixou e
    // percorre a página com Tab, como quem usa só o teclado.
    await page.evaluate(() => {
      const ativo = document.activeElement
      if (ativo instanceof HTMLElement) ativo.blur()
    })
    const busca = page.locator('[data-acao="busca"]')
    let alcancou = false
    for (let volta = 0; volta < 160; volta += 1) {
      await page.keyboard.press("Tab")
      if (await busca.evaluate((elemento) => elemento === document.activeElement)) {
        alcancou = true
        break
      }
    }
    expect(alcancou).toBe(true)

    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/app\/busca$/)
    await expect(page.locator('[data-campo="busca"]')).toBeFocused()

    await page.goto("/app/inicio")
    await expect(page.locator('[data-tela="inicio"]')).toBeVisible()
    const criar = page.locator(SELETOR_CRIAR)
    await criar.focus()
    await page.keyboard.press("Enter")
    await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.locator(SELETOR_MENU_CRIAR)).toHaveCount(0)
    await expect(criar).toBeFocused()
  })
})

test.describe("movimento reduzido nas telas reais", () => {
  test("com prefers-reduced-motion a folha do guia não anima", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await simularProgresso(page)
    await simularGuia(page)
    await page.goto("/app/guia")
    await expect(page.locator('[data-tela="guia"]')).toBeVisible()

    await page.locator('[data-linha="lista"]').first().click()
    const folha = page.locator('[data-sobreposicao="folha"]')
    await expect(folha).toBeVisible()

    const animacao = await folha.evaluate((elemento) => {
      const estilo = getComputedStyle(elemento)
      return { nome: estilo.animationName, duracao: estilo.animationDuration }
    })
    expect(animacao.nome).toBe("none")
    expect(Number.parseFloat(animacao.duracao)).toBe(0)
  })
})

test.describe("contraste nas telas reais", () => {
  test("texto e tom contornado passam AA nos dois temas", async ({ page }) => {
    await simularProgresso(page)
    await simularGuia(page)

    for (const tema of TEMAS) {
      await page.emulateMedia({ colorScheme: tema })
      await page.goto("/app/guia")
      const botao = page.getByRole("button", { name: "Ver mais referências" })
      await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
      await expect(botao).toBeVisible()
      await aguardarAnimacoes(page)

      const medida = await page.evaluate(() => {
        type Canais = Readonly<{ r: number; g: number; b: number; a: number }>

        function canais(valor: string): Canais {
          const rgb = valor.match(/^rgba?\(([^)]+)\)$/)
          if (rgb !== null) {
            const partes = (rgb[1] ?? "").split(/[\s,/]+/).filter((parte) => parte !== "")
            const [r = "0", g = "0", b = "0", a = "1"] = partes
            return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) }
          }
          const srgb = valor.match(/^color\(srgb\s+([^)]+)\)$/)
          if (srgb !== null) {
            const partes = (srgb[1] ?? "").split(/[\s/]+/).filter((parte) => parte !== "")
            const [r = "0", g = "0", b = "0", a = "1"] = partes
            return {
              r: Number(r) * 255,
              g: Number(g) * 255,
              b: Number(b) * 255,
              a: Number(a),
            }
          }
          throw new Error(`Cor não reconhecida: ${valor}`)
        }

        function luminancia(cor: Canais): number {
          const canal = (valor: number) => {
            const proporcao = valor / 255
            return proporcao <= 0.03928 ? proporcao / 12.92 : ((proporcao + 0.055) / 1.055) ** 2.4
          }
          return 0.2126 * canal(cor.r) + 0.7152 * canal(cor.g) + 0.0722 * canal(cor.b)
        }

        function contraste(frente: Canais, fundo: Canais): number {
          const claro = luminancia(frente) + 0.05
          const escuro = luminancia(fundo) + 0.05
          return claro > escuro ? claro / escuro : escuro / claro
        }

        function compor(frente: Canais, fundo: Canais): Canais {
          return {
            r: frente.r * frente.a + fundo.r * (1 - frente.a),
            g: frente.g * frente.a + fundo.g * (1 - frente.a),
            b: frente.b * frente.a + fundo.b * (1 - frente.a),
            a: 1,
          }
        }

        const titulo = document.querySelector("h1[data-titulo-da-tela]")
        const botao = Array.from(document.querySelectorAll("button")).find((elemento) =>
          (elemento.textContent ?? "").includes("Ver mais referências"),
        )
        if (!(titulo instanceof HTMLElement) || !(botao instanceof HTMLElement)) {
          throw new Error("Título ou botão contornado não encontrado")
        }

        const fundoDoCorpo = canais(getComputedStyle(document.body).backgroundColor)
        const estiloDoTitulo = getComputedStyle(titulo)
        const tamanho = Number.parseFloat(estiloDoTitulo.fontSize)
        const peso = Number.parseInt(estiloDoTitulo.fontWeight, 10) || 400
        const limiar = tamanho >= 24 || (tamanho >= 18.66 && peso >= 700) ? 3 : 4.5

        const sonda = document.createElement("span")
        sonda.style.color = "var(--foreground)"
        document.body.append(sonda)
        const tinta = canais(getComputedStyle(sonda).color)
        sonda.remove()

        const corDoBotao = canais(getComputedStyle(botao).color)
        const fundoDoBotao = canais(getComputedStyle(botao).backgroundColor)
        const fundo = fundoDoBotao.a < 1 ? compor(fundoDoBotao, fundoDoCorpo) : fundoDoBotao

        return {
          texto: contraste(canais(estiloDoTitulo.color), fundoDoCorpo),
          limiar,
          contorno: contraste(corDoBotao, fundo),
          usaTinta:
            Math.abs(corDoBotao.r - tinta.r) < 1 &&
            Math.abs(corDoBotao.g - tinta.g) < 1 &&
            Math.abs(corDoBotao.b - tinta.b) < 1,
        }
      })

      expect(medida.texto, `texto no tema ${tema}`).toBeGreaterThanOrEqual(medida.limiar)
      expect(medida.contorno, `contorno no tema ${tema}`).toBeGreaterThanOrEqual(4.5)
      expect(medida.usaTinta, `contorno usa a tinta no tema ${tema}`).toBe(true)
    }
  })
})

test.describe("presença no encontro", () => {
  test("«Não vou» grava a presença e atualiza o estado", async ({ page }) => {
    await simularProgresso(page)
    await simularEvento(page)
    await page.goto(`/app/evento/${EVENTO_DA_PROVA.evento.id}`)
    await expect(page.locator('[data-tela="evento"]')).toBeVisible()

    const naoVou = page.getByRole("button", { name: "Não vou", exact: true })
    await expect(naoVou).toBeVisible()
    const pedido = page.waitForRequest(
      (requisicao) => requisicao.method() === "PUT" && requisicao.url().endsWith("/presenca"),
    )
    await naoVou.click()

    const enviado = await pedido
    expect(enviado.postDataJSON()).toEqual({ situacao: "not_going" })
    await expect(naoVou).toHaveAttribute("aria-pressed", "true")
  })
})

// ---------------------------------------------------------------------------
// Casca no modo de prova (checagens preservadas da versão anterior do spec).
// ---------------------------------------------------------------------------

const MINIMO_DO_ALVO = 44

async function medirAlvos(locator: Locator): Promise<string[]> {
  const quantos = await locator.count()
  const problemas: string[] = []
  for (let indice = 0; indice < quantos; indice += 1) {
    const elemento = locator.nth(indice)
    if (!(await elemento.isVisible())) continue
    const caixa = await elemento.boundingBox()
    if (!caixa) {
      problemas.push(`item ${indice}: sem caixa`)
      continue
    }
    if (caixa.height + 0.5 < MINIMO_DO_ALVO) {
      problemas.push(`item ${indice}: altura ${caixa.height.toFixed(1)}px`)
    }
    if (caixa.width + 0.5 < MINIMO_DO_ALVO) {
      problemas.push(`item ${indice}: largura ${caixa.width.toFixed(1)}px`)
    }
  }
  return problemas
}

testDaProva.describe("alvos de toque e teclado", () => {
  testDaProva("os controles da barra do topo têm 44 px", async ({ page }) => {
    await abrir(page, "/app/inicio")
    const problemas = await medirAlvos(page.locator(`${SELETOR_BARRA} button`))
    expect(problemas).toEqual([])
  })

  testDaProva("as abas da navegação têm 44 px", async ({ page }) => {
    await abrir(page, "/app/inicio")
    const problemas = await medirAlvos(page.locator(`${SELETOR_NAVEGACAO} button`))
    expect(problemas).toEqual([])
  })

  testDaProva("o Criar também, inclusive compacto", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 0
    await abrir(page, "/app/inicio")
    const problemas = await medirAlvos(page.locator(SELETOR_CRIAR))
    expect(problemas).toEqual([])
    if (largura < 720) {
      await page.locator("#conteudo").hover()
      await page.mouse.wheel(0, 400)
      await expect(page.locator(SELETOR_CRIAR)).toHaveAttribute("data-compacto", "sim")
      await expect(page.locator(SELETOR_CRIAR)).toBeInViewport()
      await expect(page.locator(`${SELETOR_CRIAR} [data-criar="botao"]`)).toHaveCSS("width", "56px")
      await expect(page.locator(`${SELETOR_CRIAR} [data-criar="rotulo"]`)).toBeHidden()
      expect(await medirAlvos(page.locator(SELETOR_CRIAR))).toEqual([])
    }
  })

  testDaProva("o teclado alcança os controles e a barra de baixo", async ({ page }) => {
    await abrir(page, "/app/inicio")

    // A tela de prova já deixa o foco no título; percorre a página inteira com Tab
    // (com parada antecipada) até alcançar os controles do topo e a barra de
    // baixo, sem começar de um ponto privilegiado.
    await page.evaluate(() => {
      const ativo = document.activeElement
      if (ativo instanceof HTMLElement) ativo.blur()
    })

    // Percorre o foco de verdade com Tab e anota o alvo pelo marcador estável do
    // próprio controle (`data-acao`/`data-aba`). O `textContent` mentiria: a
    // ligadura do Material Symbols entra nele mesmo com `aria-hidden`.
    const focados: string[] = []
    const alvos = ["avisos", "conversas-topo", "inicio"]
    for (let volta = 0; volta < 160; volta += 1) {
      await page.keyboard.press("Tab")
      const marcador = await page.evaluate(() => {
        const ativo = document.activeElement as HTMLElement | null
        return ativo?.dataset["acao"] ?? ativo?.dataset["aba"] ?? ""
      })
      focados.push(marcador)
      if (alvos.every((alvo) => focados.includes(alvo))) break
    }
    expect(focados).toContain("avisos")
    expect(focados).toContain("conversas-topo")
    expect(focados).toContain("inicio")

    // O nome acessível é medido no alvo focado real, pela asserção do Playwright
    // (`toHaveAccessibleName`), não por `textContent`.
    await expect(page.locator(SELETOR_AVISOS)).toHaveAccessibleName("Avisos")
    await expect(page.locator(SELETOR_CONVERSAS)).toHaveAccessibleName("Conversas")
    await expect(page.locator(`${SELETOR_NAVEGACAO} [data-aba="inicio"]`)).toHaveAccessibleName(
      /Início/,
    )
  })

  testDaProva("o botão Voltar tem nome acessível sem o texto do ícone", async ({ page }) => {
    await abrir(page, "/app/salvos")
    await expect(page.getByRole("button", { name: "Voltar", exact: true })).toHaveCount(1)
  })
})

testDaProva.describe("foco em sobreposição", () => {
  testDaProva("o diálogo prende o foco e devolve ao acionador", async ({ page }) => {
    await abrir(page, "/app/inicio")
    const acionador = page.locator(SELETOR_CRIAR)
    await acionador.click()
    await expect(page.locator('[data-sobreposicao="menu-criar"]')).toBeVisible()

    for (let volta = 0; volta < 10; volta += 1) {
      await page.keyboard.press("Tab")
      const dentro = await page.evaluate(
        () => document.activeElement?.closest("[data-sobreposicao]") !== null,
      )
      expect(dentro, `volta ${volta}`).toBe(true)
    }

    await page.keyboard.press("Escape")
    await expect(page.locator('[data-sobreposicao="menu-criar"]')).toHaveCount(0)
    await expect(acionador).toBeFocused()
  })

  testDaProva("a folha de cidade prende o foco e devolve ao chip", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await page.locator('[data-acao="cidade"]').click()
    await expect(page.locator('[data-sobreposicao="cidade"]')).toBeVisible()
    const dentro = await page.evaluate(
      () => document.activeElement?.closest('[data-sobreposicao="cidade"]') !== null,
    )
    expect(dentro).toBe(true)

    await page.keyboard.press("Escape")
    await expect(page.locator('[data-sobreposicao="cidade"]')).toHaveCount(0)
    await expect(page.locator('[data-acao="cidade"]')).toBeFocused()
  })
})

testDaProva.describe("sem rolagem horizontal", () => {
  for (const caminho of ["/app/inicio", "/app/salvos", "/app/mercado"]) {
    testDaProva(`${caminho} cabe na largura, com a barra e sem a barra`, async ({ page }) => {
      await abrir(page, caminho)
      const medidas = await page.evaluate(() => {
        const conteudo = document.getElementById("conteudo")
        return {
          documento: document.documentElement.scrollWidth - window.innerWidth,
          corpo: document.body.scrollWidth - window.innerWidth,
          conteudo: conteudo ? conteudo.scrollWidth - conteudo.clientWidth : 0,
        }
      })
      expect(medidas.documento, caminho).toBeLessThanOrEqual(0)
      expect(medidas.corpo, caminho).toBeLessThanOrEqual(0)
      expect(medidas.conteudo, caminho).toBeLessThanOrEqual(0)
    })
  }

  testDaProva("a galeria, que é a tela mais cheia, também cabe", async ({ page }) => {
    await abrirGaleria(page)
    const excesso = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(excesso).toBeLessThanOrEqual(0)
  })
})
