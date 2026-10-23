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
//   * 38#0 (elegibilidade): observada. Sem PORTAL_DADOS_API_KEY a verificação por CPF cai no
//     erro temporário — o mesmo caminho seguro de um Portal fora do ar, que desde a PORT-004 é
//     uma tela de resultado própria ("Não conseguimos consultar agora."), com "Tentar de novo" e
//     o caminho do documento.
//   * Identidade: desde o ADR-20260922-identidade-quando-portal-falha, o erro temporário oferece
//     o envio do documento, e a pessoa envia o arquivo. Antes, com o Portal fora, ninguém seguia.
//     O envio leva à análise pendente, que também guarda a preferência "Avise-me quando liberar".
//   * 39 (cidade e personalização): observadas desde o ADR-20260922-aprovacao-por-identidade-sem-
//     cidade. O operador aprova sem cidade, e a pessoa escolhe a cidade depois, como no CPF.
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

  test("visitante entra, é admitida por identidade e escolhe a cidade", async ({
    page,
    browser,
  }, testInfo) => {
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
        // O rótulo do campo é "Senha"; a regra vai como texto de apoio, então
        // `exact` separa os dois na árvore de acessibilidade.
        await page.getByLabel("Senha", { exact: true }).fill(`senha-${Date.now()}`)
        // O botão fica ativo, como na especificação, e o envio sem aceite é
        // recusado com a explicação — aceitar é parte do cadastro, não um passo
        // à parte.
        await submit.click()
        await expect(page.locator("#en-err")).toContainText("aceite a Política de privacidade")
        await page.getByRole("checkbox").check()
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
        // PORT-004 (frente B): a tela é a do protótipo — CPF direto, sem a
        // pergunta do tipo de vínculo, com "Por que o CPF" e o link do convite.
        await expect(
          page.getByRole("heading", { level: 1, name: "Confirme seu vínculo." }),
        ).toBeVisible()
        await expect(page.getByText(/Passo 2 de 3 · Elegibilidade/)).toBeVisible()
        await expect(page.getByText("Por que o CPF")).toBeVisible()
        await expect(page.getByRole("link", { name: /É cônjuge ou dependente\?/ })).toHaveAttribute(
          "href",
          "/convite",
        )
        await page.locator("#onboarding-cpf input").fill("123.456.789-09")
        await page.locator("#onboarding-cpf-submit").click()
        // Erro temporário: o resultado virou uma tela própria do protótipo, sem
        // dado do Portal, com "Tentar de novo" e o caminho do documento.
        await expect(
          page.getByRole("heading", { level: 1, name: "Não conseguimos consultar agora." }),
        ).toBeVisible({ timeout: 20_000 })
        await expect(page).toHaveURL(/\/onboarding$/)
        await expect(page.getByRole("link", { name: /Enviar um documento/ })).toBeVisible()
      },
      { persona: "visitante" },
    )

    // Tentar de novo volta ao CPF com o campo limpo: o número não fica na tela.
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Confirme seu vínculo." }),
    ).toBeVisible()
    await expect(page.locator("#onboarding-cpf input")).toHaveValue("")
    await page.locator("#onboarding-cpf input").fill("123.456.789-09")
    await page.locator("#onboarding-cpf-submit").click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Não conseguimos consultar agora." }),
    ).toBeVisible({ timeout: 20_000 })

    // ADR-20260922-identidade-quando-portal-falha: com o Portal fora, a identidade é
    // oferecida na hora. A pessoa envia um arquivo único e completo, e segue.
    await page.getByRole("link", { name: /Enviar um documento/ }).click()
    await expect(page).toHaveURL(/\/onboarding\/documento$/)
    await expect(page.getByRole("heading", { level: 1, name: "Envie um documento." })).toBeVisible()
    await page.locator("#verification-document").setInputFiles({
      name: "identidade.png",
      mimeType: "image/png",
      buffer: IDENTITY_PNG,
    })
    await page.locator("#document-submit").click()

    // O envio leva à análise pendente, que é o estado real do servidor depois
    // do registro — "Recebemos seu documento.", a linha do tempo do protótipo e
    // o passo do documento já cumprido.
    await expect(page).toHaveURL(/\/onboarding\/status$/, { timeout: 20_000 })
    await expect(
      page.getByRole("heading", { level: 1, name: "Recebemos seu documento." }),
    ).toBeVisible()
    await expect(page.getByRole("listitem").filter({ hasText: "Documento enviado" })).toBeVisible()

    // PORT-004, achado 2 da revisão: com o arquivo na fila, o bloco de troca
    // continua na tela ("Enviar outro documento", como no protótipo) e leva ao
    // envio de substituição. Não se envia o segundo arquivo aqui: o mesmo
    // documento em análise segue para a decisão do operador logo abaixo.
    await expect(page.getByRole("link", { name: /Enviar outro documento/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /Enviar outro documento/ })).toHaveAttribute(
      "href",
      "/onboarding/documento",
    )

    // "Avise-me quando liberar" grava a preferência e confirma só por e-mail
    // (não há push no Next). Recarregar prova que a linha ficou no banco: o
    // estado inicial vem do servidor, não da memória da tela.
    await page.locator("#release-notice").click()
    await expect(page.getByText("Vamos avisar por e-mail quando liberar.")).toBeVisible({
      timeout: 20_000,
    })
    await page.reload()
    await expect(page.getByText("Vamos avisar por e-mail quando liberar.")).toBeVisible({
      timeout: 20_000,
    })

    // O operador encontra a pessoa na fila e aprova o documento. Conta nova deste spec:
    // decidir não muda nenhuma fila que outro spec lê. Desde o
    // ADR-20260922-aprovacao-por-identidade-sem-cidade, aprovar não exige cidade.
    const operatorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await signInAs(operatorContext, OPERATOR)
    const operator = await operatorContext.newPage()
    try {
      await operator.goto(`/admissions?q=${encodeURIComponent(email)}`)
      await operator
        .getByRole("row")
        .filter({ hasText: email })
        .getByRole("link", { name: "Abrir" })
        .click()
      await expect(operator.getByRole("region", { name: "Resumo da verificação" })).toContainText(
        "Documento de identidade",
        { timeout: 20_000 },
      )
      await operator.getByRole("button", { name: "Aprovar documento" }).click()
      // Decidido, o caso não oferece mais a aprovação.
      await expect(operator.getByRole("button", { name: "Aprovar documento" })).toHaveCount(0, {
        timeout: 20_000,
      })
    } finally {
      await operatorContext.close()
    }

    await entrar.passo(
      "39-web-onboarding-contexto#0",
      page,
      async () => {
        // Admitida, a pessoa volta pela porta de sempre e o proxy a leva à cidade.
        await expect(async () => {
          await page.goto("/onboarding")
          await expect(page).toHaveURL(/\/onboarding\/locality$/, { timeout: 3_000 })
        }).toPass({ timeout: 30_000 })
        await page.getByRole("searchbox", { name: "Buscar cidade" }).fill("Manaus")
        // A busca espera a digitação parar; a pessoa clica na cidade que procurou.
        const city = page
          .getByRole("list", { name: "Cidades disponíveis" })
          .getByRole("button", { name: /Manaus/ })
          .first()
        await expect(city).toBeVisible({ timeout: 20_000 })
        await city.click()
        await expect(city).toHaveAttribute("aria-pressed", "true")
      },
      { persona: "visitante admitida por identidade" },
    )

    await entrar.passo(
      "39-web-onboarding-contexto#1",
      page,
      async () => {
        await page.getByRole("button", { name: "Continuar" }).click()
        await expect(page).toHaveURL(/\/onboarding\/perfil$/, { timeout: 20_000 })
        // Força Armada e OM são opcionais e nascem com "Exibir no perfil" desligado.
        await expect(
          page.getByRole("switch", { name: "Exibir Força Armada no perfil" }),
        ).not.toBeChecked()
        await expect(page.getByRole("switch", { name: "Exibir OM no perfil" })).not.toBeChecked()
      },
      { persona: "visitante admitida por identidade" },
    )

    // Concluir sem personalizar: a etapa final não exige adesão a comunidade.
    await page.getByRole("button", { name: "Pular por enquanto" }).click()
    await expect(page).toHaveURL(/\/onboarding\/welcome$/, { timeout: 20_000 })
    await expect(page.getByRole("link", { name: /Entrar na comunidade/ })).toBeVisible()

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
