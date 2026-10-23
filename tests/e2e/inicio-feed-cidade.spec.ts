// O feed da cidade no Início (lote 5, tarefa N2 — ADR-20261023).
//
// O que este spec prova em runtime:
//   1. o Início mostra o feed da cidade (leitura nova `feed_locality`, migration
//      20261024100000), paginado, com o alcance da cidade no cartão;
//   2. publicação de GRUPO não aparece: o feed é `group_id is null and
//      community_id is null`, então nenhum cartão carrega o chip "só o grupo";
//   3. a vista "Conversa" saiu da Comunidade: /community não tem feed nem aba
//      Conversa, e mostra o painel de Indicações;
//   4. o feed não depende de ter comunidade — quem tem, como quem não tem, lê a
//      cidade do mesmo jeito.
//
// LIMITE: o negativo de VILA (`community_id`) e o de OUTRA cidade são provados
// no pgTAP (`supabase/tests/feed-cidade.sql`). O seed de desenvolvimento não tem
// publicação de vila nem de outra cidade para exercitar em tela, e inventar uma
// aqui seria provar menos do que o banco já prova.

import { type BrowserContext, expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

// Membro de Manaus sem comunidade aprovada.
const MANAUS_MEMBER = "membro-1@bivaque.example.invalid"
// Dona da Vila Ajuricaba: membro com comunidade (e com grupos).
const VILA_OWNER = "dono-vila@bivaque.example.invalid"

const CITY_FEED = "#secao-cidade"
const CITY_CHIP = `${CITY_FEED} [aria-label="Alcance: Manaus inteira"]`
const GROUP_CHIP = `${CITY_FEED} [aria-label="Alcance: só o grupo"]`

async function openHome(context: BrowserContext, email: string) {
  await signInAs(context, email)
}

test.describe("o feed da cidade no Início", () => {
  test("a pessoa lê a cidade no Início, em páginas, com o alcance da cidade", async ({
    page,
    context,
  }) => {
    await openHome(context, MANAUS_MEMBER)

    // When — abre o Início
    await page.goto("/inicio", { waitUntil: "load" })

    // Then — a seção do feed da cidade está lá, com as duas abas e "Recentes"
    // escolhida: é o feed da cidade, não uma prévia da vila.
    const feed = page.locator(CITY_FEED)
    await expect(feed.getByRole("heading", { name: "Na sua cidade" })).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByRole("tab", { name: "Recentes", selected: true })).toBeVisible()

    // And — as primeiras publicações chegam (a função escolhe a página antes de
    // contar respostas e reações; a tela monta 20 por vez)
    const cards = feed.locator("article")
    await expect(cards.first()).toBeVisible({ timeout: 20000 })
    const firstPage = await cards.count()
    expect(firstPage).toBeGreaterThan(5)

    // And — o cartão diz o tamanho do público: alcance da cidade
    await expect(page.locator(CITY_CHIP).first()).toBeVisible()

    // And — paginar traz mais: "Carregar mais" existe enquanto há mais páginas
    const loadMore = feed.getByRole("button", { name: "Carregar mais" })
    await expect(loadMore).toBeVisible()
    await loadMore.click()
    await expect
      .poll(() => cards.count(), { message: "a segunda página entra na lista" })
      .toBeGreaterThan(firstPage)
  })

  test("publicação de grupo não aparece no feed da cidade", async ({ page, context }) => {
    // A dona da vila participa de grupos (o seed a põe como dona/owner deles):
    // se o feed da cidade não excluísse `group_id`, o chip "só o grupo"
    // apareceria em algum cartão.
    await openHome(context, VILA_OWNER)

    await page.goto("/inicio", { waitUntil: "load" })

    const feed = page.locator(CITY_FEED)
    await expect(feed.locator("article").first()).toBeVisible({ timeout: 20000 })

    // Then — nenhum cartão do feed carrega alcance de grupo, e todo cartão com
    // chip carrega o alcance da cidade
    await expect(page.locator(GROUP_CHIP)).toHaveCount(0)
    await expect(page.locator(CITY_CHIP).first()).toBeVisible()
  })

  test("a vista Conversa saiu da Comunidade: o que fica é o painel de Indicações", async ({
    page,
    context,
  }) => {
    await openHome(context, MANAUS_MEMBER)

    // When — abre a Comunidade
    await page.goto("/community", { waitUntil: "load" })

    // Then — a página fica na Comunidade, sem o feed e sem a aba "Conversa"
    await expect(page).toHaveURL(/\/community/)
    await expect(page.getByRole("tab", { name: "Conversa" })).toHaveCount(0)
    await expect(page.locator(CITY_FEED)).toHaveCount(0)

    // And — o painel de Indicações é o que a Comunidade mostra
    await expect(page.getByRole("region", { name: "O que você procura?" })).toBeVisible({
      timeout: 20000,
    })
  })
})
