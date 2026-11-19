import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { type Page, test } from "@playwright/test"

import {
  expect,
  SELETOR_CRIAR,
  SELETOR_MENU_CRIAR,
  SELETOR_TITULO,
  simularGuia,
  simularNegocio,
  simularNegocios,
  simularPedido,
  simularProgresso,
} from "../apoio"
import { simularGrupos } from "../grupos-ajuda"
import { simularInicio } from "../inicio-ajuda"
import { simularPerguntas } from "../perguntas-ajuda"
import { aplicarStubMercado } from "../stub-mercado"

/**
 * Capturas para a revisão cega de F02, F03, F06, F07 e F08 — o critério 2 de
 * docs/LANCAMENTO.md (avaliar a jornada contra a régua Nextdoor, sem saber de
 * quem é o trabalho).
 *
 * O spec só tira fotos de TELA REAL, interagindo: navega, preenche, abre a
 * sobreposição. Nada aqui usa o `test` de `apoio.ts`: com o modo de prova ligado
 * o app troca toda tela real pela `TelaDeProva`, e a foto mostraria o andaime em
 * vez do produto. As rotas `/api/app/*` são simuladas no mesmo contrato do
 * servidor, como `salvos.spec.ts`, `mercado-salvos.spec.ts` e
 * `f07-lista-negocios.spec.ts` já fazem.
 *
 * Ele não afirma veredito nenhum — o julgamento é de outro modelo, a partir
 * destas imagens e do [data-titulo-da-tela] de cada passo.
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

/**
 * Os anúncios desta sessão na aba "Meus anúncios" (`/api/app/mercado/meus`), um
 * por situação, para a foto mostrar o cartão com o rótulo que a pessoa vê.
 */
const MEUS_ANUNCIOS = [
  {
    id: "a-mesa",
    tipo: "item",
    titulo: "Mesa de jantar com quatro cadeiras",
    descricao: "Madeira maciça, sinais de uso no tampo.",
    precoCents: 65000,
    deal: null,
    bairro: "Centro",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "moveis",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: "/app/demo/mesa.webp",
    criadoEm: "2026-11-12T10:00:00.000Z",
  },
  {
    id: "a-bicicleta",
    tipo: "item",
    titulo: "Bicicleta aro 29 com câmbio",
    descricao: "Revisada, pneus novos.",
    precoCents: 120000,
    deal: null,
    bairro: "Adrianópolis",
    cidade: "Manaus",
    status: "paused",
    condicao: "usado",
    categoria: "esportes",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: null,
    criadoEm: "2026-11-08T09:00:00.000Z",
  },
  {
    id: "p-quitinete",
    tipo: "property",
    titulo: "Quitinete mobiliada no Centro",
    descricao: "Perto da praça, água e luz inclusos.",
    precoCents: 150000,
    deal: "rent",
    bairro: "Centro",
    cidade: "Manaus",
    status: "reserved",
    condicao: "usado",
    categoria: "aluguel",
    quartos: 1,
    tipoImovel: "apartment",
    areaM2: 32,
    condoFeeCents: null,
    foto: "/app/demo/interior.jpg",
    criadoEm: "2026-11-04T08:00:00.000Z",
  },
] as const

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

/**
 * O lançamento força o claro (`casca/tema.ts`): o esquema do sistema não pinta
 * nada, e o escuro só acende pelo `data-tema="escuro"` no documento. Trocar o
 * atributo depois da carga, porque o app o reescreve ao montar.
 */
async function aplicarTema(page: Page, tema: (typeof TEMAS)[number]): Promise<void> {
  await page.evaluate((escuro) => {
    document.documentElement.dataset["tema"] = escuro ? "escuro" : "claro"
  }, tema === "dark")
}

/**
 * Abre a rota num documento novo. Recarregar a MESMA rota reidrata o estado da
 * entrada que ficou no histórico — a sobreposição do passo anterior —, e a tela
 * volta com o menu aberto e o conteúdo `inert`; limpar o documento antes
 * garante a foto do passo, e não a sobra do anterior.
 *
 * O teto do título é largo de propósito: em `vite dev` o primeiro carregamento
 * transforma o grafo inteiro do módulo, e com a máquina dividida com outras
 * baterias os 5 s padrão do `expect` não bastam.
 */
async function abrirDoZero(page: Page, caminho: string): Promise<void> {
  await page.goto("about:blank")
  await page.goto(caminho)
  await expect(page.locator(SELETOR_TITULO)).toBeVisible({ timeout: 60_000 })
}

