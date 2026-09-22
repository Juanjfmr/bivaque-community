import { Button, Input } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { loadGuideCorrectionQueue } from "../../../lib/guide/guide-article"
import { callGuideCurationRpc } from "../../../lib/guide-curation-rpcs"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { CorrectionDecisionForms } from "./correction-forms"

export const dynamic = "force-dynamic"

const CATEGORY_LABELS: Record<string, string> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

// Wave E Task 8: the four guide categories, mirrored here for the promote form.
const GUIDE_CATEGORIES = ["school", "hospital", "transporter", "courier"] as const
type GuideCategory = (typeof GUIDE_CATEGORIES)[number]

interface GuideQueueEntry {
  id: string
  category: string
  name: string
  description: string
  website_url: string | null
  phone: string | null
  source: "manual" | "ai"
  confidence: number | null
  source_reply_id: string | null
  created_at: string
}

async function getAuthedUserId(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Read-only: writes happen in Server Actions elsewhere.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

async function authorizeOperator(userId: string): Promise<boolean> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.rpc("is_current_user_operator", {
    p_user_id: userId,
  })
  return data === true
}

async function reviewGuideEntry(
  entryId: string,
  status: "approved" | "rejected",
  reviewerId: string,
  note: string | null,
): Promise<boolean> {
  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from("arrival_guide_entries")
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_note: note ? note.slice(0, 500) : null,
    })
    .eq("id", entryId)
    .eq("status", "pending")
    .select("id")
    .single()

  return !error
}

async function approveGuideEntryAction(formData: FormData) {
  "use server"
  const userId = await getAuthedUserId()
  if (!userId) throw new Error("unauthenticated")
  if (!(await authorizeOperator(userId))) throw new Error("forbidden")

  const entryId = formData.get("entryId")
  if (typeof entryId !== "string" || entryId.length === 0) {
    throw new Error("entryId required")
  }

  const ok = await reviewGuideEntry(entryId, "approved", userId, null)
  if (!ok) throw new Error("approve failed")

  revalidatePath("/guide-queue")
}

async function rejectGuideEntryAction(formData: FormData) {
  "use server"
  const userId = await getAuthedUserId()
  if (!userId) throw new Error("unauthenticated")
  if (!(await authorizeOperator(userId))) throw new Error("forbidden")

  const entryId = formData.get("entryId")
  if (typeof entryId !== "string" || entryId.length === 0) {
    throw new Error("entryId required")
  }

  const note = formData.get("note")
  const reviewNote = typeof note === "string" && note.trim().length > 0 ? note.trim() : null

  const ok = await reviewGuideEntry(entryId, "rejected", userId, reviewNote)
  if (!ok) throw new Error("reject failed")

  revalidatePath("/guide-queue")
}

