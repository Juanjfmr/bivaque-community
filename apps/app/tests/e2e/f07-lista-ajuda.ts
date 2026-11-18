import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page } from "@playwright/test"

/**
 * Apoio do lote RUN-141 (F07 — lista de negócios). Próprio do lote por causa
 * das lanes paralelas; não importa nem altera `apoio.ts`.
 *
 * O que este arquivo entrega: as listas da prova (negócios e as duas seções
 * irmãs do Mercado, com as colunas que `lib/dados/*` lê), a captura e a medida
 * de contraste que o critério de aceite pede.
 */

export const DIRETORIO = join(process.cwd(), "..", "..", ".visual", "run-141")

const CATEGORIAS = [
  { id: "assistencia_tecnica", nome: "Assistência técnica" },
  { id: "pets", nome: "Pets" },
]

export const NEGOCIOS = {
  cidade: "Manaus",
  categorias: CATEGORIAS,
  negocios: [
    {
      id: "negocio-climatiza",
      nome: "Climatiza Manaus",
      categoria: "assistencia_tecnica",
      categoriaNome: "Assistência técnica",
      descricao: "Manutenção de ar-condicionado.",
    },
    {
      id: "negocio-banho-bom",
      nome: "Banho Bom",
      categoria: "pets",
      categoriaNome: "Pets",
      descricao: null,
    },
  ],
  proximo: null,
}

/** As colunas que `lerMercado` lê; o que a tela não usa vem nulo. */
function anuncio(id: string, tipo: "item" | "property", titulo: string) {
  return {
    id,
    tipo,
    titulo,
    descricao: null,
    precoCents: null,
    deal: null,
    bairro: "Centro",
    cidade: "Manaus",
    status: "published",
    condicao: null,
    categoria: null,
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: null,
    criadoEm: null,
  }
}

/** Três desapegos (a contagem é 3) e um imóvel com mais páginas (1+). */
export const DESAPEGOS = {
  cidade: "Manaus",
  anuncios: [
    anuncio("item-1", "item", "Cadeira de escritório"),
    anuncio("item-2", "item", "Máquina de lavar"),
    anuncio("item-3", "item", "Bicicleta aro 29"),
  ],
  proximo: null,
}

export const IMOVEIS = {
  cidade: "Manaus",
  anuncios: [anuncio("imovel-1", "property", "Apartamento no Centro")],
  proximo: "imovel-pagina-2",
}

/**
 * As rotas de dado da tela: a lista de negócios e a primeira página de cada
 * seção irmã (é delas que sai a contagem dos segmentos).
 */
export async function simularNegociosDaLista(
  page: Page,
  opcoes: { readonly negocios?: unknown } = {},
): Promise<void> {
  await page.route(/\/api\/app\/negocios(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: opcoes.negocios ?? NEGOCIOS })
  })
  await page.route(/\/api\/app\/mercado(?:\?|$)/, async (rota) => {
    const tipo = new URL(rota.request().url()).searchParams.get("tipo")
    await rota.fulfill({ json: tipo === "property" ? IMOVEIS : DESAPEGOS })
  })
}

/** Mercado fora do ar: o segmento irmão fica sem número, nunca com zero. */
export async function simularMercadoIndisponivel(page: Page): Promise<void> {
  await page.route(/\/api\/app\/negocios(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: NEGOCIOS })
  })
  await page.route(/\/api\/app\/mercado(?:\?|$)/, async (rota) => {
    await rota.fulfill({ status: 503, json: { erro: "leitura-indisponivel" } })
  })
}

export function luminancia(cor: string): number {
  const [r = 0, g = 0, b = 0] = (cor.match(/[\d.]+/g) ?? [])
    .map(Number)
    .slice(0, 3)
    .map((c) => {
      const valor = c / 255
      return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contraste medido do texto contra o fundo que o navegador pintou. */
export async function contrasteDe(page: Page, seletor: string): Promise<number> {
  const cores = await page.locator(seletor).evaluate((elemento) => ({
    texto: getComputedStyle(elemento).color,
    fundo: getComputedStyle(elemento).backgroundColor,
  }))
  const texto = luminancia(cores.texto)
  const fundo = luminancia(cores.fundo)
  return (Math.max(texto, fundo) + 0.05) / (Math.min(texto, fundo) + 0.05)
}

/** Captura em `.visual/run-141/`, sem transbordo horizontal. */
export async function capturar(page: Page, nome: string): Promise<void> {
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
