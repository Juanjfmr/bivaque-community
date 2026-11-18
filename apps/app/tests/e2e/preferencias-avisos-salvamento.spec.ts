import { expect, test } from "@playwright/test"

const PREFERENCIAS = {
  comments: true,
  events: false,
  productNews: false,
  indications: false,
  messages: true,
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
  // D15: um controle por decisão — o interruptor é do canal.
  const respostasNoApp = secao.getByRole("switch", { name: "Avisos de respostas por no app" })
  const respostasEmail = secao.getByRole("switch", { name: "Avisos de respostas por e-mail" })
  const gravar = secao.getByRole("button", { name: "Gravar preferências de avisos" })

  await expect(respostasNoApp).toBeChecked()
  await respostasNoApp.click()
  await expect(respostasNoApp).not.toBeChecked()
  await gravar.click()
  await expect.poll(() => escritas.length).toBe(1)
  await expect(secao).toHaveAttribute("aria-busy", "true")
  await expect(respostasNoApp).toBeDisabled()
  await expect(respostasEmail).toBeDisabled()
  await expect(gravar).toBeDisabled()
  liberar()
  await expect(secao).toHaveAttribute("aria-busy", "false")
  await expect(respostasNoApp).not.toBeChecked()
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
  const respostasNoApp = secao.getByRole("switch", { name: "Avisos de respostas por no app" })
  const gravar = secao.getByRole("button", { name: "Gravar preferências de avisos" })
  await respostasNoApp.click()
  await gravar.click()
  await expect.poll(() => tentativas).toBe(1)
  await expect(gravar).toBeEnabled()
  await expect(respostasNoApp).not.toBeChecked()
  await gravar.click()
  await expect.poll(() => tentativas).toBe(2)
  await expect(gravar).toBeDisabled()
  await expect(respostasNoApp).not.toBeChecked()
})
