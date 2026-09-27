import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Database } from "supabase/database.generated"
import {
  buildGuideToc,
  type GuideArticle,
  loadGuideArticle,
} from "../../../../lib/guide/guide-article"
import { Card } from "../../../components/bivaque/card"
import { GuideToc } from "./guide-toc"

// RECON-030 — prancha 25-web-guia-referencia: o artigo estruturado ESTENDE a
// entrada curada que já existe (arrival_guide_entries). A rota continua sendo
// /guide/[id] com o id da entrada; não há uma segunda superfície de guia.
//
// Defesa em profundidade na leitura: a consulta da entrada filtra
// status = 'approved' E a RLS arrival_guide_select_approved_locality_member
// impõe o mesmo, além da assinatura de localidade. A leitura do artigo
// (guide_articles) passa pela RLS guide_articles_select_published_locality_member,
// que exige status='published', entrada aprovada e localidade do membro.
// Entrada inexistente, não-aprovada ou de outra cidade cai no mesmo notFound().
//
// O artigo é ADITIVO: enquanto a migration 20260910202110_guide_article.sql não
// estiver aplicada, loadGuideArticle devolve "sem artigo" e a tela renderiza a
// entrada de diretório como antes — nunca 500 por uma extensão ausente.
//
// O que a prancha mostra e nenhum dado real sustenta não é renderizado: sem
// imagem no artigo não há capa; sem seções não há sumário "Neste guia"; sem
// mecanismo real de salvar referência não há botão "Salvar" (a lacuna é
// declarada na entrega, não coberta por um controle morto). A origem entra só
// com colunas reais e a linha de conversa só quando ESTE membro pode ver a
// resposta pela RLS de recommendation_replies.

type GuideEntryRow = Database["public"]["Tables"]["arrival_guide_entries"]["Row"]
type GuideCategory = GuideEntryRow["category"]

// Tradução dos valores do enum public.arrival_guide_category (mesma tabela
// da listagem; duplicado de propósito — importar de outro arquivo de página
// acoplaria as duas rotas).
const CATEGORY_LABELS: Record<GuideCategory, string> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

// Coluna `source` real: check in ('manual','ai') na migration
// 20260815210000_arrival_guide_curation.sql. Valor fora dessa lista não
// recebe rótulo inventado — a linha de origem não aparece.
const SOURCE_LABELS: Record<string, string> = {
  manual: "Curadoria manual da equipe do Bivaque",
  ai: "Curadoria assistida por IA, aprovada pela equipe do Bivaque",
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatGuideDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
    .replace(/\./g, "")
}

interface GuideOrigin {
  requestId: string
  requestTitle: string
}

async function loadVisibleOrigin(
  supabase: Awaited<ReturnType<typeof createAuthedClient>>,
  entry: GuideEntryRow,
): Promise<GuideOrigin | null> {
  // A entrada aponta a resposta de origem (source_reply_id), mas isso não
  // prova que ESTE membro pode ver a conversa. As duas leituras abaixo vão
  // pela RLS (recommendation_replies_select / recommendation_requests_select
  // em 20260815220000): se a conversa não é visível, a linha vem nula e a
  // origem não aparece. Erro em qualquer uma das duas lança — falha de
  // consulta não pode virar "não tem origem".
  if (!entry.source_reply_id) return null

  const replyQuery = await supabase
    .from("recommendation_replies")
    .select("request_id")
    .eq("id", entry.source_reply_id)
    .maybeSingle()
  if (replyQuery.error) {
    throw new Error(`Falha ao carregar a origem da referência: ${replyQuery.error.message}`)
  }
  const reply = replyQuery.data as { request_id: string } | null
  if (!reply) return null

  const requestQuery = await supabase
    .from("recommendation_requests")
    .select("id, title")
    .eq("id", reply.request_id)
    .maybeSingle()
  if (requestQuery.error) {
    throw new Error(`Falha ao carregar a origem da referência: ${requestQuery.error.message}`)
  }
  const request = requestQuery.data as { id: string; title: string } | null
  if (!request) return null

  return { requestId: request.id, requestTitle: request.title }
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
      setAll() {
        // Server component, sem escrita de cookie.
      },
    },
  })
}

