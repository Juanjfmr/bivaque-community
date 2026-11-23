import AxeBuilder from "@axe-core/playwright"
import { expect, type Locator, type Page, test } from "@playwright/test"
import {
  EVENTO_DA_PROVA,
  simularEvento,
  simularProgresso,
  simularVerbeteDoGuia,
  VERBETE_DA_PROVA,
} from "./apoio"
import { simularCriar } from "./criar-ajuda"
import { PADRAO, simularServidorF09F10 } from "./f09-f10-ajuda"
import { simularGrupos } from "./grupos-ajuda"
import { ID_PERGUNTA, simularPerguntas } from "./perguntas-ajuda"
import { simularEncontros } from "./run-140-ajuda"
import { aplicarStubMercado } from "./stub-mercado"
import { simularVoce } from "./voce-ajuda"

async function alcancarComTab(page: Page, alvo: Locator) {
  for (let volta = 0; volta < 160; volta += 1) {
    await page.keyboard.press("Tab")
    if (await alvo.evaluate((elemento) => elemento === document.activeElement)) {
      const foco = await alvo.evaluate((elemento) => {
        const estilo = getComputedStyle(elemento)
        return estilo.outlineStyle !== "none" || estilo.boxShadow !== "none"
      })
      expect(foco).toBe(true)
      return
    }
  }
  throw new Error(`Tab não alcançou ${alvo}`)
}

test.describe("teclado por jornada", () => {
  test("F04: abrir compositor do grupo", async ({ page }) => {
    await simularProgresso(page)
    await simularGrupos(page)
    await page.goto("/app/grupo/g-pets")
    const alvo = page.locator('[data-acao="escrever-grupo"]')
    await expect(alvo).toBeVisible()
    await alcancarComTab(page, alvo)
    await page.keyboard.press("Enter")
    await expect(page.locator('[data-dialogo="escrever-grupo"]')).toBeVisible()
  })

  test("F10: abrir pessoas bloqueadas", async ({ page }) => {
    await simularProgresso(page)
    await simularVoce(page)
    await page.goto("/app/voce")
    const alvo = page.getByRole("button", { name: /Pessoas bloqueadas/ })
    await expect(alvo).toBeVisible()
    await alcancarComTab(page, alvo)
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/app\/bloqueados$/)
  })
})

test("alvos das folhas de pergunta e desapego medem ao menos 24 px em 375", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await simularProgresso(page)
  await simularCriar(page)
  for (const escolha of ["ask", "create-item"] as const) {
    await page.goto("/app/inicio")
    await page.locator('[data-acao="criar"]').click()
    await page.locator(`[data-escolha="${escolha}"]`).click()
    const alvo =
      escolha === "ask"
        ? page.getByRole("button", { name: "Revisar pergunta" })
        : page.locator('[data-formulario-criacao="create-item"] button[type="submit"]')
    await expect(alvo).toBeVisible()
    const caixa = await alvo.boundingBox()
    expect(caixa).not.toBeNull()
    expect(caixa?.width).toBeGreaterThanOrEqual(24)
    expect(caixa?.height).toBeGreaterThanOrEqual(24)
  }
})

test("movimento reduzido na folha de pergunta aberta pelo teclado", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await simularProgresso(page)
  await simularCriar(page)
  await page.goto("/app/inicio")
  await alcancarComTab(page, page.locator('[data-acao="criar"]'))
  await page.keyboard.press("Enter")
  await expect(page.locator('[data-escolha="ask"]')).toBeFocused()
  await page.keyboard.press("Enter")
  const folha = page.locator('[data-fluxo="perguntar"]')
  await expect(folha).toBeVisible()
  const duracoes = await folha.evaluate((elemento) =>
    elemento.getAnimations().map((animacao) => animacao.effect?.getComputedTiming().duration),
  )
  expect(duracoes.every((duracao) => duracao === 0)).toBe(true)
})

const telas = [
  {
    nome: "Comunidade",
    caminho: "/app/comunidade",
    conteudo: "pediatra",
    preparar: simularPerguntas,
  },
  {
    nome: "Pergunta",
    caminho: `/app/pergunta/${ID_PERGUNTA}`,
    conteudo: "pediatra",
    preparar: simularPerguntas,
  },
  {
    nome: "Grupo",
    caminho: "/app/grupo/g-pets",
    conteudo: "Pets de Manaus",
    preparar: simularGrupos,
  },
  {
    nome: "Publicação",
    caminho: "/app/publicacao/p-pets",
    conteudo: "Pets",
    preparar: simularGrupos,
  },
  { nome: "Você", caminho: "/app/voce", conteudo: "Ana Verificada", preparar: simularVoce },
  {
    nome: "Bloqueados",
    caminho: "/app/bloqueados",
    conteudo: "Desbloquear",
    preparar: simularVoce,
  },
  {
    nome: "Ocultados",
    caminho: "/app/ocultados",
    conteudo: "Mostrar de novo",
    preparar: simularVoce,
  },
  { nome: "Perfil", caminho: "/app/perfil/u-paulo", conteudo: "Paulo", preparar: simularVoce },
  {
    nome: "Apagar conta",
    caminho: "/app/apagar-conta",
    conteudo: "permanente e não pode ser desfeita",
    preparar: simularVoce,
  },
] as const

