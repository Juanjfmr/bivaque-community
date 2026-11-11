import { mkdirSync } from "node:fs"
import { join } from "node:path"
import AxeBuilder from "@axe-core/playwright"
import type { Locator, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import type { AxeResults } from "axe-core"
import {
  abrir,
  abrirGaleria,
  EVENTO_DA_PROVA,
  NEGOCIO_DA_PROVA,
  PEDIDO_DA_PROVA,
  SELETOR_AVISOS,
  SELETOR_BARRA,
  SELETOR_CONVERSAS,
  SELETOR_CRIAR,
  SELETOR_MENU_CRIAR,
  SELETOR_NAVEGACAO,
  simularEvento,
  simularGuia,
  simularNegocio,
  simularNegocios,
  simularPedido,
  simularProgresso,
  test as testDaProva,
} from "./apoio"
import { simularConversas } from "./conversas-ajuda"
import { simularInicio } from "./inicio-ajuda"
import { aplicarStubMercado } from "./stub-mercado"

/**
 * Acessibilidade das superfícies reais e da casca (§5.9).
 *
 * A matriz de axe roda nas superfícies reais, em 375, 768 e 1440, nos dois
 * temas, pelas tags WCAG A/AA e 2.1 AA, e falha em impacto sério ou crítico —
 * contraste AA entra por aí, sem limiar afrouxado. Além das cinco telas do
 * lançamento, ela cobre a busca (vazia e com termo), o menu Criar, o formulário
 * de encontro, a ficha do negócio e o pedido. Teclado, foco, movimento reduzido
 * e contraste são medidos no navegador, não deduzidos do código.
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
  /** Conteúdo que só existe no estado populado; evita medir loading/erro. */
  conteudo?: string
  preparar: (page: Page) => Promise<void> | void
  /** Abre a sobreposição ou popula a tela antes da análise, quando precisa. */
  abrir?: (page: Page) => Promise<void>
}>

/** As cinco telas do lançamento, já cobertas pela matriz. */
const SUPERFICIES_DO_LANCAMENTO: readonly Superficie[] = [
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

/**
 * As superfícies novas: a busca nos dois estados (sem termo e com resultados),
 * o menu Criar aberto, o formulário de encontro aberto a partir dele, a ficha do
 * negócio e o pedido. `abrir` é o passo que o teclado ou o clique dão depois de
 * a tela montar; a análise espera o resultado dele.
 */
const SUPERFICIES_NOVAS: readonly Superficie[] = [
  {
    nome: "Busca",
    caminho: "/app/busca",
    seletor: '[data-tela="busca"]',
    preparar: simularInicio,
  },
  {
    nome: "Busca com termo",
    caminho: "/app/busca",
    seletor: '[data-chip="all"]',
    preparar: simularInicio,
    abrir: async (page) => {
      // O campo do topo escreve na consulta da casca; a tela de busca lê dela e
      // pede `/api/app/busca?q=…` — o mesmo caminho de quem digita.
      await page.locator('[data-campo="busca"]').fill("mudança")
      await expect(page.getByText(/^\d+ resultados? em Manaus$/)).toBeVisible()
    },
  },
  {
    nome: "Menu Criar",
    caminho: "/app/inicio",
    seletor: SELETOR_MENU_CRIAR,
    preparar: simularInicio,
    abrir: async (page) => {
      await page.locator(SELETOR_CRIAR).click()
      await expect(page.locator("[data-escolha]")).toHaveCount(7)
    },
  },
  {
    nome: "Formulário de encontro",
    caminho: "/app/inicio",
    seletor: '[data-sobreposicao="folha"]',
    preparar: simularInicio,
    abrir: async (page) => {
      await page.locator(SELETOR_CRIAR).click()
      await page.locator('[data-escolha="create-event"]').click()
      await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
    },
  },
  {
    nome: "Negócio",
    caminho: `/app/negocio/${NEGOCIO_DA_PROVA.id}`,
    seletor: '[data-tela="negocio"]',
    preparar: simularNegocio,
  },
  {
    nome: "Pedido",
    caminho: `/app/pedido/${PEDIDO_DA_PROVA.id}`,
    seletor: '[data-tela="pedido"]',
    conteudo: 'button:has-text("Ver negócio")',
    preparar: simularPedido,
  },
]

const SUPERFICIES: readonly Superficie[] = [...SUPERFICIES_DO_LANCAMENTO, ...SUPERFICIES_NOVAS]

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

/**
 * Tira o foco de onde a tela o deixou e anda com Tab até o alvo, como quem usa
 * só o teclado. Falha alto quando o alvo não entra na ordem de foco.
 */
async function alcancarComTab(page: Page, alvo: Locator, limite = 160): Promise<void> {
  await page.evaluate(() => {
    const ativo = document.activeElement
    if (ativo instanceof HTMLElement) ativo.blur()
  })
  for (let volta = 0; volta < limite; volta += 1) {
    await page.keyboard.press("Tab")
    if (await alvo.evaluate((elemento) => elemento === document.activeElement)) return
  }
  throw new Error(`O Tab não alcançou ${alvo.toString()}`)
}

/** O `data-escolha` do botão focado, para medir a navegação por setas. */
async function escolhaFocada(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const ativo = document.activeElement
    return ativo instanceof HTMLElement ? (ativo.dataset["escolha"] ?? null) : null
  })
}

