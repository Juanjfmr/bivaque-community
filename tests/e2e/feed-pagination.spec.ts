import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Locator, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// FEED-PAGINACAO-CURSOR — rodada 2 (TELA): o comportamento da paginação.
//
// O problema medido que esta rodada corrige: a Home renderizava 376 cartões de
// uma vez (`main.scrollHeight` de 131.155 px a 1440) e o RESTO do feed não tinha
// como ser alcançado — não existia "Carregar mais" em lugar nenhum. O que este
// spec prova, em comportamento:
//
//   1. a lista abre com UMA página (20 cartões), não com o feed inteiro;
//   2. o botão traz a página seguinte — 20, depois 40, sem id repetido;
//   3. falha ao carregar a página seguinte MANTÉM o feed na tela e oferece
//      tentar de novo (o contrário — apagar o feed — é o defeito que o ADR
//      proíbe);
//   4. trocar entre Recentes e Relevantes recomeça do zero;
//   5. o fim do feed diz que acabou, e a interface ALCANÇA o feed inteiro.
//
// Nada aqui é rolagem automática: cada página sai de um clique no botão (o
// teclado é exercitado no teste 2, que aciona o controle por Enter).
//
// `import.meta.dirname` não pode ser usado: o Playwright transpila os specs para
// CJS (ver o cabeçalho de two-localities.spec.ts). O cartão do feed carrega
// `data-post-id` — é por ele que a contagem e a ausência de repetição são
// medidas, sem depender de texto de conteúdo semeado.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"

// Conta do seed que participa de uma comunidade com feed grande (Vila
// Ajuricaba, 377 publicações visíveis): a mesma de two-localities.spec.ts, pelo
// mesmo motivo — /community sem comunidade aprovada renderiza <CityReference/>,
// que não lista publicações.
const VILA_OWNER_EMAIL = "dono-vila@bivaque.example.invalid"

const CARDS = "article[data-post-id]"
const LOAD_MORE = "Carregar mais"
const RETRY = "Tentar novamente"
const END_MARKER = "Você está em dia"
const RPC_GLOB = "**/rest/v1/rpc/feed_community"
const PAGE_ERROR = "Não foi possível carregar as publicações. Tente novamente."

function readEnvLocal(key: string): string | undefined {
  try {
    const file = readFileSync(join(process.cwd(), "apps", "web", ".env.local"), "utf-8")
    for (const line of file.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      if (trimmed.slice(0, eq).trim() !== key) continue
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  } catch {
    return undefined
  }
  return undefined
}

function requireCredentials(): { anonKey: string; password: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) {
    throw new Error(
      "SUPABASE_ANON_KEY is required. Set it in the environment or as NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
    )
  }
  if (!password) {
    throw new Error(
      "USER_PASSWORD is required. Set it in the environment or as BIVAQUE_VISUAL_PASSWORD in apps/web/.env.local.",
    )
  }
  return { anonKey, password }
}

