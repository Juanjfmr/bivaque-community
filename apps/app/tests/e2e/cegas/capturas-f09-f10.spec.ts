import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"

import { abrir as abrirRota, SELETOR_TITULO } from "../apoio"

/**
 * Capturas para a revisão cega de F09 (Conversas, Conversa, Avisos e as
 * preferências de aviso) e F10 (Você, Pessoas bloqueadas, Salvos e o perfil de
 * outra pessoa) — o critério 2 de docs/LANCAMENTO.md.
 *
 * Vive em arquivo próprio porque `capturas.spec.ts` roda com o modo de prova
 * ligado (`apoio.ts`), e o modo de prova troca toda tela real pela TelaDeProva:
 * ali se fotografa o andaime. Aqui se fotografa a tela de verdade, com as rotas
 * `/api/app/*` simuladas no mesmo contrato do servidor — como `avisos.spec.ts` e
 * `salvos.spec.ts` já fazem para medir estas telas.
 *
 * O spec só tira fotos, num tema (claro, decisão do dono de 14/11): não afirma
 * veredito, nota nem aparência. O julgamento é de outro modelo, a partir destas
 * imagens. As capturas ficam em `.visual/blind/<jornada>/<largura>-light-<passo>.png`,
 * nomeadas só pela jornada.
 */

const LARGURAS = [375, 768, 1440] as const
const TEMA = "light"
const RAIZ = join(process.cwd(), "..", "..", ".visual", "blind")

const CIDADE_MANAUS = "00000000-0000-4000-8000-000000000001"
const CIDADE_RIO = "00000000-0000-4000-8000-000000000002"
const PUBLICACAO = "90000000-0000-4000-8000-000000000001"
const CONTEUDO = "90000000-0000-4000-8000-000000000002"

type Conversa = Readonly<{
  id: string
  nome: string
  outroId: string
  tipo: string
  contextoId: string
  ultima: string
  porLer: boolean
}>

type Mensagem = Readonly<{
  id: string
  conteudo: string
  minha: boolean
  criadaEm: string
}>

type Aviso = Readonly<{
  id: string
  tipo: string
  texto: string
  destino: string
  lida: boolean
  criadaEm: string
  grupo: string
  total: number
}>

type Bloqueado = Readonly<{ id: string; nome: string; bloqueadoEm: string }>

/** Linha crua de uma das listas dos Salvos: quem confere o contrato é o parser. */
type Linha = Readonly<Record<string, unknown>>

/**
 * O estado que as rotas devolvem. Cada passo fotografa um recorte dele: o loop
 * reescreve o objeto (as rotas leem a mesma referência) antes de navegar, então
 * a foto é do estado que o passo pediu, e não do anterior.
 */
type Estado = {
  caixa: readonly Conversa[]
  porLer: number
  mensagens: Readonly<Record<string, readonly Mensagem[]>>
  falharEnvio: boolean
  avisos: readonly Aviso[]
  falharAvisos: boolean
  falhaDoPerfil: boolean
  bloqueados: readonly Bloqueado[]
  anunciosSalvos: readonly Linha[]
  imoveisSalvos: readonly Linha[]
  publicacoesSalvas: readonly Linha[]
  perguntasSalvas: readonly Linha[]
  guiaSalvo: readonly Linha[]
  membro: Readonly<Record<string, unknown>>
}

type Passo = Readonly<{
  nome: string
  /** O recorte do estado que esta foto mede. */
  cenario: Partial<Estado>
  ir: (page: Page) => Promise<void>
  /** Conteúdo que só existe quando a tela terminou de carregar. */
  pronto: string
}>

/** Uma conversa por ler no topo da caixa; as outras duas, já lidas. */
const CAIXA: readonly Conversa[] = [
  {
    id: "t1",
    nome: "Paulo Roberto",
    outroId: "u-paulo",
    tipo: "listing",
    contextoId: "anuncio-sofa-3-lugares",
    ultima: "Fechado, levo o sofá na sexta de manhã.",
    porLer: true,
  },
  {
    id: "t2",
    nome: "Climatização Rio Negro",
    outroId: "u-clima",
    tipo: "provider",
    contextoId: "negocio-climatizacao-rio-negro",
    ultima: "Posso passar amanhã às 9h.",
    porLer: false,
  },
  {
    id: "t3",
    nome: "Ana Beatriz Ferreira",
    outroId: "u-ana",
    tipo: "shared_group",
    contextoId: "grupo-familias-do-centro",
    ultima: "Combinado, obrigada!",
    porLer: false,
  },
]

