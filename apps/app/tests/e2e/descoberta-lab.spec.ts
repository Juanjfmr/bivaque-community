import { test as testeNormal } from "@playwright/test"
import { expect, test } from "./apoio"

test.describe("laboratório da descoberta", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/galeria/descoberta")
    await expect(page.locator('[data-tela="descoberta-lab"]')).toBeVisible()
  })

  test("busca, categorias, estado vazio e recuperação", async ({ page }) => {
    await expect(page.locator(".bv-descoberta-card")).toHaveCount(8)
    await page.getByRole("button", { name: "Serviços", exact: true }).click()
    await expect(page.locator(".bv-descoberta-card")).toHaveCount(4)
    await page.getByRole("textbox", { name: "Buscar na descoberta" }).fill("Parque Dez")
    await expect(page.locator(".bv-descoberta-card")).toHaveCount(1)
    await expect(page.getByRole("button", { name: "Ver detalhes de Pet Bem Manaus" })).toBeVisible()
    await page.getByRole("textbox", { name: "Buscar na descoberta" }).fill("nada por aqui")
    await expect(page.getByRole("heading", { name: "Nada encontrado nesta prévia" })).toBeVisible()
    await page.getByRole("button", { name: "Limpar filtros" }).click()
    await expect(page.locator(".bv-descoberta-card")).toHaveCount(8)
  })

  test("favoritar, abrir detalhe, simular contato e devolver foco", async ({ page }) => {
    const salvar = page.getByRole("button", { name: "Salvar: Casa Organizada" })
    await salvar.click()
    await expect(
      page.getByRole("button", { name: "Remover dos salvos: Casa Organizada" }),
    ).toHaveAttribute("aria-pressed", "true")
    const abrir = page.getByRole("button", { name: "Ver detalhes de Casa Organizada" })
    await abrir.click()
    const detalhe = page.getByRole("dialog", { name: "Casa Organizada" })
    await expect(detalhe).toBeVisible()
    await detalhe
      .getByRole("textbox", { name: "Experimente escrever uma mensagem" })
      .fill("Gostaria de mais informações")
    await detalhe.getByRole("button", { name: "Simular pedido" }).click()
    await expect(detalhe.getByRole("status")).toContainText("Nenhuma mensagem foi enviada")
    await page.keyboard.press("Escape")
    await expect(detalhe).not.toBeVisible()
    await expect(abrir).toBeFocused()
  })

  test("temas, largura e movimento reduzido", async ({ page }) => {
    const erros: string[] = []
    page.on("pageerror", (erro) => erros.push(erro.message))
    for (const tema of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true)
      await page.getByRole("button", { name: "Ver detalhes de Berço em madeira" }).click()
      await expect(page.getByRole("dialog", { name: "Berço em madeira" })).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(page.getByRole("dialog", { name: "Berço em madeira" })).not.toBeVisible()
    }
    expect(erros).toEqual([])
  })
})

testeNormal("o laboratório não aparece no build de uso normal", async ({ page }) => {
  await page.goto("/app/galeria/descoberta")
  await expect(page.getByRole("heading", { name: "Página indisponível" })).toBeVisible()
  await expect(page.locator('[data-tela="descoberta-lab"]')).toHaveCount(0)
})
