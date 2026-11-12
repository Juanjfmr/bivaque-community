import { test as base, expect, type Locator, type Page } from "@playwright/test"
import { simularConversas } from "./conversas-ajuda"
import { simularGrupos } from "./grupos-ajuda"
import { simularVoce } from "./voce-ajuda"

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
export const test = base.extend<{ modoDeProva: undefined }>({
  modoDeProva: [
    async ({ page }, use) => {
      await simularConversas(page)
      await simularGrupos(page)
      await simularVoce(page)
      await page.addInitScript(() => {
        ;(window as unknown as { __BIVAQUE_MODO_DE_PROVA__?: boolean }).__BIVAQUE_MODO_DE_PROVA__ =
          true
      })
      await use(undefined)
    },
    { auto: true },
  ],
})

export { expect }

export const SELETOR_CONTEUDO = "#conteudo"
export const SELETOR_TITULO = "h1[data-titulo-da-tela]"

/** A barra do topo e a navegação principal (onda 1c). */
export const SELETOR_BARRA = '[data-topo="barra"]'
export const SELETOR_NAVEGACAO = '[data-nav="principal"]'
export const SELETOR_CHIP_CIDADE = '[data-acao="cidade"]'
export const SELETOR_AVISOS = '[data-acao="avisos"]'
export const SELETOR_CONVERSAS = '[data-acao="conversas-topo"]'
export const SELETOR_CRIAR = '[data-acao="criar"]'
export const SELETOR_MENU_CRIAR = '[data-sobreposicao="menu-criar"]'
export const SELETOR_GALERIA = "[data-galeria]"

/** Parâmetro com Unicode, espaço, barra e interrogação. */
export const PERGUNTA_DIFICIL = "mudança de cidade/2026 ?!"
export const SELETOR_ABRIR_PERGUNTA = '[data-acao="abrir-pergunta"][data-valor="pergunta-dificil"]'
export const PREFIXO_DA_PERGUNTA = "/app/pergunta/"

/** As sete escolhas do menu Criar, na ordem do inventário §4. */
export const ESCOLHAS_DO_CRIAR: ReadonlyArray<readonly [id: string, rotulo: string]> = [
  ["ask", "Pedir indicação"],
  ["create-request", "Contratar serviço"],
  ["create-item", "Anunciar desapego"],
  ["create-property", "Anunciar imóvel"],
  ["indicate", "Indicar um negócio"],
  ["create-event", "Criar encontro"],
  ["my-biz", "Divulgar meu negócio"],
]

/**
 * A galeria de prova: só existe com o modo de prova ligado (o mesmo global da
 * navegação). Em uso normal, o endereço mostra a página indisponível.
 */
export async function abrirGaleria(page: Page): Promise<void> {
  await page.goto("/app/galeria")
  await expect(page.locator('[data-tela="galeria"]')).toBeVisible()
}

/** Estado da casca dado pela prova (contadores e cidade): é entrada, não medida. */
export async function definirCascaDaProva(
  page: Page,
  valores: { readonly avisos?: number; readonly conversas?: number; readonly cidade?: string },
): Promise<void> {
  await page.addInitScript((dados) => {
    ;(window as unknown as { __BIVAQUE_CASCA__?: unknown }).__BIVAQUE_CASCA__ = dados
  }, valores)
}

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

/**
 * A rota de progresso responde sem sessão. A casca então não busca avisos e as
 * telas reais abrem no estado de quem ainda não entrou — o mesmo estado que a
 * produção usa para a visita.
 */
export async function simularProgresso(page: Page): Promise<void> {
  await page.route(/\/api\/app\/entry\/progress(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: { autenticado: false } })
  })
}

const CATEGORIAS_DE_NEGOCIO = [
  { id: "saude_e_bem_estar", nome: "Saúde e bem-estar" },
  { id: "casa_e_construcao", nome: "Casa e construção" },
]

/** A primeira página dos negócios, com cursor para a segunda. */
export const NEGOCIOS_DA_PROVA = {
  cidade: "Manaus",
  categorias: CATEGORIAS_DE_NEGOCIO,
  negocios: [
    {
      id: "negocio-bem-viver",
      nome: "Clínica Bem Viver",
      categoria: "saude_e_bem_estar",
      categoriaNome: "Saúde e bem-estar",
      descricao: "Fisioterapia e pilates no Centro.",
    },
    {
      id: "negocio-casa-nova",
      nome: "Casa Nova Reformas",
      categoria: "casa_e_construcao",
      categoriaNome: "Casa e construção",
      descricao: "Pintura e pequenos reparos.",
    },
  ],
  proximo: "negocios-pagina-2",
}

