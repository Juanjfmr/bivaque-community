import { expect, test } from "@playwright/test"
import { simularVoce } from "./voce-ajuda"

// F10 / RUN-170 — a paridade que a web tinha e o app não: mudar de cidade e
// declarar Força Armada/OM (privada). Aqui a rota é simulada (mesmo contrato do
// servidor, ver voce-ajuda.ts); o banco de verdade é
// tests/e2e/f10-voce-paridade-real.spec.ts.
//
// A copy do estado de saída é a da web (`(shell)/profile/city-section.tsx:133-139`):
// "Você está saindo de <cidade>[, UF] — participa de lá até <data>. Uma nova
// mudança fica disponível depois desse prazo."

const RIO = "00000000-0000-4000-8000-000000000002"

test("declarar a mudança mostra o estado de saída e sobrevive ao recarregar", async ({ page }) => {
  await simularVoce(page)
  await page.goto("/app/voce")

  const cidade = page.locator('[data-secao="sim"]', { hasText: "Sua cidade" })
  await expect(cidade.getByText("Sua cidade é")).toContainText("Manaus")
  await expect(cidade.locator('[data-aviso="saindo"]')).toHaveCount(0)

  // O prazo abre em 30 dias, com o teto de 180 nos limites do campo.
  const prazo = cidade.getByLabel(/Até quando você participa de Manaus/)
  const valor = await prazo.inputValue()
  expect(valor).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  const sessenta = 24 * 60 * 60 * 1000
  const esperado = (dias: number) =>
    new Date(Date.now() + dias * sessenta).toISOString().slice(0, 10)
  expect(await prazo.getAttribute("min")).toBe(esperado(0))
  expect(await prazo.getAttribute("max")).toBe(esperado(180))

  const estado = cidade.getByRole("combobox", { name: "Estado" })
  await estado.click()
  await page.getByRole("option", { name: "RJ", exact: true }).click()
  const destino = cidade.getByRole("combobox", { name: "Cidade" })
  await expect(destino).toContainText("Escolha a cidade")
  await destino.click()
  await page.getByRole("option", { name: "Rio de Janeiro", exact: true }).click()

  // A confirmação é a peça única da tela: o pedido decide a copy.
  await cidade.getByRole("button", { name: "Mudar de cidade" }).click()
  const dialogo = page.getByRole("alertdialog")
  await expect(dialogo).toContainText("Mudar para Rio de Janeiro?")
  await expect(dialogo).toContainText("Não dá para desfazer pelo app.")

  const gravou = page.waitForResponse(
    (resposta) =>
      resposta.url().includes("/api/app/voce/cidade") && resposta.request().method() === "POST",
  )
  await dialogo.getByRole("button", { name: "Mudar", exact: true }).click()
  expect((await gravou).ok(), "a declaração precisa responder com sucesso").toBe(true)

  const saida = cidade.locator('[data-aviso="saindo"]')
  await expect(saida).toContainText("Você está saindo de Manaus, AM")
  await expect(saida).toContainText("participa de lá até")
  await expect(saida).toContainText("Uma nova mudança fica disponível depois desse prazo.")
  // Enquanto há saída, não existe formulário: o banco só aceita uma por vez.
  await expect(cidade.getByRole("button", { name: "Mudar de cidade" })).toHaveCount(0)
  await expect(page.locator('[data-tela="voce"]')).toContainText("Rio de Janeiro")

  // Gravação que sobrevive ao recarregamento: a tela lê do servidor.
  await page.reload()
  await expect(cidade.locator('[data-aviso="saindo"]')).toContainText("Manaus, AM")
  await expect(cidade.locator('[data-aviso="saindo"]')).toContainText("participa de lá até")

  const transbordo = await page.locator("#conteudo").evaluate((elemento) => {
    return elemento.scrollWidth - elemento.clientWidth
  })
  expect(transbordo, "a tela não pode transbordar na horizontal").toBeLessThanOrEqual(1)
})

