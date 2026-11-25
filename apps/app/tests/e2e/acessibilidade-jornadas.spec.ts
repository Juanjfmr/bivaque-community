import AxeBuilder from "@axe-core/playwright"
import { expect, type Locator, type Page, test } from "@playwright/test"
import type { AxeResults } from "axe-core"
import {
  EVENTO_DA_PROVA,
  NEGOCIO_DA_PROVA,
  PEDIDO_DA_PROVA,
  SELETOR_CRIAR,
  SELETOR_MENU_CRIAR,
  simularEvento,
  simularGuia,
  simularNegocio,
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

/**
 * Acessibilidade das jornadas F02 a F10 (A11YWEB-002).
 *
 * Complementa `acessibilidade.spec.ts`: a matriz de axe roda em cada projeto
 * (375, 768 e 1440), tema claro, nas tags WCAG A/AA e 2.1 AA, e falha em
 * impacto sério ou crítico; cada tela roda também a regra `heading-order` e
 * conta exatamente um h1. Os dados vêm de `page.route` no contrato das rotas
 * `/api/app/*` (os leitores em `lib/dados/*` recusam corpo fora do contrato).
 * Em 375, as ações principais de cada tela nova medem ao menos 24×24 px
 * (WCAG 2.2, 2.5.8).
 */

const TAGS_DO_AXE = ["wcag2a", "wcag2aa", "wcag21aa"] as const
const ALVO_MINIMO = 24

function descrever(nome: string, violacoes: AxeResults["violations"]): string {
  const linhas = violacoes.map(
    (violacao) =>
      `- [${violacao.impact ?? "sem impacto"}] ${violacao.id}: ${violacao.help} ` +
      `(${violacao.nodes.map((no) => no.target.join(" ")).join(" | ")})`,
  )
  return `${nome}:\n${linhas.join("\n")}`
}

/** Espera as animações finitas da entrada acabarem; o teto evita travar em laço. */
async function aguardarAnimacoes(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const limite = new Promise<void>((resolver) => {
      setTimeout(resolver, 2000)
    })
    const animacoes = document
      .getAnimations()
      .map((animacao) => animacao.finished.catch(() => undefined))
    await Promise.race([Promise.all(animacoes).then(() => undefined), limite])
  })
}

/** WCAG sem violação séria, títulos sem salto e exatamente um h1 na tela. */
async function verificarTela(page: Page, nome: string): Promise<void> {
  await aguardarAnimacoes(page)
  const resultado = await new AxeBuilder({ page }).withTags([...TAGS_DO_AXE]).analyze()
  const graves = resultado.violations.filter(
    (violacao) => violacao.impact === "serious" || violacao.impact === "critical",
  )
  expect(graves, descrever(nome, graves)).toEqual([])
  const titulos = await new AxeBuilder({ page }).withRules(["heading-order"]).analyze()
  expect(titulos.violations, descrever(`${nome} (heading-order)`, titulos.violations)).toEqual([])
  await expect(page.locator("h1"), `${nome}: exatamente um h1`).toHaveCount(1)
}

/** Mede cada alvo visível; devolve os que ficam abaixo de 24×24 px. */
async function alvosPequenos(alvos: readonly Locator[]): Promise<string[]> {
  const pequenos: string[] = []
  for (const alvo of alvos) {
    await expect(alvo).toBeVisible()
    const caixa = await alvo.boundingBox()
    if (caixa === null || caixa.width < ALVO_MINIMO || caixa.height < ALVO_MINIMO) {
      pequenos.push(`${alvo.toString()} → ${caixa?.width ?? 0}×${caixa?.height ?? 0}`)
    }
  }
  return pequenos
}

type EstiloDeFoco = Readonly<{ contorno: string; sombra: string; visivel: boolean }>

async function estiloDeFoco(alvo: Locator): Promise<EstiloDeFoco> {
  return alvo.evaluate((elemento) => {
    const estilo = getComputedStyle(elemento)
    const contornoVisivel =
      estilo.outlineStyle !== "none" && Number.parseFloat(estilo.outlineWidth) > 0
    return {
      contorno: `${estilo.outlineStyle} ${estilo.outlineWidth} ${estilo.outlineColor}`,
      sombra: estilo.boxShadow,
      visivel: contornoVisivel || estilo.boxShadow !== "none",
    }
  })
}

