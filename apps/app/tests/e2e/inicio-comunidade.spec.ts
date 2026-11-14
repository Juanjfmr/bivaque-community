import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { EVENTO_DA_PROVA } from "./apoio"
import { simularGrupos } from "./grupos-ajuda"
import { simularInicio } from "./inicio-ajuda"
import { simularPerguntas } from "./perguntas-ajuda"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/app/entry/progress", (r) => r.fulfill({ json: { autenticado: false } }))
  await simularInicio(page)
  await simularPerguntas(page)
  await simularGrupos(page)
})

for (const tema of ["light", "dark"] as const) {
  test(`Início: leitura, toque e acessibilidade em ${tema}`, async ({ page }, testInfo) => {
    const erros: string[] = []
    page.on("pageerror", (erro) => erros.push(erro.message))
    page.on("console", (mensagem) => {
      if (mensagem.type() === "error") erros.push(mensagem.text())
    })
    await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
    await page.goto("/app/inicio")
    const inicio = page.locator('[data-tela="inicio"]')
    await expect(inicio.getByRole("heading", { name: "Uma indicação faz diferença" })).toBeVisible()
    const primeiraSecao = inicio.locator('[data-secao="sim"]').first()
    await expect(primeiraSecao).toContainText("Perguntar à cidade")
    await expect(inicio.getByRole("button", { name: /Salvar/ })).toHaveCount(0)
    for (const botao of await inicio.locator('[data-acao="atalho"]').all()) {
      const area = await botao.boundingBox()
      expect(area?.width).toBeGreaterThanOrEqual(44)
      expect(area?.height).toBeGreaterThanOrEqual(44)
    }
    expect(
      await page.locator("#conteudo").evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1)
    const axe = await new AxeBuilder({ page })
      .include('[data-tela="inicio"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()
    expect(axe.violations).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`inicio-${tema}.png`) })
    expect(erros).toEqual([])
  })
}

test("Início → busca → resultado preserva os destinos existentes", async ({ page }) => {
  await page.goto("/app/inicio")
  await page.getByRole("button", { name: "Buscar na cidade", exact: true }).click()
  await page.getByRole("searchbox", { name: "Buscar no Bivaque" }).fill("berço")
  await page.getByRole("searchbox", { name: "Buscar no Bivaque" }).press("Enter")
  await expect(page.locator('[data-tela="busca"]')).toContainText("Berço com colchão")
  await page
    .locator('[data-tela="busca"] [data-cartao="anuncio"]')
    .first()
    .getByRole("button")
    .first()
    .click()
  await expect(page).toHaveURL(/\/app\/anuncio\/i3$/)
})

test("Perguntar funciona pelo teclado e Voltar fecha o formulário antes de sair", async ({
  page,
}) => {
  await page.goto("/app/inicio")
  const perguntar = page.getByRole("button", { name: "Perguntar à cidade", exact: true })
  await perguntar.focus()
  await page.keyboard.press("Enter")
  await expect(page.locator('[data-fluxo="perguntar"]')).toBeVisible()
  await page.locator("#nova-pergunta").fill("Onde encontro uma escola perto de casa?")
  await page.goBack()
  await expect(page.locator('[data-fluxo="perguntar"]')).toHaveCount(0)
  await expect(page).toHaveURL(/\/app\/inicio$/)
  expect(
    await page.locator("#conteudo").evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1)
  await page.getByRole("button", { name: "Perguntar à cidade", exact: true }).click()
  await expect(page.locator("#nova-pergunta")).toHaveValue(
    "Onde encontro uma escola perto de casa?",
  )
  await page.keyboard.press("Escape")
  await expect(page.locator('[data-fluxo="perguntar"]')).toHaveCount(0)
})

test("Início → perguntar → revisar → publicar → responder", async ({ page }) => {
  await page.goto("/app/inicio")
  await page.getByRole("button", { name: "Perguntar à cidade", exact: true }).click()
  const dialogo = page.locator('[data-fluxo="perguntar"]')
  await expect(dialogo).toBeVisible()
  await dialogo.locator("#nova-pergunta").fill("Quem indica uma escola perto do centro?")
  await dialogo.getByRole("button", { name: "Revisar pergunta" }).click()
  await expect(dialogo.locator('[data-revisao="pergunta"]')).toContainText("Quem indica uma escola")
  await dialogo.getByRole("button", { name: "Publicar pergunta" }).click()
  await expect(page).toHaveURL(/\/app\/pergunta\/90000000-/)
  await expect(
    page.getByText("Quem indica uma escola perto do centro?", { exact: true }),
  ).toBeVisible()
  await page.goto("/app/comunidade")
  await page.locator('[data-chip="mine"]').click()
  await expect(
    page.getByText("Quem indica uma escola perto do centro?", { exact: true }),
  ).toBeVisible()
  await page.route(/\/api\/app\/inicio(?:\?|$)/, (r) =>
    r.fulfill({
      json: {
        cidade: "Manaus",
        proximo: null,
        negocios: [],
        anuncios: [],
        grupos: [],
        eventos: [],
        perguntas: [
          {
            id: "a1",
            title: "Alguém indica um pediatra perto do centro?",
            reply_count: 0,
            is_resolved: false,
            group_name: null,
          },
        ],
      },
    }),
  )
  await page.goto("/app/inicio")
  await page.locator('[data-linha="pergunta"]').first().click()
  await expect(page).toHaveURL(/\/app\/pergunta\/a1$/)
  await page
    .getByLabel("Sua resposta")
    .fill("Conheço uma opção no Centro. Posso compartilhar os detalhes.")
  await page.getByRole("button", { name: "Enviar indicação", exact: true }).click()
  await expect(
    page.getByText("Conheço uma opção no Centro. Posso compartilhar os detalhes.", { exact: true }),
  ).toBeVisible()
})

