// O PRIMÁRIO DO COMPOSITOR TEM DE SER ALCANÇÁVEL E CLICÁVEL EM TODOS OS
// VIEWPORTS — provado por HIT-TEST, nunca por aritmética.
//
// O defeito (auditoria de produção, 19/09/2026): o botão "Publicar" era o
// último filho de `Modal.Body`, que é `overflow-y-auto` dentro de um diálogo
// `max-h-full`. Com o primário no fim da área que rola, o CENTRO dele cai fora
// da caixa visível do corpo e `document.elementFromPoint(cx, cy)` resolve para
// o que está pintado naquele ponto — não para o botão. Medido no `dono-vila`
// antes do reparo, no HEAD b04ec4c:
//
//   375x568  scrollTop 123..184  →  top = BUTTON.button--tertiary | Cancelar
//   375x568  scrollTop    0      →  top = null (centro abaixo da viewport)
//   375x667  scrollTop  36..73   →  top = BUTTON.button--tertiary | Cancelar
//   375x667  scrollTop   18      →  top = SECTION.modal__dialog--scroll-inside
//   375x812, 768x1024, 1440x900  →  limpo (é por isso que passou dois ciclos:
//                                   375x812 é a altura do projeto e2e)
//
// Rolagem interna exigida só para ALCANÇAR o primário, medida como a diferença
// entre o pé do botão e o pé do corpo: 204 px a 375x568 e 105 px a 375x667.
//
// POR QUE HIT-TEST E NÃO ARITMÉTICA DE VIEWPORT: foi a aritmética que deixou
// este defeito passar. `boundingBox` + `scrollHeight` descrevem onde o elemento
// ESTÁ no layout, não o que o navegador ENTREGA no ponto — e um botão recortado
// por `overflow` continua com geometria plausível. Uma rodada anterior chegou a
// medir "0 px, visível" enquanto o hit-test dizia "Cancelar".
//
// POR QUE `click({ trial: true })` NÃO SERVE DE GUARDA: ele rola o container
// aninhado até o elemento antes de checar actionability, então passa verde no
// código defeituoso (confirmado no HEAD b04ec4c). A guarda tem de medir o estado
// em que a pessoa realmente está: sem rolagem programática nenhuma.
//
// Três viewports do contrato + as duas alturas de telefone onde o defeito vivia.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
// A mesma persona de publish-golden-slice.spec.ts ao lado: /community só
// renderiza feed quando quem olha tem comunidade primária, e o compositor abre
// a partir do feed da vila.
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

/** Abre o compositor pela vila e habilita o primário escrevendo a pergunta —
 *  é o estado em que a pessoa clica (desabilitado, `elementFromPoint` ainda
 *  devolveria o botão e a prova não diria nada sobre o clique). */
async function openComposer(page: Page): Promise<void> {
  await page.goto("/community")
  await expect(page.getByRole("heading", { name: "Vila Ajuricaba" })).toBeVisible({
    timeout: 20000,
  })
  await page.getByRole("button", { name: "Publicar" }).first().click()
  // O compositor mora na rota estável /publicacoes/nova (R24), não num modal.
  await page.waitForURL(/\/publicacoes\/nova/, { timeout: 15000 })
  const composer = page.locator("[data-composer-form]")
  await expect(composer).toHaveAttribute("data-draft-ready", "true", { timeout: 15000 })
  await composer.getByLabel("Pergunta").fill("sonda de hit-test")
  // A lista de destinos é consulta: esperar o aviso assentar deixa o layout
  // estável antes de medir o ponto.
  await expect(page.getByTestId("audience-notice")).not.toBeEmpty({ timeout: 15000 })
  // Numa PÁGINA, chegar ao fim do formulário rolando a própria janela é o
  // caminho normal. A janela rola só até o primário ENTRAR pela borda de baixo
  // — a posição em que a pessoa o encontra rolando —, e só ela: sem
  // centralizar o botão (isso esconderia uma barra fixa inferior cobrindo-o) e
  // sem rolar contêiner interno — `scrollableAncestors` abaixo continua
  // exigindo zero rolagem interna.
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="publish-submit"]')
    if (!button) throw new Error("publish-submit não está no DOM")
    const overflow = button.getBoundingClientRect().bottom - window.innerHeight
    if (overflow > 0) window.scrollBy(0, Math.ceil(overflow) + 1)
  })
}

const VIEWPORTS = [
  { label: "375x568", width: 375, height: 568 },
  { label: "375x667", width: 375, height: 667 },
  { label: "375x812", width: 375, height: 812 },
  { label: "768x1024", width: 768, height: 1024 },
  { label: "1440x900", width: 1440, height: 900 },
] as const

test.setTimeout(180_000)

test.describe("o primário do compositor é alcançável e clicável", () => {
  for (const viewport of VIEWPORTS) {
    test(`hit-test do centro do primário em ${viewport.label}`, async ({ page }) => {
      // Given — sessão da owner aprovada da Vila Ajuricaba, no tamanho medido
      await signInAs(page, VILA_OWNER_EMAIL)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      // When — o compositor abre e o primário fica habilitado, SEM rolagem
      // programática: o estado em que a pessoa encontra a tela.
      await openComposer(page)

      // Then — o ponto central do primário resolve para o próprio botão (ou um
      // descendente dele), que é o que "clicável" significa no navegador.
      const probe = await page.evaluate(() => {
        const button = document.querySelector('[data-testid="publish-submit"]')
        if (!button) throw new Error("publish-submit não está no DOM")
        const rect = button.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const top = document.elementFromPoint(cx, cy)

        // Qualquer ancestral que role e transborde é rolagem interna exigida
        // para ALCANÇAR o primário. `documentElement` fica de fora: a página
        // atrás do modal não é a área que rola do compositor.
        const scrollableAncestors: string[] = []
        let node: HTMLElement | null = button.parentElement
        while (node && node !== document.documentElement) {
          const style = getComputedStyle(node)
          if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
            scrollableAncestors.push(
              `${node.tagName.toLowerCase()}.${typeof node.className === "string" ? node.className : ""}`.trim(),
            )
          }
          node = node.parentElement
        }

        return {
          cx: Math.round(cx),
          cy: Math.round(cy),
          inViewport:
            rect.top >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.left >= 0 &&
            rect.right <= window.innerWidth,
          hitSelf: top !== null && (top === button || button.contains(top)),
          top: top
            ? `${top.tagName.toLowerCase()}.${typeof top.className === "string" ? top.className : ""}|${top.getAttribute("data-testid") ?? ""}|${(top.textContent ?? "").trim().slice(0, 24)}`
            : "null",
          scrollableAncestors,
        }
      })

      expect(
        probe.inViewport,
        `o primário tem de estar inteiro na viewport em ${viewport.label}`,
      ).toBe(true)
      expect(
        probe.top,
        `elementFromPoint(${probe.cx}, ${probe.cy}) em ${viewport.label} tem de resolver para o próprio primário`,
      ).toContain("|publish-submit|")
      expect(probe.hitSelf, `o topo no centro tem de ser o primário em ${viewport.label}`).toBe(
        true,
      )
      expect(
        probe.scrollableAncestors,
        `nenhuma rolagem interna pode ser exigida para alcançar o primário em ${viewport.label}`,
      ).toEqual([])
    })
  }
})
