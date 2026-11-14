import type { Page } from "@playwright/test"
// A tela real do Guia: o `test` de `apoio.ts` liga o modo de prova, que troca a
// rota pela tela de prova. Este spec usa o `test` puro, como os de tela real.
import { expect, test } from "@playwright/test"
import { abrir, caminhoAtual, GUIA_DA_PROVA, SELETOR_CONTEUDO, simularProgresso } from "./apoio"

/**
 * LT-006 — o link `/guide?q=<termo>&categoria=<cat>` cai no Guia do app
 * (`/app/guia?q=…&categoria=…`) e a tela abre já com o termo no campo, a
 * categoria no chip e a lista filtrada. O que se prova:
 *
 * - o aterrissagem em 375, 768 e 1440, nos dois temas: campo com o termo, chip
 *   da categoria aceso, só a referência que bate com o recorte, sem estado vazio
 *   nem erro, e q/categoria ainda no endereço depois da materialização da
 *   entrada — o endereço é compartilhável e o Voltar devolve o recorte;
 * - `/app/guia` sem recorte abre o Guia inteiro, como um link nenhum;
 * - categoria fora da lista, termo vazio ou acima do limite que o servidor aceita
 *   abrem o Guia inteiro, sem erro cru e sem pedir à rota o que ela recusaria;
 * - digitar vence o termo de origem e tocar o chip vence a categoria de origem.
 *
 * O app é servido em http://127.0.0.1:3200 (playwright.config.ts) e a rota do
 * guia responde pelo fixture daqui, que filtra como o servidor e recusa o que ele
 * recusaria (400) — não pelo banco. O aterrissagem roda só nos projetos
 * mobile-375, tablet-768 e desktop-1440: as outras larguras medem o mesmo
 * desenho e não repetem a prova.
 */

const TELA = '[data-tela="guia"]'
const CAMPO = "Buscar no guia"
const HOSPITAL = "Hospital Universitário Getúlio Vargas"
const ESCOLA = "Escola Municipal Rio Negro"
const TERMO_DA_PROVA = "hospital"
const LARGURAS_DO_ATERRIZAGEM = "mobile-375|tablet-768|desktop-1440"
const LARGURA_UNICA = "desktop-1440"

/** O projeto do Playwright que está rodando (mobile-375, tablet-768, …). */
function projetoAtual(): string {
  return test.info().project.name
}

function chip(page: Page, id: string) {
  return page.locator(`[data-chip="${id}"]`)
}

function linha(page: Page, nome: string) {
  return page.locator(`${TELA} [data-linha="lista"]`, { hasText: nome })
}

/**
 * A rota do guia responde o fixture filtrado pelo recorte pedido. O que o
 * servidor recusaria — termo acima de 80 ou categoria fora da lista — volta
 * 400: se a tela pedisse o que o endereço não aceita, o estado de erro
 * apareceria.
 */
async function simularGuiaFiltrado(page: Page): Promise<void> {
  await page.route(/\/api\/app\/guia(?:\?|$)/, async (rota) => {
    const parametros = new URL(rota.request().url()).searchParams
    const termo = (parametros.get("q") ?? "").trim().toLocaleLowerCase("pt-BR")
    const categoria = parametros.get("categoria")
    if (
      termo.length > 80 ||
      (categoria !== null && !GUIA_DA_PROVA.entradas.some((e) => e.categoria === categoria))
    ) {
      await rota.fulfill({ status: 400, json: { erro: "corpo-invalido" } })
      return
    }
    const entradas = GUIA_DA_PROVA.entradas.filter(
      (entrada) =>
        (categoria === null || entrada.categoria === categoria) &&
        (termo === "" || entrada.nome.toLocaleLowerCase("pt-BR").includes(termo)),
    )
    await rota.fulfill({ json: { ...GUIA_DA_PROVA, entradas, proximo: null } })
  })
}

/** Espera a entrada materializar: só então o endereço diz o que ficou guardado. */
async function materializada(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.history.state?.bivaqueEntrada?.versao ?? 0))
    .toBe(1)
}

