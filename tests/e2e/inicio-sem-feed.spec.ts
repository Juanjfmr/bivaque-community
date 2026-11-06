// LAN-TROCA fase 1: a Home antiga saiu; Comunidade e compositor de grupos
// permanecem na web. A recusa de publicação sem grupo segue no pgTAP.

import { expect, test } from "@playwright/test"
import { openComposer } from "./helpers/composer"
import { signInAs } from "./helpers/session"

// Membro de Manaus com grupos: o seed o aprova em "Pais e Filhos" (grupo 2) e
// em "Corrida às Terças" (grupo 3).
const MANAUS_MEMBER = "membro-1@bivaque.example.invalid"
// Dona da Vila Ajuricaba: membro aprovado de Manaus, mas SEM grupo nenhum — é o
// estado do item 4 (não há destino para escolher).
const VILA_OWNER = "dono-vila@bivaque.example.invalid"

const CITY_FEED = "#secao-cidade"
const GROUP_NAME = "Pais e Filhos"

test.describe("a Comunidade antiga preservada na fase 1", () => {
  test("a Comunidade fica com as perguntas: sem feed, sem Conversa, sem publicar", async ({
    page,
    context,
  }) => {
    await signInAs(context, MANAUS_MEMBER)

    await page.goto("/community", { waitUntil: "load" })

    await expect(page).toHaveURL(/\/community/)
    await expect(page.getByRole("tab", { name: "Conversa" })).toHaveCount(0)
    await expect(page.locator(CITY_FEED)).toHaveCount(0)
    // A linha de publicar saiu da Comunidade: o único "Publicar" da tela era
    // dela (o botão de criação do shell se chama "Criar").
    await expect(page.getByRole("button", { name: "Publicar" })).toHaveCount(0)

    await expect(page.getByRole("region", { name: "O que você procura?" })).toBeVisible({
      timeout: 20000,
    })
  })
})

test.describe("o compositor publica só em grupo", () => {
  test("quem participa escolhe o grupo — cidade e vila não são oferecidas", async ({
    page,
    context,
  }) => {
    await signInAs(context, MANAUS_MEMBER)
    await openComposer(page)
    const dialog = page.getByRole("dialog")

    // Cidade inteira e vila saíram do seletor.
    await expect(dialog.getByText(/Toda a cidade/i)).toHaveCount(0)
    await expect(dialog.getByText(/Vila Ajuricaba/i)).toHaveCount(0)

    // O grupo da pessoa está lá e é o destino: o aviso de alcance descreve ele.
    await expect(dialog.getByText(GROUP_NAME, { exact: true })).toBeVisible({ timeout: 15000 })
    await dialog.getByText(GROUP_NAME, { exact: true }).click()
    await dialog.getByLabel("Pergunta").fill("Ensaio de destino em grupo")
    await expect(dialog.getByTestId("audience-notice")).toContainText(/aprovados deste grupo/i)
    await expect(dialog.getByTestId("publish-submit")).toBeEnabled()
  })

  test("sem grupo, o caminho é entrar em um — e publicar fica desabilitado", async ({
    page,
    context,
  }) => {
    await signInAs(context, VILA_OWNER)
    await openComposer(page)
    const dialog = page.getByRole("dialog")

    await expect(dialog.getByText("Você ainda não participa de um grupo")).toBeVisible({
      timeout: 15000,
    })
    await expect(dialog.getByRole("link", { name: "Ver grupos" })).toHaveAttribute(
      "href",
      "/groups",
    )

    await dialog.getByLabel("Pergunta").fill("Tentativa sem grupo")
    await expect(dialog.getByTestId("publish-submit")).toBeDisabled()

    // "Ver grupos" tem de FECHAR o compositor antes de navegar: ele é montado
    // pelo shell, e sem fechar o diálogo continua por cima de /groups.
    await dialog.getByRole("link", { name: "Ver grupos" }).click()

    await expect(page).toHaveURL(/\/groups/)
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Grupos", exact: true })).toBeVisible({
      timeout: 20000,
    })

    // Usável de verdade com o compositor fora do caminho: a busca responde.
    await page.getByLabel("Buscar grupos").fill("zzz-sem-grupo")
    await expect(page.getByText(/Nenhum grupo encontrado/)).toBeVisible()
  })
})
