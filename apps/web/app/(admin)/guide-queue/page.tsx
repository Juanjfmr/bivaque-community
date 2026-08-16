import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

export const dynamic = "force-dynamic"

const CATEGORY_LABELS: Record<string, string> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

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

export default async function AdminGuidePage() {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from("arrival_guide_entries")
    .select(
      "id, category, name, description, website_url, phone, source, confidence, source_reply_id, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  const queue = (data as GuideQueueEntry[] | null) ?? []

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
      aria-labelledby="guide-queue-heading"
    >
      <div className="flex flex-col gap-2">
        <h1 id="guide-queue-heading" className="text-2xl font-semibold tracking-tight">
          Curadoria do guia
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
                  className="text-sm text-accent hover:underline"
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
                  className="w-full rounded-md border border-border bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  Aprovar e publicar
                </button>
              </form>

              <form action={rejectGuideEntryAction} className="flex flex-1 gap-2">
                <input type="hidden" name="entryId" value={entry.id} />
                <input
                  type="text"
                  name="note"
                  placeholder="Motivo da rejeição"
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-danger hover:text-danger-foreground"
                >
                  Rejeitar
                </button>
              </form>
            </div>
          </article>
        ))
      )}
    </section>
  )
}
