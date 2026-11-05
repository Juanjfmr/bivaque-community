import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"

// Prova da interface com HTTP controlado. Não substitui o E2E do banco local.
const ID = "30000000-0000-4000-8000-000000000010"
const PEDIDO = "40000000-0000-4000-8000-000000000023"
const resumo = {
  id: ID,
  nome: "Climatiza Manaus",
  categoria: "assistencia_tecnica",
  categoriaNome: "Assistência técnica",
  descricao: "Manutenção e instalação de ar-condicionado",
}
const ficha = {
  ...resumo,
  cidade: "Manaus",
  podePedir: true,
  servicos: [{ id: "s1", titulo: "Limpeza completa", descricao: null }],
  foto: null,
  fotoDescricao: null,
}
const pedidoInicial = {
  id: PEDIDO,
  negocioId: ID,
  negocioNome: resumo.nome,
  categoriaNome: resumo.categoriaNome,
  descricao: "Limpar o ar-condicionado",
  quando: "Nesta semana",
  situacao: "open",
  criadoEm: "2026-11-05T12:00:00Z",
  atualizadoEm: "2026-11-05T12:00:00Z",
  conversaId: null,
}
const categorias = [
  { id: "assistencia_tecnica", nome: "Assistência técnica" },
  { id: "pets", nome: "Pets" },
]
const DIRETORIO = join(process.cwd(), "..", "..", ".visual", "run-010", "app-capturas")

async function capturar(page: Page, nome: string) {
  mkdirSync(DIRETORIO, { recursive: true })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: join(DIRETORIO, `${nome}.png`),
    fullPage: true,
    animations: "disabled",
  })
}

