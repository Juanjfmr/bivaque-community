import { expect, test } from "@playwright/test"

const POST = {
  id: "post-atual",
  grupoId: "g-pets",
  texto: "Publicação atual",
  criadaEm: "2026-11-08T10:00:00.000Z",
  autor: "Ana",
  propria: false,
  comentarios: 0,
  uteis: 0,
  util: false,
  salva: false,
  oculta: false,
  fotos: [],
}
const GRUPO = {
  id: "g-pets",
  nome: "Pets de Manaus",
  descricao: "Conversas de animais.",
  regras: "Respeito.",
  fechado: false,
  membro: true,
  pendente: false,
  admin: false,
  membros: 20,
  fixada: null,
}

const ANUNCIO = {
  id: "anuncio-a",
  tipo: "item",
  titulo: "Mesa de jantar",
  descricao: "Mesa conservada para retirada no Centro.",
  precoCents: 45000,
  deal: null,
  bairro: "Centro",
  cidade: "Manaus",
  status: "active",
  condicao: "used",
  categoria: "casa_moveis",
  quartos: null,
  tipoImovel: null,
  areaM2: null,
  condoFeeCents: null,
  foto: null,
  criadoEm: "2026-11-08T10:00:00.000Z",
}

test("grupo: página antiga não invade a nova ordenação", async ({ page }) => {
  let liberar: () => void = () => {
    throw new Error("A página não começou")
  }
  const espera = new Promise<void>((resolver) => {
    liberar = resolver
  })
  let paginaPedida = false
  let paginaLiberada = false

  await page.route(/\/api\/app\/grupos\/g-pets\?/, async (rota) => {
    const url = new URL(rota.request().url())
    const ordem = url.searchParams.get("ordem")
    if (url.searchParams.has("depois")) {
      paginaPedida = true
      await espera
      paginaLiberada = true
      await rota
        .fulfill({
          json: {
            grupo: GRUPO,
            publicacoes: [{ ...POST, id: "post-antigo", texto: "Página obsoleta" }],
            proximo: null,
          },
        })
        .catch(() => {})
      return
    }
    await rota.fulfill({
      json: {
        grupo: GRUPO,
        publicacoes: [
          {
            ...POST,
            id: ordem === "discutidas" ? "post-discutido" : "post-recente",
            texto: ordem === "discutidas" ? "Discussão atual" : "Mais recente",
          },
        ],
        proximo: ordem === "discutidas" ? null : "cursor-anterior",
      },
    })
  })

  await page.goto("/app/grupo/g-pets")
  await expect(page.getByText("Mais recente")).toBeVisible()
  await page.getByRole("button", { name: "Ver mais publicações" }).click()
  await expect.poll(() => paginaPedida).toBe(true)
  await page.getByRole("button", { name: "Mais discutidas" }).click()
  await expect(page.getByText("Discussão atual")).toBeVisible()
  liberar()
  await expect.poll(() => paginaLiberada).toBe(true)
  await expect(page.getByText("Página obsoleta")).toHaveCount(0)
  await expect(page.getByText("Mais recente")).toHaveCount(0)
})

test("meus anúncios: releitura após edição descarta página antiga", async ({ page }) => {
  let liberar: () => void = () => {
    throw new Error("A página não começou")
  }
  const espera = new Promise<void>((resolver) => {
    liberar = resolver
  })
  let paginaPedida = false
  let paginaLiberada = false
  let alterado = false

  await page.route(/\/api\/app\/mercado\/meus(?:\?|$)/, async (rota) => {
    const url = new URL(rota.request().url())
    if (url.searchParams.has("depois")) {
      paginaPedida = true
      await espera
      paginaLiberada = true
      await rota
        .fulfill({
          json: {
            anuncios: [{ ...ANUNCIO, id: "anuncio-antigo", titulo: "Página obsoleta" }],
            proximo: null,
            cidade: "Manaus",
          },
        })
        .catch(() => {})
      return
    }
    await rota.fulfill({
      json: {
        anuncios: [alterado ? { ...ANUNCIO, titulo: "Mesa atualizada" } : ANUNCIO],
        proximo: alterado ? null : "cursor-anterior",
        cidade: "Manaus",
      },
    })
  })
  await page.route(/\/api\/app\/mercado\/anuncio-a$/, async (rota) => {
    if (rota.request().method() !== "PATCH") return rota.continue()
    alterado = true
    await rota.fulfill({ json: { anuncio: { id: ANUNCIO.id } } })
  })

  await page.goto("/app/meus-anuncios")
  await expect(page.getByText("Mesa de jantar")).toBeVisible()
  await page.getByRole("button", { name: "Ver mais anúncios" }).click()
  await expect.poll(() => paginaPedida).toBe(true)
  await page.locator('[data-acao="gerenciar-anuncio"]').click()
  await page.locator('[data-gerenciar-anuncio] [data-acao="salvar-edicao"]').click()
  await expect(page.getByText("Mesa atualizada")).toBeVisible()
  liberar()
  await expect.poll(() => paginaLiberada).toBe(true)
  await expect(page.getByText("Página obsoleta")).toHaveCount(0)
  await expect(page.getByText("Mesa de jantar", { exact: true })).toHaveCount(0)
})
