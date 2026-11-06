/**
 * Intercepta as rotas `/api/app/mercado*` que o preview Vite não serve, devolvendo
 * dados congelados compatíveis com `lerAnuncio` (apps/app/lib/dados/mercado.ts).
 *
 * Usar no início de cada spec ou `test.beforeEach`:
 *   import { aplicarStubMercado } from "./stub-mercado"
 *   aplicarStubMercado(page)
 *
 * Shape servido:
 *   GET /api/app/mercado?tipo=item|property
 *     → { cidade, proximo: null, anuncios: [ … ] }
 *   GET /api/app/mercado/<id>
 *     → { anuncio: { …campos da tela, endereco: null, donoNome, fotos, meu: false, salvo: false } }
 *   POST /api/app/mercado/<id>/interesse
 *     → { conversaId }
 */

import type { Page } from "@playwright/test"

const ANUNCIOS = [
  // ── desapegos (tipo="item") ────────────────────────────────────────
  {
    id: "a-1",
    tipo: "item" as const,
    titulo: "Sofá retrátil seminovo",
    descricao: "Três lugares, tecido suede cinza",
    precoCents: 85000,
    deal: null,
    bairro: "Ponta Negra",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "móveis",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: "/app/demo/sofa.jpg",
    criadoEm: "2026-11-04T12:00:00Z",
  },
  {
    id: "a-2",
    tipo: "item" as const,
    titulo: "Berço com colchão",
    descricao: "Berço madeira natural com colchão ortopedico",
    precoCents: null,
    deal: null,
    bairro: "Adolpho Lisboa",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "bebê",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: null,
    criadoEm: "2026-11-03T10:00:00Z",
  },
  {
    id: "a-3",
    tipo: "item" as const,
    titulo: "Bicicleta aro 29",
    descricao: "Aro 29, freio v-brake, pouquissimo uso",
    precoCents: 120000,
    deal: null,
    bairro: "Centro",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "esportes",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: null,
    criadoEm: "2026-11-02T14:00:00Z",
  },
  {
    id: "i2",
    tipo: "item" as const,
    titulo: "Mesinha de canto",
    descricao: "Madeira, duas gavetas",
    precoCents: 0,
    deal: null,
    bairro: "Japiim",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "móveis",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: null,
    criadoEm: "2026-11-01T09:00:00Z",
  },
  {
    id: "i3",
    tipo: "item" as const,
    titulo: "Berço com colchão",
    descricao: "Berço berçoberço madeira natural",
    precoCents: 45000,
    deal: null,
    bairro: "Adolpho Lisboa",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "bebê",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: "/app/demo/crib.jpg",
    criadoEm: "2026-11-05T08:00:00Z",
  },
  {
    id: "i1",
    tipo: "item" as const,
    titulo: "Livros didáticos – turma 2026",
    descricao: "Conjunto completo, sem grifos",
    precoCents: 45000,
    deal: null,
    bairro: "Nova Esperança",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "livros",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: null,
    criadoEm: "2026-10-30T11:00:00Z",
  },
  {
    id: "vendido-1",
    tipo: "item" as const,
    titulo: "Ventilador de teto",
    descricao: "4 asas, remote control, novo na caixa",
    precoCents: 0,
    deal: null,
    bairro: "Sttl. Passaramé",
    cidade: "Manaus",
    status: "sold",
    condicao: "novo",
    categoria: "eletrodomésticos",
    quartos: null,
    tipoImovel: null,
    areaM2: null,
    condoFeeCents: null,
    foto: null,
    criadoEm: "2026-10-28T15:00:00Z",
  },
  // ── imóveis (tipo="property") ─────────────────────────────────────
  {
    id: "p-1",
    tipo: "property" as const,
    titulo: "Apartamento 3 quartos Ponta Negra",
    descricao: "Vista pro rio, acabamento premium",
    precoCents: 320000,
    deal: "rent",
    bairro: "Flores",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "aluguel",
    quartos: 3,
    tipoImovel: "apartment",
    areaM2: 98,
    condoFeeCents: 72000,
    foto: "/app/demo/apartment.jpg",
    criadoEm: "2026-11-04T10:00:00Z",
  },
  {
    id: "p-2",
    tipo: "property" as const,
    titulo: "Apartamento 2 quartos Centro",
    descricao: "Garagem coberta, quintal amplo",
    precoCents: 240000,
    deal: "rent",
    bairro: "Centro",
    cidade: "Manaus",
    status: "active",
    condicao: "usado",
    categoria: "aluguel",
    quartos: 2,
    tipoImovel: "apartment",
    areaM2: 70,
    condoFeeCents: 48000,
    foto: "/app/demo/interior.jpg",
    criadoEm: "2026-11-02T08:00:00Z",
  },
] as const

