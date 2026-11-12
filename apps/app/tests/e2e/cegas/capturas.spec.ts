import { mkdirSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import {
  abrir,
  expect,
  SELETOR_CRIAR,
  SELETOR_MENU_CRIAR,
  SELETOR_TITULO,
  simularGuia,
  simularNegocio,
  simularNegocios,
  simularPedido,
  simularProgresso,
  test,
} from "../apoio"
import { simularGrupos } from "../grupos-ajuda"
import { simularInicio } from "../inicio-ajuda"

/**
 * Capturas para a revisão cega de F02/F03/F07/F08 — o critério 2 de
 * docs/LANCAMENTO.md (avaliar a jornada contra a régua Nextdoor, sem saber de
 * quem é o trabalho).
 *
 * O spec só tira fotos de tela real, interagindo: navega, preenche, abre a
 * sobreposição. Ele não afirma veredito nenhum — o julgamento é de outro modelo,
 * a partir destas imagens e do [data-titulo-da-tela] de cada passo.
 *
 * As capturas ficam em `.visual/blind/<jornada>/<largura>-<tema>-<passo>.png`,
 * nomeadas só pela jornada, para não entregar ao revisor quem as tirou. Roda uma
 * vez, no projeto desktop-1440, com as três larguras fixadas de dentro.
 */

const LARGURAS = [375, 768, 1440] as const
const TEMAS = ["light", "dark"] as const
const RAIZ = join(process.cwd(), "..", "..", ".visual", "blind")

type Passo = Readonly<{
  nome: string
  ir: (page: Page) => Promise<void>
  /** Conteúdo que só existe quando a tela terminou de carregar. */
  pronto: string
}>

/** Espera o fim das animações finitas; o teto evita travar em laço. */
async function assentar(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    const limite = new Promise<void>((resolver) => {
      setTimeout(resolver, 2000)
    })
    const animacoes = document
      .getAnimations()
      .map((animacao) => animacao.finished.catch(() => undefined))
    await Promise.race([Promise.all(animacoes).then(() => undefined), limite])
  })
}

