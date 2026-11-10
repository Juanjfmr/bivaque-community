import { expect, type Page, type TestInfo, test } from "@playwright/test"
import { chaveAnonimaDoSupabase, semearSessaoDeMembro, urlDoSupabase } from "./entrada-real-ajuda"
import { encerrarPedidoAberto } from "./helpers/pedidos"
import { readEnvLocal } from "./helpers/session"

// RUN-011 — envio pela RPC send_conversation_message com duas sessões reais.
// Só o banco local semeado; a CI reseta com seed antes da suíte @stateful.
const MEMBRO = "membro-1@bivaque.example.invalid"
const PRESTADOR = "prestador-seed@bivaque.example.invalid"
const CONVERSA = "41000000-0000-4000-8000-000000000023"
const PEDIDO = "40000000-0000-4000-8000-000000000023"
const NEGOCIO = "30000000-0000-4000-8000-000000000010"
const CABECALHOS = { origin: "http://127.0.0.1:3000", "x-bivaque-app": "bivaque-spa" }
const HISTORICO = '[data-mensagens="historico"]'

function exigirAmbienteLocal() {
  chaveAnonimaDoSupabase()
  const senha = process.env["BIVAQUE_VISUAL_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!senha) throw new Error("BIVAQUE_VISUAL_PASSWORD não configurada antes da prova F09 RPC.")
  const url = new URL(urlDoSupabase())
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
    throw new Error("A prova F09 RPC só pode rodar no banco local.")
}

async function enviarPelaTela(page: Page, conversa: string, texto: string) {
  await expect(page.locator(HISTORICO)).toBeVisible({ timeout: 30_000 })
  await page.getByLabel("Mensagem", { exact: true }).fill(texto)
  const espera = page.waitForResponse(
    (resposta) =>
      resposta.url().endsWith(`/api/app/conversas/${conversa}/mensagens`) &&
      resposta.request().method() === "POST",
  )
  await page.getByRole("button", { name: "Enviar", exact: true }).click()
  const resposta = await espera
  expect(resposta.status()).toBe(201)
  await expect(page.locator(HISTORICO).getByText(texto, { exact: true })).toBeVisible()
  return resposta
}

function corpoDoEnvio(resposta: Awaited<ReturnType<typeof enviarPelaTela>>, texto: string) {
  const corpo = resposta.request().postDataJSON() as { texto: string; clientKey?: string }
  expect(corpo.texto).toBe(texto)
  expect(typeof corpo.clientKey).toBe("string")
  expect((corpo.clientKey ?? "").trim().length).toBeGreaterThan(0)
  return corpo
}

function baseURLDaProva(testInfo: TestInfo) {
  const baseURL = testInfo.project.use.baseURL
  if (!baseURL) throw new Error("A prova F09 RPC precisa da baseURL do Playwright.")
  return baseURL
}

test.describe("F09 — envio pela RPC", { tag: "@stateful" }, () => {
  test.beforeAll(exigirAmbienteLocal)

  test("reenvio da mesma chave não duplica e o prestador responde na conversa", async ({
    browser,
    context,
    page,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO)
    await page.goto(`/app/conversa/${CONVERSA}`)
    const texto = `Confirmo o horário — ${testInfo.project.name} ${Date.now()}`
    const resposta = await enviarPelaTela(page, CONVERSA, texto)
    const corpo = corpoDoEnvio(resposta, texto)
    const id = ((await resposta.json()) as { mensagem: { id: string } }).mensagem.id

    // O mesmo corpo, duas vezes: a chave devolve a mesma linha, sem INSERT novo.
    const enviados = [] as string[]
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
      const replay = await page.request.post(`/api/app/conversas/${CONVERSA}/mensagens`, {
        headers: CABECALHOS,
        data: corpo,
      })
      expect(replay.status()).toBe(201)
      enviados.push(((await replay.json()) as { mensagem: { id: string } }).mensagem.id)
    }
    expect(enviados).toEqual([id, id])

    await page.reload()
    await expect(page.locator(HISTORICO).getByText(texto, { exact: true })).toHaveCount(1)

    // Segunda sessão real: o prestador responde na mesma conversa.
    const contextoDoPrestador = await browser.newContext({
      baseURL: baseURLDaProva(testInfo),
    })
    try {
      await semearSessaoDeMembro(contextoDoPrestador, PRESTADOR)
      const paginaDoPrestador = await contextoDoPrestador.newPage()
      await paginaDoPrestador.goto(`/app/conversa/${CONVERSA}`)
      await expect(paginaDoPrestador.locator(HISTORICO)).toBeVisible({ timeout: 30_000 })
      await expect(
        paginaDoPrestador.locator(HISTORICO).getByText(texto, { exact: true }),
      ).toBeVisible()
      await enviarPelaTela(
        paginaDoPrestador,
        CONVERSA,
        `Consigo atender — ${testInfo.project.name} ${Date.now()}`,
      )
    } finally {
      await contextoDoPrestador.close()
    }

    // A conversa do seed já nasce "em conversa" (supabase/seed.sql:1161); esta
    // asserção é de não regressão. A transição em si é provada no caso "pedido
    // novo", que cria um pedido aberto e recebe a primeira resposta do prestador.
    const pedido = await page.request.get(`/api/app/pedidos/${PEDIDO}`)
    expect(pedido.status()).toBe(200)
    expect(((await pedido.json()) as { pedido: { situacao: string } }).pedido.situacao).toBe(
      "in_conversation",
    )
  })

  test("pedido novo: primeira resposta move para em conversa e o replay não mexe no pedido", async ({
    browser,
    context,
    page,
  }, testInfo) => {
    test.setTimeout(180_000)
    await semearSessaoDeMembro(context, MEMBRO)
    const descricao = `Troca de filtro — ${Date.now()}`
    const criado = await page.request.post(`/api/app/negocios/${NEGOCIO}/pedidos`, {
      headers: CABECALHOS,
      data: {
        descricao,
        quando: "Semana que vem",
        chave: `f09-rpc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    })
    expect(criado.status()).toBe(201)
    const pedido = (await criado.json()) as {
      pedido: { id: string; conversaId: string; situacao: string }
    }
    expect(pedido.pedido.situacao).toBe("open")
    const conversa = pedido.pedido.conversaId
    expect(conversa).toMatch(/^[0-9a-f-]{36}$/)

    const contextoDoPrestador = await browser.newContext({ baseURL: baseURLDaProva(testInfo) })
    try {
      await semearSessaoDeMembro(contextoDoPrestador, PRESTADOR)
      const paginaDoPrestador = await contextoDoPrestador.newPage()
      await paginaDoPrestador.goto(`/app/conversa/${conversa}`)
      const texto = `Primeira resposta — ${Date.now()}`
      const resposta = await enviarPelaTela(paginaDoPrestador, conversa, texto)
      const corpo = corpoDoEnvio(resposta, texto)
      const id = ((await resposta.json()) as { mensagem: { id: string } }).mensagem.id

      // A primeira resposta do prestador move o pedido para em conversa.
      const antes = await page.request.get(`/api/app/pedidos/${pedido.pedido.id}`)
      expect(antes.status()).toBe(200)
      const antesJson = (await antes.json()) as {
        pedido: { situacao: string; atualizadoEm: string }
      }
      expect(antesJson.pedido.situacao).toBe("in_conversation")

      // Replay depois da transição: mesma mensagem, pedido intocado.
      const enviados = [] as string[]
      for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        const replay = await paginaDoPrestador.request.post(
          `/api/app/conversas/${conversa}/mensagens`,
          { headers: CABECALHOS, data: corpo },
        )
        expect(replay.status()).toBe(201)
        enviados.push(((await replay.json()) as { mensagem: { id: string } }).mensagem.id)
      }
      expect(enviados).toEqual([id, id])

      await paginaDoPrestador.reload()
      await expect(
        paginaDoPrestador.locator(HISTORICO).getByText(texto, { exact: true }),
      ).toHaveCount(1)

      const depois = await page.request.get(`/api/app/pedidos/${pedido.pedido.id}`)
      expect(depois.status()).toBe(200)
      const depoisJson = (await depois.json()) as {
        pedido: { situacao: string; atualizadoEm: string }
      }
      expect(depoisJson.pedido.situacao).toBe("in_conversation")
      expect(depoisJson.pedido.atualizadoEm).toBe(antesJson.pedido.atualizadoEm)
    } finally {
      await contextoDoPrestador.close()
      // O teto do par é finito: encerrar devolve a vaga mesmo em falha.
      await encerrarPedidoAberto(context, pedido.pedido.id)
    }
  })

  test("falha de envio reusa a chave do mesmo rascunho e editar pede outra", async ({
    context,
    page,
  }, testInfo) => {
    test.setTimeout(120_000)
    await semearSessaoDeMembro(context, MEMBRO)
    await page.goto(`/app/conversa/${CONVERSA}`)
    await expect(page.locator(HISTORICO)).toBeVisible({ timeout: 30_000 })
    const texto = `Reenvio — ${testInfo.project.name} ${Date.now()}`
    const chaves: string[] = []
    let falhar = true
    await page.route(`**/api/app/conversas/${CONVERSA}/mensagens`, async (rota) => {
      const corpo = rota.request().postDataJSON() as { clientKey?: string }
      if (typeof corpo.clientKey === "string") chaves.push(corpo.clientKey)
      if (falhar) {
        falhar = false
        await rota.abort("failed")
        return
      }
      await rota.continue()
    })

    await page.getByLabel("Mensagem", { exact: true }).fill(texto)
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("Seu texto foi mantido")
    expect(chaves).toHaveLength(1)

    // Sem retry automático: só o segundo clique reenvia, com a MESMA chave.
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.locator(HISTORICO).getByText(texto, { exact: true })).toBeVisible()
    expect(chaves).toHaveLength(2)
    expect(chaves[1]).toBe(chaves[0])

    // Editar o texto é outro rascunho: chave nova.
    const editado = `${texto} (editado)`
    await page.getByLabel("Mensagem", { exact: true }).fill(editado)
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.locator(HISTORICO).getByText(editado, { exact: true })).toBeVisible()
    expect(chaves).toHaveLength(3)
    expect(chaves[2]).not.toBe(chaves[0])
    await page.unroute(`**/api/app/conversas/${CONVERSA}/mensagens`)
  })
})
