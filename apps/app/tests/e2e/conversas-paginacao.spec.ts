import { expect, test } from "@playwright/test"

test("a caixa impede pagina duplicada e permite tentar novamente sem perder o historico", async ({
  page,
}) => {
  const primeiraConversa = {
    id: "t1",
    nome: "Paulo R.",
    tipo: "listing",
    contextoId: "i3",
    ultima: "Olá",
  }
  const segundaConversa = {
    id: "t2",
    nome: "Amazon Climatização",
    tipo: "provider",
    contextoId: "n1",
    ultima: "Tudo certo",
  }
  let liberar: () => void = () => {
    throw new Error("Leitura ainda nao iniciada")
  }
  const pendente = new Promise<void>((resolve) => {
    liberar = resolve
  })
  let leiturasDaPagina = 0

  await page.route(/\/api\/app\/conversas(?:\?|$)/, async (rota) => {
    const cursor = new URL(rota.request().url()).searchParams.get("depois")
    if (cursor === null) {
      return rota.fulfill({
        json: { conversas: [primeiraConversa], proximo: "pagina-2" },
      })
    }
    expect(cursor).toBe("pagina-2")
    leiturasDaPagina++
    if (leiturasDaPagina === 1) {
      await pendente
      return rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
    }
    return rota.fulfill({ json: { conversas: [segundaConversa], proximo: null } })
  })

  await page.goto("/app/conversas")
  await expect(page.locator('[data-thread="t1"]')).toBeVisible()
  await page.getByRole("button", { name: "Ver mais conversas" }).evaluate((botao) => {
    const alvo = botao as HTMLButtonElement
    alvo.click()
    alvo.click()
  })
  await expect.poll(() => leiturasDaPagina).toBe(1)
  await expect(page.getByRole("button", { name: "Carregando…" })).toBeDisabled()
  liberar()

  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar mais conversas.")
  await expect(page.locator('[data-thread="t1"]')).toBeVisible()
  await page.getByRole("button", { name: "Ver mais conversas" }).click()
  await expect(page.locator('[data-thread="t1"]')).toHaveCount(1)
  await expect(page.locator('[data-thread="t2"]')).toHaveCount(1)
  expect(leiturasDaPagina).toBe(2)
  await expect(page.getByRole("button", { name: "Ver mais conversas" })).toHaveCount(0)
})