function ArticleBody({ article }: { article: GuideArticle }) {
  return (
    <div className="mt-6 flex flex-col">
      {article.coverImageUrl ? (
        // next/image não tem remotePatterns configurado para URL curada
        // arbitrária; um <img> com alt mantém a capa honesta e mede só o que
        // existe, sem abrir um loader remoto.
        // biome-ignore lint/performance/noImgElement: URL curada de capa; next/image exigiria images.remotePatterns em next.config.ts, fora do allowed_paths do contrato.
        <img
          src={article.coverImageUrl}
          alt={`Imagem de capa do guia: ${article.title}`}
          className="w-full rounded-2xl object-cover"
          loading="lazy"
        />
      ) : null}

      {article.summary ? (
        <p className="mt-5 text-base leading-relaxed text-[var(--semantic-text-primary)]">
          {article.summary}
        </p>
      ) : null}

      {article.sections.map((section) => (
        <section
          key={section.id}
          id={section.anchor}
          tabIndex={-1}
          aria-labelledby={`secao-${section.anchor}-titulo`}
          className="mt-8 scroll-mt-24 focus:outline-none"
        >
          <h2
            id={`secao-${section.anchor}-titulo`}
            className="text-xl font-semibold tracking-tight"
          >
            {section.title}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--semantic-text-primary)]">
            {section.body}
          </p>
        </section>
      ))}
    </div>
  )
}

