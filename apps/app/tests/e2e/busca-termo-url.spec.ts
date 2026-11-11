import type { Page } from "@playwright/test"
import {
  abrir,
  CIDADE_DA_BUSCA,
  caminhoAtual,
  expect,
  SELETOR_CONTEUDO,
  simularBuscaDaProva,
  TERMO_DA_PROVA,
  TERMO_SEM_ACHADO,
  test,
} from "./apoio"

/**
 * LT-001 — o link antigo `/explorar/busca?q=<termo>` cai na busca do app e a
 * tela abre já com o termo no campo e a lista filtrada. O que se prova:
 *
 * - o aterrissagem em 375, 768 e 1440: campo com o termo, contagem e um
 *   resultado de cada tipo, sem estado vazio nem grade "Explorar" no caminho;
 * - o primeiro pedido à rota já é a consulta, com o termo do endereço;
 * - termo vazio, só espaços, um caractere ou acima do limite que o servidor
 *   aceita abre o estado vazio honesto, sem erro cru e sem pedir à rota um
 *   termo que ela recusaria;
 * - `/app/busca` sem `q` é o estado vazio, sem resultado herdado de ninguém;
 * - depois de chegar pelo link, digitar vence o `q` de origem, e limpar volta
 *   ao estado sem termo.
 *
 * O app é servido em http://127.0.0.1:3200 (playwright.config.ts) e as rotas de
 * dado respondem pelo fixture de `apoio.ts`, não pelo banco. O aterrissagem roda
 * só nos projetos mobile-375, tablet-768 e desktop-1440: as outras larguras
 * medem o mesmo desenho e não repetem a prova.
 */

const CAMPO = '[data-campo="busca"]'
const CHIP_DO_ESCOPO = '[data-chip="all"]'
const GRADE_EXPLORAR = '[data-explorar="categorias"]'
const LARGURAS_DO_ATERRIZAGEM = "mobile-375|tablet-768|desktop-1440"
const LARGURA_UNICA = "desktop-1440"

function campoDaBusca(page: Page) {
  return page.locator(CAMPO)
}

/** O projeto do Playwright que está rodando (mobile-375, tablet-768, …). */
function projetoAtual(): string {
  return test.info().project.name
}

/** Os pedidos à rota de busca que a página fez até agora. */
function ouvirBusca(page: Page): string[] {
  const pedidos: string[] = []
  page.on("request", (pedido) => {
    if (new URL(pedido.url()).pathname === "/api/app/busca") pedidos.push(pedido.url())
  })
  return pedidos
}

test.describe("aterrissagem com o termo no endereço", () => {
  test.beforeEach(() => {
    test.skip(
      !new RegExp(`^(?:${LARGURAS_DO_ATERRIZAGEM})$`).test(projetoAtual()),
      "o aterrissagem é provado em 375, 768 e 1440",
    )
  })

  test("abre com o termo no campo, a contagem e um resultado de cada tipo", async ({ page }) => {
    await simularBuscaDaProva(page)
    await page.goto(`/app/busca?q=${TERMO_DA_PROVA}`)

    // O primeiro render útil já tem o termo no campo e a consulta resolvida:
    // nada de estado vazio entre a chegada e o resultado.
    await expect(campoDaBusca(page)).toHaveValue(TERMO_DA_PROVA)
    await expect(page.getByText(`5 resultados em ${CIDADE_DA_BUSCA}`)).toBeVisible()

    for (const texto of [
      "Moto 150cc seminova do Ipiranga",
      "Oficina Ipiranga",
      "Alguém indica mecânico perto da avenida Ipiranga?",
      "Vizinhos do Ipiranga",
      "Serviços e escolas do Ipiranga",
    ]) {
      await expect(page.getByText(texto, { exact: true })).toBeVisible()
    }

    // O desenho com termo não tem vazio de consulta nem grade "Explorar", e o
    // escopo continua em "Tudo".
    await expect(page.getByText(/^Nada sobre/)).toHaveCount(0)
    await expect(page.locator(GRADE_EXPLORAR)).toHaveCount(0)
    await expect(page.locator(CHIP_DO_ESCOPO)).toHaveAttribute("data-estado", "on")
  })

  test("o primeiro pedido à rota já é a consulta, com o termo do endereço", async ({ page }) => {
    await simularBuscaDaProva(page)
    const pedidos = ouvirBusca(page)

    await page.goto(`/app/busca?q=${TERMO_DA_PROVA}`)
    await expect(page.getByText(`5 resultados em ${CIDADE_DA_BUSCA}`)).toBeVisible()

    expect(pedidos).toHaveLength(1)
    expect(new URL(pedidos[0] ?? "").searchParams.get("q")).toBe(TERMO_DA_PROVA)
  })
})

