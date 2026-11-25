import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, type Page, test } from "@playwright/test"

/**
 * BUG-CIDADE-GRUPOS — a entrada inteira no app, do "Entrar" à Comunidade.
 *
 * A prova roda nas três larguras de tela e nos dois temas, com as rotas
 * `/api/app/entry/*` respondendo como o servidor responde (nada de banco: o
 * servidor do app é `vite`, e este spec é de interface). O que ele mede:
 *
 * - concluir a entrada marcando um grupo leva a Início, e o grupo marcado
 *   aparece na Comunidade como participação — o corpo do POST de interesses é
 *   o grupo escolhido (o contrato da rota é provado nos testes unitários);
 * - os botões "Entrar" da lista têm a MESMA largura nas quatro linhas, cujos
 *   nomes têm tamanhos bem diferentes;
 * - o fluxo inteiro e a régua dos botões se repetem no tema claro e no escuro:
 *   o texto é o mesmo, só a pintura muda.
 */

const DIRETORIO_DAS_CAPTURAS = join(process.cwd(), "..", "..", ".visual", "bugcid-001")

/** Captura de evidência: `.visual/` é ignorado pelo git. */
async function capturar(page: Page, nome: string): Promise<void> {
  mkdirSync(DIRETORIO_DAS_CAPTURAS, { recursive: true })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.screenshot({
    path: join(DIRETORIO_DAS_CAPTURAS, `${nome}.png`),
    fullPage: true,
    animations: "disabled",
  })
}

async function semRolagemHorizontal(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)
  expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth + 1)).toBe(true)
}

const ETAPA_INTERESSES = '[data-etapa="interesses"]'
const ETAPA_COMBINADO = '[data-etapa="combinado"]'
const ETAPA_AVISOS = '[data-etapa="avisos"]'

const NOME_LONGO = "Caminhada cedo no Parque do Mindu com as crianças"
const NOME_CURTO = "Pets"

const GRUPOS = [
  { id: "g-pets", nome: NOME_CURTO, descricao: "Banho, tosa e passeio." },
  { id: "g-livros", nome: "Trocas de livro", descricao: "" },
  { id: "g-corrida", nome: "Corrida às terças", descricao: "Ritmo leve." },
  { id: "g-mindu", nome: NOME_LONGO, descricao: "Saída às seis." },
] as const

const ESCOLHIDO = GRUPOS[0]

/**
 * A cidade do vínculo `current` da sessão. Não é Manaus de propósito: o defeito
 * era o chip nascer com o padrão enquanto o Início lia a cidade certa, e o spec
 * precisa distinguir as duas.
 */
const CIDADE_DA_SESSAO = "Rio de Janeiro"

type EstadoDaProva = {
  /** Os grupos que o POST de interesses recebeu. */
  escolhidos: string[]
  /** A pessoa já entrou no grupo escolhido (o que o banco grava). */
  membro: boolean
}