/** A conversa aberta: os dois lados falam, com o assunto do anúncio. */
const HISTORICO: Readonly<Record<string, readonly Mensagem[]>> = {
  t1: [
    {
      id: "m1",
      conteudo: "Oi! Vi o anúncio do sofá. Ele ainda está disponível?",
      minha: true,
      criadaEm: "2026-11-10T12:00:00.000Z",
    },
    {
      id: "m2",
      conteudo: "Está sim. Posso entregar no Centro nesta semana, sem custo.",
      minha: false,
      criadaEm: "2026-11-10T12:04:00.000Z",
    },
    {
      id: "m3",
      conteudo: "Ótimo. Sexta às 10h fica bom para mim.",
      minha: true,
      criadaEm: "2026-11-10T12:07:00.000Z",
    },
    {
      id: "m4",
      conteudo: "Fechado, levo o sofá na sexta de manhã. Pode ser no portão do prédio?",
      minha: false,
      criadaEm: "2026-11-10T12:12:00.000Z",
    },
  ],
}

/** Avisos lidos e não lidos, com um grupo de dois comentários. */
const AVISOS: readonly Aviso[] = [
  {
    id: "a1",
    tipo: "comment",
    texto: "Maria Souza comentou na sua publicação",
    destino: `/app/publicacao/${PUBLICACAO}`,
    lida: false,
    criadaEm: "2026-11-06T12:00:00.000Z",
    grupo: `comment|created|post|${PUBLICACAO}`,
    total: 2,
  },
  {
    id: "a2",
    tipo: "direct_message",
    texto: "Paulo Roberto enviou uma mensagem",
    destino: "/app/conversa/t1",
    lida: false,
    criadaEm: "2026-11-06T11:20:00.000Z",
    grupo: "direct_message|created|conversation|t1",
    total: 1,
  },
  {
    id: "a3",
    tipo: "report_resolved",
    texto: "Sua denúncia foi analisada pela moderação",
    destino: `/app/publicacao/${CONTEUDO}`,
    lida: false,
    criadaEm: "2026-11-05T18:40:00.000Z",
    grupo: "report_resolved|resolved|report|r1",
    total: 1,
  },
  {
    id: "a4",
    tipo: "event_rsvp",
    texto: "Carlos Menezes confirmou presença no seu encontro",
    destino: "/app/evento/e-cafe-do-centro",
    lida: true,
    criadaEm: "2026-11-04T15:10:00.000Z",
    grupo: "event_rsvp|confirmed|event|e-cafe-do-centro",
    total: 1,
  },
  {
    id: "a5",
    tipo: "recommendation_reply",
    texto: "Ana Beatriz Ferreira respondeu à sua indicação",
    destino: "/app/pergunta/q-pediatra",
    lida: true,
    criadaEm: "2026-11-03T09:30:00.000Z",
    grupo: "recommendation_reply|replied|question|q-pediatra",
    total: 1,
  },
]

const BLOQUEADOS: readonly Bloqueado[] = [
  { id: "u-maria", nome: "Maria Souza", bloqueadoEm: "2026-11-03T12:00:00.000Z" },
]

const PERFIL = {
  nome: "Ana Beatriz Ferreira",
  bio: "Mãe de dois, moro no Centro. Faço pão de queijo por encomenda.",
  cidade: { id: CIDADE_MANAUS, nome: "Manaus" },
  outbound: null,
  localizacao: { cep: "69020-000", definida: true },
  distanciaDisponivel: true,
}

const CONTAGENS = { salvos: 4, anuncios: 3, perguntas: 2, grupos: 1 }
const CONTA = { exclusaoPendente: false }

/** Uma pessoa da família já convidada: o estado normal de quem usa o app. */
const FAMILIA = [
  {
    id: "c1",
    emailMascarado: "ma***@gm***.com",
    criadoEm: "2026-11-01T10:00:00.000Z",
    expiraEm: "2026-11-08T10:00:00.000Z",
  },
]

const AFILIACAO = { armedForce: "exercito", om: "1º BIS" }

