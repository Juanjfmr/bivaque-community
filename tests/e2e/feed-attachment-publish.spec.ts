// Itens 1, 2 e 3 da frente P1-TESTE — o anexo ligado e vazio não publica.
//
// O commit 17cd7d0 fechou um defeito de SILÊNCIO: quem liga "Foto", escolhe o
// arquivo e publica ENQUANTO o envio acontece — ou quem abre o seletor e não
// escolhe nada — publicava como pergunta de TEXTO e perdia, sem aviso, uma ação
// que ela mesma tomou. O `post_type` estava coerente; a pessoa é que perdia a
// ação. Não aparece em tela vermelha nenhuma.
//
// Este spec existe porque a prova de runtime de 21/09/2026 mostrou que funciona
// AGORA; teste é o que impede de quebrar DEPOIS. São comportamento, e por isso
// exigem navegador — os itens 5, 6 e a P2 desta frente são leitura de fonte e
// NÃO exercitam clique nenhum.
//
//   1. anexo de FOTO ligado e vazio → não publica e mostra a frase que diz o
//      que fazer (anexar ou desligar);
//   2. o mesmo para o anexo de LINK;
//   3. DESLIGAR o anexo volta a publicar — e a publicação grava post_type='text'.
//
// A variante que mais importa é a do ENVIO EM CURSO. Ela é exercitada de forma
// determinística no teste "publicar ENQUANTO o envio da foto acontece": o POST
// da server action do upload é segurado por uma rota do Playwright, então o
// clique em Publicar cai dentro da janela em que o envio está de fato em curso
// (o spinner "Enviando foto…" está em tela). Não é corrida de tempo: a janela é
// aberta e fechada pelo próprio teste.
//
// Credenciais vêm do ambiente com fallback para apps/web/.env.local, NUNCA
// inline — mesma regra de persistent-login.spec.ts. `import.meta.dirname` não
// funciona aqui: spec é transpilado para CJS e o `require` emitido aborta a
// coleta da suíte inteira. Playwright é invocado da raiz, então resolvemos do
// cwd.

import type { BrowserContext, Page } from "@playwright/test"
import { expect, request, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"

const FOTO_LIGADA_E_VAZIA = "Anexe a foto ou desligue o anexo de foto para publicar."
const LINK_LIGADO_E_VAZIO = "Informe o endereço do link ou desligue o anexo de link para publicar."

// A mesma persona de publish-golden-slice.spec.ts e vila-home.spec.ts: owner
// aprovada da Vila Ajuricaba, o único membro do seed com comunidade aprovada.
// Sem comunidade /community desenha CityReference e não há feed onde publicar.
const VILA_OWNER_EMAIL = "dono-vila@bivaque.example.invalid"

// PNG 1x1 válido, em memória: o PhotoField desenha no canvas e reexporta como
// JPEG antes de enviar, então o arquivo precisa ser uma imagem de verdade — mas
// não precisa existir no disco, e não vira fixture versionada no repositório.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
)

function requireCredentials(): { anonKey: string; password: string } {
  // `BIVAQUE_VISUAL_PASSWORD` é a senha do seed local; a owner da vila usa a
  // mesma. Nada de valor inline: sem env e sem .env.local o spec falha alto.
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) {
    throw new Error(
      "SUPABASE_ANON_KEY is required. Set it in the environment or as NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
    )
  }
  if (!password) {
    throw new Error(
      "USER_PASSWORD is required. Set it in the environment or as BIVAQUE_VISUAL_PASSWORD in apps/web/.env.local.",
    )
  }
  return { anonKey, password }
}