test("Explorar grupos chega à seção certa e Voltar restaura a seção", async ({ page }) => {
  await page.goto("/app/inicio")
  await page.getByRole("button", { name: "Explorar grupos", exact: true }).click()
  await expect(page.locator('[data-diretorio-grupos="sim"]')).toBeVisible()
  await page
    .locator('[data-diretorio-grupos="sim"]')
    .getByRole("button", { name: /Ver grupo/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/app\/grupo\//)
  await page.goBack()
  await expect(page.locator('[data-diretorio-grupos="sim"]')).toBeVisible()
})

test("Falha de rede tem recuperação; vazio, sessão vencida e recusa são distintos", async ({
  page,
}) => {
  let status = 503
  await page.route(/\/api\/app\/inicio(?:\?|$)/, (r) =>
    status === 200
      ? r.fulfill({
          json: {
            cidade: "Recife",
            perguntas: [],
            anuncios: [],
            negocios: [],
            grupos: [],
            eventos: [],
            proximo: null,
          },
        })
      : r.fulfill({ status, json: { erro: "falha-sintetica" } }),
  )
  await page.goto("/app/inicio")
  await expect(page.locator('[data-estado="erro"]')).toBeVisible()
  await expect(page.getByText("A conversa pode começar com você")).toHaveCount(0)
  status = 200
  await page.getByRole("button", { name: "Tentar de novo", exact: true }).click()
  await expect(page.getByText("A conversa pode começar com você")).toBeVisible()
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Recife")
  for (const [codigo, estado] of [
    [401, "sessao-vencida"],
    [403, "negado"],
  ] as const) {
    status = codigo
    await page.reload()
    await expect(page.locator(`[data-estado="${estado}"]`)).toBeVisible()
    await expect(page.getByText("A conversa pode começar com você")).toHaveCount(0)
  }
})

test("Presença grava, relê, cancela e mantém o estado quando o servidor falha", async ({
  page,
}) => {
  let minha: "going" | null = null
  let falhar = false
  await page.route(/\/api\/app\/inicio(?:\?|$)/, async (r) => {
    await r.fulfill({
      json: {
        cidade: "Manaus",
        perguntas: [],
        negocios: [],
        anuncios: [],
        grupos: [],
        proximo: null,
        eventos: [
          {
            id: "evento-da-prova",
            title: EVENTO_DA_PROVA.evento.titulo,
            starts_at: EVENTO_DA_PROVA.evento.comecaEm,
            venue: "Parque Municipal",
          },
        ],
      },
    })
  })
  await page.route(/\/api\/app\/eventos\/evento-da-prova(?:\/presenca)?$/, async (r) => {
    const presenca = () => ({ confirmados: minha === "going" ? 4 : 3, minha })
    if (r.request().method() === "GET")
      return r.fulfill({ json: { ...EVENTO_DA_PROVA, presenca: presenca() } })
    if (falhar) return r.fulfill({ status: 503, json: { erro: "indisponivel" } })
    minha = r.request().method() === "DELETE" ? null : "going"
    return r.fulfill({ json: { presenca: presenca() } })
  })
  await page.goto("/app/inicio")
  const presenca = page.locator('[data-acao="presenca"]')
  await expect(presenca).toBeEnabled()
  await presenca.click()
  await expect(presenca).toHaveAttribute("aria-pressed", "true")
  await page.reload()
  await expect(presenca).toHaveAttribute("aria-pressed", "true")
  falhar = true
  await presenca.click()
  await expect(page.getByRole("alert")).toContainText("Não foi possível gravar")
  await expect(presenca).toHaveAttribute("aria-pressed", "true")
  falhar = false
  await page.getByRole("button", { name: "Tentar de novo", exact: true }).click()
  await expect(presenca).toHaveAttribute("aria-pressed", "false")
  await page.reload()
  await expect(presenca).toHaveAttribute("aria-pressed", "false")
  await page.getByRole("button", { name: /Encontro de veteranos/ }).click()
  await expect(page).toHaveURL(/\/app\/evento\/evento-da-prova$/)
})
