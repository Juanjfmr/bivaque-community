import { expect, test } from "@playwright/test"
import { simularGrupos } from "./grupos-ajuda"

// DS-021 (F03, critério 1): publicar no grupo não troca de tela. A publicação
// entra como primeiro item da lista, com o cartão completo e o foco nela; a
// recusa do servidor vira frase com próximo passo, e o texto continua no
// compositor aberto. Roda nos três tamanhos em que o lote é provado
// (mobile-375, tablet-768, desktop-1440) — o `playwright.config.ts` também tem
// 320/360/430, e o spec é verdadeiro lá pelo mesmo motivo.

const TEXTO = "Procuro um veterinário que atenda à noite na zona sul."

function dialogo(page: import("@playwright/test").Page) {
  return page.locator('[data-dialogo="escrever-grupo"]')
}

test("publica no próprio grupo: a publicação é o primeiro item, com foco nela", async ({
  page,
}) => {
  await simularGrupos(page, { membro: true })
  await page.goto("/app/grupo/g-pets")
  await page.locator('[data-acao="escrever-grupo"]').click()
  await dialogo(page).locator("#texto-grupo").fill(TEXTO)
  await dialogo(page).getByRole("button", { name: "Publicar", exact: true }).click()

  // Sem sair da tela do grupo.
  await expect(page).toHaveURL(/\/app\/grupo\/g-pets$/)
  await expect(dialogo(page)).toHaveCount(0)

  const primeiro = page.locator('[data-publicacao-na-lista="sim"]').first()
  await expect(primeiro).toContainText(TEXTO)
  await expect(primeiro).toContainText("Você")
  // O foco não fica no botão que publicou: o diálogo fechou e devolveu o foco
  // ao "Escrever no grupo". Quem leva a pessoa até a publicação é o anúncio,
  // que anuncia e move o foco para o cartão recém-publicado.
  await expect(page.locator('[data-acao="escrever-grupo"]')).toBeFocused()
  await expect(page.locator('[data-anuncio-da-publicacao="sim"]')).toContainText("começo da lista")
})

test("recusa por permissão: frase própria, texto preservado, compositor aberto", async ({
  page,
}) => {
  await simularGrupos(page, {
    membro: true,
    recusas: [{ status: 403, erro: "nao-membro" }],
  })
  await page.goto("/app/grupo/g-pets")
  await page.locator('[data-acao="escrever-grupo"]').click()
  await dialogo(page).locator("#texto-grupo").fill(TEXTO)
  await dialogo(page).getByRole("button", { name: "Publicar", exact: true }).click()

  const recusa = dialogo(page).locator('[data-recusa="recusa"]')
  await expect(recusa).toBeVisible()
  await expect(recusa).toContainText("não pode publicar neste grupo")
  // O próximo passo, em português, sem corpo de erro nem URL.
  await expect(recusa).toContainText("peça entrada")
  await expect(recusa).not.toContainText("nao-membro")
  // O texto e o compositor continuam como estavam.
  await expect(dialogo(page)).toBeVisible()
  await expect(dialogo(page).locator("#texto-grupo")).toHaveValue(TEXTO)
  await expect(page.locator('[data-publicacao-na-lista="sim"]')).toHaveCount(1)
})

test("falha de rede: estado recuperável com tentar de novo, texto mantido", async ({ page }) => {
  await simularGrupos(page, { membro: true, recusas: ["rede"] })
  await page.goto("/app/grupo/g-pets")
  await page.locator('[data-acao="escrever-grupo"]').click()
  await dialogo(page).locator("#texto-grupo").fill(TEXTO)
  await dialogo(page).getByRole("button", { name: "Publicar", exact: true }).click()

  const recuperavel = dialogo(page).locator('[data-recusa="recuperavel"]')
  await expect(recuperavel).toBeVisible()
  await expect(dialogo(page).locator("#texto-grupo")).toHaveValue(TEXTO)

  // A segunda tentativa é a da pessoa e grava.
  await recuperavel.getByRole("button", { name: "Tentar de novo", exact: true }).click()
  await expect(dialogo(page)).toHaveCount(0)
  const primeiro = page.locator('[data-publicacao-na-lista="sim"]').first()
  await expect(primeiro).toContainText(TEXTO)
  await expect(page.locator('[data-anuncio-da-publicacao="sim"]')).toContainText("começo da lista")
})