interface PasswordGrant {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

/**
 * Autentica a owner da vila e devolve o token, para que o spec possa LER de
 * volta o que foi gravado. A asserção de `post_type='text'` é sobre a linha no
 * banco, não sobre o que o cliente disse que ia mandar.
 */
async function signInAsVilaOwner(context: BrowserContext): Promise<string> {
  const { anonKey, password } = requireCredentials()
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email: VILA_OWNER_EMAIL, password },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(
      `Password grant for ${VILA_OWNER_EMAIL} failed with ${response.status()}. Is the local Supabase stack running and seeded?`,
    )
  }
  const grant = (await response.json()) as PasswordGrant
  await api.dispose()

  const cookieValue = encodeAuthCookieValue(grant, VILA_OWNER_EMAIL)
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
  await context.addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: "bivaque-consent-version", value: CURRENT_CONSENT, ...shared },
  ])
  return grant.access_token
}

/** A linha de `public.posts` que o insert gravou, lida de volta pelo PostgREST
 *  com o token da própria autora (a RLS de `posts` deixa a aprovada da vila ler
 *  a publicação da vila). `[]` = nada foi gravado. */
async function readPostRow(
  token: string,
  content: string,
): Promise<
  { post_type: string; photo_path: string | null; link_url: string | null; poll_options: unknown }[]
> {
  const { anonKey } = requireCredentials()
  const api = await request.newContext()
  const response = await api.get(
    `${SUPABASE_URL}/rest/v1/posts?select=post_type,photo_path,link_url,poll_options&content=eq.${encodeURIComponent(content)}`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } },
  )
  expect(response.status(), "leitura de volta do post gravado").toBe(200)
  const rows = (await response.json()) as {
    post_type: string
    photo_path: string | null
    link_url: string | null
    poll_options: unknown
  }[]
  await api.dispose()
  return rows
}

/** Abre o compositor pela Home, onde se publica desde que /community virou encaminhamento (O06). */
async function openComposer(page: Page): Promise<void> {
  // Caminho relativo: o baseURL do playwright.config.ts decide o servidor (o CI serve em :3000).
  await page.goto("/inicio", { waitUntil: "load" })
  // O shell pode estar hidratando quando o Next respondeu; sem esperar o lançador
  // renderizar, o primeiro clique cai fora do handler de React e o modal nunca abre.
  const ask = page.getByTestId("intent-pergunta")
  await expect(ask).toBeVisible({ timeout: 20000 })
  await ask.click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Criar publicação" })).toBeVisible()
}

/** Conta os POST em /rest/v1/posts que a página dispara. "Não publica" é uma
 *  afirmação sobre a REDE, não sobre a cópia em tela: a frase pode aparecer e o
 *  insert sair mesmo assim. */
function countPublishRequests(page: Page): () => number {
  let inserts = 0
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/rest/v1/posts")) inserts += 1
  })
  return () => inserts
}

