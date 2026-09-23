// NOME ACESSÍVEL DE FECHAR EM PORTUGUÊS — provado no DOM, nos três viewports.
//
// O defeito (auditoria de produção, 19/09/2026): o gatilho de fechar do
// compositor tinha `close="Close"` nos três viewports, numa interface inteira em
// pt-BR.
//
// A ORIGEM NÃO É O CHAMADOR. `@heroui/react` fixa o nome em inglês dentro do
// PRÓPRIO `CloseButton`
// (node_modules/@heroui/react/dist/components/close-button/close-button.js:21:
// `"aria-label": "Close"`). Nenhum arquivo deste app escreve essa string. Todo
// componente do HeroUI que monta um `CloseButton` sem rótulo próprio herda
// "Close" — e o `...rest` do fornecedor é espalhado DEPOIS do default, então um
// `aria-label` do chamador vence.
//
// A correção é no WRAPPER DA CASA (components/bivaque/close-button.tsx), que põe
// "Fechar" como default em 14 pontos de uma vez (11 modais + 3 buscas). Este
// spec prova o COMPORTAMENTO: que o default chega ao DOM e vira o nome
// acessível. A garantia de que nenhum ponto ficou de fora é asserção de fonte,
// em tests/unit/ui/nome-acessivel-de-fechar.test.ts — divisão de camadas da casa.
//
// O nome acessível NÃO é medido por atributo sozinho: `getByRole(button, {
// name })` resolve pela árvore de acessibilidade, que é o que um leitor de tela
// percorre.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import {
  CURRENT_CONSENT,
  encodeAuthCookieValue,
  readEnvLocal,
  seedSession,
} from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const VILA_OWNER_EMAIL = "dono-vila@bivaque.example.invalid"

async function signInAs(page: Page, email: string): Promise<void> {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? "bivaque-e2e-local"
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(`Password grant for ${email} failed with ${response.status()}`)
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

const VIEWPORTS = [
  { label: "375x812", width: 375, height: 812 },
  { label: "768x1024", width: 768, height: 1024 },
  { label: "1440x900", width: 1440, height: 900 },
] as const

test.setTimeout(180_000)

test.describe("o gatilho de fechar fala português", () => {
  for (const viewport of VIEWPORTS) {
    test(`compositor: o gatilho de fechar se chama "Fechar" em ${viewport.label}`, async ({
      page,
    }) => {
      // Given — a owner da vila, no tamanho medido
      await signInAs(page, VILA_OWNER_EMAIL)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      // /community virou encaminhamento (O06): o compositor abre pelo lançador da Home.
      await page.goto("/inicio")
      const ask = page.getByTestId("intent-pergunta")
      await expect(ask).toBeVisible({ timeout: 20000 })
      await ask.click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()

      // Then — o nome acessível resolvido pela árvore é "Fechar"
      await expect(dialog.getByRole("button", { name: "Fechar", exact: true })).toBeVisible()
      const trigger = dialog.locator('[data-slot="modal-close-trigger"]')
      await expect(trigger).toHaveAttribute("aria-label", "Fechar")

      // And — o rótulo inglês não existe em lugar nenhum da página
      await expect(page.getByRole("button", { name: "Close", exact: true })).toHaveCount(0)
    })
  }

  test("o botão de limpar a busca também fala português", async ({ page }) => {
    // Given — a tela de grupos, que monta SearchField.ClearButton. A de
    // comunidades tem o mesmo campo no código, mas a 375 ele não é renderizado
    // (o painel "Descobrir" não aparece nessa largura); grupos é alcançável.
    await seedSession(page.context())
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/groups")
    const busca = page.getByLabel("Buscar grupos")
    await expect(busca).toBeVisible({ timeout: 20000 })

    // When — há termo digitado, então o botão de limpar existe
    await busca.fill("vila")

    // Then — o botão de limpar do CAMPO tem nome acessível em português.
    // A asserção é escopada ao `search-field-group` de propósito: a própria
    // tela de grupos já tem um botão de texto "Limpar busca" (ação de filtro),
    // e uma consulta global por nome casaria com os dois — `getByRole` dentro do
    // grupo resolve pela árvore de acessibilidade, que é o que importa aqui.
    const limpar = page.locator('[data-slot="search-field-clear-button"]')
    await expect(limpar).toHaveCount(1)
    await expect(limpar).toHaveAttribute("aria-label", "Limpar busca")
    await expect(
      page
        .locator('[data-slot="search-field-group"]')
        .getByRole("button", { name: "Limpar busca", exact: true }),
    ).toHaveCount(1)

    // And — o rótulo inglês não existe em lugar nenhum da página
    await expect(page.getByRole("button", { name: "Close", exact: true })).toHaveCount(0)
  })
})
