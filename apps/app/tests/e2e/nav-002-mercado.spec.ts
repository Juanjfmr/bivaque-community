import { expect, type Page, test } from "@playwright/test"

import {
  caminhoAtual,
  conteudo,
  esperarCaminho,
  esperarRolagem,
  rolarAte,
  simularNegocios,
  subAbaAtiva,
  tituloDaTela,
} from "./apoio"
import { aplicarStubMercado } from "./stub-mercado"

/**
 * NAV-002 — um endereço só para o Mercado.
 *
 * O link antigo de imóveis chega ao Mercado na aba Imóveis (em replace, com os
 * filtros da URL); abrir um anúncio e voltar devolve a mesma aba e a mesma
 * posição da lista; trocar de aba reescreve o endereço e o Voltar do navegador
 * sai do Mercado em vez de percorrer as abas.
 *
 * Roda nos três tamanhos da bateria e nos dois temas.
 */

const IMOVEIS = Array.from({ length: 16 }, (_, indice) => ({
  id: `nav-imovel-${indice + 1}`,
  tipo: "property" as const,
  titulo: `Imóvel de prova ${indice + 1}`,
  descricao: "Aluguel com dois quartos perto do centro.",
  precoCents: 200_000 + indice * 10_000,
  deal: "rent",
  bairro: "Centro",
  cidade: "Manaus",
  status: "active",
  condicao: "usado",
  categoria: "aluguel",
  quartos: 2,
  tipoImovel: "apartment",
  areaM2: 60,
  condoFeeCents: null,
  foto: null,
  criadoEm: "2026-11-04T12:00:00Z",
}))

/** Lista de imóveis com altura de sobra e o detalhe de cada cartão. */
async function servirImoveis(page: Page): Promise<void> {
  await aplicarStubMercado(page)
  await page.route(/\/api\/app\/mercado\?[^#]*$/, async (rota) => {
    const tipo = new URL(rota.request().url()).searchParams.get("tipo")
    if (tipo !== "property") return rota.continue()
    await rota.fulfill({
      json: {
        cidade: "Manaus",
        proximo: null,
        anuncios: IMOVEIS.map((anuncio) => ({ ...anuncio, salvo: false })),
      },
    })
  })
  await page.route(/\/api\/app\/mercado\/nav-imovel-\d+(?:\?[^#]*)?$/, async (rota) => {
    const id = new URL(rota.request().url()).pathname.split("/").at(-1) ?? ""
    const anuncio = IMOVEIS.find((item) => item.id === id)
    if (anuncio === undefined) return rota.continue()
    await rota.fulfill({
      json: {
        anuncio: { ...anuncio, endereco: null, donoNome: "Maria Silva", fotos: [], meu: false },
      },
    })
  })
}

/** Um cartão atravessado pelo meio da janela: o clique não rola a lista. */
async function pontoNoMeioDaLista(page: Page): Promise<{ x: number; y: number }> {
  const ponto = await page.evaluate(() => {
    const meio = window.innerHeight / 2
    const cartao = [
      ...document.querySelectorAll('[data-tela="imoveis"] [data-cartao="anuncio"]'),
    ].find((item) => {
      const caixa = item.getBoundingClientRect()
      return caixa.top <= meio && caixa.bottom >= meio
    })
    if (!cartao) return null
    const caixa = cartao.getBoundingClientRect()
    return { x: caixa.left + caixa.width / 2, y: meio }
  })
  expect(ponto).not.toBeNull()
  return ponto ?? { x: 0, y: 0 }
}

for (const tema of ["light", "dark"] as const) {
  test.describe(`Mercado num endereço só — ${tema}`, () => {
    test.use({ colorScheme: tema })

    test("o link antigo de imóveis abre o Mercado na aba Imóveis, com o filtro da URL", async ({
      page,
    }) => {
      await servirImoveis(page)
      await page.goto("/app/imoveis?quartos=2")

      await expect(
        page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]').first(),
      ).toBeVisible()
      const endereco = new URL(page.url())
      expect(endereco.pathname).toBe("/app/mercado")
      expect(endereco.searchParams.get("aba")).toBe("imoveis")
      expect(endereco.searchParams.get("quartos")).toBe("2")
      await expect(subAbaAtiva(page)).toHaveAttribute("data-subaba", "imoveis")
      await expect(tituloDaTela(page)).toHaveText("Imóveis")
    })

    test("abrir um anúncio e voltar devolve a aba Imóveis e a posição da lista", async ({
      page,
    }) => {
      await servirImoveis(page)
      await page.goto("/app/imoveis")
      await expect(
        page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]').first(),
      ).toBeVisible()

      // Uma posição no meio da lista: perto do fim, a diferença de um pixel de
      // layout na volta encostaria no limite do conteúdo.
      await rolarAte(page, 600)
      const posicao = await conteudo(page).evaluate((elemento) => elemento.scrollTop)
      expect(posicao).toBeGreaterThan(0)

      const ponto = await pontoNoMeioDaLista(page)
      await page.mouse.click(ponto.x, ponto.y)
      await expect.poll(() => caminhoAtual(page)).toMatch(/^\/app\/anuncio\/nav-imovel-\d+$/)

      await page.goBack()
      await esperarCaminho(page, "/app/mercado")
      await expect(page.locator('[data-tela="imoveis"]')).toBeVisible()
      await expect(subAbaAtiva(page)).toHaveAttribute("data-subaba", "imoveis")
      expect(new URL(page.url()).searchParams.get("aba")).toBe("imoveis")
      await esperarRolagem(page, posicao)
    })

    test("trocar de aba não empilha histórico: o Voltar sai do Mercado", async ({ page }) => {
      await servirImoveis(page)
      await page.goto("/app/inicio")
      await page.locator('[data-acao="atalho"]', { hasText: "Imóveis" }).click()
      await expect(page).toHaveURL(/\/app\/mercado\?aba=imoveis$/)
      await expect(subAbaAtiva(page)).toHaveAttribute("data-subaba", "imoveis")

      await page.locator('[data-subaba="desapegos"]').click()
      await expect(page).toHaveURL(/\/app\/mercado\?aba=desapegos$/)
      await expect(subAbaAtiva(page)).toHaveAttribute("data-subaba", "desapegos")

      // O Voltar do navegador volta para o Início: a troca de aba foi replace.
      await page.goBack()
      await esperarCaminho(page, "/app/inicio")
    })

    test("a aba Negócios abre o Mercado da cidade no mesmo endereço", async ({ page }) => {
      await servirImoveis(page)
      await simularNegocios(page)
      await page.goto("/app/mercado?aba=negocios")
      await expect(page.locator('[data-tela="negocios"]')).toBeVisible()
      await expect(tituloDaTela(page)).toHaveText("Mercado da cidade")
      await expect(subAbaAtiva(page)).toHaveAttribute("data-subaba", "negocios")

      // Voltar para Desapegos reescreve o endereço em replace, sem ciclo.
      await page.locator('[data-subaba="desapegos"]').click()
      await expect(page).toHaveURL(/\/app\/mercado\?aba=desapegos$/)
      await expect(page.locator('[data-tela="desapegos"]')).toBeVisible()
    })
  })
}
