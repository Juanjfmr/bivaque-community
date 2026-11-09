import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { simularConversas } from "./conversas-ajuda"
import { simularGrupos } from "./grupos-ajuda"

test("caixa abre conversa contextual", async ({ page }, testInfo) => {
  await simularConversas(page)
  await page.goto("/app/conversas")
  const thread = page.locator('[data-thread="t1"]')
  await expect(thread).toContainText("Paulo R.")
  await expect(thread).toContainText("Anúncio")
  const diretorio = join(process.cwd(), "../../.visual/run-011/capturas-simuladas")
  mkdirSync(diretorio, { recursive: true })
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
    await page.screenshot({
      path: join(diretorio, `${testInfo.project.name}-caixa-${tema}.png`),
      fullPage: true,
      animations: "disabled",
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await thread.getByRole("button").first().click()
  await expect(page).toHaveURL(/\/app\/conversa\/t1$/)
  await expect(page.locator('[data-contexto-conversa="informativo"]')).toContainText("Anúncio")
})

test("compositor mostra a resposta gravada e preserva o texto na falha", async ({ page }) => {
  await simularConversas(page)
  await page.goto("/app/conversa/t2")
  const caixa = page.locator('[data-compositor-conversa="sim"]')
  await expect(caixa).toBeVisible()
  await caixa.getByRole("button", { name: "Podemos combinar a retirada?" }).click()
  await caixa.getByRole("button", { name: "Enviar", exact: true }).click()
  await expect(page.locator('[data-mensagens="historico"]')).toContainText(
    "Podemos combinar a retirada?",
  )
  await page.reload()
  await expect(page.locator('[data-mensagens="historico"]')).toContainText(
    "Podemos combinar a retirada?",
  )
  await page.route("**/api/app/conversas/*/mensagens", (rota) =>
    rota.fulfill({ status: 503, json: {} }),
  )
  await caixa.locator("#mensagem-da-conversa").fill("Mensagem que falhou")
  await caixa.getByRole("button", { name: "Enviar", exact: true }).click()
  await expect(caixa.getByRole("alert")).toContainText("Seu texto foi mantido")
  await expect(caixa.locator("#mensagem-da-conversa")).toHaveValue("Mensagem que falhou")
  const medidas = await caixa.boundingBox()
  expect(medidas).not.toBeNull()
  if (medidas) {
    expect(medidas.x).toBeGreaterThanOrEqual(-1)
    expect(medidas.x + medidas.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 375) + 1)
  }
})
test("Grupo fechado: requer solicitação e não mostra publicações enquanto fora", async ({
  page,
}) => {
  await simularGrupos(page)
  await page.goto("/app/grupo/g-cmm")
  await expect(page.locator('[data-controles-grupo="sim"]')).toBeVisible()
  await expect(page.locator('[data-compositor-grupo="sim"]')).toHaveCount(0)
  await expect(page.getByText("conteúdo dos grupos fechados")).toBeVisible()
  await page.locator('[data-regras-grupo="sim"] summary').click()
  await expect(page.locator('[data-regras-grupo="sim"]')).toContainText(
    "Assuntos da escola e das turmas",
  )
  await page.locator('[data-acao="grupo-participar"]').click()
  await page
    .getByLabel("Por que você quer entrar? (opcional)")
    .fill("Sou responsável por um aluno.")
  await page.getByRole("button", { name: "Enviar pedido" }).click()
  await expect(page.locator('[data-estado-participacao="pendente"]')).toContainText(
    "Pedido enviado",
  )
  await page.reload()
  await expect(page.locator('[data-estado-participacao="pendente"]')).toBeVisible()
  await page.locator('[data-acao="cancelar-solicitacao"]').click()
  await expect(page.locator('[data-acao="grupo-participar"]')).toBeVisible()
})

test("Grupo aberto: entrar, escrever rascunho, excluir e sair com confirmação", async ({
  page,
}) => {
  await simularGrupos(page)
  await page.goto("/app/grupo/g-pets")
  await page.locator('[data-acao="grupo-participar"]').click()
  await expect(page.locator('[data-estado-participacao="membro"]')).toBeVisible()
  await page.locator('[data-acao="escrever-grupo"]').click()
  const dialogo = page.locator('[data-dialogo="escrever-grupo"]')
  await expect(dialogo).toBeVisible()
  await dialogo.locator("#texto-grupo").fill("Procuro veterinário que atenda à noite na região.")
  await dialogo.locator('[data-acao="salvar-rascunho-grupo"]').click()
  await expect(dialogo).toHaveCount(0)
  await expect(page.locator('[data-rascunho-grupo="sim"]')).toContainText("Procuro veterinário")
  await page.reload()
  await expect(page.locator('[data-rascunho-grupo="sim"]')).toHaveCount(1)
  await page.locator('[data-acao="excluir-rascunho-grupo"]').click()
  await expect(page.locator('[data-rascunho-grupo="sim"]')).toHaveCount(0)
  await page.locator('[data-acao="sair-grupo"]').click()
  await expect(page.locator('[data-dialogo="sair-grupo"]')).toBeVisible()
  await page.locator('[data-dialogo="sair-grupo"] [data-acao="confirmar-saida-grupo"]').click()
  await expect(page.locator('[data-acao="grupo-participar"]')).toBeVisible()
})

test("Grupo com administrador mostra pedidos, mas não oferece aprovação fictícia", async ({
  page,
}) => {
  await simularGrupos(page)
  await page.goto("/app/grupo/g-futebol")
  const pedidos = page.locator('[data-pedidos-entrada="sim"]')
  await expect(pedidos).toBeVisible()
  await pedidos.locator("summary").click()
  await expect(pedidos).toContainText("Bruno C.")
  await expect(pedidos).toContainText("Thiago S.")
  await expect(pedidos).not.toContainText("ilustrativa")
  await expect(page.locator('[data-compositor-grupo="sim"]')).toBeVisible()
})

test("pedidos do grupo: duplo clique nao duplica pagina, erro preserva lista e retry avanca", async ({
  page,
}) => {
  await simularGrupos(page)
  let liberar: () => void = () => {
    throw new Error("Pagina ainda nao solicitada")
  }
  const respostaPendente = new Promise<void>((resolve) => {
    liberar = resolve
  })
  let paginasSolicitadas = 0
  await page.route(/\/api\/app\/grupos\/g-futebol\/pedidos(?:\?|$)/, async (rota) => {
    const depois = new URL(rota.request().url()).searchParams.get("depois")
    if (depois === null)
      return rota.fulfill({
        json: {
          pedidos: [{ id: "u1", nome: "Bruno C.", motivo: "Quero participar." }],
          proximo: "pagina-2",
        },
      })
    expect(depois).toBe("pagina-2")
    paginasSolicitadas++
    if (paginasSolicitadas === 1) {
      await respostaPendente
      return rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
    }
    return rota.fulfill({
      json: {
        pedidos: [{ id: "u2", nome: "Thiago S.", motivo: "Sou novo na cidade." }],
        proximo: null,
      },
    })
  })

  await page.goto("/app/grupo/g-futebol")
  const pedidos = page.locator('[data-pedidos-entrada="sim"]')
  await pedidos.locator("summary").click()
  await expect(pedidos).toContainText("Bruno C.")
  await pedidos.getByRole("button", { name: "Ver mais pedidos" }).evaluate((botao) => {
    const alvo = botao as HTMLButtonElement
    alvo.click()
    alvo.click()
  })
  await expect.poll(() => paginasSolicitadas).toBe(1)
  await expect(pedidos.getByRole("button", { name: "Carregando…" })).toBeDisabled()
  liberar()

  await expect(pedidos.getByRole("alert")).toContainText("Não foi possível carregar mais pedidos.")
  await expect(pedidos).toContainText("Bruno C.")
  await pedidos.getByRole("button", { name: "Ver mais pedidos" }).click()
  await expect(pedidos).toContainText("Thiago S.")
  await expect(pedidos.getByText("Bruno C.")).toHaveCount(1)
  await expect(pedidos.getByText("Thiago S.")).toHaveCount(1)
  await expect(pedidos.getByRole("button", { name: "Ver mais pedidos" })).toHaveCount(0)
  expect(paginasSolicitadas).toBe(2)
})

test("pedidos do grupo: falha inicial oferece tentar de novo sem exibir vazio falso", async ({
  page,
}) => {
  await simularGrupos(page)
  let leituras = 0
  await page.route(/\/api\/app\/grupos\/g-futebol\/pedidos(?:\?|$)/, async (rota) => {
    leituras++
    if (leituras === 1) return rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
    return rota.fulfill({
      json: {
        pedidos: [{ id: "u1", nome: "Bruno C.", motivo: "Quero participar." }],
        proximo: null,
      },
    })
  })

  await page.goto("/app/grupo/g-futebol")
  const pedidos = page.locator('[data-pedidos-entrada="sim"]')
  await pedidos.locator("summary").click()
  await expect(pedidos.getByRole("alert")).toContainText("Não foi possível carregar os pedidos.")
  await expect(pedidos).not.toContainText("Nenhum pedido pendente.")
  await pedidos.getByRole("button", { name: "Tentar de novo" }).click()
  await expect(pedidos).toContainText("Bruno C.")
  await expect(pedidos.getByRole("alert")).toHaveCount(0)
  expect(leituras).toBe(2)
})
