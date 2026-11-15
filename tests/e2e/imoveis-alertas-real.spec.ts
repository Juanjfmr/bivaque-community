import {
  request as apiRequest,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test"
import {
  chaveAnonimaDoSupabase,
  MEMBRO_SEMEADO,
  semearSessaoDeMembro,
  urlDoSupabase,
} from "./entrada-real-ajuda"

// F06 — alertas de busca de imóvel no app (RUN-169), de ponta a ponta: a entrada
// viva em Você, a criação pela tela, a lista depois da recarga, o desligar e o
// apagar com a confirmação da entrada. O alerta é criado PELA UI — o seed pode
// já ter alertas, então a prova conta as linhas antes e depois em vez de supor
// a lista vazia.
//
// Pré-requisitos (CI): banco local migrado e semeado, `npx pnpm@11.18.0
// app:export` e as variáveis do Supabase no ambiente.
//
// @stateful: escreve em `listing_alerts`; roda no lote serial (`--workers=1`).

async function tokenDaSessao(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find((item) => /^sb-.*-auth-token$/.test(item.name))
  if (cookie === undefined) throw new Error("a sessão semeada não está nos cookies")
  const sessao = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as { access_token?: string }
  if (typeof sessao.access_token !== "string") throw new Error("cookie de sessão sem token")
  return sessao.access_token
}

/** As linhas de alerta na tela — a contagem antes/depois é a régua do teste. */
function linhas(page: Page) {
  return page.locator('[data-lista="alertas"] > li')
}

async function lerAlertaNoBanco(
  page: Page,
  context: BrowserContext,
  id: string,
): Promise<Record<string, unknown>[]> {
  const resposta = await page.request.get(
    `${urlDoSupabase()}/rest/v1/listing_alerts?select=id,name,neighborhood,deal,max_value_cents,min_bedrooms,is_active&id=eq.${id}`,
    {
      headers: {
        apikey: chaveAnonimaDoSupabase(),
        authorization: `Bearer ${await tokenDaSessao(context)}`,
      },
    },
  )
  expect(resposta.status(), "o alerta precisa ser legível por quem o criou").toBe(200)
  return (await resposta.json()) as Record<string, unknown>[]
}

test.describe("F06 — alertas de imóvel no app", { tag: "@stateful" }, () => {
  test("criar, listar, pausar e apagar um alerta persiste no banco", async ({ page, context }) => {
    test.setTimeout(240_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    const nome = `Alerta de teste ${Date.now()}`
    let alertaId = ""

    try {
      // A entrada é a linha de Você, como as telas irmãs (Salvos, Bloqueados).
      await page.goto("/app/voce")
      await page.getByRole("button", { name: /Alertas de imóvel/ }).click()
      await expect(page).toHaveURL(/\/app\/imoveis\/alertas$/)
      await expect(
        page.getByRole("heading", { level: 1, name: "Alertas de imóvel", exact: true }),
      ).toBeVisible({ timeout: 30_000 })

      // O seed pode já ter alertas: a régua é a contagem, não a lista vazia.
      await expect(page.locator('[data-tela="imoveis-alertas"] [data-estado="erro"]')).toHaveCount(
        0,
      )
      const antes = await linhas(page).count()

      // O cabeçalho é o único "Criar alerta" desta tela: o do estado vazio tem o
      // mesmo nome, então o seletor é o `data-acao` do botão da cabeça.
      await page.locator('[data-acao="criar-alerta"]').click()
      const formulario = page.locator('[data-formulario="alerta"]')
      await expect(formulario).toBeVisible()
      await formulario.locator("#alerta-nome").fill(nome)
      await formulario.locator("#alerta-bairro").fill("Centro")
      await formulario.locator("#alerta-negocio").click()
      await page.getByRole("option", { name: "Alugar", exact: true }).click()
      await formulario.locator("#alerta-valor").click()
      await page.getByRole("option", { name: /2\.500/ }).click()
      await formulario.locator("#alerta-quartos").click()
      await page.getByRole("option", { name: "2+", exact: true }).click()

      const criacao = page.waitForResponse(
        (r) =>
          /\/api\/app\/imoveis\/alertas$/.test(new URL(r.url()).pathname) &&
          r.request().method() === "POST",
      )
      await formulario.getByRole("button", { name: "Criar alerta", exact: true }).click()
      const resposta = await criacao
      const corpo = (await resposta.json()) as { alerta?: { id?: string } }
      expect(resposta.status(), JSON.stringify(corpo)).toBe(201)
      alertaId = corpo.alerta?.id ?? ""
      expect(alertaId).toMatch(/^[0-9a-f-]{36}$/)

      // A linha aparece com o nome e os critérios escolhidos.
      const linha = linhas(page).filter({ hasText: nome })
      await expect(linha).toBeVisible({ timeout: 30_000 })
      await expect(linha).toContainText("Aluguel")
      await expect(linha).toContainText("Centro")
      await expect(linha).toContainText("2+ quartos")
      await expect(linhas(page)).toHaveCount(antes + 1)

      // O banco é a prova: os critérios gravados são os que a tela mostrou.
      expect(await lerAlertaNoBanco(page, context, alertaId)).toEqual([
        {
          id: alertaId,
          name: nome,
          neighborhood: "Centro",
          deal: "rent",
          max_value_cents: 250000,
          min_bedrooms: 2,
          is_active: true,
        },
      ])

      // Recarregar: o que aparece é o que está no banco.
      await page.reload()
      await expect(linhas(page).filter({ hasText: nome })).toBeVisible({ timeout: 30_000 })

      // Pausar: as entregas param; a linha diz "Pausado" e o banco concorda.
      const pausa = page.waitForResponse(
        (r) =>
          r.url().includes(`/api/app/imoveis/alertas/${alertaId}`) &&
          r.request().method() === "PATCH",
      )
      await page.locator(`[data-acao="alternar-alerta"][data-valor="${alertaId}"]`).click()
      expect((await pausa).status()).toBe(200)
      await expect(linhas(page).filter({ hasText: nome })).toContainText("Pausado", {
        timeout: 30_000,
      })
      expect(await lerAlertaNoBanco(page, context, alertaId)).toMatchObject([{ is_active: false }])

      await page.reload()
      await expect(linhas(page).filter({ hasText: nome })).toContainText("Pausado", {
        timeout: 30_000,
      })

      // Apagar passa pela confirmação da entrada: um toque não apaga.
      await page.locator(`[data-acao="excluir-alerta"][data-valor="${alertaId}"]`).click()
      const confirmacao = page.locator('[data-sobreposicao="confirmacao"]')
      await expect(confirmacao).toBeVisible()
      await expect(linhas(page).filter({ hasText: nome })).toHaveCount(1)
      const remocao = page.waitForResponse(
        (r) =>
          r.url().includes(`/api/app/imoveis/alertas/${alertaId}`) &&
          r.request().method() === "DELETE",
      )
      await confirmacao.getByRole("button", { name: "Excluir", exact: true }).click()
      expect((await remocao).status()).toBe(200)

      await expect(linhas(page).filter({ hasText: nome })).toHaveCount(0, { timeout: 30_000 })
      await expect(linhas(page)).toHaveCount(antes)
      expect(await lerAlertaNoBanco(page, context, alertaId)).toEqual([])
      alertaId = ""

      await page.reload()
      await expect(linhas(page)).toHaveCount(antes, { timeout: 30_000 })
    } finally {
      // Falha no meio não pode deixar alerta de teste no seed: apaga pela rota,
      // e a ausência da linha no banco é conferida.
      if (alertaId !== "") {
        const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
        try {
          const removido = await api.delete(`/api/app/imoveis/alertas/${alertaId}`, {
            headers: { authorization: `Bearer ${await tokenDaSessao(context)}` },
          })
          expect([200, 404], `limpar o alerta do teste falhou (${removido.status()})`).toContain(
            removido.status(),
          )
        } finally {
          await api.dispose()
        }
      }
    }
  })

  test("banco fora mostra erro com Tentar de novo, nunca lista vazia", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.route("**/api/app/imoveis/alertas**", (rota) => rota.abort())
    await page.goto("/app/imoveis/alertas")
    const erro = page.locator('[data-tela="imoveis-alertas"] [data-estado="erro"]')
    await expect(erro).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Nenhum alerta ainda")).toHaveCount(0)

    await page.unroute("**/api/app/imoveis/alertas**")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(page.locator('[data-tela="imoveis-alertas"] [data-estado="erro"]')).toHaveCount(0)
  })

  test("sessão vencida tem saída própria, sem Tentar de novo", async ({ page, context }) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO_SEMEADO)

    await page.route("**/api/app/imoveis/alertas**", (rota) =>
      rota.fulfill({ status: 401, body: '{"autenticado":false,"motivo":"sem-credencial"}' }),
    )
    await page.goto("/app/imoveis/alertas")
    const sessao = page.locator('[data-estado="sessao-vencida"]')
    await expect(sessao).toBeVisible({ timeout: 30_000 })
    await expect(sessao.getByRole("button", { name: "Entrar de novo" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0)
  })
})
