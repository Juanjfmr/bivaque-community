import { expect, test } from "@playwright/test"

import {
  capturar,
  contrasteDe,
  simularMercadoIndisponivel,
  simularNegociosDaLista,
} from "./f07-lista-ajuda"

/**
 * RUN-141 — a lista de negócios: nome de página próprio, segmentos com
 * contagem, ordem e vazio no mesmo caminho de cadastro.
 *
 * Mede a tela real (sem modo de prova), com HTTP controlado: o que a pessoa vê,
 * o que o aparelho calcula e o endereço para onde cada controle leva.
 */
const TAMANHOS = ["mobile-375", "tablet-768", "desktop-1440"] as const

const segmento = (id: string) => `[data-segmentos="mercado"] [data-secao="${id}"]`

for (const tema of ["light", "dark"] as const) {
  test.describe(`F07 lista de negócios — ${tema}`, () => {
    test.use({ colorScheme: tema })

    test("página com nome próprio, segmentos contados, ordem e aba legível", async ({
      page,
    }, info) => {
      test.skip(!TAMANHOS.includes(info.project.name as (typeof TAMANHOS)[number]), "três larguras")
      await simularNegociosDaLista(page)
      await page.goto("/app/negocios")

      // O nome da página não repete o de nenhuma aba.
      const titulo = page.locator("h1[data-titulo-da-tela]")
      await expect(titulo).toHaveText("Mercado da cidade")
      for (const aba of ["Desapegos", "Imóveis", "Negócios"]) {
        await expect(titulo).not.toHaveText(aba)
      }

      // As abas são segmentos que navegam, com a contagem que a lista entrega.
      const secoes = page.locator('[data-segmentos="mercado"] [data-secao]')
      await expect(secoes).toHaveCount(3)
      await expect(page.locator(segmento("negocios"))).toHaveAttribute("aria-current", "page")
      await expect(page.locator(segmento("desapegos"))).not.toHaveAttribute("aria-current", "page")
      await expect(page.locator(`${segmento("desapegos")} [data-contagem]`)).toHaveText("3")
      await expect(page.locator(`${segmento("imoveis")} [data-contagem]`)).toHaveText("1+")
      await expect(page.locator(`${segmento("negocios")} [data-contagem]`)).toHaveText("2")

      // A aba ativa passa AA nos dois temas — medido no que o navegador pintou.
      expect(await contrasteDe(page, segmento("negocios"))).toBeGreaterThanOrEqual(4.5)
      await expect(page.locator('[data-cartao="negocio"]')).toHaveCount(2)
      await capturar(page, `${info.project.name}-${tema}-01-lista`)

      // Ordem por teclado: "Mais próximos" sem origem de localização cai para
      // a ordem da lista e diz por quê, sem mexer no que está desenhado.
      const ordem = page.getByLabel("Ordenar por")
      await expect(ordem).toHaveText("Mais recentes")
      const nomes = () =>
        page
          .locator('[data-cartao="negocio"] h3')
          .evaluateAll((cartoes) => cartoes.map((cartao) => cartao.textContent))
      const antes = await nomes()
      await ordem.focus()
      await page.keyboard.press("Enter")
      await page.keyboard.press("ArrowDown")
      await page.keyboard.press("Enter")
      await expect(ordem).toHaveText("Mais próximos")
      const aviso = page.locator('[data-aviso="ordem"]')
      await expect(aviso).toBeVisible()
      await expect(aviso).toContainText("Ainda não sabemos onde você está")
      expect(await nomes()).toEqual(antes)
      await capturar(page, `${info.project.name}-${tema}-02-ordem-sem-origem`)

      await ordem.focus()
      await page.keyboard.press("Enter")
      await page.keyboard.press("ArrowUp")
      await page.keyboard.press("Enter")
      await expect(ordem).toHaveText("Mais recentes")
      await expect(aviso).toHaveCount(0)

      // O segmento leva ao endereço da seção, não a um filtro escondido.
      await page.locator(segmento("imoveis")).click()
      await expect(page).toHaveURL(/\/app\/imoveis$/)
    })

    test("vazio e 'Anunciar negócio' abrem o mesmo caminho de cadastro", async ({ page }, info) => {
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
      await vazio.getByRole("button", { name: "Anunciar negócio", exact: true }).click()
      await expect(menu).toHaveCount(1)
      await expect(menu).toBeVisible()
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
      await expect(page.locator(`${segmento("negocios")} [data-contagem]`)).toHaveText("2")
      await expect(page.locator(`${segmento("desapegos")} [data-contagem]`)).toHaveCount(0)
      await expect(page.locator(`${segmento("imoveis")} [data-contagem]`)).toHaveCount(0)
      await capturar(page, `${info.project.name}-${tema}-05-secao-sem-numero`)
    })
  })
}
