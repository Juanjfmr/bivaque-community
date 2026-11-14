import { expect, test } from "@playwright/test"
import { encerrarPedidoAberto } from "./helpers/pedidos"
import { signInAs } from "./helpers/session"

// LAN-TROCA fase 1: criação e painel do prestador continuam na web.
// A membra acompanha o pedido e lê a resposta na conversa do app, em sessão própria.
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
      // A criação endereçável com destinatário continua sendo uma tela da web.
      await member.goto(`/pedidos/novo?prestador=${PROVIDER_ID}`)
      await expect(
        member.getByRole("heading", { level: 1, name: "Do que você precisa?" }),
      ).toBeVisible()
      await expect(member.getByLabel("Destinatário")).toHaveValue(PROVIDER_NAME)
      await member.getByLabel("Descrição do que você precisa").fill(need)
      await expect(member.getByRole("definition").filter({ hasText: need })).toBeVisible()
      await member.getByRole("button", { name: "Enviar pedido" }).click()
      await expect(member.getByText("Pedido enviado")).toBeVisible({ timeout: 20_000 })
      const acompanhar = member.getByRole("link", { name: "Acompanhar pedido" })
      await expect(acompanhar).toHaveAttribute("href", /\/pedidos\/[0-9a-f-]{36}$/)
      const requestPath = await acompanhar.getAttribute("href")
      if (!requestPath) throw new Error("Confirmação sem link para acompanhar o pedido")
      const requestId = requestPath.split("/").at(-1)
      if (!requestId) throw new Error("Confirmação sem ID de pedido no link")

      // O mesmo pedido aparece para a outra persona, que responde pela web.
      await provider.goto("/prestador")
      await expect(
        provider.getByRole("heading", { level: 1, name: "Orçamentos para você" }),
      ).toBeVisible({ timeout: 20_000 })
      await expect(provider.getByRole("tab", { name: /^Novos \(\d+\)/ })).toBeVisible()
      const row = provider.getByRole("row").filter({ hasText: marker })
      await expect(row).toBeVisible()
      const responder = row.getByRole("link", { name: "Responder" })
      await expect(responder).toHaveAttribute("href", `/prestador/pedidos/${requestId}`)
      await responder.click()
      await expect(provider.getByRole("region", { name: "Responder" })).toBeVisible()
      await provider.getByLabel("Escreva uma mensagem").fill(reply)
      await provider.getByRole("button", { name: "Enviar", exact: true }).click()
      await expect(provider.getByRole("region", { name: "Conversa" }).getByText(reply)).toBeVisible(
        {
          timeout: 20_000,
        },
      )

      // O cabeçalho continua na web; a caixa de avisos abre o pedido no app.
      const glance = await memberContext.newPage()
      await glance.goto("/profile")
      await expect(
        glance.getByRole("link", { name: /^Conversas, \d+ com mensagem nova/ }),
      ).toBeVisible({ timeout: 20_000 })
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

      // A porta do sucesso também preserva o ID e mostra o pedido gravado no app.
      await acompanhar.click()
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

      // A porta do Perfil continua viva e agora leva à lista do app.
      await member.goto("/profile")
      await member
        .getByRole("region", { name: "Seu espaço" })
        .getByRole("link", { name: /Meus orçamentos/ })
        .click()
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