/** A matriz de canais como o servidor devolve: cinco tipos × três canais. */
const PREFERENCIAS = {
  comments: true,
  events: true,
  productNews: false,
  indications: true,
  messages: true,
  resumoCidade: "weekly",
  channels: (
    [
      ["comments", [true, true, false]],
      ["events", [true, false, false]],
      ["product_news", [false, false, false]],
      ["indications", [true, true, false]],
      ["messages", [true, true, false]],
    ] as const
  ).flatMap(([notificationType, ativos]) =>
    (["in_app", "email", "push"] as const).map((channel, indice) => ({
      notificationType,
      channel,
      enabled: ativos[indice] === true,
    })),
  ),
}

const ANUNCIO_SOFA: Linha = {
  id: "a-sofa",
  tipo: "item",
  titulo: "Sofá retrátil 3 lugares",
  descricao: "Tecido cinza, dois anos de uso, sem rasgos.",
  precoCents: 85000,
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
  foto: "/app/demo/sofa.jpg",
  salvo: true,
  criadoEm: "2026-11-09T12:00:00.000Z",
}

const ANUNCIO_GELADEIRA: Linha = {
  id: "a-geladeira",
  tipo: "item",
  titulo: "Geladeira duplex frost free",
  descricao: "440 litros, funcionando bem, retirada no local.",
  precoCents: 110000,
  deal: null,
  bairro: "Adrianópolis",
  cidade: "Manaus",
  status: "active",
  condicao: "usado",
  categoria: "eletrodomesticos",
  quartos: null,
  tipoImovel: null,
  areaM2: null,
  condoFeeCents: null,
  foto: "/app/demo/fridge.jpg",
  salvo: true,
  criadoEm: "2026-11-07T10:00:00.000Z",
}

const IMOVEL_SALVO: Linha = {
  id: "p-centro",
  tipo: "property",
  titulo: "Apartamento 2 quartos no Centro",
  descricao: "Garagem coberta, próximo à praça.",
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
  foto: "/app/demo/apartment.jpg",
  salvo: true,
  criadoEm: "2026-11-02T08:00:00.000Z",
}

const PUBLICACAO_SALVA: Linha = {
  id: "pub-1",
  grupoId: "g-familias",
  texto: "Alguém indica um eletricista de confiança no Adrianópolis?",
  criadaEm: "2026-11-10T12:00:00.000Z",
  autor: "Carlos Menezes",
  autorId: "u-carlos",
  propria: false,
  comentarios: 3,
  uteis: 1,
  util: false,
  salva: true,
  oculta: false,
  fotos: [],
}

const PERGUNTAS_SALVAS: readonly Linha[] = [
  {
    id: "q-pediatra",
    titulo: "Alguém indica pediatra que atenda pelo FuSEx?",
    categoria: "servicos_locais",
    criadaEm: "2026-11-09T12:00:00.000Z",
    resolvida: false,
  },
  {
    id: "q-gas",
    titulo: "Onde comprar gás de cozinha com entrega no Centro?",
    categoria: "servicos_locais",
    criadaEm: "2026-11-07T12:00:00.000Z",
    resolvida: true,
  },
]

const GUIA_SALVO: readonly Linha[] = [
  {
    id: "guia-escola-rio-negro",
    categoria: "school",
    nome: "Escola Municipal Rio Negro",
    descricao: "Ensino fundamental no Centro.",
    site: null,
    telefone: null,
    salvo: true,
  },
]

const MEMBRO = {
  id: "u-paulo",
  nome: "Paulo Roberto",
  bio: "Moro no Centro desde 2010. Vendo móveis usados em bom estado.",
  publicacoes: [
    {
      id: "pub-2",
      texto: "Sofá retrátil disponível para retirada no Centro.",
      criadaEm: "2026-11-09T12:00:00.000Z",
    },
    {
      id: "pub-3",
      texto: "Alguém conhece um bom chaveiro que atenda aos domingos?",
      criadaEm: "2026-11-02T09:00:00.000Z",
    },
  ],
  eventos: [
    { id: "e-cafe", titulo: "Café dos vizinhos do Centro", comecaEm: "2026-12-06T15:00:00.000Z" },
  ],
}

