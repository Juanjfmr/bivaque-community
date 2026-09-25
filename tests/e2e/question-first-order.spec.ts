// A PERGUNTA VEM ANTES DO RESTO — em TODAS as superfícies onde o produto pede
// a intenção e depois pede outra coisa antes do conteúdo.
//
// A classe (auditoria de produção, 19/09/2026): uma decisão SOBRE o conteúdo
// tomava a frente do conteúdo. Não são dois alvos isolados — é a mesma classe
// em três lugares, e tratar o alvo em vez da classe foi o que produziu as
// falhas de escopo desta frente.
//
//   1. Compositor de publicação (feed-post-create.tsx). O cabeçalho do próprio
//      arquivo declara "a PERGUNTA primeiro, depois destino real", e o código
//      não cumpria: o seletor de público renderizava antes. Ordem medida:
//      ["Toda a cidade · Manaus", "Vila Ajuricaba", "Pergunta *", "Detalhes",
//      "Anexar"]. O commit 0023e0d tirou o seletor de FORMATO da frente e
//      escreveu essa frase no cabeçalho, mas o seletor de PÚBLICO ficou.
//   2. Formulário comunitário (/recommendations?aba=request), a 375. Liderava
//      por "Categoria" e "Para qual comunidade você está perguntando?" antes de
//      "O que você procura". A prancha 45 painel 2 desenha a pergunta primeiro,
//      com categoria e alcance descendo para depois dela.
//   3. Sugerir referência (/guide/sugerir). Liderava por "Tipo de referência"
//      antes de "Nome". A prancha 44 painel 3 desenha "Nome" primeiro.
//      (AMPLIAÇÃO: esta terceira superfície não estava nomeada no brief; entrou
//      porque a correção é por classe.)
//
// Por que ORDEM no DOM e não texto de fonte: ordem é o que a pessoa encontra na
// tela e o que o hit-test e o leitor de tela percorrem. `compareDocumentPosition`
// é a mesma relação que um leitor de tela usa — leitura de fonte não distingue
// "declarado no arquivo" de "renderizado nesta ordem".

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

/** true quando `before` aparece ANTES de `after` na ordem do documento. */
async function precedes(page: Page, before: string, after: string): Promise<boolean> {
  return page.evaluate(
    ([beforeId, afterId]) => {
      const a = document.getElementById(beforeId)
      const b = document.getElementById(afterId)
      if (!a || !b) {
        throw new Error(`elemento ausente: ${!a ? beforeId : afterId}`)
      }
      return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    },
    [before, after],
  )
}

test.setTimeout(180_000)

test.describe("a pergunta vem antes do resto", () => {
  test("compositor: pergunta antes do seletor de público", async ({ page }) => {
    // Given — a owner da vila, que é quem tem feed onde publicar
    await signInAs(page, VILA_OWNER_EMAIL)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/community")
    await expect(page.getByRole("heading", { name: "Vila Ajuricaba" })).toBeVisible({
      timeout: 20000,
    })
    await page.getByRole("button", { name: "Publicar" }).first().click()
    // O compositor mora na rota estável /publicacoes/nova (R24), não num modal.
    await page.waitForURL(/\/publicacoes\/nova/, { timeout: 15000 })
    await expect(page.locator("[data-composer-form]")).toBeVisible()
    // A lista de destinos é consulta: sem esperar, o grupo "Quem pode ver?"
    // pode ainda não estar no DOM e a comparação viraria erro de ausência.
    await expect(page.getByTestId("audience-notice")).not.toBeEmpty({ timeout: 15000 })

    // Then — o campo da pergunta precede o grupo de destino
    expect(
      await precedes(page, "post-conteudo", "audience-heading"),
      'a pergunta tem de vir antes de "Quem pode ver?"',
    ).toBe(true)

    // And — o primeiro campo rotulado do compositor é a pergunta, não o destino
    const firstField = await page.evaluate(() => {
      const composer = document.querySelector("[data-composer-form]")
      if (!composer) throw new Error("compositor ausente")
      const labels = Array.from(composer.querySelectorAll("label, legend, [id$='-heading']"))
      return (labels[0]?.textContent ?? "").replace(/\s+/g, " ").trim()
    })
    // Na rota o rótulo visível do campo da pergunta é "Qual é a sua pergunta?".
    // A frase exata, e não /pergunta/i: a legenda "Anexar à pergunta" também
    // casaria e esconderia o anexo voltando para antes da pergunta.
    expect(firstField).toContain("Qual é a sua pergunta?")
  })

  test("formulário comunitário: pergunta antes de categoria e alcance", async ({ page }) => {
    // Given — a sessão autenticada e a aba de pedido
    await seedSession(page.context())
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/recommendations?aba=request")
    await expect(page.getByRole("heading", { name: /Antes de perguntar/ })).toBeVisible({
      timeout: 20000,
    })

    // When — a pessoa declara que não encontrou e vai perguntar à comunidade
    await page.getByRole("button", { name: /Perguntar à comunidade/ }).click()
    await expect(page.getByRole("heading", { name: "Perguntar à comunidade" })).toBeVisible()
    await expect(page.locator("#pedido-titulo")).toBeVisible()

    // Then — "O que você procura?" precede Categoria e Alcance
    expect(
      await precedes(page, "pedido-titulo", "pedido-categoria-label"),
      'a pergunta tem de vir antes de "Categoria"',
    ).toBe(true)
    expect(
      await precedes(page, "pedido-titulo", "pedido-alcance-label"),
      'a pergunta tem de vir antes de "Para qual comunidade você está perguntando?"',
    ).toBe(true)

    // And — a descrição continua DEPOIS da pergunta, na ordem da prancha
    expect(await precedes(page, "pedido-titulo", "pedido-descricao")).toBe(true)
  })

  test("sugerir referência: nome antes do tipo", async ({ page }) => {
    // Given — a sessão autenticada na tela de sugestão
    await seedSession(page.context())
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/guide/sugerir")
    await expect(page.getByRole("heading", { name: "Sugerir referência" })).toBeVisible({
      timeout: 20000,
    })

    // Then — "Nome" precede "Tipo de referência" (prancha 44 painel 3)
    await expect(page.locator("#sugestao-nome")).toBeVisible()
    await expect(page.locator("#sugestao-categoria")).toBeVisible()
    expect(
      await precedes(page, "sugestao-nome", "sugestao-categoria"),
      'o nome tem de vir antes de "Tipo de referência"',
    ).toBe(true)
  })
})