/**
 * Tira o foco de onde a tela o deixou, mede o alvo sem foco e anda com Tab até
 * ele, como quem usa só o teclado. O foco visível é a MUDANÇA entre os dois
 * estados (contorno ou sombra), não um estilo que o elemento já tinha.
 */
async function alcancarComTab(page: Page, alvo: Locator, limite = 160): Promise<void> {
  await expect(alvo).toBeVisible()
  await page.evaluate(() => {
    const ativo = document.activeElement
    if (ativo instanceof HTMLElement) ativo.blur()
  })
  const semFoco = await estiloDeFoco(alvo)
  for (let volta = 0; volta < limite; volta += 1) {
    await page.keyboard.press("Tab")
    if (await alvo.evaluate((elemento) => elemento === document.activeElement)) {
      const comFoco = await estiloDeFoco(alvo)
      expect(comFoco.visivel, `foco sem contorno nem sombra em ${alvo.toString()}`).toBe(true)
      expect(
        comFoco.contorno !== semFoco.contorno || comFoco.sombra !== semFoco.sombra,
        `o foco não muda o desenho de ${alvo.toString()}`,
      ).toBe(true)
      return
    }
  }
  throw new Error(`O Tab não alcançou ${alvo.toString()}`)
}

// ── Dados das telas novas, no contrato de lib/dados/* ────────────────────────

const CIDADE_CONSULTADA = "00000000-0000-4000-8000-000000000002"

const CONSULTA_DE_CIDADE = {
  cidade: { id: CIDADE_CONSULTADA, nome: "Rio de Janeiro", uf: "RJ" },
  atual: { id: "00000000-0000-4000-8000-000000000001", nome: "Manaus" },
  minha: false,
  guia: [{ id: "guia-1", nome: "Escola Modelo", categoria: "school" }],
  encontros: [
    {
      id: "evento-1",
      titulo: "Café na praça",
      comecaEm: "2027-01-20T12:00:00.000Z",
      local: "Praça",
    },
  ],
  desapegos: [{ id: "item-1", titulo: "Cadeira", precoCents: 5000, bairro: "Centro" }],
  imoveis: [{ id: "imovel-1", titulo: "Apartamento", bairro: "Tijuca" }],
}

async function simularCidade(page: Page): Promise<void> {
  await page.route(/\/api\/app\/cidade\/[^/?]+(?:\?|$)/, (rota) =>
    rota.fulfill({ json: CONSULTA_DE_CIDADE }),
  )
}

const MEU_ANUNCIO = {
  id: "a-meu",
  tipo: "item",
  titulo: "Mesa de jantar",
  descricao: "Mesa conservada para retirada no Centro.",
  precoCents: 45000,
  deal: null,
  bairro: "Centro",
  cidade: "Manaus",
  status: "active",
  condicao: "used",
  categoria: "casa_moveis",
  quartos: null,
  tipoImovel: null,
  areaM2: null,
  condoFeeCents: null,
  foto: null,
  criadoEm: "2026-11-01T10:00:00.000Z",
}

async function simularMeusAnuncios(
  page: Page,
  estado: "populado" | "vazio" | "falha",
): Promise<void> {
  await page.route(/\/api\/app\/mercado\/meus(?:\?|$)/, (rota) =>
    estado === "falha"
      ? rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
      : rota.fulfill({
          json: {
            anuncios: estado === "vazio" ? [] : [MEU_ANUNCIO],
            proximo: null,
            cidade: "Manaus",
          },
        }),
  )
}

const CATEGORIAS_DO_NEGOCIO = [
  { id: "assistencia_tecnica", nome: "Assistência técnica" },
  { id: "pets", nome: "Pets" },
]

async function simularMeuNegocio(page: Page): Promise<void> {
  await page.route(/\/api\/app\/negocio(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        negocio: {
          id: "30000000-0000-4000-8000-000000000010",
          nome: "Climatiza Manaus",
          categoria: "assistencia_tecnica",
          categoriaNome: "Assistência técnica",
          descricao: "Instalação e limpeza de ar-condicionado.",
          servicos: [
            {
              id: "30000000-0000-4000-8000-0000000000a1",
              titulo: "Limpeza de split",
              descricao: "Higienização completa.",
            },
          ],
          fotos: [],
        },
        categorias: CATEGORIAS_DO_NEGOCIO,
      },
    }),
  )
}

