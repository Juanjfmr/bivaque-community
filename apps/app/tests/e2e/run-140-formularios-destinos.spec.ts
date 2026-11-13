import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"
import { definirCascaDaProva, simularProgresso } from "./apoio"
import { simularCriar } from "./criar-ajuda"
import { simularGrupos } from "./grupos-ajuda"
import { simularInicio } from "./inicio-ajuda"
import { CIDADE_DO_LOTE, simularEncontros, simularSemResolvidas } from "./run-140-ajuda"

/**
 * RUN-140 — os formulários do Criar em pt-BR e os destinos com contexto.
 *
 * Duas coisas se provam aqui, nas seis larguras do `playwright.config.ts` (as
 * três do lote são 375, 768 e 1440) e nos dois temas:
 *
 * 1. data e hora em pt-BR (dd/mm/aaaa e 24 h), erro logo abaixo do campo que o
 *    originou — com borda marcada e `aria-describedby` — e a ação primária
 *    desligada enquanto os obrigatórios não fecham; a falha do servidor aparece
 *    sem apagar o que foi digitado;
 * 2. Grupo, Publicação e Comunidade dizem onde a pessoa está e têm vazio
 *    honesto: o de "Salvas" fala de salvas, não do grupo.
 *
 * As capturas vão para `.visual/run-140/<largura>-<tema>-<passo>.png`, com a
 * largura real do projeto — nada de fixar tamanho por dentro.
 */

const PASTA = join(process.cwd(), "..", "..", ".visual", "run-140")

async function capturar(page: Page, passo: string): Promise<void> {
  mkdirSync(PASTA, { recursive: true })
  const largura = page.viewportSize()?.width ?? 0
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema })
    await page.screenshot({ path: join(PASTA, `${largura}-${tema}-${passo}.png`), fullPage: true })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
  await page.emulateMedia({ colorScheme: "light" })
}

async function abrirNovoEncontro(page: Page): Promise<void> {
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await page.locator('[data-escolha="create-event"]').click()
  await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await simularProgresso(page)
  await simularInicio(page)
  await definirCascaDaProva(page, { cidade: CIDADE_DO_LOTE })
})

test("encontro: dd/mm/aaaa e 24 h, erro no campo e envio só com os obrigatórios", async ({
  page,
}) => {
  await simularEncontros(page)
  await abrirNovoEncontro(page)

  const folha = page.locator('[data-sobreposicao="folha"]')
  const criar = folha.getByRole("button", { name: "Criar", exact: true })
  const titulo = folha.getByLabel("Título")
  const data = folha.getByLabel("Data")
  const hora = folha.getByLabel("Hora")

  // Nada preenchido: a ação primária está desligada.
  await expect(criar).toBeDisabled()

  // 05/12 é 5 de dezembro: a leitura é dia/mês, não mês/dia.
  await data.fill("05/12/2026")
  await hora.fill("19:00")
  await expect(folha.locator('[data-quando-do-encontro="sim"]')).toContainText("05/12/2026")
  await expect(folha.locator('[data-quando-do-encontro="sim"]')).toContainText("às 19h")
  await expect(criar).toBeDisabled()
  await capturar(page, "encontro-preenchido")

  // O erro nasce no campo: título de uma letra, ao sair dele.
  await titulo.fill("C")
  await hora.click()
  await expect(folha.locator("#encontro-titulo-erro")).toContainText("pelo menos 2 caracteres")
  await expect(titulo).toHaveAttribute("aria-invalid", "true")
  await expect(titulo).toHaveAttribute("aria-describedby", /encontro-titulo-erro/)

  // Data que não existe no calendário também acusa no próprio campo.
  await data.fill("31/02/2026")
  await hora.click()
  await expect(folha.locator("#encontro-data-erro")).toContainText("não existe")
  await expect(folha.locator("#encontro-titulo-erro")).toContainText("pelo menos 2 caracteres")
  await expect(criar).toBeDisabled()
  await capturar(page, "encontro-erro")

  // Corrigido, a ação liga e grava.
  await titulo.fill("Encontro de veteranos no centro")
  await data.fill("05/12/2026")
  await hora.fill("19:00")
  await expect(criar).toBeEnabled()
  await criar.click()

  await expect(page).toHaveURL(/\/app\/evento\/90000000-/)
  await expect(page.getByRole("heading", { name: "Encontro de veteranos no centro" })).toBeVisible()
  const tela = page.locator('[data-tela="evento"]')
  await expect(tela).toContainText("05/12/2026")
  await expect(tela).toContainText("às 19h")
  await capturar(page, "encontro-gravado")
})

test("encontro: falha do servidor fica visível e não apaga o que foi digitado", async ({
  page,
}) => {
  await simularEncontros(page, { recusas: 1 })
  await abrirNovoEncontro(page)

  const folha = page.locator('[data-sobreposicao="folha"]')
  await folha.getByLabel("Título").fill("Café da manhã dos veteranos")
  await folha.getByLabel("Data").fill("05/12/2026")
  await folha.getByLabel("Hora").fill("19:30")
  await folha.getByRole("button", { name: "Criar", exact: true }).click()

  await expect(folha.getByRole("alert")).toContainText("Não foi possível criar o encontro")
  await expect(folha.getByLabel("Título")).toHaveValue("Café da manhã dos veteranos")
  await expect(folha.getByLabel("Data")).toHaveValue("05/12/2026")
  await expect(folha.getByLabel("Hora")).toHaveValue("19:30")
  await capturar(page, "encontro-falha")

  // A segunda tentativa é a da pessoa e grava.
  await folha.getByRole("button", { name: "Criar", exact: true }).click()
  await expect(page).toHaveURL(/\/app\/evento\/90000000-/)
})

