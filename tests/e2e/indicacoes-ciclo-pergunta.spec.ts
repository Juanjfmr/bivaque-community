// Lote 5, tarefa A1 (COM-002) — o ciclo da pergunta, ponta a ponta
// (ADR-20261023-comunidade-do-prototipo, seção 2).
//
// Prova no navegador o que o pgTAP prova no banco: pedir, responder, editar a
// própria resposta e a própria pergunta, resolver por resposta, resolver sem
// resposta, reabrir, excluir a resposta e excluir a pergunta (levando as
// respostas junto). Duas contas reais do seed, porque autoria é o ponto.

import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

const ASKER = "membro-1@bivaque.example.invalid"
const HELPER = "membro-2@bivaque.example.invalid"

test.describe("o ciclo da pergunta", () => {
  test("pedir, responder, editar, resolver, reabrir e excluir", async ({ browser }) => {
    const mark = Date.now().toString(36)
    const question = `Eletricista de confiança para o quadro ${mark}`
    const answer = `O seu Nivaldo atende a vila toda, ${mark}.`
    const editedAnswer = `O seu Nivaldo atende a vila toda e cobra justo, ${mark}.`
    const editedQuestion = `Eletricista de confiança para trocar o quadro ${mark}`

    const askerContext = await browser.newContext()
    await signInAs(askerContext, ASKER)
    const asker = await askerContext.newPage()

    // ── 1. pedir (editor.js: 8..300, uma frase basta) ───────────────────────
    await asker.goto("/community?vista=indicacoes&pedir=1")
    await asker.getByRole("textbox", { name: "O que você procura" }).fill(question)
    await asker.getByRole("button", { name: "Pedir à cidade" }).click()
    await asker.getByRole("button", { name: "Publicar pedido" }).click()
    await asker.waitForURL(/\/indicacoes\/[0-9a-f-]{36}$/)
    const requestPath = new URL(asker.url()).pathname
    await expect(asker.getByRole("heading", { level: 1, name: question })).toBeVisible()
    await expect(asker.getByText("Sem resposta")).toBeVisible()

    // ── 2. responder (question.js: "Sua resposta" / "Enviar indicação") ─────
    const helperContext = await browser.newContext()
    await signInAs(helperContext, HELPER)
    const helper = await helperContext.newPage()
    await helper.goto(requestPath)
    await expect(helper.getByText("A comunidade ainda não respondeu")).toBeVisible()
    await helper.getByLabel("Sua resposta").fill(answer)
    await helper.getByRole("button", { name: "Enviar indicação" }).click()
    await expect(helper.getByText("1 resposta")).toBeVisible()

    // ── 3. quem respondeu edita a própria resposta (manage.js) ──────────────
    await helper.getByRole("button", { name: /^Mais opções da resposta:/ }).click()
    await helper.getByRole("menuitem", { name: "Editar resposta" }).click()
    const replyEditDialog = helper.getByRole("dialog", { name: "Editar resposta" })
    await replyEditDialog.getByLabel("Sua resposta").fill(editedAnswer)
    await replyEditDialog.getByRole("button", { name: "Salvar" }).click()
    await expect(helper.getByText(/· editada/).first()).toBeVisible()
    await expect(
      helper.getByRole("region", { name: "Respostas" }).getByText(editedAnswer),
    ).toBeVisible()

    // ── 4. quem pediu marca a resposta que resolveu ─────────────────────────
    await asker.reload()
    await asker.getByRole("button", { name: /^Ajudou a resolver/ }).click()
    await expect(asker.getByText("Resolvida")).toBeVisible()
    await expect(asker.getByText(/Ajudou a resolver · resposta de/)).toBeVisible()
    // Pergunta resolvida não aceita mais resposta (protótipo).
    await expect(asker.getByRole("button", { name: "Enviar indicação" })).toHaveCount(0)

    // ── 5. reabrir (mantém a última: o botão de marcar volta) ───────────────
    await asker.getByRole("button", { name: /^Reabrir pergunta/ }).click()
    await expect(asker.getByText("1 resposta")).toBeVisible()
    await expect(asker.getByRole("button", { name: "Enviar indicação" })).toBeVisible()

    // ── 6. resolver sem resposta, pelo menu da pergunta ─────────────────────
    await asker.getByRole("button", { name: /^Mais opções do pedido:/ }).click()
    await asker.getByRole("menuitem", { name: "Marcar como resolvida" }).click()
    await expect(asker.getByText("Resolvida por quem perguntou")).toBeVisible()

    // ── 7. reabrir pelo menu da pergunta ────────────────────────────────────
    await asker.getByRole("button", { name: /^Mais opções do pedido:/ }).click()
    await asker.getByRole("menuitem", { name: "Reabrir pergunta" }).click()
    await expect(asker.getByRole("button", { name: "Enviar indicação" })).toBeVisible()

    // ── 8. quem pediu edita a própria pergunta ──────────────────────────────
    await asker.getByRole("button", { name: /^Mais opções do pedido:/ }).click()
    await asker.getByRole("menuitem", { name: "Editar pergunta" }).click()
    const questionEditDialog = asker.getByRole("dialog", { name: "Editar pergunta" })
    await questionEditDialog.getByLabel("Sua pergunta").fill(editedQuestion)
    await questionEditDialog.getByRole("button", { name: "Salvar" }).click()
    await expect(asker.getByRole("heading", { level: 1, name: editedQuestion })).toBeVisible()
    await expect(asker.getByText(/· editada/).first()).toBeVisible()

    // ── 9. quem respondeu exclui a própria resposta ─────────────────────────
    await helper.reload()
    await helper.getByRole("button", { name: /^Mais opções da resposta:/ }).click()
    await helper.getByRole("menuitem", { name: "Excluir resposta" }).click()
    const replyDialog = helper.getByRole("dialog", { name: "Excluir resposta?" })
    await expect(replyDialog).toBeVisible()
    await replyDialog.getByRole("button", { name: "Excluir" }).click()
    await expect(helper.getByText("A comunidade ainda não respondeu")).toBeVisible()

    // ── 10. quem pediu exclui a pergunta, e o aviso leva as respostas ───────
    // "Minhas" primeiro: prova que a pergunta está na lista antes de excluir.
    await asker.goto("/community?vista=indicacoes")
    await asker.getByRole("tab", { name: "Minhas" }).click()
    await expect(asker.getByRole("link", { name: new RegExp(editedQuestion) })).toBeVisible()
    await asker.getByRole("link", { name: new RegExp(editedQuestion) }).click()
    await asker.getByRole("button", { name: /^Mais opções do pedido:/ }).click()
    await asker.getByRole("menuitem", { name: "Excluir pergunta" }).click()
    const questionDialog = asker.getByRole("dialog", { name: "Excluir pergunta?" })
    await expect(questionDialog).toBeVisible()
    await questionDialog.getByRole("button", { name: "Excluir" }).click()
    await asker.waitForURL(/\/community\?vista=indicacoes$/)
    await asker.getByRole("tab", { name: "Minhas" }).click()
    await expect(asker.getByRole("link", { name: new RegExp(editedQuestion) })).toHaveCount(0)

    await Promise.all([askerContext.close(), helperContext.close()])
  })
})
