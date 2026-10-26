import { abrirGaleria, expect, test } from "./apoio"

/**
 * A galeria de prova: as 52 linhas da seção 7 do inventário, com os estados que
 * a onda 1c precisa provar e que ainda não têm tela de produto. A régua é a
 * lista abaixo, copiada do inventário.
 */

const IDS: readonly string[] = [
  "imagem-do-asset",
  "capa",
  "botao",
  "botao-de-icone",
  "selecao",
  "campo",
  "etiqueta",
  "titulo-de-secao",
  "arte-vazia",
  "estado-vazio",
  "cartao-de-foto",
  "cartao-de-negocio",
  "linha-de-pergunta",
  "linha-de-encontro",
  "sem-ponteiro-de-dom",
  "sem-escape-manual",
  "texto-normalizado",
  "icone",
  "marca",
  "moeda",
  "id-local",
  "data-iso",
  "rotulo-de-data",
  "dias-ate",
  "iniciais",
  "lista-paginada",
  "pe-de-lista",
  "fim-de-lista",
  "chips-de-filtro",
  "indicador-de-segmento",
  "sobreposicao",
  "fechar-sobreposicao",
  "guarda-de-edicao",
  "confirmacao",
  "historico-da-sobreposicao",
  "aviso",
  "selo-verificado",
  "explicacao-do-selo",
  "contagem-animada",
  "cabeca-de-pagina",
  "secao",
  "grade",
  "lista",
  "cartao-de-publicacao",
  "linha-de-ajuste",
  "faixa-de-visita",
  "fim-de-bloco",
  "chips",
  "avatar",
  "menu-de-linha",
  "acoes-do-detalhe",
  "esqueleto",
]

const GALERIA = (id: string) => `[data-galeria="${id}"]`

