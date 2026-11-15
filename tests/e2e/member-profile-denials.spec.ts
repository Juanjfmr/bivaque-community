// F10 (RUN-161) — perfil de outra pessoa no app.
//
// O perfil da web (`/profile/[userId]`) saiu: o endereço é 307 para
// `/app/perfil/<id>` (next.config.ts) e a tela do app lê
// `/api/app/membros/<id>` com a sessão da persona do seed. Contra o Next que
// serve `/app` e o Supabase local com seed. Pré-requisitos:
//   * banco local migrado e semeado (`supabase/seed.sql`);
//   * `npx pnpm@11.18.0 app:export` (o build do app em apps/web/public/app);
//   * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente.
//
// Ids reais do seed (nunca fixture do pgTAP): a persona padrão
// `visual@bivaque.example.invalid` é 20000000-…-0001 ("Ana Verificada"), em
// Manaus; "Carla Almeida" (30000000-…-0002) é uma das ~300 pessoas de Manaus;
// "Membro do Rio" (20000000-…-0003) está na segunda localidade. A pergunta
// 80000000-…-0f00 é da persona e tem respostas de outras pessoas
// (30000000-…-001a "Gabriela Barbosa"), que é a porta do nome linkado.
//
// O teste é de leitura: não grava nada, então não há estado a devolver.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

const OUTRA_CIDADE = "20000000-0000-4000-8000-000000000003"
const MESMA_CIDADE = "30000000-0000-4000-8000-000000000002"
const PERGUNTA_DA_PERSONA = "80000000-0000-4000-8000-000000000f00"
const AUTORA_DA_RESPOSTA = "Gabriela Barbosa"
const ID_DA_RESPOSTA = "30000000-0000-4000-8000-00000000001a"

test.describe("perfil de outra pessoa no app", () => {
  test("perfil de membro de outra cidade é página indisponível", async ({ page }) => {
    // Given a session of a member in the Manaus locality
    await seedSession(page.context())

    // When the viewer opens the profile of a member in the Rio locality
    await page.goto(`/profile/${OUTRA_CIDADE}`)

    // Then the old address lands in the app and the app says "unavailable" —
    // 404, never "sem acesso": a existência da pessoa também é privada.
    await expect(page).toHaveURL(new RegExp(`/app/perfil/${OUTRA_CIDADE}$`))
    await expect(page.locator('[data-tela="indisponivel"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("heading", { level: 2, name: "Publicações" })).toHaveCount(0)
  })

  test("perfil de membro da mesma cidade abre com o nome do perfil", async ({ page }) => {
    // Given a session
    await seedSession(page.context())

    // When the viewer opens the profile of a member in the same (Manaus) locality
    await page.goto(`/profile/${MESMA_CIDADE}`)

    // Then the app shows the profile with the display name — and nothing of the
    // BLOCK-AFFILIATION boundary (no affiliation section, no city, no counters).
    await expect(page).toHaveURL(new RegExp(`/app/perfil/${MESMA_CIDADE}$`))
    await expect(page.getByRole("heading", { level: 1, name: /Carla Almeida/ })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.locator('[data-tela="perfil"]')).not.toContainText("Afiliação declarada")
    await expect(page.getByRole("heading", { level: 2, name: "Publicações" })).toBeVisible()
  })

  test("o nome de quem respondeu abre o perfil dela", async ({ page }) => {
    // Given a session and a question with a reply from another member
    await seedSession(page.context())
    await page.goto(`/app/pergunta/${PERGUNTA_DA_PERSONA}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Alguém conhece um bom encanador?" }),
    ).toBeVisible({ timeout: 30_000 })

    // When the viewer follows the author's name
    await page
      .locator('[data-tela="pergunta"]')
      .getByRole("button", { name: AUTORA_DA_RESPOSTA })
      .click()

    // Then the profile of that person opens
    await expect(page).toHaveURL(new RegExp(`/app/perfil/${ID_DA_RESPOSTA}$`))
    await expect(page.getByRole("heading", { level: 1, name: AUTORA_DA_RESPOSTA })).toBeVisible({
      timeout: 30_000,
    })
  })
})