const PADRAO: Estado = {
  caixa: CAIXA,
  porLer: 1,
  mensagens: HISTORICO,
  falharEnvio: false,
  avisos: AVISOS,
  falharAvisos: false,
  falhaDoPerfil: false,
  bloqueados: BLOQUEADOS,
  anunciosSalvos: [ANUNCIO_SOFA, ANUNCIO_GELADEIRA],
  imoveisSalvos: [IMOVEL_SALVO],
  publicacoesSalvas: [PUBLICACAO_SALVA],
  perguntasSalvas: PERGUNTAS_SALVAS,
  guiaSalvo: GUIA_SALVO,
  membro: MEMBRO,
}

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
 * Abre a rota num documento novo. Recarregar a MESMA rota reidrata o estado da
 * entrada que ficou no histórico — a sobreposição do passo anterior —, e a tela
 * volta com o menu aberto e o conteúdo `inert`; limpar o documento antes
 * garante a foto do passo, e não a sobra do anterior.
 */
async function abrirDoZero(page: Page, caminho: string): Promise<void> {
  await page.goto("about:blank")
  await abrirRota(page, caminho)
}

/** As rotas da sessão e do catálogo, no contrato que cada porta do app lê. */
async function simularServidor(page: Page, estado: Estado): Promise<void> {
  // A sessão existe: é ela que acende os contadores do topo. O contador de
  // conversas é o `porLer` da caixa, o mesmo número do marcador "Por ler".
  await page.route(/\/api\/app\/entry\/progress(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { autenticado: true } }),
  )

  // O catálogo de cidades que o formulário de mudança lê ao abrir a tela.
  const municipios: Readonly<Record<string, readonly { id: string; cityName: string }[]>> = {
    AM: [{ id: CIDADE_MANAUS, cityName: "Manaus" }],
    RJ: [{ id: CIDADE_RIO, cityName: "Rio de Janeiro" }],
  }
  await page.route(/\/api\/localities(?:\/|$)/, (rota) => {
    const uf = new URL(rota.request().url()).pathname.split("/").filter(Boolean)[2]
    if (uf === undefined) return rota.fulfill({ json: { ufs: Object.keys(municipios) } })
    const cidades = municipios[uf.toUpperCase()]
    return cidades === undefined
      ? rota.fulfill({ status: 404, json: { error: "unknown_uf" } })
      : rota.fulfill({
          json: {
            municipalities: cidades.map((cidade) => ({ ...cidade, ibgeCode: "0000000" })),
          },
        })
  })

  await page.route(/\/api\/app\/conversas(?:\/|\?|$)/, (rota) => {
    const caminho = new URL(rota.request().url()).pathname.split("/").filter(Boolean)
    const id = caminho[3]
    if (id === undefined) {
      return rota.fulfill({
        json: { conversas: estado.caixa, proximo: null, porLer: estado.porLer },
      })
    }
    const conversa = estado.caixa.find((item) => item.id === id)
    if (conversa === undefined)
      return rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
    if (caminho[4] === "lida") return rota.fulfill({ status: 204 })
    if (caminho[4] === "mensagens") {
      if (estado.falharEnvio) return rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
      const corpo = rota.request().postDataJSON() as { texto: string }
      const mensagem: Mensagem = {
        id: `m-enviada-${Date.now()}`,
        conteudo: corpo.texto,
        minha: true,
        criadaEm: new Date().toISOString(),
      }
      return rota.fulfill({ status: 201, json: { mensagem } })
    }
    return rota.fulfill({
      json: { conversa, mensagens: estado.mensagens[id] ?? [], anterior: null },
    })
  })

  await page.route(/\/api\/app\/voce(?:\/|\?|$)/, (rota) => {
    const recurso = new URL(rota.request().url()).pathname.split("/").filter(Boolean)[3]
    if (recurso === undefined) {
      return estado.falhaDoPerfil
        ? rota.fulfill({ status: 503, json: { erro: "indisponivel" } })
        : rota.fulfill({ json: { perfil: PERFIL, contagens: CONTAGENS, conta: CONTA } })
    }
    if (recurso === "bloqueados") return rota.fulfill({ json: { bloqueados: estado.bloqueados } })
    if (recurso === "familia")
      return rota.fulfill({ json: { familia: { podeConvidar: true, pendentes: FAMILIA } } })
    if (recurso === "afiliacao") return rota.fulfill({ json: { afiliacao: AFILIACAO } })
    return rota.fulfill({ status: 404, json: { erro: "nao-encontrado" } })
  })

  await page.route(/\/api\/app\/avisos\/preferencias$/, (rota) =>
    rota.fulfill({ json: { preferencias: PREFERENCIAS } }),
  )

  await page.route(/\/api\/app\/avisos(?:\?|$)/, (rota) => {
    if (estado.falharAvisos) return rota.abort()
    const filtro = new URL(rota.request().url()).searchParams.get("filtro")
    const lista =
      filtro === "nao-lidas" ? estado.avisos.filter((aviso) => !aviso.lida) : estado.avisos
    return rota.fulfill({
      json: {
        avisos: lista,
        proximo: null,
        naoLidos: estado.avisos.filter((aviso) => !aviso.lida).length,
      },
    })
  })

  await page.route(/\/api\/app\/mercado\/salvos(?:\?|$)/, (rota) => {
    const tipo = new URL(rota.request().url()).searchParams.get("tipo")
    // A foto do cartão só aparece com URL absoluta: o app resolve referência
    // relativa pela tabela de imagens embutidas, e o fixture usa arquivo público.
    const comFoto = (anuncio: Linha): Linha =>
      typeof anuncio["foto"] === "string" && anuncio["foto"] !== ""
        ? { ...anuncio, foto: new URL(anuncio["foto"], rota.request().url()).href }
        : anuncio
    return rota.fulfill({
      json: {
        anuncios: (tipo === "property" ? estado.imoveisSalvos : estado.anunciosSalvos).map(comFoto),
        proximo: null,
      },
    })
  })
  await page.route(/\/api\/app\/grupos\/salvas(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { publicacoes: estado.publicacoesSalvas } }),
  )
  await page.route(/\/api\/app\/perguntas\/salvas(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { perguntas: estado.perguntasSalvas } }),
  )
  await page.route(/\/api\/app\/guia\/salvos(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { entradas: estado.guiaSalvo } }),
  )
  await page.route(/\/api\/app\/membros\/[^/?#]+(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { membro: estado.membro } }),
  )
}