function ContactBlock({ entry }: { entry: GuideEntryRow }) {
  const dialPhone = entry.phone ? entry.phone.replace(/[^\d+]/g, "") : null
  if (!entry.phone && !entry.website_url) return null

  return (
    <section aria-labelledby="guia-contato-titulo" className="mt-8 flex flex-col gap-2">
      <h2 id="guia-contato-titulo" className="text-base font-semibold tracking-tight">
        Contato
      </h2>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {entry.phone && dialPhone ? (
          <a
            href={`tel:${dialPhone}`}
            className="inline-flex min-h-11 items-center text-sm text-[var(--semantic-link)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
          >
            {entry.phone}
          </a>
        ) : null}
        {entry.website_url ? (
          <a
            href={entry.website_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir o site de ${entry.name}`}
            className="inline-flex min-h-11 items-center text-sm text-[var(--semantic-link)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
          >
            Ver site
          </a>
        ) : null}
      </div>
    </section>
  )
}

export default async function GuideEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: entryId } = await params
  // UUID malformado nunca foi entrada aprovada: mesmo notFound() dos outros
  // casos, sem deixar o Postgres responder erro de sintaxe (que viraria
  // "tente de novo" para um endereço simplesmente inexistente).
  if (!UUID_PATTERN.test(entryId)) {
    notFound()
  }

  const supabase = await createAuthedClient()

  const { data, error } = await supabase
    .from("arrival_guide_entries")
    .select("*")
    .eq("id", entryId)
    .eq("status", "approved")
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao carregar a referência do guia: ${error.message}`)
  }
  const entry = data as GuideEntryRow | null
  if (!entry) {
    notFound()
  }

  // Consulta a outra cidade (migration 20260925161111): quem é de fora LÊ a
  // referência; sugerir atualização continua de quem é da cidade (o banco
  // recusaria), então o cartão "Algo mudou?" não aparece para quem consulta.
  const { data: localMembership, error: membershipError } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("locality_id", entry.locality_id)
    .maybeSingle()
  if (membershipError) {
    throw new Error(`Falha ao conferir a cidade da referência: ${membershipError.message}`)
  }
  const isVisitor = localMembership === null

  const [origin, article] = await Promise.all([
    loadVisibleOrigin(supabase, entry),
    loadGuideArticle(supabase, entry.id),
  ])
  const toc = article ? buildGuideToc(article.sections) : []
  const heading = article ? article.title : entry.name
  const reviewedAt = article?.reviewedAt ?? entry.reviewed_at

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <nav aria-label="Trilha de navegação" className="text-sm text-muted">
        <Link
          href="/explorar"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--semantic-link)] transition-colors hover:underline"
        >
          Explorar
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href="/guide"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--semantic-link)] transition-colors hover:underline"
        >
          Guia
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page" className="break-words">
          {CATEGORY_LABELS[entry.category]}
        </span>
      </nav>

      <div className="mt-2 flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <article className="min-w-0">
          <header className="flex flex-col gap-2">
            <p className="text-xs font-medium text-[var(--semantic-text-secondary)]">
              {CATEGORY_LABELS[entry.category]}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
            {article?.subtitle ? <p className="text-base text-muted">{article.subtitle}</p> : null}
            <p className="text-sm text-muted">
              {reviewedAt
                ? `Revisado em ${formatGuideDate(reviewedAt)}`
                : `Atualizado em ${formatGuideDate(entry.updated_at)}`}{" "}
              · Curadoria Bivaque
            </p>
          </header>

          {article ? (
            <ArticleBody article={article} />
          ) : (
            <>
              {entry.description ? (
                <section aria-label={`Sobre ${entry.name}`} className="mt-6">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--semantic-text-primary)]">
                    {entry.description}
                  </p>
                </section>
              ) : null}
              <ContactBlock entry={entry} />
            </>
          )}
        </article>

        <aside aria-label="Sobre esta referência" className="flex flex-col gap-4">
          {article && toc.length > 0 ? (
            <Card className="p-4">
              <h2 className="text-base font-semibold tracking-tight">Neste guia</h2>
              <GuideToc items={toc} />
            </Card>
          ) : null}

          <Card className="p-4">
            <h2 className="text-base font-semibold tracking-tight">Origem desta referência</h2>
            {origin ? (
              <div className="mt-2 flex flex-col gap-1">
                <p className="text-sm leading-relaxed text-[var(--semantic-text-primary)]">
                  {origin.requestTitle}
                </p>
                <p className="text-xs text-muted">
                  Esta referência nasceu de uma conversa da comunidade.
                </p>
                <Link
                  href={`/indicacoes/${origin.requestId}` as Route}
                  className="mt-2 inline-flex min-h-11 w-fit items-center text-sm font-medium text-[var(--semantic-link)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                >
                  Ver conversa
                </Link>
              </div>
            ) : null}
            {SOURCE_LABELS[entry.source] ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--semantic-text-primary)]">
                {SOURCE_LABELS[entry.source]}
              </p>
            ) : null}
            {entry.review_note ? (
              <div className="mt-3">
                <p className="text-xs font-medium text-[var(--semantic-text-secondary)]">
                  Nota da curadoria
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{entry.review_note}</p>
              </div>
            ) : null}
          </Card>

          {isVisitor ? null : (
            <Card className="p-4">
              <h2 className="text-base font-semibold tracking-tight">Algo mudou?</h2>
              <p id="guia-sugestao-motivo" className="mt-2 text-sm leading-relaxed text-muted">
                Conte para a curadoria se alguma informação não estiver mais correta ou se você
                tiver uma sugestão para melhorar este guia.
              </p>
              {article ? (
                <Link
                  href={`/guide/${entry.id}/correcao` as Route}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--semantic-action-primary)] px-4 text-sm font-semibold text-[var(--semantic-action-on-strong)] transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
                >
                  Sugerir atualização
                </Link>
              ) : (
                <Button
                  variant="primary"
                  className="mt-3 w-full"
                  isDisabled
                  aria-describedby="guia-sugestao-motivo"
                >
                  Sugerir atualização
                </Button>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
