import {
  request as apiRequest,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test"
import {
  chaveAnonimaDoSupabase,
  MEMBRO_SEMEADO,
  semearSessaoDeMembro,
  urlDoSupabase,
} from "./entrada-real-ajuda"

// F06 — o Mercado do app lendo e gravando no banco de verdade (LAN-F06,
// molde do F05). Prova a jornada inteira: entrada, a lista real da cidade, o
// detalhe, "Tenho interesse" gravando a conversa no banco e as falhas.
//
// Contra o Next que serve `/app` e o Supabase local com seed. Pré-requisitos:
//   * banco local migrado e semeado (supabase/seed.sql);
//   * `npx pnpm@11.18.0 app:export` (o build do app em apps/web/public/app);
//   * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente.
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/f06-mercado-real.spec.ts
//
// @stateful: abre conversa de anúncio com a persona do seed; roda no lote
// serial (`--workers=1`). A abertura é idempotente (open_conversation), então
// as três larguras reaproveitam a mesma conversa em série.

/** Anúncio legível de Gabriela, bloqueada pelo titular no seed. */
const ITEM_ATIVO_DE_TERCEIRO = "b1000000-0000-4000-8000-000000000004"

// Heitor não está em dm_blocks: open_conversation recusa Gabriela com 42501.
const ITEM_ATIVO_PARA_INTERESSE = "b1000000-0000-4000-8000-000000000005"

/** Item pausado do próprio titular (20000000-…0001 = a persona do teste). */
const ITEM_PAUSADO_DO_TITULAR = "b1000000-0000-4000-8000-000000000002"

const TITULOS_DOS_DESAPEGOS_ATIVOS = [
  "Mesa de jantar com 6 cadeiras",
  "Berço portátil desmontável",
  "Notebook 14 polegadas, 8 GB",
  "Ar-condicionado 9.000 BTUs",
] as const

/** Os itens que o titular tem fora da grade: pausado e reservado. */
const TITULOS_FORA_DA_GRADE = [
  "Bicicleta aro 29 com câmbio",
  "Furadeira de impacto com maleta",
] as const

const APARTAMENTO = "Apartamento 2 quartos no Centro"
const CASA = "Casa 3 quartos com quintal"

/** Imóvel de outra pessoa no seed (`30000000-…-001b`): serve à negativa do PATCH. */
const IMOVEL_DE_TERCEIRO = "b2000000-0000-4000-8000-000000000001"

/**
 * O token da sessão semeada, lido do próprio cookie que o app usa. O PostgREST
 * autentica por `Authorization: Bearer`; a leitura do banco pela mesma pessoa
 * passa por aqui, sob RLS — o mesmo caminho do F05.
 */
async function tokenDaSessao(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find((item) => /^sb-.*-auth-token$/.test(item.name))
  if (cookie === undefined) throw new Error("a sessão semeada não está nos cookies")
  const sessao = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString("utf8"),
  ) as { access_token?: string }
  if (typeof sessao.access_token !== "string") throw new Error("cookie de sessão sem token")
  return sessao.access_token
}

async function entrarComo(context: BrowserContext, email: string): Promise<void> {
  await semearSessaoDeMembro(context, email)
}

function cartao(page: Page, titulo: string) {
  return page.locator('[data-tela="desapegos"] [data-cartao="anuncio"]', { hasText: titulo })
}

