// RECON-032 — conversa endereçavel por URL (spec C12) e leitura de
// notificacoes (C08) na conta do membro-1. A conversa e criada pelo RPC
// `open_conversation`, idempotente pelo par — o mesmo id vale entre execucoes
// e vira a fixture da captura /messages/<thread>.

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import {
  mintSession,
  restDelete,
  restInsert,
  restRpc,
  restSelect,
  seedAs,
} from "./helpers/recon032"
import {
  MANAUS_LOCALITY_ID,
  MEMBRO_1_EMAIL,
  MEMBRO_1_USER_ID,
  PROVIDER_PROFILE_ID,
  PROVIDER_USER_ID,
  VISUAL_EMAIL,
} from "./helpers/recon032-fixtures"

let conversationId = ""

// Desfaz o bloqueio que o proprio spec cria, pela mesma via do app (delete em
// dm_blocks com a identidade do membro). Idempotente: sem linha, nada muda.
async function unblockPartner(accessToken: string): Promise<void> {
  const blocks = await restSelect<{ blocked_user_id: string }>("dm_blocks", accessToken, {
    blocker_user_id: `eq.${MEMBRO_1_USER_ID}`,
    blocked_user_id: `eq.${PROVIDER_USER_ID}`,
  })
  if (blocks.length === 0) return
  const removed = await restDelete("dm_blocks", accessToken, {
    blocker_user_id: `eq.${MEMBRO_1_USER_ID}`,
    blocked_user_id: `eq.${PROVIDER_USER_ID}`,
  })
  if (!removed) {
    throw new Error("unblock de limpeza falhou")
  }
}

test.beforeAll(async () => {
  const membro = await mintSession(MEMBRO_1_EMAIL)
  // Se uma execucao anterior morreu entre bloquear e desbloquear, o RPC
  // responde 42501 "blocked" e a fixture nunca nasceria. O proprio spec limpa
  // o que ele pode ter deixado.
  await unblockPartner(membro.accessToken)
  const result = await restRpc<string>("open_conversation", membro.accessToken, {
    p_other_user_id: PROVIDER_USER_ID,
    p_context_type: "provider",
    p_context_id: PROVIDER_PROFILE_ID,
  })
  if (!result.ok || !result.data) {
    throw new Error(`open_conversation falhou: ${result.status}`)
  }
  conversationId = String(result.data)
  mkdirSync(join(process.cwd(), ".visual", "fixtures"), { recursive: true })
  writeFileSync(
    join(process.cwd(), ".visual", "fixtures", "message-thread.json"),
    `${JSON.stringify({ path: `/messages/${conversationId}` }, null, 2)}\n`,
  )
})

