import { expect, test } from "@playwright/test"

// Regressões V13–V15 da auditoria visual de 26/10/2026.
// Testes executados pelos projetos 375, 768 e 1440 do app.
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
  await faixa.locator('[data-chip="events"]').click()
  await expect(faixa.locator('[data-chip="events"]')).toHaveAttribute("data-estado", "on")
  await expect.poll(coincideComSelecionado).toBe(true)
})

test("V14: perguntas mostram o título completo sem truncar no celular", async ({ page }) => {
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

test("V15: o botão preenchido usa a Brasa oficial em claro e escuro", async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __BIVAQUE_MODO_DE_PROVA__?: boolean }).__BIVAQUE_MODO_DE_PROVA__ = true
  })
  await page.goto("/app/galeria")
  await expect(page.locator('[data-tela="galeria"]')).toBeVisible()
  const botao = page.locator('[data-galeria="botao"] [data-exemplo="botao-padrao"]')
  await expect(botao).toHaveAttribute("data-variant", "brasa")
  const cores = await botao.evaluate((elemento) => {
    const amostra = document.createElement("span")
    amostra.style.backgroundColor = "var(--brasa)"
    document.body.appendChild(amostra)
    const esperado = getComputedStyle(amostra).backgroundColor
    amostra.remove()
    return { aplicado: getComputedStyle(elemento).backgroundColor, esperado }
  })
  expect(cores.aplicado).toBe(cores.esperado)
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
