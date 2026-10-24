import { expect, test } from "@playwright/test"
import { BOTTOM_NAV, SIDEBAR, seedSession, signInAs } from "./helpers/session"

// A barra de baixo do protótipo (lote 5, tarefa N1 —
// ADR-20261023-comunidade-do-prototipo, "Navegação e estrutura"): Início,
// Comunidade, Conversas e Você. Substitui a barra
// Início/Explorar/Comunidades/Perfil do PROCESSO-DE-CONSTRUCAO §7.
//
// Cada teste roda nos TRÊS viewports declarados pelo Playwright
// (mobile-375/tablet-768/desktop-1440) sem fixar largura: abaixo de md a barra
// inferior aparece; de md para cima quem responde é a lateral (trilho de ícones
// ou expandida). Por isso a asserção ramifica pela largura real, como
// manaus-pilot-full-journey.spec.ts.

const NAV_ITEMS = [
  { label: "Início", href: "/inicio" },
  { label: "Comunidade", href: "/community" },
  { label: "Conversas", href: "/messages" },
  { label: "Você", href: "/profile" },
] as const

// A rota antiga de uma vila do seed (Vila Ajuricaba, dono-vila@). vila não
// existe nesta versão; o endereço leva à Comunidade da cidade.
const LEGACY_COMMUNITY = "71000000-0000-4000-8000-000000000001"

async function navWidthIsMobile(page: import("@playwright/test").Page): Promise<boolean> {
  return (page.viewportSize()?.width ?? 0) < 768
}

test.describe("a barra segue o protótipo em três larguras", () => {
  test("mostra as quatro entradas do protótipo, na ordem", async ({ page, context }) => {
    await seedSession(context)
    await page.goto("/inicio")

    const width = page.viewportSize()?.width ?? 0
    if (width < 768) {
      const nav = page.locator(BOTTOM_NAV)
      await expect(nav).toBeVisible()
      const tabs = nav.getByRole("tab")
      await expect(tabs).toHaveCount(4)
      let index = 0
      for (const item of NAV_ITEMS) {
        await expect(tabs.nth(index)).toContainText(item.label)
        await expect(tabs.nth(index)).toHaveAttribute("href", item.href)
        index += 1
      }
    } else {
      await expect(page.locator(BOTTOM_NAV)).toBeHidden()
      const sidebar = page.locator(SIDEBAR)
      await expect(sidebar).toBeVisible()
      for (const item of NAV_ITEMS) {
        await expect(sidebar.locator(`a[href="${item.href}"]`).first()).toBeAttached()
      }
    }
  })

  test("Explorar e Comunidades saíram da barra", async ({ page, context }) => {
    await seedSession(context)
    await page.goto("/inicio")

    const nav = page.locator(BOTTOM_NAV)
    if (await navWidthIsMobile(page)) {
      await expect(nav).toBeVisible()
      await expect(nav.getByRole("tab", { name: "Explorar", exact: true })).toHaveCount(0)
      await expect(nav.getByRole("tab", { name: "Comunidades", exact: true })).toHaveCount(0)
    } else {
      const sidebar = page.locator(SIDEBAR)
      await expect(sidebar.getByRole("link", { name: "Explorar", exact: true })).toHaveCount(0)
      await expect(sidebar.getByRole("link", { name: "Comunidades", exact: true })).toHaveCount(0)
    }
  })
})

