import {
  abaAtiva,
  abrir,
  caminhoAtual,
  esperarCaminho,
  expect,
  SELETOR_TITULO,
  test,
  tituloDaTela,
} from "./apoio"

// Um endereço literal por rota do inventário (seção 1). O parâmetro entra com
// valor real; o molde com `$id` nunca é visitado.
const ROTAS_COM_CASCA: ReadonlyArray<readonly [url: string, titulo: string | RegExp]> = [
  ["/app/inicio", "Bivaque"],
  ["/app/comunidade", "Comunidade"],
  ["/app/conversas", "Conversas"],
  ["/app/conversa/c-1", "Conversa"],
  ["/app/voce", "Você"],
  ["/app/busca", "Buscar"],
  ["/app/catalogo", "Desapegos"],
  ["/app/desapegos", "Desapegos"],
  ["/app/imoveis", "Imóveis"],
  ["/app/negocios", "Negócios locais"],
  ["/app/anuncio/a-1", "Anúncio"],
  ["/app/negocio/n-1", "Negócio local"],
  ["/app/pergunta/q-1", "Indicação"],
  ["/app/grupo/g-1", "Grupo"],
  ["/app/publicacao/g-1~p-1", "Publicação"],
  ["/app/evento/e-1", "Encontro"],
  ["/app/agenda", "Agenda da cidade"],
  ["/app/salvos", "Salvos"],
  ["/app/meus-anuncios", "Meus anúncios"],
  ["/app/minhas", "Minhas indicações"],
  // Título é `Guia de {cidade}` — a cidade é dado, e o nome pode ter espaço.
  ["/app/guia", /^Guia de .+$/],
  ["/app/pedidos", "Pedidos de serviço"],
  ["/app/pedido/p-1", "Pedido de serviço"],
  ["/app/privacidade", "Política de privacidade"],
  ["/app/conduta", "Código de conduta"],
  ["/app/ocultados", "Ocultados"],
  ["/app/bloqueados", "Pessoas bloqueadas"],
  ["/app/ajuda", "Ajuda"],
  ["/app/ajuda/apagar-conta", "Ajuda"],
  ["/app/contato", "Fale com a gente"],
  ["/app/chamados", "Meus chamados"],
  ["/app/apagar-conta", "Apagar a conta"],
]

// Entrada e painel do dono trocam a casca: sem barra de navegação do app.
const ROTAS_SEM_CASCA: ReadonlyArray<readonly [url: string, titulo: string]> = [
  ["/app/entrar", "Bivaque"],
  ["/app/entrar/conta", "Bivaque"],
  ["/app/dono", "Painel do Bivaque"],
]

// A rota de prova do detalhe carrega parâmetro com Unicode, espaço e separador.
const PARAMETRO_DIFICIL = "mudança de cidade/2026 ?!"