async function simularPedidos(page: Page): Promise<void> {
  await page.route(/\/api\/app\/pedidos(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { pedidos: [PEDIDO_DA_PROVA], proximo: null } }),
  )
}

/** A agenda com dois encontros futuros (a agenda esconde os passados). */
async function simularAgendaPopulada(page: Page): Promise<void> {
  await page.route(/\/api\/app\/eventos(?:\?|$)/, (rota) =>
    rota.fulfill({
      json: {
        eventos: [
          {
            id: EVENTO_DA_PROVA.evento.id,
            titulo: EVENTO_DA_PROVA.evento.titulo,
            local: EVENTO_DA_PROVA.evento.local,
            comecaEm: "2027-01-15T15:00:00.000Z",
            situacao: "upcoming",
          },
          {
            id: "evento-feira",
            titulo: "Feira de trocas do Centro",
            local: "Praça da Saudade",
            comecaEm: "2027-01-22T13:00:00.000Z",
            situacao: "upcoming",
          },
        ],
        proximo: null,
        cidade: "Manaus",
      },
    }),
  )
  await simularEvento(page)
}

/** Os quatro textos de falha das seções dos Salvos (Salvos.tsx, `AvisoDaSecao`). */
const FALHAS_DOS_SALVOS = [
  "Não foi possível carregar seus anúncios salvos.",
  "Não foi possível carregar suas publicações.",
  "Não foi possível carregar suas perguntas.",
  "Não foi possível carregar suas referências.",
] as const

async function falharSalvos(page: Page): Promise<void> {
  for (const rota of [
    /\/api\/app\/mercado\/salvos(?:\?|$)/,
    /\/api\/app\/grupos\/salvas(?:\?|$)/,
    /\/api\/app\/perguntas\/salvas(?:\?|$)/,
    /\/api\/app\/guia\/salvos(?:\?|$)/,
  ]) {
    await page.route(rota, (pedido) =>
      pedido.fulfill({ status: 503, json: { erro: "indisponivel" } }),
    )
  }
}

// ── Matriz de axe ────────────────────────────────────────────────────────────

type Caso = Readonly<{
  nome: string
  caminho: string
  preparar: (page: Page) => Promise<void> | void
  /** O estado pedido chegou: evita medir esqueleto ou erro por engano. */
  pronto: (page: Page) => Promise<void>
  /** Abre a sobreposição analisada, depois de a tela montar. */
  abrir?: (page: Page) => Promise<void>
  /** Ações principais medidas em 375 (só nas telas novas da matriz). */
  alvos?: (page: Page) => readonly Locator[]
}>

const visivel = (seletor: string) => async (page: Page) => {
  await expect(page.locator(seletor).first()).toBeVisible()
}
const comTexto = (texto: string) => async (page: Page) => {
  await expect(page.getByText(texto, { exact: false }).first()).toBeVisible()
}
const comF09F10 =
  (estado: Partial<typeof PADRAO> = {}) =>
  (page: Page) =>
    simularServidorF09F10(page, { ...PADRAO, ...estado })

