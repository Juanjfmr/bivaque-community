import { expect, test } from "@playwright/test"
import { simularVoce } from "./voce-ajuda"
test("a escolha de frequência aparece, grava e volta do servidor", async ({ page }) => {
  await simularVoce(page)
  await page.goto("/app/voce")
  const campo = page.getByRole("combobox", { name: "Resumo da cidade por e-mail" })
  await expect(campo).toContainText("Desligado")
  await campo.click()
  await page.getByRole("option", { name: "Semanal", exact: true }).click()
  await page.getByRole("button", { name: "Gravar preferências de avisos" }).click()
  await expect(page.getByRole("status")).toContainText("Preferências de aviso salvas.")
  await page.reload()
  await expect(campo).toContainText("Semanal")
})
