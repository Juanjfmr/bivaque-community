import { expect, test } from "@playwright/test"

import {
  capturar,
  contrasteDe,
  simularMercadoIndisponivel,
  simularNegociosDaLista,
} from "./f07-lista-ajuda"

/**
 * RUN-141 — lista de negócios com nome próprio, navegação e cadastro honesto.
 *
 * Mede a tela real (sem modo de prova), com HTTP controlado: o que a pessoa vê,
 * o que o aparelho calcula e o endereço para onde cada controle leva.
 */
const TAMANHOS = ["mobile-375", "tablet-768", "desktop-1440"] as const

const segmento = (id: string) => `[data-segmentos="mercado"] [data-secao="${id}"]`

for (const tema of ["light", "dark"] as const) {
  test.describe(`F07 lista de negócios — ${tema}`, () => {
    test.use({ colorScheme: tema })

    test("página com nome próprio, segmentos sem totais e aba legível", async ({ page }, info) => {
      test.skip(!TAMANHOS.includes(info.project.name as (typeof TAMANHOS)[number]), "três larguras")
      await simularNegociosDaLista(page)
      await page.goto("/app/negocios")

      // O nome da página não repete o de nenhuma aba.
      const titulo = page.locator("h1[data-titulo-da-tela]")
      await expect(titulo).toHaveText("Mercado da cidade")
      for (const aba of ["Desapegos", "Imóveis", "Negócios"]) {
        await expect(titulo).not.toHaveText(aba)
      }

      // Os segmentos navegam, sem comparar páginas parciais como totais.
      const secoes = page.locator('[data-segmentos="mercado"] [data-secao]')
      await expect(secoes).toHaveCount(3)
      await expect(page.locator(segmento("negocios"))).toHaveAttribute("aria-current", "page")
      await expect(page.locator(segmento("desapegos"))).not.toHaveAttribute("aria-current", "page")
      await expect(page.locator('[data-segmentos="mercado"] [data-contagem]')).toHaveCount(0)

      // A aba ativa passa AA nos dois temas — medido no que o navegador pintou.
      expect(await contrasteDe(page, segmento("negocios"))).toBeGreaterThanOrEqual(4.5)
      await expect(page.locator('[data-cartao="negocio"]')).toHaveCount(2)
      await capturar(page, `${info.project.name}-${tema}-01-lista`)

      await expect(page.getByLabel("Ordenar por")).toHaveCount(0)

      // O segmento leva ao endereço da seção, não a um filtro escondido.
      await page.locator(segmento("imoveis")).click()
      await expect(page).toHaveURL(/\/app\/imoveis$/)
    })

    test("vazio e 'Divulgar meu negócio' abrem o mesmo caminho de cadastro", async ({
      page,
    }, info) => {
      test.skip(!TAMANHOS.includes(info.project.name as (typeof TAMANHOS)[number]), "três larguras")
      await simularNegociosDaLista(page, {
        negocios: { negocios: [], categorias: [], cidade: "Manaus", proximo: null },
      })
      await page.goto("/app/negocios")

      const vazio = page.locator('[data-estado="vazio"]')
      await expect(vazio).toContainText("Ainda sem negócios cadastrados")
      await capturar(page, `${info.project.name}-${tema}-03-vazio`)

      // O botão do vazio e o do topo abrem o menu Criar, o caminho real.
      const menu = page.locator('[data-sobreposicao="menu-criar"]')
      await vazio.getByRole("button", { name: "Divulgar meu negócio", exact: true }).click()
      await expect(menu).toHaveCount(1)
      await expect(menu).toBeVisible()
      await expect(menu.locator('[data-escolha="my-biz"]')).toHaveAttribute(
        "aria-label",
        "Divulgar meu negócio",
      )
      await capturar(page, `${info.project.name}-${tema}-04-menu-criar`)
      await page.keyboard.press("Escape")
      await expect(menu).toHaveCount(0)

      await page.locator('button[data-acao="anunciar-negocio"]').click()
      await expect(menu).toHaveCount(1)
    })

    test("seção irmã fora do ar não vira contagem inventada", async ({ page }, info) => {
      test.skip(!TAMANHOS.includes(info.project.name as (typeof TAMANHOS)[number]), "três larguras")
      await simularMercadoIndisponivel(page)
      await page.goto("/app/negocios")

      await expect(page.locator('[data-cartao="negocio"]')).toHaveCount(2)
      await expect(page.locator(`${segmento("negocios")} [data-contagem]`)).toHaveCount(0)
      await expect(page.locator(`${segmento("desapegos")} [data-contagem]`)).toHaveCount(0)
      await expect(page.locator(`${segmento("imoveis")} [data-contagem]`)).toHaveCount(0)
      await capturar(page, `${info.project.name}-${tema}-05-secao-sem-numero`)
    })
  })
}
