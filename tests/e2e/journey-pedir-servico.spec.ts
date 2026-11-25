import { expect, test } from "@playwright/test"
import { encerrarPedidoAberto } from "./helpers/pedidos"
import { signInAs } from "./helpers/session"

// LAN-TROCA fase 1 + TROCA-005: o pedido nasce no app e a resposta do prestador
// também é do app (Meu negócio). A membra acompanha o pedido e lê a resposta na
// conversa do app, em sessão própria.
const MEMBER = "membro-1@bivaque.example.invalid"
const PROVIDER = "prestador-seed@bivaque.example.invalid"
const PROVIDER_ID = "30000000-0000-4000-8000-000000000010"
const PROVIDER_NAME = "Climatiza Manaus"

test.describe("jornada simulada: pedir e responder um serviço", { tag: "@stateful" }, () => {
  test.setTimeout(180_000)

  test("membra pede, prestador responde, membra lê a resposta", async ({ browser, viewport }) => {
    const stamp = Date.now().toString(36)
    const marker = `Jornada ${stamp}`
    const need = `${marker}: o ar-condicionado da sala pinga água.`
    const reply = `Resposta simulada ${stamp}: posso passar na quinta de manhã.`

    const memberContext = await browser.newContext({ viewport })
    const providerContext = await browser.newContext({ viewport })
    await signInAs(memberContext, MEMBER)
    await signInAs(providerContext, PROVIDER)
    const member = await memberContext.newPage()
    const provider = await providerContext.newPage()

    try {
      // RUN-177: o pedido nasceu no app — a folha endereçável
      // (/app/pedidos/novo?destino=) aberta pelo link da ficha. O painel do
      // prestador (resposta) continua sendo a tela web.
      await member.goto(`/app/negocio/${PROVIDER_ID}`)
      await expect(member.getByRole("heading", { level: 1, name: PROVIDER_NAME })).toBeVisible({
        timeout: 30_000,
      })
      await member.getByRole("link", { name: "Pedir orçamento", exact: true }).click()
      await expect(member).toHaveURL(new RegExp(`/app/pedidos/novo\\?destino=${PROVIDER_ID}$`))
      await expect(member.getByRole("dialog")).toBeVisible()
      await member.getByLabel("O que você precisa?").fill(need)
      await member.getByRole("button", { name: "Enviar pedido", exact: true }).click()
      await expect(member).toHaveURL(/\/app\/pedido\/[0-9a-f-]{36}$/, { timeout: 20_000 })
      const requestId = member.url().split("/").at(-1)
      if (!requestId) throw new Error("A folha do pedido não devolveu o id do pedido")
      await expect(member.locator("[data-descricao-do-pedido]")).toHaveText(need, {
        timeout: 20_000,
      })
      await expect(member.getByText("Em aberto", { exact: true })).toBeVisible()

      // O mesmo pedido aparece para a outra persona, que responde pelo app:
      // TROCA-005 fez da área do prestador as abas de Meu negócio, e esta é a
      // mesma tela que a revisão às cegas e o E2E do app já medem.
      await provider.goto("/app/meu-negocio?aba=pedidos")
      await expect(provider.getByRole("heading", { level: 1, name: "Meu negócio" })).toBeVisible({
        timeout: 20_000,
      })
      const row = provider.locator('[data-linha="lista"]').filter({ hasText: marker })
      await expect(row).toBeVisible({ timeout: 20_000 })
      await row.click()
      const folha = provider.locator('[data-sobreposicao="pedido-do-negocio"]')
      await expect(folha).toBeVisible()
      await folha.getByLabel("Resposta ao pedido").fill(reply)
      await folha.getByRole("button", { name: "Enviar resposta" }).click()
      await expect(folha.getByText(reply)).toBeVisible({ timeout: 20_000 })

      // O aviso do app abre o pedido; o contador da casca web saiu com a casca.
      const glance = await memberContext.newPage()
      await glance.goto("/app/avisos")
      const notice = glance.getByText("Seu pedido recebeu uma resposta")
      await expect(notice.first()).toBeVisible({ timeout: 20_000 })
      await notice.first().click()
      await expect(glance).toHaveURL(new RegExp(`/app/pedido/${requestId}$`), {
        timeout: 20_000,
      })
      await expect(glance.locator("[data-descricao-do-pedido]")).toHaveText(need, {
        timeout: 20_000,
      })
      await glance.close()

      // O pedido gravado é o mesmo que a ficha acabou de criar: a tela do
      // acompanhamento já estava aberta nela (RUN-177: sem tela de confirmação).
      await expect(member).toHaveURL(new RegExp(`/app/pedido/${requestId}$`))
      await expect(
        member.getByRole("heading", { level: 1, name: "Pedido de serviço" }),
      ).toBeVisible()
      await expect(member.locator("[data-descricao-do-pedido]")).toHaveText(need, {
        timeout: 20_000,
      })

      // A resposta vive na conversa: prova de leitura pela membra e de persistência.
      await member.getByRole("button", { name: "Conversas", exact: true }).click()
      await expect(member).toHaveURL(/\/app\/conversas$/)
      const thread = member.locator("[data-thread]", { hasText: reply })
      await expect(thread).toHaveCount(1)
      const conversationId = await thread.getAttribute("data-thread")
      await thread.getByRole("button").click()
      await expect(member).toHaveURL(new RegExp(`/app/conversa/${conversationId}$`))
      await expect(member.locator('[data-mensagens="historico"]').getByText(reply)).toBeVisible()
      await member.reload()
      await expect(member.locator('[data-mensagens="historico"]').getByText(reply)).toBeVisible({
        timeout: 20_000,
      })

      // A porta do Você (RUN-172: o perfil próprio é do app) leva à lista.
      await member.goto("/app/voce")
      await member.getByRole("button", { name: /Pedidos de serviço/ }).click()
      await expect(member).toHaveURL(/\/app\/pedidos$/)
      await expect(
        member.getByRole("heading", { level: 1, name: "Pedidos de serviço" }),
      ).toBeVisible({
        timeout: 20_000,
      })
      const pedido = member.locator('[data-tela="pedidos"] [data-linha="lista"]', { hasText: need })
      await expect(pedido).toBeVisible()
      await pedido.click()
      await expect(member).toHaveURL(new RegExp(`/app/pedido/${requestId}$`))
      await expect(member.locator("[data-descricao-do-pedido]")).toHaveText(need)

      // A mesma persona abre o pedido em cada largura: encerrar devolve a vaga
      // do teto de pedidos abertos, e o banco fica como estava.
      await encerrarPedidoAberto(memberContext, requestId)
    } finally {
      await memberContext.close()
      await providerContext.close()
    }
  })
})