test.describe("rotas reais em /app", () => {
  for (const [url, titulo] of ROTAS_COM_CASCA) {
    test(`${url} abre com endereço, título e navegação`, async ({ page }) => {
      await abrir(page, url)
      expect(await caminhoAtual(page)).toBe(url)
      await expect(tituloDaTela(page)).toHaveText(titulo)
      await expect(page.locator('[data-nav="principal"]')).toHaveCount(1)
    })
  }

  for (const [url, titulo] of ROTAS_SEM_CASCA) {
    test(`${url} abre sem a navegação principal`, async ({ page }) => {
      await abrir(page, url)
      expect(await caminhoAtual(page)).toBe(url)
      await expect(tituloDaTela(page)).toHaveText(titulo)
      await expect(page.locator('[data-nav="principal"]')).toHaveCount(0)
    })
  }

  test("/app/ leva ao início", async ({ page }) => {
    // Endereço da raiz da base, com barra: Início com casca, aba, foco e URL.
    await page.goto("/app/")
    expect(new URL(page.url()).pathname).toBe("/app/")
    await expect(tituloDaTela(page)).toHaveText("Bivaque")
    await expect(page.locator('[data-casca="app"]')).toHaveCount(1)
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "inicio")
    await expect(tituloDaTela(page)).toBeFocused()
  })

  test("/app sem barra abre o Início num endereço válido do app", async ({ page }) => {
    // O endereço sem barra é o que o ADR §8 publica. Ele não pode cair na
    // sugestão do Vite ("did you mean /app/"), que não é um endereço do app:
    // o resultado é o mesmo Início, de barra ou sem barra.
    await page.goto("/app")
    const conteudo = await page.content()
    expect(conteudo).not.toContain("did you mean")
    const caminho = new URL(page.url()).pathname
    expect(caminho === "/app" || caminho === "/app/").toBe(true)
    await expect(tituloDaTela(page)).toHaveText("Bivaque")
    await expect(page.locator('[data-casca="app"]')).toHaveCount(1)
    await expect(abaAtiva(page)).toHaveAttribute("data-aba", "inicio")
    await expect(tituloDaTela(page)).toBeFocused()
  })

  test("tópico de Ajuda em branco cai na forma sem tópico", async ({ page }) => {
    // Ajuda tem as duas formas: tópico em branco não é erro, é a lista.
    await page.goto("/app/ajuda/%20")
    await expect(tituloDaTela(page)).toHaveText("Ajuda")
    await esperarCaminho(page, "/app/ajuda")
  })

  test("Mercado é rota adicional e mostra as sub-abas", async ({ page }) => {
    await abrir(page, "/app/mercado")
    expect(await caminhoAtual(page)).toBe("/app/mercado")
    await expect(tituloDaTela(page)).toHaveText("Mercado")
    await expect(page.locator('[data-subabas="mercado"]')).toHaveCount(1)
    await expect(page.locator('[data-subabas="mercado"] [aria-current="page"]')).toHaveAttribute(
      "data-subaba",
      "desapegos",
    )
  })

  test("URL fora do catálogo tem fallback visível e volta ao início", async ({ page }) => {
    await abrir(page, "/app/rota-que-nao-existe")
    await expect(page.locator('[data-tela="indisponivel"]')).toBeVisible()
    await expect(tituloDaTela(page)).toHaveText("Página indisponível")
    await page.locator('[data-acao="ir-para-inicio"]').click()
    await esperarCaminho(page, "/app/inicio")
  })

  test("ID obrigatório ausente tem fallback visível em vez de tela vazia", async ({ page }) => {
    for (const caminho of [
      "/app/conversa",
      "/app/pergunta",
      "/app/anuncio",
      "/app/entrar/nao-existe",
    ]) {
      await abrir(page, caminho)
      await expect(page.locator('[data-tela="indisponivel"]'), caminho).toBeVisible()
      await expect(tituloDaTela(page), caminho).toHaveText("Página indisponível")
    }
  })

  test("parâmetro Unicode e espaço codifica e recarrega", async ({ page }) => {
    const codificado = encodeURIComponent(PARAMETRO_DIFICIL)
    await abrir(page, `/app/pergunta/${codificado}`)

    expect(await caminhoAtual(page)).toBe(`/app/pergunta/${codificado}`)
    expect(page.url()).not.toContain(" ")
    expect(new URL(page.url()).search).toBe("")
    await expect(tituloDaTela(page)).toHaveText("Indicação")

    await page.reload()
    await expect(page.locator(SELETOR_TITULO)).toBeVisible()
    expect(await caminhoAtual(page)).toBe(`/app/pergunta/${codificado}`)
    await expect(tituloDaTela(page)).toHaveText("Indicação")
  })

  test("o valor do parâmetro não é confundido com a rota", async ({ page }) => {
    await abrir(page, "/app/conversa/voce")
    expect(await caminhoAtual(page)).toBe("/app/conversa/voce")
    await expect(tituloDaTela(page)).toHaveText("Conversa")
    await expect(page.locator('[data-nav="principal"] [aria-current="page"]')).toHaveCount(0)
  })
})
