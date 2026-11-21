import { expect, type Page, test } from "@playwright/test"

/**
 * TROCA-005 — a Ajuda do app: lista única com Meus chamados e Minhas denúncias,
 * a denúncia nova na Folha única e o acompanhamento no detalhe. O denunciante
 * vê o próprio motivo e a própria explicação; nada identifica quem denunciou.
 * Roda no claro e no escuro.
 */

const TEMAS = ["claro", "escuro"] as const
const DENUNCIA = "50000000-0000-4000-8000-0000000000f1"
const POST = "50000000-0000-4000-8000-0000000000a1"
const GRUPO = "50000000-0000-4000-8000-0000000000a3"

const denuncia = {
  id: DENUNCIA,
  targetType: "post",
  targetLabel: "Publicação",
  targetPreview: "Oferta repetida de serviço",
  targetHref: `/app/publicacao/${POST}`,
  reason: "Spam: Oferta repetida",
  status: "open",
  createdAt: "2026-11-05T12:00:00Z",
  resolvedAt: null,
}

async function ir(page: Page, caminho: string, tema: (typeof TEMAS)[number]) {
  await page.goto(caminho)
  if (tema === "escuro") {
    await page.evaluate(() => {
      document.documentElement.dataset["tema"] = "escuro"
    })
  }
}

async function montarDenuncias(page: Page) {
  const enviadas: (typeof denuncia)[] = []
  await page.route(/\/api\/app\/denuncias\/alvos$/, (rota) =>
    rota.fulfill({
      json: {
        alvos: [
          { tipo: "post", id: POST, titulo: "Oferta repetida de serviço" },
          { tipo: "group", id: GRUPO, titulo: "Vizinhos do Centro" },
        ],
      },
    }),
  )
  await page.route(/\/api\/app\/denuncias$/, async (rota) => {
    if (rota.request().method() === "POST") {
      enviadas.push(denuncia)
      return rota.fulfill({ status: 201, json: { denuncia: { id: DENUNCIA } } })
    }
    return rota.fulfill({ json: { denuncias: enviadas } })
  })
  await page.route(new RegExp(`/api/app/denuncias/${DENUNCIA}$`), (rota) =>
    rota.fulfill({
      json: {
        denuncia: {
          ...denuncia,
          motivo: { label: "Spam", explanation: "Oferta repetida" },
        },
      },
    }),
  )
}

for (const tema of TEMAS) {
  test.describe(`TROCA-005 — Ajuda com denúncias (${tema})`, () => {
    test("denuncia na Folha e acompanha o desfecho no detalhe", async ({ page }) => {
      await montarDenuncias(page)
      await ir(page, "/app/ajuda?aba=denuncias", tema)
      await expect(page.getByRole("heading", { name: "Ajuda", level: 1 })).toBeVisible()
      await expect(page.getByText("Nenhuma denúncia enviada")).toBeVisible()

      await page.getByRole("button", { name: "Nova denúncia" }).first().click()
      const nova = page.locator('[data-sobreposicao="denuncia-nova"]')
      await expect(nova).toBeVisible()

      await page.getByRole("radio", { name: /Oferta repetida de serviço/ }).check()
      await page.getByRole("radio", { name: "Spam" }).check()
      await page.getByLabel("Explique (opcional)").fill("Oferta repetida")
      await page.getByRole("button", { name: "Enviar denúncia" }).click()

      await expect(page.locator('[data-sobreposicao="denuncia-nova"]')).toHaveCount(0)
      const linha = page.locator('[data-linha="lista"]', {
        hasText: "Oferta repetida de serviço",
      })
      await expect(linha).toBeVisible()

      await linha.click()
      const detalhe = page.locator('[data-sobreposicao="denuncia-detalhe"]')
      await expect(detalhe).toBeVisible()
      await expect(detalhe.getByText("Em análise")).toBeVisible()
      await expect(detalhe.getByText("Spam", { exact: true })).toBeVisible()
      await expect(detalhe.getByText("Oferta repetida", { exact: true })).toBeVisible()
    })

    test("a denúncia não identifica o denunciante na tela", async ({ page }) => {
      await montarDenuncias(page)
      await ir(page, "/app/ajuda?aba=denuncias", tema)
      await page.getByRole("button", { name: "Nova denúncia" }).first().click()
      await page.getByRole("radio", { name: /Oferta repetida de serviço/ }).check()
      await page.getByRole("radio", { name: "Spam" }).check()
      await page.getByRole("button", { name: "Enviar denúncia" }).click()

      await page.locator('[data-linha="lista"]', { hasText: "Oferta repetida de serviço" }).click()
      const detalhe = page.locator('[data-sobreposicao="denuncia-detalhe"]')
      await expect(detalhe).toBeVisible()
      await expect(detalhe).not.toContainText("Denunciante")
      await expect(detalhe).not.toContainText("Autor da denúncia")
    })

    test("a falha principal da lista é erro honesto, não vazio", async ({ page }) => {
      await page.route(/\/api\/app\/denuncias$/, (rota) =>
        rota.fulfill({ status: 503, json: { erro: "leitura-indisponivel" } }),
      )
      await ir(page, "/app/ajuda?aba=denuncias", tema)
      await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible()
      await expect(page.getByText("Nenhuma denúncia enviada")).toHaveCount(0)
    })

    test("sem alvos, a Folha explica onde denunciar em vez de fingir um formulário", async ({
      page,
    }) => {
      await page.route(/\/api\/app\/denuncias$/, (rota) =>
        rota.fulfill({ json: { denuncias: [] } }),
      )
      await page.route(/\/api\/app\/denuncias\/alvos$/, (rota) =>
        rota.fulfill({ json: { alvos: [] } }),
      )
      await ir(page, "/app/ajuda?aba=denuncias", tema)
      await page.getByRole("button", { name: "Nova denúncia" }).first().click()
      await expect(
        page.getByText("Abra o conteúdo que quer denunciar, use Denunciar no menu dele"),
      ).toBeVisible()
      await expect(page.getByRole("button", { name: "Enviar denúncia" })).toHaveCount(0)
    })

    test("chamados e denúncias dividem a mesma lista, sem tela nova", async ({ page }) => {
      await montarDenuncias(page)
      await ir(page, "/app/ajuda", tema)
      await expect(page.getByRole("button", { name: "Meus chamados" })).toHaveAttribute(
        "aria-current",
        "page",
      )
      await page.getByRole("button", { name: "Minhas denúncias" }).click()
      await expect(page).toHaveURL(/\/app\/ajuda\?aba=denuncias$/)
      await expect(page.getByRole("button", { name: "Minhas denúncias" })).toHaveAttribute(
        "aria-current",
        "page",
      )
    })
  })
}
