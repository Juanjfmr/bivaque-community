import type { Page } from "@playwright/test"
import {
  abaAtiva,
  abrir,
  definirCascaDaProva,
  ESCOLHAS_DO_CRIAR,
  esperarCaminho,
  expect,
  SELETOR_AVISOS,
  SELETOR_BARRA,
  SELETOR_CHIP_CIDADE,
  SELETOR_CONVERSAS,
  SELETOR_CRIAR,
  SELETOR_MENU_CRIAR,
  SELETOR_NAVEGACAO,
  test,
  tituloDaTela,
} from "./apoio"

/**
 * A casca da onda 1c: barra do topo por rota, navegação de baixo e lateral,
 * menu Criar, minimização ao rolar, chip de cidade e faixa de visita. Tudo
 * medido no que a pessoa vê: texto, estilo computado, caixa, foco e rolagem real.
 */

async function rolarOCorpo(page: Page, quanto: number): Promise<void> {
  const alvo = page.locator("#conteudo")
  await alvo.hover()
  await page.mouse.wheel(0, quanto)
  await page.waitForTimeout(120)
}

test.describe("barra do topo por rota", () => {
  test("nas raízes mostra a marca; nas telas de dentro, a volta", async ({ page }) => {
    await abrir(page, "/app/inicio")
    // A marca é o símbolo do Bivaque em `components/bivaque/marca.tsx`
    // (`data-marca="simbolo"`), como no protótipo (`utilities/format.js: mark`).
    const marcaNoTopo = page.locator(`${SELETOR_BARRA} [data-marca="simbolo"]`)
    if ((page.viewportSize()?.width ?? 0) < 720) await expect(marcaNoTopo).toBeVisible()
    else {
      await expect(marcaNoTopo).toBeHidden()
      await expect(page.locator('[data-marca="rail"] [data-marca="simbolo"]')).toBeVisible()
    }
    await expect(page.locator(`${SELETOR_BARRA} [data-acao="voltar"]`)).toHaveCount(0)

    await abrir(page, "/app/salvos")
    await expect(page.locator(`${SELETOR_BARRA} [data-marca="simbolo"]`)).toHaveCount(0)
    await expect(page.locator(`${SELETOR_BARRA} [data-acao="voltar"]`)).toBeVisible()
  })

  test("o título do topo acompanha a rota", async ({ page }) => {
    await abrir(page, "/app/comunidade")
    await expect(page.locator(`${SELETOR_BARRA} [data-titulo="topo"]`)).toHaveText("Comunidade")
    await abrir(page, "/app/guia")
    await expect(page.locator(`${SELETOR_BARRA} [data-titulo="topo"]`)).toContainText("Guia de ")
  })

  test("os avisos com contador só existem na Início", async ({ page }) => {
    await definirCascaDaProva(page, { avisos: 3 })
    await abrir(page, "/app/inicio")
    await expect(page.locator(SELETOR_AVISOS)).toBeVisible()
    await expect(page.locator('[data-contador="avisos"]')).toHaveText("3")

    await abrir(page, "/app/comunidade")
    await expect(page.locator(SELETOR_AVISOS)).toHaveCount(0)
  })

  test("as conversas ficam no topo, com contador de não lidas", async ({ page }) => {
    await definirCascaDaProva(page, { conversas: 2 })
    await abrir(page, "/app/inicio")
    await expect(page.locator(SELETOR_CONVERSAS)).toBeVisible()
    await expect(page.locator('[data-contador="conversas"]')).toHaveText("2")
    await expect(page.locator(SELETOR_NAVEGACAO)).not.toContainText("Conversas")

    await page.locator(SELETOR_CONVERSAS).click()
    await esperarCaminho(page, "/app/conversas")
  })

  test("sem não lidas, o contador não é desenhado", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await expect(page.locator('[data-contador="conversas"]')).toHaveCount(0)
    await expect(page.locator('[data-contador="avisos"]')).toHaveCount(0)
  })

  test("o campo de busca digita e o Limpar busca esvazia o campo local", async ({ page }) => {
    await abrir(page, "/app/busca")
    const campo = page.locator('[data-campo="busca"]')
    await expect(campo).toBeVisible()

    // Digita de verdade no campo e usa o botão visível para limpar (§5.2).
    await campo.fill("aluguel")
    await expect(campo).toHaveValue("aluguel")

    await page.locator('[data-acao="limpar-busca"]').click()
    await expect(campo).toHaveValue("")
  })

  test("o chip de cidade mostra a cidade e abre a troca por sobreposição", async ({ page }) => {
    // ADR §3.1: a cidade fica no topo em qualquer largura. Este caso roda nos três
    // projetos (375, 768 e 1440), então prova o chip visível em todos eles.
    await definirCascaDaProva(page, { cidade: "Manaus" })
    await abrir(page, "/app/inicio")
    const chip = page.locator(SELETOR_CHIP_CIDADE)
    await expect(chip).toBeVisible()
    await expect(chip).toHaveAttribute("aria-haspopup", "dialog")
    await expect(chip).toContainText("Manaus")

    await chip.click()
    await expect(page.locator('[data-sobreposicao="cidade"]')).toBeVisible()

    // O Voltar do navegador fecha antes de trocar de rota.
    await page.goBack()
    await expect(page.locator('[data-sobreposicao="cidade"]')).toHaveCount(0)
    await expect(chip).toBeFocused()
    expect(new URL(page.url()).pathname).toBe("/app/inicio")
  })

  test("trocar de cidade liga a faixa de visita, e ela volta para casa", async ({ page }) => {
    await definirCascaDaProva(page, { cidade: "Manaus" })
    await abrir(page, "/app/inicio")
    await page.locator(SELETOR_CHIP_CIDADE).click()

    await page.locator('[data-campo="cidade"]').fill("Recife")
    await page.locator('[data-acao="aplicar-cidade"]').click()
    await expect(page.locator('[data-sobreposicao="cidade"]')).toHaveCount(0)

    await expect(page.locator(SELETOR_CHIP_CIDADE)).toContainText("Recife")
    const faixa = page.locator('[data-faixa="visita"]')
    await expect(faixa).toBeVisible()
    await expect(faixa).toContainText("Recife")
    await expect(faixa).toContainText("Manaus")

    await page.locator('[data-acao="voltar-para-casa"]').click()
    await expect(page.locator(SELETOR_CHIP_CIDADE)).toContainText("Manaus")
    await expect(page.locator('[data-faixa="visita"]')).toHaveCount(0)
  })

  test("a entrada e o painel do dono não têm barra do app", async ({ page }) => {
    for (const caminho of ["/app/entrar/conta", "/app/dono"]) {
      await abrir(page, caminho)
      await expect(page.locator(SELETOR_BARRA), caminho).toHaveCount(0)
      await expect(page.locator(SELETOR_NAVEGACAO), caminho).toHaveCount(0)
      await expect(tituloDaTela(page), caminho).toBeVisible()
    }
  })
})