// Wave E Task 8 — manual curation path. Operator picks a reply, writes the
// canonical name + description, and the function creates an approved entry
// linked back to the source reply (audit trail via source_reply_id + the
// recommendation_reply_promotions table).
async function promoteReplyToGuideAction(formData: FormData) {
  "use server"
  const userId = await getAuthedUserId()
  if (!userId) throw new Error("unauthenticated")
  if (!(await authorizeOperator(userId))) throw new Error("forbidden")

  const replyId = formData.get("replyId")
  const localityId = formData.get("localityId")
  const category = formData.get("category")
  const name = formData.get("name")
  const description = formData.get("description")
  const websiteUrl = formData.get("websiteUrl")
  const phone = formData.get("phone")

  if (
    typeof replyId !== "string" ||
    typeof localityId !== "string" ||
    typeof category !== "string" ||
    typeof name !== "string" ||
    typeof description !== "string"
  ) {
    throw new Error("campos obrigatórios ausentes")
  }

  if (!(GUIDE_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("categoria inválida")
  }

  const trimmedName = name.trim()
  if (trimmedName.length < 2 || trimmedName.length > 120) {
    throw new Error("nome deve ter entre 2 e 120 caracteres")
  }

  const trimmedDescription = description.trim()
  if (trimmedDescription.length > 500) {
    throw new Error("descrição deve ter até 500 caracteres")
  }

  const cleanWebsite =
    typeof websiteUrl === "string" && websiteUrl.trim().length > 0 ? websiteUrl.trim() : null
  const cleanPhone = typeof phone === "string" && phone.trim().length > 0 ? phone.trim() : null

  const serviceClient = createServiceClient()
  const { error } = await callGuideCurationRpc(serviceClient, "promote_reply_to_guide_entry", {
    p_reply_id: replyId,
    p_locality_id: localityId,
    p_category: category as GuideCategory,
    p_name: trimmedName,
    p_description: trimmedDescription,
    p_website_url: cleanWebsite,
    p_phone: cleanPhone,
    p_operator_user_id: userId,
  })

  if (error) {
    if (error.message.includes("only operators")) {
      throw new Error("apenas operadores podem promover respostas")
    }
    if (error.message.includes("already promoted")) {
      throw new Error("esta resposta já foi promovida para o guia")
    }
    if (error.message.includes("reply locality")) {
      throw new Error("resposta pertence a outra cidade")
    }
    if (error.message.includes("not found")) {
      throw new Error("resposta não encontrada")
    }
    throw new Error(error.message)
  }

  revalidatePath("/guide-queue")
  revalidatePath("/guide")
}

interface PromotableReply {
  reply_id: string
  body: string
  created_at: string
  request_title: string
  request_category: string
  author_display_name: string | null
}

async function getOperatorLocalityId(userId: string): Promise<string | null> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()
  return (data as { locality_id: string } | null)?.locality_id ?? null
}

