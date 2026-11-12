import type { Page } from "@playwright/test"
// A tela real da busca: o `test` de `apoio.ts` liga o modo de prova, que troca a
// rota pela tela de prova. Este spec usa o `test` puro, como os de tela real.
import { expect, test } from "@playwright/test"
import {
  abrir,
  CIDADE_DA_BUSCA,
  caminhoAtual,
  SELETOR_CONTEUDO,
  simularBuscaDaProva,
  TERMO_DA_PROVA,
  TERMO_SEM_ACHADO,
} from "./apoio"

/**
 * LT-001 — o link antigo `/explorar/busca?q=<termo>` cai na busca do app e a
 * tela abre já com o termo no campo e a lista filtrada. O que se prova:
 *
 * - o aterrissagem em 375, 768 e 1440, nos dois temas: campo com o termo,
 *   contagem e um resultado de cada tipo, sem estado vazio nem grade
 *   "Explorar" no caminho, e o campo segue com o foco de quem digita;
 * - o primeiro pedido já é a consulta, com o termo do endereço, e o Início
 *   nunca é lido;
 * - termo vazio, só espaços, um caractere ou acima do limite que o servidor
 *   aceita abre o estado vazio honesto, sem erro cru e sem pedir à rota um
 *   termo que ela recusaria;
 * - `/app/busca` sem `q` é o estado vazio, sem resultado herdado de ninguém;
 * - depois de chegar pelo link, digitar vence o `q` de origem, e limpar volta
 *   ao estado sem termo;
 * - com a tela montada, um endereço sem termo aceito não apaga o que a pessoa
 *   digitou, e o Voltar para outro termo válido leva esse termo ao campo.
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

/** Os pedidos a uma rota de dado que a página fez até agora. */
function ouvir(page: Page, caminho: string): string[] {
  const pedidos: string[] = []
  page.on("request", (pedido) => {
    if (new URL(pedido.url()).pathname === caminho) pedidos.push(pedido.url())
  })
  return pedidos
}

const ouvirBusca = (page: Page) => ouvir(page, "/api/app/busca")

/**
 * O endereço muda sem recarregar, como no Voltar para outra entrada: o
 * roteador relê a URL e a tela continua montada, com o que a pessoa digitou.
 */
async function trocarEndereco(page: Page, caminho: string): Promise<void> {
  await page.evaluate((destino) => {
    window.history.pushState(window.history.state, "", destino)
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }))
  }, caminho)
  await expect.poll(() => new URL(page.url()).search).toBe(new URL(caminho, page.url()).search)
}

test.describe("aterrissagem com o termo no endereço", () => {
  test.beforeEach(() => {
    test.skip(
      !new RegExp(`^(?:${LARGURAS_DO_ATERRIZAGEM})$`).test(projetoAtual()),
      "o aterrissagem é provado em 375, 768 e 1440",
    )
  })

  for (const tema of ["light", "dark"] as const) {
    test(`abre com o termo no campo, a contagem e um resultado de cada tipo (tema ${tema})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: tema })
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
  }

  test("o primeiro pedido já é a consulta, e o Início não é lido", async ({ page }) => {
    await simularBuscaDaProva(page)
    const pedidos = ouvirBusca(page)
    const inicio = ouvir(page, "/api/app/inicio")

    await page.goto(`/app/busca?q=${TERMO_DA_PROVA}`)
    await expect(page.getByText(`5 resultados em ${CIDADE_DA_BUSCA}`)).toBeVisible()

    expect(pedidos).toHaveLength(1)
    expect(new URL(pedidos[0] ?? "").searchParams.get("q")).toBe(TERMO_DA_PROVA)
    // Sem estado vazio no caminho: a grade "Explorar" nunca chegou a pedir o Início.
    expect(inicio).toHaveLength(0)
  })

  test("o campo semeado pelo link continua com o foco de quem digita", async ({ page }) => {
    await simularBuscaDaProva(page)
    await page.goto(`/app/busca?q=${TERMO_DA_PROVA}`)
    await expect(page.getByText(`5 resultados em ${CIDADE_DA_BUSCA}`)).toBeVisible()

    // A pessoa continua a partir do termo do link: nenhuma semente tardia rouba
    // o foco nem reescreve o campo enquanto ela digita.
    await campoDaBusca(page).click()
    await page.keyboard.press("End")
    await page.keyboard.type(" norte")
    await expect(campoDaBusca(page)).toBeFocused()
    await expect(campoDaBusca(page)).toHaveValue(`${TERMO_DA_PROVA} norte`)
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

  test("um endereço com termo que a busca não aceita não apaga o que foi digitado", async ({
    page,
  }) => {
    await simularBuscaDaProva(page)
    await abrir(page, "/app/busca")
    await campoDaBusca(page).fill(TERMO_SEM_ACHADO)
    await expect(page.getByText(`Nada sobre “${TERMO_SEM_ACHADO}”`)).toBeVisible()

    for (const caminho of ["/app/busca?q=a", "/app/busca?q=%20%20", "/app/busca"]) {
      await trocarEndereco(page, caminho)
      await expect(campoDaBusca(page)).toHaveValue(TERMO_SEM_ACHADO)
      await expect(page.getByText(`Nada sobre “${TERMO_SEM_ACHADO}”`)).toBeVisible()
    }
  })

  test("o Voltar para um endereço com outro termo válido leva esse termo ao campo", async ({
    page,
  }) => {
    await simularBuscaDaProva(page)
    await abrir(page, "/app/busca")
    await campoDaBusca(page).fill(TERMO_SEM_ACHADO)

    await trocarEndereco(page, `/app/busca?q=${TERMO_DA_PROVA}`)

    await expect(campoDaBusca(page)).toHaveValue(TERMO_DA_PROVA)
    await expect(page.getByText(`5 resultados em ${CIDADE_DA_BUSCA}`)).toBeVisible()
  })
})