test.describe("navegação de baixo e lateral", () => {
  test("tem os cinco lugares, com o Criar no meio e a aba ativa pelo dono", async ({ page }) => {
    await abrir(page, "/app/inicio")
    const nav = page.locator(SELETOR_NAVEGACAO)
    for (const aba of ["inicio", "comunidade", "mercado", "voce"]) {
      await expect(nav.locator(`[data-aba="${aba}"]`), aba).toBeVisible()
    }
    await expect(nav.locator(SELETOR_CRIAR)).toBeVisible()
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "inicio")

    await nav.locator('[data-aba="mercado"]').click()
    await esperarCaminho(page, "/app/mercado")
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "mercado")
  })

  test("no celular a barra de baixo só existe nas rotas-raiz", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await expect(page.locator(SELETOR_NAVEGACAO)).toBeVisible()

    await abrir(page, "/app/salvos")
    const nav = page.locator(SELETOR_NAVEGACAO)
    await expect(nav).toHaveCount(1)
    const largura = page.viewportSize()?.width ?? 0
    if (largura >= 720) {
      await expect(nav).toBeVisible()
    } else {
      await expect(nav).toBeHidden()
    }
  })

  test("minimiza ao rolar para baixo e volta ao subir", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 0
    test.skip(largura >= 720, "a minimização é do celular")

    await abrir(page, "/app/inicio")
    const nav = page.locator(SELETOR_NAVEGACAO)
    const criar = page.locator(SELETOR_CRIAR)
    const elevado = criar.locator('[data-criar="botao"]')
    expect(
      await elevado.evaluate((elemento) => {
        const caixa = elemento.getBoundingClientRect()
        return elemento.contains(document.elementFromPoint(caixa.x + caixa.width / 2, caixa.y + 8))
      }),
    ).toBe(true)
    await expect(nav).toHaveAttribute("data-minimizada", "nao")
    await expect(nav).toBeInViewport()
    await expect(criar.locator('[data-criar="rotulo"]')).toBeVisible()

    await rolarOCorpo(page, 400)
    await expect(nav).toHaveAttribute("data-minimizada", "sim")
    await expect(criar).toHaveAttribute("data-compacto", "sim")
    await expect
      .poll(async () => (await nav.boundingBox())?.y ?? 0)
      .toBeGreaterThanOrEqual(page.viewportSize()?.height ?? 812)
    await expect(elevado).toHaveCSS("width", "56px")
    await expect(criar.locator('[data-criar="rotulo"]')).toBeHidden()
    await expect(criar).toBeInViewport()

    await rolarOCorpo(page, -300)
    await expect(nav).toHaveAttribute("data-minimizada", "nao")
    await expect(criar).toHaveAttribute("data-compacto", "nao")
    await expect(nav).toBeInViewport()
    await expect(nav.locator('[data-aba="inicio"]')).toBeVisible()
    await expect(elevado).toHaveCSS("width", "58px")
    await expect(criar.locator('[data-criar="rotulo"]')).toBeVisible()

    await rolarOCorpo(page, 300)
    await criar.click()
    await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
    await page.keyboard.press("Escape")
  })
})

