import { expect, test } from "@playwright/test"
import { simulateJourney } from "./helpers/journey"
import { signInAs } from "./helpers/session"

// Jornada simulada — web-entrar-e-ser-admitido + web-operar-admissoes (pranchas 36–39 e 57).
//
// Quem chega cria uma conta NOVA a cada execução, então esta jornada não depende de estado que
// outro spec escreve nem altera persona semeada. Ela anda até onde o ambiente local deixa, e diz
// onde parou, com o motivo medido:
//
//   * 37 (confirmar e-mail): o stack local tem enable_confirmations = false, então o cadastro
//     entra direto e a tela de confirmação não aparece. Lacuna do ambiente, não do app.
//   * 38#0 (verificar acesso): observada. Sem PORTAL_DADOS_API_KEY a verificação por CPF cai no
//     erro temporário — o mesmo caminho seguro de um Portal fora do ar.
//   * Identidade: desde o ADR-20260922-identidade-quando-portal-falha, o erro temporário oferece
//     "Enviar identidade agora", e a pessoa envia o arquivo. Antes, com o Portal fora, ninguém seguia.
//   * 39 (cidade e personalização): lacuna. A aprovação do documento exige cidade que o fluxo só
//     pede depois — ONB-IDENTIDADE-SEM-CIDADE.
//
// O segundo teste: o operador analisa uma solicitação semeada sem decidir, porque decidir
// mudaria a fila que outros specs leem. A aprovação do primeiro teste é sobre a conta nova dele.
//
// @stateful: cria uma conta no Auth local.

const OPERATOR = "operador@bivaque.example.invalid"
// PNG 1x1 válido: basta para a checagem de tipo e tamanho do envio de identidade.
const IDENTITY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

