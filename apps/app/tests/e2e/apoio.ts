import { test as base, expect, type Locator, type Page } from "@playwright/test"

// Apoio dos specs de navegação. Tudo aqui mede o que a pessoa veria: URL,
// texto, atributo visível, foco, rolagem real do contêiner e valor de campo.
// Nenhum spec lê `history.state`, nem o interior do roteador, nem qualquer
// diagnóstico que o próprio app renderize sobre si mesmo.

/**
 * Modo de prova: só com ele os controles fictícios existem. A navegação
 * medida continua sendo a de verdade — mesmas rotas, mesma barra, mesmo
 * histórico. O modo entra por um global da janela, não pelo histórico nem pela
 * URL, e não é ativado em uso normal.
 */
export const test = base.extend<{ modoDeProva: void }>({
  modoDeProva: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        ;(window as unknown as { __BIVAQUE_MODO_DE_PROVA__?: boolean }).__BIVAQUE_MODO_DE_PROVA__ =
          true
      })
      await use()
    },
    { auto: true },
  ],
})

export { expect }

export const SELETOR_CONTEUDO = "#conteudo"
export const SELETOR_TITULO = "h1[data-titulo-da-tela]"

/** Parâmetro com Unicode, espaço, barra e interrogação. */
export const PERGUNTA_DIFICIL = "mudança de cidade/2026 ?!"
export const SELETOR_ABRIR_PERGUNTA = '[data-acao="abrir-pergunta"][data-valor="pergunta-dificil"]'
export const PREFIXO_DA_PERGUNTA = "/app/pergunta/"

export async function abrir(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho)
  await expect(page.locator(SELETOR_TITULO)).toBeVisible()
}

export function conteudo(page: Page): Locator {
  return page.locator(SELETOR_CONTEUDO)
}

export function tituloDaTela(page: Page): Locator {
  return page.locator(SELETOR_TITULO)
}

export function abaAtiva(page: Page): Locator {
  return page.locator('[data-nav="principal"] [aria-current="page"]')
}

export function subAbaAtiva(page: Page): Locator {
  return page.locator('[data-subabas="mercado"] [aria-current="page"]')
}

export function seletorDoItem(valor: string): string {
  return `[data-acao="abrir-item"][data-valor="${valor}"]`
}

export async function caminhoAtual(page: Page): Promise<string> {
  return new URL(page.url()).pathname
}

export async function rolagemReal(page: Page): Promise<number> {
  return await conteudo(page).evaluate((elemento) => elemento.scrollTop)
}

/**
 * Espera o navegador terminar o que estava pendente: os eventos de scroll são
 * despachados antes dos callbacks de quadro, então um quadro depois da roda já
 * significa que o app registrou a posição.
 */
export async function aguardarQuadros(page: Page, quantos = 2): Promise<void> {
  for (let indice = 0; indice < quantos; indice += 1) {
    await page.evaluate(
      () => new Promise((resolver) => requestAnimationFrame(() => resolver(null))),
    )
  }
}

/**
 * Rola como uma pessoa rola — roda do mouse sobre o contêiner — e devolve a
 * posição real lida do DOM. A rolagem por script não dispara evento de scroll
 * neste navegador sem tela, então ela não passaria pelo registro da entrada.
 */
export async function rolarAte(page: Page, posicao: number): Promise<void> {
  const alvo = conteudo(page)
  const passo = 200
  let semMudanca = 0
  for (let tentativa = 0; tentativa < 60; tentativa += 1) {
    await aguardarQuadros(page)
    const atual = await rolagemReal(page)
    if (atual === posicao) break
    await alvo.hover()
    await page.mouse.wheel(0, Math.max(-passo, Math.min(passo, posicao - atual)))
    await aguardarQuadros(page)
    const proximo = await rolagemReal(page)
    semMudanca = proximo === atual ? semMudanca + 1 : 0
    if (semMudanca >= 3) break
  }
  await aguardarQuadros(page)
  expect(await rolagemReal(page)).toBe(posicao)
}

export function esperarRolagem(page: Page, posicao: number) {
  return expect.poll(async () => await rolagemReal(page), { timeout: 10_000 }).toBe(posicao)
}

export function esperarCaminho(page: Page, caminho: string) {
  return expect.poll(async () => await caminhoAtual(page), { timeout: 10_000 }).toBe(caminho)
}

export function esperarContagem(locator: Locator, quantos: number) {
  return expect.poll(async () => await locator.count(), { timeout: 10_000 }).toBe(quantos)
}

/** O parâmetro do detalhe volta inteiro depois de codificar e decodificar. */
export function esperarNaPerguntaDificil(page: Page) {
  return expect
    .poll(
      async () => {
        const caminho = await caminhoAtual(page)
        if (!caminho.startsWith(PREFIXO_DA_PERGUNTA)) return ""
        return decodeURIComponent(caminho.slice(PREFIXO_DA_PERGUNTA.length))
      },
      { timeout: 10_000 },
    )
    .toBe(PERGUNTA_DIFICIL)
}

export async function voltarNoNavegador(page: Page, caminho: string): Promise<void> {
  await page.goBack()
  await esperarCaminho(page, caminho)
}
