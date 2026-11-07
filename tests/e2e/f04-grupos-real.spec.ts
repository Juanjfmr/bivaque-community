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

async function capturar(page: Page, nome: string) {
  mkdirSync(CAPTURAS, { recursive: true })
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema, reducedMotion: "reduce" })
    await page.evaluate(() => document.fonts.ready)
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
    expect(
      info.config.workers,
      "use --workers=1 para devolver o banco antes da próxima largura",
    ).toBe(1)
    expect([375, 768, 1440]).toContain(page.viewportSize()?.width)
    const origem = new URL(info.project.use.baseURL ?? "http://127.0.0.1:3000")
    if (!["127.0.0.1", "localhost"].includes(origem.hostname))
      throw new Error("F04 só usa servidor local")
    const servico = await servicoLocal()
    const aberto = randomUUID()
    const fechado = randomUUID()
    let banco: APIRequestContext | null = null
    try {
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
      await signInAs(context, "visual@bivaque.example.invalid")
      const cabecalhos = { origin: origem.origin, "x-bivaque-app": "bivaque-spa" }
      const privado = await page.request.post(`/api/app/grupos/${fechado}/publicacoes`, {
        headers: cabecalhos,
        data: { texto: "Conteúdo reservado", fotos: [] },
      })
      expect(privado.status()).toBe(201)
      const privadoId = ((await privado.json()) as { publicacao: { id: string } }).publicacao.id

      await context.clearCookies()
      await signInAs(context, "membro-1@bivaque.example.invalid")
      banco = await apiForSession(context)
      const negada = await page.request.post(`/api/app/grupos/${aberto}/publicacoes`, {
        headers: cabecalhos,
        data: { texto: "Não membro não publica", fotos: [] },
      })
      expect(negada.status()).toBe(403)
      expect((await page.request.get(`/api/app/grupos/publicacoes/${privadoId}`)).status()).toBe(
        404,
      )
      await page.goto(`/app/grupo/${fechado}`)
      await page.getByRole("button", { name: "Pedir entrada", exact: true }).click()
      await page
        .getByLabel("Por que você quer entrar? (opcional)")
        .fill("Quero participar das conversas da cidade.")
      await page.getByRole("button", { name: "Enviar pedido" }).click()
      await expect(page.getByText("Pedido enviado. Aguardando aprovação.")).toBeVisible()
      await page.reload()
      await expect(page.getByText("Pedido enviado. Aguardando aprovação.")).toBeVisible()
      const motivo = await banco.get(
        `/rest/v1/group_join_reasons?select=reason&group_id=eq.${fechado}`,
      )
      expect(motivo.ok()).toBe(true)
      expect(await motivo.json()).toEqual([{ reason: "Quero participar das conversas da cidade." }])
      await capturar(page, `${info.project.name}-pedido`)
      await page.getByRole("button", { name: "Cancelar solicitação" }).click()
      await expect(page.getByRole("button", { name: "Pedir entrada", exact: true })).toBeVisible()

      await page.goto("/app/comunidade")
      await page.getByRole("button", { name: "Grupos", exact: true }).click()
      const diretorio = page.locator("[data-diretorio-grupos]")
      await expect(diretorio).toBeVisible()
      while (
        !(await diretorio
          .getByRole("heading", { name: "Grupo F04 aberto", exact: true })
          .isVisible()) &&
        (await diretorio.getByRole("button", { name: "Ver mais grupos" }).isVisible())
      ) {
        await diretorio.getByRole("button", { name: "Ver mais grupos" }).click()
        await expect(diretorio.getByRole("button", { name: "Carregando…" })).toHaveCount(0)
      }
      await diretorio
        .locator("article", { hasText: "Grupo F04 aberto" })
        .getByRole("button", { name: "Ver grupo" })
        .click()
      await page.getByRole("button", { name: "Participar do grupo" }).click()
      await expect(page.locator('[data-estado-participacao="membro"]')).toBeVisible()
      await page.getByRole("button", { name: "Escrever", exact: true }).click()
      await page.getByLabel("Sua publicação").fill("Publicação real do F04")
      const imagem = await sharp({
        create: { width: 8, height: 8, channels: 3, background: "#334455" },
      })
        .png()
        .toBuffer()
      const fotoEnviada = page.waitForResponse(
        (r) => r.url().endsWith(`/grupos/${aberto}/fotos`) && r.request().method() === "POST",
      )
      await page
        .getByLabel("Adicionar fotos (até 4, de até 5 MB)")
        .setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: imagem })
      expect((await fotoEnviada).status()).toBe(201)
      await page.getByRole("button", { name: "Publicar", exact: true }).click()
      await expect(page).toHaveURL(/\/app\/publicacao\/[0-9a-f-]+$/)
      const id = new URL(page.url()).pathname.split("/").at(-1) ?? ""
      await page.getByLabel("Seu comentário").fill("Comentário real do F04")
      await page
        .locator('[data-compositor-publicacao="sim"]')
        .getByRole("button", { name: "Comentar", exact: true })
        .click()
      const raiz = page.locator("[data-comentario]").first()
      await expect(raiz).toContainText("Comentário real do F04")
      await raiz.getByRole("button", { name: "Responder", exact: true }).click()
      await page.getByLabel("Seu comentário").fill("Resposta real no fio")
      await page.getByRole("button", { name: "Enviar resposta", exact: true }).click()
      await raiz.getByRole("button", { name: "Útil (0)", exact: true }).click()
      await expect(raiz.getByRole("button", { name: "Útil (1)", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      await page.locator('[data-acao="util"]').click()
      await expect(page.locator('[data-acao="util"]')).toHaveAttribute("aria-pressed", "true")
      await page.getByRole("button", { name: "Opções da publicação" }).click()
      await page.getByRole("button", { name: "Salvar publicação", exact: true }).click()
      await expect(page.getByRole("status")).toContainText("Publicação salva")
      await page.reload()
      await expect(page.getByText("Publicação real do F04", { exact: true })).toBeVisible()
      await expect(page.locator('[data-resposta="sim"]')).toContainText("Resposta real no fio")
      await expect(page.locator('[data-acao="util"]')).toHaveAttribute("aria-pressed", "true")
      await expect(raiz.getByRole("button", { name: "Útil (1)", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      await expect(page.getByRole("img", { name: "Foto da publicação", exact: true })).toBeVisible()
      const gravado = await banco.get(`/rest/v1/posts?select=content&group_id=eq.${aberto}`)
      expect(gravado.ok()).toBe(true)
      expect(await gravado.json()).toEqual([{ content: "Publicação real do F04" }])
      await capturar(page, `${info.project.name}-publicacao`)
      await page.getByRole("button", { name: "Opções da publicação" }).click()
      await expect(page.getByRole("button", { name: "Tirar dos salvos" })).toBeVisible()
      await page.getByRole("button", { name: "Ocultar publicação" }).click()
      await expect(page.getByText("Esta publicação está oculta para você no grupo.")).toBeVisible()
      await page.goto(`/app/grupo/${aberto}`)
      await expect(page.locator('[data-cartao="publicacao"]')).toHaveCount(0)
      await page.getByRole("button", { name: "Ocultadas", exact: true }).click()
      await page.getByRole("button", { name: "Opções da publicação" }).click()
      await page.getByRole("button", { name: "Mostrar novamente" }).click()

      await context.clearCookies()
      await signInAs(context, "visual@bivaque.example.invalid")
      await page.goto(`/app/publicacao/${id}`)
      await page.getByRole("button", { name: "Opções da publicação" }).click()
      await page.getByRole("button", { name: "Fixar publicação" }).click()
      await expect(page.getByRole("status")).toContainText("Publicação fixada")
      await page.reload()
      await page.getByRole("button", { name: "Opções da publicação" }).click()
      await expect(page.getByRole("button", { name: "Desafixar publicação" })).toBeVisible()
      await page.getByRole("button", { name: "Denunciar publicação", exact: true }).click()
      await page.getByLabel("Spam", { exact: true }).check()
      await page.getByRole("button", { name: "Enviar denúncia" }).click()
      await expect(page.getByRole("status")).toContainText("Denúncia enviada")
      const denuncias = await servico.get(
        `/rest/v1/reports?select=target_id&target_type=eq.post&target_id=eq.${id}`,
      )
      expect(denuncias.ok()).toBe(true)
      expect(await denuncias.json()).toEqual([{ target_id: id }])
    } finally {
      try {
        await limpar(servico, [aberto, fechado])
      } finally {
        await banco?.dispose()
        await servico.dispose()
      }
    }
  })
})
