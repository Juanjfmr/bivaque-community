import { expect, test } from "@playwright/test"

import { simularInicio } from "./inicio-ajuda"
import {
  CAMPO_DO_INICIO,
  larguraDaProva,
  ouvirBusca,
  simularCidadeVazia,
} from "./inicio-busca-ajuda"

/**
 * RUN-139 — primeira entrada do Início e da Busca, campo "Buscar em [cidade]"
 * e a navegação até 1024 px.
 *
 * O que se prova, na tela real:
 *
 * - o campo aparece em 375, 768 e 1440, nos dois temas, com o pseudo-texto da
 *   cidade; enviar o termo abre `/app/busca?q=<termo>`, dispara a consulta e
 *   mostra o resultado;
 * - termo vazio (e um caractere só) não navega: a tela fica onde está;
 * - sem conteúdo, Início e Busca dizem o que falta e oferecem o caminho que
 *   resolve, sem conteúdo inventado;
 * - as buscas recentes só existem depois de uma busca de verdade;
 * - até 1024 px a navegação é a barra de baixo, com rótulo inteiro; no 1440 é
 *   a coluna da esquerda, e o feed fica numa coluna de leitura ao lado do
 *   trilho de contexto.
 *
 * Roda só nos três tamanhos provados (mobile-375, tablet-768, desktop-1440);
 * as outras larguras medem o mesmo desenho.
 */

const TERMO = "berço"
const RESULTADO = "Berço com colchão"

test.beforeEach(() => {
  test.skip(larguraDaProva(test.info().project.name) === null, "provado em 375, 768 e 1440")
})

