import { join } from "node:path"
import { expect, test } from "@playwright/test"

/**
 * F07 (RUN-177) — Meu negócio com HTTP controlado.
 *
 * Prova de interface do lote: a ficha nasce, é editada, publica um serviço e uma
 * foto, e a página pública abre. Não substitui o E2E do banco local (o
 * `f07-negocios-real.spec.ts` da raiz é quem prova a persistência).
 */
const FICHA = "30000000-0000-4000-8000-000000000010"
const FOTO = "30000000-0000-4000-8000-0000000000f1"
const NEGOCIO = "Climatiza Manaus"
const CATEGORIAS = [
  { id: "assistencia_tecnica", nome: "Assistência técnica" },
  { id: "pets", nome: "Pets" },
]

const servico = {
  id: "30000000-0000-4000-8000-0000000000a1",
  titulo: "",
  descricao: null as string | null,
}

test.describe("F07 — Meu negócio", () => {
  test("cria a ficha, edita, publica serviço e foto, e abre a página pública", async ({ page }) => {
    let ficha: Record<string, unknown> | null = null
    const servicos: (typeof servico)[] = []
    const fotos: { id: string; url: string; legenda: string | null }[] = []

    const negocioAtual = () => ({
      id: FICHA,
      nome: NEGOCIO,
      categoria: "assistencia_tecnica",
      categoriaNome: "Assistência técnica",
      descricao: ficha === null ? null : String(ficha["descricao"] ?? ""),
      servicos,
      fotos,
    })

    await page.route(/\/api\/app\/negocio(?:\?|$)/, async (rota) => {
      const metodo = rota.request().method()
      if (metodo === "GET")
        return rota.fulfill({ json: { negocio: ficha, categorias: CATEGORIAS } })
      const corpo = rota.request().postDataJSON() as Record<string, string>
      ficha = { nome: corpo["nome"], descricao: corpo["descricao"] ?? "" }
      return rota.fulfill({
        status: metodo === "POST" ? 201 : 200,
        json: { negocio: negocioAtual(), categorias: CATEGORIAS },
      })
    })
    await page.route(/\/api\/app\/negocio\/catalogo$/, async (rota) => {
      const corpo = rota.request().postDataJSON() as Record<string, string>
      servicos.push({
        id: servico.id,
        titulo: corpo["titulo"] ?? "",
        descricao: corpo["descricao"] ?? null,
      })
      return rota.fulfill({ status: 201, json: { servicos } })
    })
    await page.route(/\/api\/app\/negocio\/fotos$/, async (rota) => {
      fotos.push({ id: FOTO, url: "https://midia.example.invalid/assinada", legenda: "Acolhida" })
      return rota.fulfill({ status: 201, json: { fotos } })
    })
    await page.route(new RegExp(`/api/app/negocios/${FICHA}(?:\\?|$)`), (rota) =>
      rota.fulfill({
        json: {
          negocio: { ...negocioAtual(), cidade: "Manaus", podePedir: true, foto: null },
        },
      }),
    )

    await page.goto("/app/meu-negocio")
    await expect(page.getByRole("heading", { name: "Meu negócio", level: 1 })).toBeVisible()

    // Nome curto é recusado na tela, sem requisição.
    await page.getByLabel("Nome do negócio").fill("A")
    await page.getByRole("button", { name: "Criar minha página" }).click()
    await expect(page.getByRole("alert")).toContainText("entre 2 e 80")
    await expect(page.getByLabel("Nome do negócio")).toHaveValue("A")

    await page.getByLabel("Nome do negócio").fill(NEGOCIO)
    await page.getByLabel("Categoria").selectOption("assistencia_tecnica")
    await page
      .getByLabel("O que você oferece (opcional)")
      .fill("Apoio prático para quem está chegando à cidade.")
    await page.getByRole("button", { name: "Criar minha página" }).click()
    await expect(page.getByText("Sua página foi criada.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeVisible()

    // Editar mantém o dado gravado e devolve o aviso da ação.
    await page.getByLabel("O que você oferece (opcional)").fill("Atendimento acolhedor.")
    await page.getByRole("button", { name: "Salvar alterações" }).click()
    await expect(page.getByText("Sua página foi salva.")).toBeVisible()

    await page.getByLabel("Título do item").fill("Orientação para mudança")
    await page.getByRole("button", { name: "Publicar item", exact: true }).click()
    await expect(page.getByText("Serviço publicado.")).toBeVisible()
    await expect(page.locator('[data-lista="servicos"]')).toContainText("Orientação para mudança")

    await page.locator("#foto-legenda-nova").fill("Acolhida")
    await page
      .locator("#foto-arquivo")
      .setInputFiles(
        join(process.cwd(), "..", "web", "public", "landing", "hero-bivaque-arrival.webp"),
      )
    await expect(page.getByText("Foto publicada.")).toBeVisible()
    await expect(page.getByRole("img", { name: "Acolhida" })).toBeVisible()

    await page.getByRole("button", { name: "Ver página pública" }).click()
    await expect(page).toHaveURL(new RegExp(`/app/negocio/${FICHA}$`))
    await expect(page.getByRole("heading", { level: 1, name: NEGOCIO })).toBeVisible()
  })

  test("sem ficha, a leitura vazia não vira erro nem página inventada", async ({ page }) => {
    await page.route(/\/api\/app\/negocio(?:\?|$)/, (rota) =>
      rota.fulfill({ json: { negocio: null, categorias: CATEGORIAS } }),
    )
    await page.goto("/app/meu-negocio")
    await expect(page.getByRole("button", { name: "Criar minha página" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Ver página pública" })).toHaveCount(0)
  })

  test("falha de leitura tem saída própria, nunca um formulário em branco", async ({ page }) => {
    await page.route(/\/api\/app\/negocio(?:\?|$)/, (rota) =>
      rota.fulfill({ status: 503, json: { erro: "leitura-indisponivel" } }),
    )
    await page.goto("/app/meu-negocio")
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Criar minha página" })).toHaveCount(0)
  })
})

const RECEBIDO = "40000000-0000-4000-8000-0000000000b1"
const ENVIADO = "40000000-0000-4000-8000-0000000000b2"
const CONVERSA = "40000000-0000-4000-8000-0000000000b3"

test.describe("F07 — pedidos dos dois lados", () => {
  test("recebido e enviado aparecem separados, e o dono encerra com confirmação", async ({
    page,
  }) => {
    const recebido = {
      id: RECEBIDO,
      negocioId: FICHA,
      negocioNome: NEGOCIO,
      categoriaNome: "Assistência técnica",
      descricao: "Limpar o ar-condicionado da sala",
      quando: "Nesta semana",
      situacao: "open",
      criadoEm: "2026-11-05T12:00:00Z",
      atualizadoEm: "2026-11-05T12:00:00Z",
      conversaId: CONVERSA,
      lado: "dono",
    }
    const enviado = {
      ...recebido,
      id: ENVIADO,
      descricao: "Instalar suporte de TV",
      conversaId: null,
      lado: "solicitante",
    }
    let situacaoDoRecebido = "open"

    await page.route(/\/api\/app\/pedidos(?:\?|$)/, (rota) =>
      rota.fulfill({
        json: {
          pedidos: [{ ...recebido, situacao: situacaoDoRecebido }, enviado],
          proximo: null,
        },
      }),
    )
    await page.route(new RegExp(`/api/app/pedidos/${RECEBIDO}$`), async (rota) => {
      if (rota.request().method() === "GET")
        return rota.fulfill({ json: { pedido: { ...recebido, situacao: situacaoDoRecebido } } })
      const corpo = rota.request().postDataJSON() as { acao: string }
      if (corpo.acao !== "encerrar")
        return rota.fulfill({ status: 403, json: { erro: "recusado" } })
      situacaoDoRecebido = "closed"
      return rota.fulfill({ json: { pedido: { ...recebido, situacao: "closed" } } })
    })
    await page.route(new RegExp(`/api/app/conversas/${CONVERSA}(?:\\?|$)`), (rota) =>
      rota.fulfill({
        json: {
          conversa: {
            id: CONVERSA,
            titulo: NEGOCIO,
            participantes: [],
            mensagens: [],
            contexto: null,
          },
        },
      }),
    )

    await page.goto("/app/pedidos")
    const recebidos = page.locator('[data-secao="sim"]', { hasText: "Recebidos" }).first()
    await expect(recebidos).toContainText("Limpar o ar-condicionado da sala")
    await expect(page.getByText("Instalar suporte de TV")).toBeVisible()

    await page.locator('[data-linha="lista"]', { hasText: "Limpar o ar-condicionado" }).click()
    await expect(page).toHaveURL(new RegExp(`/app/pedido/${RECEBIDO}$`))
    await expect(page.getByText("Recebido", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancelar pedido" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Abrir conversa" })).toBeVisible()

    await page.getByRole("button", { name: "Encerrar pedido" }).click()
    const confirmacao = page.locator('[data-sobreposicao="confirmacao"]')
    await expect(confirmacao).toBeVisible()
    await expect(page.locator("[data-sobreposicao]")).toHaveCount(1)
    await confirmacao.getByRole("button", { name: "Encerrar pedido" }).click()
    await expect(page.getByText("Pedido encerrado.")).toBeVisible()
    await expect(page.getByText("Encerrado", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Encerrar pedido" })).toHaveCount(0)
  })
})
