import { expect, type Page, test } from "@playwright/test"
import { simulateJourney } from "./helpers/journey"
import { signInAs } from "./helpers/session"

// Jornada simulada — web-pedir-um-servico + web-responder-um-pedido (pranchas 61, 62, 17, 23).
//
// Duas personas do seed, cada uma no seu contexto de navegador: a membra da vila pede um serviço
// ao prestador semeado, o prestador recebe no painel e responde, e a membra encontra a resposta.
// O ciclo só fecha quando o que um escreve aparece para o outro — tela bonita sem persistência não
// passa. Cada passo é andado por clique a partir da tela anterior; onde o app não tem porta, o
// passo é alcançado pela URL e registrado como ATALHO, para o relatório mostrar a porta que falta.
//
// @stateful: cria um pedido e uma mensagem que outros specs leem. Só desktop-1440, porque as
// pranchas destas jornadas são web e o ciclo de duas personas por viewport triplicaria as linhas.

const MEMBER = "membro-1@bivaque.example.invalid"
const PROVIDER = "prestador-seed@bivaque.example.invalid"
const PROVIDER_NAME = "Climatiza Manaus"

test.describe("jornada simulada: pedir e responder um serviço", { tag: "@stateful" }, () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "jornada das pranchas web")
  test.setTimeout(180_000)

  test("membra pede, prestador responde, membra lê a resposta", async ({ browser }, testInfo) => {
    const stamp = Date.now().toString(36)
    // O marcador abre o texto: o painel e a lista mostram só o começo da descrição.
    const marker = `Jornada ${stamp}`
    const need = `${marker}: o ar-condicionado da sala pinga água.`
    const reply = `Resposta simulada ${stamp}: posso passar na quinta de manhã.`

    const memberContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const providerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await signInAs(memberContext, MEMBER)
    await signInAs(providerContext, PROVIDER)
    const member = await memberContext.newPage()
    const provider = await providerContext.newPage()

    const pedir = simulateJourney(testInfo, "web-pedir-um-servico")
    const responder = simulateJourney(testInfo, "web-responder-um-pedido")
    let requestPath = ""

    try {
      await pedir.passo(
        "61-web-explorar-servicos#0",
        member,
        async () => {
          await member.goto("/explorar")
          await expect(member.getByRole("heading", { level: 1, name: /Explorar/ })).toBeVisible({
            timeout: 20_000,
          })
          await expect(member.getByRole("region", { name: "Do que você precisa?" })).toBeVisible()
        },
        { persona: "membra" },
      )

      await pedir.passo(
        "61-web-explorar-servicos#1",
        member,
        async () => {
          await member.getByRole("link", { name: /^Serviços/ }).click()
          await expect(member).toHaveURL(/\/explorar\/servicos/)
          await member.getByLabel("Tipo de serviço").selectOption({ label: "Assistência técnica" })
          await expect(member).toHaveURL(/tipo=/)
          await expect(
            member.getByRole("listitem").filter({ hasText: PROVIDER_NAME }),
          ).toBeVisible()
        },
        { persona: "membra" },
      )

      await pedir.passo(
        "62-web-prestador-pedido#0",
        member,
        async () => {
          await member
            .getByRole("listitem")
            .filter({ hasText: PROVIDER_NAME })
            .getByRole("button", { name: "Ver ficha" })
            .click()
          await expect(member.getByRole("heading", { level: 1, name: PROVIDER_NAME })).toBeVisible()
          await expect(member.getByRole("button", { name: "Pedir serviço" })).toBeVisible()
        },
        { persona: "membra" },
      )

      await pedir.passo(
        "62-web-prestador-pedido#1",
        member,
        async () => {
          await member.getByRole("button", { name: "Pedir serviço" }).click()
          await expect(
            member.getByRole("heading", { level: 1, name: "Do que você precisa?" }),
          ).toBeVisible()
          await expect(member.getByLabel("Destinatário")).toHaveValue(PROVIDER_NAME)
          await member.getByLabel("Descrição do que você precisa").fill(need)
          // O resumo ao lado acompanha o que a pessoa escreve antes de enviar.
          await expect(member.getByRole("definition").filter({ hasText: need })).toBeVisible()
        },
        { persona: "membra" },
      )

      // Envio: a confirmação precisa aparecer, e o pedido precisa existir para o prestador.
      await member.getByRole("button", { name: "Enviar pedido" }).click()
      await expect(member.getByText("Pedido enviado")).toBeVisible({ timeout: 20_000 })

      await responder.passo(
        "23-web-meu-negocio#0",
        provider,
        async () => {
          await provider.goto("/prestador")
          await expect(
            provider.getByRole("heading", { level: 1, name: "Pedidos para você" }),
          ).toBeVisible({ timeout: 20_000 })
          await expect(provider.getByRole("tab", { name: /^Novos \(\d+\)/ })).toBeVisible()
          await expect(provider.getByRole("row").filter({ hasText: marker })).toBeVisible()
        },
        { persona: "prestador" },
      )

      // O prestador abre o pedido novo e responde. Esta tela não tem prancha própria na jornada:
      // é a transição entre o painel (23) e o que a membra vê (17).
      await provider
        .getByRole("row")
        .filter({ hasText: marker })
        .getByRole("link", { name: "Responder" })
        .click()
      await expect(provider.getByRole("region", { name: "Responder" })).toBeVisible()
      await provider.getByLabel("Escreva uma mensagem").fill(reply)
      await provider.getByRole("button", { name: "Enviar", exact: true }).click()
      await expect(provider.getByRole("region", { name: "Conversa" }).getByText(reply)).toBeVisible(
        { timeout: 20_000 },
      )
      requestPath = await findRequestFor(member, marker)

      await pedir.passo(
        "17-web-pedido-servico#0",
        member,
        async () => {
          await member.goto(requestPath)
          await expect(member.getByText(marker).first()).toBeVisible({ timeout: 20_000 })
          await expect(member.getByText(reply).first()).toBeVisible()
        },
        {
          persona: "membra",
          atalho:
            "depois de 'Pedido enviado' a tela só oferece 'Voltar ao perfil', e nenhum link do " +
            "app leva a /pedidos (NAV-PEDIDOS-ORFA); a membra só reencontra o pedido pela URL",
        },
      )

      pedir.concluir()
      responder.concluir()
    } finally {
      await memberContext.close()
      await providerContext.close()
    }
  })
})

/**
 * Acha, na lista da própria membra, o pedido que ela acabou de criar. A lista é lida pela
 * URL porque não há link para ela; o que se prova aqui é que o pedido persistiu para a autora.
 */
async function findRequestFor(page: Page, marker: string): Promise<string> {
  await page.goto("/pedidos")
  const item = page.getByRole("link").filter({ hasText: marker })
  await expect(item).toBeVisible({ timeout: 20_000 })
  const href = await item.getAttribute("href")
  if (!href) throw new Error("o pedido criado aparece na lista sem link para o acompanhamento")
  return href
}