test.describe("campo 'Buscar em [cidade]'", () => {
  for (const tema of ["light", "dark"] as const) {
    test(`aparece e leva o termo ao resultado (tema ${tema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema })
      await simularInicio(page)
      const pedidos = ouvirBusca(page)
      await page.goto("/app/inicio")

      const campo = page.locator(CAMPO_DO_INICIO).first()
      await expect(campo).toBeVisible()
      await expect(campo).toHaveAttribute("placeholder", "Buscar em Manaus")
      const area = await campo.boundingBox()
      expect(area).not.toBeNull()
      if (area) expect(area.height).toBeGreaterThanOrEqual(44)

      await campo.fill(TERMO)
      await campo.press("Enter")

      await expect(page).toHaveURL(/\/app\/busca\?q=/)
      await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(TERMO)
      await expect(page.getByText(RESULTADO, { exact: true })).toBeVisible()
      await expect
        .poll(() => pedidos.busca().some((url) => new URL(url).searchParams.get("q") === TERMO))
        .toBe(true)
    })
  }

  test("termo vazio não navega e não pede a rota de busca", async ({ page }) => {
    await simularInicio(page)
    const pedidos = ouvirBusca(page)
    await page.goto("/app/inicio")

    const campo = page.locator(CAMPO_DO_INICIO).first()
    await expect(campo).toBeVisible()
    await campo.fill("   ")
    await campo.press("Enter")

    await expect(page).toHaveURL(/\/app\/inicio$/)
    expect(pedidos.busca()).toHaveLength(0)
    await expect(campo).toBeFocused()
  })

  test("um caractere só avisa em vez de abrir uma busca que a rota recusaria", async ({ page }) => {
    await simularInicio(page)
    const pedidos = ouvirBusca(page)
    await page.goto("/app/inicio")

    const campo = page.locator(CAMPO_DO_INICIO).first()
    await campo.fill("a")
    await campo.press("Enter")

    await expect(page).toHaveURL(/\/app\/inicio$/)
    await expect(page.getByRole("alert")).toContainText("ao menos duas letras")
    expect(pedidos.busca()).toHaveLength(0)
  })

  test("o atalho ao lado continua abrindo a busca vazia", async ({ page }) => {
    await simularInicio(page)
    await page.goto("/app/inicio")

    await page.locator('[data-acao="busca"]').first().click()
    await expect(page).toHaveURL(/\/app\/busca$/)
    await expect(page.locator('[data-tela="busca"]')).toBeVisible()
  })
})

test.describe("estado de primeira entrada", () => {
  for (const tema of ["light", "dark"] as const) {
    test(`Início sem conteúdo diz o que falta e como resolver (tema ${tema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema })
      await simularCidadeVazia(page)
      await page.goto("/app/inicio")

      await expect(
        page.getByRole("heading", { name: "A primeira publicação abre a cidade" }),
      ).toBeVisible()
      await expect(page.getByRole("button", { name: "Publicar na cidade" })).toBeVisible()
      await expect(page.locator('[data-tela="inicio"] [data-cartao]')).toHaveCount(0)
      await expect(page.getByText(/\d+ (negócio|negócios)/)).toHaveCount(0)
    })
  }

  test("Busca sem termo mostra o que existe na cidade e o caminho que resolve", async ({
    page,
  }) => {
    await simularInicio(page)
    await page.goto("/app/busca")

    await expect(page.locator('[data-busca="primeira-entrada"]')).toContainText(
      "O que você precisa em Manaus?",
    )
    await expect(page.locator('[data-explorar="categorias"]')).toBeVisible()
    await expect(page.locator('[data-busca="resumo-da-cidade"]')).toContainText("6 negócios")
    await expect(page.getByRole("button", { name: "Abrir o Criar" })).toBeVisible()
    // Sem busca de verdade, não existe "recente".
    await expect(page.getByText("Buscas recentes")).toHaveCount(0)
  })

  test("Busca sem termo e cidade vazia não inventa conteúdo", async ({ page }) => {
    await simularCidadeVazia(page)
    await page.goto("/app/busca")

    await expect(page.getByRole("heading", { name: "Nada publicado por aqui ainda" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Publicar na cidade" })).toBeVisible()
    await expect(page.locator('[data-explorar="categorias"]')).toHaveCount(0)
  })

  test("a busca recente aparece só depois de uma busca de verdade", async ({ page }) => {
    await simularInicio(page)
    await page.goto("/app/inicio")

    const campo = page.locator(CAMPO_DO_INICIO).first()
    await campo.fill(TERMO)
    await campo.press("Enter")
    await expect(page.getByText(RESULTADO, { exact: true })).toBeVisible()

    // Entrada nova, sem termo no campo: a recente vem do aparelho, não da sessão.
    await page.goto("/app/busca")
    const recentes = page.getByText("Buscas recentes")
    await expect(recentes).toBeVisible()
    await page
      .getByRole("button", { name: new RegExp(`^${TERMO}$`, "i") })
      .first()
      .click()
    await expect(page.getByText(RESULTADO, { exact: true })).toBeVisible()
  })
})

test.describe("navegação e coluna de leitura", () => {
  test("a navegação é a barra de baixo até 1024 e nenhum rótulo quebra", async ({ page }) => {
    await simularInicio(page)
    await page.goto("/app/inicio")
    const largura = page.viewportSize()?.width ?? 0
    const nav = page.locator('[data-nav="principal"]')
    await expect(nav).toBeVisible()

    const geometria = await nav.evaluate((elemento) => {
      const area = elemento.getBoundingClientRect()
      const itens = [
        ...elemento.querySelectorAll<HTMLElement>("[data-aba], [data-acao='criar']"),
      ].map((item) => {
        const rotulo = item.lastElementChild as HTMLElement
        return {
          texto: rotulo.textContent?.trim() ?? "",
          largura: rotulo.clientWidth,
          conteudo: rotulo.scrollWidth,
          altura: rotulo.getBoundingClientRect().height,
        }
      })
      return {
        topo: area.top,
        esquerda: area.left,
        largura: area.width,
        posicao: getComputedStyle(elemento).position,
        itens,
      }
    })

    expect(geometria.itens).toHaveLength(5)
    for (const item of geometria.itens) {
      expect(item.conteudo).toBeLessThanOrEqual(item.largura + 1)
      // 12 px sobre 16 de linha: duas linhas passariam de 30.
      expect(item.altura).toBeLessThanOrEqual(22)
    }

    if (largura < 1024) {
      expect(geometria.posicao).toBe("fixed")
      expect(geometria.topo).toBeGreaterThan((page.viewportSize()?.height ?? 0) / 2)
      expect(geometria.largura).toBeCloseTo(largura, 0)
      expect(geometria.itens.map((item) => item.texto)).toContain("Comunidade")
    } else {
      expect(geometria.esquerda).toBeLessThan(1)
      expect(geometria.largura).toBeGreaterThanOrEqual(80)
      expect(geometria.largura).toBeLessThanOrEqual(120)
    }
  })

  test("no 1440 o feed fica numa coluna de leitura ao lado do contexto", async ({ page }) => {
    test.skip(
      test.info().project.name !== "desktop-1440",
      "o desktop é o único tamanho com trilho de contexto",
    )
    await simularInicio(page)
    await page.goto("/app/inicio")

    const leitura = page.locator('[data-home="leitura"]')
    const contexto = page.locator('[data-home="contexto"]')
    await expect(leitura).toBeVisible()
    await expect(contexto).toBeVisible()

    const medida = await leitura.evaluate((elemento) => {
      const area = elemento.getBoundingClientRect()
      return { largura: area.width, direita: area.right }
    })
    const trilho = await contexto.evaluate((elemento) => {
      const area = elemento.getBoundingClientRect()
      return { esquerda: area.left, largura: area.width }
    })

    expect(medida.largura).toBeLessThanOrEqual(642)
    expect(trilho.esquerda).toBeGreaterThanOrEqual(medida.direita)
    expect(trilho.largura).toBeGreaterThanOrEqual(280)
  })

  test("cada publicação da comunidade é cartão, com autor, lugar e ações", async ({ page }) => {
    await simularInicio(page)
    await page.goto("/app/inicio")

    const cartao = page
      .locator('[data-cartao="publicacao"]')
      .filter({ hasText: "Pediatra" })
      .first()
    await expect(cartao).toBeVisible()
    await expect(cartao).toContainText("Alguém da cidade")
    await expect(cartao).toContainText("Manaus")
    await expect(cartao).toContainText("Pediatra")
    await expect(cartao.getByRole("button", { name: /resposta|Responder/ })).toBeVisible()
    await expect(cartao.getByRole("button", { name: /Salvar|Salva/ })).toBeVisible()
  })
})
