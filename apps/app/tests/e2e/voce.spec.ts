import { expect, test } from "@playwright/test"
import { simularVoce } from "./voce-ajuda"

// A jornada "Você" no app de prova (F10): mesmos componentes e mesmos estados
// da produção, com `/api/app/voce/*` simulado no lugar do banco (ver
// voce-ajuda.ts). A prova com banco de verdade é tests/e2e/f10-voce-real.spec.ts.

test("o perfil vem da rota, a edição sobrevive ao recarregar e o desfazer some da lista", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/voce")

  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()
  await expect(page.getByText("Ana Verificada")).toBeVisible()
  await expect(page.getByText("perfil de demonstração")).toHaveCount(0)
  await expect(page.locator('[data-tela="voce"]')).toContainText("Manaus")

  await page.getByRole("button", { name: "Editar" }).click()
  await page.getByLabel("Nome").fill("Ana Editada")
  await page.getByLabel("Apresentação").fill("Nova apresentação do teste.")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Ana Editada")).toBeVisible()

  await page.reload()
  await expect(page.getByText("Ana Editada"), "o nome gravado volta no recarregar").toBeVisible()
  await expect(page.getByText("Nova apresentação do teste.")).toBeVisible()

  await page.goto("/app/bloqueados")
  const linha = page.locator('[data-tela="bloqueados"] [data-linha="lista"]')
  await expect(linha).toHaveCount(1)
  await expect(linha).toContainText("Maria Souza")
  await linha.click()
  await expect(page.getByText("Ninguém bloqueado")).toBeVisible()
  await page.reload()
  await expect(
    page.locator('[data-tela="bloqueados"] [data-linha="lista"]'),
    "o desbloqueio precisa sobreviver ao recarregar",
  ).toHaveCount(0)

  await page.goto("/app/ocultados")
  await expect(page.locator('[data-tela="ocultados"] [data-linha="lista"]')).toContainText(
    "Obra na rua das Palmeiras",
  )
  await page.getByText("Mostrar de novo").click()
  await expect(page.getByText("Nada oculto por aqui")).toBeVisible()
})

test("falha de leitura mostra erro com tentar de novo", async ({ page }) => {
  await simularVoce(page)
  await page.route("**/api/app/voce", (rota) => rota.abort())
  await page.goto("/app/voce")

  const erro = page.locator('[data-estado="erro"]')
  await expect(erro).toBeVisible()
  await expect(erro).toContainText("Não foi possível carregar")
  await expect(page.getByText("Ninguém bloqueado")).toHaveCount(0)

  await page.unroute("**/api/app/voce")
  await page.getByRole("button", { name: "Tentar de novo" }).click()
  await expect(page.getByText("Ana Verificada")).toBeVisible()
})

// RUN-184: o aviso da exclusão é o mesmo da tela antiga da web (o que sai agora, o
// que sai no prazo, o que permanece e por quê), e o pedido registrado fica na própria
// tela. Os seis tamanhos da config do app (320 a 1440, com 375/768/1440 entre eles)
// rodam este caso.
test("o aviso completo da exclusão, a palavra que libera e o pedido que fica na tela", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/apagar-conta")

  const tela = page.locator('[data-tela="apagar-conta"]')
  await expect(tela.getByRole("heading", { level: 1, name: "Apagar a conta" })).toBeVisible()
  await expect(tela.getByText(/permanente e não pode ser desfeita/)).toBeVisible()

  await expect(tela.getByText("Ao confirmar, agora:")).toBeVisible()
  await expect(tela.getByText(/sua sessão é encerrada/)).toBeVisible()
  await expect(tela.getByText("Em até 15 dias, contados do pedido:")).toBeVisible()
  await expect(tela.getByText(/apagamos a conta, as credenciais/)).toBeVisible()
  await expect(tela.getByText(/dados anonimizados/)).toBeVisible()
  await expect(tela.getByText(/6 meses/)).toBeVisible()
  await expect(tela.getByText(/MCI, art\. 15/)).toBeVisible()
  await expect(tela.getByRole("button", { name: "Abrir a Ajuda" })).toBeVisible()

  // A confirmação continua sendo a palavra digitada, e nada acontece sem ela.
  const apagar = tela.getByRole("button", { name: "Apagar minha conta" })
  await expect(apagar).toBeDisabled()
  await tela.getByLabel("Escreva APAGAR para confirmar").fill("APAGAR")
  await expect(apagar).toBeEnabled()
  await apagar.click()

  // O prazo vem do banco (a simulação devolve o mesmo `due_at` da rota real) e sai
  // por extenso; a conta é a mesma do sistema de quem roda a prova, então o rótulo
  // é calculado aqui em vez de escrito à mão.
  const prazo = new Date("2026-12-06T12:00:00.000Z").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const estado = tela.locator('[role="status"]')
  await expect(estado).toContainText("Pedido registrado")
  await expect(estado).toContainText(prazo)
  expect(prazo).toContain("de dezembro de 2026")
  // "Pedido registrado" continua na tela, e a ação não é oferecida de novo.
  await expect(page).toHaveURL(/\/app\/apagar-conta$/)
  await expect(apagar).toBeDisabled()
  await expect(tela.getByText(`Até ${prazo}, contados do pedido:`)).toBeVisible()
})

