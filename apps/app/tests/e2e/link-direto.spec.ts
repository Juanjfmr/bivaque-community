import {
  abaAtiva,
  abrir,
  caminhoAtual,
  esperarCaminho,
  esperarNaPerguntaDificil,
  expect,
  SELETOR_ABRIR_PERGUNTA,
  test,
  tituloDaTela,
} from "./apoio"

test.describe("link direto", () => {
  test("detalhe aberto direto foca o título e Voltar usa o pai declarado", async ({ page }) => {
    await abrir(page, "/app/pergunta/q-de-prova")
    await expect(tituloDaTela(page)).toBeFocused()
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "comunidade")

    await page.locator('[data-acao="voltar"]').click()
    await esperarCaminho(page, "/app/comunidade")
    expect((await caminhoAtual(page)).startsWith("/app/")).toBe(true)
  })

  test("conversa aberta direto volta para a lista de conversas", async ({ page }) => {
    await abrir(page, "/app/conversa/c-1")
    await page.locator('[data-acao="voltar"]').click()
    await esperarCaminho(page, "/app/conversas")
    await expect(tituloDaTela(page)).toHaveText("Conversas")
  })

  test("negócio aberto direto volta para o catálogo de negócios", async ({ page }) => {
    await abrir(page, "/app/negocio/n-1")
    await page.locator('[data-acao="voltar"]').click()
    await esperarCaminho(page, "/app/negocios")
  })

  test("pedido aberto direto volta para os pedidos, sem sair do app", async ({ page }) => {
    await abrir(page, "/app/pedido/p-1")
    await page.locator('[data-acao="voltar"]').click()
    await esperarCaminho(page, "/app/pedidos")
    expect((await caminhoAtual(page)).startsWith("/app/")).toBe(true)
  })

  test("parâmetro Unicode e espaço codifica no clique e recarrega no lugar", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await page.locator(SELETOR_ABRIR_PERGUNTA).click()
    await esperarNaPerguntaDificil(page)

    expect(page.url()).not.toContain(" ")
    expect(new URL(page.url()).search).toBe("")
    await expect(tituloDaTela(page)).toHaveText("Indicação")

    await page.reload()
    await expect(tituloDaTela(page)).toHaveText("Indicação")
    await esperarNaPerguntaDificil(page)
  })

  test("o valor do parâmetro não é confundido com a rota", async ({ page }) => {
    await abrir(page, "/app/conversa/voce")
    expect(await caminhoAtual(page)).toBe("/app/conversa/voce")
    await expect(tituloDaTela(page)).toHaveText("Conversa")
    await expect(page.locator('[data-nav="principal"] [aria-current="page"]')).toHaveCount(0)
  })
})
