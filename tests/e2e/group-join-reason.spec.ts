// COM-005 (B2 do lote 5) — o motivo do pedido de entrada e o convite.
//
// A prova de ponta a ponta do contrato, nos três tamanhos (os projetos do
// Playwright cobrem 375, 768 e 1440): o pedido ao grupo Fechado com motivo, o
// aviso do que não incluir, a aprovação e o motivo sumindo, e o convite como
// link da tela do grupo — que no Fechado leva ao pedido, nunca à entrada
// direta.
//
// O dono é a conta de captura (visual@), que cria os próprios grupos pela RPC
// `create_group` (não é o objeto desta prova): assim a coluna `owner_user_id` e
// a linha de participação são a mesma pessoa, sem depender de grupos antigos do
// seed.
//
// Tag @stateful: cria grupos, um pedido e uma aprovação no banco com seed.

import type { APIRequestContext, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { apiForSession, signInAs } from "./helpers/session"

const VISUAL_EMAIL = process.env["BIVAQUE_E2E_VISUAL_EMAIL"] ?? "visual@bivaque.example.invalid"
// Uma pessoa de Manaus, do seed, para pedir entrada no grupo novo do dono.
const REQUESTER_EMAIL = "membro-1@bivaque.example.invalid"
const APP_ORIGIN = "http://127.0.0.1:3000"
const MANAUS_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"

const COPIED_LINK_KEY = "__bivaqueCopiedLink"

// O convite usa o compartilhamento nativo quando existe e cai para copiar o
// link. No Chromium de teste não há alvo de compartilhamento: o stub deixa
// `navigator.share` indefinido e guarda o que foi copiado, para o teste ler sem
// depender de permissão de área de transferência.
async function installInviteStub(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    const store = window as unknown as Record<string, unknown>
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined })
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          store[key] = text
          return Promise.resolve()
        },
      },
    })
  }, COPIED_LINK_KEY)
}

async function copiedLink(page: Page): Promise<string | undefined> {
  return page.evaluate(
    (key) => (window as unknown as Record<string, unknown>)[key] as string | undefined,
    COPIED_LINK_KEY,
  )
}

async function findGroupId(api: APIRequestContext, name: string): Promise<string> {
  const response = await api.get(`/rest/v1/groups?select=id&name=eq.${encodeURIComponent(name)}`)
  const rows = (await response.json()) as Array<{ id: string }>
  const id = rows[0]?.id
  if (!id) throw new Error(`o grupo "${name}" não voltou na consulta`)
  return id
}

async function createGroup(
  api: APIRequestContext,
  name: string,
  visibility: "public" | "private",
): Promise<string> {
  const response = await api.post("/rest/v1/rpc/create_group", {
    data: { p_name: name, p_visibility: visibility, p_locality_id: MANAUS_LOCALITY_ID },
  })
  if (!response.ok()) {
    throw new Error(`create_group falhou (HTTP ${response.status()}): ${await response.text()}`)
  }
  return findGroupId(api, name)
}

// Cada ação de tela é uma escrita: o cliente faz POST na rota (Server Action)
// ou na RPC. Esperar a resposta antes de asserir evita correr com a navegação.
function waitForGroupPost(page: Page, groupId: string) {
  return page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().includes(`/groups/${groupId}`),
    { timeout: 20_000 },
  )
}

test.setTimeout(150_000)

test.describe("COM-005 — motivo no pedido e convite", { tag: "@stateful" }, () => {
  test("pede com motivo, aprova, o motivo some e o convite leva ao pedido", async ({
    page,
    context,
  }) => {
    const suffix = Date.now()
    const privateName = `Grupo COM-005 Fechado ${suffix}`
    const publicName = `Grupo COM-005 Aberto ${suffix}`
    const reason = "Quero participar dos encontros e ajudar na organizacao."

    await installInviteStub(page)

    // ── O dono cria um grupo Fechado e um Aberto ───────────────────────────
    await signInAs(context, VISUAL_EMAIL)
    const ownerApi = await apiForSession(context)
    const privateId = await createGroup(ownerApi, privateName, "private")
    const publicId = await createGroup(ownerApi, publicName, "public")

    // ── Convite no Fechado: o link é o da tela do grupo ────────────────────
    await page.goto(`/groups/${privateId}`)
    await page.getByRole("button", { name: "Convidar" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Link copiado." })).toBeVisible()
    expect(await copiedLink(page)).toBe(`${APP_ORIGIN}/groups/${privateId}`)

    // O mesmo botão no grupo Aberto copia o endereço do grupo aberto.
    await page.goto(`/groups/${publicId}`)
    await page.getByRole("button", { name: "Convidar" }).click()
    expect(await copiedLink(page)).toBe(`${APP_ORIGIN}/groups/${publicId}`)

    // ── O convidado abre o link do Fechado: pede, nunca entra direto ───────
    await signInAs(context, REQUESTER_EMAIL)
    await page.goto(`/groups/${privateId}`)
    await expect(page.getByRole("heading", { level: 1, name: privateName })).toBeVisible()
    await expect(page.getByRole("button", { name: "Pedir entrada" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0)

    // ── O pedido, com o aviso do motivo ────────────────────────────────────
    await page.getByRole("button", { name: "Pedir entrada" }).click()
    await expect(
      page.getByText(/Não inclua endereço, telefone, CPF ou dados de saúde/),
    ).toBeVisible()
    await page.getByLabel(/Por que você quer entrar/).fill(reason)
    const joined = page.waitForResponse((r) => r.url().includes("/rest/v1/rpc/join_group"))
    await page.getByRole("button", { name: "Enviar pedido" }).click()
    await joined

    await expect(page.getByRole("button", { name: "Cancelar pedido" })).toBeVisible({
      timeout: 20_000,
    })
    await page.reload()
    await expect(page.getByRole("button", { name: "Cancelar pedido" })).toBeVisible()

    // ── O dono vê o motivo e aprova; o motivo some ─────────────────────────
    await signInAs(context, VISUAL_EMAIL)
    await page.goto(`/groups/${privateId}`)
    await expect(page.getByRole("heading", { name: "Pedidos de entrada" })).toBeVisible()
    await expect(page.getByText(reason)).toBeVisible()

    const approved = waitForGroupPost(page, privateId)
    await page.getByRole("button", { name: "Aprovar" }).click()
    await approved

    await expect(page.getByRole("heading", { name: "Pedidos de entrada" })).toHaveCount(0)
    await expect(page.getByText(reason)).toHaveCount(0)

    // ── Quem pediu agora é membro ──────────────────────────────────────────
    await signInAs(context, REQUESTER_EMAIL)
    await page.goto(`/groups/${privateId}`)
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible()

    // ── O grupo Aberto continua de entrada direta pelo mesmo link ──────────
    await page.goto(`/groups/${publicId}`)
    const enter = page.getByRole("button", { name: "Entrar", exact: true })
    await expect(enter).toBeVisible()
    const entered = waitForGroupPost(page, publicId)
    await enter.click()
    await entered
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible({ timeout: 20_000 })
  })
})
