import { expect, type Page, test } from "@playwright/test"

/**
 * TROCA-005 — o convite de prestador é estado da ENTRADA, não tela nova: o
 * token chega em `/app/entrar?prestador=…` e a tela cobre válido, inválido e já
 * usado. O aceite usa a sessão; sem sessão, a pessoa entra pelo e-mail. Roda no
 * claro e no escuro.
 */

const TEMAS = ["claro", "escuro"] as const
const TOKEN = "a".repeat(64)

function url(token = TOKEN) {
  return `/app/entrar?prestador=${token}`
}

async function ir(page: Page, caminho: string, tema: (typeof TEMAS)[number]) {
  await page.goto(caminho)
  if (tema === "escuro") {
    await page.evaluate(() => {
      document.documentElement.dataset["tema"] = "escuro"
    })
  }
}

async function convitePendente(page: Page, emailDaSessao: string | null) {
  await page.route(new RegExp(`/api/app/prestador-convite/${TOKEN}$`), async (rota) => {
    if (rota.request().method() === "POST") {
      return rota.fulfill({ json: { aceito: true } })
    }
    return rota.fulfill({
      json: {
        convite: { comunidade: "Comunidade Manaus", estado: "pendente" },
        emailDaSessao,
      },
    })
  })
}

for (const tema of TEMAS) {
  test.describe(`TROCA-005 — convite de prestador na entrada (${tema})`, () => {
    test("convite válido com sessão: aceita e leva ao Meu negócio", async ({ page }) => {
      await convitePendente(page, "prestador@example.invalid")
      await ir(page, url(), tema)
      await expect(
        page.getByRole("heading", { name: "Ofereça seus serviços no Bivaque", level: 1 }),
      ).toBeVisible()
      await expect(page.getByText("Comunidade Manaus indicou você")).toBeVisible()
      await expect(page.getByText("prestador@example.invalid", { exact: false })).toBeVisible()

      await page.getByRole("button", { name: "Aceitar convite" }).click()
      await expect(
        page.getByText("Convite aceito. Sua conta de prestador está pronta."),
      ).toBeVisible()
      await expect(page.getByRole("button", { name: "Abrir Meu negócio" })).toBeVisible()
    })

    test("convite válido sem sessão pede entrar com o e-mail do convite", async ({ page }) => {
      await convitePendente(page, null)
      await ir(page, url(), tema)
      await expect(page.getByRole("button", { name: "Entrar com e-mail" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Aceitar convite" })).toHaveCount(0)
    })

    test("convite já usado diz que foi usado, sem oferecer aceite", async ({ page }) => {
      await page.route(new RegExp(`/api/app/prestador-convite/${TOKEN}$`), (rota) =>
        rota.fulfill({
          json: {
            convite: { comunidade: "Comunidade Manaus", estado: "aceito" },
            emailDaSessao: "prestador@example.invalid",
          },
        }),
      )
      await ir(page, url(), tema)
      await expect(page.getByText("Este convite já foi aceito.")).toBeVisible()
      await expect(page.getByRole("button", { name: "Aceitar convite" })).toHaveCount(0)
    })

    test("convite expirado explica o próximo passo", async ({ page }) => {
      await page.route(new RegExp(`/api/app/prestador-convite/${TOKEN}$`), (rota) =>
        rota.fulfill({
          json: {
            convite: { comunidade: "Comunidade Manaus", estado: "expirado" },
            emailDaSessao: null,
          },
        }),
      )
      await ir(page, url(), tema)
      await expect(page.getByText("Este convite expirou.")).toBeVisible()
    })

    test("token inválido não inventa convite: diz que o endereço não existe", async ({ page }) => {
      await page.route(/\/api\/app\/prestador-convite\/[^/?]+$/, (rota) =>
        rota.fulfill({ status: 404, json: { erro: "convite-nao-encontrado" } }),
      )
      await ir(page, url("b".repeat(64)), tema)
      await expect(page.getByText("Este endereço não existe")).toBeVisible()
    })

    test("a recusa do aceite aparece como frase, não como sucesso", async ({ page }) => {
      await page.route(new RegExp(`/api/app/prestador-convite/${TOKEN}$`), async (rota) => {
        if (rota.request().method() === "POST") {
          return rota.fulfill({
            status: 409,
            json: { erro: "convite-usado", mensagem: "Este convite já foi usado." },
          })
        }
        return rota.fulfill({
          json: {
            convite: { comunidade: "Comunidade Manaus", estado: "pendente" },
            emailDaSessao: "prestador@example.invalid",
          },
        })
      })
      await ir(page, url(), tema)
      await page.getByRole("button", { name: "Aceitar convite" }).click()
      await expect(page.getByRole("alert")).toContainText("Este convite já foi usado.")
      await expect(page.getByText("Convite aceito.")).toHaveCount(0)
    })
  })
}
