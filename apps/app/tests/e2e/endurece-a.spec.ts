import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { simularInicio } from "./inicio-ajuda"

test.beforeEach(async ({ page }) => {
  await simularInicio(page)
})

test("título acompanha navegação e link pula ao conteúdo", async ({ page }) => {
  await page.goto("/app/inicio")
  await expect(page).toHaveTitle(/Início.* · Bivaque/)
  // A navegação já leva o foco ao título da tela; o atalho é o primeiro
  // elemento focável do documento, para quem volta ao topo pelo teclado.
  const pular = page.getByRole("link", { name: "Pular para o conteúdo" })
  const primeiroFocavel = await page.evaluate(() => {
    const alvos = document.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    return alvos[0]?.textContent?.trim() ?? ""
  })
  expect(primeiroFocavel).toBe("Pular para o conteúdo")
  await pular.focus()
  await expect(pular).toBeFocused()
  await expect(pular).toBeInViewport()
  await page.keyboard.press("Enter")
  await expect(page.locator("#conteudo")).toBeFocused()
  await page.goto("/app/conversas")
  await expect(page).toHaveTitle("Conversas · Bivaque")
})

test("foco dos campos e botões das peças permanece visível em cores forçadas", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" })
  await page.goto("/app/entrar")
  const alvos = page.locator(".pc input:visible, .pc button:visible")
  await expect(alvos.first()).toBeVisible()
  for (const alvo of await alvos.all()) {
    await alvo.focus()
    expect(await alvo.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none")
  }
})

for (const tema of ["claro", "escuro"]) {
  for (const caminho of [
    "/app/inicio",
    "/app/busca",
    "/app/evento/e1",
    "/app/conversa/nao-existe",
    "/app/guia",
  ]) {
    test(`ordem de títulos em ${caminho}, tema ${tema}`, async ({ page }) => {
      await page.goto(caminho)
      await page.evaluate(
        (valor) => document.documentElement.setAttribute("data-tema", valor),
        tema,
      )
      const resultado = await new AxeBuilder({ page }).withRules("heading-order").analyze()
      expect(resultado.violations).toEqual([])
    })
  }
}