const CASOS: readonly Caso[] = [
  // F03
  {
    nome: "Comunidade",
    caminho: "/app/comunidade",
    preparar: simularPerguntas,
    pronto: comTexto("pediatra"),
  },
  {
    nome: "Pergunta",
    caminho: `/app/pergunta/${ID_PERGUNTA}`,
    preparar: simularPerguntas,
    pronto: comTexto("pediatra"),
  },
  // F04
  {
    nome: "Grupo",
    caminho: "/app/grupo/g-pets",
    preparar: simularGrupos,
    pronto: comTexto("Pets de Manaus"),
  },
  {
    nome: "Publicação",
    caminho: "/app/publicacao/p-pets",
    preparar: simularGrupos,
    pronto: comTexto("Pets"),
  },
  {
    nome: "Compositor de publicação do grupo",
    caminho: "/app/grupo/g-pets",
    preparar: (page) => simularGrupos(page, { membro: true }),
    pronto: visivel('[data-acao="escrever-grupo"]'),
    abrir: async (page) => {
      await page.locator('[data-acao="escrever-grupo"]').click()
      await expect(page.locator('[data-dialogo="escrever-grupo"]')).toBeVisible()
    },
    alvos: (page) => {
      const dialogo = page.locator('[data-dialogo="escrever-grupo"]')
      return [
        dialogo.getByRole("button", { name: "Publicar", exact: true }),
        dialogo.getByRole("button", { name: "Salvar rascunho", exact: true }),
        dialogo.getByRole("button", { name: "Cancelar", exact: true }),
      ]
    },
  },
  // F05
  {
    nome: "Agenda vazia",
    caminho: "/app/agenda",
    preparar: simularEncontros,
    pronto: visivel('[data-tela="agenda"] [data-estado="vazio"]'),
  },
  {
    nome: "Agenda populada",
    caminho: "/app/agenda",
    preparar: simularAgendaPopulada,
    pronto: comTexto("Feira de trocas do Centro"),
    alvos: (page) => [
      page.getByRole("button", { name: "Criar encontro" }),
      page.getByRole("button", { name: /Feira de trocas do Centro/ }),
    ],
  },
  {
    nome: "Evento",
    caminho: `/app/evento/${EVENTO_DA_PROVA.evento.id}`,
    preparar: simularEvento,
    pronto: visivel('[data-tela="evento"]'),
  },
  // F06
  {
    nome: "Anúncio",
    caminho: "/app/anuncio/a-1",
    preparar: aplicarStubMercado,
    pronto: comTexto("Sofá retrátil seminovo"),
  },
  {
    nome: "Imóveis",
    caminho: "/app/imoveis",
    preparar: aplicarStubMercado,
    pronto: visivel('[data-acao="abrir-anuncio"]'),
  },
  {
    nome: "Meus anúncios",
    caminho: "/app/meus-anuncios",
    preparar: (page) => simularMeusAnuncios(page, "populado"),
    pronto: visivel('[data-acao="gerenciar-anuncio"]'),
    alvos: (page) => [page.locator('[data-acao="gerenciar-anuncio"]')],
  },
  {
    nome: "Meus anúncios vazios",
    caminho: "/app/meus-anuncios",
    preparar: (page) => simularMeusAnuncios(page, "vazio"),
    pronto: visivel('[data-tela="meus-anuncios"] [data-estado="vazio"]'),
    alvos: (page) => [page.getByRole("button", { name: "Anunciar desapego" })],
  },
  {
    nome: "Falha de meus anúncios",
    caminho: "/app/meus-anuncios",
    preparar: (page) => simularMeusAnuncios(page, "falha"),
    pronto: visivel('[data-tela="meus-anuncios"] [data-estado="erro"]'),
    alvos: (page) => [page.getByRole("button", { name: "Tentar de novo" })],
  },
  // F07
  {
    nome: "Meu negócio",
    caminho: "/app/meu-negocio",
    preparar: simularMeuNegocio,
    pronto: comTexto("Limpeza de split"),
    alvos: (page) => [
      page.getByRole("button", { name: "Salvar alterações" }),
      page.getByRole("button", { name: "Publicar item", exact: true }),
      page.getByRole("button", { name: "Ver página pública" }),
    ],
  },
  {
    nome: "Pedidos",
    caminho: "/app/pedidos",
    preparar: simularPedidos,
    pronto: visivel('[data-tela="pedidos"] [data-linha="lista"]'),
    alvos: (page) => [
      page.locator('[data-tela="pedidos"] [data-linha="lista"]').first(),
      page.getByRole("button", { name: "Ver negócios locais" }),
    ],
  },
  {
    nome: "Novo pedido",
    caminho: `/app/pedidos/novo?destino=${NEGOCIO_DA_PROVA.id}`,
    preparar: simularNegocio,
    // O formulário é a folha `contato-interesse`, montada no portal do Radix.
    pronto: visivel('[data-sobreposicao="contato-interesse"] textarea'),
    alvos: (page) => [page.getByRole("button", { name: "Enviar pedido", exact: true })],
  },
  // F08
  {
    nome: "Verbete",
    caminho: `/app/guia/${VERBETE_DA_PROVA.id}`,
    preparar: simularVerbeteDoGuia,
    pronto: comTexto("Escola Municipal Rio Negro"),
  },
  {
    nome: "Cidade",
    caminho: `/app/cidade/${CIDADE_CONSULTADA}`,
    preparar: simularCidade,
    pronto: comTexto("Escola Modelo"),
    alvos: (page) => [
      page.getByRole("button", { name: /Escola Modelo/ }),
      page.getByRole("button", { name: /Café na praça/ }),
    ],
  },
  // F09
  {
    nome: "Conversa aberta",
    caminho: "/app/conversa/t1",
    preparar: comF09F10(),
    pronto: visivel('[data-mensagens="historico"]'),
  },
  {
    nome: "Conversas vazias",
    caminho: "/app/conversas",
    preparar: comF09F10({ caixa: [], porLer: 0 }),
    pronto: comTexto("Comece uma conversa"),
  },
  {
    nome: "Falha de conversas",
    caminho: "/app/conversas",
    preparar: async (page) => {
      await comF09F10()(page)
      await page.route(/\/api\/app\/conversas(?:\?|$)/, (rota) =>
        rota.fulfill({ status: 503, json: { erro: "indisponivel" } }),
      )
    },
    pronto: visivel('[data-tela="conversas"] [data-estado="erro"]'),
  },
  // F10
  { nome: "Você", caminho: "/app/voce", preparar: simularVoce, pronto: comTexto("Ana Verificada") },
  {
    nome: "Bloqueados",
    caminho: "/app/bloqueados",
    preparar: simularVoce,
    pronto: comTexto("Desbloquear"),
  },
  {
    nome: "Ocultados",
    caminho: "/app/ocultados",
    preparar: simularVoce,
    pronto: comTexto("Mostrar de novo"),
  },
  {
    nome: "Perfil",
    caminho: "/app/perfil/u-paulo",
    preparar: simularVoce,
    pronto: comTexto("Paulo"),
  },
  {
    nome: "Apagar conta",
    caminho: "/app/apagar-conta",
    preparar: simularVoce,
    pronto: comTexto("permanente e não pode ser desfeita"),
  },
  {
    nome: "Avisos",
    caminho: "/app/avisos",
    preparar: comF09F10(),
    pronto: visivel('[data-aviso-item="a1"]'),
  },
  {
    nome: "Avisos vazios",
    caminho: "/app/avisos",
    preparar: comF09F10({ avisos: [] }),
    pronto: visivel('[data-estado="vazio"]'),
  },
  {
    nome: "Falha de avisos",
    caminho: "/app/avisos",
    preparar: comF09F10({ falharAvisos: true }),
    pronto: visivel('[data-estado="erro"]'),
  },
  {
    nome: "Preferências de avisos",
    caminho: "/app/voce",
    preparar: comF09F10(),
    pronto: visivel('[data-preferencias-de-aviso="sim"]'),
  },
  {
    nome: "Salvos",
    caminho: "/app/salvos",
    preparar: comF09F10(),
    pronto: visivel('[data-tela="salvos"] [data-acao="abrir-anuncio"]'),
  },
  {
    nome: "Salvos vazios",
    caminho: "/app/salvos",
    preparar: comF09F10({
      anunciosSalvos: [],
      imoveisSalvos: [],
      publicacoesSalvas: [],
      perguntasSalvas: [],
      guiaSalvo: [],
    }),
    pronto: visivel('[data-tela="salvos"] [data-estado="vazio"]'),
  },
  {
    nome: "Falha de salvos",
    caminho: "/app/salvos",
    preparar: async (page) => {
      await comF09F10()(page)
      await falharSalvos(page)
    },
    // As quatro leituras caem: cada seção mostra o próprio aviso de falha.
    pronto: async (page) => {
      for (const texto of FALHAS_DOS_SALVOS) {
        await expect(page.getByRole("alert").filter({ hasText: texto })).toBeVisible()
      }
    },
  },
]

