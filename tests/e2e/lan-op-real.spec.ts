import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../../supabase/database.generated"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

// "Caminhada no Mindu": grupo aberto do seed na primeira localidade (Manaus).
const GRUPO_ABERTO_SEMEADO = "60000000-0000-4000-8000-000000000001"

/** Mensagem curta da falha de limpeza (sem segredo: só a mensagem do erro do Supabase). */
function motivoDaFalha(erro: unknown): string {
  if (erro instanceof Error) return erro.message.slice(0, 200)
  if (typeof erro === "object" && erro !== null && "message" in erro) {
    return String((erro as { message: unknown }).message).slice(0, 200)
  }
  return "erro sem mensagem"
}

/** Do processo ou do arquivo local do apps/web (o que o CI escreve), como os outros specs reais. */
function lerCredencial(chave: string): string | undefined {
  const doProcesso = process.env[chave]
  if (typeof doProcesso === "string" && doProcesso.length > 0) return doProcesso
  return readEnvLocal(chave)
}

// Rodar só com stack local exclusiva, seed e --workers=1. Não executado no RUN-024 local.
test.describe.configure({ mode: "serial" })

for (const theme of ["light", "dark"] as const) {
  test(`três ciclos do operador, ${theme} @stateful`, async ({ page, request }, info) => {
    test.setTimeout(180_000)
    const url = lerCredencial("SUPABASE_URL") ?? lerCredencial("NEXT_PUBLIC_SUPABASE_URL")
    const anon =
      lerCredencial("SUPABASE_ANON_KEY") ?? lerCredencial("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    const key = lerCredencial("SUPABASE_SERVICE_ROLE_KEY")
    if (!url || !anon || !key) throw new Error("Credenciais descartáveis da stack local ausentes")
    if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
      throw new Error("RUN-024 só pode escrever na stack local")
    }
    const base = new URL(info.project.use.baseURL ?? "http://127.0.0.1:3000")
    if (!["127.0.0.1", "localhost"].includes(base.hostname)) {
      throw new Error("O painel de teste também deve ser local")
    }
    const admin = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const users: { id: string; email: string }[] = []
    const paths: string[] = []
    const documents: string[] = []
    const posts: string[] = []
    const reports: string[] = []
    const artifact = join(process.cwd(), ".visual", "run-024", "e2e", info.project.name, theme)
    await mkdir(artifact, { recursive: true })
    await page.emulateMedia({ colorScheme: theme })

    function check(result: { error: unknown }, label: string) {
      expect(result.error, label).toBeNull()
    }
    async function account() {
      const email = `run-024-${randomUUID()}@example.invalid`
      const password = randomUUID()
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (created.error || !created.data.user) throw new Error("Falha na conta sintética")
      const user = { id: created.data.user.id, email }
      users.push(user)
      const client = createClient<Database>(url ?? "", anon ?? "", {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const signed = await client.auth.signInWithPassword({ email, password })
      if (signed.error || !signed.data.session) throw new Error("Falha na sessão sintética")
      return { ...user, client, session: signed.data.session }
    }
    async function submitDocument(userId: string, upload: boolean) {
      const path = `${userId}/${randomUUID()}.pdf`
      paths.push(path)
      const pdf = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
      )
      if (upload)
        check(
          await admin.storage.from("verification-documents").upload(path, pdf, {
            contentType: "application/pdf",
          }),
          "upload sintético",
        )
      const result = await admin.rpc("submit_verification_document", {
        p_user_id: userId,
        p_storage_object_path: path,
        p_mime_type: "application/pdf",
      })
      if (result.error || !result.data) throw new Error("Falha no documento sintético")
      documents.push(result.data)
      return { id: result.data, path, pdf }
    }
    async function capture(name: string) {
      await expect(page.locator(".operator-panel")).toHaveCSS("color-scheme", theme)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      await page.screenshot({ path: join(artifact, `${name}.png`), fullPage: true })
    }

    try {
      const locality = await admin.from("localities").select("id").order("id").limit(1).single()
      if (locality.error || !locality.data) throw new Error("Stack local sem seed de localidades")
      const operator = await account()
      check(
        await admin.from("operators").insert({ auth_user_id: operator.id }),
        "operador sintético",
      )
      const setup = await submitDocument(operator.id, false)
      check(
        await admin.rpc("decide_verification_document", {
          p_document_id: setup.id,
          p_decision: "approved",
          p_reason: "",
          p_operator_user_id: operator.id,
        }),
        "verificação da fixture do operador",
      )
      check(
        await admin.rpc("provision_member_locality", {
          p_user_id: operator.id,
          p_locality_id: locality.data.id,
        }),
        "cidade do operador",
      )
      const project = new URL(url).hostname.split(".")[0]
      await page.context().addCookies([
        {
          name: `sb-${project}-auth-token`,
          value: encodeAuthCookieValue(
            {
              ...operator.session,
              expires_at:
                operator.session.expires_at ??
                Math.floor(Date.now() / 1000) + operator.session.expires_in,
            },
            operator.email,
          ),
          url: base.origin,
          sameSite: "Lax",
        },
        {
          name: "bivaque-consent-version",
          value: CURRENT_CONSENT,
          url: base.origin,
          sameSite: "Lax",
        },
      ])
      const member = await account()
      const reporter = await account()
      const doc = await submitDocument(member.id, true)

      // 1. Documento: entrada, leitura autorizada byte a byte, aprovação, aviso e descarte.
      await page.goto(`/admissions/${member.id}`)
      await expect(page.getByRole("link", { name: "Ver documento" })).toBeVisible()
      const opened = await page.context().request.get(`/admissions/document/${doc.id}`)
      expect(opened.ok()).toBe(true)
      expect(await opened.body()).toEqual(doc.pdf)
      await capture("01-verificacao")
      await page.getByRole("button", { name: "Aprovar documento", exact: true }).click()
      await expect
        .poll(async () => {
          const result = await member.client
            .from("notifications")
            .select("id")
            .eq("type", "verification_decision")
            .eq("action", "approved")
          check(result, "aviso de verificação")
          return result.data?.length
        })
        .toBe(1)
      await expect
        .poll(async () => {
          const result = await admin.storage.from("verification-documents").download(doc.path)
          return result.data === null && result.error !== null
        })
        .toBe(true)
      check(
        await admin.rpc("provision_member_locality", {
          p_user_id: member.id,
          p_locality_id: locality.data.id,
        }),
        "cidade do membro",
      )

      // 2. Denúncia: alvo real e efeito sob o token do autor.
      // Publicação só existe dentro de grupo: o membro entra num grupo aberto
      // semeado da mesma cidade pela mesma RPC do produto.
      check(
        await member.client.rpc("join_group", { p_group_id: GRUPO_ABERTO_SEMEADO }),
        "entrada no grupo aberto",
      )
      const postId = randomUUID()
      posts.push(postId)
      check(
        await member.client.from("posts").insert({
          id: postId,
          user_id: member.id,
          group_id: GRUPO_ABERTO_SEMEADO,
          post_type: "text",
          locality_id: locality.data.id,
          content: "Conteúdo sintético do RUN-024",
        }),
        "publicação real",
      )
      // A denúncia sai da sessão de quem denuncia, como no produto (o papel de
      // serviço não insere em reports). Denunciar exige cidade.
      check(
        await admin.rpc("provision_member_locality", {
          p_user_id: reporter.id,
          p_locality_id: locality.data.id,
        }),
        "cidade de quem denuncia",
      )
      const denuncia = await reporter.client
        .from("reports")
        .insert({
          reporter_user_id: reporter.id,
          target_type: "post",
          target_id: postId,
          reason: "Outro: teste sintético",
        })
        .select("id")
        .single()
      check(denuncia, "denúncia real")
      const reportId = denuncia.data?.id
      if (!reportId) throw new Error("A denúncia não devolveu o id")
      reports.push(reportId)
      await page.goto(`/reports/${reportId}`)
      await expect(page.getByText("Conteúdo sintético do RUN-024").first()).toBeVisible()
      await page.getByRole("radio", { name: /Ocultar conteúdo/ }).check()
      await page.getByLabel(/Justificativa da decisão/).fill("Regra sintética do piloto")
      await capture("02-denuncia")
      await page.getByRole("button", { name: "Confirmar decisão" }).click()
      await expect
        .poll(async () => {
          const result = await admin.from("reports").select("status").eq("id", reportId).single()
          check(result, "decisão persistida")
          return result.data?.status
        })
        .toBe("resolved")
      const invisible = await member.client.from("posts").select("id").eq("id", postId)
      check(invisible, "RLS do conteúdo")
      expect(invisible.data).toEqual([])
      const authorNotice = await member.client
        .from("notifications")
        .select("actor_user_id,target_type,target_id,action")
        .eq("type", "moderation_decision")
        .single()
      check(authorNotice, "aviso ao autor")
      expect(authorNotice.data).toEqual({
        actor_user_id: null,
        target_type: "user",
        target_id: member.id,
        action: "hide",
      })
      const reporterNotice = await reporter.client
        .from("notifications")
        .select("action")
        .eq("type", "report_resolved")
        .single()
      check(reporterNotice, "retorno ao denunciante")
      expect(reporterNotice.data?.action).toBe("resolved")
      const denied = await request.post(new URL(`/api/admin/reports/${reportId}`, base).href, {
        headers: { authorization: `Bearer ${member.session.access_token}` },
        data: { action: "resolve", note: "Não permitido" },
      })
      expect(denied.status()).toBe(403)

      // 3. Suspensão: ação no painel, escrita negada e reabilitação.
      await page.goto(`/suspensions?membro=${member.id}`)
      await page.getByLabel("Motivo da suspensão", { exact: true }).fill("Regra sintética")
      await page.getByLabel("Prazo em dias").fill("7")
      await page.getByRole("button", { name: "Aplicar suspensão", exact: true }).click()
      await expect
        .poll(async () => {
          const result = await member.client.rpc("is_account_suspended", { p_user_id: member.id })
          check(result, "estado da suspensão")
          return result.data
        })
        .toBe(true)
      await capture("03-suspensao")
      const blockedId = randomUUID()
      posts.push(blockedId)
      const blocked = await member.client.from("posts").insert({
        id: blockedId,
        user_id: member.id,
        post_type: "text",
        locality_id: locality.data.id,
        content: "Escrita negada",
      })
      expect(blocked.error?.code).toBe("42501")
      const card = page.getByRole("listitem").filter({ hasText: member.id })
      await card.getByLabel("Motivo do encerramento").fill("Recurso sintético aceito")
      await card.getByRole("button", { name: "Encerrar suspensão" }).click()
      await expect
        .poll(async () => {
          const result = await member.client.rpc("is_account_suspended", { p_user_id: member.id })
          check(result, "fim da suspensão")
          return result.data
        })
        .toBe(false)
      const resumedId = randomUUID()
      posts.push(resumedId)
      check(
        await member.client.from("posts").insert({
          id: resumedId,
          user_id: member.id,
          post_type: "text",
          locality_id: locality.data.id,
          content: "Escrita restabelecida",
        }),
        "publicação depois da suspensão",
      )

      await page.goto("/operator-actions")
      await expect(
        page.getByRole("heading", { name: "Registro das ações", exact: true }),
      ).toBeVisible()
      await expect(page.getByText("Suspensão encerrada", { exact: true })).toBeVisible()
      await capture("04-registro")
    } finally {
      // Só identidades/objetos aleatórios deste teste; continua limpando se uma etapa falhar.
      const failures: string[] = []
      async function cleanup(label: string, operation: () => PromiseLike<{ error: unknown }>) {
        try {
          const { error } = await operation()
          if (error) failures.push(`${label}: ${motivoDaFalha(error)}`)
        } catch (erro) {
          failures.push(`${label}: ${motivoDaFalha(erro)}`)
        }
      }
      // A auditoria permanece; seus target_id sintéticos ficam identificados no manifesto.
      await cleanup("manifesto das fixtures", async () => {
        await writeFile(
          join(artifact, `fixtures-${randomUUID()}.json`),
          JSON.stringify({ run: "RUN-024", users, documents, posts, reports }, null, 2),
        )
        return { error: null }
      })
      const ids = users.map((user) => user.id)
      if (ids.length) {
        await cleanup("avisos", () =>
          admin.from("notifications").delete().in("recipient_user_id", ids),
        )
        await cleanup("outbox", () =>
          admin
            .from("outbox")
            .delete()
            .in(
              "recipient",
              users.map((user) => user.email),
            ),
        )
      }
      if (reports.length)
        await cleanup("denúncias", () => admin.from("reports").delete().in("id", reports))
      if (posts.length)
        await cleanup("publicações", () => admin.from("posts").delete().in("id", posts))
      if (paths.length)
        await cleanup("arquivos", () => admin.storage.from("verification-documents").remove(paths))
      for (const path of paths)
        await cleanup("fila de descarte", () =>
          admin.rpc("complete_verification_document_removal", {
            p_storage_object_path: path,
          }),
        )
      // Ordem inversa: o membro sai antes do operador e leva o próprio documento
      // (cascade). Documento decidido exige `reviewed_by`; apagar o operador
      // primeiro tentaria anulá-lo e o Auth recusaria a exclusão.
      for (const user of [...users].reverse())
        await cleanup("conta sintética", () => admin.auth.admin.deleteUser(user.id))
      expect(failures, "limpeza obrigatória da stack local").toEqual([])
    }
  })
}