async function signInAs(page: Page, email: string): Promise<void> {
  const { anonKey, password } = requireCredentials()
  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded?`,
    )
  }
  const body = (await response.json()) as Parameters<typeof encodeAuthCookieValue>[0]
  const cookieValue = encodeAuthCookieValue(body, email)
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400
  const shared = {
    domain: "127.0.0.1",
    path: "/",
    expires,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }
  await page.context().addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: "bivaque-consent-version", value: CURRENT_CONSENT, ...shared },
  ])
}

async function openFeed(page: Page, path: string, ready: Locator, timeout = 25000): Promise<void> {
  await signInAs(page, VILA_OWNER_EMAIL)
  await page.goto(`${APP_URL}${path}`, { waitUntil: "load" })
  // Controle de carga: sem ele uma falha de sessão faria as contagens passarem
  // por vacuidade numa tela de erro.
  await expect(ready).toBeVisible({ timeout })
}

/** Os ids REAIS das linhas na tela, na ordem em que aparecem. */
function cardIds(page: Page): Promise<string[]> {
  return page
    .locator(CARDS)
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-post-id") ?? ""),
    )
}

const loadMoreButton = (page: Page) =>
  page.getByTestId("feed-load-more").getByRole("button", { name: LOAD_MORE })

test.describe("feed paginado por cursor", () => {
  test("abre com UMA página: 20 cartões, não o feed inteiro", async ({ page }) => {
    await openFeed(page, "/community", page.getByRole("button", { name: "Publicar" }).first())

    const cards = page.locator(CARDS)
    await expect(cards).toHaveCount(20, { timeout: 25000 })

    // E existe por onde pedir o resto — era isso que não existia.
    await expect(loadMoreButton(page)).toBeVisible()
    // Enquanto houver página, o fim NÃO é anunciado: dizer "você está em dia"
    // com 357 publicações esperando é a mentira que a rodada 1 mediu.
    await expect(page.getByText(END_MARKER)).toHaveCount(0)
  })

  test("a Home abre com uma página, não com os 376 cartões", async ({ page }) => {
    await openFeed(page, "/inicio", page.locator("#na-comunidade-titulo"))

    const cards = page.locator(CARDS)
    await expect(cards).toHaveCount(20, { timeout: 25000 })
    await expect(loadMoreButton(page)).toBeVisible()
  })

  test("Carregar mais leva de 20 para 40 cartões, sem nenhum id repetido", async ({ page }) => {
    await openFeed(page, "/community", page.getByRole("button", { name: "Publicar" }).first())

    const cards = page.locator(CARDS)
    await expect(cards).toHaveCount(20, { timeout: 25000 })
    const firstPage = await cardIds(page)
    expect(firstPage).toHaveLength(20)

    // O botão é acionado por TECLADO: foco + Enter. É o requisito explícito do
    // ADR (botão, não rolagem automática) — e a razão de ele existir.
    await loadMoreButton(page).focus()
    await page.keyboard.press("Enter")

    await expect(cards).toHaveCount(40, { timeout: 25000 })
    const afterSecondPage = await cardIds(page)

    // 40 cartões, 40 ids DISTINTOS: nenhuma linha voltou na página seguinte.
    expect(new Set(afterSecondPage).size, "ids distintos depois de duas páginas").toBe(40)
    // E a primeira página continua exatamente onde estava, na mesma ordem.
    expect(afterSecondPage.slice(0, 20)).toEqual(firstPage)
  })

  test("falha na página seguinte mantém o feed na tela e oferece tentar de novo", async ({
    page,
  }) => {
    await openFeed(page, "/community", page.getByRole("button", { name: "Publicar" }).first())

    const cards = page.locator(CARDS)
    await expect(cards).toHaveCount(20, { timeout: 25000 })
    const before = await cardIds(page)

    // Só a requisição COM cursor falha: é a página seguinte. A primeira (sem
    // cursor) passa — o que também prova que a página 1 não manda cursor.
    await page.route(RPC_GLOB, async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown> | null
      if (body && typeof body["p_before_created_at"] === "string") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "falha simulada da página seguinte", code: "500" }),
        })
        return
      }
      await route.continue()
    })

    await loadMoreButton(page).click()

    // A falha é dita, com a oferta de tentar de novo...
    const controle = page.getByTestId("feed-load-more")
    await expect(controle.getByText(PAGE_ERROR)).toBeVisible({ timeout: 25000 })
    await expect(controle.getByRole("button", { name: RETRY })).toBeVisible()

    // ...e o feed CONTINUA inteiro na tela, na mesma ordem.
    await expect(cards).toHaveCount(20)
    expect(await cardIds(page)).toEqual(before)

    // Com a rede de volta, "Tentar novamente" traz a página 2 de verdade.
    await page.unroute(RPC_GLOB)
    await controle.getByRole("button", { name: RETRY }).click()
    await expect(cards).toHaveCount(40, { timeout: 25000 })
    expect(new Set(await cardIds(page)).size).toBe(40)
  })

  test("trocar entre Recentes e Relevantes recomeça do zero", async ({ page }) => {
    await openFeed(page, "/community", page.getByRole("button", { name: "Publicar" }).first())

    const cards = page.locator(CARDS)
    await expect(cards).toHaveCount(20, { timeout: 25000 })
    const firstPageOfRecent = await cardIds(page)

    await loadMoreButton(page).click()
    await expect(cards).toHaveCount(40, { timeout: 25000 })

    // Relevantes é LISTA LIMITADA (ADR): no máximo 20, e nunca 40.
    await page.getByRole("button", { name: "Relevantes" }).click()
    await expect
      .poll(async () => cards.count(), { timeout: 25000, message: "Relevantes não acumula" })
      .toBeLessThanOrEqual(20)

    // E voltar para Recentes NÃO devolve os 40: recomeça da página 1.
    await page.getByRole("button", { name: "Recentes" }).click()
    await expect(cards).toHaveCount(20, { timeout: 25000 })
    expect(await cardIds(page)).toEqual(firstPageOfRecent)
  })

  test("o fim do feed diz que acabou, e a interface alcança o feed inteiro", async ({ page }) => {
    // Caminhada REAL até o fim: nenhuma página é simulada aqui. O seed tem 377
    // publicações visíveis para esta comunidade, então o laço roda ~18 vezes.
    test.setTimeout(300_000)
    await openFeed(page, "/community", page.getByRole("button", { name: "Publicar" }).first())

    const cards = page.locator(CARDS)
    await expect(cards).toHaveCount(20, { timeout: 25000 })

    let previous = 20
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const button = page.getByTestId("feed-load-more").getByRole("button", { name: LOAD_MORE })
      if ((await button.count()) === 0) break
      await button.click()
      await expect
        .poll(
          async () => {
            const now = await cards.count()
            const ended = await page.getByText(END_MARKER).count()
            return now > previous || ended > 0
          },
          { timeout: 30000, message: "a página seguinte chegou ou o fim foi anunciado" },
        )
        .toBe(true)
      previous = await cards.count()
    }

    // Acabou: o marcador de fim aparece e o botão sai de cena.
    await expect(page.getByText(END_MARKER)).toBeVisible({ timeout: 25000 })
    await expect(
      page.getByTestId("feed-load-more").getByRole("button", { name: LOAD_MORE }),
    ).toHaveCount(0)

    const all = await cardIds(page)
    // Muito além de uma página (é o que o usuário não alcançava antes) e sem
    // nenhum id repetido ao longo de todas as páginas.
    expect(all.length, "cartões ao fim da caminhada").toBeGreaterThan(40)
    expect(new Set(all).size, "ids distintos ao longo de todas as páginas").toBe(all.length)
  })
})