test.describe("axe nas jornadas", () => {
  for (const caso of CASOS) {
    test(`axe: ${caso.nome}`, async ({ page }) => {
      await simularProgresso(page)
      await caso.preparar(page)
      await page.emulateMedia({ colorScheme: "light" })
      await page.goto(caso.caminho)
      await expect(page.locator("h1[data-titulo-da-tela]")).toBeVisible()
      await caso.pronto(page)
      if (caso.abrir !== undefined) await caso.abrir(page)
      await verificarTela(page, caso.nome)
      if (caso.alvos !== undefined && page.viewportSize()?.width === 375) {
        expect(await alvosPequenos(caso.alvos(page))).toEqual([])
      }
    })
  }

  for (const escolha of ["ask", "create-item"] as const) {
    test(`axe: folha Criar ${escolha}`, async ({ page }) => {
      await simularProgresso(page)
      await simularCriar(page)
      await page.emulateMedia({ colorScheme: "light" })
      await page.goto("/app/inicio")
      await page.locator(SELETOR_CRIAR).click()
      await page.locator(`[data-escolha="${escolha}"]`).click()
      await expect(
        page.locator(
          escolha === "ask"
            ? '[data-fluxo="perguntar"]'
            : '[data-formulario-criacao="create-item"]',
        ),
      ).toBeVisible()
      await verificarTela(page, `folha Criar ${escolha}`)
      if (page.viewportSize()?.width === 375) {
        const alvo =
          escolha === "ask"
            ? page.getByRole("button", { name: "Revisar pergunta" })
            : page.locator('[data-formulario-criacao="create-item"] button[type="submit"]')
        expect(await alvosPequenos([alvo])).toEqual([])
      }
    })
  }
})