/** A segunda página: um negócio novo, sem cursor seguinte. */
export const NEGOCIOS_PAGINA_2 = {
  cidade: "Manaus",
  categorias: CATEGORIAS_DE_NEGOCIO,
  negocios: [
    {
      id: "negocio-rio-negro",
      nome: "Rio Negro Instalações",
      categoria: "casa_e_construcao",
      categoriaNome: "Casa e construção",
      descricao: "Instalação de ar-condicionado.",
    },
  ],
  proximo: null,
}

/** Duas páginas de negócios: sem `depois`, a primeira; com ele, a segunda. */
export async function simularNegocios(page: Page): Promise<void> {
  await page.route(/\/api\/app\/negocios(?:\?|$)/, async (rota) => {
    const depois = new URL(rota.request().url()).searchParams.get("depois")
    await rota.fulfill({ json: depois === null ? NEGOCIOS_DA_PROVA : NEGOCIOS_PAGINA_2 })
  })
}

/** A primeira página do guia, com cursor para a segunda. */
export const GUIA_DA_PROVA = {
  cidade: "Manaus",
  entradas: [
    {
      id: "guia-escola-rio-negro",
      categoria: "school",
      nome: "Escola Municipal Rio Negro",
      descricao: "Ensino fundamental no Centro.",
      site: null,
      telefone: null,
      salvo: false,
    },
    {
      id: "guia-hospital-getulio",
      categoria: "hospital",
      nome: "Hospital Universitário Getúlio Vargas",
      descricao: "Atendimento pelo SUS.",
      site: null,
      telefone: null,
      salvo: false,
    },
  ],
  proximo: "guia-pagina-2",
}

/** A segunda página do guia: uma referência nova, sem cursor seguinte. */
export const GUIA_PAGINA_2 = {
  cidade: "Manaus",
  entradas: [
    {
      id: "guia-transporte-rio-negro",
      categoria: "transporter",
      nome: "Transporte Rio Negro",
      descricao: "Translado para consultas e exames.",
      site: null,
      telefone: null,
      salvo: false,
    },
  ],
  proximo: null,
}

/** Duas páginas do guia: sem `depois`, a primeira; com ele, a segunda. */
export async function simularGuia(page: Page): Promise<void> {
  await page.route(/\/api\/app\/guia(?:\?|$)/, async (rota) => {
    const depois = new URL(rota.request().url()).searchParams.get("depois")
    await rota.fulfill({ json: depois === null ? GUIA_DA_PROVA : GUIA_PAGINA_2 })
  })
}

/** Um encontro de outra pessoa na cidade de quem olha: presença disponível. */
export const EVENTO_DA_PROVA = {
  evento: {
    id: "evento-da-prova",
    titulo: "Encontro de veteranos no Parque",
    descricao: "Uma manhã de conversa e café no Parque Municipal.",
    local: "Parque Municipal",
    comecaEm: "2026-12-12T15:00:00.000Z",
    terminaEm: null,
    situacao: "upcoming",
    cidade: "Manaus",
  },
  presenca: { confirmados: 3, minha: null },
  souOrganizador: false,
  visitante: false,
}

/** O encontro da prova e a gravação de presença (PUT e DELETE). */
export async function simularEvento(page: Page): Promise<void> {
  await page.route(/\/api\/app\/eventos\/evento-da-prova\/presenca(?:\?|$)/, async (rota) => {
    if (rota.request().method() === "DELETE") {
      await rota.fulfill({ json: { presenca: { confirmados: 2, minha: null } } })
      return
    }
    const corpo = rota.request().postDataJSON() as { situacao?: string } | null
    const situacao = corpo?.situacao ?? null
    await rota.fulfill({
      json: {
        presenca: {
          confirmados: situacao === "going" ? 4 : 3,
          minha:
            situacao === "going" || situacao === "not_going" || situacao === "interested"
              ? situacao
              : null,
        },
      },
    })
  })
  await page.route(/\/api\/app\/eventos\/evento-da-prova(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: EVENTO_DA_PROVA })
  })
}

/**
 * A ficha de um negócio, no contrato que `buscarNegocio` lê em
 * `/api/app/negocios/<id>`: o negócio, a cidade e a permissão de pedir.
 */
export const NEGOCIO_DA_PROVA = {
  id: "negocio-da-prova",
  nome: "Clínica Bem Viver",
  categoria: "saude_e_bem_estar",
  categoriaNome: "Saúde e bem-estar",
  descricao: "Fisioterapia e pilates no Centro, com atendimento agendado.",
  cidade: "Manaus",
  podePedir: true,
  servicos: [
    {
      id: "servico-fisioterapia",
      titulo: "Fisioterapia ortopédica",
      descricao: "Sessões de 50 minutos com avaliação inicial.",
    },
    { id: "servico-pilates", titulo: "Pilates em grupo", descricao: null },
  ],
  foto: null,
  fotoDescricao: null,
}

