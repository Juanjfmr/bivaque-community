import {
  abaAtiva,
  abrir,
  esperarCaminho,
  esperarNaPerguntaDificil,
  expect,
  subAbaAtiva,
  test,
} from "./apoio"

const SELETOR_ABRIR_PERGUNTA = '[data-acao="abrir-pergunta"][data-valor="pergunta-dificil"]'

const ABAS_FIXAS: ReadonlyArray<readonly [url: string, aba: string]> = [
  ["/app/inicio", "inicio"],
  ["/app/mercado", "mercado"],
  ["/app/comunidade", "comunidade"],
  ["/app/voce", "voce"],
  ["/app/catalogo", "mercado"],
  ["/app/desapegos", "mercado"],
  ["/app/imoveis", "mercado"],
  ["/app/negocios", "mercado"],
  ["/app/anuncio/a-1", "mercado"],
  ["/app/negocio/n-1", "mercado"],
  ["/app/pergunta/q-1", "comunidade"],
  ["/app/grupo/g-1", "comunidade"],
  ["/app/publicacao/g-1~p-1", "comunidade"],
  ["/app/minhas", "comunidade"],
  ["/app/pedidos", "voce"],
  ["/app/privacidade", "voce"],
  ["/app/conduta", "voce"],
  ["/app/ocultados", "voce"],
  ["/app/bloqueados", "voce"],
  ["/app/ajuda", "voce"],
  ["/app/contato", "voce"],
  ["/app/chamados", "voce"],
  ["/app/apagar-conta", "voce"],
]

// As telas com mais de uma porta: a origem é da entrada, não do app.
const PORTAS: ReadonlyArray<{
  readonly rotulo: string
  readonly abrirPor: string
  readonly primeiraOrigem: string
  readonly ondeComecar: string
  readonly caminho: string
}> = [
  {
    rotulo: "Salvos",
    abrirPor: '[data-acao="abrir-salvos"][data-valor="prova"]',
    primeiraOrigem: "comunidade",
    ondeComecar: "/app/comunidade",
    caminho: "/app/salvos",
  },
  {
    rotulo: "Meus anúncios",
    abrirPor: '[data-acao="abrir-meus-anuncios"][data-valor="prova"]',
    primeiraOrigem: "voce",
    ondeComecar: "/app/voce",
    caminho: "/app/meus-anuncios",
  },
  {
    rotulo: "busca",
    abrirPor: '[data-acao="abrir-busca"][data-valor="prova"]',
    primeiraOrigem: "comunidade",
    ondeComecar: "/app/comunidade",
    caminho: "/app/busca",
  },
  {
    // Destino de notificação: mesma URL em duas entradas, origens diferentes.
    rotulo: "destino de aviso",
    abrirPor: '[data-acao="abrir-aviso"][data-valor="prova"]',
    primeiraOrigem: "comunidade",
    ondeComecar: "/app/comunidade",
    caminho: "/app/evento/e-aviso",
  },
]

test.describe("aba ativa", () => {
  for (const [url, aba] of ABAS_FIXAS) {
    test(`${url} acende uma única aba, a de ${aba}`, async ({ page }) => {
      await abrir(page, url)
      await expect(abaAtiva(page)).toHaveCount(1)
      await expect(abaAtiva(page)).toHaveAttribute("data-aba", aba)
    })
  }

  test("Conversas e conversa acendem só o ícone do topo", async ({ page }) => {
    for (const url of ["/app/conversas", "/app/conversa/c-1"]) {
      await abrir(page, url)
      await expect(page.locator('[data-nav="principal"] [aria-current="page"]'), url).toHaveCount(0)
      await expect(page.locator('[data-acao="conversas-topo"]'), url).toBeVisible()
      await expect(
        page.locator('[data-nav="principal"] [data-acao="conversas-topo"]'),
        url,
      ).toHaveCount(0)
    }
  })

  test("o ícone de conversas no topo fica fora da barra principal", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await expect(page.locator('[data-acao="conversas-topo"]')).toBeVisible()
    await expect(page.locator('[data-nav="principal"]')).not.toContainText("Conversas")
  })

  test("destino de aviso acende a aba de origem", async ({ page }) => {
    await abrir(page, "/app/voce")
    await page.locator('[data-acao="abrir-aviso"][data-valor="prova"]').click()
    await esperarCaminho(page, "/app/evento/e-aviso")
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "voce")
  })

  test("dono fixo não é sobrescrito pela origem", async ({ page }) => {
    await abrir(page, "/app/desapegos")
    await page.locator(SELETOR_ABRIR_PERGUNTA).click()
    await esperarNaPerguntaDificil(page)
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "comunidade")

    // Anúncio e negócio têm dono fixo Mercado, mesmo vindos de outra aba.
    await abrir(page, "/app/comunidade")
    await page.locator('[data-acao="abrir-anuncio"][data-valor="prova"]').click()
    await esperarCaminho(page, "/app/anuncio/a-de-prova")
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "mercado")

    await abrir(page, "/app/voce")
    await page.locator('[data-acao="abrir-negocio"][data-valor="prova"]').click()
    await esperarCaminho(page, "/app/negocio/n-de-prova")
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "mercado")

    await abrir(page, "/app/desapegos")
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "mercado")
  })

  test("Mercado troca de sub-aba sem perder a aba", async ({ page }) => {
    await abrir(page, "/app/desapegos")
    await expect(subAbaAtiva(page)).toHaveAttribute("data-subaba", "desapegos")

    await page.locator('[data-subaba="imoveis"]').click()
    await esperarCaminho(page, "/app/imoveis")
    await expect(subAbaAtiva(page)).toHaveAttribute("data-subaba", "imoveis")
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "mercado")

    await page.locator('[data-subaba="negocios"]').click()
    await esperarCaminho(page, "/app/negocios")
    await expect(subAbaAtiva(page)).toHaveAttribute("data-subaba", "negocios")
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "mercado")
  })

  for (const porta of PORTAS) {
    // A mesma URL em DUAS entradas, com origens diferentes, sem `goto` no meio.
    // Um singleton de origem compartilhado entre entradas falha aqui.
    test(`${porta.rotulo}: a mesma URL guarda a origem de cada entrada`, async ({ page }) => {
      await abrir(page, porta.ondeComecar)
      await page.locator(porta.abrirPor).click()
      await esperarCaminho(page, porta.caminho)
      await expect(abaAtiva(page)).toHaveAttribute("data-aba", porta.primeiraOrigem)

      await page.locator('[data-aba="mercado"]').click()
      await esperarCaminho(page, "/app/mercado")
      await page.locator(porta.abrirPor).click()
      await esperarCaminho(page, porta.caminho)
      await expect(abaAtiva(page)).toHaveAttribute("data-aba", "mercado")

      await page.goBack()
      await esperarCaminho(page, "/app/mercado")
      await page.goBack()
      await esperarCaminho(page, porta.caminho)
      await expect(abaAtiva(page)).toHaveAttribute("data-aba", porta.primeiraOrigem)

      await page.goForward()
      await esperarCaminho(page, "/app/mercado")
      await page.goForward()
      await esperarCaminho(page, porta.caminho)
      await expect(abaAtiva(page)).toHaveAttribute("data-aba", "mercado")
    })
  }
})
