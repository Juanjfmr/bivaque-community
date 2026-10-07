import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { readEnvLocal } from "../helpers/session"
import {
  cleanupRunManifest,
  createRunManifest,
  recoverInterruptedRuns,
  track,
} from "./run-manifest"

// FIGMA-002 — rota /api/admin/reports/[id] no alvo `listing`.
//
// A rota é um Route Handler com header `Authorization: Bearer`. Para anúncio ela
// tem que chamar `public.moderate_listing` pelo cliente autenticado COM O TOKEN
// DO CALLER, para que o ator venha de auth.uid() e o papel seja conferido na
// transação; service_role zeraria auth.uid() e um id de operador por argumento
// seria o ator escolhido pelo chamador. O alvo do anúncio é resolvido no
// servidor a partir da denúncia autorizada — quem chama manda o id do
// relatório, nunca o do anúncio.
//
// Esta prova cobre: operador ocultando anúncio, membro negado, relatório
// inexistente, denúncia já resolvida, idempotência (segunda denúncia aberta,
// feita por outro membro enquanto o anúncio estava visível, é resolvida depois
// sem evento novo) e a REGRESSÃO dos outros alvos, cujo hide e dismiss
// continuam no `resolve_report` de service_role.

function env(key: string): string {
  const value = process.env[key] ?? readEnvLocal(key)
  if (!value) throw new Error(`Required environment: ${key}`)
  return value
}
const url = env("SUPABASE_URL")
const APP = "http://127.0.0.1:3012"
if (url !== "http://127.0.0.1:55621")
  throw new Error("FIGMA-002 runtime must use isolated stack 55621")
const anonKey = env("SUPABASE_ANON_KEY")

const OWNER = "visual@bivaque.example.invalid"
const MEMBER = "membro-1@bivaque.example.invalid"
const SECOND_MEMBER = "membro-2@bivaque.example.invalid"
const OPERATOR = "operador@bivaque.example.invalid"

async function tokenFor(email: string): Promise<string> {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: process.env["USER_PASSWORD"] ?? env("BIVAQUE_VISUAL_PASSWORD"),
    }),
  })
  if (response.status !== 200) throw new Error(`login falhou para ${email}`)
  const body = (await response.json()) as { access_token?: string }
  if (!body.access_token) throw new Error("sem access_token")
  return body.access_token
}

async function actorClient(email: string) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const result = await client.auth.signInWithPassword({
    email,
    password: process.env["USER_PASSWORD"] ?? env("BIVAQUE_VISUAL_PASSWORD"),
  })
  if (result.error) throw new Error(`login falhou para ${email}`)
  return client
}

interface ApiResponse {
  status: number
  body: Record<string, unknown>
}

