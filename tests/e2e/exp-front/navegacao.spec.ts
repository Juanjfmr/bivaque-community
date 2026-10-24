import { expect, test } from "@playwright/test"
import { seedSession } from "../helpers/session"

const title = 'Pergunta de escape <img src=x onerror="window.__xss=1">"\''

async function enter(page: import("@playwright/test").Page, hash = "#comunidade") {
  await seedSession(page.context())
  await page.goto(`/app${hash}`)
}

function activeTab(page: import("@playwright/test").Page, name = "Comunidade") {
  return page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name, exact: true })
}

async function expectScrollNear(page: import("@playwright/test").Page, expected: number) {
  await expect
    .poll(() => page.getByRole("main").evaluate((node) => node.scrollTop))
    .toBeGreaterThanOrEqual(expected - 24)
  await expect
    .poll(() => page.getByRole("main").evaluate((node) => node.scrollTop))
    .toBeLessThanOrEqual(expected + 24)
}

async function openFirstQuestion(page: import("@playwright/test").Page) {
  const item = page.getByRole("list", { name: "Perguntas" }).getByRole("listitem").first()
  const button = item.getByRole("button")
  await button.scrollIntoViewIfNeeded()
  const scroll = await page.getByRole("main").evaluate((node) => node.scrollTop)
  const name = await button.getAttribute("aria-label")
  await button.click()
  await expect(page).toHaveURL(/#pergunta\//)
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
  return { buttonName: name ?? (await button.innerText()).trim(), scroll }
}

async function expectFilter(page: import("@playwright/test").Page, name = "Para ajudar") {
  await expect(page.getByRole("button", { name, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
}

test.describe("EXP-001 navegação", () => {
  test("Comunidade → pergunta → voltar", async ({ page }) => {
    await enter(page)
    await page.getByRole("button", { name: "Minhas", exact: true }).click()
    await expect(page.getByRole("button", { name: "Minhas", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await page.getByRole("main").evaluate((node) => {
      node.scrollTop = Math.min(500, node.scrollHeight)
    })
    const opened = await openFirstQuestion(page)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await page.goBack()
    await expect(page).toHaveURL(/#comunidade$/)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expect(page.getByRole("button", { name: "Minhas", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expectScrollNear(page, opened.scroll)
    await expect(page.getByRole("button", { name: opened.buttonName, exact: true })).toBeFocused()
  })

  test("Início → atalho Indicações → pergunta → voltar", async ({ page }) => {
    await enter(page, "#inicio")
    await page.getByRole("button", { name: "Indicações", exact: true }).click()
    await expect(page).toHaveURL(/#comunidade$/)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expectFilter(page)
    await expectScrollNear(page, 0)
    const opened = await openFirstQuestion(page)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await page.goBack()
    await expect(page).toHaveURL(/#comunidade$/)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expectFilter(page)
    await expectScrollNear(page, opened.scroll)
    await expect(page.getByRole("button", { name: opened.buttonName, exact: true })).toBeFocused()
  })

  test("Mesma pergunta a partir de Início e Minhas", async ({ page }) => {
    await enter(page, "#inicio")
    const homeQuestion = await openFirstQuestion(page)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await page.goBack()
    await expect(page).toHaveURL(/#inicio$/)
    await expect(activeTab(page, "Início")).toHaveAttribute("aria-current", "page")
    await expectScrollNear(page, 0)
    await expect(
      page.getByRole("button", { name: homeQuestion.buttonName, exact: true }),
    ).toBeFocused()
    await enter(page, "#minhas")
    const opened = await openFirstQuestion(page)
    await page.goBack()
    await expect(page).toHaveURL(/#minhas$/)
    await expect(page.getByRole("button", { name: opened.buttonName, exact: true })).toBeFocused()
    await expect(page.getByRole("button", { name: opened.buttonName, exact: true })).toBeVisible()
    await expectScrollNear(page, opened.scroll)
  })

  test("Recarregar no detalhe", async ({ page }) => {
    await enter(page)
    await openFirstQuestion(page)
    const question = page.getByRole("heading", { level: 1 })
    await question.focus()
    const scroll = await page.getByRole("main").evaluate((node) => node.scrollTop)
    await page.reload()
    await expect(page).toHaveURL(/#pergunta\//)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expectScrollNear(page, scroll)
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
  })

  test("Recarregar em Resolvidas", async ({ page }) => {
    await enter(page)
    await page.getByRole("button", { name: "Resolvidas", exact: true }).click()
    await page.getByRole("main").evaluate((node) => {
      node.scrollTop = Math.min(250, node.scrollHeight)
    })
    const scroll = await page.getByRole("main").evaluate((node) => node.scrollTop)
    await page.reload()
    await expect(page).toHaveURL(/#comunidade$/)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expectFilter(page, "Resolvidas")
    await expect(page.getByRole("button", { name: "Resolvidas", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expectScrollNear(page, scroll)
    await expect(page.getByRole("button", { name: "Resolvidas", exact: true })).toBeFocused()
  })

  test("Recarregar em Minhas", async ({ page }) => {
    await enter(page, "#minhas")
    const question = page
      .getByRole("list", { name: "Perguntas" })
      .getByRole("listitem")
      .first()
      .getByRole("button")
    await question.focus()
    await page.getByRole("main").evaluate((node) => {
      node.scrollTop = Math.min(220, node.scrollHeight)
    })
    const scroll = await page.getByRole("main").evaluate((node) => node.scrollTop)
    const questionName = await question.getAttribute("aria-label")
    await page.reload()
    await expect(page).toHaveURL(/#minhas$/)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expectScrollNear(page, scroll)
    await expect(page.getByRole("button", { name: questionName ?? "", exact: true })).toBeFocused()
  })

  test("Avançar depois de voltar", async ({ page }) => {
    await enter(page)
    const opened = await openFirstQuestion(page)
    const detail = page.url()
    await page.goBack()
    await expect(page).toHaveURL(/#comunidade$/)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expectFilter(page)
    await expectScrollNear(page, opened.scroll)
    await expect(page.getByRole("button", { name: opened.buttonName, exact: true })).toBeFocused()
    await page.goForward()
    await expect(page).toHaveURL(detail)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
  })

  test("Trocar filtro e voltar", async ({ page }) => {
    await enter(page)
    await page.getByRole("button", { name: "Resolvidas", exact: true }).click()
    const opened = await openFirstQuestion(page)
    await page.goBack()
    await expect(page).toHaveURL(/#comunidade$/)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expect(page.getByRole("button", { name: "Resolvidas", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expectScrollNear(page, opened.scroll)
    await expect(page.getByRole("button", { name: opened.buttonName, exact: true })).toBeFocused()
  })

  test("Perguntar aberto e voltar", async ({ page }) => {
    await enter(page)
    await page.getByRole("button", { name: "Resolvidas", exact: true }).click()
    await page.getByRole("main").evaluate((node) => {
      node.scrollTop = Math.min(250, node.scrollHeight)
    })
    const before = await page.getByRole("main").evaluate((node) => node.scrollTop)
    await page.getByRole("button", { name: "Perguntar", exact: true }).click()
    await expect(page.getByRole("dialog", { name: "Pedir indicação" })).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/#comunidade$/)
    await expect(page.getByRole("dialog", { name: "Pedir indicação" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Resolvidas", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(page.getByRole("button", { name: "Perguntar", exact: true })).toBeFocused()
    await expectScrollNear(page, before)
  })

  test("Link direto e voltar", async ({ page }) => {
    await enter(page, "#pergunta/e0000000-0000-4000-8000-00000000f001")
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeFocused()
    await page.goBack()
    await expect(page).toHaveURL(/#comunidade$/)
    await expect(activeTab(page)).toHaveAttribute("aria-current", "page")
    await expectFilter(page)
    await expectScrollNear(page, 0)
    await expect(page.getByRole("heading", { name: "Comunidade" })).toBeFocused()
  })
})
