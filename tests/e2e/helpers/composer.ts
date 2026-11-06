// Abre o compositor de publicação e escolhe o grupo de destino.
//
// LAN-TROCA fase 1: o compositor antigo continua no shell de /community.
//
// O grupo usado é o "Pais e Filhos" do seed (60000000-…0002, público, em
// Manaus): membro-1 é aprovado nele e qualquer membro da cidade o lê — é o
// grupo onde as publicações de teste aparecem.

import { expect, type Locator, type Page } from "@playwright/test"

export const TEST_GROUP_ID = "60000000-0000-4000-8000-000000000002"
export const TEST_GROUP_NAME = "Pais e Filhos"
export const TEST_GROUP_FEED_URL = `/groups/${TEST_GROUP_ID}`

/** Abre o compositor pelo menu do shell antigo, preservado em /community. */
export async function openComposer(page: Page): Promise<void> {
  await page.goto("/community", { waitUntil: "load" })
  // Espera a montagem antes de clicar no menu do shell.
  await expect(page.locator("main").getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20000,
  })
  await page.getByRole("button", { name: "Criar" }).click()
  await page.getByRole("button", { name: /Fazer uma pergunta/i }).click()
  await expect(page.getByRole("heading", { name: "Criar publicação" })).toBeVisible({
    timeout: 20000,
  })
}

/** Escolhe o grupo do cenário no seletor de destino e confirma o aviso. */
export async function chooseTestGroup(dialog: Locator): Promise<void> {
  const option = dialog.getByText(TEST_GROUP_NAME, { exact: true })
  await expect(option).toBeVisible({ timeout: 15000 })
  await option.click()
  await expect(dialog.getByTestId("audience-notice")).toContainText(/aprovados deste grupo/i)
}
