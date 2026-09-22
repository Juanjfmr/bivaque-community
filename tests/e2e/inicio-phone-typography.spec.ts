// TIPOGRAFIA DA HOME NO TELEFONE — dois defeitos medidos a 375.
//
// (média) A faixa de retorno media h=125 com o título em QUATRO linhas numa
// coluna de 126 px, contra h=70 e uma linha de título a 768/1440. Causa: o
// rótulo do CTA ("Ver resposta") ocupava 127 px das 343 px da faixa e o
// `shrink-0` dele impedia qualquer recuo, então o texto ficava com 126 px.
// A prancha 00 painel 2 desenha, no telefone, só o chevron — sem o texto do CTA.
//
// (baixa) "Na comunidade" quebrava em duas linhas a 375 (h=56, w=103), contra
// uma linha a 768/1440 (h=28, w=126), porque o par Recentes/Acompanhando
// (~240 px) e o h2 (126 px) não cabem juntos nos ~343 px úteis.
//
// O que este spec prova é COMPORTAMENTO: quantas linhas o título ocupa, que o
// nome acessível do CTA sobrevive à mudança e que o alvo continua com 44 px.
// A régua do produto proíbe alvo abaixo de 44 px — encolher o CTA para um
// chevron sem `min-w-11` teria consertado a altura quebrando a acessibilidade.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

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

/** Linhas que um parágrafo ocupa: altura real dividida pela altura de linha
 *  computada. É a medida do defeito — "quatro linhas" era o sintoma. */
async function lineCount(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel)
    if (!element) throw new Error(`${sel} ausente`)
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
    return Math.round(element.getBoundingClientRect().height / lineHeight)
  }, selector)
}

test.setTimeout(180_000)

test.describe("tipografia da Home no telefone", () => {
  test('"Na comunidade" cabe em uma linha a 375', async ({ page }) => {
    // Given — a Home de membro ativo, com retorno e feed reais
    await signInAs(page, VILA_OWNER_EMAIL)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/inicio")
    const titulo = page.locator("#na-comunidade-titulo")
    await expect(titulo).toBeVisible({ timeout: 20000 })

    // Then — uma linha, não as duas do defeito
    expect(
      await lineCount(page, "#na-comunidade-titulo"),
      '"Na comunidade" tem de caber em uma linha a 375',
    ).toBe(1)
  })

  for (const size of [
    { w: 768, h: 1024 },
    { w: 1440, h: 900 },
  ]) {
    test(`"Na comunidade" continua em uma linha a ${size.w}`, async ({ page }) => {
      // O outro lado: o reparo não pode ter quebrado o arranjo largo, que é o
      // que a auditoria mediu como referência (h=28, w=126).
      await signInAs(page, VILA_OWNER_EMAIL)
      await page.setViewportSize({ width: size.w, height: size.h })
      await page.goto("/inicio")
      await expect(page.locator("#na-comunidade-titulo")).toBeVisible({ timeout: 20000 })
      expect(await lineCount(page, "#na-comunidade-titulo")).toBe(1)
    })
  }

  test("a faixa de retorno não espreme o texto a 375 e mantém o CTA acessível", async ({
    page,
  }) => {
    await signInAs(page, VILA_OWNER_EMAIL)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/inicio")

    // Given — a faixa existe (o seed garante uma notificação não-lida legível)
    const faixa = page.getByTestId("return-strip")
    await expect(faixa).toBeVisible({ timeout: 20000 })

    // Then — o título ocupa no máximo DUAS linhas. Era o sintoma: quatro linhas
    // numa coluna de 126 px.
    //
    // Duas linhas NÃO é piso físico da faixa. A justificativa anterior dizia que
    // empilhando o CTA a coluna ficaria com 267 px, e que por isso duas linhas
    // seriam o limite físico — a conta estava errada em 50 px. Medido: com a
    // faixa em `flex-direction: column` a coluna vai a 317 px, e o título, que
    // mede 309,44 px de largura natural, caberia em UMA linha. Duas linhas é o
    // piso do arranjo EM LINHA escolhido: com o CTA na mesma linha, a faixa de
    // 343 px gasta 24 de padding, 40 do avatar, 44 do alvo do CTA e 24 de dois
    // vãos de 12 px, sobrando 209 px medidos — e 309,44 px não cabem em 209.
    //
    // O arranjo empilhado não é a saída: ele leva a faixa a 175,25 px de altura,
    // contra os 86,5 px entregues (87 px arredondados). Os 87 px se defendem
    // porque a alternativa é PIOR — não porque duas linhas sejam um limite
    // físico. O que se cobra aqui é o piso do arranjo entregue.
    const linhasDoTitulo = await page.evaluate(() => {
      const faixaEl = document.querySelector('[data-testid="return-strip"]')
      if (!faixaEl) throw new Error("faixa ausente")
      const titulo = faixaEl.querySelector(".min-w-0 p")
      if (!titulo) throw new Error("título da faixa ausente")
      const lineHeight = Number.parseFloat(getComputedStyle(titulo).lineHeight)
      return Math.round(titulo.getBoundingClientRect().height / lineHeight)
    })
    expect(
      linhasDoTitulo,
      "o título da faixa tem de caber em até duas linhas a 375",
    ).toBeLessThanOrEqual(2)

    // And — o CTA continua nomeado e com alvo de 44 px, mesmo mostrando só o
    // chevron: o rótulo sai da tela, nunca da árvore de acessibilidade.
    const cta = faixa.getByRole("link", { name: /Ver (resposta|notificação)/ })
    await expect(cta).toBeVisible()
    const box = await cta.boundingBox()
    expect(box?.width ?? 0, "alvo do CTA com pelo menos 44 px de largura").toBeGreaterThanOrEqual(
      44,
    )
    expect(box?.height ?? 0, "alvo do CTA com pelo menos 44 px de altura").toBeGreaterThanOrEqual(
      44,
    )
  })
})