test("pergunta e desapego: erro no campo e ação primária desligada até validar", async ({
  page,
}) => {
  await simularCriar(page)

  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await page.locator('[data-escolha="ask"]').click()
  const pergunta = page.locator('[data-fluxo="perguntar"]')
  const revisarPergunta = pergunta.getByRole("button", { name: "Revisar pergunta" })
  await expect(pergunta.locator("#nova-pergunta")).toBeVisible()
  await expect(revisarPergunta).toBeDisabled()

  await pergunta.locator("#nova-pergunta").fill("Bike?")
  await page.locator('[data-topicos="pergunta"]').click()
  await expect(pergunta.locator("#nova-pergunta-erro")).toContainText("um pouco mais de contexto")
  await expect(pergunta.locator("#nova-pergunta")).toHaveAttribute("aria-invalid", "true")
  await expect(revisarPergunta).toBeDisabled()
  await capturar(page, "pergunta-erro")

  await pergunta.locator("#nova-pergunta").fill("Indicam um serviço de manutenção de bicicletas?")
  await expect(revisarPergunta).toBeEnabled()

  // Desapego: o preço é o campo que acusa, e a revisão mostra reais em pt-BR.
  await page.goto("/app/inicio")
  await page.locator('[data-acao="criar"]').click()
  await page.locator('[data-escolha="create-item"]').click()
  const anuncio = page.locator('[data-formulario-criacao="create-item"]')
  const revisarAnuncio = anuncio.getByRole("button", { name: "Revisar anúncio" })
  await expect(revisarAnuncio).toBeDisabled()
  await anuncio.locator("#criacao-titulo").fill("Mesa com quatro cadeiras seminova")
  await anuncio.locator("#criacao-complemento").fill("Flores")
  await anuncio.locator("#criacao-preco").fill("0")
  const descricao = anuncio.locator("#criacao-descricao")
  await descricao.focus()
  await anuncio.locator("#criacao-preco").click()
  await expect(anuncio.locator("#criacao-descricao-erro")).toContainText("Descreva o item.")
  await expect(descricao).toHaveAttribute("aria-invalid", "true")
  await expect(descricao).toHaveAttribute("aria-describedby", /criacao-descricao-erro/)
  await expect(await descricao.evaluate((element) => getComputedStyle(element).borderColor)).toBe(
    await descricao.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--destructive").trim().replaceAll(" ", ", "),
    ),
  )
  await anuncio.locator("#criacao-descricao").fill("Mesa de madeira em bom estado.")
  await expect(anuncio.locator("#criacao-preco-erro")).toContainText("Informe um valor como 650")
  await expect(anuncio.locator("#criacao-preco")).toHaveAttribute("aria-invalid", "true")
  await expect(revisarAnuncio).toBeDisabled()
  await capturar(page, "desapego-erro")

  await anuncio.locator("#criacao-preco").fill("750.50")
  await expect(revisarAnuncio).toBeEnabled()
  await revisarAnuncio.click()
  await expect(anuncio.locator('[data-revisao="desapego"]')).toContainText("R$ 750,50")
  await capturar(page, "desapego-revisao")

  await anuncio.getByRole("button", { name: "Publicar anúncio" }).click()
  await expect(page).toHaveURL(/\/app\/anuncio\/[0-9a-f-]+$/)
})

test("destino: grupo e publicação dizem o grupo e a cidade, e o vazio é honesto", async ({
  page,
}) => {
  await simularGrupos(page, { membro: true })

  // g-futebol não tem publicação nenhuma: é o vazio de verdade do grupo.
  await page.goto("/app/grupo/g-futebol")
  const cabeca = page.locator('[data-cabeca="pagina"]')
  await expect(cabeca).toContainText("Futebol de sábado")
  await expect(cabeca).toContainText(CIDADE_DO_LOTE)
  await expect(cabeca).toContainText("12 membros")
  await expect(page.locator('[data-estado="vazio"]')).toContainText("Ainda sem publicações")
  await capturar(page, "grupo-vazio")

  // Em "Salvas", o vazio fala de salvas — não do grupo.
  await page.getByRole("button", { name: "Salvas", exact: true }).click()
  await expect(page.locator('[data-estado="vazio"]')).toContainText("Nada salvo neste grupo")
  await capturar(page, "grupo-vazio-salvas")

  // A publicação diz de qual grupo e de qual cidade ela é.
  await page.goto("/app/publicacao/p-pets")
  const publicacao = page.locator('[data-tela="publicacao"]')
  await expect(publicacao).toContainText("Pets de Manaus")
  await expect(publicacao.locator('[data-cidade-do-grupo="sim"]')).toContainText(CIDADE_DO_LOTE)
  await capturar(page, "publicacao-contexto")
})

test("destino: a Comunidade vazia fala do filtro escolhido", async ({ page }) => {
  await simularCriar(page)
  await simularSemResolvidas(page)
  await page.goto("/app/comunidade")
  await expect(page.locator('[data-tela="comunidade"]')).toBeVisible()
  await page.locator('[data-chip="ok"]').click()
  await expect(page.locator('[data-estado="vazio"]')).toContainText(
    "Nenhuma indicação resolvida ainda",
  )
  await capturar(page, "comunidade-vazio-resolvidas")
})