/** Lista paginada de anúncios por tipo. */
function listaPorTipo(tipo: string): ReadonlyArray<(typeof ANUNCIOS)[number]> {
  return ANUNCIOS.filter((a) => a.tipo === tipo)
}

/** Anúncio detalhado por id. */
function anuncioPorId(id: string): (typeof ANUNCIOS)[number] | undefined {
  return ANUNCIOS.find((a) => a.id === id)
}

/** Aplica interceptações em `page` para todas as rotas `/api/app/mercado*`. */
export function aplicarStubMercado(page: Page): void {
  // ── LISTAGEM: GET /api/app/mercado?tipo=item|property ─────────────
  page.route(/\/api\/app\/mercado\?[^#]*$/, async (route) => {
    const url = route.request().url()
    const parsed = new URL(url, "http://localhost")
    const tipo = parsed.searchParams.get("tipo")

    if (tipo !== "item" && tipo !== "property") {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ erro: "corpo-invalido" }),
      })
    }

    // A API entrega URLs prontas; os arquivos da demonstração são servidos pelo preview.
    const resultados = listaPorTipo(tipo).map((anuncio) => ({
      ...anuncio,
      foto: anuncio.foto === null ? null : new URL(anuncio.foto, url).href,
    }))
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        cidade: "Manaus",
        proximo: null,
        anuncios: resultados,
      }),
    })
  })

  // ── INTERESSE: POST /api/app/mercado/<id>/interesse ──────────────
  // Os padrões são exclusivos: o detalhe não captura o caminho de interesse.
  page.route(/\/api\/app\/mercado\/[^/?#]+\/interesse(?:\?[^#]*)?$/, async (route) => {
    if (route.request().method() !== "POST") {
      return route.continue()
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ conversaId: "c-demo-interesse" }),
    })
  })

  // ── DETALHE: GET /api/app/mercado/<id> (qualquer parâmetro após o id) ─
  page.route(/\/api\/app\/mercado\/[^/?#]+(?:\?[^#]*)?$/, async (route) => {
    if (route.request().method() !== "GET") {
      return route.continue()
    }

    const url = route.request().url()
    // Pega tudo após o último `/` como id
    const partes = url.split("/")
    const ultimoParte = partes[partes.length - 1] ?? ""
    // Remove query string se houver
    const id = ultimoParte.split("?")[0]

    if (!id || !anuncioPorId(id)) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ erro: "anuncio-nao-encontrado" }),
      })
    }

    const an = anuncioPorId(id)
    if (!an) return route.continue()
    const foto = an.foto === null ? null : new URL(an.foto, url).href

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        anuncio: {
          id: an.id,
          tipo: an.tipo,
          titulo: an.titulo,
          descricao: an.descricao,
          precoCents: an.precoCents,
          deal: an.deal,
          bairro: an.bairro,
          cidade: an.cidade,
          status: an.status,
          condicao: an.condicao,
          categoria: an.categoria,
          quartos: an.quartos,
          tipoImovel: an.tipoImovel,
          areaM2: an.areaM2,
          condoFeeCents: an.condoFeeCents,
          foto,
          criadoEm: an.criadoEm,
          endereco: null,
          donoNome: "Maria Silva",
          fotos: foto === null ? [] : [foto],
          meu: false,
          salvo: false,
        },
      }),
    })
  })
}
