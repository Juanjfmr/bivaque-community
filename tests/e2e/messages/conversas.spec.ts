import { expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { readEnvLocal, seedSession } from "../helpers/session"

// FIGMA-001 — central de conversas real sobre o mecanismo existente.
//
// Prova POSITIVA do caminho contratado do produto atual (respostas de
// prestadores): membro aprovado na comunidade do alcance do prestador
// (membro-3@, Vila Ajuricaba) vê a ficha, chama "Conversar" (RPC
// open_conversation, contexto provider) e responde; a conversa aparece na
// caixa com rótulo "Prestador".
//
// Prova NEGATIVA do mesmo caminho: visual@ não tem alcance daquele prestador
// e recebe o estado honesto de não-encontrada, sem botão nem conteúdo da ficha
// — a fronteira can_see_provider funcionando (o status HTTP dessa rota é 200 no
// Next 16 por streaming; a asserção é de conteúdo, ver o teste).
//
// Thread legado shared_group (par membro-1 ↔ par do grupo) cobre envio
// persistido, falha com rascunho preservado e retomada.
//
// Negação de terceiro: visual@ autenticado chama o PostgREST direto contra a
// conversa alheia (select vazio, insert negado) e pela UI recebe "Conversa não
// disponível" — par REAL, não uuid inventado.
//
// Delta provider (06/10/2026): o lado do DONO da ficha é endereçável em
// /prestador/conversas[/<id>] — prestador-seed@ abre o pedido pelo painel,
// responde, e membro-3@ vê a resposta após reload no shell do membro. Quem não
// é prestador cai em /community (layout do painel) e sem sessão cai em /login
// (proxy), sem afrouxar 401/403/404.
//
// Segredos: senha sempre do env/.env.local; e-mails são identificadores
// públicos do seed. URL do Supabase sempre do env (stack de prova isolado),
// nunca literal que possa divergir do app.

function requireSupabaseUrl(): string {
  const url =
    process.env["SUPABASE_URL"] ??
    readEnvLocal("SUPABASE_URL") ??
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_URL")
  if (!url)
    throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL is required (env or .env.local).")
  return url
}

function requireAnonKey(): string {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required (env or .env.local).")
  return anonKey
}

function requirePassword(): string {
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!password) {
    throw new Error("USER_PASSWORD/BIVAQUE_VISUAL_PASSWORD is required (env or .env.local).")
  }
  return password
}

const PROVIDER_PROFILE_ID = "30000000-0000-4000-8000-000000000010"
const PROVIDER_USER_ID = "20000000-0000-4000-8000-00000000000a"
const PROVIDER_FICHA = `/prestadores/${PROVIDER_PROFILE_ID}`
const GROUP_LIVROS = "60000000-0000-4000-8000-000000000003"
const MEMBER_ONE = "membro-1@bivaque.example.invalid"
const MEMBER_COMMUNITY = "membro-3@bivaque.example.invalid"
const PROVIDER_OWNER = "prestador-seed@bivaque.example.invalid"
const THIRD_PARTY = "visual@bivaque.example.invalid"

// Abre (idempotente) a conversa provider real membro-com-alcance ↔ prestador-seed
// pelo mesmo mecanismo do botão Conversar da ficha — par REAL, nunca uuid inventado.
async function openProviderConversationAsCommunityMember(): Promise<{
  conversationId: string
  memberId: string
  memberName: string
}> {
  const member = await nodeClient(MEMBER_COMMUNITY)
  const {
    data: { user: memberUser },
  } = await member.auth.getUser()
  if (!memberUser) throw new Error("sessão do membro não resolvida")
  const opened = await member.rpc("open_conversation", {
    p_other_user_id: PROVIDER_USER_ID,
    p_context_type: "provider",
    p_context_id: PROVIDER_PROFILE_ID,
  })
  if (opened.error || !opened.data) {
    throw new Error(`open_conversation falhou: ${opened.error?.message}`)
  }
  const { data: profile } = await member
    .from("profiles")
    .select("display_name")
    .eq("user_id", memberUser.id)
    .maybeSingle()
  const memberName = (profile as { display_name: string } | null)?.display_name?.trim()
  if (!memberName) throw new Error("seed sem display_name para o membro do alcance")
  return { conversationId: opened.data as string, memberId: memberUser.id, memberName }
}

async function nodeClient(email: string) {
  const client = createClient(requireSupabaseUrl(), requireAnonKey())
  const { error } = await client.auth.signInWithPassword({ email, password: requirePassword() })
  if (error) throw new Error(`sign-in falhou para ${email}: ${error.message}`)
  return client
}

