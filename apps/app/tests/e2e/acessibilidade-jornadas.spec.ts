import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import {
  EVENTO_DA_PROVA,
  simularEvento,
  simularProgresso,
  simularVerbeteDoGuia,
  VERBETE_DA_PROVA,
} from "./apoio"
import { PADRAO, simularServidorF09F10 } from "./f09-f10-ajuda"
import { simularGrupos } from "./grupos-ajuda"
import { ID_PERGUNTA, simularPerguntas } from "./perguntas-ajuda"
import { aplicarStubMercado } from "./stub-mercado"
import { simularVoce } from "./voce-ajuda"

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