/**
 * A ficha da prova em `/api/app/negocios/<id>`; a lista continua com `simularNegocios`.
 * Com `foto`, o valor vira uma imagem de 1×1 para a captura mostrar a área da
 * capa como ela aparece com foto, sem baixar arquivo.
 */
export async function simularNegocio(
  page: Page,
  opcoes: { readonly foto?: boolean } = {},
): Promise<void> {
  const ficha = opcoes.foto
    ? {
        ...NEGOCIO_DA_PROVA,
        foto: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
        fotoDescricao: "Fachada da clínica",
      }
    : NEGOCIO_DA_PROVA
  await page.route(/\/api\/app\/negocios\/negocio-da-prova(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: { negocio: ficha } })
  })
}

/**
 * Um pedido de serviço, no contrato que `buscarPedido` lê em
 * `/api/app/pedidos/<id>`. O negócio é o da ficha acima, para a tela poder
 * voltar para ela.
 */
export const PEDIDO_DA_PROVA = {
  id: "pedido-da-prova",
  negocioId: NEGOCIO_DA_PROVA.id,
  negocioNome: NEGOCIO_DA_PROVA.nome,
  categoriaNome: NEGOCIO_DA_PROVA.categoriaNome,
  descricao: "Preciso de fisioterapia para o ombro direito.\nPrefiro horário de manhã.",
  quando: "Nesta semana",
  situacao: "open",
  criadoEm: "2026-11-05T12:00:00.000Z",
  atualizadoEm: "2026-11-06T09:30:00.000Z",
  conversaId: null,
}

/** O pedido da prova em `/api/app/pedidos/<id>`. */
export async function simularPedido(page: Page): Promise<void> {
  await page.route(/\/api\/app\/pedidos\/pedido-da-prova(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: { pedido: PEDIDO_DA_PROVA } })
  })
}

/**
 * A busca da prova (LAN-TROCA): um resultado de cada tipo que a tela mostra,
 * todos falando do mesmo termo, mais um termo que não acha nada. Serve para
 * separar "a lista filtrada chegou" de "o estado vazio abriu" sem depender dos
 * fixtures de outra tela — o que interessa aqui é o termo que veio no endereço,
 * não o conteúdo do banco.
 */
export const TERMO_DA_PROVA = "ipiranga"
export const TERMO_SEM_ACHADO = "zarabatana"
export const CIDADE_DA_BUSCA = "Manaus"

/** Os campos de cada tipo que a rota `/api/app/busca` devolve. */
export const BUSCA_DA_PROVA = {
  anuncios: [
    {
      id: "anuncio-ipiranga",
      title: "Moto 150cc seminova do Ipiranga",
      tipo: "item",
      precoCentavos: 850000,
      bairro: "Ipiranga",
    },
  ],
  negocios: [{ id: "negocio-ipiranga", nome: "Oficina Ipiranga", categoria: "servicos" }],
  perguntas: [
    {
      id: "pergunta-ipiranga",
      title: "Alguém indica mecânico perto da avenida Ipiranga?",
      respostas: 2,
      resolvida: false,
      grupo: null,
    },
  ],
  grupos: [{ id: "grupo-ipiranga", nome: "Vizinhos do Ipiranga", membros: 5 }],
  guia: [
    {
      id: "guia-ipiranga",
      title: "Serviços e escolas do Ipiranga",
      detalhe: "Endereços e contatos do bairro.",
    },
  ],
} as const

const BUSCA_VAZIA = { anuncios: [], negocios: [], perguntas: [], grupos: [], guia: [] } as const

/**
 * `/api/app/busca` respondendo como o servidor: o termo do endereço decide se
 * volta a lista da prova ou nada. O Início da cidade fica só com a cidade, para
 * o estado sem termo não herdar resultado nenhum de outro fixture.
 */
export async function simularBuscaDaProva(page: Page): Promise<void> {
  await page.route(/\/api\/app\/busca(?:\?|$)/, async (rota) => {
    const termo = new URL(rota.request().url()).searchParams.get("q") ?? ""
    const achou = termo.toLocaleLowerCase("pt-BR") === TERMO_DA_PROVA
    await rota.fulfill({
      json: { cidade: CIDADE_DA_BUSCA, ...(achou ? BUSCA_DA_PROVA : BUSCA_VAZIA) },
    })
  })
  await page.route(/\/api\/app\/inicio(?:\?|$)/, async (rota) => {
    await rota.fulfill({
      json: { ...BUSCA_VAZIA, cidade: CIDADE_DA_BUSCA, eventos: [], proximo: null },
    })
  })
}
