import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

// PORT-005 (lote 4 da entrada) — cidade e momento numa tela, e as boas-vindas
// (ADR-20261022-entrada-do-prototipo, item 3; protótipo
// prototypes/bivaque-html/src/features/entry/arrive.js).
//
// O que este spec prova:
//   * a tela tem os cinco campos do protótipo na ordem dele — cidade, momento,
//     a data que o momento pede, destino (só em "Saindo") e "como quer ser
//     chamado" — e o momento troca os campos sem recarregar;
//   * a validação fala as frases do protótipo, e o destino nunca é a cidade
//     atual;
//   * o passo de perfil saiu da entrada e desvia para cá;
//   * as boas-vindas mudam conforme o momento (o caso "moro aqui" é o do membro
//     semeado, que não declarou momento — o padrão do protótipo).
//
// Não cria conta e não escreve no banco: as duas personas são do seed
// (`verified-no-membership` está verificada e ainda não escolheu cidade; a do
// seed visual já é membro de Manaus). O caminho que PROVISIONA de verdade é a
// jornada `journey-entrar-e-ser-admitido.spec.ts`, que cria a conta dela.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const VERIFIED_NO_MEMBERSHIP_EMAIL = "verified-no-membership@bivaque.example.invalid"

async function openCityStep(page: import("@playwright/test").Page): Promise<void> {
  await signInAs(page, VERIFIED_NO_MEMBERSHIP_EMAIL)
  await page.goto(`${APP_URL}/onboarding/locality`, { waitUntil: "load" })
  await expect(page.getByRole("heading", { name: "Onde e em que momento?" })).toBeVisible({
    timeout: 20_000,
  })
}

async function pickCity(page: import("@playwright/test").Page, city: string): Promise<void> {
  await page.getByRole("searchbox", { name: "Cidade" }).fill(city)
  const option = page
    .getByRole("list", { name: "Cidades disponíveis" })
    .getByRole("button", { name: new RegExp(city) })
    .first()
  await expect(option).toBeVisible({ timeout: 20_000 })
  await option.click()
  await expect(option).toHaveAttribute("aria-pressed", "true")
}

test.describe("entrada: cidade e momento", () => {
  test("mostra os campos do protótipo, e o momento troca data e destino", async ({ page }) => {
    await openCityStep(page)

    // O indicador de passo é o do protótipo: o terceiro de três.
    await expect(page.getByText("Passo 3 de 3 · Cidade")).toBeVisible()
    await expect(page.getByRole("searchbox", { name: "Cidade" })).toBeVisible()
    await expect(page.getByText("Isso não publica seu endereço.")).toBeVisible()
    await expect(page.getByRole("radiogroup", { name: "Seu momento" })).toBeVisible()
    await expect(page.getByRole("radio")).toHaveCount(3)
    await expect(page.getByRole("textbox", { name: "Como você quer ser chamado" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Concluir minha entrada" })).toBeVisible()

    // Chegando é o padrão: data de chegada, sem destino.
    await expect(page.getByRole("radio", { name: "Chegando" })).toBeChecked()
    await expect(page.getByLabel("Data de chegada")).toBeVisible()
    await expect(page.getByRole("searchbox", { name: "Destino da transferência" })).toHaveCount(0)

    // Moro aqui não pede data nem destino.
    await page.getByRole("radio", { name: "Moro aqui" }).check()
    await expect(page.locator("#en-date")).toHaveCount(0)
    await expect(page.getByRole("searchbox", { name: "Destino da transferência" })).toHaveCount(0)

    // Saindo pede a data de saída e o destino.
    await page.getByRole("radio", { name: "Saindo" }).check()
    await expect(page.getByLabel("Data da saída")).toBeVisible()
    await expect(page.getByRole("searchbox", { name: "Destino da transferência" })).toBeVisible()
    await expect(page.getByRole("list", { name: "Cidades de destino" })).toBeVisible()
  })

  test("a validação fala como o protótipo, na ordem do protótipo", async ({ page }) => {
    await openCityStep(page)

    // Sem cidade, a primeira frase do protótipo.
    await page.getByRole("button", { name: "Concluir minha entrada" }).click()
    await expect(page.getByRole("alert")).toHaveText("Escolha sua cidade.")

    await pickCity(page, "Manaus")

    // Saindo sem data de saída.
    await page.getByRole("radio", { name: "Saindo" }).check()
    await page.getByRole("button", { name: "Concluir minha entrada" }).click()
    await expect(page.getByRole("alert")).toHaveText("Informe a data da saída.")

    // Com data, mas sem destino.
    await page.locator("#en-date").fill("2030-03-10")
    await page.getByRole("button", { name: "Concluir minha entrada" }).click()
    await expect(page.getByRole("alert")).toHaveText(
      "Escolha um destino diferente da sua cidade atual.",
    )
    // O destino nunca repete a cidade atual: a lista não oferece Manaus.
    await page.getByRole("searchbox", { name: "Destino da transferência" }).fill("Manaus")
    await expect(page.getByRole("list", { name: "Cidades de destino" })).toHaveCount(0)
    await expect(page.getByText(/Nenhuma cidade encontrada/)).toBeVisible()

    // A data de chegada volta a ser obrigatória em "Chegando".
    await page.getByRole("radio", { name: "Chegando" }).check()
    await page.getByRole("button", { name: "Concluir minha entrada" }).click()
    await expect(page.getByRole("alert")).toHaveText("Informe a data de chegada.")
  })

  test("o passo de perfil saiu da entrada e desvia para a cidade", async ({ page }) => {
    await signInAs(page, VERIFIED_NO_MEMBERSHIP_EMAIL)
    await page.goto(`${APP_URL}/onboarding/perfil`, { waitUntil: "load" })
    await expect(page).toHaveURL(/\/onboarding\/locality$/, { timeout: 20_000 })
    await expect(page.getByRole("heading", { name: "Onde e em que momento?" })).toBeVisible()
  })
})

test.describe("boas-vindas conforme o momento", () => {
  test("quem mora na cidade vê o guia da cidade, não um plano", async ({ page }) => {
    // A conta do seed não declarou momento: o padrão é "moro aqui", o mesmo do
    // protótipo.
    await signInAs(page, process.env["USER_EMAIL"] ?? "visual@bivaque.example.invalid")
    await page.goto(`${APP_URL}/onboarding/welcome`, { waitUntil: "load" })

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Você chegou ao Bivaque.", {
      timeout: 20_000,
    })
    await expect(
      page.getByText("O que a comunidade de Manaus indica já está à sua espera."),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /Conhecer Manaus/ })).toHaveAttribute(
      "href",
      "/guide",
    )
    await expect(page.getByRole("link", { name: /Entrar na comunidade/ })).toHaveAttribute(
      "href",
      "/community",
    )
  })
})
