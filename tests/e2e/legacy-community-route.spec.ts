// RUN-004 / O06 — `/community` é compatibilidade, não tela.
//
// A rota antiga renderizava o feed legado e usava `?post=<id>` para rolar até o
// card. O contrato manda encaminhar e migrar os produtores. O destino do id NÃO
// é `/publicacoes/[id]`: essa rota lê `recommendation_requests`, e `?post=`
// sempre carregou um id de `public.posts` (a notificação `comment` grava
// target_type 'post'). Enquanto `posts` não tiver rota de detalhe, o destino
// honesto é o feed de `/inicio`, com o mesmo foco de antes.
//
// O que estes testes observam de fora, no navegador: a rota nunca renderiza
// feed, o parâmetro estranho não vira conteúdo alheio, e o permalink continua
// levando à publicação real.
import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

// Post da cidade escrito no seed de desenvolvimento (supabase/seed.sql:1019),
// visível para a conta que seedSession() autentica.
const SEED_POST_ID = "80000000-0000-4000-8000-000000000f01"
const UNKNOWN_POST_ID = "11111111-1111-4111-8111-111111111111"

test.describe("/community encaminha em vez de renderizar", () => {
  test("sem parâmetro, o membro termina no início", async ({ page }) => {
    await seedSession(page.context())

    await page.goto("/community")

    await expect(page).toHaveURL(/\/inicio$/)
  })

  test("com id canônico, o permalink chega ao feed com o parâmetro preservado", async ({
    page,
  }) => {
    await seedSession(page.context())

    await page.goto(`/community?post=${SEED_POST_ID}`)

    await expect(page).toHaveURL(new RegExp(`/inicio\\?post=${SEED_POST_ID}$`))
    await expect(page.getByRole("heading", { name: "Na comunidade" })).toBeVisible({
      timeout: 20_000,
    })
  })

  test("id sem registro legível não foca nem informa que o post existe", async ({ page }) => {
    await seedSession(page.context())

    await page.goto(`/community?post=${UNKNOWN_POST_ID}`)

    await expect(page).toHaveURL(new RegExp(`/inicio\\?post=${UNKNOWN_POST_ID}$`))
    // O feed carrega normalmente; nada anuncia o id inexistente.
    await expect(page.getByRole("heading", { name: "Na comunidade" })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText(UNKNOWN_POST_ID)).toHaveCount(0)
  })

  test("vazio, malformado ou repetido termina no início, sem parâmetro e sem feed antigo", async ({
    page,
  }) => {
    await seedSession(page.context())

    const values = [
      "",
      "nao-e-uuid",
      `${SEED_POST_ID}0`,
      "../../../etc/passwd",
      "//exemplo.invalid",
      `${SEED_POST_ID}&post=${UNKNOWN_POST_ID}`,
    ]
    for (const value of values) {
      await page.goto(`/community?post=${value}`)
      await expect(page, `post=${value}`).toHaveURL(/\/inicio$/)
    }
  })
})