const JORNADAS: ReadonlyArray<{ nome: string; passos: readonly Passo[] }> = [
  {
    nome: "f09-conversas",
    passos: [
      {
        nome: "01-caixa",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/conversas")
          // O contador do topo é o mesmo número da caixa: uma conversa por ler.
          await expect(page.locator('[data-contador="conversas"]')).toHaveText("1")
        },
        pronto: '[data-thread="t1"]',
      },
      {
        nome: "02-caixa-vazia",
        cenario: { caixa: [], porLer: 0, mensagens: {} },
        ir: async (page) => {
          await abrirDoZero(page, "/app/conversas")
        },
        pronto: '[data-estado="vazio"]',
      },
      {
        nome: "03-conversa",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/conversa/t1")
        },
        pronto: '[data-mensagens="historico"]',
      },
      {
        nome: "04-envio-falhou",
        cenario: { falharEnvio: true },
        ir: async (page) => {
          await abrirDoZero(page, "/app/conversa/t1")
          await expect(page.locator('[data-mensagens="historico"]')).toBeVisible()
          await page.locator("#mensagem-da-conversa").fill("Consigo buscar na quinta à tarde.")
          await page.locator('[data-acao="enviar-mensagem"]').click()
          await expect(page.getByRole("alert")).toContainText("Seu texto foi mantido")
        },
        pronto: '[role="alert"]',
      },
      {
        nome: "05-menu-de-bloqueio",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/conversa/t1")
          await expect(page.locator('[data-mensagens="historico"]')).toBeVisible()
          await page.locator('[data-acao="opcoes"]').click()
          await expect(
            page.locator('[data-sobreposicao="menu-de-linha"]').getByRole("menuitem", {
              name: "Bloquear Paulo Roberto",
            }),
          ).toBeVisible()
        },
        pronto: '[data-sobreposicao="menu-de-linha"]',
      },
      {
        nome: "06-denuncia",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/conversa/t1")
          await expect(page.locator('[data-mensagens="historico"]')).toBeVisible()
          await page.getByRole("button", { name: "Denunciar mensagem" }).first().click()
          await page.getByRole("radio", { name: "Spam" }).check()
        },
        pronto: '[data-sobreposicao="denuncia-de-mensagem"]',
      },
    ],
  },
  {
    nome: "f09-avisos",
    passos: [
      {
        nome: "01-lista",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/avisos")
        },
        pronto: '[data-aviso-item="a1"]',
      },
      {
        nome: "02-lista-vazia",
        cenario: { avisos: [] },
        ir: async (page) => {
          await abrirDoZero(page, "/app/avisos")
        },
        pronto: '[data-estado="vazio"]',
      },
      {
        nome: "03-falha-ao-carregar",
        cenario: { falharAvisos: true },
        ir: async (page) => {
          await abrirDoZero(page, "/app/avisos")
        },
        pronto: '[data-estado="erro"]',
      },
      {
        nome: "04-preferencias-por-canal",
        cenario: {},
        // As preferências vivem na área Você: a foto é da seção, rolada até o
        // título dela para a matriz aparecer inteira a partir do começo.
        ir: async (page) => {
          await abrirDoZero(page, "/app/voce")
          const secao = page.locator('[data-preferencias-de-aviso="sim"]')
          await secao.evaluate((elemento) => {
            elemento.closest('[data-secao="sim"]')?.scrollIntoView({ block: "start" })
          })
          await page.waitForTimeout(400)
        },
        pronto: '[data-preferencias-de-aviso="sim"]',
      },
    ],
  },
  {
    nome: "f10-voce",
    passos: [
      {
        nome: "01-voce",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/voce")
        },
        pronto: 'text="Ana Beatriz Ferreira"',
      },
      {
        nome: "02-voce-falha-ao-carregar",
        cenario: { falhaDoPerfil: true },
        ir: async (page) => {
          await abrirDoZero(page, "/app/voce")
        },
        pronto: '[data-estado="erro"]',
      },
      {
        nome: "03-bloqueados",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/bloqueados")
        },
        pronto: 'text="Maria Souza"',
      },
      {
        nome: "04-bloqueados-vazio",
        cenario: { bloqueados: [] },
        ir: async (page) => {
          await abrirDoZero(page, "/app/bloqueados")
        },
        pronto: '[data-estado="vazio"]',
      },
      {
        nome: "05-salvos",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/salvos")
        },
        pronto: 'text="Sofá retrátil 3 lugares"',
      },
      {
        nome: "06-salvos-vazio",
        cenario: {
          anunciosSalvos: [],
          imoveisSalvos: [],
          publicacoesSalvas: [],
          perguntasSalvas: [],
          guiaSalvo: [],
        },
        ir: async (page) => {
          await abrirDoZero(page, "/app/salvos")
        },
        // O vazio dos anúncios é o único da tela que é o primeiro da lista.
        pronto: '[data-salvos="anuncios"] [data-estado="vazio"]',
      },
      {
        nome: "07-perfil-de-membro",
        cenario: {},
        ir: async (page) => {
          await abrirDoZero(page, "/app/perfil/u-paulo")
        },
        pronto: '[data-tela="perfil"] h1',
      },
    ],
  },
]