test.describe("menu Criar (§4 do inventário)", () => {
  test("abre por sobreposição, com as sete escolhas, e fecha devolvendo o foco", async ({
    page,
  }) => {
    await abrir(page, "/app/inicio")
    await page.locator(SELETOR_CRIAR).click()
    const menu = page.locator(SELETOR_MENU_CRIAR)
    await expect(menu).toBeVisible()
    await expect(menu).toHaveCSS(
      "width",
      (page.viewportSize()?.width ?? 0) >= 1024 ? "620px" : "262px",
    )

    for (const [id, rotulo] of ESCOLHAS_DO_CRIAR) {
      const item = menu.locator(`[data-escolha="${id}"]`)
      await expect(item, id).toHaveCount(1)
      await expect(item, id).toContainText(rotulo)
    }

    await page.keyboard.press("Escape")
    await expect(menu).toHaveCount(0)
    await expect(page.locator(SELETOR_CRIAR)).toBeFocused()
    expect(new URL(page.url()).pathname).toBe("/app/inicio")
  })

  test("o Voltar do sistema fecha o menu antes de trocar de rota", async ({ page }) => {
    await abrir(page, "/app/comunidade")
    await page.locator(SELETOR_CRIAR).click()
    await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()

    await page.goBack()
    await expect(page.locator(SELETOR_MENU_CRIAR)).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe("/app/comunidade")
  })

  test("as setas andam pelas escolhas e o nome acessível é só o rótulo", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await page.locator(SELETOR_CRIAR).click()
    const menu = page.locator(SELETOR_MENU_CRIAR)
    await expect(menu.locator('[data-escolha="ask"]')).toBeFocused()

    await page.keyboard.press("ArrowDown")
    await expect(menu.locator('[data-escolha="create-request"]')).toBeFocused()

    // O ícone é enfeite: o nome acessível do item sem subtítulo é exatamente o
    // rótulo, sem o glifo ("sell Anunciar desapego" falharia aqui). No painel
    // do desktop (§5.4) cada escolha é um `button`; na pilha do celular, um
    // `menuitem`. O papel medido é o que existe no tamanho em teste.
    const largura = page.viewportSize()?.width ?? 0
    const papel: "button" | "menuitem" = largura >= 1024 ? "button" : "menuitem"
    await expect(page.getByRole(papel, { name: "Anunciar desapego", exact: true })).toHaveCount(1)
  })

  test("no desktop o Criar vira painel de duas colunas", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 0
    test.skip(largura < 1024, "o painel é a partir de 1024 px")

    await abrir(page, "/app/inicio")
    await page.locator(SELETOR_CRIAR).click()
    const menu = page.locator(SELETOR_MENU_CRIAR)
    await expect(menu).toHaveAttribute("data-modo", "painel")
    await expect
      .poll(async () =>
        menu
          .locator("[data-lista-de-escolhas]")
          .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length),
      )
      .toBe(2)
    await expect(menu).toContainText("Criar no Bivaque")
    await expect(menu).toContainText("O que você quer publicar ou pedir?")
  })

  test("a tecla C abre o Criar no desktop, fora de campos", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 0
    test.skip(largura < 1024, "o atalho é do desktop")

    await abrir(page, "/app/inicio")
    await page.keyboard.press("c")
    await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.locator(SELETOR_MENU_CRIAR)).toHaveCount(0)
  })
})

test.describe("título grande e dockagem (§6.7)", () => {
  test("abaixo de 720 px o título some sob a barra e volta depois", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 0
    test.skip(largura >= 720, "o efeito só existe abaixo de 720 px")

    await abrir(page, "/app/salvos")
    const barra = page.locator(SELETOR_BARRA)
    await expect(barra).toHaveAttribute("data-docada", "nao")
    const tituloNoTopo = barra.locator('[data-titulo="topo"]')
    await expect(tituloNoTopo).toHaveCSS("opacity", "0")
    await expect(barra).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)")

    await rolarOCorpo(page, 320)
    await expect(barra).toHaveAttribute("data-docada", "sim")
    await expect(tituloNoTopo).toHaveCSS("opacity", "1")
    await expect(tituloNoTopo).toHaveCSS("transform", "none")
    await expect(tituloDaTela(page)).not.toBeInViewport()
    await expect(barra).not.toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)")
    await rolarOCorpo(page, -400)
    await expect(barra).toHaveAttribute("data-docada", "nao")
    await expect(tituloNoTopo).toHaveCSS("opacity", "0")
    await expect(tituloDaTela(page)).toBeInViewport()
    await expect(barra).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)")
  })

  test("na Início o título grande nunca sobe", async ({ page }) => {
    const largura = page.viewportSize()?.width ?? 0
    test.skip(largura >= 720, "o efeito só existe abaixo de 720 px")
    await abrir(page, "/app/inicio")
    await rolarOCorpo(page, 400)
    await expect(page.locator(SELETOR_BARRA)).toHaveAttribute("data-docada", "nao")
    await expect(page.locator(`${SELETOR_BARRA} [data-titulo="topo"]`)).toHaveCSS("opacity", "1")
  })
})