// Sessão de página com o helper da casa: seedSession lê USER_EMAIL do env,
// então cada teste declara o ator antes de chamar (sequencial por worker).
async function seedSessionAs(context: Parameters<typeof seedSession>[0], email: string) {
  process.env["USER_EMAIL"] = email
  try {
    await seedSession(context)
  } finally {
    delete process.env["USER_EMAIL"]
  }
}

async function openGroupConversationAsMemberOne(): Promise<{
  conversationId: string
  memberId: string
}> {
  const member = await nodeClient(MEMBER_ONE)
  const {
    data: { user: memberUser },
  } = await member.auth.getUser()
  if (!memberUser) throw new Error("sessão do membro não resolvida")
  const peers = await member
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", GROUP_LIVROS)
    .eq("status", "approved")
    .neq("user_id", memberUser.id)
  const peerId = (peers.data as { user_id: string }[] | null)?.[0]?.user_id
  if (!peerId) throw new Error("seed sem par aprovado no grupo do fixture")
  const opened = await member.rpc("open_conversation", {
    p_other_user_id: peerId,
    p_context_type: "shared_group",
    p_context_id: GROUP_LIVROS,
  })
  if (opened.error || !opened.data) {
    throw new Error(`open_conversation falhou: ${opened.error?.message}`)
  }
  return { conversationId: opened.data as string, memberId: memberUser.id }
}

