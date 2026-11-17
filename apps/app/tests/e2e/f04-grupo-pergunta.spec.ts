import { expect, test } from "@playwright/test"
import { simularGrupos } from "./grupos-ajuda"
import { simularPerguntas } from "./perguntas-ajuda"

// RUN-178 — Também perguntar à cidade. No grupo Aberto o compositor tem o modo
// Pergunta, com o aviso de que a pergunta aparece na cidade com o nome do grupo;
// a pergunta publicada entra no bloco de cima do feed, no cartão de Pergunta com
// a linha "Também perguntada à cidade". Grupo Fechado não oferece a opção.

const PERGUNTA = "Alguém indica um veterinário que atenda à noite?"

function dialogo(page: import("@playwright/test").Page) {
  return page.locator('[data-dialogo="escrever-grupo"]')
}

test("grupo aberto: pergunta com o aviso da cidade e o cartão no feed", async ({ page }) => {
  await simularGrupos(page, { membro: true })
  await page.goto("/app/grupo/g-pets")
  await page.locator('[data-acao="escrever-grupo"]').click()
  await dialogo(page).getByRole("button", { name: "Pergunta", exact: true }).click()

  // O aviso prometido desde o protótipo aparece antes de publicar.
  await expect(dialogo(page).locator('[data-aviso-cidade="sim"]')).toContainText(
    "Sua pergunta aparecerá na cidade com o nome do grupo.",
  )
  // Pergunta não tem foto: o campo de foto sai do compositor.
  await expect(dialogo(page).locator("#texto-grupo-fotos")).toHaveCount(0)

  await dialogo(page).locator("#titulo-pergunta-grupo").fill(PERGUNTA)
  await dialogo(page).getByRole("button", { name: "Perguntar à cidade" }).click()

  // Sem sair da tela: a pergunta entra no bloco de cima do feed.
  await expect(page).toHaveURL(/\/app\/grupo\/g-pets$/)
  await expect(dialogo(page)).toHaveCount(0)
  const bloco = page.locator('[data-perguntas-do-grupo="sim"]')
  await expect(bloco).toContainText(PERGUNTA)
  await expect(bloco.locator('[data-cartao="publicacao"][data-tipo="pergunta"]')).toHaveCount(1)
  await expect(bloco).toContainText("Também perguntada à cidade")
  await expect(page.locator('[data-anuncio-da-publicacao="sim"]')).toContainText(
    "Indicações da cidade",
  )
})

test("grupo fechado: o compositor existe, mas não oferece perguntar à cidade", async ({ page }) => {
  await simularGrupos(page, { membro: true })
  await page.goto("/app/grupo/g-biblio")
  await page.locator('[data-acao="escrever-grupo"]').click()
  await expect(dialogo(page).locator("#texto-grupo")).toBeVisible()
  await expect(dialogo(page).getByRole("button", { name: "Pergunta", exact: true })).toHaveCount(0)
  await expect(dialogo(page).locator('[data-aviso-cidade="sim"]')).toHaveCount(0)
})

test("denunciar resposta oferece bloquear a autora com confirmação", async ({ page }) => {
  await simularPerguntas(page, { comResposta: true })
  await page.goto("/app/pergunta/a1")
  await page.getByRole("button", { name: "Opções da resposta" }).click()
  await page.getByRole("button", { name: "Denunciar resposta" }).click()
  await page.getByLabel("Spam").check()
  await page.getByRole("button", { name: "Enviar denúncia" }).click()
  await expect(page.getByRole("status")).toContainText("Denúncia enviada")
  await page.getByRole("button", { name: "Bloquear autor" }).click()
  await expect(page.getByRole("dialog")).toContainText("Bloquear esta pessoa?")
  const pedido = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().endsWith("/api/app/voce/bloqueados"),
  )
  await page.getByRole("button", { name: "Bloquear", exact: true }).click()
  expect((await pedido).postDataJSON()).toEqual({ id: "u-ana" })
  await expect(page.getByRole("status")).toContainText("Pessoa bloqueada.")
})

test("autor já bloqueado não recebe uma segunda oferta após denúncia", async ({ page }) => {
  await simularPerguntas(page, { comResposta: true, jaBloqueada: true })
  await page.goto("/app/pergunta/a1")
  await page.getByRole("button", { name: "Opções da resposta" }).click()
  await page.getByRole("button", { name: "Denunciar resposta" }).click()
  await page.getByLabel("Spam").check()
  await page.getByRole("button", { name: "Enviar denúncia" }).click()
  await expect(page.getByRole("status")).toContainText("Esta pessoa já está bloqueada.")
  await expect(page.getByRole("button", { name: "Bloquear autor" })).toHaveCount(0)
})

test("autoria própria não oferece denúncia nem bloqueio", async ({ page }) => {
  await simularPerguntas(page, {
    comResposta: true,
    perguntaPropria: true,
    respostaPropria: true,
  })
  await page.goto("/app/pergunta/a1")
  await expect(page.getByRole("button", { name: "Opções da pergunta" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Opções da resposta" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Bloquear autor" })).toHaveCount(0)
})

test("falha da porta de bloqueio mostra frase fixa", async ({ page }) => {
  await simularPerguntas(page, { comResposta: true, falhaNoBloqueio: true })
  await page.goto("/app/pergunta/a1")
  await page.getByRole("button", { name: "Opções da resposta" }).click()
  await page.getByRole("button", { name: "Denunciar resposta" }).click()
  await page.getByLabel("Spam").check()
  await page.getByRole("button", { name: "Enviar denúncia" }).click()
  await page.getByRole("button", { name: "Bloquear autor" }).click()
  await page.getByRole("button", { name: "Bloquear", exact: true }).click()
  await expect(page.getByRole("status")).toContainText(
    "Não foi possível bloquear esta pessoa. Tente de novo.",
  )
})
