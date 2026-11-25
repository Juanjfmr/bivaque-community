import { expect, type Page, test } from "@playwright/test"

/**
 * TROCA-005 — Meu negócio em abas: troca em `replace`, o pedido na Folha única e
 * o prestador respondendo com o estado gravado. HTTP controlado, como o resto da
 * bateria do app: o que a prova mede é a tela, não o banco (a persistência tem
 * o E2E da raiz). Cada fluxo roda no claro e no escuro — o escuro do app é
 * dormente e só acende por `data-tema` no documento.
 */

const TEMAS = ["claro", "escuro"] as const

const FICHA = "30000000-0000-4000-8000-000000000010"
const PEDIDO = "40000000-0000-4000-8000-0000000000b1"
const CONVERSA = "40000000-0000-4000-8000-0000000000b3"
const CATEGORIAS = [
  { id: "assistencia_tecnica", nome: "Assistência técnica" },
  { id: "pets", nome: "Pets" },
]

const ficha = {
  id: FICHA,
  nome: "Climatiza Manaus",
  categoria: "assistencia_tecnica",
  categoriaNome: "Assistência técnica",
  descricao: "Apoio prático para quem está chegando à cidade.",
  servicos: [],
  fotos: [],
}

const recebido = {
  id: PEDIDO,
  negocioId: FICHA,
  negocioNome: "Climatiza Manaus",
  categoriaNome: "Assistência técnica",
  descricao: "Limpar o ar-condicionado da sala",
  quando: "Nesta semana",
  situacao: "open",
  criadoEm: "2026-11-05T12:00:00Z",
  atualizadoEm: "2026-11-05T12:00:00Z",
  conversaId: CONVERSA,
  lado: "dono",
  bairro: "Centro",
  distanciaMetros: null,
}

async function ir(page: Page, caminho: string, tema: (typeof TEMAS)[number]) {
  await page.goto(caminho)
  if (tema === "escuro") {
    await page.evaluate(() => {
      document.documentElement.dataset["tema"] = "escuro"
    })
  }
}

async function montarNegocio(page: Page, tipoDaConta: "membro" | "prestador" = "membro") {
  await page.route(/\/api\/app\/negocio(?:\?|$)/, (rota) =>
    rota.fulfill({ json: { negocio: ficha, categorias: CATEGORIAS, tipoDaConta } }),
  )
}