/** As rotas da entrada e da Comunidade, com o estado que o banco teria. */
async function simularEntrada(page: Page): Promise<EstadoDaProva> {
  const estado: EstadoDaProva = { escolhidos: [], membro: false }

  await page.route(/\/api\/app\/entry\/progress(?:\?|$)/, async (rota) => {
    if (rota.request().method() !== "GET") {
      await rota.fulfill({ json: { ok: true } })
      return
    }
    await rota.fulfill({
      json: {
        autenticado: true,
        via: "cookie",
        progresso: {
          versao: 2,
          etapa: "interesses",
          estado: {
            nome: { nome: "Ana", sobrenome: "Demo" },
            cidade: CIDADE_DA_SESSAO,
            cidadeIbge: "3304557",
            momento: "morando",
          },
        },
      },
    })
  })

  // Vínculo já confirmado e provisionado: a pessoa está no fim da entrada.
  await page.route(/\/api\/app\/entry\/verification(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: { status: "verified", membroDaCidade: true } })
  })

  await page.route(/\/api\/app\/entry\/groups(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: { autenticado: true, grupos: GRUPOS } })
  })

  await page.route(/\/api\/app\/entry\/interests(?:\?|$)/, async (rota) => {
    const corpo = rota.request().postDataJSON() as { grupos?: unknown }
    estado.escolhidos = Array.isArray(corpo.grupos)
      ? corpo.grupos.filter((id): id is string => typeof id === "string")
      : []
    estado.membro = estado.escolhidos.includes(ESCOLHIDO.id)
    await rota.fulfill({ json: { ok: true, grupos: estado.escolhidos } })
  })

  await page.route(/\/api\/app\/entry\/combinado(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: { ok: true } })
  })
  await page.route(/\/api\/app\/entry\/notices(?:\?|$)/, async (rota) => {
    await rota.fulfill({ json: { ok: true } })
  })

  // O perfil da sessão: é dele que a casca tira a cidade do chip.
  await page.route(/\/api\/app\/voce(?:\?|$)/, async (rota) => {
    await rota.fulfill({
      json: {
        perfil: {
          nome: "Ana Demo",
          bio: null,
          cidade: { id: "10000000-0000-4000-8000-000000000777", nome: CIDADE_DA_SESSAO },
          outbound: null,
          localizacao: { cep: null, definida: false },
          distanciaDisponivel: false,
        },
        contagens: { salvos: 0, anuncios: 0, perguntas: 0, grupos: 1 },
        conta: { exclusaoPendente: false },
      },
    })
  })

  // A Início lê a cidade da sessão; aqui ela vem vazia, que é o vazio honesto.
  await page.route(/\/api\/app\/inicio(?:\?|$)/, async (rota) => {
    await rota.fulfill({
      json: {
        cidade: CIDADE_DA_SESSAO,
        perguntas: [],
        eventos: [],
        anuncios: [],
        negocios: [],
        grupos: [],
        proximo: null,
      },
    })
  })
  await page.route(/\/api\/app\/perguntas(?:\?|$)/, async (rota) => {
    await rota.fulfill({
      json: { perguntas: [], cidade: CIDADE_DA_SESSAO, resolvidas: 0, proximo: null },
    })
  })

  // O diretório da Comunidade: o grupo escolhido aparece como participação.
  await page.route(/\/api\/app\/grupos(?:\?|$)/, async (rota) => {
    await rota.fulfill({
      json: {
        cidade: CIDADE_DA_SESSAO,
        proximo: null,
        grupos: GRUPOS.map((grupo) => ({
          ...grupo,
          regras: "",
          fechado: false,
          membro: grupo.id === ESCOLHIDO.id && estado.membro,
          pendente: false,
          admin: false,
          membros: 12,
          fixada: null,
        })),
      },
    })
  })

  return estado
}

type OpcoesDaCasca = { perfil: "erro" } | { perfil: "aguardando"; portao: Promise<void> }

/** Só as leituras necessárias para provar o estado inicial e a reserva da casca. */
async function simularCasca(page: Page, opcoes: OpcoesDaCasca): Promise<void> {
  await page.route(/\/api\/app\/entry\/progress(?:\?|$)/, async (rota) => {
    await rota.fulfill({
      json: {
        autenticado: true,
        via: "cookie",
        progresso: { versao: 2, etapa: "interesses", estado: {} },
      },
    })
  })

  await page.route(/\/api\/app\/voce(?:\?|$)/, async (rota) => {
    if (opcoes.perfil === "erro") {
      await rota.fulfill({ status: 500, json: { erro: "falha ao ler perfil" } })
      return
    }
    await opcoes.portao
    await rota.fulfill({
      json: {
        perfil: {
          nome: "Ana Demo",
          bio: null,
          cidade: { id: "10000000-0000-4000-8000-000000000777", nome: CIDADE_DA_SESSAO },
          outbound: null,
          localizacao: { cep: null, definida: false },
          distanciaDisponivel: false,
        },
        contagens: { salvos: 0, anuncios: 0, perguntas: 0, grupos: 0 },
        conta: { exclusaoPendente: false },
      },
    })
  })

  await page.route(/\/api\/app\/inicio(?:\?|$)/, async (rota) => {
    if (opcoes.perfil === "aguardando") await opcoes.portao
    await rota.fulfill({
      json: {
        cidade: CIDADE_DA_SESSAO,
        perguntas: [],
        eventos: [],
        anuncios: [],
        negocios: [],
        grupos: [],
        proximo: null,
      },
    })
  })
}

async function irAteOsInteresses(page: Page, tema: "claro" | "escuro"): Promise<void> {
  await page.goto("/app/entrar")
  // O escuro é o tema dormente: acende por atributo no documento (mesmo caminho
  // do spec do tema), e o atributo sobrevive à navegação do app.
  if (tema === "escuro") {
    await page.evaluate(() => {
      document.documentElement.dataset["tema"] = "escuro"
    })
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
      "dark",
    )
  }
  await expect(page.locator(ETAPA_INTERESSES)).toBeVisible()
  await expect(page.getByRole("button", { name: `Entrar em ${NOME_LONGO}` })).toBeVisible()
}