/** Os anúncios desta sessão; registrado depois do stub do Mercado, que o venceria. */
async function simularMeusAnuncios(page: Page): Promise<void> {
  await page.route(/\/api\/app\/mercado\/meus(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        cidade: "Manaus",
        proximo: null,
        anuncios: MEUS_ANUNCIOS.map((anuncio) => ({
          ...anuncio,
          // A capa só aparece com URL absoluta: o app resolve referência relativa
          // pela tabela de imagens embutidas, e aqui a foto é arquivo público.
          foto: anuncio.foto === null ? null : new URL(anuncio.foto, rota.request().url()).href,
        })),
      },
    }),
  )
}

const JORNADAS: ReadonlyArray<{ nome: string; passos: readonly Passo[] }> = [
  {
    nome: "f02-inicio-e-busca",
    passos: [
      {
        nome: "01-inicio",
        ir: async (page) => {
          await abrirDoZero(page, "/app/inicio")
        },
        pronto: '[data-tela="inicio"] [data-home="conteudo"]',
      },
      {
        nome: "02-inicio-rolado",
        ir: async (page) => {
          await abrirDoZero(page, "/app/inicio")
          await page.mouse.wheel(0, 1200)
          await page.waitForTimeout(400)
        },
        pronto: '[data-tela="inicio"] [data-home="conteudo"]',
      },
      {
        nome: "03-busca",
        ir: async (page) => {
          await abrirDoZero(page, "/app/busca")
        },
        pronto: '[data-tela="busca"] [data-busca="primeira-entrada"]',
      },
    ],
  },
  {
    nome: "f03-criar",
    passos: [
      {
        nome: "01-menu-criar",
        ir: async (page) => {
          await abrirDoZero(page, "/app/inicio")
          await page.locator(SELETOR_CRIAR).dispatchEvent("click")
          await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
          await expect(page.locator("[data-escolha]")).toHaveCount(7)
        },
        pronto: SELETOR_MENU_CRIAR,
      },
      {
        nome: "02-formulario-de-encontro",
        ir: async (page) => {
          await abrirDoZero(page, "/app/inicio")
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
          await abrirDoZero(page, "/app/inicio")
          await page.locator(SELETOR_CRIAR).dispatchEvent("click")
          await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
          await page.locator('[data-escolha="create-event"]').click()
          await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
          await page.getByLabel("Título").fill("Encontro de veteranos no centro")
          await page.getByLabel("Data").fill("05/12/2026")
          await page.getByLabel("Hora").fill("19:00")
          await page.getByLabel("Local").fill("Praça São Sebastião")
        },
        pronto: '[data-sobreposicao="folha"]',
      },
      {
        nome: "04-erro-de-validacao",
        ir: async (page) => {
          await abrirDoZero(page, "/app/inicio")
          await page.locator(SELETOR_CRIAR).dispatchEvent("click")
          await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
          await page.locator('[data-escolha="create-event"]').click()
          await expect(page.getByRole("heading", { name: "Novo encontro" })).toBeVisible()
          // A ação primária só liga com os obrigatórios: o erro aparece no campo.
          await page.getByLabel("Título").fill("C")
          await page.getByLabel("Data").fill("31/02/2026")
          await page.getByLabel("Hora").click()
          await expect(page.locator("#encontro-titulo-erro")).toBeVisible()
          await expect(page.locator("#encontro-data-erro")).toBeVisible()
        },
        pronto: '[data-sobreposicao="folha"]',
      },
      {
        nome: "05-comunidade",
        ir: async (page) => {
          await abrirDoZero(page, "/app/comunidade")
        },
        pronto: "text=Alguém indica um pediatra",
      },
      {
        nome: "06-grupo",
        ir: async (page) => {
          await abrirDoZero(page, "/app/grupo/g-pets")
        },
        pronto: '[data-tela="grupo"] [data-publicacao-na-lista="sim"]',
      },
      {
        nome: "07-publicacao",
        ir: async (page) => {
          await abrirDoZero(page, "/app/publicacao/p-pets")
        },
        pronto: '[data-tela="publicacao"] h1[data-titulo-da-tela]',
      },
    ],
  },
  {
    nome: "f06-mercado-e-moradia",
    passos: [
      {
        nome: "01-mercado",
        ir: async (page) => {
          await abrirDoZero(page, "/app/mercado")
        },
        pronto: "text=Sofá retrátil seminovo",
      },
      {
        nome: "02-desapegos",
        ir: async (page) => {
          await abrirDoZero(page, "/app/desapegos")
        },
        pronto: "text=Sofá retrátil seminovo",
      },
      {
        nome: "03-imoveis",
        ir: async (page) => {
          await abrirDoZero(page, "/app/imoveis")
        },
        pronto: "text=Apartamento 3 quartos Ponta Negra",
      },
      {
        nome: "04-detalhe-do-anuncio",
        ir: async (page) => {
          await abrirDoZero(page, "/app/anuncio/a-1")
        },
        pronto: '[data-tela="anuncio"] [data-acoes-anuncio="sim"]',
      },
      {
        nome: "05-criar-anuncio",
        ir: async (page) => {
          await abrirDoZero(page, "/app/imoveis")
          await page.locator('[data-acao="anunciar-imovel"]').click()
          await expect(page.locator('[data-fluxo="rascunho-imovel"]')).toBeVisible()
          await page.getByLabel("Título").fill("Apartamento 2 quartos no Centro")
          await page.getByLabel("CEP").fill("69020-000")
          await page.getByLabel("Bairro").fill("Centro")
          await page.getByLabel("Aluguel por mês (R$)").fill("2400")
          await page
            .getByLabel("Descrição (opcional)")
            .fill("Sala com varanda, cozinha planejada e garagem coberta.")
        },
        pronto: '[data-fluxo="rascunho-imovel"] form[data-formulario="imovel"]',
      },
      {
        nome: "06-meus-anuncios",
        ir: async (page) => {
          await abrirDoZero(page, "/app/meus-anuncios")
        },
        pronto: "text=Mesa de jantar com quatro cadeiras",
      },
    ],
  },
  {
    nome: "f07-negocios",
    passos: [
      {
        nome: "01-regua",
        ir: async (page) => {
          // A lista real dos negócios da cidade; o pedido e a ficha continuam
          // medidos em `f07-negocios.spec.ts`.
          await abrirDoZero(page, "/app/negocios")
        },
        pronto: "text=Clínica Bem Viver",
      },
    ],
  },
  {
    nome: "f08-guia",
    passos: [
      {
        nome: "01-guia",
        ir: async (page) => {
          await abrirDoZero(page, "/app/guia")
        },
        pronto: "text=Escola Municipal Rio Negro",
      },
      {
        nome: "02-guia-rolado",
        ir: async (page) => {
          await abrirDoZero(page, "/app/guia")
          await page.mouse.wheel(0, 1200)
          await page.waitForTimeout(400)
        },
        pronto: "text=Escola Municipal Rio Negro",
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
  test("F02, F03, F06, F07 e F08 em 375, 768 e 1440, nos dois temas", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "a matriz fixa as três larguras")
    // Cinco jornadas × três larguras × dois temas: cada passo abre um documento
    // novo, e a bateria roda junto das outras no mesmo host.
    test.setTimeout(1_500_000)
    const erros: string[] = []
    const consoleErros: string[] = []
    page.on("pageerror", (erro) => erros.push(`pageerror: ${erro.message}`))
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErros.push(msg.text())
    })

    await simularProgresso(page)
    await simularPerguntas(page)
    await simularGrupos(page, { membro: true })
    await simularInicio(page)
    await simularNegocios(page)
    await simularNegocio(page)
    await simularPedido(page)
    await simularGuia(page)
    await aplicarStubMercado(page)
    await simularMeusAnuncios(page)

    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 900 })
      for (const tema of TEMAS) {
        for (const jornada of JORNADAS) {
          for (const passo of jornada.passos) {
            try {
              await passo.ir(page)
              await expect(page.locator(passo.pronto)).toBeVisible({ timeout: 30_000 })
              await expect(page.locator(SELETOR_TITULO)).toBeVisible({ timeout: 15_000 })
              await aplicarTema(page, tema)
              await assentar(page)
              await fotografar(page, jornada.nome, largura, tema, passo)
            } catch (falha) {
              const raiz = join(RAIZ, "..", "capt-001")
              mkdirSync(raiz, { recursive: true })
              writeFileSync(
                join(raiz, "falha.json"),
                JSON.stringify(
                  {
                    largura,
                    tema,
                    jornada: jornada.nome,
                    passo: passo.nome,
                    url: page.url(),
                    conteudo: (await page.content()).slice(0, 3000),
                    pageErrors: erros,
                    consoleErros: consoleErros.slice(-10),
                  },
                  null,
                  2,
                ),
              )
              throw falha
            }
          }
        }
      }
    }

    expect(erros).toEqual([])
    mkdirSync(RAIZ, { recursive: true })
    await page.setViewportSize({ width: 375, height: 900 })
  })
})