async function fotografar(page: Page, jornada: string, largura: number, passo: Passo) {
  const diretorio = join(RAIZ, jornada)
  mkdirSync(diretorio, { recursive: true })
  await page.screenshot({
    path: join(diretorio, `${largura}-${TEMA}-${passo.nome}.png`),
    fullPage: true,
  })
}

test.describe("capturas para a revisão cega de F09 e F10", () => {
  test("F09 e F10 em 375, 768 e 1440, tema claro", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "a matriz fixa as três larguras")
    test.setTimeout(600_000)
    const erros: string[] = []
    page.on("pageerror", (erro) => erros.push(`pageerror: ${erro.message}`))

    // A mesma referência que as rotas leem; cada passo reescreve o conteúdo.
    const estado: Estado = { ...PADRAO }
    const aplicar = (cenario: Partial<Estado>) => {
      Object.assign(estado, PADRAO, cenario)
    }
    await simularServidor(page, estado)

    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 900 })
      await page.emulateMedia({ colorScheme: TEMA })
      for (const jornada of JORNADAS) {
        for (const passo of jornada.passos) {
          aplicar(passo.cenario)
          await passo.ir(page)
          await expect(page.locator(passo.pronto)).toBeVisible()
          await expect(page.locator(SELETOR_TITULO)).toBeVisible()
          await assentar(page)
          await fotografar(page, jornada.nome, largura, passo)
        }
      }
    }

    expect(erros).toEqual([])
    await page.setViewportSize({ width: 375, height: 900 })
  })
})
