import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// DS-021 — semântica nativa antes de contrato composto.
//
// Este spec provava o contrato APG (roving tabIndex, aria-controls, setas,
// Home/End) das pílulas do seletor de localidade em /localidade. As pílulas eram
// a interface da TRANSFERÊNCIA de cidade, e ela saiu com o F10 —
// F10-TROCA-PERFIL-PROPRIO (registro em .visual/cidade-consulta/RELATORIO.md).
// A tela de cidade agora é uma consulta de leitura (CIDADE-169): não há
// tablist, e o que existe são LINHAS que navegam.
//
// O contrato que restou é o que a tela de fato tem: cada linha é um <button>
// nativo (foco, Enter e Espaço vêm do navegador, não de um tablist inventado) e
// a ausência de tablist é deliberada. O que a transferência precisará de teclado
// volta com ela, no card dela.
//
// `import.meta.dirname` cannot be used here: Playwright transpiles specs
// to CJS, and the emitted `require` blows up at load time. All paths
// resolve from `process.cwd()`.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
/** Manaus tem UUID durável (20260802000100) e conteúdo de seed. */
const MANAUS = "00000000-0000-4000-8000-000000000001"

const TRANSFERRING_EMAIL =
  process.env["BIVAQUE_E2E_TRANSFERRING_EMAIL"] ?? "membro-transferencia@bivaque.example.invalid"

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
  const body = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
    token_type: string
  }

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
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

const LINHAS = '[data-tela="cidade"] [data-linha="lista"]'

async function abrirConsultaDeManaus(page: Page) {
  await signInAs(page, TRANSFERRING_EMAIL)
  await page.goto(`${APP_URL}/app/cidade/${MANAUS}`, { waitUntil: "load" })
  await expect(page.getByRole("heading", { name: "Manaus, AM" })).toBeVisible({ timeout: 15000 })
}

test.describe("DS-021 — contrato de teclado da consulta de cidade", () => {
  test("não existe tablist: a transferência saiu, e a tela é leitura", async ({ page }) => {
    await abrirConsultaDeManaus(page)
    await expect(page.getByRole("tablist")).toHaveCount(0)
    await expect(page.getByRole("tab")).toHaveCount(0)
  })

  test("cada linha é um botão nativo com nome acessível", async ({ page }) => {
    await abrirConsultaDeManaus(page)
    const primeira = page.locator(LINHAS).first()
    await expect(primeira).toBeVisible()
    // Botão de verdade: o teclado vem do navegador, sem tablist inventado.
    expect(await primeira.evaluate((elemento) => elemento.tagName)).toBe("BUTTON")
    await primeira.focus()
    await expect(primeira).toBeFocused()
    await expect(primeira.locator("[data-titulo-linha]")).toHaveText(/\S/)
  })

  test("Enter na linha abre o detalhe de sempre", async ({ page }) => {
    await abrirConsultaDeManaus(page)
    const primeira = page.locator(LINHAS).first()
    await primeira.focus()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/app\/(guia|evento|anuncio)\/.+$/)
  })
})