const telasAdicionais = [
  {
    nome: "Agenda vazia",
    pronto: '[data-tela="agenda"]',
    caminho: "/app/agenda",
    preparar: simularEncontros,
  },
  {
    nome: "Evento",
    pronto: '[data-tela="evento"]',
    caminho: `/app/evento/${EVENTO_DA_PROVA.evento.id}`,
    preparar: simularEvento,
  },
  {
    nome: "Verbete",
    pronto: "text=Escola Municipal Rio Negro",
    caminho: `/app/guia/${VERBETE_DA_PROVA.id}`,
    preparar: simularVerbeteDoGuia,
  },
  {
    nome: "Anúncio",
    pronto: "text=Sofá retrátil seminovo",
    caminho: "/app/anuncio/a-1",
    preparar: aplicarStubMercado,
  },
  {
    nome: "Imóveis",
    pronto: '[data-acao="abrir-anuncio"]',
    caminho: "/app/imoveis",
    preparar: aplicarStubMercado,
  },
  {
    nome: "Conversa aberta",
    pronto: '[data-mensagens="historico"]',
    caminho: "/app/conversa/t1",
    preparar: (page: import("@playwright/test").Page) => simularServidorF09F10(page, { ...PADRAO }),
  },
  {
    nome: "Avisos",
    pronto: '[data-aviso-item="a1"]',
    caminho: "/app/avisos",
    preparar: (page: import("@playwright/test").Page) => simularServidorF09F10(page, { ...PADRAO }),
  },
  {
    nome: "Salvos",
    pronto: '[data-tela="salvos"] [data-acao="abrir-anuncio"]',
    caminho: "/app/salvos",
    preparar: (page: import("@playwright/test").Page) => simularServidorF09F10(page, { ...PADRAO }),
  },
] as const

for (const escolha of ["ask", "create-item"] as const) {
  test(`axe: folha Criar ${escolha}`, async ({ page }) => {
    await simularProgresso(page)
    await simularCriar(page)
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto("/app/inicio")
    await page.locator('[data-acao="criar"]').click()
    await page.locator(`[data-escolha="${escolha}"]`).click()
    await expect(
      page.locator(
        escolha === "ask" ? '[data-fluxo="perguntar"]' : '[data-formulario-criacao="create-item"]',
      ),
    ).toBeVisible()
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(
      resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([])
  })
}

for (const caso of [
  {
    nome: "Conversas vazias",
    caminho: "/app/conversas",
    rota: /\/api\/app\/conversas(?:\?|$)/,
    falha: false,
  },
  {
    nome: "Falha de conversas",
    caminho: "/app/conversas",
    rota: /\/api\/app\/conversas(?:\?|$)/,
    falha: true,
  },
  {
    nome: "Falha de salvos",
    caminho: "/app/salvos",
    rota: /\/api\/app\/mercado\/salvos(?:\?|$)/,
    falha: true,
  },
] as const) {
  test(`axe: ${caso.nome}`, async ({ page }) => {
    await simularServidorF09F10(page, { ...PADRAO })
    await page.route(caso.rota, (rota) =>
      caso.falha
        ? rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
        : rota.fulfill({ json: { conversas: [], proximo: null, porLer: 0 } }),
    )
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(caso.caminho)
    await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
    await expect(
      page
        .getByText(caso.falha ? /não foi possível|tente novamente|erro/i : /comece uma conversa/i)
        .first(),
    ).toBeVisible()
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(
      resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([])
  })
}

for (const tela of telasAdicionais) {
  test(`axe adicional: ${tela.nome}`, async ({ page }) => {
    await simularProgresso(page)
    await tela.preparar(page)
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(tela.caminho)
    await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
    await expect(page.locator(tela.pronto).first()).toBeVisible()
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(
      resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([])
    const titulos = await new AxeBuilder({ page }).withRules(["heading-order"]).analyze()
    expect(titulos.violations).toEqual([])
  })
}

for (const caso of [
  {
    nome: "Avisos vazios",
    caminho: "/app/avisos",
    estado: { avisos: [] },
    pronto: '[data-estado="vazio"]',
  },
  {
    nome: "Falha de avisos",
    caminho: "/app/avisos",
    estado: { falharAvisos: true },
    pronto: '[data-estado="erro"]',
  },
  {
    nome: "Salvos vazios",
    caminho: "/app/salvos",
    estado: {
      anunciosSalvos: [],
      imoveisSalvos: [],
      publicacoesSalvas: [],
      perguntasSalvas: [],
      guiaSalvo: [],
    },
    pronto: '[data-tela="salvos"] [data-estado="vazio"]',
  },
  {
    nome: "Preferencias de avisos",
    caminho: "/app/voce",
    estado: {},
    pronto: '[data-preferencias-de-aviso="sim"]',
  },
]) {
  test(`axe: ${caso.nome}`, async ({ page }) => {
    await simularServidorF09F10(page, { ...PADRAO, ...caso.estado })
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(caso.caminho)
    await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
    await expect(page.locator(caso.pronto)).toBeVisible()
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(
      resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([])
    const titulos = await new AxeBuilder({ page }).withRules(["heading-order"]).analyze()
    expect(titulos.violations).toEqual([])
  })
}

for (const tela of telas) {
  test(`axe: ${tela.nome}`, async ({ page }) => {
    await simularProgresso(page)
    await tela.preparar(page)
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(tela.caminho)
    await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
    await expect(page.getByText(tela.conteudo, { exact: false }).first()).toBeVisible()
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
    expect(
      resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([])
  })
}
