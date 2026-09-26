// Memória de indicações (ADR-20260925-memoria-de-indicacoes). Substitui o spec
// da trava "saúde começa em grupo", retirada pelo dono em 25/09/2026.
//
// O ciclo inteiro, com três pessoas do seed: quem pede procura antes e publica
// um pedido de saúde para a cidade; outra pessoa acha pela busca, sem acento, e
// responde; quem pediu marca "Ajudou a resolver"; uma terceira procura e vê a
// resposta sem abrir a conversa.

import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

const ASKER = "membro-1@bivaque.example.invalid"
const HELPER = "membro-2@bivaque.example.invalid"
const LATER = "membro-3@bivaque.example.invalid"

test.describe("indicações com memória", () => {
  test("pedir, responder, resolver e achar depois", async ({ browser }) => {
    // Termo único por execução: a busca não pode casar com rodadas anteriores.
    const mark = `m${Date.now().toString(36)}`
    const question = `Fonoaudiólogo infantil ${mark}`
    const answer = `A Dra. Paula Reis, na Clínica Movimento ${mark}.`

    const askerContext = await browser.newContext()
    await signInAs(askerContext, ASKER)
    const asker = await askerContext.newPage()

    // Pedir começa por procurar: a caixa chega focada.
    await asker.goto("/indicacoes?pedir=1")
    await asker.waitForURL(/\/community\?vista=indicacoes&pedir=1$/)
    const askBox = asker.getByRole("textbox", { name: "O que você procura" })
    await expect(askBox).toBeFocused()
    await askBox.fill(question)
    await expect(asker.getByText("Ninguém perguntou isso ainda.")).toBeVisible()

    // Saúde vai para a cidade, com a categoria sugerida e sem aviso.
    await asker.getByRole("button", { name: "Pedir à cidade" }).click()
    await expect(asker.getByRole("button", { name: "Saúde", pressed: true })).toBeVisible()
    await expect(asker.getByText(/começam em grupo|todos os membros da cidade verão/i)).toHaveCount(
      0,
    )
    await asker.getByRole("button", { name: "Publicar pedido" }).click()
    await asker.waitForURL(/\/indicacoes\/[0-9a-f-]{36}$/)
    const requestPath = new URL(asker.url()).pathname
    await expect(asker.getByRole("heading", { level: 1, name: question })).toBeVisible()

    // Outra pessoa acha pela busca, sem acento, e responde.
    const helperContext = await browser.newContext()
    await signInAs(helperContext, HELPER)
    const helper = await helperContext.newPage()
    await helper.goto("/indicacoes")
    await helper.getByRole("textbox", { name: "O que você procura" }).fill(`fonoaudiologo ${mark}`)
    await expect(helper.getByText("Já perguntaram")).toBeVisible()
    await helper.getByRole("link", { name: new RegExp(question) }).click()
    await helper.waitForURL(`**${requestPath}`)
    await helper.getByLabel("Sua indicação").fill(answer)
    await helper.getByRole("button", { name: "Responder" }).click()
    await expect(helper.getByText("1 resposta")).toBeVisible()

    // Quem pediu marca a resposta que resolveu.
    await asker.reload()
    await asker.getByRole("button", { name: /^Ajudou a resolver/ }).click()
    await expect(asker.getByText(/Ajudou a resolver · resposta de/)).toBeVisible()
    await expect(asker.getByText("Resolvido por quem pediu")).toBeVisible()

    // Uma terceira pessoa procura e vê a resposta sem abrir a conversa.
    const laterContext = await browser.newContext()
    await signInAs(laterContext, LATER)
    const later = await laterContext.newPage()
    await later.goto("/indicacoes")
    await later.getByRole("textbox", { name: "O que você procura" }).fill(`fono ${mark}`)
    const hit = later.getByRole("link", { name: new RegExp(question) })
    await expect(hit).toContainText("Resolvido")
    await expect(hit).toContainText(answer)

    await Promise.all([askerContext.close(), helperContext.close(), laterContext.close()])
  })

  test("a Comunidade mostra as indicações como vista, e ela acende Comunidades", async ({
    page,
  }) => {
    await signInAs(page.context(), LATER)
    await page.goto("/community")
    await page.getByRole("tab", { name: "Indicações" }).click()
    await expect(page).toHaveURL(/\/community\?vista=indicacoes$/)
    await expect(page.getByRole("heading", { name: "O que você procura?" })).toBeVisible()
  })
})