// ── Teclado por jornada ──────────────────────────────────────────────────────
// F02 (menu Criar) e F07 (negócio e pedido) estão em acessibilidade.spec.ts.

test.describe("teclado por jornada", () => {
  test("F03: o Perguntar abre a folha pelo teclado e o Esc devolve o foco", async ({ page }) => {
    await simularProgresso(page)
    await simularPerguntas(page)
    await page.goto("/app/comunidade")
    const perguntar = page.locator('[data-acao="perguntar"]')
    await alcancarComTab(page, perguntar)
    await page.keyboard.press("Enter")
    const folha = page.locator('[data-fluxo="perguntar"]')
    await expect(folha).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(folha).toHaveCount(0)
    await expect(perguntar).toBeFocused()
  })

  test("F04: o Escrever abre o compositor e o Esc devolve o foco", async ({ page }) => {
    await simularProgresso(page)
    await simularGrupos(page, { membro: true })
    await page.goto("/app/grupo/g-pets")
    const escrever = page.locator('[data-acao="escrever-grupo"]')
    await alcancarComTab(page, escrever)
    await page.keyboard.press("Enter")
    const dialogo = page.locator('[data-dialogo="escrever-grupo"]')
    await expect(dialogo).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialogo).toHaveCount(0)
    await expect(escrever).toBeFocused()
  })

  test("F05: na agenda o Criar encontro abre a folha, o Esc devolve o foco e o Enter abre o encontro", async ({
    page,
  }) => {
    await simularProgresso(page)
    await simularAgendaPopulada(page)
    await page.goto("/app/agenda")
    const criar = page.getByRole("button", { name: "Criar encontro" })
    await alcancarComTab(page, criar)
    await page.keyboard.press("Enter")
    const folha = page.locator('[data-sobreposicao="folha"]')
    await expect(folha).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(folha).toHaveCount(0)
    await expect(criar).toBeFocused()

    const encontro = page.getByRole("button", { name: new RegExp(EVENTO_DA_PROVA.evento.titulo) })
    await alcancarComTab(page, encontro)
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(new RegExp(`/app/evento/${EVENTO_DA_PROVA.evento.id}$`))
  })

  test("F06: em Meus anúncios o Gerenciar abre pelo Espaço e o Esc devolve o foco", async ({
    page,
  }) => {
    await simularProgresso(page)
    await simularMeusAnuncios(page, "populado")
    await page.goto("/app/meus-anuncios")
    const gerenciar = page.locator('[data-acao="gerenciar-anuncio"]')
    await alcancarComTab(page, gerenciar)
    await page.keyboard.press("Space")
    const dialogo = page.locator(`[data-gerenciar-anuncio="${MEU_ANUNCIO.id}"]`)
    await expect(dialogo).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialogo).toHaveCount(0)
    await expect(gerenciar).toBeFocused()
  })

  test("F08: no guia o Enter abre o verbete pela linha", async ({ page }) => {
    await simularProgresso(page)
    await simularGuia(page)
    await simularVerbeteDoGuia(page)
    await page.goto("/app/guia")
    const linha = page.locator('[data-tela="guia"] [data-linha="lista"]').first()
    await alcancarComTab(page, linha)
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(new RegExp(`/app/guia/${VERBETE_DA_PROVA.id}$`))
    await expect(page.getByRole("heading", { level: 1, name: VERBETE_DA_PROVA.nome })).toBeVisible()
  })

  test("F09: na conversa as opções abrem pelo teclado e o Esc devolve o foco", async ({ page }) => {
    await simularServidorF09F10(page, { ...PADRAO })
    await page.goto("/app/conversa/t1")
    await expect(page.locator('[data-mensagens="historico"]')).toBeVisible()
    const opcoes = page.getByRole("button", { name: "Opções da conversa" })
    await alcancarComTab(page, opcoes)
    await page.keyboard.press("Enter")
    const menu = page.getByRole("menu", { name: "Opções da conversa" })
    await expect(menu).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(menu).toHaveCount(0)
    await expect(opcoes).toBeFocused()
  })

  test("F10: o Enter abre pessoas bloqueadas", async ({ page }) => {
    await simularProgresso(page)
    await simularVoce(page)
    await page.goto("/app/voce")
    const alvo = page.getByRole("button", { name: /Pessoas bloqueadas/ })
    await alcancarComTab(page, alvo)
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/app\/bloqueados$/)
  })
})

