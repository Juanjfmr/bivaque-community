import { randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { join } from "node:path"
import {
  type APIRequestContext,
  type APIResponse,
  expect,
  type Page,
  request,
  test,
} from "@playwright/test"
import sharp from "sharp"
import { urlDoSupabase } from "./entrada-real-ajuda"
import { apiForSession, readEnvLocal, signInAs } from "./helpers/session"

// @stateful: executar com --workers=1. Os projetos da raiz percorrem 375/768/1440 em série.
// O serviço só prepara e apaga fixtures locais; todas as ações testadas usam a sessão do membro.
const CIDADE = "00000000-0000-4000-8000-000000000001"
const DONO = "20000000-0000-4000-8000-000000000001"
const MEMBRO = "30000000-0000-4000-8000-000000000001"
const CAPTURAS = join(process.cwd(), ".visual", "run-021", "real")

/**
 * Teto de cada espera. Sem ele, uma ação contra um elemento que o desenho não
 * tem gasta os 240 s do teste inteiro e o CI não diz onde parou.
 */
const ESPERA = { timeout: 20_000 } as const

async function capturar(page: Page, nome: string) {
  mkdirSync(CAPTURAS, { recursive: true })
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
    await page.waitForFunction(() => document.fonts.status === "loaded", undefined, ESPERA)
    await page.screenshot({ path: join(CAPTURAS, `${nome}-${tema}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.emulateMedia({ colorScheme: "light" })
}

async function servicoLocal(): Promise<APIRequestContext> {
  const url = new URL(urlDoSupabase())
  if (!new Set(["127.0.0.1", "localhost"]).has(url.hostname))
    throw new Error("F04 só usa banco local")
  const chave =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? readEnvLocal("SUPABASE_SERVICE_ROLE_KEY")
  if (!chave) throw new Error("Credencial de fixture local ausente")
  return request.newContext({
    baseURL: url.origin,
    extraHTTPHeaders: { apikey: chave, authorization: `Bearer ${chave}` },
  })
}

// Cada passo da fixture diz qual recurso recusou e o que o PostgREST respondeu:
// sem isso, um 403/400 de uma das chamadas virava "limpeza dos efeitos da fixture".
async function conferir(etapa: string, resposta: APIResponse) {
  const corpo = resposta.ok() ? "" : await resposta.text()
  expect(resposta.ok(), `${etapa}: ${resposta.url()} -> ${resposta.status()} ${corpo}`).toBe(true)
  return resposta
}

async function limpar(servico: APIRequestContext, grupos: string[]) {
  const filtro = `in.(${grupos.join(",")})`
  const consulta = await servico.get(`/rest/v1/posts?select=id&group_id=${filtro}`)
  await conferir("localizar as publicações da fixture", consulta)
  const posts = (await consulta.json()) as { id: string }[]
  const publicacoes = posts.map((p) => p.id)
  const alvos = [...grupos, ...publicacoes].join(",")

  // Em ordem, uma de cada vez: sem FK entre os efeitos e o alvo, a sequência só
  // precisa respeitar a referência de `groups.pinned_post_id` e o cascade.
  await conferir(
    "apagar os avisos dos efeitos da fixture",
    await servico.delete(`/rest/v1/notifications?target_id=in.(${alvos})`),
  )
  // Só com publicação existe denúncia; `in.()` vazio é filtro inválido para o PostgREST.
  if (publicacoes.length > 0)
    await conferir(
      "apagar as denúncias das publicações da fixture",
      await servico.delete(
        `/rest/v1/reports?target_type=eq.post&target_id=in.(${publicacoes.join(",")})`,
      ),
    )
  await conferir(
    "desafixar a publicação antes de apagá-la",
    await servico.patch(`/rest/v1/groups?id=${filtro}`, { data: { pinned_post_id: null } }),
  )
  // Comentários, Útil, salvos e ocultadas têm cascade por publicação.
  await conferir(
    "apagar as publicações da fixture",
    await servico.delete(`/rest/v1/posts?group_id=${filtro}`),
  )
  // Inclui memberships, motivos e tentativas: nenhuma linha anterior do seed foi alterada.
  await conferir(
    "apagar os grupos da fixture",
    await servico.delete(`/rest/v1/groups?id=${filtro}`),
  )
  for (const grupo of grupos) {
    const prefixo = `${MEMBRO}/grupos/${grupo}`
    const lista = await servico.post("/storage/v1/object/list/event-photos", {
      data: { prefix: prefixo, limit: 100 },
    })
    await conferir(`listar as fotos de ${grupo} na API de storage`, lista)
    const fotos = (await lista.json()) as { name: string }[]
    if (fotos.length > 0)
      await conferir(
        `apagar as fotos de ${grupo} na API de storage`,
        await servico.delete("/storage/v1/object/event-photos", {
          data: { prefixes: fotos.map((f) => `${prefixo}/${f.name}`) },
        }),
      )
  }
  const restantes = await servico.get(`/rest/v1/groups?select=id&id=${filtro}`)
  await conferir("conferir os grupos restantes da fixture", restantes)
  expect(await restantes.json()).toEqual([])
  const sobraram = await servico.get(`/rest/v1/posts?select=id&group_id=${filtro}`)
  await conferir("conferir as publicações restantes da fixture", sobraram)
  expect(await sobraram.json()).toEqual([])
}

test.describe("F04 — grupos reais", { tag: "@stateful" }, () => {
  test.describe.configure({ mode: "serial" })
  test("diretório, entrada, pedido com motivo, foto, fio, ações e denúncia persistem", async ({
    page,
    context,
  }, info) => {
    test.setTimeout(240_000)
    // Cada passo se nomeia e cada espera tem teto: um elemento que o desenho não
    // tem falha em 20 s com o nome do passo, em vez de gastar o teste inteiro.
    page.setDefaultTimeout(ESPERA.timeout)
    expect(
      info.config.workers,
      "use --workers=1 para devolver o banco antes da próxima largura",
    ).toBe(1)
    expect([375, 768, 1440], "a jornada roda nas três larguras do protótipo").toContain(
      page.viewportSize()?.width,
    )
    const origem = new URL(info.project.use.baseURL ?? "http://127.0.0.1:3000")
    if (!["127.0.0.1", "localhost"].includes(origem.hostname))
      throw new Error("F04 só usa servidor local")
    const servico = await servicoLocal()
    const aberto = randomUUID()
    const fechado = randomUUID()
    let banco: APIRequestContext | null = null
    try {
      await test.step("fixture: os grupos aberto e fechado da cidade", async () => {
        await conferir(
          "criar os grupos da fixture",
          await servico.post("/rest/v1/groups", {
            data: [
              {
                id: aberto,
                name: "Grupo F04 aberto",
                description: "Fixture local F04",
                visibility: "public",
                locality_id: CIDADE,
                created_by: DONO,
                owner_user_id: DONO,
              },
              {
                id: fechado,
                name: "Grupo F04 fechado",
                description: "Fixture local F04",
                visibility: "private",
                locality_id: CIDADE,
                created_by: DONO,
                owner_user_id: DONO,
              },
            ],
          }),
        )
        await conferir(
          "inscrever o dono nos grupos da fixture",
          await servico.post("/rest/v1/group_memberships", {
            data: [aberto, fechado].map((group_id) => ({
              group_id,
              user_id: DONO,
              role: "owner",
              status: "approved",
            })),
          }),
        )
      })

      await test.step("entrar: quem não é membro não publica nem lê o grupo fechado", async () => {
        await signInAs(context, "visual@bivaque.example.invalid")
        const cabecalhos = { origin: origem.origin, "x-bivaque-app": "bivaque-spa" }
        const privado = await page.request.post(`/api/app/grupos/${fechado}/publicacoes`, {
          headers: cabecalhos,
          data: { texto: "Conteúdo reservado", fotos: [] },
        })
        expect(privado.status(), "a dona publica no grupo fechado da fixture").toBe(201)
        const privadoId = ((await privado.json()) as { publicacao: { id: string } }).publicacao.id

        await context.clearCookies()
        await signInAs(context, "membro-1@bivaque.example.invalid")
        const sessaoDoMembro = await apiForSession(context)
        banco = sessaoDoMembro
        const negada = await page.request.post(`/api/app/grupos/${aberto}/publicacoes`, {
          headers: cabecalhos,
          data: { texto: "Não membro não publica", fotos: [] },
        })
        expect(negada.status(), "quem não é membro recebe 403 ao publicar").toBe(403)
        expect(
          (await page.request.get(`/api/app/grupos/publicacoes/${privadoId}`)).status(),
          "quem não é membro não lê a publicação do grupo fechado",
        ).toBe(404)

        await page.goto(`/app/grupo/${fechado}`, ESPERA)
        await page.getByRole("button", { name: "Pedir entrada", exact: true }).click(ESPERA)
        await page
          .getByLabel("Por que você quer entrar? (opcional)")
          .fill("Quero participar das conversas da cidade.", ESPERA)
        await page.getByRole("button", { name: "Enviar pedido" }).click(ESPERA)
        await expect(
          page.getByText("Pedido enviado. Aguardando aprovação."),
          "o pedido mostra o estado pendente",
        ).toBeVisible(ESPERA)
        await page.reload({ timeout: ESPERA.timeout })
        await expect(
          page.getByText("Pedido enviado. Aguardando aprovação."),
          "o pedido pendente sobrevive ao recarregamento",
        ).toBeVisible(ESPERA)
        const motivo = await sessaoDoMembro.get(
          `/rest/v1/group_join_reasons?select=reason&group_id=eq.${fechado}`,
        )
        expect(motivo.ok(), "o motivo é legível pela sessão de quem pediu").toBe(true)
        expect(await motivo.json(), "o motivo gravado é o que foi enviado").toEqual([
          { reason: "Quero participar das conversas da cidade." },
        ])
        await capturar(page, `${info.project.name}-pedido`)
        await page.getByRole("button", { name: "Cancelar solicitação" }).click(ESPERA)
        await expect(
          page.getByRole("button", { name: "Pedir entrada", exact: true }),
          "cancelar devolve o botão de pedir entrada",
        ).toBeVisible(ESPERA)
      })

      await test.step("diretório: a aba Grupos acha o grupo da fixture", async () => {
        await page.goto("/app/comunidade", ESPERA)
        // A aba é um radio do ChipsDeFiltro: o nome acessível é "Filtrar por Grupos",
        // não o texto visível. Um `button` com esse nome nunca casa.
        await page.getByRole("radio", { name: "Filtrar por Grupos", exact: true }).click(ESPERA)
        const diretorio = page.locator("[data-diretorio-grupos]")
        await expect(diretorio, "a aba Grupos mostra o diretório de grupos").toBeVisible(ESPERA)
        const alvo = diretorio.locator("article", { hasText: "Grupo F04 aberto" })
        const mais = diretorio.getByRole("button", { name: "Ver mais grupos" })
        // Teto de 40 páginas: sem ele, um cursor que não avança gira até o timeout.
        for (let volta = 0; volta < 40; volta++) {
          if (await alvo.isVisible()) break
          if (!(await mais.isVisible())) break
          await mais.click(ESPERA)
          await expect(
            diretorio.getByRole("button", { name: "Carregando…" }),
            "a página seguinte termina de carregar",
          ).toHaveCount(0, ESPERA)
        }
        await expect(alvo, "o grupo aberto da fixture aparece no diretório").toBeVisible(ESPERA)
        await alvo.getByRole("button", { name: "Ver grupo" }).click(ESPERA)
      })

      await test.step("entrar: participar do grupo aberto libera a escrita", async () => {
        await page.getByRole("button", { name: "Participar do grupo" }).click(ESPERA)
        await expect(
          page.locator('[data-estado-participacao="membro"]'),
          "participar do grupo aberto entra na hora",
        ).toBeVisible(ESPERA)
      })

      let id = ""
      await test.step("publicar com foto: a foto sobe e a publicação abre no detalhe", async () => {
        await page.getByRole("button", { name: "Escrever", exact: true }).click(ESPERA)
        await page.getByLabel("Sua publicação").fill("Publicação real do F04", ESPERA)
        const imagem = await sharp({
          create: { width: 8, height: 8, channels: 3, background: "#334455" },
        })
          .png()
          .toBuffer()
        const fotoEnviada = page.waitForResponse(
          (r) => r.url().endsWith(`/grupos/${aberto}/fotos`) && r.request().method() === "POST",
          ESPERA,
        )
        await page
          .getByLabel("Adicionar fotos (até 4, de até 5 MB)")
          .setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: imagem }, ESPERA)
        expect((await fotoEnviada).status(), "a foto sobe pela rota do grupo e devolve 201").toBe(
          201,
        )
        await page.getByRole("button", { name: "Publicar", exact: true }).click(ESPERA)
        await expect(page, "publicar abre a publicação gravada").toHaveURL(
          /\/app\/publicacao\/[0-9a-f-]+$/,
          ESPERA,
        )
        id = new URL(page.url()).pathname.split("/").at(-1) ?? ""
      })

      await test.step("comentar e responder: o fio é gravado", async () => {
        await page.getByLabel("Seu comentário").fill("Comentário real do F04", ESPERA)
        await page
          .locator('[data-compositor-publicacao="sim"]')
          .getByRole("button", { name: "Comentar", exact: true })
          .click(ESPERA)
        const raiz = page.locator("[data-comentario]").first()
        await expect(raiz, "o comentário enviado aparece no fio").toContainText(
          "Comentário real do F04",
          ESPERA,
        )
        await raiz.getByRole("button", { name: "Responder", exact: true }).click(ESPERA)
        await page.getByLabel("Seu comentário").fill("Resposta real no fio", ESPERA)
        await page.getByRole("button", { name: "Enviar resposta", exact: true }).click(ESPERA)
        await raiz.getByRole("button", { name: "Útil (0)", exact: true }).click(ESPERA)
        await expect(
          raiz.getByRole("button", { name: "Útil (1)", exact: true }),
          "o Útil do comentário grava",
        ).toHaveAttribute("aria-pressed", "true", ESPERA)
      })

      await test.step("Útil, salvar, ocultar e fixar: cada ação grava e volta ao recarregar", async () => {
        const raiz = page.locator("[data-comentario]").first()
        await page.locator('[data-acao="util"]').click(ESPERA)
        await expect(
          page.locator('[data-acao="util"]'),
          "o Útil da publicação grava",
        ).toHaveAttribute("aria-pressed", "true", ESPERA)
        await page.getByRole("button", { name: "Opções da publicação" }).click(ESPERA)
        await page.getByRole("button", { name: "Salvar publicação", exact: true }).click(ESPERA)
        await expect(page.getByRole("status"), "salvar confirma na tela").toContainText(
          "Publicação salva",
          ESPERA,
        )
        await page.reload({ timeout: ESPERA.timeout })
        await expect(
          page.getByText("Publicação real do F04", { exact: true }),
          "o texto sobrevive ao recarregamento",
        ).toBeVisible(ESPERA)
        await expect(
          page.locator('[data-resposta="sim"]'),
          "a resposta sobrevive ao recarregamento",
        ).toContainText("Resposta real no fio", ESPERA)
        await expect(
          page.locator('[data-acao="util"]'),
          "o Útil da publicação sobrevive ao recarregamento",
        ).toHaveAttribute("aria-pressed", "true", ESPERA)
        await expect(
          raiz.getByRole("button", { name: "Útil (1)", exact: true }),
          "o Útil do comentário sobrevive ao recarregamento",
        ).toHaveAttribute("aria-pressed", "true", ESPERA)
        await expect(
          page.getByRole("img", { name: "Foto da publicação", exact: true }),
          "a foto publicada aparece no detalhe",
        ).toBeVisible(ESPERA)
        const gravado = await banco?.get(`/rest/v1/posts?select=content&group_id=eq.${aberto}`)
        if (!gravado) throw new Error("a sessão do membro não foi aberta")
        expect(gravado.ok(), "o texto é legível pela sessão de quem publicou").toBe(true)
        expect(await gravado.json(), "o texto gravado é o publicado").toEqual([
          { content: "Publicação real do F04" },
        ])
        await capturar(page, `${info.project.name}-publicacao`)
        await page.getByRole("button", { name: "Opções da publicação" }).click(ESPERA)
        await expect(
          page.getByRole("button", { name: "Tirar dos salvos" }),
          "o menu mostra que a publicação está salva",
        ).toBeVisible(ESPERA)
        await expect(
          page.getByRole("button", { name: "Denunciar publicação", exact: true }),
          "quem escreveu não denuncia a própria publicação",
        ).toHaveCount(0, ESPERA)
        await page.getByRole("button", { name: "Ocultar publicação" }).click(ESPERA)
        await expect(
          page.getByText("Esta publicação está oculta para você no grupo."),
          "ocultar avisa na própria publicação",
        ).toBeVisible(ESPERA)
        await page.goto(`/app/grupo/${aberto}`, ESPERA)
        await expect(
          page.locator('[data-cartao="publicacao"]'),
          "a publicação oculta sai da lista do grupo",
        ).toHaveCount(0, ESPERA)
        await page.getByRole("button", { name: "Ocultadas", exact: true }).click(ESPERA)
        await page.getByRole("button", { name: "Opções da publicação" }).click(ESPERA)
        await page.getByRole("button", { name: "Mostrar novamente" }).click(ESPERA)

        // Fixar é do dono do grupo: outra sessão, mesmo banco.
        await context.clearCookies()
        await signInAs(context, "visual@bivaque.example.invalid")
        await page.goto(`/app/publicacao/${id}`, ESPERA)
        await page.getByRole("button", { name: "Opções da publicação" }).click(ESPERA)
        await page.getByRole("button", { name: "Fixar publicação" }).click(ESPERA)
        await expect(page.getByRole("status"), "fixar confirma na tela").toContainText(
          "Publicação fixada",
          ESPERA,
        )
        await page.reload({ timeout: ESPERA.timeout })
        await page.getByRole("button", { name: "Opções da publicação" }).click(ESPERA)
        await expect(
          page.getByRole("button", { name: "Desafixar publicação" }),
          "a fixação sobrevive ao recarregamento",
        ).toBeVisible(ESPERA)
        // A recarga chega com o menu aberto na entrada, mas sem a publicação
        // escolhida: a tela fecha o que não sabe restaurar e o corpo volta a
        // responder ao toque, em vez de ficar inerte atrás de um diálogo vazio.
        await page.reload({ timeout: ESPERA.timeout })
        await page.getByRole("button", { name: "Opções da publicação" }).click(ESPERA)
        await expect(
          page.getByRole("dialog"),
          "recarregar com o menu aberto não deixa a tela inerte",
        ).toBeVisible(ESPERA)
        await page.keyboard.press("Escape")
        await expect(page.getByRole("dialog"), "Esc fecha o menu").toHaveCount(0, ESPERA)
      })

      await test.step("denúncia: outro membro denuncia e o registro aparece", async () => {
        // A publicação é de membro-1; quem denuncia é a dona do grupo, outro
        // membro. O menu esconde "Denunciar publicação" na publicação de quem
        // escreveu, e a rota responde `proprio-conteudo`.
        await context.clearCookies()
        await signInAs(context, "visual@bivaque.example.invalid")
        await page.goto(`/app/publicacao/${id}`, ESPERA)
        await page.getByRole("button", { name: "Opções da publicação" }).click(ESPERA)
        await page.getByRole("button", { name: "Denunciar publicação", exact: true }).click(ESPERA)
        await page.getByLabel("Spam", { exact: true }).check(ESPERA)
        await page.getByRole("button", { name: "Enviar denúncia" }).click(ESPERA)
        await expect(page.getByRole("status"), "a denúncia confirma na tela").toContainText(
          "Denúncia enviada",
          ESPERA,
        )
        const denuncias = await servico.get(
          `/rest/v1/reports?select=target_id&target_type=eq.post&target_id=eq.${id}`,
        )
        expect(denuncias.ok(), "a denúncia é legível pelo serviço local").toBe(true)
        expect(await denuncias.json(), "a denúncia gravada aponta para a publicação").toEqual([
          { target_id: id },
        ])
      })
    } finally {
      await test.step("limpeza: a fixture sai do banco e do storage", async () => {
        try {
          await limpar(servico, [aberto, fechado])
        } finally {
          await banco?.dispose()
          await servico.dispose()
        }
      })
    }
  })
})
