// RECON-052 — contrato de UI da exclusão de conta (ADR-20260914-exclusao-de-conta).
//
// RUN-184: a tela de conta saiu da web inteira (`(shell)/configuracoes/conta`, hoje
// 307 para /app/voce) e o aviso aprovado vive em /app/apagar-conta. O spec migrou com
// ele: aqui se prova o endereço antigo caindo no app, o texto que a tabela jurídica
// autoriza dizer e a confirmação digitada.
//
// O aviso é provado numa conta do seed e SEM apagar nada: confirmar o pedido bane a
// conta e apaga a credencial de quem estiver logado, e a persona do seed é de outras
// suítes. Ali o POST é respondido pelo próprio spec (a rota tem dono e prova em
// tests/unit/app-api/voce).
//
// O fluxo destrutivo — pedido registrado E sessão encerrada, que o contrato exige —
// roda no segundo bloco, com uma conta DESCARTÁVEL criada aqui e descartada pelo
// próprio pedido. Nunca a do seed.

import { expect, test } from "@playwright/test"
import {
  criarContaVerificada,
  enderecoSintetico,
  provisionarMembroDescartavel,
} from "./entrada-real-ajuda"
import { passwordGrantStatus, seedSession, signInAsWithPassword } from "./helpers/session"

test.describe("apagar a conta no app", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context)
  })

  test("o endereço antigo de conta cai no Você do app", async ({ page }) => {
    await page.goto("/configuracoes/conta")
    await expect(page).toHaveURL(/\/app\/voce$/)
  })

  test("o aviso aprovado e o pedido registrado, sem apagar nada", async ({ page }) => {
    await page.goto("/app/apagar-conta")
    const tela = page.locator('[data-tela="apagar-conta"]')
    await expect(tela.getByRole("heading", { level: 1, name: "Apagar a conta" })).toBeVisible()
    await expect(tela.getByText("A exclusão é permanente e não pode ser desfeita.")).toBeVisible()

    // O que a tabela jurídica aprovada autoriza dizer — e nada além disso.
    await expect(tela.getByText("Ao confirmar, agora:")).toBeVisible()
    await expect(tela.getByText(/sua sessão é encerrada/)).toBeVisible()
    // "15 dias" aparece duas vezes de propósito (o prazo da purga e o prazo de
    // resposta ao titular): o cabeçalho do bloco é o que identifica o primeiro.
    await expect(tela.getByText("Em até 15 dias, contados do pedido:")).toBeVisible()
    await expect(tela.getByText(/dados anonimizados/)).toBeVisible()
    await expect(tela.getByText(/6 meses/)).toBeVisible()
    await expect(tela.getByText(/MCI, art\. 15/)).toBeVisible()
    await expect(tela.getByRole("button", { name: "Abrir a Ajuda" })).toBeVisible()

    // Confirmação explícita: sem a palavra digitada, não há como pedir.
    const linha = tela.getByRole("button", { name: "Apagar minha conta" })
    await expect(linha).toBeDisabled()

    // O POST de verdade bania a conta do seed: a resposta do servidor é simulada aqui.
    await page.route("**/api/app/voce/apagar-conta", (rota) =>
      rota.fulfill({
        json: {
          pedido: { solicitadoEm: "2026-11-21T12:00:00.000Z", prazoEm: "2026-12-06T12:00:00.000Z" },
          pendente: true,
        },
      }),
    )

    await tela.getByLabel("Escreva APAGAR para confirmar").fill("APAGAR")
    await expect(linha).toBeEnabled()
    await linha.click()

    const estado = tela.locator('[role="status"]')
    await expect(estado).toContainText("Pedido registrado")
    // O prazo é o que o banco devolveu, por extenso — nunca um número inventado aqui.
    await expect(estado).toContainText("6 de dezembro de 2026")
    // "Pedido registrado" fica na própria tela e a ação sai de novo (ADR do lote).
    await expect(page).toHaveURL(/\/app\/apagar-conta$/)
    await expect(linha).toBeDisabled()
  })
})

// @stateful: cria a conta, provisiona e a destrói no pedido. Roda no lote serial
// (--workers=1), uma largura por vez, como os specs de conta real.
test.describe("a conta descartável que pede a exclusão", { tag: "@stateful" }, () => {
  test("o pedido de verdade grava o prazo do banco e encerra a sessão", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    test.setTimeout(180_000)
    const email = enderecoSintetico(`apagar-${testInfo.project.name}`)
    const conta = await criarContaVerificada(email)
    await signInAsWithPassword(context, conta.email, conta.senha)
    // Membro de Manaus: é o estado que a tela lê (o perfil e a conta vêm de
    // /api/app/voce). A entrada em si não é o que este caso prova.
    await provisionarMembroDescartavel(page, baseURL, { nome: "Pessoa Que Sai" })

    await page.goto("/app/apagar-conta")
    const tela = page.locator('[data-tela="apagar-conta"]')
    await expect(
      tela.getByRole("heading", { level: 1, name: "Apagar a conta" }),
      "a tela real não está em /app/apagar-conta: rode `npx pnpm@11.18.0 app:export`",
    ).toBeVisible({ timeout: 30_000 })

    // Conta provisionada: a tela lê a própria conta e a ação nasce desabilitada.
    const apagar = tela.getByRole("button", { name: "Apagar minha conta" })
    await expect(apagar).toBeDisabled()
    await tela.getByLabel("Escreva APAGAR para confirmar").fill("APAGAR")
    await expect(apagar).toBeEnabled()

    // O pedido de verdade: sem `route`, sem resposta simulada.
    const pedido = page.waitForResponse(
      (resposta) =>
        resposta.url().includes("/api/app/voce/apagar-conta") &&
        resposta.request().method() === "POST",
      { timeout: 30_000 },
    )
    await apagar.click()
    const resposta = await pedido
    expect(resposta.status(), "o pedido precisa ser registrado pelo banco").toBe(200)
    const corpo = (await resposta.json()) as { pedido?: { prazoEm?: unknown } }
    const prazoEm = corpo.pedido?.prazoEm
    expect(typeof prazoEm, "a rota devolve o prazo que a função do banco gravou").toBe("string")

    // O prazo na tela é o do banco, por extenso — nunca um número da tela.
    const prazoPorExtenso = new Date(prazoEm as string).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    const estado = tela.locator('[role="status"]')
    await expect(estado).toContainText("Pedido registrado")
    await expect(estado).toContainText(prazoPorExtenso)

    // Sessão encerrada, no servidor: a função apaga auth.sessions e bane o login;
    // o mesmo cookie deste contexto não lê mais a conta (o getUser da rota
    // devolve 403, e o app responde 401).
    const leitura = await page.request.get(new URL("/api/app/voce", page.url()).toString())
    expect(leitura.status(), "a leitura seguinte não pode trazer os dados da pessoa").toBe(401)

    // E navegar não devolve nada da pessoa: a tela fica no estado de falha de
    // leitura, sem o perfil que existia antes do pedido.
    await page.goto("/app/voce")
    await expect(page.locator('[data-tela="voce"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-estado="erro"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Pessoa Que Sai")).toHaveCount(0)

    // O login também não volta: a conta banida recusa um password grant novo
    // (GoTrue responde `user_banned`). 4xx é recusa; 5xx seria servidor fora.
    const grant = await passwordGrantStatus(conta.email, conta.senha)
    expect(grant, "o password grant depois do pedido precisa ser recusado").toBeGreaterThanOrEqual(
      400,
    )
    expect(grant, "recusa de credencial, não indisponibilidade do GoTrue").toBeLessThan(500)
  })
})