test.describe("a galeria de prova cobre a seção 7", () => {
  test("tem as 52 linhas do inventário, uma por vez", async ({ page }) => {
    await abrirGaleria(page)
    expect(IDS.length).toBe(52)
    await expect(page.locator("[data-galeria]")).toHaveCount(52)
    for (const id of IDS) {
      await expect(page.locator(GALERIA(id)), id).toHaveCount(1)
    }
  })

  test("a galeria não aparece na navegação nem existe sem modo de prova", async ({ page }) => {
    await abrirGaleria(page)
    await expect(page.locator('[data-nav="principal"] a[href*="galeria"]')).toHaveCount(0)
    await expect(page.locator("[data-galeria]")).not.toHaveCount(0)

    // Sem o modo de prova, o endereço é o mesmo fallback de qualquer endereço
    // fora do catálogo.
    const outra = await page.context().newPage()
    await outra.goto("/app/galeria")
    await expect(outra.locator('[data-tela="galeria"]')).toHaveCount(0)
    await expect(outra.locator('[data-tela="indisponivel"]')).toBeVisible()
    await outra.close()
  })

  test("o botão usa as variantes do protótipo e o alvo de 44 px", async ({ page }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("botao"))
    await expect(bloco.locator('[data-exemplo="botao-padrao"]')).toBeVisible()
    await expect(bloco.locator('[data-exemplo="botao-perigo"]')).toBeVisible()
    await expect(bloco.locator('[data-exemplo="botao-texto"]')).toBeVisible()
    const caixa = await bloco.locator('[data-exemplo="botao-padrao"]').boundingBox()
    expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44)
  })

  test("a etiqueta cobre os tons do protótipo", async ({ page }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("etiqueta"))
    for (const tom of ["neutro", "ok", "aviso", "patrocinado", "info"]) {
      await expect(bloco.locator(`[data-tom="${tom}"]`), tom).toBeVisible()
    }
  })

  test("o estado vazio tem arte, título, texto e ação", async ({ page }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("estado-vazio"))
    await expect(bloco.locator("svg[aria-hidden='true']")).toBeVisible()
    await expect(bloco.locator("h3")).not.toHaveText("")
    // O bloco da galeria tem três `<p>` de ficha (título, regra, consumidor):
    // o texto do componente é o que vive dentro da área do exemplo.
    await expect(bloco.locator("[data-galeria-exemplo] p")).not.toHaveText("")
    await expect(bloco.locator("[data-acao='acao-do-vazio']")).toBeVisible()
  })

  test("a lista paginada mostra 24, insere o próximo bloco e foca o item novo", async ({
    page,
  }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("lista-paginada"))
    const itens = bloco.locator("[data-item-lista]")
    await expect(itens).toHaveCount(24)
    await expect(bloco.locator('[data-contagem="mostrados"]')).toContainText("24")

    await bloco.locator('[data-acao="mostrar-mais"]').click()
    await expect(itens).toHaveCount(48)
    // O foco vai para o primeiro cartão novo: quem carregou mais não perde a vez.
    await expect(bloco.locator('[data-item-lista="item-25"]')).toBeFocused()

    await bloco.locator('[data-acao="mostrar-mais"]').click()
    await expect(itens).toHaveCount(60)
    await expect(bloco.locator('[data-acao="mostrar-mais"]')).toHaveCount(0)
    await expect(bloco.locator('[data-fim="lista"]')).toBeVisible()
  })

  test("a grade responde à largura", async ({ page }) => {
    await abrirGaleria(page)
    const grade = page.locator(`${GALERIA("grade")} [data-grade="cartoes"]`)
    const colunas = await grade.evaluate(
      (elemento) =>
        getComputedStyle(elemento)
          .gridTemplateColumns.split(" ")
          .filter((parte) => parte !== "").length,
    )
    const largura = page.viewportSize()?.width ?? 0
    const esperado = largura < 480 ? 1 : largura < 720 ? 2 : largura < 1200 ? 3 : 4
    expect(colunas).toBe(esperado)
  })

  test("a sobreposição prende o foco e devolve ao acionador", async ({ page }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("sobreposicao"))
    const acionador = bloco.locator('[data-acao="abrir-exemplo"]')
    await acionador.click()

    const painel = page.locator('[data-sobreposicao="dialogo"]')
    await expect(painel).toBeVisible()
    // Tab não escapa do painel.
    for (let volta = 0; volta < 6; volta += 1) {
      await page.keyboard.press("Tab")
      const dentro = await page.evaluate(
        () => document.activeElement?.closest("[data-sobreposicao]") !== null,
      )
      expect(dentro, `volta ${volta}`).toBe(true)
    }
    await page.keyboard.press("Escape")
    await expect(painel).toHaveCount(0)
    await expect(acionador).toBeFocused()
  })

  test("a confirmação tem Continuar e Confirmar, e o perigo é marcado", async ({ page }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("confirmacao"))
    await bloco.locator('[data-acao="abrir-exemplo"]').click()
    const dialogo = page.locator('[data-sobreposicao="confirmacao"]')
    await expect(dialogo).toContainText("Descartar alterações?")
    await expect(dialogo.locator('[data-acao="cancelar"]')).toHaveText("Continuar")
    await expect(dialogo.locator('[data-acao="confirmar"]')).toHaveText("Confirmar")
    await dialogo.locator('[data-acao="cancelar"]').click()
    await expect(dialogo).toHaveCount(0)
  })

  test("o aviso empilha dois, mostra o desfazer e a barra de tempo", async ({ page }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("aviso"))
    await bloco.locator('[data-acao="exemplo-aviso-com-desfazer"]').click()
    const atual = page.locator('[data-aviso="atual"]')
    await expect(atual).toHaveAttribute("role", "status")
    await expect(atual).toHaveAttribute("aria-live", "polite")
    await expect(atual.locator("[data-aviso-tempo]")).toBeVisible()
    await expect(atual.locator('[data-acao="desfazer"]')).toBeVisible()

    // O aviso com desfazer sobe para a pilha, com o próprio desfazer.
    await bloco.locator('[data-acao="exemplo-aviso"]').click()
    await expect(page.locator('[data-aviso="pilha"]')).toHaveAttribute("aria-live", "off")
    await expect(page.locator('[data-aviso="pilha"] [data-acao="desfazer"]')).toHaveCount(1)
    await expect(page.locator('[data-aviso="pilha"] [data-aviso="empilhado"]')).toHaveCount(1)
  })

  test("o selo verificado explica o que significa", async ({ page }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("selo-verificado"))
    await bloco.locator('[data-acao="verificado-info"]').click()
    const dialogo = page.locator('[data-sobreposicao="selo"]')
    await expect(dialogo).toContainText("verificado")
    // Quatro linhas de explicação; o rodapé ("simulada") tem marca própria.
    await expect(dialogo.locator('[data-linha-do-selo="sim"]')).toHaveCount(4)
    await dialogo.locator('[data-acao="fechar-sobreposicao"]').click()
    await expect(dialogo).toHaveCount(0)
  })

  test("o menu da linha abre pelo mesmo mecanismo de sobreposição", async ({ page }) => {
    await abrirGaleria(page)
    await page.locator(`${GALERIA("menu-de-linha")} [data-acao="opcoes"]`).click()
    await expect(page.getByRole("menu", { name: "Opções da publicação" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Ação de exemplo" })).toBeVisible()

    // O Voltar do sistema fecha o menu antes de trocar de rota.
    await page.goBack()
    await expect(page.locator('[data-sobreposicao="menu-de-linha"]')).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe("/app/galeria")
  })

  test("o cartão de publicação cobre os quatro tipos", async ({ page }) => {
    await abrirGaleria(page)
    const bloco = page.locator(GALERIA("cartao-de-publicacao"))
    for (const tipo of ["pergunta", "evento", "enquete", "oferta"]) {
      await expect(bloco.locator(`[data-tipo="${tipo}"]`), tipo).toBeVisible()
    }
  })

  test("o tempo de espera da lista e da foto aparece", async ({ page }) => {
    await abrirGaleria(page)
    await expect(page.locator(`${GALERIA("esqueleto")} [data-esqueleto="lista"]`)).toBeVisible()
    await expect(page.locator(`${GALERIA("esqueleto")} [data-esqueleto="imagem"]`)).toBeVisible()
  })
})