function luminancia(cor: string) {
  const [r = 0, g = 0, b = 0] = (cor.match(/[\d.]+/g) ?? [])
    .map(Number)
    .slice(0, 3)
    .map((c) => {
      const valor = c / 255
      return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

for (const tema of ["light", "dark"] as const) {
  test.describe(`F07 — interface em ${tema}`, () => {
    test.use({ colorScheme: tema })

    test("lista, ficha, falha de envio, retorno gravado e acompanhamento", async ({
      page,
    }, testInfo) => {
      let pedido: typeof pedidoInicial | null = null
      const chaves: unknown[] = []
      await page.route(/\/api\/app\/negocios(?:[/?]|$)/, async (rota) => {
        const caminho = new URL(rota.request().url()).pathname
        if (caminho.endsWith("/pedidos")) {
          const corpo = rota.request().postDataJSON() as Record<string, unknown>
          chaves.push(corpo["chave"])
          if (chaves.length === 1) {
            await rota.fulfill({ status: 503, json: { erro: "escrita-indisponivel" } })
            return
          }
          pedido = {
            ...pedidoInicial,
            descricao: String(corpo["descricao"]),
            quando: String(corpo["quando"]),
          }
          await rota.fulfill({ status: 201, json: { pedido } })
        } else if (caminho.endsWith(ID)) {
          await rota.fulfill({ json: { negocio: ficha } })
        } else {
          await rota.fulfill({
            json: { negocios: [resumo], categorias, cidade: "Manaus", proximo: null },
          })
        }
      })
      await page.route(/\/api\/app\/pedidos(?:[/?]|$)/, async (rota) => {
        const detalhe = new URL(rota.request().url()).pathname.endsWith(PEDIDO)
        await rota.fulfill({
          json: detalhe ? { pedido } : { pedidos: pedido === null ? [] : [pedido], proximo: null },
        })
      })

      await page.goto("/app/negocios")
      await expect(page.locator('[data-cartao="negocio"]')).toContainText(resumo.nome)
      await page.locator('[data-chip="assistencia_tecnica"]').click()
      await expect(page.locator('[data-chip="assistencia_tecnica"]')).toHaveAttribute(
        "data-state",
        "on",
      )
      await capturar(page, `${testInfo.project.name}-${tema}-01-negocios`)
      await page.getByRole("button", { name: `Ver negócio: ${resumo.nome}`, exact: true }).click()
      await expect(page.getByRole("heading", { level: 1, name: resumo.nome })).toBeVisible()
      await expect(page.getByText("Limpeza completa")).toBeVisible()
      await expect(page.getByRole("heading", { name: "Onde atende", exact: true })).toBeVisible()
      await capturar(page, `${testInfo.project.name}-${tema}-02-ficha`)

      const pedir = page.getByRole("button", { name: "Pedir orçamento", exact: true })
      await expect
        .poll(async () => {
          const cores = await pedir.evaluate((elemento) => ({
            texto: getComputedStyle(elemento).color,
            fundo: getComputedStyle(elemento).backgroundColor,
          }))
          const texto = luminancia(cores.texto)
          const fundo = luminancia(cores.fundo)
          return (Math.max(texto, fundo) + 0.05) / (Math.min(texto, fundo) + 0.05)
        })
        .toBeGreaterThanOrEqual(4.5)
      const alvo = await pedir.boundingBox()
      expect(alvo?.height).toBeGreaterThanOrEqual(44)
      expect(alvo?.width).toBeGreaterThanOrEqual(44)
      await pedir.focus()
      await page.keyboard.press("Enter")
      await expect(page.locator("[data-sobreposicao]")).toHaveCount(1)
      await expect(page.getByRole("dialog")).toBeVisible()
      await page.getByLabel("O que você precisa?").fill("Limpar o ar-condicionado da sala")
      await page.getByLabel("Quando precisa? (opcional)").fill("Nesta semana")
      await capturar(page, `${testInfo.project.name}-${tema}-03-formulario`)
      await page.getByRole("button", { name: "Enviar pedido", exact: true }).click()
      await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
        "Seu texto continua aqui",
      )
      await expect(page.getByLabel("O que você precisa?")).toHaveValue(
        "Limpar o ar-condicionado da sala",
      )
      await expect(page.getByRole("button", { name: "Enviar pedido", exact: true })).toBeEnabled()
      await capturar(page, `${testInfo.project.name}-${tema}-04-falha`)
      await page.getByRole("button", { name: "Enviar pedido", exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/app/pedido/${PEDIDO}$`))
      expect(chaves).toHaveLength(2)
      expect(chaves[0]).toBe(chaves[1])
      await expect(page.locator("[data-descricao-do-pedido]")).toHaveText(
        "Limpar o ar-condicionado da sala",
      )
      await page.reload()
      await expect(page.locator("[data-descricao-do-pedido]")).toHaveText(
        "Limpar o ar-condicionado da sala",
      )
      await expect(page.getByText("Em aberto", { exact: true })).toBeVisible()
      await capturar(page, `${testInfo.project.name}-${tema}-05-pedido`)
      await page.getByRole("button", { name: "Ver meus pedidos", exact: true }).click()
      await expect(page.locator('[data-tela="pedidos"] [data-linha="lista"]')).toContainText(
        "Limpar o ar-condicionado da sala",
      )
      await capturar(page, `${testInfo.project.name}-${tema}-06-acompanhamento`)
    })

    test("erro não vira vazio, nova tentativa recupera e filtro volta no histórico", async ({
      page,
    }, testInfo) => {
      let falha = true
      await page.route(/\/api\/app\/negocios(?:[/?]|$)/, async (rota) => {
        const url = new URL(rota.request().url())
        if (url.pathname.endsWith(ID)) {
          await rota.fulfill({ json: { negocio: ficha } })
        } else if (falha) {
          await rota.fulfill({ status: 503, json: { erro: "leitura-indisponivel" } })
        } else {
          const negocios = url.searchParams.get("categoria") === "pets" ? [] : [resumo]
          await rota.fulfill({ json: { negocios, categorias, cidade: "Manaus", proximo: null } })
        }
      })
      await page.goto("/app/negocios")
      await expect(page.getByRole("button", { name: "Tentar de novo", exact: true })).toBeVisible()
      await expect(page.getByText("Ainda sem negócios cadastrados", { exact: true })).toHaveCount(0)
      falha = false
      await page.getByRole("button", { name: "Tentar de novo", exact: true }).click()
      await expect(page.locator('[data-cartao="negocio"]')).toBeVisible()
      await page.locator('[data-chip="pets"]').click()
      await expect(page.getByText("Ainda sem negócios cadastrados", { exact: true })).toBeVisible()
      await capturar(page, `${testInfo.project.name}-${tema}-07-vazio`)
      await page.locator('[data-chip="assistencia_tecnica"]').click()
      await expect(page.locator('[data-cartao="negocio"]')).toBeVisible()
      await page.getByRole("button", { name: `Ver negócio: ${resumo.nome}`, exact: true }).click()
      await expect(page.getByRole("heading", { level: 1, name: resumo.nome })).toBeVisible()
      await page.goBack()
      await expect(page.locator('[data-chip="assistencia_tecnica"]')).toHaveAttribute(
        "data-state",
        "on",
      )
    })

    test("sessão vencida e acesso negado têm saída própria", async ({ page }) => {
      await page.route(/\/api\/app\/negocios(?:[/?]|$)/, (rota) =>
        rota.fulfill({ status: 401, json: { erro: "sem-sessao" } }),
      )
      await page.goto("/app/negocios")
      await expect(page.getByRole("button", { name: "Entrar de novo", exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: "Tentar de novo", exact: true })).toHaveCount(0)
      await page.route(/\/api\/app\/pedidos(?:[/?]|$)/, (rota) =>
        rota.fulfill({ status: 403, json: { erro: "recusado" } }),
      )
      await page.goto(`/app/pedido/${PEDIDO}`)
      await expect(page.locator('[data-estado="negado"]')).toContainText("Sem acesso")
    })
  })
}
