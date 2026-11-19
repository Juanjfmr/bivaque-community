import { expect, test } from "@playwright/test"

const ID = "41000000-0000-4000-8000-000000000051"
const OUTRA = "41000000-0000-4000-8000-000000000052"

test("contador e marcador acompanham leitura confirmada", async ({ page }) => {
  let porLer = true
  let chamadas = 0
  const conversa = (id: string) => ({
    id,
    nome: id === ID ? "Maria" : "João",
    outroId: ID,
    tipo: "provider",
    contextoId: ID,
    ultima: "Olá",
    porLer: id === ID && porLer,
  })
  await page.route("**/api/app/entry/progress", (rota) =>
    rota.fulfill({ json: { autenticado: true } }),
  )
  await page.route("**/api/app/avisos**", (rota) =>
    rota.fulfill({ json: { avisos: [], proximo: null, naoLidos: 0 } }),
  )
  await page.route("**/api/app/conversas", (rota) =>
    rota.fulfill({
      json: { conversas: [conversa(ID), conversa(OUTRA)], proximo: null, porLer: porLer ? 1 : 0 },
    }),
  )
  await page.route(`**/api/app/conversas/${ID}/lida`, (rota) => {
    chamadas++
    porLer = false
    return rota.fulfill({ status: 204 })
  })
  await page.route(`**/api/app/conversas/${ID}`, (rota) =>
    rota.fulfill({ json: { conversa: conversa(ID), mensagens: [], anterior: null } }),
  )
  await page.route("**/api/app/voce/bloqueados", (rota) =>
    rota.fulfill({ json: { bloqueados: [] } }),
  )
  await page.goto("/app")
  await expect(page.locator('[data-contador="conversas"]')).toHaveText("1")
  await page.goto("/app/conversas")
  await expect(page.locator(`[data-thread="${ID}"]`).getByLabel("Por ler")).toBeVisible()
  await expect(page.locator(`[data-thread="${OUTRA}"]`).getByLabel("Por ler")).toHaveCount(0)
  await page.locator(`[data-thread="${ID}"] button`).click()
  await expect.poll(() => chamadas).toBe(1)
  await page.goto("/app")
  await expect(page.locator('[data-contador="conversas"]')).toHaveCount(0)
  await page.goto("/app/conversas")
  await expect(page.getByLabel("Por ler")).toHaveCount(0)
})

test("o envio que falha vira o balão Não enviada; Tentar de novo entrega e o texto não se perde", async ({
  page,
}) => {
  const conversa = {
    id: "t-falha",
    nome: "Maria",
    outroId: "u-maria",
    tipo: "provider",
    contextoId: "n1",
    ultima: "Olá",
    porLer: false,
  }
  let falhar = true
  await page.route("**/api/app/entry/progress", (rota) =>
    rota.fulfill({ json: { autenticado: true } }),
  )
  await page.route("**/api/app/avisos**", (rota) =>
    rota.fulfill({ json: { avisos: [], proximo: null, naoLidos: 0 } }),
  )
  await page.route("**/api/app/voce/bloqueados", (rota) =>
    rota.fulfill({ json: { bloqueados: [] } }),
  )
  await page.route("**/api/app/conversas", (rota) =>
    rota.fulfill({ json: { conversas: [conversa], proximo: null, porLer: 0 } }),
  )
  await page.route("**/api/app/conversas/t-falha/lida", (rota) => rota.fulfill({ status: 204 }))
  await page.route("**/api/app/conversas/t-falha", (rota) =>
    rota.fulfill({ json: { conversa, mensagens: [], anterior: null } }),
  )
  await page.route("**/api/app/conversas/t-falha/mensagens", (rota) => {
    if (falhar) return rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
    const corpo = rota.request().postDataJSON() as { texto: string }
    return rota.fulfill({
      status: 201,
      json: {
        mensagem: {
          id: `m-${Date.now()}`,
          conteudo: corpo.texto,
          minha: true,
          criadaEm: new Date().toISOString(),
        },
      },
    })
  })

  await page.goto("/app/conversa/t-falha")
  const campo = page.locator("#mensagem-da-conversa")
  const enviarMensagem = page.locator('[data-acao="enviar-mensagem"]')

  // D14: desligado é neutro legível, em toda largura.
  await expect(enviarMensagem).toBeDisabled()
  await campo.fill("Consigo buscar na quinta às 15h.")
  await expect(enviarMensagem).toBeEnabled()
  await enviarMensagem.click()

  // O balão da própria mensagem (D24 esmaecido) com status e ação; o anúncio
  // do leitor de tela é região viva OCULTA — sem rodapé visível duplicado
  // (D22/D3).
  const balao = page.locator('[data-mensagem="nao-enviada"]')
  await expect(balao).toBeVisible()
  await expect(balao).toContainText("Consigo buscar na quinta às 15h.")
  await expect(balao.getByRole("alert")).toContainText("Não enviada")
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible()
  const anuncioOculto = page.locator('[data-compositor-conversa] [role="alert"]')
  await expect(anuncioOculto).toHaveText("Não foi possível enviar. Seu texto foi mantido.")
  await expect(anuncioOculto).toHaveCSS("width", "1px")
  // O texto continua no campo: a chave de idempotência reaproveita no reenvio.
  await expect(campo).toHaveValue("Consigo buscar na quinta às 15h.")

  // D2: o status mora dentro da área rolável de mensagens e o compositor,
  // dentro do painel — em toda largura. D1: o glifo de erro não transborda a
  // caixa de 16 px sobre o texto.
  const geometria = await page.evaluate(() => {
    const historico = document
      .querySelector('[data-mensagens="historico"]')
      ?.getBoundingClientRect()
    const status = document
      .querySelector('[data-mensagem="nao-enviada"] p:last-child')
      ?.getBoundingClientRect()
    const painel = document.querySelector('[data-conversa="painel"]')?.getBoundingClientRect()
    const compositor = document.querySelector("[data-compositor-conversa]")?.getBoundingClientRect()
    const glifo = document.querySelector('[data-mensagem="nao-enviada"] .bv-icone')
    return {
      statusDentro:
        historico !== undefined &&
        status !== undefined &&
        status.top >= historico.top &&
        status.bottom <= historico.bottom,
      compositorDentro:
        painel !== undefined && compositor !== undefined && compositor.bottom <= painel.bottom + 1,
      fonteDoGlifo: glifo === null ? null : getComputedStyle(glifo).fontSize,
    }
  })
  expect(geometria.statusDentro).toBe(true)
  expect(geometria.compositorDentro).toBe(true)
  expect(geometria.fonteDoGlifo).toBe("16px")

  // Tentar de novo entrega: o balão sai, a mensagem entra e o campo limpa.
  falhar = false
  await page.getByRole("button", { name: "Tentar de novo" }).click()
  await expect(page.locator('[data-mensagem="nao-enviada"]')).toHaveCount(0)
  await expect(page.locator('[data-mensagens="historico"]')).toContainText(
    "Consigo buscar na quinta às 15h.",
  )
  await expect(campo).toHaveValue("")
})
