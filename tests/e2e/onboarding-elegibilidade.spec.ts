import { expect, test } from "@playwright/test"
import { stubVerificationStatus } from "./helpers/onboarding-status"
import { seedSession } from "./helpers/session"

// PORT-004 (lote 4, frente B) — a elegibilidade como no protótipo
// (prototypes/bivaque-html/src/features/entry/account.js: `renderEntryCpf` e
// `renderEntryResult`).
//
// Os estados de resultado dependem da fonte oficial: sem PORTAL_DADOS_API_KEY o
// stack local cai sempre em erro temporário, e o "não localizado" só aparece
// com um CPF que a fonte não conhece. Para provar os três desenhos — e não só o
// que o ambiente permite alcançar — a resposta da conferência é fixada no
// transporte, com o mesmo corpo que `/api/onboarding` devolve. A jornada com a
// rota de verdade (e a análise pendente) está em
// journey-entrar-e-ser-admitido.spec.ts.
//
// Read-only: nenhum teste aqui grava linha.

const VALID_CPF = "123.456.789-09"

async function openCpf(
  page: import("@playwright/test").Page,
  status: null | "rejected" | "temporary_error" = null,
): Promise<void> {
  await seedSession(page.context())
  await stubVerificationStatus(page, status)
  await page.goto("/onboarding")
}

async function stubOutcome(
  page: import("@playwright/test").Page,
  outcome: Record<string, unknown>,
): Promise<void> {
  await page.route("**/api/onboarding", (route) =>
    route.fulfill({ body: JSON.stringify({ outcome }), contentType: "application/json" }),
  )
}

test.describe("elegibilidade: CPF", () => {
  test("segue o protótipo: CPF direto, Por que o CPF e o convite do familiar", async ({ page }) => {
    await openCpf(page)

    await expect(
      page.getByRole("heading", { level: 1, name: "Confirme seu vínculo." }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/Passo 2 de 3 · Elegibilidade/)).toBeVisible()
    await expect(
      page.getByText("Para militares federais ativos, veteranos e pensionistas militares."),
    ).toBeVisible()

    // A pergunta do tipo de vínculo saiu da tela.
    await expect(page.getByText("Como você deseja verificar seu acesso?")).toHaveCount(0)
    await expect(page.getByRole("radio")).toHaveCount(0)

    await expect(page.locator("#onboarding-cpf input")).toBeVisible()

    // O bloco "Por que o CPF" diz o que acontece com o número.
    await expect(page.getByText("Por que o CPF")).toBeVisible()
    await expect(page.getByText(/O número não fica salvo\./)).toBeVisible()

    // O convite de familiar é a outra porta, e é pública.
    await expect(page.getByRole("link", { name: /É cônjuge ou dependente\?/ })).toHaveAttribute(
      "href",
      "/convite",
    )

    // Um único h1 na tela.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
  })

  test("CPF inválido é barrado antes de consultar a fonte oficial", async ({ page }) => {
    let requests = 0
    await openCpf(page)
    await page.route("**/api/onboarding", async (route) => {
      requests += 1
      await route.abort()
    })

    // CPF sintético com o último dígito verificador errado: o valor é recusado
    // pela validação local, e o scanner de segredos não o confunde com um CPF
    // de verdade (o repetido usado antes tinha dígitos verificadores válidos).
    await page.locator("#onboarding-cpf input").fill("123.456.789-00")
    await page.locator("#onboarding-cpf-submit").click()

    await expect(page.getByText("CPF inválido. Confira os 11 dígitos.")).toBeVisible()
    expect(requests).toBe(0)
    // A pessoa continua no formulário, com o campo para corrigir.
    await expect(
      page.getByRole("heading", { level: 1, name: "Confirme seu vínculo." }),
    ).toBeVisible()
  })
})

test.describe("elegibilidade: resultado", () => {
  test("vínculo não localizado pede um documento, e o CPF pode ser conferido de novo", async ({
    page,
  }) => {
    await openCpf(page)
    await stubOutcome(page, { status: "rejected" })

    await page.locator("#onboarding-cpf input").fill(VALID_CPF)
    await page.locator("#onboarding-cpf-submit").click()

    await expect(
      page.getByRole("heading", { level: 1, name: "Não localizamos o vínculo." }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByText(/A fonte oficial não confirmou o vínculo deste CPF\./),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /Enviar um documento/ })).toHaveAttribute(
      "href",
      "/onboarding/documento",
    )

    // O CPF não permanece na tela depois do resultado.
    await expect(page.locator("#onboarding-cpf input")).toHaveCount(0)

    await page.locator("#onboarding-cpf-retry").click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Confirme seu vínculo." }),
    ).toBeVisible()
    await expect(page.locator("#onboarding-cpf input")).toHaveValue("")
  })

  test("fonte oficial fora do ar oferece Tentar de novo e a identidade", async ({ page }) => {
    await openCpf(page)
    await stubOutcome(page, { errorCode: "INVALID_KEY", status: "temporary_error" })

    await page.locator("#onboarding-cpf input").fill(VALID_CPF)
    await page.locator("#onboarding-cpf-submit").click()

    await expect(
      page.getByRole("heading", { level: 1, name: "Não conseguimos consultar agora." }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByText("A fonte oficial está fora do ar. Tente de novo em alguns minutos."),
    ).toBeVisible()
    // ADR-20260922-identidade-quando-portal-falha: sem esperar a fonte, a pessoa
    // pode enviar o documento na hora.
    await expect(page.getByRole("link", { name: /Enviar um documento/ })).toBeVisible()

    await page.locator("#onboarding-retry").click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Confirme seu vínculo." }),
    ).toBeVisible()
    await expect(page.locator("#onboarding-cpf input")).toHaveValue("")
  })

  test("quem volta com o vínculo já recusado vê o resultado, não o formulário", async ({
    page,
  }) => {
    await openCpf(page, "rejected")

    await expect(
      page.getByRole("heading", { level: 1, name: "Não localizamos o vínculo." }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.locator("#onboarding-cpf input")).toHaveCount(0)
  })

  test("quem volta com a fonte fora do ar vê o resultado com Tentar de novo", async ({ page }) => {
    // `entryNext()` do protótipo trata `error` como resultado, não como
    // formulário: a mesma situação tem o mesmo desenho ao recarregar.
    await openCpf(page, "temporary_error")

    await expect(
      page.getByRole("heading", { level: 1, name: "Não conseguimos consultar agora." }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.locator("#onboarding-retry")).toBeVisible()
  })
})
