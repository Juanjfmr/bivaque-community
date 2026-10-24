// O Início sem feed e o compositor só em grupo (lote 5, tarefa N2 —
// ADR-20261023-comunidade-do-prototipo).
//
// O que este spec prova em runtime:
//   1. o Início NÃO tem feed da cidade: nenhuma seção, nenhuma aba, nenhum
//      "Carregar mais". A leitura `feed_locality` que a versão anterior usava
//      nem chegou ao banco;
//   2. a Comunidade não tem feed nem a vista "Conversa", nem a linha de
//      publicar: o que fica é o painel de Indicações;
//   3. o compositor só oferece grupo: quem participa escolhe o grupo de destino
//      e o aviso de alcance descreve esse grupo;
//   4. sem grupo nenhum, publicar não acontece: o caminho é entrar em um grupo,
//      e o primário fica desabilitado.
//
// LIMITE: a recusa do BANCO para publicação sem grupo é provada no pgTAP
// (`supabase/tests/publicacao-so-em-grupo.sql`), onde o insert direto pode ser
// exercitado. A tela nunca é a autoridade da regra — ela só não oferece o que o
// banco recusaria.
//
// Este spec substitui `inicio-feed-cidade.spec.ts`, que provava o feed no
// Início; a decisão do dono (no ADR) foi seguir o protótipo, que não tem feed.

import { type BrowserContext, expect, type Page, test } from "@playwright/test"
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

async function openHome(context: BrowserContext, email: string, page: Page): Promise<void> {
  await signInAs(context, email)
  await page.goto("/inicio", { waitUntil: "load" })
  // Âncora positiva: sem ela, "não tem feed" passaria numa página de erro.
  await expect(page.locator("main").getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20000,
  })
}

test.describe("o Início sem feed da cidade", () => {
  test("não há seção, aba nem paginação de feed", async ({ page, context }) => {
    await openHome(context, MANAUS_MEMBER, page)

    await expect(page.locator(CITY_FEED)).toHaveCount(0)
    await expect(page.getByText("Na sua cidade")).toHaveCount(0)
    await expect(page.getByRole("tab", { name: "Recentes" })).toHaveCount(0)
    await expect(page.getByRole("tab", { name: "Acompanhando" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Carregar mais" })).toHaveCount(0)
  })

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