test.describe("F06 — mercadoria real no app", { tag: "@stateful" }, () => {
  test("a grade lista os desapegos e imóveis reais da cidade", async ({ page, context }) => {
    test.setTimeout(180_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.goto("/app/desapegos")
    await expect(
      page.getByRole("heading", { level: 1, name: "Desapegos" }),
      "o Mercado real não está servido em /app/desapegos: rode `npx pnpm@11.18.0 app:export`",
    ).toBeVisible({ timeout: 30_000 })

    // O cabeçalho diz a cidade que a rota devolveu, não a da demonstração.
    await expect(page.getByText("O que a comunidade de Manaus está anunciando.")).toBeVisible()

    for (const titulo of TITULOS_DOS_DESAPEGOS_ATIVOS) {
      await expect(cartao(page, titulo), `desapego ativo ausente: ${titulo}`).toBeVisible({
        timeout: 30_000,
      })
    }
    for (const titulo of TITULOS_FORA_DA_GRADE) {
      await expect(
        cartao(page, titulo),
        `pausado/reservado do titular não entra na grade: ${titulo}`,
      ).toHaveCount(0)
    }

    // Aba de imóveis: os 2 do seed, com o preço efetivo do satélite
    // (rent_cents → aluguel "/ mês"; sale_price_cents → venda sem "/ mês").
    await page.goto("/app/imoveis")
    await expect(page.getByRole("heading", { level: 1, name: "Imóveis" })).toBeVisible({
      timeout: 30_000,
    })

    const apartamento = page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]', {
      hasText: APARTAMENTO,
    })
    await expect(apartamento).toBeVisible({ timeout: 30_000 })
    await expect(apartamento).toContainText(/1\.800/)
    await expect(apartamento).toContainText("mês")

    const casa = page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]', {
      hasText: CASA,
    })
    await expect(casa).toBeVisible({ timeout: 30_000 })
    await expect(casa).toContainText(/450\.000/)
    await expect(casa.getByText("mês")).toHaveCount(0)
  })

  test("o detalhe mostra o anúncio real com localização aproximada", async ({ page, context }) => {
    test.setTimeout(120_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.goto(`/app/anuncio/${ITEM_ATIVO_DE_TERCEIRO}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Berço portátil desmontável" }),
    ).toBeVisible({ timeout: 30_000 })

    // Preço, descrição e quem anuncia vêm do banco.
    await expect(page.locator('[data-tela="anuncio"]')).toContainText(/R\$\s*250/)
    await expect(page.getByText("Usado por um ano, colchão incluso.")).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "Quem está anunciando" }),
    ).toBeVisible()
    await expect(page.locator('[data-tela="anuncio"]')).toContainText("Gabriela Barbosa")

    // Localização aproximada = bairro + cidade, nunca o endereço exato.
    await expect(
      page.getByRole("heading", { level: 2, name: "Localização aproximada" }),
    ).toBeVisible()
    await expect(page.getByText("Flores, Manaus")).toBeVisible()
    await expect(page.getByText("O endereço exato pode ser combinado na conversa.")).toBeVisible()
  })

  test("Tenho interesse grava a conversa no banco e a tela não é otimista", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.goto(`/app/anuncio/${ITEM_ATIVO_PARA_INTERESSE}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Notebook 14 polegadas, 8 GB" }),
    ).toBeVisible({ timeout: 30_000 })

    const resposta = page.waitForResponse(
      (r) => r.url().includes("/interesse") && r.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Tenho interesse" }).click()
    await page.getByRole("button", { name: "Abrir conversa", exact: true }).click()
    const enviada = await resposta
    const corpo = (await enviada.json()) as { conversaId: string }
    expect(enviada.status(), JSON.stringify(corpo)).toBe(200)
    const { conversaId } = corpo
    expect(conversaId).toMatch(/^[0-9a-f-]{36}$/)

    await expect(page.getByRole("button", { name: "Conversa aberta" })).toHaveAttribute(
      "data-estado",
      "interesse-gravado",
      { timeout: 30_000 },
    )
    await expect(page.getByRole("button", { name: "Ver conversa" })).toBeVisible()

    // Sem otimismo: recarregar volta ao "Tenho interesse"; a prova da gravação
    // é o banco, não a tela.
    await page.reload()
    await expect(page.getByRole("button", { name: "Tenho interesse" })).toBeVisible({
      timeout: 30_000,
    })

    const lidas = await page.request.get(
      `${urlDoSupabase()}/rest/v1/dm_conversations?select=context_type,context_id&id=eq.${conversaId}`,
      {
        headers: {
          apikey: chaveAnonimaDoSupabase(),
          authorization: `Bearer ${await tokenDaSessao(context)}`,
        },
      },
    )
    expect(lidas.status(), "a conversa precisa ser legível por quem abriu").toBe(200)
    const linhas = (await lidas.json()) as { context_type: string; context_id: string }[]
    expect(linhas).toEqual([{ context_type: "listing", context_id: ITEM_ATIVO_PARA_INTERESSE }])
  })

  test("salvar do detalhe grava, aparece em Salvos e dessalvar de lá some", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.goto(`/app/anuncio/${ITEM_ATIVO_DE_TERCEIRO}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Berço portátil desmontável" }),
    ).toBeVisible({ timeout: 30_000 })

    // As três larguras rodam em série contra o mesmo banco: a prova começa do
    // estado limpo, sem depender da execução anterior.
    const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
    const cabecalhos = {
      authorization: `Bearer ${await tokenDaSessao(context)}`,
      "content-type": "application/json",
    }
    await api.delete(`/api/app/mercado/${ITEM_ATIVO_DE_TERCEIRO}/salvo`, { headers: cabecalhos })

    const gravado = page.waitForResponse(
      (r) => r.url().includes("/salvo") && r.request().method() === "POST",
    )
    const marcador = page.getByRole("button", { name: "Salvar anúncio", exact: true })
    await marcador.click()
    expect((await gravado).status()).toBe(200)
    await expect(
      page.getByRole("button", { name: "Remover dos salvos", exact: true }),
    ).toHaveAttribute("aria-pressed", "true")

    // O banco tem a linha da sessão, não só a tela.
    const salvas = await page.request.get(
      `${urlDoSupabase()}/rest/v1/listing_saves?select=listing_id&listing_id=eq.${ITEM_ATIVO_DE_TERCEIRO}`,
      {
        headers: {
          apikey: chaveAnonimaDoSupabase(),
          authorization: `Bearer ${await tokenDaSessao(context)}`,
        },
      },
    )
    expect(salvas.status(), "o salvamento precisa ser legível por quem salvou").toBe(200)
    expect(await salvas.json()).toEqual([{ listing_id: ITEM_ATIVO_DE_TERCEIRO }])

    // Recarregar não perde o marcador: ele vem da rota, não do aparelho.
    await page.reload()
    await expect(
      page.getByRole("button", { name: "Remover dos salvos", exact: true }),
    ).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 })

    // A tela Salvos lista o anúncio do banco; dessalvar de lá apaga a linha.
    await page.goto("/app/salvos")
    const secao = page.locator('[data-salvos="anuncios"]')
    const cartao = secao.locator('[data-cartao="anuncio"]', {
      hasText: "Berço portátil desmontável",
    })
    await expect(cartao).toBeVisible({ timeout: 30_000 })

    const apagado = page.waitForResponse(
      (r) => r.url().includes("/salvo") && r.request().method() === "DELETE",
    )
    await cartao.getByRole("button", { name: "Remover dos salvos", exact: true }).click()
    expect((await apagado).status()).toBe(200)
    await expect(cartao).toHaveCount(0)

    const depois = await page.request.get(
      `${urlDoSupabase()}/rest/v1/listing_saves?select=listing_id&listing_id=eq.${ITEM_ATIVO_DE_TERCEIRO}`,
      {
        headers: {
          apikey: chaveAnonimaDoSupabase(),
          authorization: `Bearer ${await tokenDaSessao(context)}`,
        },
      },
    )
    expect(await depois.json(), "dessalvar apaga a linha do banco").toEqual([])
    await api.dispose()
  })

  test("sessão vencida e acesso negado têm saídas próprias", async ({ page, context }) => {
    test.setTimeout(120_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    // 401: a saída é entrar de novo — tentar de novo com o mesmo cookie não resolve.
    await page.route("**/api/app/mercado**", (rota) =>
      rota.fulfill({ status: 401, body: '{"autenticado":false,"motivo":"sem-credencial"}' }),
    )
    await page.goto("/app/desapegos")
    const sessao = page.locator('[data-estado="sessao-vencida"]')
    await expect(sessao).toBeVisible({ timeout: 30_000 })
    await expect(sessao.getByRole("button", { name: "Entrar de novo" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0)

    // 403: negado, sem botão que repete a mesma chamada.
    await page.unroute("**/api/app/mercado**")
    await page.route("**/api/app/mercado**", (rota) =>
      rota.fulfill({ status: 403, body: '{"erro":"recusado"}' }),
    )
    await page.goto("/app/desapegos")
    await expect(page.locator('[data-estado="negado"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: "Tentar de novo" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Entrar de novo" })).toHaveCount(0)
  })

  test("escrita recusada e query inválida não abrem conversa", async ({ page, context }) => {
    test.setTimeout(120_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.goto("/app/desapegos")
    const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
    const cabecalhos = {
      authorization: `Bearer ${await tokenDaSessao(context)}`,
      "content-type": "application/json",
    }

    // Próprio anúncio (pausado do titular): 400, sem abrir conversa consigo.
    const proprio = await api.post(`/api/app/mercado/${ITEM_PAUSADO_DO_TITULAR}/interesse`, {
      headers: cabecalhos,
      data: {},
    })
    expect(proprio.status(), "interesse no próprio anúncio é recusado").toBe(400)
    expect((await proprio.json()) as { erro: string }).toMatchObject({ erro: "dados-invalidos" })

    // O bloqueio do seed continua valendo: ler o anúncio não permite conversar.
    const bloqueado = await api.post(`/api/app/mercado/${ITEM_ATIVO_DE_TERCEIRO}/interesse`, {
      headers: cabecalhos,
      data: {},
    })
    expect(bloqueado.status(), "interesse em anunciante bloqueado é recusado").toBe(403)
    expect(await bloqueado.json()).toMatchObject({ erro: "recusado" })

    // Query inválida: sem `tipo`, e filtro de imóvel sobre `tipo=item`.
    const semTipo = await api.get("/api/app/mercado", { headers: cabecalhos })
    expect(semTipo.status(), "lista sem tipo é recusada").toBe(400)

    const filtroInvalido = await api.get("/api/app/mercado?tipo=item&quartos=2", {
      headers: cabecalhos,
    })
    expect(filtroInvalido.status(), "filtro de imóvel sobre item é recusado").toBe(400)

    await api.dispose()
  })

  test("banco fora mostra erro com Tentar de novo, nunca grade vazia", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.route("**/api/app/mercado**", (rota) => rota.abort())
    await page.goto("/app/desapegos")
    const erro = page.locator('[data-estado="erro"]')
    await expect(erro).toBeVisible({ timeout: 30_000 })
    await expect(erro).toContainText("Não foi possível carregar")
    await expect(
      page.getByText("Nada anunciado nesta seção"),
      "banco fora não pode virar grade vazia",
    ).toHaveCount(0)

    await page.unroute("**/api/app/mercado**")
    await page.getByRole("button", { name: "Tentar de novo" }).click()
    await expect(cartao(page, "Mesa de jantar com 6 cadeiras")).toBeVisible({ timeout: 30_000 })
  })

  test("503 no detalhe mostra erro, não tela vazia", async ({ page, context }) => {
    test.setTimeout(120_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.route(`**/api/app/mercado/${ITEM_ATIVO_DE_TERCEIRO}`, (rota) =>
      rota.fulfill({ status: 503, body: "{}" }),
    )
    await page.goto(`/app/anuncio/${ITEM_ATIVO_DE_TERCEIRO}`)
    await expect(page.locator('[data-estado="erro"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("heading", { level: 2, name: "Sobre o anúncio" })).toHaveCount(0)
  })

  // Gestão do próprio anúncio (RUN-023): editar texto/preço e pausar/reativar
  // pela sessão, com a recarga provando o gravado no banco — e o estado do seed
  // devolvido ao terminar. O pause/reactivate passa pela RPC transition_listing;
  // nenhum UPDATE direto de status acontece aqui.
  test("editar e pausar o próprio anúncio persistem através da recarga", async ({
    page,
    context,
  }) => {
    test.setTimeout(240_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    const MESA = "b1000000-0000-4000-8000-000000000001"
    const botaoGerenciar = page.locator(`[data-acao="gerenciar-anuncio"][data-valor="${MESA}"]`)
    const cartaoMesa = page.locator('[data-tela="meus-anuncios"] [data-cartao="anuncio"]', {
      hasText: "Mesa de jantar",
    })
    const dialogo = page.locator(`[data-gerenciar-anuncio="${MESA}"]`)

    try {
      await page.goto("/app/meus-anuncios")
      await expect(cartaoMesa).toContainText("Mesa de jantar com 6 cadeiras", { timeout: 30_000 })

      await botaoGerenciar.click()
      await expect(dialogo.getByLabel("Título")).toHaveValue("Mesa de jantar com 6 cadeiras")
      await dialogo.getByLabel("Título").fill("Mesa de jantar com quatro cadeiras")
      await dialogo.getByLabel(/Preço pedido/).fill("420")
      await dialogo.getByRole("button", { name: "Salvar alterações" }).click()
      await expect(dialogo.getByRole("alert")).toContainText("Alterações salvas", {
        timeout: 30_000,
      })

      // Recarregar: o que aparece é o que está no banco.
      await page.goto("/app/meus-anuncios")
      await expect(cartaoMesa).toContainText("Mesa de jantar com quatro cadeiras", {
        timeout: 30_000,
      })

      // Pausar pela situação — com confirmação antes: um toque não transiciona.
      await botaoGerenciar.click()
      await expect(dialogo).toContainText("Situação atual: Ativo")
      await dialogo.getByRole("button", { name: "Pausar" }).click()
      await expect(dialogo.getByRole("button", { name: "Confirmar pausa" })).toBeVisible()
      await expect(dialogo, "pausar sem confirmar não muda o banco").toContainText(
        "Situação atual: Ativo",
      )
      await dialogo.getByRole("button", { name: "Confirmar pausa" }).click()
      await expect(dialogo).toContainText("Situação atual: Pausado", { timeout: 30_000 })
      await page.goto("/app/meus-anuncios")
      await expect(cartaoMesa).toContainText("Pausado", { timeout: 30_000 })

      // Reativar: a volta também é uma transição pela RPC.
      await botaoGerenciar.click()
      await dialogo.getByRole("button", { name: "Reativar" }).click()
      await expect(dialogo).toContainText("Situação atual: Ativo", { timeout: 30_000 })
    } finally {
      // Devolve o estado do seed pelas próprias rotas, sem depender do que a
      // tela deixou para trás: reativar pela rota /situacao (409 = já estava
      // ativo) e gravar os campos do seed pelo PATCH. Sem restauração provada,
      // o teste falha — não há mais `isVisible` sem espera nem erro engolido.
      const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
      try {
        const cabecalhos = {
          authorization: `Bearer ${await tokenDaSessao(context)}`,
          "content-type": "application/json",
        }
        const reativado = await api.post(`/api/app/mercado/${MESA}/situacao`, {
          headers: cabecalhos,
          data: { acao: "reactivate" },
        })
        expect([200, 409], `reativar o anúncio do seed falhou (${reativado.status()})`).toContain(
          reativado.status(),
        )
        const gravado = await api.patch(`/api/app/mercado/${MESA}`, {
          headers: cabecalhos,
          data: {
            titulo: "Mesa de jantar com 6 cadeiras",
            bairro: "Centro",
            preco: "450",
            descricao: "Mesa de madeira maciça, usada por dois anos, sem riscos na tampa.",
            categoria: "casa_moveis",
            condicao: "used",
          },
        })
        expect(
          gravado.status(),
          `restaurar título e preço do seed falhou (${JSON.stringify(await gravado.json())})`,
        ).toBe(200)
      } finally {
        await api.dispose()
      }
    }
  })

  // Gestão de IMÓVEL (RUN-164): a folha de Imóveis publica de verdade (POST
  // kind property), o anúncio criado abre no detalhe, e o gerenciar edita as
  // colunas do imóvel (PATCH) com a recarga provando o gravado no banco. O
  // anúncio criado é encerrado no fim para a grade voltar ao seed.
  test("criar e editar o próprio imóvel persiste através da recarga", async ({ page, context }) => {
    test.setTimeout(240_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    const titulo = `Cobertura de teste ${Date.now()}`
    const tituloEditado = `${titulo} — editada`
    let imovelId = ""

    try {
      await page.goto("/app/imoveis")
      await expect(page.getByRole("heading", { level: 1, name: "Imóveis" })).toBeVisible({
        timeout: 30_000,
      })
      await page.locator('[data-acao="anunciar-imovel"]').click()
      const folha = page.locator('[data-fluxo="rascunho-imovel"]')
      await expect(folha).toBeVisible()
      await folha.locator("#imovel-titulo").fill(titulo)
      await folha.locator("#imovel-bairro").fill("Centro")
      await folha.locator("#imovel-preco").fill("2100")
      await folha.locator("#imovel-quartos").fill("2")
      await folha.locator("#imovel-area").fill("58")
      await folha.locator("#imovel-descricao").fill("Anúncio sintético do teste de imóvel.")

      const criacao = page.waitForResponse(
        (r) =>
          /\/api\/app\/mercado$/.test(new URL(r.url()).pathname) && r.request().method() === "POST",
      )
      await folha.locator('[data-acao="publicar-imovel"]').click()
      const resposta = await criacao
      const corpo = (await resposta.json()) as { anuncio?: { id?: string } }
      expect(resposta.status(), JSON.stringify(corpo)).toBe(201)
      imovelId = corpo.anuncio?.id ?? ""
      expect(imovelId).toMatch(/^[0-9a-f-]{36}$/)

      // O app abre o anúncio recém-publicado, com os dados do banco.
      await expect(page).toHaveURL(new RegExp(`/app/anuncio/${imovelId}$`))
      await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible({
        timeout: 30_000,
      })
      await expect(page.locator('[data-tela="anuncio"]')).toContainText(/R\$\s*2\.100/)

      // Gerenciar o próprio imóvel: o formulário vem preenchido e grava o novo título.
      await page.goto("/app/meus-anuncios")
      const cartao = page.locator('[data-tela="meus-anuncios"] [data-cartao="anuncio"]', {
        hasText: titulo,
      })
      await expect(cartao).toBeVisible({ timeout: 30_000 })
      await page.locator(`[data-acao="gerenciar-anuncio"][data-valor="${imovelId}"]`).click()
      const dialogo = page.locator(`[data-gerenciar-anuncio="${imovelId}"]`)
      await expect(dialogo.getByLabel("Título")).toHaveValue(titulo)
      // "Vendido" não existe para imóvel: só pausar e encerrar.
      await expect(dialogo.getByRole("button", { name: "Marcar como vendido" })).toHaveCount(0)
      await dialogo.getByLabel("Título").fill(tituloEditado)
      await dialogo.getByLabel(/Aluguel por mês/).fill("2300")
      await dialogo.getByRole("button", { name: "Salvar alterações" }).click()
      await expect(dialogo.getByRole("alert")).toContainText("Alterações salvas", {
        timeout: 30_000,
      })

      // Recarregar: o que aparece é o que está no banco.
      await page.reload()
      await expect(
        page.locator('[data-tela="meus-anuncios"] [data-cartao="anuncio"]', {
          hasText: tituloEditado,
        }),
      ).toBeVisible({ timeout: 30_000 })
      await page.goto(`/app/anuncio/${imovelId}`)
      await expect(page.getByRole("heading", { level: 1, name: tituloEditado })).toBeVisible({
        timeout: 30_000,
      })
      await expect(page.locator('[data-tela="anuncio"]')).toContainText(/R\$\s*2\.300/)

      // Negativo: o imóvel do seed é de outra pessoa, e o PATCH por ela é
      // recusado sem tocar a linha.
      const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
      try {
        const cabecalhos = {
          authorization: `Bearer ${await tokenDaSessao(context)}`,
          "content-type": "application/json",
        }
        const alheio = await api.patch(`/api/app/mercado/${IMOVEL_DE_TERCEIRO}`, {
          headers: cabecalhos,
          data: { title: "Tentativa em imóvel alheio", deal: "rent", propertyType: "apartment" },
        })
        expect(alheio.status(), "editar imóvel de outra pessoa precisa ser 404").toBe(404)
      } finally {
        await api.dispose()
      }
    } finally {
      // Encerra o imóvel criado pelas próprias rotas, para a grade voltar ao
      // seed. Sem anúncio criado não há o que devolver.
      if (imovelId !== "") {
        const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
        try {
          const encerrado = await api.post(`/api/app/mercado/${imovelId}/situacao`, {
            headers: {
              authorization: `Bearer ${await tokenDaSessao(context)}`,
              "content-type": "application/json",
            },
            data: { acao: "close" },
          })
          expect([200, 409], `encerrar o imóvel do teste falhou (${encerrado.status()})`).toContain(
            encerrado.status(),
          )
        } finally {
          await api.dispose()
        }
      }
    }
  })

  // RUN-171 — o filtro do imóvel é do servidor (o furo do F06 era ele valer só
  // para a página carregada). A prova visível é o imóvel com `price_cents` NULL
  // DENTRO do teto continuar na grade; a do cursor é a segunda página não
  // devolver quem o filtro exclui.
  test("o filtro do imóvel vale no servidor, inclusive na segunda página", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    await page.goto("/app/imoveis?quartos=2&valor_max=2000")
    const cartoes = page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')
    await expect(
      cartoes.filter({ hasText: APARTAMENTO }),
      "o imóvel dentro do teto de aluguel continua na grade",
    ).toBeVisible({ timeout: 30_000 })
    // O de venda não tem aluguel: um teto de aluguel o exclui — como na web.
    await expect(
      cartoes.filter({ hasText: CASA }),
      "quem passa do critério não aparece",
    ).toHaveCount(0)

    // O link é o estado: os chips mostram o critério e recarregar não o perde.
    await expect(page.locator('[data-filtro="quartos"]')).toContainText("2+ quartos")
    await expect(page.locator('[data-filtro="valor_max"]')).toContainText(/Até R\$\s*2\.000/)
    await page.reload()
    await expect(
      cartoes.filter({ hasText: APARTAMENTO }),
      "recarregar mantém o filtro do endereço",
    ).toBeVisible({ timeout: 30_000 })
    await expect(cartoes.filter({ hasText: CASA })).toHaveCount(0)

    // A segunda página, pela rota: `limite=1` devolve o apartamento primeiro e
    // NADA depois. O bug antigo era a segunda vir sem filtro — com a casa.
    const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
    const cabecalhos = { authorization: `Bearer ${await tokenDaSessao(context)}` }
    try {
      const daPagina = (depois: string | null) =>
        `/api/app/mercado?tipo=property&quartos=1&valor_max=2000&limite=1${
          depois === null ? "" : `&depois=${encodeURIComponent(depois)}`
        }`

      const primeira = await api.get(daPagina(null), { headers: cabecalhos })
      expect(primeira.status()).toBe(200)
      const corpo = (await primeira.json()) as {
        anuncios: { id: string }[]
        proximo: string | null
      }
      expect(corpo.anuncios.map((anuncio) => anuncio.id)).toEqual([
        "b2000000-0000-4000-8000-000000000001",
      ])
      expect(corpo.proximo, "a primeira página cheia entrega o cursor").not.toBeNull()

      const segunda = await api.get(daPagina(corpo.proximo), { headers: cabecalhos })
      expect(segunda.status()).toBe(200)
      expect(
        ((await segunda.json()) as { anuncios: { id: string }[] }).anuncios,
        "a segunda página respeita o filtro: nada de imóvel de venda no teto de aluguel",
      ).toEqual([])
    } finally {
      await api.dispose()
    }
  })

  // RUN-171 fecha a perda do RUN-169: o link do alerta leva bairro e negócio, e
  // o Mercado os aplica no servidor. O alerta é criado PELA UI (o seed pode ter
  // outros) e apagado no fim.
  test("o link do alerta abre a lista com o bairro aplicado", async ({ page, context }) => {
    test.setTimeout(240_000)
    await entrarComo(context, MEMBRO_SEMEADO)

    const nome = `Alerta do filtro ${Date.now()}`
    let alertaId = ""

    try {
      await page.goto("/app/imoveis/alertas")
      await expect(
        page.getByRole("heading", { level: 1, name: "Alertas de imóvel", exact: true }),
      ).toBeVisible({ timeout: 30_000 })

      await page.locator('[data-acao="criar-alerta"]').click()
      const formulario = page.locator('[data-formulario="alerta"]')
      await expect(formulario).toBeVisible()
      await formulario.locator("#alerta-nome").fill(nome)
      await formulario.locator("#alerta-bairro").fill("Centro")
      await formulario.locator("#alerta-negocio").click()
      await page.getByRole("option", { name: "Alugar", exact: true }).click()
      await formulario.locator("#alerta-valor").click()
      await page.getByRole("option", { name: /2\.500/ }).click()
      await formulario.locator("#alerta-quartos").click()
      await page.getByRole("option", { name: "2+", exact: true }).click()

      const criacao = page.waitForResponse(
        (r) =>
          /\/api\/app\/imoveis\/alertas$/.test(new URL(r.url()).pathname) &&
          r.request().method() === "POST",
      )
      await formulario.getByRole("button", { name: "Criar alerta", exact: true }).click()
      const resposta = await criacao
      const gravado = (await resposta.json()) as { alerta?: { id?: string } }
      alertaId = gravado.alerta?.id ?? ""
      expect(alertaId).toMatch(/^[0-9a-f-]{36}$/)

      // "Ver resultados" abre o Mercado com os critérios do alerta no endereço.
      await page.locator(`[data-acao="ver-resultados"][data-valor="${alertaId}"]`).click()
      await expect(page).toHaveURL(/\/app\/imoveis\?/, { timeout: 30_000 })
      const endereco = new URL(page.url())
      expect(endereco.searchParams.get("bairro")).toBe("Centro")
      expect(endereco.searchParams.get("tipo_negocio")).toBe("rent")
      expect(endereco.searchParams.get("quartos")).toBe("2")
      expect(endereco.searchParams.get("valor_max")).toBe("2500")

      // O bairro filtra de verdade: só o imóvel do Centro, com o chip visível.
      const cartoes = page.locator('[data-tela="imoveis"] [data-cartao="anuncio"]')
      await expect(page.locator('[data-filtro="bairro"]')).toContainText("Bairro: Centro")
      await expect(page.locator('[data-filtro="tipo_negocio"]')).toContainText("Aluguel")
      await expect(cartoes.filter({ hasText: APARTAMENTO })).toBeVisible({ timeout: 30_000 })
      await expect(
        cartoes.filter({ hasText: CASA }),
        "o imóvel de outro bairro não entra",
      ).toHaveCount(0)

      // Compartilhar/recarregar recria a mesma lista.
      await page.reload()
      await expect(page.locator('[data-filtro="bairro"]')).toContainText("Bairro: Centro")
      await expect(cartoes.filter({ hasText: APARTAMENTO })).toBeVisible({ timeout: 30_000 })

      // Tirar o chip do bairro refaz a busca sem ele; o teto de aluguel segue
      // excluindo a casa de venda (é a regra da web, declarada no RELATORIO).
      await page.locator('[data-filtro="bairro"]').click()
      await expect(page.locator('[data-filtro="bairro"]')).toHaveCount(0)
      await expect(cartoes.filter({ hasText: CASA })).toHaveCount(0)
      await expect(cartoes.filter({ hasText: APARTAMENTO })).toBeVisible({ timeout: 30_000 })
    } finally {
      if (alertaId !== "") {
        const api = await apiRequest.newContext({ baseURL: new URL(page.url()).origin })
        try {
          const removido = await api.delete(`/api/app/imoveis/alertas/${alertaId}`, {
            headers: { authorization: `Bearer ${await tokenDaSessao(context)}` },
          })
          expect([200, 404], `limpar o alerta do teste falhou (${removido.status()})`).toContain(
            removido.status(),
          )
        } finally {
          await api.dispose()
        }
      }
    }
  })
})