test.describe("jornada simulada: entrar e ser admitido", { tag: "@stateful" }, () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "jornada das pranchas web")
  test.setTimeout(180_000)

  test("visitante entra e, com o Portal fora, envia a identidade", async ({ page }, testInfo) => {
    const email = `jornada-${Date.now().toString(36)}@bivaque.example.invalid`
    const entrar = simulateJourney(testInfo, "web-entrar-e-ser-admitido")

    await entrar.passo(
      "36-web-auth-entrada#0",
      page,
      async () => {
        await page.goto("/login")
        await expect(
          page.getByRole("heading", { level: 1, name: "Que bom ter você de volta." }),
        ).toBeVisible({ timeout: 20_000 })
        await expect(page.getByLabel("E-mail")).toBeVisible()
        await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
      },
      { persona: "visitante" },
    )

    await entrar.passo(
      "36-web-auth-entrada#1",
      page,
      async () => {
        await page.getByRole("link", { name: "Criar conta" }).click()
        await expect(page.getByRole("heading", { level: 1, name: "Vamos começar." })).toBeVisible()
        const submit = page.getByRole("button", { name: "Criar conta" })
        await page.getByLabel("Nome").fill("Pessoa Simulada")
        await page.getByLabel("E-mail").fill(email)
        await page.getByRole("textbox", { name: /^Senha/ }).fill(`senha-${Date.now()}`)
        // O botão só libera depois do aceite: aceitar é parte do cadastro, não um passo à parte.
        await expect(submit).toBeDisabled()
        await page.getByRole("checkbox").check()
        await expect(submit).toBeEnabled()
      },
      { persona: "visitante" },
    )

    await page.getByRole("button", { name: "Criar conta" }).click()

    entrar.lacuna(
      "37-web-auth-confirmacao#0",
      "o stack local roda com enable_confirmations = false: o cadastro entra direto e a " +
        "confirmação de e-mail não aparece; só um ambiente com confirmação ligada observa esta tela",
    )

    await entrar.passo(
      "38-web-auth-admissao#0",
      page,
      async () => {
        await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 })
        await expect(
          page.getByRole("heading", { level: 1, name: "Verificar meu acesso" }),
        ).toBeVisible()
        await expect(page.getByRole("navigation", { name: "Seu progresso" })).toContainText(
          "Concluído",
        )
        await page.getByLabel("CPF").fill("123.456.789-09")
        await page.getByRole("button", { name: "Verificar acesso" }).click()
        // Erro temporário: mensagem segura, sem dado do Portal, e a pessoa continua na tela.
        await expect(page.getByRole("alert").filter({ hasText: "instabilidade" })).toBeVisible({
          timeout: 20_000,
        })
        await expect(page).toHaveURL(/\/onboarding$/)
      },
      { persona: "visitante" },
    )

    // ADR-20260922-identidade-quando-portal-falha: com o Portal fora, a identidade é
    // oferecida na hora. A pessoa envia um arquivo único e completo, e segue.
    await page.getByRole("link", { name: "Enviar identidade agora" }).click()
    await expect(page).toHaveURL(/\/onboarding\/documento$/)
    await page.getByLabel("Documento para análise").setInputFiles({
      name: "identidade.png",
      mimeType: "image/png",
      buffer: IDENTITY_PNG,
    })
    await page.getByRole("button", { name: "Enviar para análise" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Documento enviado" })).toBeVisible({
      timeout: 20_000,
    })

    // Aprovar o documento ainda não fecha o ciclo: decide_verification_document só aprova quem
    // já tem cidade, e o onboarding só pede a cidade depois da verificação. Defeito anterior ao
    // ADR, registrado em ONB-IDENTIDADE-SEM-CIDADE — não afirmado aqui, para não travá-lo.
    const IDENTITY_APPROVAL_BLOCKED =
      "aprovar o documento exige cidade já escolhida (decide_verification_document: 'cannot " +
      "approve: no locality for the user'), mas o onboarding só pede a cidade depois da " +
      "verificação; ninguém admitido por identidade chega aqui — ONB-IDENTIDADE-SEM-CIDADE"
    entrar.lacuna("39-web-onboarding-contexto#0", IDENTITY_APPROVAL_BLOCKED)
    entrar.lacuna("39-web-onboarding-contexto#1", IDENTITY_APPROVAL_BLOCKED)
    entrar.concluir()
  })

  test("operador abre e analisa uma solicitação da fila", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await signInAs(context, OPERATOR)
    const page = await context.newPage()
    const operar = simulateJourney(testInfo, "web-operar-admissoes")

    try {
      await operar.passo(
        "57-web-operacao-admissoes#0",
        page,
        async () => {
          await page.goto("/admissions")
          await expect(
            page.getByRole("heading", { level: 1, name: "Fila de admissões" }),
          ).toBeVisible({ timeout: 20_000 })
          await expect(page.getByRole("table", { name: /Solicitações de admissão/ })).toBeVisible()
          await expect(
            page.getByRole("row").filter({ hasText: "Em análise" }).first(),
          ).toBeVisible()
        },
        { persona: "operador" },
      )

      await operar.passo(
        "57-web-operacao-admissoes#1",
        page,
        async () => {
          await page
            .getByRole("row")
            .filter({ hasText: "Em análise" })
            .first()
            .getByRole("link", { name: "Abrir" })
            .click()
          await expect(page).toHaveURL(/\/admissions\/[0-9a-f-]+/)
          await expect(page.getByRole("region", { name: "Resumo da verificação" })).toBeVisible({
            timeout: 20_000,
          })
          await expect(page.getByRole("region", { name: "Ações" })).toBeVisible()
          await expect(page.getByRole("region", { name: "Linha do tempo" })).toBeVisible()
          // Prancha 57: só o necessário ao operador — nenhum CPF na tela de análise.
          await expect(page.getByText(/\d{3}\.\d{3}\.\d{3}-\d{2}/)).toHaveCount(0)
        },
        { persona: "operador" },
      )

      operar.concluir()
    } finally {
      await context.close()
    }
  })
})
