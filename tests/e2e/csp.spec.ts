import { test as base, expect } from "@playwright/test"
import { MEMBRO_SEMEADO, semearSessaoDeMembro } from "./entrada-real-ajuda"

const test = base.extend<{ vigiarCsp: undefined }>({
  vigiarCsp: [
    async ({ page }, use) => {
      const violacoes: string[] = []
      await page.exposeBinding("registrarViolacaoCsp", (_origem, diretiva: string) => {
        violacoes.push(diretiva)
      })
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (evento) => {
          void (
            window as unknown as { registrarViolacaoCsp: (valor: string) => Promise<void> }
          ).registrarViolacaoCsp(evento.violatedDirective)
        })
      })
      page.on("console", (mensagem) => {
        if (mensagem.text().includes("Content Security Policy")) violacoes.push(mensagem.text())
      })
      await use(undefined)
      expect(violacoes, "viola??es de CSP").toEqual([])
    },
    { auto: true },
  ],
})

test("landing e entrada carregam sob CSP", async ({ page }) => {
  const landing = await page.goto("/")
  expect(landing?.headers()["content-security-policy"]).toContain("'strict-dynamic'")
  await expect(page.locator("#landing")).toBeVisible()
  await expect(page.locator("html")).toHaveClass(/ld-js/)
  const nonce = await page
    .locator("script")
    .evaluateAll(
      (scripts) =>
        scripts.find((script) => script.textContent?.includes("classList.add('ld-js')"))?.nonce,
    )
  expect(landing?.headers()["content-security-policy"]).toContain(`'nonce-${nonce}'`)
  await page.reload()
  const novoNonce = await page
    .locator("script")
    .evaluateAll(
      (scripts) =>
        scripts.find((script) => script.textContent?.includes("classList.add('ld-js')"))?.nonce,
    )
  expect(novoNonce).toBeTruthy()
  expect(novoNonce).not.toBe(nonce)
  const entrada = await page.goto("/app/entrar")
  expect(entrada?.headers()["content-security-policy"]).toContain("script-src 'self';")
  await expect(
    page.getByRole("heading", { level: 1, name: "A comunidade militar da sua cidade." }),
  ).toBeVisible()
})

test("jornadas e sa?da mant?m a CSP e o tema", async ({ page, context }) => {
  await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
  for (const [caminho, tela] of [
    ["/app/inicio", "inicio"],
    ["/app/mercado", "desapegos"],
    ["/app/conversas", "conversas"],
    ["/app/voce", "voce"],
  ] as const) {
    const resposta = await page.goto(caminho)
    expect(resposta?.headers()["content-security-policy"]).toContain("script-src 'self';")
    await expect(page.locator(`[data-tela="${tela}"]`)).toBeVisible()
  }
  await page.getByRole("button", { name: "Sair da conta" }).click()
  const saida = page.waitForResponse(
    (resposta) =>
      resposta.url().includes("/api/app/voce/sair") && resposta.request().method() === "POST",
  )
  await page.getByRole("button", { name: "Sair", exact: true }).click()
  const respostaSaida = await saida
  expect(respostaSaida.status()).toBe(200)
  expect((await respostaSaida.allHeaders())["clear-site-data"]).toBe('"cache", "storage"')
  await expect(page).toHaveURL(/\/app\/entrar$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "A comunidade militar da sua cidade." }),
  ).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro")
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#F3F5F6")
})