function uniqueMarker(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

test.setTimeout(180_000)

test.describe("anexo ligado e vazio não vira publicação de texto", { tag: "@stateful" }, () => {
  test("1. foto ligada e vazia: não publica e diz o que fazer", async ({ page }) => {
    const token = await signInAsVilaOwner(page.context())
    const marker = uniqueMarker("P1T anexo de foto vazio")
    const inserts = countPublishRequests(page)

    await openComposer(page)
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Pergunta").fill(marker)

    // When — liga "Foto" e NÃO escolhe arquivo nenhum
    await dialog.getByRole("button", { name: "Foto", exact: true }).click()
    await expect(dialog.getByLabel("Selecionar foto")).toBeVisible()

    // And — tenta publicar
    await dialog.getByTestId("publish-submit").click()

    // Then — a frase que diz o que fazer aparece...
    await expect(dialog.getByText(FOTO_LIGADA_E_VAZIA)).toBeVisible({ timeout: 10000 })

    // And — o modal continua aberto, com o texto preservado para a pessoa
    // corrigir: bloquear não pode custar o que ela escreveu.
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("Pergunta")).toHaveValue(marker)

    // And — NADA foi enviado ao servidor, e nada foi gravado.
    expect(inserts(), "nenhum POST /rest/v1/posts").toBe(0)
    expect(await readPostRow(token, marker), "nada gravado em public.posts").toEqual([])
  })

  test("2. link ligado e vazio: não publica e diz o que fazer", async ({ page }) => {
    const token = await signInAsVilaOwner(page.context())
    const marker = uniqueMarker("P1T anexo de link vazio")
    const inserts = countPublishRequests(page)

    await openComposer(page)
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Pergunta").fill(marker)

    // When — liga "Link" e NÃO preenche a URL. O seletor abre com o campo de URL
    // vazio de propósito (o default é nenhum anexo).
    await dialog.getByRole("button", { name: "Link", exact: true }).click()
    await expect(dialog.getByLabel("URL")).toBeVisible()

    // And — tenta publicar
    await dialog.getByTestId("publish-submit").click()

    // Then — a frase é a do LINK, não a da foto: a trava nomeia o anexo da vez.
    await expect(dialog.getByText(LINK_LIGADO_E_VAZIO)).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByText(FOTO_LIGADA_E_VAZIA)).toHaveCount(0)

    // And — nada foi enviado, nada foi gravado.
    expect(inserts(), "nenhum POST /rest/v1/posts").toBe(0)
    expect(await readPostRow(token, marker), "nada gravado em public.posts").toEqual([])
  })

  test("3. desligar o anexo volta a publicar — e grava post_type='text'", async ({ page }) => {
    const token = await signInAsVilaOwner(page.context())
    const marker = uniqueMarker("P1T anexo desligado")
    const inserts = countPublishRequests(page)

    await openComposer(page)
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Pergunta").fill(marker)

    // Given — o anexo de foto chegou a ser ligado e recusado
    const foto = dialog.getByRole("button", { name: "Foto", exact: true })
    await foto.click()
    await dialog.getByTestId("publish-submit").click()
    await expect(dialog.getByText(FOTO_LIGADA_E_VAZIA)).toBeVisible({ timeout: 10000 })
    expect(inserts(), "a tentativa bloqueada não enviou nada").toBe(0)
    await expect(foto).toHaveAttribute("aria-pressed", "true")

    // When — a pessoa atende ao que a frase pediu e DESLIGA o anexo
    await foto.click()
    await expect(foto).toHaveAttribute("aria-pressed", "false")

    // And — publica
    const insert = page.waitForResponse(
      (response) =>
        response.url().includes("/rest/v1/posts") && response.request().method() === "POST",
      { timeout: 20000 },
    )
    await dialog.getByTestId("publish-submit").click()
    const response = await insert
    expect(response.status(), "POST /rest/v1/posts aceito").toBeGreaterThanOrEqual(200)
    expect(response.status()).toBeLessThan(300)

    // Then — o pedido que saiu é de TEXTO, sem coluna de anexo.
    const body = response.request().postDataJSON() as Record<string, unknown>
    expect(body["post_type"], "post_type enviado").toBe("text")
    expect(body["photo_path"]).toBeUndefined()
    expect(body["link_url"]).toBeUndefined()
    expect(body["poll_options"]).toBeUndefined()

    // And — e o que está GRAVADO é o que importa: uma linha só, do tipo texto,
    // coerente com as quatro CHECKs de public.posts.
    const rows = await readPostRow(token, marker)
    expect(rows.length, "exatamente uma linha gravada").toBe(1)
    expect(rows[0]?.post_type).toBe("text")
    expect(rows[0]?.photo_path).toBeNull()
    expect(rows[0]?.link_url).toBeNull()
    expect(rows[0]?.poll_options).toBeNull()
  })

  test("4. publicar ENQUANTO o envio da foto acontece: não perde a ação em silêncio", async ({
    page,
  }) => {
    const token = await signInAsVilaOwner(page.context())
    const marker = uniqueMarker("P1T envio em curso")
    const inserts = countPublishRequests(page)

    // Given — o envio da foto é SEGURADO pela rota: o POST da server action do
    // upload fica preso do lado do teste, então a janela "enviando" é
    // determinística em vez de uma corrida de milissegundos. Medido com sonda
    // contra o :3210: o envio dispara `POST /community` com o cabeçalho
    // `next-action` e, sem a trava, completa em menos de 10 s — o clique em
    // Publicar cairia depois dele e o teste mediria outro caminho.
    let releaseUpload = () => {}
    const held = new Promise<void>((resolve) => {
      releaseUpload = resolve
    })
    let uploadStarted = false

    await openComposer(page)
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Pergunta").fill(marker)
    await dialog.getByRole("button", { name: "Foto", exact: true }).click()

    // A rota entra DEPOIS de a página carregar: só o tráfego da janela do envio
    // passa por aqui, e nenhum POST de carregamento fica preso por engano.
    await page.route("**/*", async (route) => {
      const req = route.request()
      const isServerAction = req.method() === "POST" && req.headers()["next-action"] !== undefined
      if (isServerAction) {
        uploadStarted = true
        await held
      }
      await route.continue()
    })

    // When — escolhe o arquivo; o upload começa e NÃO termina (está segurado).
    // O spinner aparece antes do POST (o campo marca `uploading` e só depois o
    // canvas reencoda e chama a action), então esperar o spinner NÃO prova envio
    // em curso — o que prova é o POST ter sido interceptado.
    await dialog.getByLabel("Selecionar foto").setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: PNG_1X1,
    })
    await expect
      .poll(() => uploadStarted, { timeout: 20000, message: "o envio da foto começou" })
      .toBe(true)

    // And — o estado em tela é mesmo "enviando": o campo mostra o spinner, o
    // seletor está desabilitado e o anexo ainda NÃO resolveu. É esta a janela em
    // que a pessoa publica.
    await expect(dialog.getByText("Enviando foto…")).toBeVisible()
    await expect(dialog.getByLabel("Selecionar foto")).toBeDisabled()
    await expect(dialog.getByText("Foto anexada")).toHaveCount(0)

    // And — publica DENTRO da janela do envio, que é o caso que mais importa
    await dialog.getByTestId("publish-submit").click()

    // Then — a ação da pessoa não some: a publicação para e a frase diz o que
    // fazer, em vez de sair como pergunta de texto sem o anexo.
    await expect(dialog.getByText(FOTO_LIGADA_E_VAZIA)).toBeVisible({ timeout: 10000 })
    expect(inserts(), "nenhum POST /rest/v1/posts durante o envio").toBe(0)
    expect(await readPostRow(token, marker), "nada gravado em public.posts").toEqual([])

    // Cleanup — solta o upload segurado e espera o campo da foto resolver, para
    // não deixar requisição pendurada atravessando o fim do teste.
    releaseUpload()
    await page.unroute("**/*")
  })
})

// Guarda do instrumento: se o seletor de anexo sumir do compositor, o teste 3
// passaria por não ter o que desligar. Este é o único ponto do spec que checa o
// CONTRÁRIO — que a superfície usada pelos três primeiros testes existe.
test.describe("instrumento", { tag: "@stateful" }, () => {
  test("o compositor oferece os dois anexos depois da pergunta", async ({ page }) => {
    await signInAsVilaOwner(page.context())
    await openComposer(page)
    const dialog = page.getByRole("dialog")

    await expect(dialog.getByRole("button", { name: "Foto", exact: true })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Link", exact: true })).toBeVisible()
    // Nenhum anexo começa ligado: nenhum anexo é o default.
    await expect(dialog.getByRole("button", { name: "Foto", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    await expect(dialog.getByRole("button", { name: "Link", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    // E o formato NÃO é perguntado antes do conteúdo: é o que o item 5 afirma por
    // leitura de fonte, aqui confirmado como ausência de superfície em tela.
    for (const formato of ["Texto", "Enquete", "Poll"]) {
      await expect(dialog.getByRole("button", { name: formato, exact: true })).toHaveCount(0)
    }
  })
})
