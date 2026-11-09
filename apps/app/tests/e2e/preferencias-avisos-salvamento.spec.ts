import { expect, test } from "@playwright/test"

const PREFERENCIAS = {
  comments: true,
  events: false,
  productNews: false,
  indications: false,
  resumoCidade: "off",
  channels: [
    { notificationType: "comments", channel: "in_app", enabled: true },
    { notificationType: "comments", channel: "email", enabled: false },
  ],
}

test("avisos: bloqueia edição enquanto salva e não envia PATCH duplicado", async ({ page }) => {
  let liberar: () => void = () => {
    throw new Error("Salvamento não iniciado")
  }
  const respostaPendente = new Promise<void>((resolve) => {
    liberar = resolve
  })
  const escritas: unknown[] = []
  await page.route(/\/api\/app\/avisos\/preferencias$/, async (rota) => {
    if (rota.request().method() === "GET") {
      await rota.fulfill({ json: { preferencias: PREFERENCIAS } })
      return
    }
    const enviado = rota.request().postDataJSON() as unknown
    escritas.push(enviado)
    await respostaPendente
    await rota.fulfill({ json: { preferencias: enviado } })
  })

  await page.goto("/app/voce")
  const secao = page.locator('[data-preferencias-de-aviso="sim"]')
  const respostas = secao.getByRole("checkbox", { name: "Avisos de respostas" })
  const noticias = secao.getByRole("checkbox", { name: "Novidades do Bivaque" })
  const gravar = secao.getByRole("button", { name: "Gravar preferências de avisos" })

  await expect(respostas).toBeChecked()
  await respostas.click()
  await expect(respostas).not.toBeChecked()
  await gravar.click()
  await expect.poll(() => escritas.length).toBe(1)
  await expect(secao).toHaveAttribute("aria-busy", "true")
  await expect(respostas).toBeDisabled()
  await expect(noticias).toBeDisabled()
  await expect(gravar).toBeDisabled()
  liberar()
  await expect(secao).toHaveAttribute("aria-busy", "false")
  await expect(respostas).not.toBeChecked()
  expect(escritas).toHaveLength(1)
})

test("avisos: falha de gravação preserva escolha e permite nova tentativa", async ({ page }) => {
  let tentativas = 0
  await page.route(/\/api\/app\/avisos\/preferencias$/, async (rota) => {
    if (rota.request().method() === "GET") {
      await rota.fulfill({ json: { preferencias: PREFERENCIAS } })
      return
    }
    tentativas += 1
    if (tentativas === 1) {
      await rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
      return
    }
    await rota.fulfill({ json: { preferencias: rota.request().postDataJSON() } })
  })

  await page.goto("/app/voce")
  const secao = page.locator('[data-preferencias-de-aviso="sim"]')
  const respostas = secao.getByRole("checkbox", { name: "Avisos de respostas" })
  const gravar = secao.getByRole("button", { name: "Gravar preferências de avisos" })
  await respostas.click()
  await gravar.click()
  await expect.poll(() => tentativas).toBe(1)
  await expect(gravar).toBeEnabled()
  await expect(respostas).not.toBeChecked()
  await gravar.click()
  await expect.poll(() => tentativas).toBe(2)
  await expect(gravar).toBeDisabled()
  await expect(respostas).not.toBeChecked()
})