test.describe("conversa por URL estavel", () => {
  test("anonimo cai em login antes de ver qualquer mensagem", async ({ page }) => {
    await page.goto(`/messages/${conversationId}`)
    await page.waitForURL(/\/login/)
  })

  test("quem nao e participante nao ve a conversa, nem por URL direta", async ({ browser }) => {
    const context = await browser.newContext()
    await seedAs(context, VISUAL_EMAIL)
    const page = await context.newPage()
    // A pagina streama, entao o status HTTP nao carrega a resposta: a prova e
    // o que a tela mostra — sem participacao a RLS nao devolve a conversa, e o
    // segmento responde com o proprio not-found.
    await page.goto(`/messages/${conversationId}`)
    await expect(page.getByText("Página não encontrada")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByLabel("Digite sua mensagem")).toHaveCount(0)
    await context.close()
  })

  test("URL direta reconstroi a conversa, e o refresh nao duplica a entrega", async ({
    browser,
  }) => {
    const context = await browser.newContext()
    await seedAs(context, MEMBRO_1_EMAIL)
    const page = await context.newPage()

    await page.goto(`/messages/${conversationId}`)
    await expect(page).toHaveURL(new RegExp(`/messages/${conversationId}$`))
    // o painel da conversa abriu direto pela URL: campo de escrita visivel e
    // nenhum "Selecione uma conversa" no lugar do historico
    await expect(page.getByLabel("Digite sua mensagem")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Selecione uma conversa")).toHaveCount(0)

    // enviar mensagem pela URL direta
    const marker = `mensagem via url estavel ${Date.now().toString(36)}`
    await page.getByLabel("Digite sua mensagem").fill(marker)
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.getByText("Enviado").last()).toBeVisible({ timeout: 10_000 })

    // refresh: mesma conversa, mensagem exata uma vez — sem entrega duplicada.
    // Escopo na bolha (p.whitespace-pre-wrap): o preview da lista repete o
    // mesmo texto e nao e entrega — e so o resumo da conversa.
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/messages/${conversationId}$`))
    await expect(page.locator("p.whitespace-pre-wrap").filter({ hasText: marker })).toHaveCount(1, {
      timeout: 15_000,
    })

    // a lista antiga por query param passa a ser a URL estavel
    await page.goto(`/messages?conversation=${conversationId}`)
    await expect(page).toHaveURL(new RegExp(`/messages/${conversationId}$`), {
      timeout: 15_000,
    })

    await context.close()
  })

  test("bloquear na conversa aparece em Pessoas bloqueadas e desbloquear desfaz", async ({
    browser,
  }) => {
    const context = await browser.newContext()
    await seedAs(context, MEMBRO_1_EMAIL)
    const page = await context.newPage()

    try {
      await page.goto(`/messages/${conversationId}`)
      await expect(page).toHaveURL(new RegExp(`/messages/${conversationId}$`))

      // O cabecalho do shell e sticky; o auto-scroll do clique leva o botao da
      // thread para debaixo dele. Rola o container principal ao topo antes.
      await page.locator("main").evaluate((element) => {
        element.scrollTop = 0
      })
      await page.getByRole("button", { name: "Bloquear", exact: true }).click()
      await expect(page.getByText("Desbloqueie para enviar mensagens.")).toBeVisible({
        timeout: 10_000,
      })

      // o bloqueio e gerenciavel na tela de confianca (prancha 56, painel direito)
      await page.goto("/denuncias")
      await page.getByRole("tab", { name: "Pessoas bloqueadas" }).click()
      const row = page
        .locator("li")
        .filter({ hasText: /Bloqueado em/ })
        .first()
      await expect(row.getByText(/Bloqueado em/)).toBeVisible()
      await row.getByRole("button", { name: "Desbloquear" }).click()
      await expect(row.getByText(/Bloqueado em/)).toHaveCount(0)

      // e o chat volta a aceitar mensagem
      await page.goto(`/messages/${conversationId}`)
      await expect(page.getByLabel("Digite sua mensagem")).toBeVisible({ timeout: 10_000 })
    } finally {
      // O bloqueio nao pode ficar de heranca na conta compartilhada se um
      // assert acima falhar no meio do caminho.
      const membro = await mintSession(MEMBRO_1_EMAIL)
      await unblockPartner(membro.accessToken)
      await context.close()
    }
  })
})

test.describe("leitura de notificacoes persiste (prancha 54)", () => {
  test("marcar como lida persiste apos reload e o contador acompanha", async ({ browser }) => {
    // A nao-lida nasce do fluxo real e nao de sobra de rodada anterior: o
    // membro-1 publica e outro membro comenta; o trigger notify_comment
    // escreve a notificacao para o autor do post.
    const membro = await mintSession(MEMBRO_1_EMAIL)
    const stamp = Date.now().toString(36)
    const post = await restInsert<{ id: string }>("posts", membro.accessToken, {
      locality_id: MANAUS_LOCALITY_ID,
      user_id: MEMBRO_1_USER_ID,
      post_type: "text",
      content: `Publicação do ciclo RECON-032 ${stamp}`,
    })
    if (!post) {
      throw new Error("não foi possível criar a publicação da fixture de leitura")
    }
    const visual = await mintSession(VISUAL_EMAIL)
    await restInsert("comments", visual.accessToken, {
      post_id: post.id,
      content: `Comentário do ciclo RECON-032 ${stamp}`,
    })

    // Viewport de desktop de propósito: o contador vive na sidebar larga, e em
    // 375 a sidebar é rail/drawer — o badge não tem onde ser desenhado. O
    // contexto sem viewport herdava a do projeto e o teste falhava nos três.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await seedAs(context, MEMBRO_1_EMAIL)
    const page = await context.newPage()

    await page.goto("/notifications")
    await expect(page.getByRole("heading", { name: "Notificações" })).toBeVisible()
    const badge = page.locator('a[href="/notifications"] span.ml-auto')
    await expect(badge).toBeVisible({ timeout: 10_000 })
    const unreadCount = Number(await badge.textContent())
    expect(unreadCount).toBeGreaterThan(0)

    await page.getByRole("button", { name: "Marcar todas como lidas" }).click()
    await expect(page.getByRole("button", { name: "Marcar todas como lidas" })).toHaveCount(0)

    // leitura persiste: reload nao reabre o contador nem reentrega as lidas
    await page.reload()
    await expect(page.locator('a[href="/notifications"] span.ml-auto')).toHaveCount(0)
    await page.getByRole("tab", { name: "Não lidas" }).click()
    await expect(page.getByText("Nada por ler")).toBeVisible()

    await context.close()
  })
})
