import type { Page } from "@playwright/test"

/**
 * Apoio do E2E do lote RUN-139 (Início e Busca com estado de primeira entrada).
 *
 * Não toca em `apoio.ts` nem em `inicio-ajuda.ts`: a cidade vazia e a contagem
 * de pedidos são deste lote. O corpo segue o contrato das rotas reais
 * (`apps/web/app/api/app/inicio`, `/busca`), com identidades sintéticas.
 */

export const CAMPO_DO_INICIO = '[data-campo="busca-do-inicio"]'

export type Pedidos = { readonly busca: () => readonly string[] }

/** A cidade onde ninguém publicou: cada lista vazia, `proximo` nulo. */
export async function simularCidadeVazia(page: Page): Promise<void> {
  await page.route(/\/api\/app\/inicio(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        cidade: "Manaus",
        perguntas: [],
        eventos: [],
        anuncios: [],
        negocios: [],
        grupos: [],
        proximo: null,
      },
    }),
  )
  await page.route(/\/api\/app\/busca(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        cidade: "Manaus",
        perguntas: [],
        grupos: [],
        anuncios: [],
        negocios: [],
        guia: [],
      },
    }),
  )
}

/** Guarda os pedidos de busca para provar que o termo chegou à rota de dados. */
export function ouvirBusca(page: Page): Pedidos {
  const pedidos: string[] = []
  page.on("request", (pedido) => {
    if (new URL(pedido.url()).pathname === "/api/app/busca") pedidos.push(pedido.url())
  })
  return { busca: () => pedidos }
}

/** A largura do projeto atual, ou `null` quando não é uma das três provadas. */
export function larguraDaProva(projeto: string): number | null {
  const larguras: Readonly<Record<string, number>> = {
    "mobile-375": 375,
    "tablet-768": 768,
    "desktop-1440": 1440,
  }
  return larguras[projeto] ?? null
}
