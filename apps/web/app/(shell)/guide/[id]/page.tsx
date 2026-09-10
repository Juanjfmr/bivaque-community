import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { Card } from "../../../components/bivaque/card"

// RECON-013 — prancha 25-web-guia-referencia: o artigo de uma referência do
// Guia, sobre o acervo curado que já existe (arrival_guide_entries).
//
// Defesa em profundidade na leitura (regra do contrato): a consulta filtra
// status = 'approved' E a RLS arrival_guide_select_approved_locality_member
// (20260815210000) impõe o mesmo de novo, além da assinatura de localidade.
// Entrada inexistente, não-aprovada ou de outra cidade cai no mesmo
// notFound() — a resposta não distingue os casos, então a tela não vaza a
// existência de uma entrada pendente ou rejeitada.
//
// Falha de consulta NÃO vira 404: query com erro lança, e o error.tsx do
// segmento responde "tente de novo". 404 é "não existe"; erro é "tente de
// novo". São caminhos diferentes aqui de propósito.
//
// O que a prancha mostra e nenhum dado real sustenta não é renderizado —
// mesma regra da listagem (/guide): sem imagem no acervo não há hero; sem
// seções no texto não há sumário "Neste guia"; sem mecanismo de salvar
// referência não há botão "Salvar"; sem destino real não há link. A origem
// é montada só com colunas reais: `source` (sempre tem valor — 'manual' ou
// 'ai') e `review_note` (só quando existe). A linha de conversa entra a mais
// quando `source_reply_id` aponta para uma resposta que ESTE membro pode ver
// pela RLS de recommendation_replies; sem isso, o card fica sem ela — nunca
// com conversa inventada.
//
// "Sugerir atualização": não há caminho de escrita para o membro em
// arrival_guide_entries (o grant de authenticated é select-only, migration
// 20260815181708; a promoção para a fila é RPC do operador). O controle é
// renderizado desabilitado com o motivo honesto visível, e a lacuna é
// reportada na entrega — nunca um botão que abre nada nem um formulário que
// descarta o texto.

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

  const origin = await loadVisibleOrigin(supabase, entry)
  const dialPhone = entry.phone ? entry.phone.replace(/[^\d+]/g, "") : null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <nav aria-label="Trilha de navegação" className="text-sm text-muted">
        <Link
          href="/explorar"
          className="inline-flex min-h-11 items-center text-[var(--semantic-link)] transition-colors hover:underline"
        >
          Explorar
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href="/guide"
          className="inline-flex min-h-11 items-center text-[var(--semantic-link)] transition-colors hover:underline"
        >
          Guia
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page" className="break-words">
          {entry.name}
        </span>
      </nav>

      <div className="mt-2 flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <article className="min-w-0">
          <header className="flex flex-col gap-2">
            <p className="text-xs font-medium text-[var(--semantic-text-secondary)]">
              {CATEGORY_LABELS[entry.category]}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{entry.name}</h1>
            <p className="text-sm text-muted">
              {entry.reviewed_at
                ? `Revisado em ${formatGuideDate(entry.reviewed_at)}`
                : `Atualizado em ${formatGuideDate(entry.updated_at)}`}{" "}
              · Curadoria Bivaque
            </p>
          </header>

          {entry.description ? (
            <section aria-label={`Sobre ${entry.name}`} className="mt-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--semantic-text-primary)]">
                {entry.description}
              </p>
            </section>
          ) : null}

          {(entry.phone || entry.website_url) && (
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
          )}
        </article>

        <aside aria-label="Sobre esta referência" className="flex flex-col gap-4">
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
                  href={
                    `/recommendations?focus=${origin.requestId}#req-${origin.requestId}` as Route
                  }
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

          <Card className="p-4">
            <h2 className="text-base font-semibold tracking-tight">Algo mudou?</h2>
            <p id="guia-sugestao-motivo" className="mt-2 text-sm leading-relaxed text-muted">
              Ainda não é possível enviar sugestões de correção desta referência pelo aplicativo. As
              entradas do guia entram e mudam só pela curadoria da equipe do Bivaque.
            </p>
            <Button
              variant="primary"
              className="mt-3 w-full"
              isDisabled
              aria-describedby="guia-sugestao-motivo"
            >
              Sugerir atualização
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}