// ── Movimento reduzido nas folhas abertas pelo teclado ───────────────────────

/** Durações das animações das sobreposições e do fundo delas, neste instante. */
async function duracoesDasSobreposicoes(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animacao) => {
        const alvo = (animacao.effect as KeyframeEffect | null)?.target
        return (
          alvo instanceof Element &&
          alvo.closest("[data-sobreposicao], [data-fluxo], .bv-scrim, [data-escolha]") !== null
        )
      })
      .map((animacao) => Number(animacao.effect?.getComputedTiming().duration ?? 0)),
  )
}

const FOLHAS_DO_TECLADO = [
  {
    nome: "folha de pergunta",
    preparar: simularPerguntas,
    caminho: "/app/comunidade",
    gatilho: '[data-acao="perguntar"]',
    folha: '[data-fluxo="perguntar"]',
  },
  {
    nome: "folha do encontro",
    preparar: simularAgendaPopulada,
    caminho: "/app/agenda",
    gatilho: 'button:has-text("Criar encontro")',
    folha: '[data-sobreposicao="folha"]',
  },
] as const

test.describe("movimento reduzido nas folhas abertas pelo teclado", () => {
  for (const caso of FOLHAS_DO_TECLADO) {
    test(`${caso.nome}: anima sem preferência e fica parada com reduce`, async ({ page }) => {
      await simularProgresso(page)
      await caso.preparar(page)

      const abrirPeloTeclado = async () => {
        await page.goto(caso.caminho)
        await alcancarComTab(page, page.locator(caso.gatilho))
        await page.keyboard.press("Enter")
        await expect(page.locator(caso.folha)).toBeVisible()
        return duracoesDasSobreposicoes(page)
      }

      // Sem preferência a folha (ou o fundo dela) anima: a prova com reduce não
      // é vazia por falta de animação.
      await page.emulateMedia({ reducedMotion: "no-preference" })
      const semPreferencia = await abrirPeloTeclado()
      expect(semPreferencia.length).toBeGreaterThan(0)
      expect(semPreferencia.some((duracao) => duracao > 0)).toBe(true)

      await page.emulateMedia({ reducedMotion: "reduce" })
      const reduzido = await abrirPeloTeclado()
      expect(reduzido.every((duracao) => duracao === 0)).toBe(true)
      const estilo = await page.locator(caso.folha).evaluate((elemento) => {
        const computado = getComputedStyle(elemento)
        return { nome: computado.animationName, transicoes: computado.transitionDuration }
      })
      expect(estilo.nome).toBe("none")
      for (const duracao of estilo.transicoes.split(", ")) {
        expect(Number.parseFloat(duracao)).toBe(0)
      }
    })
  }
})

// ── Teclado no menu Criar, por Espaço ────────────────────────────────────────

test("F02: o Espaço também abre o Criar e o Esc devolve o foco", async ({ page }) => {
  await simularProgresso(page)
  await simularCriar(page)
  await page.goto("/app/inicio")
  const criar = page.locator(SELETOR_CRIAR)
  await alcancarComTab(page, criar)
  await page.keyboard.press("Space")
  await expect(page.locator(SELETOR_MENU_CRIAR)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.locator(SELETOR_MENU_CRIAR)).toHaveCount(0)
  await expect(criar).toBeFocused()
})
