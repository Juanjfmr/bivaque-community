import {
  abrir,
  aguardarQuadros,
  conteudo,
  esperarCaminho,
  esperarContagem,
  esperarNaPerguntaDificil,
  esperarRolagem,
  expect,
  rolagemReal,
  rolarAte,
  SELETOR_ABRIR_PERGUNTA,
  SELETOR_CONTEUDO,
  seletorDoItem,
  test,
  tituloDaTela,
  voltarNoNavegador,
} from "./apoio"

const LISTA = '[data-lista="prova"]'
const SEGURAR = '[data-acao="segurar-proxima-carga"][data-valor="prova"]'
const LIBERAR = '[data-acao="liberar-lista"]'
const SEM_ALVO = '[data-acao="abrir-sem-alvo"][data-valor="prova"]'

test.describe("rolagem e foco por entrada", () => {
  test("relê a rolagem ao recarregar a entrada, sem perder o foco", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await rolarAte(page, 640)

    // O título fica fora da viewport nessa posição: focar sem cuidado traria a
    // tela de volta ao topo e destruiria a rolagem restaurada.
    await page.reload()
    await esperarRolagem(page, 640)
    await expect(tituloDaTela(page)).toBeFocused()
  })

  test("Voltar devolve rolagem e foco da lista; Avançar restaura a mesma entrada", async ({
    page,
  }) => {
    await abrir(page, "/app/inicio")
    await rolarAte(page, 500)
    const antes = await rolagemReal(page)
    expect(antes).toBe(500)

    await page.locator(seletorDoItem("item-13")).click()
    await esperarCaminho(page, "/app/pergunta/item-13")

    await voltarNoNavegador(page, "/app/inicio")
    await esperarRolagem(page, antes)
    await expect(page.locator(seletorDoItem("item-13"))).toBeFocused()

    await page.goForward()
    await esperarCaminho(page, "/app/pergunta/item-13")
    await expect(tituloDaTela(page)).toHaveText("Indicação")

    await voltarNoNavegador(page, "/app/inicio")
    await esperarRolagem(page, antes)
    await expect(page.locator(seletorDoItem("item-13"))).toBeFocused()
  })

  test("Avançar restaura rolagem e foco guardados no detalhe", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await page.locator(seletorDoItem("item-13")).click()
    await esperarCaminho(page, "/app/pergunta/item-13")

    // Usa um controle visível numa posição não zero. Um clique fora da viewport
    // rola antes de sair: o esperado é a posição da saída, não a anterior ao clique.
    const sair = page.locator(seletorDoItem("item-20"))
    await sair.scrollIntoViewIfNeeded()
    await aguardarQuadros(page)
    const posicao = await rolagemReal(page)
    expect(posicao).toBeGreaterThan(0)
    await sair.click()
    await esperarCaminho(page, "/app/pergunta/item-20")

    await voltarNoNavegador(page, "/app/pergunta/item-13")
    await esperarRolagem(page, posicao)
    await expect(sair).toBeFocused()

    await voltarNoNavegador(page, "/app/inicio")
    expect(await rolagemReal(page)).toBeGreaterThanOrEqual(0)

    await page.goForward()
    await esperarCaminho(page, "/app/pergunta/item-13")
    await esperarRolagem(page, posicao)
    await expect(sair).toBeFocused()

    await page.goForward()
    await esperarCaminho(page, "/app/pergunta/item-20")
  })

  test("alvo ausente cai no título da tela depois da carga, sem perder a rolagem", async ({
    page,
  }) => {
    await abrir(page, "/app/inicio")
    await rolarAte(page, 640)
    await page.locator(SEM_ALVO).click()
    await esperarCaminho(page, "/app/pergunta/q-sem-alvo")

    // Volta com o alvo do foco ausente: o título assume, e ele está fora da
    // viewport na posição restaurada — as duas coisas precisam valer juntas.
    await voltarNoNavegador(page, "/app/inicio")
    await esperarRolagem(page, 640)
    await expect(tituloDaTela(page)).toBeFocused()
    await expect(page.locator(SEM_ALVO)).not.toBeFocused()
  })

  test("rolagem e foco esperam a carga, que a prova libera quando quiser", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await rolarAte(page, 640)

    // Marca a carga pendente só para a PRÓXIMA abertura: a tela da frente não
    // encolhe nem muda de posição.
    await page.locator(SEGURAR).click()
    await expect(page.locator(SEGURAR)).toHaveAttribute("aria-pressed", "true")
    const antesDaSaida = await rolagemReal(page)
    expect(antesDaSaida).toBe(640)

    await page.locator(SELETOR_ABRIR_PERGUNTA).click()
    await esperarNaPerguntaDificil(page)
    await expect(tituloDaTela(page)).toHaveText("Indicação")

    await page.goBack()
    await esperarCaminho(page, "/app/inicio")

    // A carga está pendente: nada de lista, nada de rolagem, nada de foco.
    await esperarContagem(page.locator(LISTA), 0)
    expect(await rolagemReal(page)).toBe(0)
    await expect(tituloDaTela(page)).not.toBeFocused()

    await page.locator(LIBERAR).click()
    await expect.poll(async () => await page.locator(LISTA).count()).toBe(1)
    await esperarRolagem(page, antesDaSaida)
    await expect(page.locator(SELETOR_ABRIR_PERGUNTA)).toBeFocused()
  })

  test("re-render sem navegação não reinicia a restauração", async ({ page }) => {
    await abrir(page, "/app/pergunta/q-direto")
    await expect(tituloDaTela(page)).toBeFocused()

    await rolarAte(page, 200)
    // Clicar no controle de prova re-renderiza o app sem trocar de entrada: a
    // identidade da entrada é a mesma, então nada de restauração de novo.
    await page.locator(LIBERAR).click()
    await expect(page.locator(LIBERAR)).toBeFocused()
    await expect(tituloDaTela(page)).not.toBeFocused()
    expect(new URL(page.url()).pathname).toBe("/app/pergunta/q-direto")
    await aguardarQuadros(page)
    expect(await rolagemReal(page)).toBe(200)
  })

  test("sair da rota cancela a restauração pendente", async ({ page }) => {
    await abrir(page, "/app/inicio")
    await rolarAte(page, 640)
    await page.locator(SEGURAR).click()

    // Recarrega com a carga pendente: a restauração começa e fica esperando.
    await page.reload()
    await esperarContagem(page.locator(LISTA), 0)
    expect(await rolagemReal(page)).toBe(0)

    await page.locator('[data-aba="voce"]').click()
    await esperarCaminho(page, "/app/voce")
    await expect.poll(async () => await page.locator(LISTA).count()).toBe(1)

    // Na tela nova a rolagem de 640 seria alcançável: o 0 abaixo é decisão, não
    // limite do conteúdo.
    const alturaDisponivel = await conteudo(page).evaluate(
      (elemento) => elemento.scrollHeight - elemento.clientHeight,
    )
    expect(alturaDisponivel).toBeGreaterThan(640)

    // A resposta da carga antiga chega agora, e a restauração antiga foi
    // abortada ao sair: não pode mexer na rolagem nem no foco da tela nova.
    await expect(tituloDaTela(page)).toBeFocused()
    await page.locator(LIBERAR).click()
    expect(await rolagemReal(page)).toBe(0)
    // O foco continua onde a pessoa clicou: a restauração antiga não o roubou.
    await expect(page.locator(LIBERAR)).toBeFocused()

    // Nenhuma continuação atrasada mexeu depois disso.
    await expect(page.locator(SELETOR_CONTEUDO)).toBeVisible()
    expect(await rolagemReal(page)).toBe(0)
    await expect(page.locator(LIBERAR)).toBeFocused()
  })
})