// O fluxo e a régua dos botões valem nos dois temas: o texto é o mesmo, e a
// largura não pode depender de cor.
for (const tema of ["claro", "escuro"] as const) {
  test.describe(`BUG-CIDADE-GRUPOS: entrada com grupo até a Comunidade (${tema})`, () => {
    test("conclui a entrada marcando um grupo e o vê participando na Comunidade", async ({
      page,
    }, info) => {
      const estado = await simularEntrada(page)
      await irAteOsInteresses(page, tema)
      await semRolagemHorizontal(page)
      await capturar(page, `${info.project.name}-01-interesses-${tema}`)

      await page.getByRole("button", { name: `Entrar em ${ESCOLHIDO.nome}` }).click()
      await expect(page.getByRole("button", { name: `Sair de ${ESCOLHIDO.nome}` })).toHaveAttribute(
        "aria-pressed",
        "true",
      )

      await page.getByRole("button", { name: "Continuar com 1 grupo", exact: true }).click()
      await expect(page.locator(ETAPA_COMBINADO)).toBeVisible()
      await page.getByRole("button", { name: "Entendi", exact: true }).click()

      await expect(page.locator(ETAPA_AVISOS)).toBeVisible()
      await page.getByRole("button", { name: "Agora não", exact: true }).click()

      // O fim da entrada é o Início, e o POST levou exatamente o grupo marcado.
      await expect(page.locator('[data-tela="inicio"]')).toBeVisible()
      // O chip e a Início dizem a cidade da sessão: o defeito era o chip "Manaus"
      // com a Início no Rio.
      await expect(page.locator('[data-acao="cidade"]')).toContainText(CIDADE_DA_SESSAO)
      await expect(page.locator('[data-acao="cidade"]')).not.toContainText("Manaus")
      await expect(
        page.getByRole("heading", { name: `Sua rede em ${CIDADE_DA_SESSAO}` }),
      ).toBeVisible()
      expect(estado.escolhidos).toEqual([ESCOLHIDO.id])
      expect(estado.membro).toBe(true)
      await semRolagemHorizontal(page)
      await capturar(page, `${info.project.name}-02-inicio-vazio-${tema}`)

      await page.locator('[data-nav="principal"] [data-aba="comunidade"]').click()
      await page.locator('[data-chip="grp"]').click()
      const diretorio = page.locator('[data-diretorio-grupos="sim"]')
      await expect(diretorio).toBeVisible()
      const linha = diretorio.locator("article", { hasText: ESCOLHIDO.nome })
      await expect(linha).toContainText("Participando")
    })

    test("todos os botões Entrar da lista têm a mesma largura", async ({ page }) => {
      await simularEntrada(page)
      await irAteOsInteresses(page, tema)

      const botoes = page.locator(".f01-grupo > .pc-botao")
      await expect(botoes).toHaveCount(GRUPOS.length)

      const larguras: number[] = []
      for (let indice = 0; indice < GRUPOS.length; indice += 1) {
        const caixa = await botoes.nth(indice).boundingBox()
        expect(caixa, `botão ${indice}`).not.toBeNull()
        larguras.push(caixa?.width ?? 0)
      }
      // A primeira medida é a régua; nenhuma linha pode divergir dela.
      const primeira = larguras[0] ?? 0
      expect(primeira).toBeGreaterThan(0)
      for (const [indice, largura] of larguras.entries()) {
        expect(Math.abs(largura - primeira), `botão ${indice}`).toBeLessThanOrEqual(0.5)
      }

      // Prova de que o texto não é o que define a largura: os nomes diferem muito
      // e os botões continuam iguais.
      const nomes = await page.locator(".f01-grupo .pc-linha-titulo").allTextContents()
      expect(Math.max(...nomes.map((nome) => nome.length))).toBeGreaterThan(
        Math.min(...nomes.map((nome) => nome.length)) + 10,
      )
    })
  })
}

test.describe("BUG-CIDADE-GRUPOS: cidade da casca", () => {
  test("usa a cidade da Início quando a leitura do perfil falha", async ({ page }) => {
    await simularCasca(page, { perfil: "erro" })
    await page.goto("/app/inicio")

    const chip = page.locator('[data-acao="cidade"]')
    await expect(chip).toContainText(CIDADE_DA_SESSAO)
    await expect(chip).not.toContainText("Manaus")
  })

  test("mantém o placeholder até a leitura do perfil ser concluída", async ({ page }) => {
    let liberar!: () => void
    const portao = new Promise<void>((ok) => {
      liberar = ok
    })
    await simularCasca(page, { perfil: "aguardando", portao })
    await page.goto("/app/inicio")

    const chip = page.locator('[data-acao="cidade"]')
    await expect(chip).toContainText("Sua cidade", { timeout: 15_000 })
    await expect(chip).not.toContainText("Manaus")

    liberar()
    await expect(chip).toContainText(CIDADE_DA_SESSAO)
    await expect(chip).not.toContainText("Manaus")
  })
})
