import { randomUUID } from "node:crypto"
import { type BrowserContext, expect, type Page, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { readEnvLocal, seedSession } from "../helpers/session"
import {
  cleanupRunManifest,
  createRunManifest,
  type RunManifest,
  recoverInterruptedRuns,
  track,
} from "./run-manifest"

// FIGMA-002 — semântica dos filtros de busca do catálogo.
//
// O reparo anterior provava os filtros numéricos só pelo resultado "0
// resultados", o que não distingue "filtro não aplicou" de "filtro aplicou e não
// havia nada". Aqui os três anúncios têm bairro, aluguel e quartos DIFERENTES, e
// cada combinação afirma o conjunto exato de cards — inclusive o caso em que o
// filtro amplia o resultado. Texto (q) e tipo têm de sobreviver a aplicar,
// limpar, voltar e recarregar.

function env(key: string): string {
  const value = process.env[key] ?? readEnvLocal(key)
  if (!value) throw new Error(`Required environment: ${key}`)
  return value
}
const url = env("SUPABASE_URL")
if (url !== "http://127.0.0.1:55621")
  throw new Error("FIGMA-002 runtime must use isolated stack 55621")
const OWNER = "visual@bivaque.example.invalid"

async function ownerClient() {
  const client = createClient(url, env("SUPABASE_ANON_KEY"), { auth: { persistSession: false } })
  const result = await client.auth.signInWithPassword({
    email: OWNER,
    password: process.env["USER_PASSWORD"] ?? env("BIVAQUE_VISUAL_PASSWORD"),
  })
  if (result.error) throw new Error("Fixture authentication failed")
  return client
}

async function session(context: BrowserContext, email: string) {
  const previous = process.env["USER_EMAIL"]
  process.env["USER_EMAIL"] = email
  try {
    await seedSession(context)
  } finally {
    if (previous) process.env["USER_EMAIL"] = previous
    else delete process.env["USER_EMAIL"]
  }
}

// A limpeza deste spec é o MANIFESTO: apaga os ids que ESTA execução criou e
// nada mais. Não há busca por título, prefixo ou marcador — o id entra no
// manifesto no momento da criação e sai no `finally`.
async function cleanup(manifest: RunManifest, ids: string[]) {
  if (ids.some((id) => !/^[0-9a-f-]{36}$/.test(id))) throw new Error("Invalid cleanup fixture ids")
  const report = await cleanupRunManifest(manifest)
  const owner = await ownerClient()
  const left = await owner.from("listings").select("id").in("id", ids)
  if (left.error) throw left.error
  if (left.data && left.data.length > 0) throw new Error("Cleanup left listing rows")
  return report
}

type Fixture = { id: string; name: string }

async function publishFixture(
  page: Page,
  params: {
    title: string
    neighborhood: string
    rentReais: string
    bedrooms: string
    propertyType: string
  },
): Promise<string> {
  await page.goto("/imoveis")
  await page.getByRole("button", { name: "Anunciar imóvel" }).click()
  const dialog = page.getByRole("dialog", { name: "Publicar imóvel" })
  await dialog.getByLabel("Título", { exact: true }).fill(params.title)
  await dialog.getByLabel("Tipo de imóvel").selectOption(params.propertyType)
  await dialog.getByLabel("Bairro", { exact: true }).fill(params.neighborhood)
  await dialog.getByLabel("Aluguel mensal em reais").fill(params.rentReais)
  await dialog.getByLabel("Quartos", { exact: true }).fill(params.bedrooms)
  await dialog.getByLabel("Descrição").fill("Anúncio de prova dos filtros de busca do catálogo.")
  await page.getByRole("button", { name: "Revisar publicação", exact: true }).click()
  await page.getByRole("button", { name: "Publicar", exact: true }).click()
  await page.waitForURL(/\/imoveis\/[0-9a-f-]{36}$/)
  const id = new URL(page.url()).pathname.split("/")[2]
  if (!id) throw new Error("Missing published id")
  return id
}

// Recuperação de interrupção: só alcança manifesto deste módulo cujo writer
// já morreu, e apaga os ids exatos declarados nele. Execução viva é pulada.
test.beforeAll(async () => {
  await recoverInterruptedRuns()
})

test("filtros de bairro, aluguel máximo e quartos mínimos afinam o conjunto real", async ({
  page,
  context,
}) => {
  await session(context, OWNER)
  const token = `Filtros FIGMA002 ${randomUUID().slice(0, 8)}`
  const created: Fixture[] = []
  const manifest = createRunManifest()
  try {
    const alfa = await publishFixture(page, {
      title: `${token} Alfa`,
      neighborhood: "Ponta Negra",
      rentReais: "2000",
      bedrooms: "2",
      propertyType: "casa",
    })
    track(manifest, "listings", alfa)
    created.push({ id: alfa, name: "Alfa" })
    const beta = await publishFixture(page, {
      title: `${token} Beta`,
      neighborhood: "Flores",
      rentReais: "3500",
      bedrooms: "4",
      propertyType: "apartamento",
    })
    track(manifest, "listings", beta)
    created.push({ id: beta, name: "Beta" })
    const gama = await publishFixture(page, {
      title: `${token} Gama`,
      neighborhood: "Aleixo",
      rentReais: "1200",
      bedrooms: "1",
      propertyType: "kitnet",
    })
    track(manifest, "listings", gama)
    created.push({ id: gama, name: "Gama" })

    /** Afirma o conjunto EXATO de cards visíveis e o contador da tela. */
    async function expectSet(expected: string[], total: number) {
      for (const fixture of created) {
        await expect(page.locator(`a[href="/imoveis/${fixture.id}"]`)).toHaveCount(
          expected.includes(fixture.id) ? 1 : 0,
        )
      }
      await expect(page.getByText(`${total} resultados`, { exact: true })).toBeVisible()
    }

    const base = `/imoveis?q=${encodeURIComponent(token)}`

    // Base: o texto traz os três e nada mais.
    await page.goto(base)
    await expectSet([alfa, beta, gama], 3)

    // Bairro: reduz para um, e o conjunto é o announcement esperado.
    await page.goto(`${base}&bairro=${encodeURIComponent("Aleixo")}`)
    await expectSet([gama], 1)

    // Reload com o filtro na URL devolve o mesmo conjunto: o filtro mora na URL.
    await page.reload()
    await expectSet([gama], 1)
    expect(new URL(page.url()).searchParams.get("bairro")).toBe("Aleixo")

    // Aluguel máximo: inclui os dois abaixo do teto e exclui o de 3500.
    await page.goto(`${base}&aluguel_max=2500`)
    await expectSet([alfa, gama], 2)

    // Teto abaixo do menor aluguel: resultado vazio, e não erro.
    await page.goto(`${base}&aluguel_max=1000`)
    await expectSet([], 0)
    await expect(page.getByText("Nenhum imóvel encontrado.")).toBeVisible()

    // Quartos mínimos: só o de 4 quartos.
    await page.goto(`${base}&quartos_min=3`)
    await expectSet([beta], 1)

    // Bairro + teto combinados: a interseção, e não a união.
    await page.goto(`${base}&bairro=${encodeURIComponent("Flores")}&aluguel_max=2000`)
    await expectSet([], 0)

    // Tipo pela URL, sozinho: só o apartamento do conjunto de texto.
    await page.goto(`${base}&tipo=apartamento`)
    await expectSet([beta], 1)

    // Aplicar filtros pela UI preserva texto e tipo, e a interseção é o
    // resultado: apartamento + bairro Aleixo não cruza, porque Gama é kitnet.
    await page.getByRole("button", { name: "Filtros", exact: true }).click()
    await page.getByLabel("Filtrar por bairro").fill("Aleixo")
    await page.getByRole("button", { name: "Aplicar filtros" }).click()
    const applied = new URL(page.url())
    expect(applied.searchParams.get("q")).toBe(token)
    expect(applied.searchParams.get("tipo")).toBe("apartamento")
    expect(applied.searchParams.get("bairro")).toBe("Aleixo")
    await expectSet([], 0)

    // Limpar filtros leva de volta ao conjunto de texto E tipo, tirando só os
    // numéricos que estavam aplicados.
    await page.getByRole("button", { name: "Filtros", exact: true }).click()
    await page.getByRole("link", { name: "Limpar filtros" }).click()
    const cleared = new URL(page.url())
    expect(cleared.searchParams.get("q")).toBe(token)
    expect(cleared.searchParams.get("tipo")).toBe("apartamento")
    expect(cleared.searchParams.has("bairro")).toBe(false)
    expect(cleared.searchParams.has("aluguel_max")).toBe(false)
    expect(cleared.searchParams.has("quartos_min")).toBe(false)
    await expectSet([beta], 1)

    // O chip de tipo preserva o bairro já aplicado e continua sendo interseção:
    // casa + Flores não casa com Alfa, que é casa em Ponta Negra.
    await page.getByRole("button", { name: "Filtros", exact: true }).click()
    await page.getByLabel("Filtrar por bairro").fill("Flores")
    await page.getByRole("button", { name: "Aplicar filtros" }).click()
    await expectSet([beta], 1)
    await page.getByRole("link", { name: "Casa", exact: true }).click()
    await expect(page).toHaveURL(/tipo=casa/)
    // O bairro aplicado sobrevive à troca de tipo: é a URL que carrega o estado.
    expect(new URL(page.url()).searchParams.get("bairro")).toBe("Flores")
    await expectSet([], 0)

    // Voltar ao texto sem tipo devolve os três — nenhum filtro "grudou".
    await page.goto(base)
    await expectSet([alfa, beta, gama], 3)
    await page.reload()
    await expectSet([alfa, beta, gama], 3)
  } finally {
    if (created.length)
      await cleanup(
        manifest,
        created.map((row) => row.id),
      )
  }
})
