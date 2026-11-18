import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

// PORT-006 (lote 4 da entrada), ADR-20261022-entrada-do-prototipo itens 2, 6 e 7:
// as três rotas que precisam funcionar SEM sessão — o convite de familiar, a
// conta apagada e a Ajuda — e o que a Ajuda só mostra para quem entrou.
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

  // SEC-017: a tela antiga /convite saiu da web. O link antigo leva o código à
  // porta do app, que aceita o convite sem senha e sem CPF (o fluxo inteiro está
  // em f01-entrada-real.spec.ts).
  test("o link antigo do convite abre a porta do app com o código", async ({ page }) => {
    // Given o link antigo que o titular copiava, já com o código
    await page.goto("/convite?codigo=7k4m-9qrt")

    // Then a porta do app abre no caminho do convite, com o código do link
    await expect(page).toHaveURL(/\/app\/entrar/)
    await expect(page.getByLabel("Código do convite")).toBeVisible({ timeout: 20_000 })
  })

  test("o link antigo sem código cai na porta do app, sem senha", async ({ page }) => {
    await page.goto("/convite?legado=1")

    await expect(page).toHaveURL(/\/app\/entrar/)
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
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

  test("o link antigo do convite leva à Início quem já tem acesso", async ({ page }) => {
    // Quem já tem localidade corrente não volta à etapa do código: o link antigo
    // passa pela porta do app, que segue para a Início (SEC-017).
    await page.goto("/convite?codigo=7K4M9QRT")

    await expect(page).toHaveURL(/\/app\/inicio$/, { timeout: 20_000 })
  })
})
