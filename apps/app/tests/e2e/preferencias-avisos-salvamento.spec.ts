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
  const respostasNoApp = secao.getByRole("switch", { name: "Respostas no app" })
  const respostasEmail = secao.getByRole("switch", { name: "Respostas por e-mail" })
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
  const respostasNoApp = secao.getByRole("switch", { name: "Respostas no app" })
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

test("avisos: categorias numa superfície com divisórias e barra de gravar bem formada", async ({
  page,
}) => {
  await page.route(/\/api\/app\/avisos\/preferencias$/, (rota) =>
    rota.fulfill({ json: { preferencias: PREFERENCIAS } }),
  )
  await page.goto("/app/voce")
  const secao = page.locator('[data-preferencias-de-aviso="sim"]')
  const barra = secao.locator('[data-barra="gravar-preferencias"]')
  // A2: uma lista só, sem cartão por categoria.
  await expect(secao.locator('[data-lista="preferencias"]')).toHaveCount(1)
  const raioDasLinhas = await secao
    .locator('[data-lista="preferencias"] > li')
    .evaluateAll((linhas) => linhas.map((linha) => getComputedStyle(linha).borderTopLeftRadius))
  expect(raioDasLinhas.every((raio) => raio === "0px")).toBe(true)
  // A1: sem mudança, a linha diz por que o botão está desligado.
  await expect(barra).toHaveAttribute("data-estado", "limpo")
  await expect(barra).toContainText("Nenhuma alteração para gravar")
  await expect(barra.getByRole("button", { name: "Gravar preferências de avisos" })).toBeDisabled()

  await secao.getByRole("switch", { name: "Respostas no app" }).click()
  await expect(barra).toHaveAttribute("data-estado", "sujo")
  await expect(barra).toContainText("Mudanças não gravadas")
  const estilo = await barra.evaluate((elemento) => {
    const css = getComputedStyle(elemento)
    return { posicao: css.position, sombra: css.boxShadow, borda: css.borderTopWidth }
  })
  expect(estilo).toEqual({ posicao: "sticky", sombra: "none", borda: "1px" })

  // No celular e no tablet, com o fim da seção abaixo da tela, a barra para
  // logo acima da barra de baixo — nem solta no meio, nem por baixo dela.
  await secao
    .locator('[data-preferencia="comments"]')
    .evaluate((elemento) => elemento.scrollIntoView({ block: "end" }))
  await page.waitForTimeout(300)
  const caixa = await barra.boundingBox()
  const nav = await page.locator('[data-nav="principal"]').boundingBox()
  const altura = page.viewportSize()?.height ?? 0
  expect(caixa).not.toBeNull()
  if (!caixa) return
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(altura + 1)
  if (nav && (page.viewportSize()?.width ?? 0) < 1024) {
    expect(Math.abs(caixa.y + caixa.height - nav.y)).toBeLessThanOrEqual(2)
  }
})