for (const tema of TEMAS) {
  test.describe(`TROCA-005 — Meu negócio (${tema})`, () => {
    test("abre as abas, abre o pedido na Folha e responde vendo o estado gravado", async ({
      page,
    }) => {
      let situacao = "open"
      const mensagens: { id: string; minha: boolean; conteudo: string; criadoEm: string }[] = []

      await montarNegocio(page, "prestador")
      await page.route(/\/api\/app\/pedidos(?:\?|$)/, (rota) =>
        rota.fulfill({ json: { pedidos: [{ ...recebido, situacao }], proximo: null } }),
      )
      await page.route(/\/api\/app\/prestador\/atendimento$/, async (rota) => {
        if (rota.request().method() === "PATCH") {
          const corpo = rota.request().postDataJSON() as { ativo: boolean }
          return rota.fulfill({
            json: {
              atendimento: {
                temFicha: true,
                alcanceAtivo: corpo.ativo,
                comunidade: "Comunidade Manaus",
                cidade: "Manaus, AM",
              },
            },
          })
        }
        return rota.fulfill({
          json: {
            atendimento: {
              temFicha: true,
              alcanceAtivo: true,
              comunidade: "Comunidade Manaus",
              cidade: "Manaus, AM",
            },
          },
        })
      })
      await page.route(new RegExp(`/api/app/pedidos/${PEDIDO}/mensagens$`), async (rota) => {
        if (rota.request().method() === "POST") {
          const corpo = rota.request().postDataJSON() as { conteudo: string }
          situacao = "in_conversation"
          mensagens.push({
            id: "m-resposta",
            minha: true,
            conteudo: corpo.conteudo,
            criadoEm: "2026-11-05T12:10:00Z",
          })
          return rota.fulfill({ json: { pedido: { ...recebido, situacao }, mensagens } })
        }
        return rota.fulfill({ json: { pedido: { ...recebido, situacao }, mensagens } })
      })

      await ir(page, "/app/meu-negocio", tema)
      await expect(page.getByRole("heading", { name: "Meu negócio", level: 1 })).toBeVisible()

      await page.getByRole("button", { name: "Catálogo", exact: true }).click()
      await expect(page).toHaveURL(/\/app\/meu-negocio\?aba=catalogo$/)
      await expect(page.getByText("Publique o que você faz.")).toBeVisible()

      await page.getByRole("button", { name: "Pedidos", exact: true }).click()
      await expect(page).toHaveURL(/\/app\/meu-negocio\?aba=pedidos$/)
      await expect(page.getByText("Limpar o ar-condicionado da sala")).toBeVisible()

      // A área de atendimento vive na mesma aba e mostra o efeito real.
      await expect(page.getByText("Região atendida: Manaus, AM.")).toBeVisible()
      await expect(page.getByRole("checkbox", { name: /Comunidade Manaus/ })).toBeChecked()

      await page.locator('[data-linha="lista"]', { hasText: "Limpar o ar-condicionado" }).click()
      const folha = page.locator('[data-sobreposicao="pedido-do-negocio"]')
      await expect(folha).toBeVisible()
      await expect(folha.getByText("Nenhuma mensagem ainda.")).toBeVisible()

      await page.getByLabel("Resposta ao pedido").fill("Posso na quinta pela manhã.")
      await page.getByRole("button", { name: "Enviar resposta" }).click()
      await expect(folha.getByText("Resposta enviada.")).toBeVisible()
      await expect(folha.getByText("Posso na quinta pela manhã.")).toBeVisible()
      // O estado é o que o servidor devolveu, não o que a tela presumiu.
      await expect(folha.getByText("Em conversa")).toBeVisible()

      await page.getByRole("button", { name: "Fechar", exact: true }).click()
      await expect(page.locator('[data-sobreposicao="pedido-do-negocio"]')).toHaveCount(0)
    })

    test("a troca de aba é replace: o Voltar sai de Meu negócio, não volta de aba", async ({
      page,
    }) => {
      await montarNegocio(page)
      await ir(page, "/app/ajuda", tema)
      await expect(page.getByRole("heading", { name: "Ajuda", level: 1 })).toBeVisible()

      await ir(page, "/app/meu-negocio", tema)
      await expect(page.getByRole("heading", { name: "Meu negócio", level: 1 })).toBeVisible()
      await page.getByRole("button", { name: "Catálogo", exact: true }).click()
      await expect(page).toHaveURL(/\/app\/meu-negocio\?aba=catalogo$/)

      await page.goBack()
      await expect
        .poll(async () => new URL(page.url()).pathname, { timeout: 10_000 })
        .toBe("/app/ajuda")
    })

    test("o detalhe do pedido abre direto pela URL e a recarga reabre a Folha", async ({
      page,
    }) => {
      await montarNegocio(page)
      await page.route(/\/api\/app\/pedidos(?:\?|$)/, (rota) =>
        rota.fulfill({ json: { pedidos: [recebido], proximo: null } }),
      )
      await page.route(/\/api\/app\/prestador\/atendimento$/, (rota) =>
        rota.fulfill({
          json: {
            atendimento: {
              temFicha: true,
              alcanceAtivo: true,
              comunidade: "Comunidade Manaus",
              cidade: "Manaus, AM",
            },
          },
        }),
      )
      await page.route(new RegExp(`/api/app/pedidos/${PEDIDO}/mensagens$`), (rota) =>
        rota.fulfill({ json: { pedido: recebido, mensagens: [] } }),
      )

      await ir(page, `/app/meu-negocio?aba=pedidos&pedido=${PEDIDO}`, tema)
      const folha = page.locator('[data-sobreposicao="pedido-do-negocio"]')
      await expect(folha).toBeVisible()
      await expect(folha.getByText("Limpar o ar-condicionado da sala")).toBeVisible()

      await page.reload()
      await expect(page.locator('[data-sobreposicao="pedido-do-negocio"]')).toBeVisible()

      // B2 da revisão da correção 1: fechar tira o id da URL, e a recarga
      // seguinte não reabre a Folha que a pessoa fechou.
      await page.getByRole("button", { name: "Fechar", exact: true }).click()
      await expect(page).toHaveURL(/\/app\/meu-negocio\?aba=pedidos$/)
      await page.reload()
      await expect(page.locator('[data-sobreposicao="pedido-do-negocio"]')).toHaveCount(0)
    })

    test("o Voltar do navegador também tira o pedido da URL", async ({ page }) => {
      await montarNegocio(page)
      await page.route(/\/api\/app\/pedidos(?:\?|$)/, (rota) =>
        rota.fulfill({ json: { pedidos: [recebido], proximo: null } }),
      )
      await page.route(new RegExp(`/api/app/pedidos/${PEDIDO}/mensagens$`), (rota) =>
        rota.fulfill({ json: { pedido: recebido, mensagens: [] } }),
      )
      await ir(page, `/app/meu-negocio?aba=pedidos&pedido=${PEDIDO}`, tema)
      await expect(page.locator('[data-sobreposicao="pedido-do-negocio"]')).toBeVisible()
      await page.goBack()
      await expect(page.locator('[data-sobreposicao="pedido-do-negocio"]')).toHaveCount(0)
      await expect(page).toHaveURL(/\/app\/meu-negocio\?aba=pedidos$/)
      await page.reload()
      await expect(page.locator('[data-sobreposicao="pedido-do-negocio"]')).toHaveCount(0)
    })

    test("o membro sem página vê o caminho para a ficha, não um vazio", async ({ page }) => {
      // B3 da revisão da correção 1: `temFicha` é o da ficha lida em Meu negócio.
      await page.route(/\/api\/app\/negocio(?:\?|$)/, (rota) =>
        rota.fulfill({ json: { negocio: null, categorias: CATEGORIAS, tipoDaConta: "membro" } }),
      )
      await page.route(/\/api\/app\/pedidos(?:\?|$)/, (rota) =>
        rota.fulfill({ json: { pedidos: [], proximo: null } }),
      )
      await ir(page, "/app/meu-negocio?aba=pedidos", tema)
      await expect(page.getByRole("button", { name: "Ir para a ficha" })).toBeVisible()
      // A área de atendimento não é desta conta.
      await expect(page.getByText("Área de atendimento")).toHaveCount(0)
      await page.getByRole("button", { name: "Ir para a ficha" }).click()
      await expect(page).toHaveURL(/\/app\/meu-negocio$/)
      await expect(page.getByRole("heading", { name: "Criar a página" })).toBeVisible()
    })

    test("conta de membro vê o e-mail e não recebe um formulário que o banco recusa", async ({
      page,
    }) => {
      await montarNegocio(page, "membro")
      await page.route(/\/api\/app\/prestador\/conta$/, (rota) =>
        rota.fulfill({
          json: {
            conta: {
              email: "membro@example.invalid",
              temFicha: true,
              telefone: null,
              telefonePublico: false,
            },
          },
        }),
      )
      await ir(page, "/app/meu-negocio?aba=conta", tema)
      await expect(page.getByText("membro@example.invalid")).toBeVisible()
      await expect(
        page.getByText("O telefone na ficha pública é das contas de prestador."),
      ).toBeVisible()
      await expect(page.getByRole("button", { name: "Salvar conta" })).toHaveCount(0)
    })

    test("prestador abre direto a aba de pedidos e vê a área de atendimento", async ({ page }) => {
      await montarNegocio(page, "prestador")
      await page.route(/\/api\/app\/pedidos(?:\?|$)/, (rota) =>
        rota.fulfill({ json: { pedidos: [], proximo: null } }),
      )
      await page.route(/\/api\/app\/prestador\/atendimento$/, (rota) =>
        rota.fulfill({
          json: {
            atendimento: {
              temFicha: true,
              alcanceAtivo: true,
              comunidade: "Comunidade Manaus",
              cidade: "Manaus",
            },
          },
        }),
      )
      await ir(page, "/app/meu-negocio?aba=pedidos", tema)
      // O conteúdo do bloco, não só o título: com o esqueleto preso o título aparece.
      await expect(page.getByLabel("Atender membros de Comunidade Manaus")).toBeChecked()
    })

    test("a aba Conta mostra o e-mail da sessão e salva o telefone", async ({ page }) => {
      await montarNegocio(page, "prestador")
      let conta = {
        email: "prestador@example.invalid",
        temFicha: true,
        telefone: null as string | null,
        telefonePublico: false,
      }
      await page.route(/\/api\/app\/prestador\/conta$/, async (rota) => {
        if (rota.request().method() === "PATCH") {
          const corpo = rota.request().postDataJSON() as {
            telefone: string | null
            telefonePublico: boolean
          }
          conta = { ...conta, telefone: corpo.telefone, telefonePublico: corpo.telefonePublico }
        }
        return rota.fulfill({ json: { conta } })
      })

      await ir(page, "/app/meu-negocio?aba=conta", tema)
      await expect(page.getByText("prestador@example.invalid")).toBeVisible()
      await page.getByLabel("Telefone de contato (opcional)").fill("92999990000")
      await page.getByRole("checkbox", { name: "Mostrar meu telefone na ficha pública" }).check()
      await page.getByRole("button", { name: "Salvar conta" }).click()
      await expect(page.getByText("Conta salva.")).toBeVisible()
    })

    test("a falha principal da aba de pedidos é erro honesto, não lista vazia", async ({
      page,
    }) => {
      await montarNegocio(page)
      await page.route(/\/api\/app\/pedidos(?:\?|$)/, (rota) =>
        rota.fulfill({ status: 503, json: { erro: "leitura-indisponivel" } }),
      )
      await ir(page, "/app/meu-negocio?aba=pedidos", tema)
      await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible()
      await expect(page.getByText("Nenhum pedido recebido ainda.")).toHaveCount(0)
    })

    test("a aba Conta mostra a falha com nova tentativa quando o negócio não carrega", async ({
      page,
    }) => {
      let falhar = true
      await page.route(/\/api\/app\/negocio(?:\?|$)/, (rota) =>
        falhar
          ? rota.fulfill({ status: 503, json: { erro: "leitura-indisponivel" } })
          : rota.fulfill({
              json: { negocio: ficha, categorias: CATEGORIAS, tipoDaConta: "membro" },
            }),
      )
      await page.route(/\/api\/app\/prestador\/conta$/, (rota) =>
        rota.fulfill({
          json: {
            conta: {
              email: "membro@example.invalid",
              temFicha: true,
              telefone: null,
              telefonePublico: false,
            },
          },
        }),
      )
      await ir(page, "/app/meu-negocio?aba=conta", tema)
      const tentar = page.getByRole("button", { name: "Tentar de novo" })
      await expect(tentar).toBeVisible()
      falhar = false
      await tentar.click()
      await expect(page.getByText("membro@example.invalid")).toBeVisible()
    })
  })
}
