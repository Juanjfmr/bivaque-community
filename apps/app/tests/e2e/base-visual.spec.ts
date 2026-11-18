import { expect, test } from "@playwright/test"
import { simularConversas } from "./conversas-ajuda"
import { simularInicio } from "./inicio-ajuda"
import { simularPerguntas } from "./perguntas-ajuda"

// Regressões V13–V17 da auditoria visual de 26/10/2026 e da revisão de 18/11.
// Testes executados pelos projetos 375, 768 e 1440 do app.
test.beforeEach(async ({ page }) => {
  await simularInicio(page)
})

test("V13: filtros continuam em uma faixa sem selecionar duas linhas", async ({ page }) => {
  await page.goto("/app/busca")
  await expect(page.locator('[data-tela="busca"]')).toBeVisible()
  const faixa = page.locator('[data-tela="busca"] [data-segmento="sim"]')
  const chips = faixa.locator("[data-chip]")
  await expect(chips).toHaveCount(6)

  // Todos os chips pertencem à mesma linha, independentemente do viewport.
  const linhas = await chips.evaluateAll((elementos) =>
    elementos.map((elemento) => Math.round(elemento.getBoundingClientRect().top)),
  )
  expect(new Set(linhas).size).toBe(1)

  if ((page.viewportSize()?.width ?? 0) <= 375) {
    expect(await faixa.evaluate((elemento) => elemento.scrollWidth > elemento.clientWidth)).toBe(
      true,
    )
  }

  const indicador = faixa.locator('[data-indicador="segmento"]')
  const coincideComSelecionado = async () =>
    indicador.evaluate((elemento) => {
      const selecionado = elemento.parentElement?.querySelector<HTMLElement>('[data-estado="on"]')
      if (!selecionado) return false
      const atual = elemento.getBoundingClientRect()
      const alvo = selecionado.getBoundingClientRect()
      return Math.abs(atual.left - alvo.left) <= 2 && Math.abs(atual.height - alvo.height) <= 2
    })

  await expect.poll(coincideComSelecionado).toBe(true)
  await faixa.locator('[data-chip="negocios"]').click()
  await expect(faixa.locator('[data-chip="negocios"]')).toHaveAttribute("data-estado", "on")
  await expect.poll(coincideComSelecionado).toBe(true)
})

test("V14: perguntas mostram o título completo sem truncar no celular", async ({ page }) => {
  await simularPerguntas(page)
  await page.goto("/app/comunidade")
  await expect(page.locator('[data-tela="comunidade"]')).toBeVisible()
  const titulo = page.locator('[data-tela="comunidade"] [data-titulo-linha]').first()
  await expect(titulo).toBeVisible()
  await expect(titulo).not.toBeEmpty()

  const geometria = await titulo.evaluate((elemento) => ({
    quebra: getComputedStyle(elemento).whiteSpace,
    semCorteHorizontal: elemento.scrollWidth <= elemento.clientWidth + 1,
    semCorteVertical: elemento.scrollHeight <= elemento.clientHeight + 1,
  }))
  expect(geometria.quebra).toBe("normal")
  expect(geometria.semCorteHorizontal).toBe(true)
  expect(geometria.semCorteVertical).toBe(true)
})

test("V15: o botão preenchido usa a ardósia de concluir", async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __BIVAQUE_MODO_DE_PROVA__?: boolean }).__BIVAQUE_MODO_DE_PROVA__ = true
  })
  await page.goto("/app/galeria")
  await expect(page.locator('[data-tela="galeria"]')).toBeVisible()
  const botao = page.locator('[data-galeria="botao"] [data-exemplo="botao-padrao"]')
  // ADR-20261118-brasa-so-no-criar: concluir é ardósia; a Brasa ficou no FAB e
  // no Criar da barra. `tests/brasa-so-no-criar.test.ts` guarda a regra na fonte.
  await expect(botao).toHaveAttribute("data-variant", "default")
  const cores = await botao.evaluate((elemento) => {
    const amostra = document.createElement("span")
    amostra.style.backgroundColor = "var(--acao)"
    document.body.appendChild(amostra)
    const esperado = getComputedStyle(amostra).backgroundColor
    amostra.remove()
    return { aplicado: getComputedStyle(elemento).backgroundColor, esperado }
  })
  expect(cores.aplicado).toBe(cores.esperado)
})

test("V16: o perfil aberto pelo caminho interno não acende aba nenhuma", async ({ page }) => {
  await simularConversas(page)
  await page.goto("/app/conversa/t1")
  await expect(page.locator('[data-mensagens="historico"]')).toBeVisible()

  // O nome do cabeçalho abre o perfil de quem conversa: caminho interno, com
  // origem "inicio" na entrada. O perfil é "sem aba" no catálogo (chega-se por
  // um nome, de qualquer jornada) — a navegação não marca o Início (critério 6
  // e achado 6 da revisão de código).
  await page.locator('[data-cabeca="conversa"] [data-acao="abrir-perfil"]').click()
  await expect(page).toHaveURL(/\/app\/perfil\/u-paulo$/)
  await expect(page.locator('[data-nav="principal"]')).toBeAttached()
  await expect(page.locator('[data-nav="principal"] [aria-current="page"]')).toHaveCount(0)
})

test("V17: o título da tela aparece uma vez só — na barra ou no corpo", async ({ page }) => {
  await page.goto("/app/avisos")
  const h1 = page.locator('[data-cabeca="pagina"] h1')
  await expect(h1).toBeVisible()
  const tituloDaBarra = page.locator('[data-topo="barra"] [data-titulo="topo"]')
  const largura = page.viewportSize()?.width ?? 0

  if (largura < 1024) {
    // No celular o título mora no corpo; a barra só o diz quando ele sobe.
    await expect(tituloDaBarra).toHaveCSS("opacity", "0")
    expect(await h1.evaluate((elemento) => elemento.getBoundingClientRect().width)).toBeGreaterThan(
      100,
    )
  } else {
    // No computador a barra diz o nome da tela; o corpo não repete (o h1 sai
    // da pintura e segue no DOM como alvo do foco).
    await expect(tituloDaBarra).toBeVisible()
    expect(await h1.evaluate((elemento) => elemento.getBoundingClientRect().width)).toBeLessThan(2)
  }
})

test("shadcn Dialog: trocar cidade mantém overlay único e fecha com foco devolvido", async ({
  page,
}) => {
  await page.goto("/app/inicio")
  await expect(page.locator('[data-tela="inicio"] [data-cartao]').first()).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  const cidade = page.locator('[data-topo="barra"] [data-acao="cidade"]')
  await cidade.click()
  const dialogo = page.getByRole("dialog", { name: "Trocar de cidade", exact: true })
  await expect(dialogo).toBeVisible()
  await expect(dialogo).toHaveAttribute("data-slot", "dialog-content")
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(1)
  await dialogo.getByRole("button", { name: "Fechar", exact: true }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(cidade).toBeFocused()
})