/** O `data-chip` do controle focado, para medir a navegação dos filtros. */
async function chipFocado(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const ativo = document.activeElement
    return ativo instanceof HTMLElement ? (ativo.dataset["chip"] ?? null) : null
  })
}

type MedidaDeContraste = Readonly<{
  texto: number
  limiar: number
  contorno: number
  usaTinta: boolean
}>

/**
 * Mede o contraste do título e de um botão contornado na tela já aberta. O
 * título é comparado ao fundo do corpo, com o limiar de texto grande quando for
 * o caso; o botão é comparado ao próprio fundo (composto quando ele tem alfa) e
 * a tinta dele é conferida contra `--foreground`, para provar que o contorno
 * herda o token do tema em vez de uma cor solta.
 */
async function medirContrasteDaTela(page: Page, rotuloDoBotao: string): Promise<MedidaDeContraste> {
  return page.evaluate((rotulo) => {
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
      // Tailwind 4 resolve `dark:bg-(--input)/30` para oklab com alfa; o
      // navegador serializa a cor computada nesse espaço, não em rgb.
      const oklab = valor.match(/^oklab\(([^)]+)\)$/)
      if (oklab !== null) {
        const partes = (oklab[1] ?? "").split(/[\s/]+/).filter((parte) => parte !== "")
        const [l = "0", a = "0", b = "0", alfa = "1"] = partes
        const L = Number(l)
        const A = Number(a)
        const B = Number(b)
        const l_ = L + 0.3963377774 * A + 0.2158037573 * B
        const m_ = L - 0.1055613458 * A - 0.0638541728 * B
        const s_ = L - 0.0894841775 * A - 1.291485548 * B
        const l3 = l_ ** 3
        const m3 = m_ ** 3
        const s3 = s_ ** 3
        const linear = (x: number) => {
          const v = Math.max(0, Math.min(1, x))
          return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
        }
        return {
          r: linear(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3) * 255,
          g: linear(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3) * 255,
          b: linear(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3) * 255,
          a: alfa.endsWith("%") ? Number(alfa.slice(0, -1)) / 100 : Number(alfa),
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
      (elemento.textContent ?? "").includes(rotulo),
    )
    if (!(titulo instanceof HTMLElement) || !(botao instanceof HTMLElement)) {
      throw new Error(`Título ou botão contornado não encontrado (${rotulo})`)
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
  }, rotuloDoBotao)
}

test.describe("axe nas telas reais", () => {
  for (const superficie of SUPERFICIES) {
    test(`${superficie.nome}: sem violação séria em 375/768/1440, claro e escuro`, async ({
      page,
    }, info) => {
      // A matriz fixa as três larguras de dentro de um projeto só; rodar nos seis
      // projetos repetiria as mesmas análises seis vezes.
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
          if (superficie.abrir !== undefined) await superficie.abrir(page)
          await expect(page.locator(superficie.seletor)).toBeVisible()
          if (superficie.conteudo !== undefined) {
            await expect(page.locator(superficie.conteudo)).toBeVisible()
          }
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
    // Enter ativou a busca: a tela de resultados assume. O foco do campo do topo
    // não é requisito do fluxo (o Tab já provou o alcance antes do Enter).
    await expect(page.locator('[data-tela="busca"]')).toBeVisible()

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

test.describe("teclado nas superfícies novas", () => {
  // O teclado novo roda uma vez no desktop-1440; o teste preexistente (:371)
  // continua nos seis projetos. As três larguras de layout ficam na matriz
  // axe, nas capturas e na varredura de rolagem.
  test.beforeEach(() => {
    if (test.info().project.name !== "desktop-1440") test.skip()
  })
  test("o Criar anda pelas escolhas com as setas e o Esc devolve o foco", async ({ page }) => {
    await simularProgresso(page)
    await simularInicio(page)
    await page.goto("/app/inicio")
    await expect(page.locator('[data-tela="inicio"]')).toBeVisible()

    const criar = page.locator(SELETOR_CRIAR)
    await alcancarComTab(page, criar)
    await page.keyboard.press("Enter")
    await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
    await expect(page.locator("[data-escolha]")).toHaveCount(7)

    // O menu abre com o foco na primeira escolha; as setas circulam a lista e
    // Home/End vão às pontas, sem tirar o foco de dentro do menu.
    await expect.poll(() => escolhaFocada(page)).toBe("ask")
    await page.keyboard.press("ArrowDown")
    await expect.poll(() => escolhaFocada(page)).toBe("create-request")
    await page.keyboard.press("End")
    await expect.poll(() => escolhaFocada(page)).toBe("my-biz")
    await page.keyboard.press("Home")
    await expect.poll(() => escolhaFocada(page)).toBe("ask")
    await page.keyboard.press("ArrowUp")
    await expect.poll(() => escolhaFocada(page)).toBe("my-biz")

    await page.keyboard.press("Escape")
    await expect(page.locator(SELETOR_MENU_CRIAR)).toHaveCount(0)
    await expect(criar).toBeFocused()
  })

  test("a Busca recebe o termo pelo teclado e o Enter aplica o filtro", async ({ page }) => {
    await simularProgresso(page)
    await simularInicio(page)
    await page.goto("/app/busca")
    await expect(page.locator('[data-tela="busca"]')).toBeVisible()

    const campo = page.locator('[data-campo="busca"]')
    await alcancarComTab(page, campo)
    await expect(campo).toBeFocused()

    // A casca grava o termo a cada tecla; a tela busca sozinha, sem enviar.
    await page.keyboard.type("mudança")
    await expect(page.getByText(/^\d+ resultados? em Manaus$/)).toBeVisible()

    // O grupo de filtros é um só ponto de Tab; as setas andam e o Enter aplica.
    let chip: string | null = null
    for (let volta = 0; volta < 12 && chip === null; volta += 1) {
      await page.keyboard.press("Tab")
      chip = await chipFocado(page)
    }
    expect(chip, "o Tab não alcançou os filtros").not.toBeNull()
    for (let volta = 0; volta < 8 && chip !== "anuncios"; volta += 1) {
      await page.keyboard.press("ArrowRight")
      chip = await chipFocado(page)
    }
    expect(chip).toBe("anuncios")
    await page.keyboard.press("Enter")
    await expect(page.locator('[data-chip="anuncios"]')).toHaveAttribute("data-estado", "on")
  })

  test("no negócio o Tab chega ao orçamento, o Enter abre a folha e o Esc volta", async ({
    page,
  }) => {
    await simularProgresso(page)
    await simularNegocio(page)
    await page.goto(`/app/negocio/${NEGOCIO_DA_PROVA.id}`)
    await expect(page.locator('[data-tela="negocio"]')).toBeVisible()

    const pedir = page.getByRole("button", { name: "Pedir orçamento" })
    await alcancarComTab(page, pedir)
    await page.keyboard.press("Enter")

    const folha = page.locator('[data-sobreposicao="contato-interesse"]')
    await expect(folha).toBeVisible()
    await expect(page.getByRole("heading", { name: "Pedir orçamento" })).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(folha).toHaveCount(0)
    await expect(pedir).toBeFocused()
  })

  test("no pedido o Tab chega à ação primária e o Enter leva ao negócio", async ({ page }) => {
    await simularProgresso(page)
    await simularPedido(page)
    await simularNegocio(page)
    await page.goto(`/app/pedido/${PEDIDO_DA_PROVA.id}`)
    await expect(page.locator('[data-tela="pedido"]')).toBeVisible()

    const verNegocio = page.getByRole("button", { name: "Ver negócio" })
    await alcancarComTab(page, verNegocio)
    await page.keyboard.press("Enter")

    await expect(page).toHaveURL(new RegExp(`/app/negocio/${NEGOCIO_DA_PROVA.id}$`))
    await expect(page.getByRole("heading", { level: 1, name: "Clínica Bem Viver" })).toBeVisible()
  })

  test("o encontro abre pelo teclado e o Esc devolve o foco à escolha de origem", async ({
    page,
  }) => {
    await simularProgresso(page)
    await simularInicio(page)
    await page.goto("/app/inicio")
    await expect(page.locator('[data-tela="inicio"]')).toBeVisible()

    const criar = page.locator(SELETOR_CRIAR)
    await alcancarComTab(page, criar)
    await page.keyboard.press("Enter")
    await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()

    const escolha = page.locator('[data-escolha="create-event"]')
    await alcancarComTab(page, escolha)
    await page.keyboard.press("Enter")

    const folha = page.locator('[data-sobreposicao="folha"]')
    await expect(folha).toBeVisible()
    await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()

    // Enter sem preencher prova o caminho do erro sem sair da folha.
    await alcancarComTab(page, folha.getByRole("button", { name: "Criar", exact: true }))
    await page.keyboard.press("Enter")
    await expect(folha.getByRole("alert")).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(folha).toHaveCount(0)
    await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
    await expect(escolha).toBeFocused()

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

  test("o menu Criar e a folha do encontro entram sem animação", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await simularProgresso(page)
    await simularInicio(page)
    await page.goto("/app/inicio")
    await expect(page.locator('[data-tela="inicio"]')).toBeVisible()

    await page.locator(SELETOR_CRIAR).click()
    const menu = page.locator(SELETOR_MENU_CRIAR)
    await expect(menu).toBeVisible()
    const animacaoDoMenu = await menu.evaluate((elemento) => {
      const estilo = getComputedStyle(elemento)
      return { nome: estilo.animationName, duracao: estilo.animationDuration }
    })
    expect(animacaoDoMenu.nome).toBe("none")
    expect(Number.parseFloat(animacaoDoMenu.duracao)).toBe(0)

    // As escolhas entram escalonadas por `--i`; com movimento reduzido a
    // transição também fica em zero e nada aparece depois do primeiro quadro.
    const animacaoDaEscolha = await page.locator('[data-escolha="ask"]').evaluate((elemento) => {
      const estilo = getComputedStyle(elemento)
      return {
        nome: estilo.animationName,
        transicoes: estilo.transitionDuration.split(", "),
      }
    })
    expect(animacaoDaEscolha.nome).toBe("none")
    for (const duracao of animacaoDaEscolha.transicoes) {
      expect(Number.parseFloat(duracao)).toBe(0)
    }

    await page.locator('[data-escolha="create-event"]').click()
    const folha = page.locator('[data-sobreposicao="folha"]')
    await expect(folha).toBeVisible()
    const animacaoDaFolha = await folha.evaluate((elemento) => {
      const estilo = getComputedStyle(elemento)
      return { nome: estilo.animationName, duracao: estilo.animationDuration }
    })
    expect(animacaoDaFolha.nome).toBe("none")
    expect(Number.parseFloat(animacaoDaFolha.duracao)).toBe(0)
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

      const medida = await medirContrasteDaTela(page, "Ver mais referências")

      expect(medida.texto, `texto no tema ${tema}`).toBeGreaterThanOrEqual(medida.limiar)
      expect(medida.contorno, `contorno no tema ${tema}`).toBeGreaterThanOrEqual(4.5)
      expect(medida.usaTinta, `contorno usa a tinta no tema ${tema}`).toBe(true)
    }
  })

  test("negócio e pedido passam AA no título e no tom contornado", async ({ page }) => {
    await simularProgresso(page)
    await simularNegocio(page)
    await simularPedido(page)

    for (const tema of TEMAS) {
      await page.emulateMedia({ colorScheme: tema })

      await page.goto(`/app/negocio/${NEGOCIO_DA_PROVA.id}`)
      await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
      await expect(page.getByRole("button", { name: "Salvar negócio" })).toBeVisible()
      await aguardarAnimacoes(page)
      const negocio = await medirContrasteDaTela(page, "Salvar negócio")
      expect(negocio.texto, `título do negócio no tema ${tema}`).toBeGreaterThanOrEqual(
        negocio.limiar,
      )
      expect(negocio.contorno, `contorno do negócio no tema ${tema}`).toBeGreaterThanOrEqual(4.5)
      expect(negocio.usaTinta, `contorno do negócio usa a tinta no tema ${tema}`).toBe(true)

      await page.goto(`/app/pedido/${PEDIDO_DA_PROVA.id}`)
      await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
      await expect(page.getByRole("button", { name: "Ver meus pedidos" })).toBeVisible()
      await aguardarAnimacoes(page)
      const pedido = await medirContrasteDaTela(page, "Ver meus pedidos")
      expect(pedido.texto, `título do pedido no tema ${tema}`).toBeGreaterThanOrEqual(pedido.limiar)
      expect(pedido.contorno, `contorno do pedido no tema ${tema}`).toBeGreaterThanOrEqual(4.5)
      expect(pedido.usaTinta, `contorno do pedido usa a tinta no tema ${tema}`).toBe(true)
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

test.describe("sem rolagem horizontal e sem erro de console", () => {
  test("as superfícies novas cabem em 375, 768 e 1440", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "a matriz fixa as três larguras")
    test.setTimeout(300_000)
    await simularProgresso(page)
    await simularInicio(page)
    await simularNegocio(page)
    await simularPedido(page)

    const erros: string[] = []
    page.on("pageerror", (erro) => erros.push(`pageerror: ${erro.message}`))
    page.on("console", (mensagem) => {
      if (mensagem.type() !== "error") return
      // Recurso ausente já aparece como 404 de rota; aqui interessa o erro de
      // execução da aplicação, que derruba a tela de verdade.
      if (mensagem.text().includes("Failed to load resource")) return
      erros.push(`console: ${mensagem.text()}`)
    })

    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 900 })
      for (const superficie of SUPERFICIES_NOVAS) {
        await page.goto(superficie.caminho)
        await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
        if (superficie.abrir !== undefined) await superficie.abrir(page)
        await expect(page.locator(superficie.seletor)).toBeVisible()
        await aguardarAnimacoes(page)

        const medidas = await page.evaluate(() => {
          const conteudo = document.querySelector("#conteudo")
          return {
            documento: document.documentElement.scrollWidth - window.innerWidth,
            corpo: document.body.scrollWidth - window.innerWidth,
            conteudo: conteudo === null ? 0 : conteudo.scrollWidth - conteudo.clientWidth,
          }
        })
        const caminho = `${superficie.nome} em ${largura}px`
        expect(medidas.documento, caminho).toBeLessThanOrEqual(0)
        expect(medidas.corpo, caminho).toBeLessThanOrEqual(0)
        expect(medidas.conteudo, caminho).toBeLessThanOrEqual(0)
      }
    }

    expect(erros).toEqual([])
  })
})

test.describe("capturas das superfícies novas", () => {
  test("375, 768 e 1440 nos dois temas", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "a matriz fixa as três larguras")
    test.setTimeout(300_000)
    const diretorio = join(process.cwd(), "..", "..", ".visual", "run-136")
    mkdirSync(diretorio, { recursive: true })

    await simularProgresso(page)
    await simularInicio(page)
    await simularNegocio(page)
    await simularPedido(page)

    const arquivar = (nome: string) =>
      nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 900 })
      for (const tema of TEMAS) {
        await page.emulateMedia({ colorScheme: tema })
        for (const superficie of SUPERFICIES_NOVAS) {
          await page.goto(superficie.caminho)
          await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
          if (superficie.abrir !== undefined) await superficie.abrir(page)
          await expect(page.locator(superficie.seletor)).toBeVisible()
          await aguardarAnimacoes(page)
          await page.evaluate(async () => {
            await document.fonts.ready
          })
          await page.screenshot({
            path: join(diretorio, `${arquivar(superficie.nome)}-${largura}-${tema}.png`),
            fullPage: true,
            animations: "disabled",
          })
        }
      }
    }
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
