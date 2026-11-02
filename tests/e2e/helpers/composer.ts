// Abre o compositor de publicação e escolhe o grupo de destino.
//
// Lote 5, tarefa N2 (ADR-20261023-comunidade-do-prototipo): publicar existe SÓ
// dentro de um grupo, e o compositor deixou de oferecer cidade e vila. A linha
// de publicar saiu de /community, então o caminho estável passou a ser a linha
// do Início (a partir de md) e o botão flutuante do shell no telefone.
//
// O grupo usado é o "Pais e Filhos" do seed (60000000-…0002, público, em
// Manaus): membro-1 é aprovado nele e qualquer membro da cidade o lê — é o
// grupo onde as publicações de teste aparecem.

import { expect, type Locator, type Page } from "@playwright/test"

export const TEST_GROUP_ID = "60000000-0000-4000-8000-000000000002"
export const TEST_GROUP_NAME = "Pais e Filhos"
export const TEST_GROUP_FEED_URL = `/groups/${TEST_GROUP_ID}`

/** Abre o compositor no tamanho do projeto: a linha do Início a partir de md, o
 *  botão flutuante do shell no telefone (`inicio/page.tsx`). */
export async function openComposer(page: Page): Promise<void> {
  await page.goto("/inicio", { waitUntil: "load" })
  // A saudação só existe depois da montagem (o relógio entra em useEffect):
  // esperá-la é a prova de que o React hidratou, e o clique não cai no vazio.
  await expect(page.locator("main").getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20000,
  })
  const width = page.viewportSize()?.width ?? 0
  if (width >= 768) {
    await page.getByTestId("intent-pergunta").click()
  } else {
    await page.getByRole("button", { name: "Criar" }).click()
    await page.getByRole("button", { name: /Fazer uma pergunta/i }).click()
  }
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
