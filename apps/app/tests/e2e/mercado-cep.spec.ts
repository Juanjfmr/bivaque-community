import { expect, test } from "@playwright/test"

import { aplicarStubMercado } from "./stub-mercado"

/**
 * RUN-175 — o CEP no anúncio de imóvel, na tela real sobre API simulada.
 *
 * O que esta prova cobre:
 *   * sem CEP o formulário NÃO publica: o erro fica no campo que o originou;
 *   * com endereço e escolha "Endereço exato", o anúncio publicado mostra o
 *     endereço no detalhe e some a frase "pode ser combinado na conversa";
 *   * sem endereço só existe o local aproximado, e o detalhe diz isso.
 */
test.beforeEach(async ({ page }) => {
  aplicarStubMercado(page)
})

async function abrirFormulario(page: import("@playwright/test").Page) {
  await page.goto("/app/imoveis")
  await page.locator('[data-acao="anunciar-imovel"]').click()
  const folha = page.locator('[data-fluxo="rascunho-imovel"]')
  await expect(folha).toBeVisible()
  return folha
}

async function preencher(
  folha: import("@playwright/test").Locator,
  dados: { cep?: string; endereco?: string },
) {
  await folha.locator("#imovel-titulo").fill("Apartamento 2 quartos no Centro")
  if (dados.cep !== undefined) await folha.locator("#imovel-cep").fill(dados.cep)
  await folha.locator("#imovel-bairro").fill("Centro")
  await folha.locator("#imovel-preco").fill("1800")
  if (dados.endereco !== undefined) await folha.locator("#imovel-endereco").fill(dados.endereco)
}

test("imóvel sem CEP não publica: o erro fica no campo do CEP", async ({ page }) => {
  const folha = await abrirFormulario(page)
  await preencher(folha, { endereco: "" })

  await folha.locator('[data-acao="publicar-imovel"]').click()

  await expect(folha.getByRole("alert")).toContainText("Informe o CEP do imóvel.")
  // Continua na folha, com o que foi digitado preservado.
  await expect(folha).toBeVisible()
  await expect(folha.locator("#imovel-titulo")).toHaveValue("Apartamento 2 quartos no Centro")
  await expect(page).toHaveURL(/\/app\/imoveis$/)
})

test("CEP exato publica o endereço escolhido no detalhe", async ({ page }) => {
  const folha = await abrirFormulario(page)
  await preencher(folha, { cep: "69000-000", endereco: "Rua das Flores, 100" })

  await folha.locator('[data-selecao="imovel-localizacao"]').click()
  await page.getByRole("option", { name: "Endereço exato", exact: true }).click()

  await folha.locator('[data-acao="publicar-imovel"]').click()

  await expect(page).toHaveURL(/\/app\/anuncio\/p-1$/)
  await expect(page.getByText("Rua das Flores, 100")).toBeVisible()
  // A frase que prometia combinar o endereço na conversa não existe mais.
  await expect(page.getByText("combinado na conversa")).toHaveCount(0)
})

test("sem endereço só existe o local aproximado, e o detalhe diz isso", async ({ page }) => {
  const folha = await abrirFormulario(page)
  await preencher(folha, { cep: "69000-000", endereco: "" })

  await folha.locator('[data-selecao="imovel-localizacao"]').click()
  await expect(page.getByRole("option", { name: "Local aproximado", exact: true })).toBeVisible()
  await expect(page.getByRole("option", { name: "Endereço exato", exact: true })).toHaveCount(0)
  await page.keyboard.press("Escape")

  await folha.locator('[data-acao="publicar-imovel"]').click()

  await expect(page).toHaveURL(/\/app\/anuncio\/p-1$/)
  await expect(page.getByText("Local aproximado, sem o endereço exato.")).toBeVisible()
  await expect(page.getByText("Centro, Manaus")).toBeVisible()
})