test.describe("aterrissagem com o recorte no endereço", () => {
  test.beforeEach(() => {
    test.skip(
      !new RegExp(`^(?:${LARGURAS_DO_ATERRIZAGEM})$`).test(projetoAtual()),
      "o aterrissagem é provado em 375, 768 e 1440",
    )
  })

  for (const tema of ["light", "dark"] as const) {
    test(`abre com o termo no campo, a categoria no chip e a lista filtrada (tema ${tema})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: tema })
      await simularProgresso(page)
      await simularGuiaFiltrado(page)

      await page.goto(`/app/guia?q=${TERMO_DA_PROVA}&categoria=hospital`)
      await materializada(page)

      // O recorte sobrevive à materialização: o endereço continua compartilhável.
      const endereco = new URL(page.url())
      expect(endereco.pathname).toBe("/app/guia")
      expect(endereco.searchParams.get("q")).toBe(TERMO_DA_PROVA)
      expect(endereco.searchParams.get("categoria")).toBe("hospital")

      await expect(page.locator(TELA)).toBeVisible()
      await expect(page.getByLabel(CAMPO)).toHaveValue(TERMO_DA_PROVA)
      await expect(chip(page, "hospital")).toHaveAttribute("data-estado", "on")
      await expect(linha(page, HOSPITAL)).toBeVisible()
      await expect(linha(page, ESCOLA)).toHaveCount(0)
      await expect(page.getByText("Nada com esse filtro")).toHaveCount(0)
      await expect(page.locator(SELETOR_CONTEUDO)).not.toContainText("Não foi possível")
    })
  }
})

test.describe("o que o link não pode quebrar", () => {
  test("sem recorte abre o Guia inteiro", async ({ page }) => {
    await simularProgresso(page)
    await simularGuiaFiltrado(page)

    await abrir(page, "/app/guia")
    await materializada(page)

    expect(await caminhoAtual(page)).toBe("/app/guia")
    await expect(page.getByLabel(CAMPO)).toHaveValue("")
    await expect(chip(page, "todas")).toHaveAttribute("data-estado", "on")
    await expect(linha(page, HOSPITAL)).toBeVisible()
    await expect(linha(page, ESCOLA)).toBeVisible()
  })

  for (const [caso, caminho] of [
    ["categoria fora da lista", "/app/guia?categoria=banco"],
    ["termo vazio", "/app/guia?q="],
    ["só espaços", "/app/guia?q=%20%20%20"],
    ["acima do limite do servidor", `/app/guia?q=${"i".repeat(81)}`],
  ] as const) {
    test(`${caso} abre o Guia inteiro, sem erro`, async ({ page }) => {
      await simularProgresso(page)
      await simularGuiaFiltrado(page)

      await abrir(page, caminho)
      await materializada(page)

      expect(await caminhoAtual(page)).toBe("/app/guia")
      await expect(page.getByLabel(CAMPO)).toHaveValue("")
      await expect(chip(page, "todas")).toHaveAttribute("data-estado", "on")
      await expect(linha(page, HOSPITAL)).toBeVisible()
      await expect(linha(page, ESCOLA)).toBeVisible()
      await expect(page.locator(SELETOR_CONTEUDO)).not.toContainText("Não foi possível")
    })
  }
})

test.describe("o filtro manual vence o recorte do link", () => {
  test.beforeEach(() => {
    test.skip(projetoAtual() !== LARGURA_UNICA, "o filtro manual é provado uma vez, em 1440")
  })

  test("digitar outro termo troca a lista e não volta ao termo do link", async ({ page }) => {
    await simularProgresso(page)
    await simularGuiaFiltrado(page)
    await page.goto(`/app/guia?q=${TERMO_DA_PROVA}`)
    await expect(linha(page, HOSPITAL)).toBeVisible()

    await page.getByLabel(CAMPO).fill("rio negro")

    await expect(page.getByLabel(CAMPO)).toHaveValue("rio negro")
    await expect(linha(page, ESCOLA)).toBeVisible()
    // O resultado do link não volta a aparecer depois da digitação.
    await expect(linha(page, HOSPITAL)).toHaveCount(0)
  })

  test("tocar outro chip troca a categoria e não volta à do link", async ({ page }) => {
    await simularProgresso(page)
    await simularGuiaFiltrado(page)
    await page.goto("/app/guia?categoria=hospital")
    await expect(linha(page, HOSPITAL)).toBeVisible()

    await chip(page, "school").click()

    await expect(chip(page, "school")).toHaveAttribute("data-estado", "on")
    await expect(linha(page, ESCOLA)).toBeVisible()
    await expect(linha(page, HOSPITAL)).toHaveCount(0)
  })
})