test("sair da conta volta para a entrada e o cache local do aparelho sai junto", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/voce")
  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()

  // O que a pessoa deixa no aparelho: rascunho de criação e buscas recentes.
  await page.evaluate(() => {
    sessionStorage.setItem("bivaque:criacao-rascunhos:manaus", "[]")
    localStorage.setItem("bivaque:buscas-recentes", '["pediatra"]')
  })

  await page.getByRole("button", { name: "Sair da conta" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("Sair da conta?")
  await page.getByRole("button", { name: "Sair", exact: true }).click()

  await expect(page).toHaveURL(/\/app\/entrar$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "A comunidade militar da sua cidade." }),
  ).toBeVisible()
  const guardado = await page.evaluate(() => ({
    rascunhos: sessionStorage.getItem("bivaque:criacao-rascunhos:manaus"),
    recentes: localStorage.getItem("bivaque:buscas-recentes"),
  }))
  expect(guardado, "o cache do aparelho não pode sobreviver à saída").toEqual({
    rascunhos: null,
    recentes: null,
  })
})

test("sair com a sessão já encerrada (401) também leva à entrada e limpa o cache", async ({
  page,
}) => {
  await simularVoce(page, { respostaDoSair: "ja-saiu" })
  await page.goto("/app/voce")
  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()

  await page.evaluate(() => {
    sessionStorage.setItem("bivaque:criacao-rascunhos:manaus", "[]")
    localStorage.setItem("bivaque:buscas-recentes", '["pediatra"]')
  })

  await page.getByRole("button", { name: "Sair da conta" }).click()
  await page.getByRole("button", { name: "Sair", exact: true }).click()

  // Já não há sessão: o que a pessoa pediu já é o estado atual, então a tela
  // segue para a entrada em vez de mostrar falha.
  await expect(page).toHaveURL(/\/app\/entrar$/)
  await expect(page.locator('[data-tela="voce"] [role="alert"]')).toHaveCount(0)
  const guardado = await page.evaluate(() => ({
    rascunhos: sessionStorage.getItem("bivaque:criacao-rascunhos:manaus"),
    recentes: localStorage.getItem("bivaque:buscas-recentes"),
  }))
  expect(guardado, "o cache do aparelho sai mesmo sem sessão no servidor").toEqual({
    rascunhos: null,
    recentes: null,
  })
})

test("sair com o servidor fora mantém a pessoa na conta, com a mensagem", async ({ page }) => {
  await simularVoce(page, { respostaDoSair: "indisponivel" })
  await page.goto("/app/voce")
  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()

  await page.getByRole("button", { name: "Sair da conta" }).click()
  await page.getByRole("button", { name: "Sair", exact: true }).click()

  await expect(page.locator('[data-tela="voce"] [role="alert"]')).toContainText(
    "Não foi possível sair agora",
  )
  await expect(page, "a sessão não foi encerrada no aparelho").toHaveURL(/\/app\/voce$/)
  await expect(page.getByRole("heading", { level: 1, name: "Você" })).toBeVisible()
})

test("a família vem da rota: convite enviado entra na lista e a revogação some", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/voce")

  const familia = page.locator('[data-secao="sim"]', { hasText: "Família" })
  await expect(familia.getByText("Convites pendentes (1 de 5)")).toBeVisible()
  await expect(familia.getByText("ma***@gm***.com")).toBeVisible()

  // Enviar: o que aparece é o convite GRAVADO, devolvido pelo servidor.
  await familia.getByLabel("E-mail do familiar").fill("familiar@example.invalid")
  await familia.getByRole("button", { name: "Enviar convite" }).click()
  await expect(familia.getByRole("status")).toContainText(
    "Convite enviado para fa***@ex***.invalid.",
  )
  await expect(familia.getByText("Convites pendentes (2 de 5)")).toBeVisible()
  await expect(
    familia.locator('[data-linha="lista"]').filter({ hasText: "fa***@ex***.invalid" }),
  ).toHaveCount(1)

  // Recarregar prova a gravação: a lista volta do servidor, não do estado local.
  await page.reload()
  await expect(familia.getByText("Convites pendentes (2 de 5)")).toBeVisible()

  // Revogar: a linha sai da lista e o código deixa de valer.
  await familia
    .getByRole("button", { name: /Revogar/ })
    .last()
    .click()
  await expect(familia.getByRole("status")).toContainText("Convite revogado")
  await expect(familia.getByText("Convites pendentes (1 de 5)")).toBeVisible()
})