export default async function AdminGuidePage() {
  const userId = await getAuthedUserId()
  if (!userId) return null

  const isOperator = await authorizeOperator(userId)
  if (!isOperator) {
    return (
      <section
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
        aria-labelledby="guide-queue-heading"
      >
        <h1 id="guide-queue-heading" className="text-2xl font-semibold tracking-tight">
          Fila do Guia
        </h1>
        <p className="text-sm text-muted">Apenas operadores podem revisar o guia.</p>
      </section>
    )
  }

  const localityId = await getOperatorLocalityId(userId)
  const serviceClient = createServiceClient()

  const [pendingResult, promotableResult] = await Promise.all([
    serviceClient
      .from("arrival_guide_entries")
      .select(
        "id, category, name, description, website_url, phone, source, confidence, source_reply_id, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    localityId
      ? callGuideCurationRpc(serviceClient, "list_promotable_replies", {
          p_locality_id: localityId,
          p_limit: 30,
        })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (pendingResult.error) {
    throw new Error(`Falha ao ler a fila do guia: ${pendingResult.error.message}`)
  }
  if (promotableResult.error) {
    throw new Error(`Falha ao ler respostas promovíveis: ${promotableResult.error.message}`)
  }

  const queue = (pendingResult.data as GuideQueueEntry[] | null) ?? []
  const promotable = (promotableResult.data as PromotableReply[] | null) ?? []

  // RECON-030: devolve [] quando a migration do artigo ainda não está aplicada.
  const corrections = await loadGuideCorrectionQueue(serviceClient)

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
      aria-labelledby="guide-queue-heading"
    >
      <div className="flex flex-col gap-2">
        <h1 id="guide-queue-heading" className="text-2xl font-semibold tracking-tight">
          Fila do Guia
        </h1>
        <p className="text-sm text-muted">
          Sugestões aguardando aprovação. Nada é publicado sem revisão humana.
        </p>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma sugestão pendente.</p>
      ) : (
        queue.map((entry) => (
          <article
            key={entry.id}
            className="flex flex-col gap-3 rounded-md border border-border p-4"
          >
            <header className="flex items-baseline justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted">
                  {CATEGORY_LABELS[entry.category] ?? entry.category}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted">
                  {entry.source === "ai" ? "Sugestão IA" : "Manual"}
                </span>
                {entry.confidence !== null && (
                  <span className="text-xs text-muted">confiança {entry.confidence}/100</span>
                )}
              </div>
              <time className="text-xs text-muted">
                {new Date(entry.created_at).toLocaleString("pt-BR")}
              </time>
            </header>

            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">{entry.name}</h2>
              <p className="text-sm text-muted">{entry.description}</p>
              {entry.phone && <p className="text-sm">{entry.phone}</p>}
              {entry.website_url && (
                <a
                  href={entry.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm text-accent transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline"
                >
                  {entry.website_url}
                </a>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={approveGuideEntryAction} className="flex-1">
                <input type="hidden" name="entryId" value={entry.id} />
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-md border border-border bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-accent/90"
                >
                  Aprovar e publicar
                </button>
              </form>

              <form action={rejectGuideEntryAction} className="flex flex-1 gap-2">
                <input type="hidden" name="entryId" value={entry.id} />
                <input
                  type="text"
                  name="note"
                  aria-label="Motivo da rejeição"
                  placeholder="Motivo da rejeição"
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-danger hover:text-danger-foreground"
                >
                  Recusar
                </button>
              </form>
            </div>
          </article>
        ))
      )}

      {/* Wave E Task 8 — manual curation from recommendation replies. */}
      <section aria-labelledby="guide-promote-heading" className="mt-6 flex flex-col gap-4">
        <h2 id="guide-promote-heading" className="text-base font-semibold tracking-tight">
          Promover respostas da comunidade
        </h2>
        <p className="text-sm text-muted">
          Respostas da comunidade viram itens do guia depois que você escreve o nome canônico e a
          categoria.
        </p>

        {promotable.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma resposta disponível para promover.</p>
        ) : (
          promotable.map((reply) => (
            <article
              key={reply.reply_id}
              className="flex flex-col gap-3 rounded-md border border-border p-4"
            >
              <header className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-wide text-muted">
                  Pedido: {reply.request_title}
                </p>
                <p className="text-sm">{reply.body}</p>
                <p className="text-xs text-muted">
                  por {reply.author_display_name ?? "membro"} em{" "}
                  {new Date(reply.created_at).toLocaleString("pt-BR")}
                </p>
              </header>

              <form action={promoteReplyToGuideAction} className="flex flex-col gap-2">
                <input type="hidden" name="replyId" value={reply.reply_id} />
                <input type="hidden" name="localityId" value={localityId ?? ""} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium">Categoria</span>
                    <select
                      name="category"
                      required
                      aria-label="Categoria do guia"
                      className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
                    >
                      {GUIDE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat] ?? cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium">Nome canônico</span>
                    <Input
                      name="name"
                      required
                      minLength={2}
                      maxLength={120}
                      aria-label="Nome canônico"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Descrição</span>
                  <Input
                    name="description"
                    required
                    maxLength={500}
                    aria-label="Descrição do item"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium">Site (opcional)</span>
                    <Input name="websiteUrl" placeholder="https://..." aria-label="Site" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium">Telefone (opcional)</span>
                    <Input name="phone" placeholder="+55 92 ..." aria-label="Telefone" />
                  </div>
                </div>
                <div>
                  <Button type="submit" size="sm" variant="primary">
                    Promover para o guia
                  </Button>
                </div>
              </form>
            </article>
          ))
        )}
      </section>

      <section aria-labelledby="guide-corrections-heading" className="mt-6 flex flex-col gap-4">
        <h2 id="guide-corrections-heading" className="text-base font-semibold tracking-tight">
          Sugestões de correção
        </h2>
        <p className="text-sm text-muted">
          Sugestões de atualização dos artigos do guia. Aplicar publica a versão revisada e registra
          quem sugeriu.
        </p>
        {corrections.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma sugestão de correção pendente.</p>
        ) : (
          corrections.map((item) => <CorrectionDecisionForms key={item.request.id} item={item} />)
        )}
      </section>
    </section>
  )
}