test.describe("central de conversas", () => {
  test("contato de prestador: membro com alcance abre a conversa e responde", async ({
    page,
    context,
  }) => {
    // Given um membro aprovado na comunidade do alcance do prestador
    await seedSessionAs(context, MEMBER_COMMUNITY)

    // When abre a ficha pública alcançável
    await page.goto(PROVIDER_FICHA)
    const conversar = page.getByRole("button", { name: "Conversar" })
    await expect(conversar).toBeVisible()

    // And chama o contato pelo mecanismo existente (RPC idempotente)
    await conversar.click()
    await page.waitForURL(/\/messages\/[0-9a-f-]{36}/)
    const conversationId = new URL(page.url()).pathname.split("/messages/")[1]

    // Then o thread nomeia a contraparte pelo nome comercial real da ficha e
    // rotula a categoria pelo rótulo canônico (nunca o enum cru)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Climatiza Manaus")
    await expect(page.getByText(/Assistência técnica/).first()).toBeVisible()

    // And a caixa lista a conversa com o nome comercial, não um prefixo de uuid
    await page.goto("/messages")
    await expect(page.getByRole("heading", { level: 1, name: "Conversas" })).toBeVisible()
    // Reparos finais (06/10/2026): a copy do CONSUMIDOR permanece — só o lado
    // do dono da ficha passou a descrever pedidos de membros.
    await expect(page.getByText("Respostas de prestadores, empresas e anunciantes.")).toBeVisible()
    const card = page.locator(`a[href="/messages/${conversationId}"]`)
    await expect(card).toBeVisible()
    await expect(card).toContainText("Climatiza Manaus")
    await expect(card).toContainText("Prestador")

    // And o DONO da ficha, pelo mecanismo existente, enxerga o MEMBRO como
    // contraparte — nunca o próprio negócio no lugar da pessoa. (O shell do
    // membro não serve conta prestador, então a prova do lado do dono é o RPC
    // estreito de contraparte; o título por lado está travado no unit.)
    const owner = await nodeClient(PROVIDER_OWNER)
    const counterpart = await owner.rpc("conversation_counterpart_name", {
      p_conversation_id: conversationId,
    })
    expect(counterpart.error).toBeNull()
    const ownerSees = counterpart.data as string | null
    expect(ownerSees).not.toBeNull()
    expect((ownerSees ?? "").length).toBeGreaterThan(0)
    expect(ownerSees).not.toBe("Climatiza Manaus")

    // And a resposta persiste uma única vez
    const draft = `Prova prestador FIGMA-001 ${Date.now()}`
    await page.goto(`/messages/${conversationId}`)
    const field = page.getByLabel("Escreva sua resposta")
    await field.fill(draft)
    const send = page.getByTestId("conversa-enviar")
    await send.click()
    await expect(page.getByText(draft, { exact: true })).toHaveCount(1)
    await page.reload()
    await expect(page.getByText(draft, { exact: true })).toHaveCount(1)
  })

  test("painel do prestador: dono abre o pedido, responde e o membro vê após reload", async ({
    page,
    context,
    browser,
  }) => {
    // Given a conversa provider real e um pedido do membro já entregue
    const { conversationId, memberId, memberName } =
      await openProviderConversationAsCommunityMember()
    const member = await nodeClient(MEMBER_COMMUNITY)
    const memberDraft = `Pedido do membro FIGMA-001 ${Date.now()}`
    const seeded = await member.from("dm_messages").insert({
      conversation_id: conversationId,
      sender_id: memberId,
      content: memberDraft,
    })
    if (seeded.error) throw new Error(`mensagem do membro falhou: ${seeded.error.message}`)

    // When o prestador entra no painel: a nav tem Conversas e o pedido aponta
    // para a rota endereçável do próprio painel (o link antigo /messages era
    // devolvido pelo proxy — ação morta)
    await seedSessionAs(context, PROVIDER_OWNER)
    await page.goto("/prestador")
    await expect(page.getByRole("heading", { level: 1, name: "Painel do prestador" })).toBeVisible()
    const panelNav = page.getByRole("navigation", { name: "Painel do prestador" })
    await expect(panelNav.getByRole("link", { name: "Conversas" })).toHaveAttribute(
      "href",
      "/prestador/conversas",
    )
    // Reparos finais (06/10/2026): exatamente UM aria-current por pathname —
    // na chegada ao painel o item atual é Painel.
    await expect(panelNav.locator("[aria-current='page']")).toHaveCount(1)
    await expect(panelNav.getByRole("link", { name: "Painel" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    const orderLink = page.locator(`a[href="/prestador/conversas/${conversationId}"]`)
    await expect(orderLink).toBeVisible()

    // And a caixa do prestador lista o pedido e abre o detalhe pelo link real
    await page.goto("/prestador/conversas")
    await expect(page.getByRole("heading", { level: 1, name: "Conversas" })).toBeVisible()
    // A caixa do DONO descreve pedidos de membros (a copy do consumidor
    // permanece em /messages), e o item atual da nav passa a ser Conversas —
    // continua sendo exatamente um aria-current.
    await expect(
      page.getByText("Pedidos de membros sobre a sua ficha e os seus serviços."),
    ).toBeVisible()
    await expect(panelNav.locator("[aria-current='page']")).toHaveCount(1)
    await expect(panelNav.getByRole("link", { name: "Conversas" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    const inboxCard = page.locator(`a[href="/prestador/conversas/${conversationId}"]`)
    await expect(inboxCard).toBeVisible()
    await inboxCard.click()
    await expect(page).toHaveURL(`/prestador/conversas/${conversationId}`)
    // No thread, Conversas continua ativo: o prefixo do pathname decide o único
    // aria-current (reparo final do despacho 06/10/2026).
    await expect(panelNav.locator("[aria-current='page']")).toHaveCount(1)
    await expect(panelNav.getByRole("link", { name: "Conversas" })).toHaveAttribute(
      "aria-current",
      "page",
    )

    // Then o thread nomeia o MEMBRO pelo nome pessoal real (o dono nunca vê o
    // próprio negócio no lugar da pessoa) e mostra o pedido
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(memberName)
    await expect(page.getByText(memberDraft, { exact: true })).toBeVisible()

    // And a volta do thread aponta para a caixa do próprio painel
    await expect(page.getByRole("link", { name: "← Conversas" })).toHaveAttribute(
      "href",
      "/prestador/conversas",
    )

    // When responde, a entrega persiste e o refresh reconstrói
    const reply = `Resposta do prestador FIGMA-001 ${Date.now()}`
    const field = page.getByLabel("Escreva sua resposta")
    await field.fill(reply)
    const send = page.getByTestId("conversa-enviar")
    await expect(send).toBeEnabled()
    await send.click()
    await expect(page.getByText(reply, { exact: true })).toHaveCount(1)
    await page.reload()
    await expect(page.getByText(reply, { exact: true })).toHaveCount(1)

    // Then o membro vê a resposta no shell dele, após reload — prova de
    // navegador com sessão própria (segundo contexto), não leitura de banco
    const memberContext = await browser.newContext()
    try {
      await seedSessionAs(memberContext, MEMBER_COMMUNITY)
      const memberPage = await memberContext.newPage()
      await memberPage.goto(`/messages/${conversationId}`)
      await memberPage.reload()
      await expect(memberPage.getByRole("heading", { level: 1 })).toHaveText("Climatiza Manaus")
      await expect(memberPage.getByText(reply, { exact: true })).toHaveCount(1)
      await expect(memberPage.getByText(memberDraft, { exact: true })).toHaveCount(1)
    } finally {
      await memberContext.close()
    }
  })

  test("quem não é o prestador da conversa não a alcança nem pelo painel nem por chamada direta", async ({
    page,
    context,
  }) => {
    // Given a conversa provider real (par real do seed, mecanismo idempotente)
    const { conversationId } = await openProviderConversationAsCommunityMember()

    // When visual@ (terceiro autenticado, não participante) chama o PostgREST
    // direto: leitura vazia e escrita COMO SI PRÓPRIO negada pela RLS de
    // participante (42501). LIMITE REGISTRADO: o seed não tem uma SEGUNDA conta
    // provider e o contrato proíbe criá-la (provider_accounts é escrita
    // privilegiada) — o caso "provider alheio" não é provado por este teste de
    // membro; cabe à prova de runtime exercitá-lo com um segundo provider
    // autenticado no stack isolado.
    const third = await nodeClient(THIRD_PARTY)
    const readConvs = await third.from("dm_conversations").select("id").eq("id", conversationId)
    expect(readConvs.error).toBeNull()
    expect(readConvs.data ?? []).toEqual([])
    const readMsgs = await third
      .from("dm_messages")
      .select("id")
      .eq("conversation_id", conversationId)
    expect(readMsgs.error).toBeNull()
    expect(readMsgs.data ?? []).toEqual([])
    const {
      data: { user: thirdUser },
    } = await third.auth.getUser()
    if (!thirdUser) throw new Error("sessão do terceiro não resolvida")
    const write = await third.from("dm_messages").insert({
      conversation_id: conversationId,
      sender_id: thirdUser.id,
      content: "Intrusão de terceiro na conversa do prestador.",
    })
    expect(write.error).not.toBeNull()
    expect(write.error?.code).toBe("42501")

    // And pela UI o layout do painel recusa quem não é prestador: caixa e
    // detalhe terminam em /community, sem conteúdo alheio
    await seedSessionAs(context, THIRD_PARTY)
    await page.goto("/prestador/conversas")
    await expect(page).toHaveURL(/\/community/)
    await page.goto(`/prestador/conversas/${conversationId}`)
    await expect(page).toHaveURL(/\/community/)
  })

  test("membro sem alcance não vê a ficha: não-encontrada honesto, sem contato nem conteúdo", async ({
    page,
    context,
  }) => {
    // Given visual@, sem comunidade aprovada e fora do alcance do prestador
    await seedSessionAs(context, THIRD_PARTY)

    // When abre a mesma ficha
    await page.goto(PROVIDER_FICHA)

    // Then a fronteira can_see_provider segura a UI: boundary pt-BR visível,
    // sem botão de contato e sem NENHUM conteúdo da ficha (nome comercial ou
    // bio). O status HTTP não é asserção nesta rota por contrato registrado em
    // (shell)/prestadores/[id]/page.tsx: no Next 16 o notFound() daqui responde
    // 200 com a UI de não-encontrada (streaming) — observado deterministicamente
    // em 06/10/2026 no build isolado, nos três viewports. A prova externa da
    // negação é conteúdo presente/ausente, não o código.
    await expect(page.getByText("Página não encontrada")).toBeVisible()
    await expect(page.getByRole("button", { name: "Conversar" })).toHaveCount(0)
    await expect(page.getByText("Climatiza Manaus")).toHaveCount(0)
    await expect(page.getByText("Manutenção e instalação de ar-condicionado")).toHaveCount(0)
  })

  test("thread shared_group: envio persistido, falha com rascunho e retomada", async ({
    page,
    context,
  }) => {
    // Given a conversa real do par membro-1 ↔ par do grupo, pelo RPC existente
    const { conversationId } = await openGroupConversationAsMemberOne()

    await seedSessionAs(context, MEMBER_ONE)
    await page.goto("/messages")
    await expect(page.getByRole("heading", { level: 1, name: "Conversas" })).toBeVisible()
    const card = page.locator(`a[href="/messages/${conversationId}"]`)
    await expect(card).toBeVisible()
    await expect(card).toContainText("Grupo em comum")
    // Comunidades não está na navegação desta versão
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).not.toContainText(
      "Comunidades",
    )

    // When responde pela URL estável
    await page.goto(`/messages/${conversationId}`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const draft = `Prova FIGMA-001 ${Date.now()}`
    const field = page.getByLabel("Escreva sua resposta")
    await field.fill(draft)
    const send = page.getByTestId("conversa-enviar")
    await expect(send).toBeEnabled()
    await send.click()

    // Then persiste uma única vez e o refresh reconstroi
    await expect(page.getByText(draft, { exact: true })).toHaveCount(1)
    await expect(page.getByText("Enviado", { exact: true }).first()).toBeVisible()
    await page.reload()
    await expect(page.getByText(draft, { exact: true })).toHaveCount(1)
    await expect(page.getByText(/Você · enviado/).first()).toBeVisible()

    // When a rede cai, a mensagem falha sem perder o rascunho
    const failing = `Retomada FIGMA-001 ${Date.now()}`
    await context.setOffline(true)
    await field.fill(failing)
    await send.click()
    await expect(page.getByText("Não enviado", { exact: false }).first()).toBeVisible()
    await expect(page.getByText(failing, { exact: true })).toHaveCount(1)
    const retry = page.getByRole("button", { name: "Tentar novamente" }).first()
    await expect(retry).toBeVisible()

    // And a retomada entrega a mesma mensagem, uma única vez
    await context.setOffline(false)
    await retry.click()
    await expect(page.getByText(failing, { exact: true })).toHaveCount(1)
    await expect(page.getByText(draft, { exact: true })).toHaveCount(1)

    // E com rascunho vazio o Enviar permanece desabilitado
    await expect(send).toBeDisabled()
  })

  test("terceiro autenticado não lê nem escreve na conversa alheia", async ({ page, context }) => {
    // Given a conversa real do par membro-1 com pelo menos uma mensagem
    const { conversationId, memberId } = await openGroupConversationAsMemberOne()
    const member = await nodeClient(MEMBER_ONE)
    const seeded = await member
      .from("dm_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .limit(1)
    if ((seeded.data ?? []).length === 0) {
      const insert = await member.from("dm_messages").insert({
        conversation_id: conversationId,
        sender_id: memberId,
        content: "Mensagem do par para a prova de negação.",
      })
      if (insert.error) throw new Error(`seed de mensagem falhou: ${insert.error.message}`)
    }

    // When um terceiro autenticado chama direto o PostgREST
    const third = await nodeClient(THIRD_PARTY)
    const readConvs = await third.from("dm_conversations").select("id").eq("id", conversationId)
    expect(readConvs.error).toBeNull()
    expect(readConvs.data ?? []).toEqual([])

    const readMsgs = await third
      .from("dm_messages")
      .select("id")
      .eq("conversation_id", conversationId)
    expect(readMsgs.error).toBeNull()
    expect(readMsgs.data ?? []).toEqual([])

    // Escrita negada COMO O PRÓPRIO TERCEIRO (sender_id = uid dele): com
    // sender_id forjado no par, QUALQUER insert falharia por sender≠auth.uid()
    // até para participante — só o 42501 na linha própria isola a negação por
    // NÃO PARTICIPAÇÃO na RLS de dm_messages.
    const {
      data: { user: thirdUser },
    } = await third.auth.getUser()
    if (!thirdUser) throw new Error("sessão do terceiro não resolvida")
    const write = await third.from("dm_messages").insert({
      conversation_id: conversationId,
      sender_id: thirdUser.id,
      content: "Intrusão de terceiro na conversa alheia.",
    })
    expect(write.error).not.toBeNull()
    expect(write.error?.code).toBe("42501")

    // And pela UI a conversa alheia é estado honesto, nunca conteúdo
    await seedSessionAs(context, THIRD_PARTY)
    await page.goto(`/messages/${conversationId}`)
    await expect(page.getByText("Conversa não disponível")).toBeVisible()
    await expect(page.getByText("Mensagem do par para a prova de negação.")).toHaveCount(0)
  })

  test("sem sessão as rotas de conversa voltam para o login", async ({ page }) => {
    await page.goto("/messages/00000000-0000-4000-8000-000000000099")
    await expect(page).toHaveURL(/\/login/)
    // Delta provider (FIGMA-001): 401 nas duas rotas novas do painel — o proxy
    // exige sessão antes de qualquer decisão de papel.
    await page.goto("/prestador/conversas")
    await expect(page).toHaveURL(/\/login/)
    await page.goto("/prestador/conversas/00000000-0000-4000-8000-000000000099")
    await expect(page).toHaveURL(/\/login/)
  })
})