const JORNADAS: ReadonlyArray<{ nome: string; passos: readonly Passo[] }> = [
  {
    nome: "f02-inicio-e-busca",
    passos: [
      {
        nome: "01-inicio",
        ir: async (page) => {
          await abrir(page, "/app/inicio")
        },
        pronto: '[data-tela="inicio"]',
      },
      {
        nome: "02-inicio-rolado",
        ir: async (page) => {
          await abrir(page, "/app/inicio")
          await page.mouse.wheel(0, 1200)
          await page.waitForTimeout(400)
        },
        pronto: '[data-tela="inicio"]',
      },
      {
        nome: "03-busca",
        ir: async (page) => {
          // A busca é uma tela em prova: a rota existe, o conteúdo chega na onda
          // dela. Foto do que a pessoa vê hoje, com o aviso honesto da tela.
          await abrir(page, "/app/busca")
        },
        pronto: '[data-tela="busca"]',
      },
    ],
  },
  {
    nome: "f03-criar",
    passos: [
      {
        nome: "01-menu-criar",
        ir: async (page) => {
          await abrir(page, "/app/inicio")
          await page.locator(SELETOR_CRIAR).dispatchEvent("click")
          await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
          await expect(page.locator("[data-escolha]")).toHaveCount(7)
        },
        pronto: SELETOR_MENU_CRIAR,
      },
      {
        nome: "02-formulario-de-encontro",
        ir: async (page) => {
          await abrir(page, "/app/inicio")
          await page.locator(SELETOR_CRIAR).dispatchEvent("click")
          await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
          await page.locator('[data-escolha="create-event"]').click()
          await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
        },
        pronto: '[data-sobreposicao="folha"]',
      },
      {
        nome: "03-formulario-preenchido",
        ir: async (page) => {
          await abrir(page, "/app/inicio")
          await page.locator(SELETOR_CRIAR).dispatchEvent("click")
          await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
          await page.locator('[data-escolha="create-event"]').click()
          await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
          await page.getByLabel("Título").fill("Encontro de veteranos no centro")
          await page.getByLabel("Data e hora").fill("2026-12-05T19:00")
          await page.getByLabel("Local").fill("Praça São Sebastião")
        },
        pronto: '[data-sobreposicao="folha"]',
      },
      {
        nome: "04-erro-de-validacao",
        ir: async (page) => {
          await abrir(page, "/app/inicio")
          await page.locator(SELETOR_CRIAR).dispatchEvent("click")
          await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
          await page.locator('[data-escolha="create-event"]').click()
          await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
          await page.locator('[data-sobreposicao="folha"] button[type="submit"]').click()
          await expect(page.locator('[data-sobreposicao="folha"] [role="alert"]')).toBeVisible()
        },
        pronto: '[data-sobreposicao="folha"]',
      },
      {
        nome: "05-comunidade",
        ir: async (page) => {
          await abrir(page, "/app/comunidade")
        },
        pronto: '[data-tela="comunidade"]',
      },
      {
        nome: "06-grupo",
        ir: async (page) => {
          await abrir(page, "/app/grupo/g-pets")
        },
        pronto: '[data-tela="grupo"]',
      },
      {
        nome: "07-publicacao",
        ir: async (page) => {
          await abrir(page, "/app/publicacao/p-real-1")
        },
        pronto: '[data-tela="publicacao"], [data-publicacao]',
      },
    ],
  },
  {
    nome: "f07-negocios",
    passos: [
      {
        nome: "01-regua",
        ir: async (page) => {
          // No preview a tela de negócios ainda é a de prova: a ficha real e o
          // pedido não abrem sem o servidor. A foto mostra o que a pessoa vê e a
          // régua do fluxo fica medida no `f07-negocios.spec.ts`.
          await abrir(page, "/app/negocios")
        },
        pronto: '[data-tela="negocios"], [data-tela="prova"]',
      },
    ],
  },
  {
    nome: "f08-guia",
    passos: [
      {
        nome: "01-guia",
        ir: async (page) => {
          await abrir(page, "/app/guia")
        },
        pronto: '[data-tela="guia"]',
      },
      {
        nome: "02-guia-rolado",
        ir: async (page) => {
          await abrir(page, "/app/guia")
          await page.mouse.wheel(0, 1200)
          await page.waitForTimeout(400)
        },
        pronto: '[data-tela="guia"]',
      },
    ],
  },
]

async function fotografar(
  page: Page,
  jornada: string,
  largura: number,
  tema: string,
  passo: Passo,
) {
  const diretorio = join(RAIZ, jornada)
  mkdirSync(diretorio, { recursive: true })
  await page.screenshot({
    path: join(diretorio, `${largura}-${tema}-${passo.nome}.png`),
    fullPage: true,
  })
}

test.describe("capturas para a revisão cega", () => {
  test("F02, F03, F07 e F08 em 375, 768 e 1440 nos dois temas", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "a matriz fixa as três larguras")
    test.setTimeout(600_000)
    const erros: string[] = []
    page.on("pageerror", (erro) => erros.push(`pageerror: ${erro.message}`))

    await simularProgresso(page)
    await simularGrupos(page, { membro: true })
    await simularInicio(page)
    await simularNegocios(page)
    await simularNegocio(page)
    await simularPedido(page)
    await simularGuia(page)

    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 900 })
      for (const tema of TEMAS) {
        await page.emulateMedia({ colorScheme: tema })
        for (const jornada of JORNADAS) {
          for (const passo of jornada.passos) {
            await passo.ir(page)
            await expect(page.locator(passo.pronto)).toBeVisible()
            await expect(page.locator(SELETOR_TITULO)).toBeVisible()
            await assentar(page)
            await fotografar(page, jornada.nome, largura, tema, passo)
          }
        }
      }
    }

    expect(erros).toEqual([])
    mkdirSync(RAIZ, { recursive: true })
    await page.setViewportSize({ width: 375, height: 900 })
  })
})
