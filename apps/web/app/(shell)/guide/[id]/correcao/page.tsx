import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import {
  correctionStatusLabel,
  loadGuideArticle,
  loadOwnCorrectionRequests,
} from "../../../../../lib/guide/guide-article"
import { Card } from "../../../../components/bivaque/card"
import { CorrectionForm } from "./correction-form"

// RECON-030 — R38: `/guide/[id]/correcao` (prancha 25). Formulário contextual
// para a referência existente; a rota NÃO cria uma segunda superfície de guia.
// O solicitante vê as próprias sugestões e a decisão da curadoria (retorno com
// a informação permitida). Quando o artigo ainda não existe/aplicado, a tela
// declara isso honestamente em vez de oferecer um formulário que falharia.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function createAuthedClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
}

export default async function GuideCorrectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: entryId } = await params
  if (!UUID_PATTERN.test(entryId)) {
    notFound()
  }

  const supabase = await createAuthedClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("arrival_guide_entries")
    .select("id, name")
    .eq("id", entryId)
    .eq("status", "approved")
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao carregar a referência do guia: ${error.message}`)
  }
  const entry = data as { id: string; name: string } | null
  if (!entry) {
    notFound()
  }

  const article = await loadGuideArticle(supabase, entry.id)
  const requests = article ? await loadOwnCorrectionRequests(supabase, article.id, user.id) : []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <nav aria-label="Trilha de navegação" className="text-sm text-muted">
        <Link
          href="/guide"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--semantic-link)] transition-colors hover:underline"
        >
          Guia
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href={`/guide/${entry.id}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--semantic-link)] transition-colors hover:underline"
        >
          {entry.name}
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Sugerir atualização</span>
      </nav>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Sugerir atualização
      </h1>

      {article ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Sobre “{article.title}”. Sua sugestão vai para a curadoria e nada é publicado sem
            revisão.
          </p>

          <Card className="mt-6 p-4 sm:p-6">
            <CorrectionForm
              articleId={article.id}
              entryId={entry.id}
              sections={article.sections.map((section) => ({
                id: section.id,
                title: section.title,
              }))}
            />
          </Card>

          <section aria-labelledby="minhas-sugestoes-titulo" className="mt-8 flex flex-col gap-3">
            <h2 id="minhas-sugestoes-titulo" className="text-base font-semibold tracking-tight">
              Minhas sugestões
            </h2>
            {requests.length === 0 ? (
              <p className="text-sm text-muted">
                Você ainda não enviou sugestões para esta referência.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {requests.map((request) => (
                  <li key={request.id}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {correctionStatusLabel(request.status)}
                        </span>
                        <span className="text-xs text-muted">
                          Protocolo {request.id.slice(0, 8)} · {formatTimestamp(request.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--semantic-text-primary)]">
                        {request.description}
                      </p>
                      {request.decisionNote ? (
                        <p className="mt-2 text-sm text-muted">
                          Decisão da curadoria: {request.decisionNote}
                        </p>
                      ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <Card className="mt-6 p-4 sm:p-6">
          <p className="text-sm leading-relaxed text-[var(--semantic-text-primary)]">
            Esta referência ainda não recebe sugestões de correção pelo aplicativo. Você pode voltar
            ao artigo e, quando a curadoria publicar o conteúdo estruturado, sugerir uma atualização
            por aqui.
          </p>
          <Link
            href={`/guide/${entry.id}`}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-link)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
          >
            Voltar ao artigo
          </Link>
        </Card>
      )}
    </div>
  )
}