async function callReportAction(
  accessToken: string,
  reportId: string,
  action: "hide" | "resolve",
  note?: string,
): Promise<ApiResponse> {
  const response = await fetch(`${APP}/api/admin/reports/${reportId}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, ...(note === undefined ? {} : { note }) }),
  })
  return { status: response.status, body: (await response.json()) as Record<string, unknown> }
}

function psql(sql: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_bivaque-figma001-proof",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-F",
      "|",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { encoding: "utf8", timeout: 20_000 },
  ).trim()
}

// Recuperação de interrupção: só alcança manifesto deste módulo cujo writer
// já morreu, e apaga os ids exatos declarados nele. Execução viva é pulada.
test.beforeAll(async () => {
  await recoverInterruptedRuns()
})

test("rota de API resolve o alvo no servidor e cobre o ramo de anúncio", async () => {
  const operatorToken = await tokenFor(OPERATOR)
  const memberToken = await tokenFor(MEMBER)
  const owner = await actorClient(OWNER)
  const member = await actorClient(MEMBER)
  const ownerId = (await owner.auth.getUser()).data.user?.id
  if (!ownerId) throw new Error("sem identidade do anunciante")

  let listingId: string | undefined
  const manifest = createRunManifest()
  try {
    const membership = await owner
      .from("locality_memberships")
      .select("locality_id")
      .eq("user_id", ownerId)
      .eq("kind", "current")
      .single()
    if (membership.error || !membership.data) {
      throw new Error(`[localidade do anunciante] ${membership.error?.message ?? "sem linha"}`)
    }

    const created = await owner.rpc("create_property_listing", {
      p_title: `Rota API FIGMA002 ${randomUUID().slice(0, 8)}`,
      p_description: "Anúncio de prova do ramo de anúncio na rota de API.",
      p_locality_id: membership.data.locality_id,
      p_community_id: null,
      p_property_type: "apartamento",
      p_neighborhood: "Ponta Negra",
      p_rent_cents: 200000,
      p_condo_fee_cents: null,
      p_iptu_cents: null,
      p_bedrooms: 2,
      p_bathrooms: 1,
      p_parking_spots: 1,
      p_area_m2: 60,
      p_available_from: null,
      p_is_furnished: false,
      p_accepts_pets: false,
      p_condo_included_in_rent: false,
    })
    if (created.error || !created.data) {
      throw new Error(`[criação do anúncio] ${created.error?.message ?? "sem id"}`)
    }
    listingId = created.data
    track(manifest, "listings", listingId)
    const published = await owner
      .from("listings")
      .update({ status: "active" })
      .eq("id", listingId)
      .select("id")
      .single()
    if (published.error) throw new Error(`[publicação] ${published.error.message}`)

    // A segunda denúncia é criada ANTES de qualquer ocultação, por outro
    // membro: duas denúncias abertas do mesmo alvo são aceitas (a unicidade é
    // por denunciante), e é essa a fila que o hide tem de resolver.
    const secondReporter = await actorClient(SECOND_MEMBER)
    const secondReport = await secondReporter
      .from("reports")
      .insert({
        target_type: "listing",
        target_id: listingId,
        reason: "Informação enganosa: segunda denúncia aberta",
      })
      .select("id")
      .single()
    track(manifest, "reports", secondReport.data?.id ?? "")
    if (secondReport.error || !secondReport.data) {
      throw new Error(`[segunda denúncia] ${secondReport.error?.message ?? "sem id"}`)
    }

    const reported = await member
      .from("reports")
      .insert({
        target_type: "listing",
        target_id: listingId,
        reason: "Informação enganosa: prova da rota de API",
      })
      .select("id")
      .single()
    track(manifest, "reports", reported.data?.id ?? "")
    if (reported.error || !reported.data) {
      throw new Error(`[denúncia de anúncio] ${reported.error?.message ?? "sem id"}`)
    }
    const listingReportId = reported.data.id

    // Membro comum é recusado ANTES de qualquer escrita.
    const denied = await callReportAction(memberToken, listingReportId, "hide", "não sou operador")
    expect(denied.status).toBe(403)
    expect(denied.body).toEqual({ error: "forbidden" })
    const untouched = await owner
      .from("listings")
      .select("moderation_hidden")
      .eq("id", listingId)
      .single()
    expect(untouched.data?.moderation_hidden).toBe(false)

    // Relatório inexistente: a mesma negativa de "não existe / já resolvido".
    const missing = await callReportAction(
      operatorToken,
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
      "hide",
    )
    expect(missing.status).toBe(404)
    expect(missing.body).toEqual({ error: "not found or already resolved" })

    // Operador oculta: response shape preservado e estado real no banco.
    const hidden = await callReportAction(
      operatorToken,
      listingReportId,
      "hide",
      "Ocultado pela rota de API",
    )
    expect(hidden.status).toBe(200)
    expect(hidden.body).toEqual({ ok: true, action: "hide", reportId: listingReportId })

    const afterHide = await owner
      .from("listings")
      .select("moderation_hidden, moderation_hidden_by, status")
      .eq("id", listingId)
      .single()
    expect(afterHide.data?.moderation_hidden).toBe(true)
    expect(afterHide.data?.status).toBe("active")
    const actors = psql(
      `select distinct operator_user_id from public.listing_moderation_events where listing_id = '${listingId}'`,
    )
    expect(actors).not.toBe("")

    // A denúncia foi resolvida na mesma transação; repetir o hide dá 404.
    const repeat = await callReportAction(operatorToken, listingReportId, "hide", "de novo")
    expect(repeat.status).toBe(404)
    expect(repeat.body).toEqual({ error: "not found or already resolved" })

    // Idempotência: a OUTRA denúncia aberta, do outro membro, é resolvida pela
    // rota agora que o anúncio já está oculto — e NENHUM evento novo é
    // gravado. O que é idempotente é o evento, não a fila: sem isto esta
    // denúncia ficaria na triagem para sempre.
    const eventsBefore = psql(
      `select count(*) from public.listing_moderation_events where listing_id = '${listingId}'`,
    )
    const again = await callReportAction(
      operatorToken,
      secondReport.data.id,
      "hide",
      "já estava oculto",
    )
    expect(again.status).toBe(200)
    expect(again.body).toEqual({ ok: true, action: "hide", reportId: secondReport.data.id })
    const eventsAfter = psql(
      `select count(*) from public.listing_moderation_events where listing_id = '${listingId}'`,
    )
    expect(eventsAfter).toBe(eventsBefore)
    const resolvedSecond = await secondReporter
      .from("reports")
      .select("status")
      .eq("id", secondReport.data.id)
      .single()
    expect(resolvedSecond.data?.status).toBe("resolved")

    // Anúncio ocultado não aceita denúncia NOVA: a negativa é da policy.
    const late = await member
      .from("reports")
      .insert({
        target_type: "listing",
        target_id: listingId,
        reason: "Informação enganosa: depois de ocultado",
      })
      .select("id")
      .maybeSingle()
    expect(late.error).not.toBeNull()

    // ── regressão: outro alvo continua no resolve_report ─────────────────────
    // A publicação é do ANUNCIANTE e a denúncia é de OUTRO membro: pelo mesmo
    // `cannot report your own content` que o pgTAP já prova, o denunciante
    // nunca é o autor do alvo.
    const post = await owner
      .from("posts")
      .insert({
        locality_id: membership.data.locality_id,
        user_id: ownerId,
        post_type: "text",
        content: `Publicação de prova da rota de API ${randomUUID().slice(0, 8)}`,
      })
      .select("id")
      .single()
    if (post.error || !post.data) {
      throw new Error(`[publicação de prova] ${post.error?.message ?? "sem id"}`)
    }
    const postId = post.data.id
    track(manifest, "posts", postId)
    const postReport = await member
      .from("reports")
      .insert({
        target_type: "post",
        target_id: postId,
        reason: "Spam: prova da rota de API",
      })
      .select("id")
      .single()
    track(manifest, "reports", postReport.data?.id ?? "")
    if (postReport.error || !postReport.data) {
      throw new Error(`[denúncia de publicação] ${postReport.error?.message ?? "sem id"}`)
    }

    const eventsBeforePost = psql("select count(*) from public.listing_moderation_events")
    const postHide = await callReportAction(operatorToken, postReport.data.id, "hide", "Ocultado")
    expect(postHide.status).toBe(200)
    expect(postHide.body).toEqual({ ok: true, action: "hide", reportId: postReport.data.id })
    const postRow = await member.from("posts").select("is_deleted").eq("id", postId).maybeSingle()
    expect(postRow.error).toBeNull()
    expect(postRow.data?.is_deleted).toBe(true)
    // O ramo de anúncio NÃO foi usado para a publicação: nenhum evento novo.
    expect(psql("select count(*) from public.listing_moderation_events")).toBe(eventsBeforePost)

    // dismiss de outro alvo: response shape preservado e nada ocultado.
    const dismissPost = await owner
      .from("posts")
      .insert({
        locality_id: membership.data.locality_id,
        user_id: ownerId,
        post_type: "text",
        content: `Publicação de dismiss ${randomUUID().slice(0, 8)}`,
      })
      .select("id")
      .single()
    track(manifest, "posts", dismissPost.data?.id ?? "")
    if (dismissPost.error || !dismissPost.data) {
      throw new Error(`[publicação de dismiss] ${dismissPost.error?.message ?? "sem id"}`)
    }
    const dismissReport = await member
      .from("reports")
      .insert({
        target_type: "post",
        target_id: dismissPost.data.id,
        reason: "Outro: prova de dismiss",
      })
      .select("id")
      .single()
    track(manifest, "reports", dismissReport.data?.id ?? "")
    if (dismissReport.error || !dismissReport.data) {
      throw new Error(`[denúncia de dismiss] ${dismissReport.error?.message ?? "sem id"}`)
    }
    const dismissed = await callReportAction(
      operatorToken,
      dismissReport.data.id,
      "resolve",
      "mantido",
    )
    expect(dismissed.status).toBe(200)
    expect(dismissed.body).toEqual({ ok: true, action: "resolve", reportId: dismissReport.data.id })
    const keptPost = await member
      .from("posts")
      .select("is_deleted")
      .eq("id", dismissPost.data.id)
      .maybeSingle()
    expect(keptPost.data?.is_deleted).toBe(false)

    // Sem Bearer e com token inválido: as negativas de auth da rota.
    const noToken = await fetch(`${APP}/api/admin/reports/${listingReportId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "hide" }),
    })
    expect(noToken.status).toBe(401)
    const badToken = await callReportAction("nao-e-um-jwt", listingReportId, "hide")
    expect(badToken.status).toBe(401)
  } finally {
    await cleanupRunManifest(manifest)
  }
})
