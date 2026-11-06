import { expect, test } from "@playwright/test"
import { simularVoce } from "./voce-ajuda"

// A jornada "Você" no app de prova (F10): mesmos componentes e mesmos estados
// da produção, com `/api/app/voce/*` simulado no lugar do banco (ver
// voce-ajuda.ts). A prova com banco de verdade é tests/e2e/f10-voce-real.spec.ts.

test("o perfil vem da rota, a edição sobrevive ao recarregar e o desfazer some da lista", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/voce")

  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()
  await expect(page.getByText("Ana Verificada")).toBeVisible()
  await expect(page.getByText("perfil de demonstração")).toHaveCount(0)
  await expect(page.locator('[data-tela="voce"]')).toContainText("Manaus")

  await page.getByRole("button", { name: "Editar" }).click()
  await page.getByLabel("Nome").fill("Ana Editada")
  await page.getByLabel("Apresentação").fill("Nova apresentação do teste.")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Ana Editada")).toBeVisible()

  await page.reload()
  await expect(page.getByText("Ana Editada"), "o nome gravado volta no recarregar").toBeVisible()
  await expect(page.getByText("Nova apresentação do teste.")).toBeVisible()

  await page.goto("/app/bloqueados")
  const linha = page.locator('[data-tela="bloqueados"] [data-linha="lista"]')
  await expect(linha).toHaveCount(1)
  await expect(linha).toContainText("Maria Souza")
  await linha.click()
  await expect(page.getByText("Ninguém bloqueado")).toBeVisible()
  await page.reload()
  await expect(
    page.locator('[data-tela="bloqueados"] [data-linha="lista"]'),
    "o desbloqueio precisa sobreviver ao recarregar",
  ).toHaveCount(0)

  await page.goto("/app/ocultados")
  await expect(page.locator('[data-tela="ocultados"] [data-linha="lista"]')).toContainText(
    "Obra na rua das Palmeiras",
  )
  await page.getByText("Mostrar de novo").click()
  await expect(page.getByText("Nada oculto por aqui")).toBeVisible()
})

test("falha de leitura mostra erro com tentar de novo, e a exclusão registra o pedido", async ({
  page,
}) => {
  await simularVoce(page)
  await page.route("**/api/app/voce", (rota) => rota.abort())
  await page.goto("/app/voce")

  const erro = page.locator('[data-estado="erro"]')
  await expect(erro).toBeVisible()
  await expect(erro).toContainText("Não foi possível carregar")
  await expect(page.getByText("Ninguém bloqueado")).toHaveCount(0)

  await page.unroute("**/api/app/voce")
  await page.getByRole("button", { name: "Tentar de novo" }).click()
  await expect(page.getByText("Ana Verificada")).toBeVisible()

  await page.goto("/app/apagar-conta")
  await page.getByLabel("Escreva APAGAR para confirmar").fill("APAGAR")
  await page.getByRole("button", { name: "Apagar minha conta" }).click()
  await expect(page.getByRole("status")).toContainText("Pedido registrado")
  await expect(page.getByRole("status")).toContainText("06/12/2026")
})
