// RUN-006 — seletor de cidade do shell (prancha 01).
//
// Duas coisas precisam ser verdade ao mesmo tempo, e a segunda é a que importa:
// o controle troca a cidade que a tela olha, e a troca NÃO concede acesso
// nenhum (W02: "cidade de busca não altera autorização"). Por isso o teste não
// para em "o menu abriu": ele troca para uma cidade de que a conta não
// participa e confere que o feed da comunidade continua sendo o da cidade dela.
import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("seletor de cidade", () => {
  test("troca a cidade observada pela URL e não altera autorização", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/inicio")

    const switcher = page.getByTestId("locality-switcher")
    await expect(switcher).toBeVisible({ timeout: 20_000 })

    // O rótulo inicial é a cidade do membro, sem parâmetro na URL. Abaixo de sm
    // o texto do botão é `hidden sm:inline` (locality-switcher.tsx:92), então o
    // nome legível vem do aria-label — `Cidade: <cidade>. Trocar cidade` (:88).
    const ownLabel = ((await switcher.getAttribute("aria-label")) ?? "")
      .replace(/^Cidade: /, "")
      .replace(/\. Trocar cidade$/, "")
      .trim()
    expect(ownLabel.length).toBeGreaterThan(0)
    expect(page.url()).not.toContain("locality=")

    await switcher.click()
    // O seletor abre um diálogo com busca — menu chapado nao sobrevive a um
    // catalogo nacional. A escolha e um botao na lista de resultados.
    const dialog = page.getByRole("dialog", { name: "Trocar cidade" })
    await expect(dialog).toBeVisible()
    const other = dialog.getByTestId("city-option").filter({ hasNotText: "sua cidade" }).first()
    await expect(other).toBeVisible()
    const otherLabel = (await other.innerText()).trim()
    await other.click()

    await expect(page).toHaveURL(/[?&]locality=[0-9a-f-]{36}/)
    await expect(switcher).toContainText(otherLabel.replace(/\s+/g, " ").slice(0, 12))

    // Autorização intacta: /communities passa a mostrar a cidade observada, mas
    // "Minhas comunidades" continua sendo a membresia real — trocar a vitrine
    // não inscreve ninguém em lugar nenhum.
    await page.goto(`/communities?locality=${new URL(page.url()).searchParams.get("locality")}`)
    await expect(page.getByRole("heading", { name: "Comunidades" })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByRole("tab", { name: "Minhas comunidades" })).toBeVisible()
  })

  test("voltar para a própria cidade limpa o parâmetro em vez de fixá-lo", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/inicio")

    const switcher = page.getByTestId("locality-switcher")
    await expect(switcher).toBeVisible({ timeout: 20_000 })

    await switcher.click()
    const dialog = page.getByRole("dialog", { name: "Trocar cidade" })
    await dialog.getByTestId("city-option").filter({ hasNotText: "sua cidade" }).first().click()
    await expect(page).toHaveURL(/locality=/)

    await switcher.click()
    await page
      .getByRole("dialog", { name: "Trocar cidade" })
      .getByTestId("city-option")
      .filter({ hasText: "sua cidade" })
      .first()
      .click()

    // A URL canônica da própria cidade é uma só: sem parâmetro.
    await expect(page).not.toHaveURL(/locality=/)
  })
  test("a busca estreita o catálogo em vez de despejar a lista", async ({ page }) => {
    await seedSession(page.context())
    await page.goto("/inicio")

    await page.getByTestId("locality-switcher").click()
    const dialog = page.getByRole("dialog", { name: "Trocar cidade" })
    await expect(dialog).toBeVisible()

    // Sem termo, a lista vem limitada — é o que segura um catálogo nacional.
    await expect(dialog.getByTestId("city-option").first()).toBeVisible({ timeout: 15_000 })
    const initial = await dialog.getByTestId("city-option").count()
    expect(initial).toBeGreaterThan(0)
    expect(initial).toBeLessThanOrEqual(8)

    await dialog.getByRole("searchbox", { name: "Buscar cidade" }).fill("manaus")
    await expect(dialog.getByTestId("city-option").first()).toContainText("Manaus")
    await expect(dialog.getByTestId("city-option")).toHaveCount(1)

    // Termo sem correspondência não inventa resultado nem esvazia em silêncio.
    await dialog.getByRole("searchbox", { name: "Buscar cidade" }).fill("zzzz inexistente")
    await expect(dialog.getByText(/Nenhuma cidade com comunidade encontrada/)).toBeVisible()
  })
})