test("pessoa já em transferência vê a linha de saída e nenhum formulário", async ({ page }) => {
  await simularVoce(page, {
    saida: { nome: "Manaus", uf: "AM", endsAt: "2026-12-05", readOnly: false },
  })
  await page.goto("/app/voce")

  const cidade = page.locator('[data-secao="sim"]', { hasText: "Sua cidade" })
  const saida = cidade.locator('[data-aviso="saindo"]')
  await expect(saida).toContainText("Você está saindo de Manaus, AM — participa de lá até")
  await expect(saida).toContainText("5 de dezembro de 2026")
  await expect(cidade.getByRole("button", { name: "Mudar de cidade" })).toHaveCount(0)
})

test("segunda mudança: a recusa do servidor aparece como mensagem, não como sucesso", async ({
  page,
}) => {
  await simularVoce(page, { respostaDaMudanca: "mudanca-em-andamento" })
  await page.goto("/app/voce")

  const cidade = page.locator('[data-secao="sim"]', { hasText: "Sua cidade" })
  await cidade.getByRole("combobox", { name: "Estado" }).click()
  await page.getByRole("option", { name: "RJ", exact: true }).click()
  await cidade.getByRole("combobox", { name: "Cidade" }).click()
  await page.getByRole("option", { name: "Rio de Janeiro", exact: true }).click()
  await cidade.getByRole("button", { name: "Mudar de cidade" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Mudar", exact: true }).click()

  await expect(cidade.getByRole("alert")).toContainText("Você já tem uma mudança em andamento")
  // A recusa não muda o estado nem some com o formulário.
  await expect(cidade.locator('[data-aviso="saindo"]')).toHaveCount(0)
  await expect(cidade.getByRole("button", { name: "Mudar de cidade" })).toBeVisible()
})

test("o link ?mudar= abre o formulário com o destino escolhido", async ({ page }) => {
  await simularVoce(page)
  await page.goto(`/app/voce?mudar=${RIO}`)

  const cidade = page.locator('[data-secao="sim"]', { hasText: "Sua cidade" })
  // O destino do endereço já vem marcado: estado e cidade preenchidos.
  const estado = cidade.getByRole("combobox", { name: "Estado" })
  await expect(estado).toContainText("RJ")
  const destino = cidade.getByRole("combobox", { name: "Cidade" })
  await expect(destino, "o destino do link precisa aparecer resolvido").toContainText(
    "Rio de Janeiro",
  )
  await cidade.getByRole("button", { name: "Mudar de cidade" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("Mudar para Rio de Janeiro?")
})

test("Força Armada e OM: gravar, sobreviver ao recarregar e apagar limpando o campo", async ({
  page,
}) => {
  await simularVoce(page)
  await page.goto("/app/voce")

  const secao = page.locator('[data-secao="sim"]', { hasText: "Força Armada e OM" })
  await expect(secao).toContainText("Opcional e privado — outras pessoas não veem.")

  const forca = secao.getByRole("combobox", { name: "Força Armada" })
  await expect(forca).toContainText("Nenhuma")
  await forca.click()
  await page.getByRole("option", { name: "Marinha", exact: true }).click()
  await secao.getByLabel("Organização Militar (OM)").fill("12º BIS")
  await secao.getByRole("button", { name: "Gravar Força e OM" }).click()
  await expect(secao.getByRole("status")).toContainText("Salvo.")

  await page.reload()
  const depois = page.locator('[data-secao="sim"]', { hasText: "Força Armada e OM" })
  await expect(depois.getByRole("combobox", { name: "Força Armada" })).toContainText("Marinha")
  await expect(depois.getByLabel("Organização Militar (OM)")).toHaveValue("12º BIS")

  // Limpar o campo é o apagar que existe (D3): "Nenhuma" e OM em branco.
  await depois.getByRole("combobox", { name: "Força Armada" }).click()
  await page.getByRole("option", { name: "Nenhuma", exact: true }).click()
  await depois.getByLabel("Organização Militar (OM)").fill("")
  await depois.getByRole("button", { name: "Gravar Força e OM" }).click()
  await expect(depois.getByRole("status")).toContainText("Salvo.")

  await page.reload()
  const limpo = page.locator('[data-secao="sim"]', { hasText: "Força Armada e OM" })
  await expect(limpo.getByRole("combobox", { name: "Força Armada" })).toContainText("Nenhuma")
  await expect(limpo.getByLabel("Organização Militar (OM)")).toHaveValue("")
})