test.describe("o que o link não pode quebrar", () => {
  for (const [caso, caminho] of [
    ["sem termo", "/app/busca"],
    ["termo vazio", "/app/busca?q="],
    ["só espaços", "/app/busca?q=%20%20%20"],
    ["um caractere", "/app/busca?q=a"],
    ["acima do limite do servidor", `/app/busca?q=${"i".repeat(101)}`],
  ] as const) {
    test(`${caso} abre o estado sem termo, sem erro`, async ({ page }) => {
      await simularBuscaDaProva(page)
      const pedidos = ouvirBusca(page)

      await abrir(page, caminho)

      await expect(page.locator('[data-tela="busca"]')).toBeVisible()
      await expect(campoDaBusca(page)).toHaveValue("")
      // O estado sem termo é a grade "Explorar", não um vazio de consulta.
      await expect(page.locator(GRADE_EXPLORAR)).toBeVisible()
      await expect(page.locator('[data-tela="busca"]')).toContainText("Explorar em")
      await expect(page.getByText(/^Nada sobre/)).toHaveCount(0)
      await expect(page.getByText(/resultados? em /)).toHaveCount(0)

      // Nada de erro cru e nada de pedir à rota um termo que ela recusaria.
      const conteudo = page.locator(SELETOR_CONTEUDO)
      await expect(conteudo).not.toContainText("parametro-invalido")
      await expect(conteudo).not.toContainText("Não foi possível")
      expect(pedidos).toHaveLength(0)
      expect(await caminhoAtual(page)).toBe("/app/busca")
    })
  }
})

test.describe("a digitação vence o termo do link", () => {
  test.beforeEach(() => {
    test.skip(projetoAtual() !== LARGURA_UNICA, "a digitação é provada uma vez, em 1440")
  })

  test("digitar outro termo troca o resultado e não volta ao termo antigo", async ({ page }) => {
    await simularBuscaDaProva(page)
    await page.goto(`/app/busca?q=${TERMO_DA_PROVA}`)
    await expect(page.getByText(`5 resultados em ${CIDADE_DA_BUSCA}`)).toBeVisible()

    await campoDaBusca(page).fill(TERMO_SEM_ACHADO)

    await expect(campoDaBusca(page)).toHaveValue(TERMO_SEM_ACHADO)
    await expect(page.getByText(`Nada sobre “${TERMO_SEM_ACHADO}”`)).toBeVisible()
    // O resultado do link não volta a aparecer depois da digitação.
    await expect(page.getByText("Moto 150cc seminova do Ipiranga")).toHaveCount(0)
  })

  test("limpar o campo devolve a busca ao estado sem termo", async ({ page }) => {
    await simularBuscaDaProva(page)
    await page.goto(`/app/busca?q=${TERMO_DA_PROVA}`)
    await expect(page.getByText(`5 resultados em ${CIDADE_DA_BUSCA}`)).toBeVisible()

    await page.locator('[data-acao="limpar-busca"]').click()

    await expect(campoDaBusca(page)).toHaveValue("")
    await expect(page.locator(GRADE_EXPLORAR)).toBeVisible()
    await expect(page.getByText(/resultados? em /)).toHaveCount(0)
  })
})
