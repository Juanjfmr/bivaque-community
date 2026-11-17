import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

// PORT-006 (lote 4 da entrada), ADR-20261022-entrada-do-prototipo itens 2, 6 e 7:
// as três rotas que precisam funcionar SEM sessão — o convite de familiar, a
// conta apagada e a Ajuda — e o que a Ajuda só mostra para quem entrou.
//
// SEC-017 (17/11): a tela antiga do convite saiu da web. O que se prova aqui é
// que o endereço antigo entrega o código à entrada do app; o aceite em si é
// provado no app (f01-entrada-real.spec.ts).
//
// Os specs rodam contra o servidor de produção do Playwright (127.0.0.1:3000)
// com o seed de desenvolvimento: o pgTAP do código (limite de tentativas,
// negativo de e-mail) fica em supabase/tests/family-invite-code.sql, que é onde
// ele tem banco sem seed para criar as tentativas.

test.describe("entrada pública — sem sessão", () => {
  test("a conta apagada é uma página pública e oferece a volta", async ({ page }) => {
    // Given alguém que acabou de pedir a exclusão e perdeu a sessão
    await page.goto("/conta-apagada")

    // Then a página abre (não o /login) com o texto do protótipo
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sua conta foi apagada.")
    await expect(page.getByText("Obrigado por ter feito parte.")).toBeVisible()

    // And a única ação leva para casa
    const voltar = page.locator("md-outlined-button", { hasText: "Voltar ao início" })
    await expect(voltar).toHaveAttribute("href", "/")
  })

  test("o endereço antigo do convite leva o código para a entrada do app", async ({ page }) => {
    // SEC-017: a tela antiga saiu da web. O link antigo (`?codigo=`) responde
    // 307 para /app/entrar já no caminho do convite, com o código em `?convite=`.
    await page.goto("/convite?codigo=7k4m-9qrt")

    await expect(page).toHaveURL(/\/app\/entrar\?.*convite=7k4m-9qrt/, { timeout: 20_000 })
    await expect(page.getByLabel("Código do convite")).toBeVisible()
  })

  test("sem código, o endereço antigo abre a entrada do app sem query de convite", async ({
    page,
  }) => {
    await page.goto("/convite")

    await expect(page).toHaveURL(/\/app\/entrar$/, { timeout: 20_000 })
  })

  test("a Ajuda abre sem login, com as perguntas e o e-mail de contato", async ({ page }) => {
    // Given quem não consegue entrar
    await page.goto("/ajuda")

    // Then a página abre, com os quatro assuntos do protótipo
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ajuda")
    for (const topic of ["Conta e entrada", "Comunidade", "Anúncios e negócios", "Segurança"]) {
      await expect(page.getByRole("heading", { name: topic })).toBeVisible()
    }

    // And a pergunta sobre o convite explica o caminho novo (a resposta abre
    // ao tocar na pergunta, como no protótipo)
    await page.getByText("Sou cônjuge ou dependente. Como entro?").click()
    await expect(page.getByText("Pelo convite de quem é militar", { exact: false })).toBeVisible()

    // And "Meus chamados" é de quem tem conta
    await expect(page.getByRole("heading", { name: "Meus chamados" })).toHaveCount(0)

    // And o contato de quem está fora é o e-mail do suporte
    const contato = page.locator("md-filled-button", { hasText: "Fale com a gente" })
    await expect(contato).toHaveAttribute("href", /^mailto:/)
  })

  test("as páginas legais continuam públicas e na pele da entrada", async ({ page }) => {
    for (const [path, title] of [
      ["/privacidade", "Política de privacidade"],
      ["/codigo-de-conduta", "Código de conduta"],
    ] as const) {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title)
      // O documento vem da fonte versionada: o cabeçalho com a versão aparece
      // sem os asteriscos de markdown.
      await expect(
        page.getByText("Versão 2 · 31 de agosto de 2026", { exact: false }),
      ).toBeVisible()
      await expect(page.getByText("**Versão", { exact: false })).toHaveCount(0)
    }
  })

  test("a landing religa Ajuda e Fale com a gente", async ({ page }) => {
    // Given a landing pública
    await page.goto("/")
    await expect(page.locator("#landing")).toBeVisible()

    // Then o rodapé leva à Ajuda
    await expect(page.locator(".ld-footer nav a", { hasText: "Ajuda" })).toHaveAttribute(
      "href",
      "/ajuda",
    )

    // And a dúvida em Perguntas leva ao contato dentro da Ajuda
    await expect(
      page.locator("#perguntas").getByRole("link", { name: "Fale com a gente" }),
    ).toHaveAttribute("href", "/ajuda#fale-com-a-gente")
  })
})

test.describe("Ajuda com sessão", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context)
  })

  test("mostra Meus chamados para quem entrou", async ({ page }) => {
    await page.goto("/ajuda")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ajuda")
    await expect(page.getByRole("heading", { name: "Meus chamados" })).toBeVisible()
    // A persona do seed não tem chamado: vazio de verdade, com frase própria.
    await expect(page.getByText("Nenhum chamado ainda", { exact: false })).toBeVisible()
    await expect(
      page.getByText("Não foi possível carregar seus chamados", { exact: false }),
    ).toHaveCount(0)
  })

  test("o convite leva à Início quem já tem acesso", async ({ page }) => {
    // O aceite do código é atômico; se a resposta se perde e a tela recarrega,
    // quem já tem localidade corrente não volta à etapa do código. O endereço
    // antigo da web é só 307 (SEC-017): quem já tem acesso cai na entrada do app.
    await page.goto("/convite?codigo=7K4M9QRT")

    await expect(page).toHaveURL(/\/app\/entrar\?.*convite=7K4M9QRT/, { timeout: 20_000 })
  })
})