test.describe("Conversas abre a caixa de mensagens", () => {
  test("a barra abre uma conversa e continua ativa", async ({ page, context }) => {
    await seedSession(context)
    await page.goto("/inicio")

    if (await navWidthIsMobile(page)) {
      await page.locator(BOTTOM_NAV).getByRole("tab", { name: "Conversas", exact: true }).click()
    } else {
      await page.locator(SIDEBAR).getByRole("link", { name: "Conversas" }).click()
    }
    await expect(page).toHaveURL(/\/messages$/)
    await expect(page.getByRole("heading", { name: "Mensagens" })).toBeVisible()

    const conversation = page.getByRole("option").first()
    await expect(conversation).toBeVisible({ timeout: 15_000 })
    await conversation.click()
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/i)
    await expect(page.getByLabel("Digite sua mensagem")).toBeVisible()

    const nav = page.locator(BOTTOM_NAV)
    if (await navWidthIsMobile(page)) {
      await expect(nav).toBeVisible()
      await expect(nav.getByRole("tab", { name: "Conversas", exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      )
    } else {
      await expect(page.locator(SIDEBAR).getByRole("link", { name: "Conversas" })).toHaveAttribute(
        "aria-current",
        "page",
      )
    }
  })
})

test.describe("Você reúne o que era Perfil", () => {
  test("o perfil acende Você", async ({ page, context }) => {
    await seedSession(context)
    await page.goto("/profile")

    if (await navWidthIsMobile(page)) {
      await expect(
        page.locator(BOTTOM_NAV).getByRole("tab", { name: "Você", exact: true }),
      ).toHaveAttribute("aria-selected", "true")
    } else {
      await expect(page.locator(SIDEBAR).getByRole("link", { name: "Você" })).toHaveAttribute(
        "aria-current",
        "page",
      )
    }
  })

  test("Salvos acende Você, como no activeTab() do protótipo", async ({ page, context }) => {
    await seedSession(context)
    await page.goto("/salvos")

    if (await navWidthIsMobile(page)) {
      await expect(
        page.locator(BOTTOM_NAV).getByRole("tab", { name: "Você", exact: true }),
      ).toHaveAttribute("aria-selected", "true")
    } else {
      await expect(page.locator(SIDEBAR).getByRole("link", { name: "Você" })).toHaveAttribute(
        "aria-current",
        "page",
      )
    }
  })

  test("Você → Salvos → anúncio mantém Você ativo ao voltar do Início", async ({
    page,
    context,
  }) => {
    await signInAs(context, "dono-vila@bivaque.example.invalid")
    await page.goto("/profile")
    await page.waitForFunction(() => window.history.state?.bivaqueOrigem === "voce")
    await page.getByRole("link", { name: "Salvos", exact: true }).last().click()
    await expect(page).toHaveURL(/\/salvos$/)
    await page.locator('a[href="/mercado/b1000000-0000-4000-8000-000000000001"]').click()
    await expect(page).toHaveURL(/\/mercado\/b1000000-0000-4000-8000-000000000001$/)
    await expect.poll(() => page.evaluate(() => window.history.state?.bivaqueOrigem)).toBe("voce")
    await page.reload()
    await expect.poll(() => page.evaluate(() => window.history.state?.bivaqueOrigem)).toBe("voce")
    if (await navWidthIsMobile(page)) {
      await expect(page.locator(BOTTOM_NAV).locator('a[href="/profile"]')).toHaveAttribute(
        "aria-selected",
        "true",
      )
    } else {
      await expect(page.locator(SIDEBAR).locator('a[href="/profile"]')).toHaveAttribute(
        "aria-current",
        "page",
      )
    }

    if (await navWidthIsMobile(page)) {
      await page.locator(BOTTOM_NAV).getByRole("tab", { name: "Início", exact: true }).click()
    } else {
      await page.locator(SIDEBAR).getByRole("link", { name: "Início", exact: true }).click()
    }
    await expect(page).toHaveURL(/\/inicio$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/mercado\/b1000000-0000-4000-8000-000000000001$/)

    if (await navWidthIsMobile(page)) {
      await expect(
        page.locator(BOTTOM_NAV).getByRole("tab", { name: "Você", exact: true }),
      ).toHaveAttribute("aria-selected", "true")
    } else {
      await expect(page.locator(SIDEBAR).getByRole("link", { name: "Você" })).toHaveAttribute(
        "aria-current",
        "page",
      )
    }
  })
})

test("a mesma URL aberta por outra raiz recebe a origem dessa entrada", async ({
  page,
  context,
}) => {
  await signInAs(context, "dono-vila@bivaque.example.invalid")
  await page.goto("/profile")
  await page.getByRole("link", { name: "Salvos", exact: true }).last().click()
  await page.locator('a[href="/mercado/b1000000-0000-4000-8000-000000000001"]').click()
  await expect.poll(() => page.evaluate(() => window.history.state?.bivaqueOrigem)).toBe("voce")

  await page.goto("/inicio")
  await page.waitForFunction(() => window.history.state?.bivaqueOrigem === "inicio")
  await page.locator('a[href="/mercado"]').first().click()
  await expect(page).toHaveURL(/\/mercado$/)
  await page.locator('a[href="/mercado/b1000000-0000-4000-8000-000000000001"]').click()
  await expect.poll(() => page.evaluate(() => window.history.state?.bivaqueOrigem)).toBe("inicio")
  if (await navWidthIsMobile(page)) {
    await expect(page.locator(BOTTOM_NAV).locator('a[href="/inicio"]')).toHaveAttribute(
      "aria-selected",
      "true",
    )
  } else {
    // O logo da lateral também aponta para /inicio: o ativo é o da navegação principal.
    await expect(
      page.locator(SIDEBAR).locator('nav[aria-label="Navegação principal"] a[href="/inicio"]'),
    ).toHaveAttribute("aria-current", "page")
  }
})

test.describe("abas da Comunidade (renderCommunity)", () => {
  test("tem Indicações e Grupos; Grupos abre a lista de grupos", async ({ page, context }) => {
    await signInAs(context, "dono-vila@bivaque.example.invalid")
    await page.goto("/community")

    await expect(page.getByRole("link", { name: "Ver comunidades", exact: true })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Convidar", exact: true })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Sobre", exact: true })).toHaveCount(0)
    await expect(page.locator('a[href^="/communities"]')).toHaveCount(0)

    await expect(page.getByRole("tab", { name: "Indicações", exact: true })).toBeVisible()
    const grupos = page.getByRole("tab", { name: "Grupos", exact: true })
    await expect(grupos).toBeVisible()
    // A aba Negócios é do lote 6: não entra agora.
    await expect(page.getByRole("tab", { name: "Negócios", exact: true })).toHaveCount(0)

    await grupos.click()
    await expect(page).toHaveURL(/\/groups$/)
    await expect(page.getByRole("tab", { name: "Grupos", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await page.getByRole("tab", { name: "Indicações", exact: true }).click()
    await expect(page).toHaveURL(/\/community$/)
    await expect(page.getByRole("tab", { name: "Indicações", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })
})

test.describe("rotas antigas de vila", () => {
  test("/communities cai na Comunidade da cidade", async ({ page, context }) => {
    await seedSession(context)
    await page.goto("/communities")
    await expect(page).toHaveURL(/\/community$/)
  })

  test("uma rota filha antiga também cai na Comunidade da cidade", async ({ page, context }) => {
    await seedSession(context)
    await page.goto(`/communities/${LEGACY_COMMUNITY}/invite`)
    await expect(page).toHaveURL(/\/community$/)
  })
})

test.describe("Indicações continua alcançável do cabeçalho", () => {
  test("é uma entrada nomeada em toda largura", async ({ page, context }) => {
    await seedSession(context)
    await page.goto("/inicio")

    const indications = page.getByRole("link", { name: "Indicações" })
    await expect(indications).toBeVisible()
    await expect(indications).toHaveAttribute("href", "/community?vista=indicacoes")
  })
})

test.describe("o avatar do cabeçalho não repete Você no telefone", () => {
  test("no telefone o avatar sai; a aba Você leva ao perfil", async ({ page, context }) => {
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/inicio")

    // No celular o avatar repetia a aba Você da barra inferior e saiu do
    // cabeçalho (app-shell.tsx).
    await expect(page.locator("header").getByRole("link", { name: "Perfil" })).toBeHidden()

    const tab = page.locator(BOTTOM_NAV).getByRole("tab", { name: "Você", exact: true })
    await expect(tab).toBeVisible()
    await tab.click()
    await expect(page).toHaveURL(/\/profile/)
  })
})
