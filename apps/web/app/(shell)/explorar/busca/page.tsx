"use client"

// RECON-021 / spec R20 (prancha 61, painel esquerdo) — destino da busca do
// cabeçalho. Resultados agrupados por tipo já implementado (Guia, Serviços,
// Eventos), termo canônico `q` com `search` aceito só na borda. As três
// consultas rodam com o JWT do membro (browser client), então a RLS decide o
// alcance: o que a conta não pode abrir não aparece — nem item, nem contagem.

import { ArrowRight, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../../lib/locality-context"
import {
  buildSearchGroups,
  type EventHit,
  type GuideHit,
  type ProviderHit,
  type SearchGroup,
} from "../../../../lib/search/groups"
import { isSessionExpiredError, resolveTerm } from "../../../../lib/search/params"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { Card } from "../../../components/bivaque/card"
import { AccessUnavailableState, EmptyState } from "../../../components/bivaque/empty-state"
import { ErrorState } from "../../../components/bivaque/error-state"
import { Skeleton } from "../../../components/bivaque/skeleton"

type Status = "idle" | "loading" | "ok" | "error" | "expired"

function pluralResults(count: number): string {
  return count === 1 ? "1 resultado" : `${count} resultados`
}

function GroupSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  )
}

function GroupSection({ group }: { group: SearchGroup }) {
  return (
    <section aria-label={group.label} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">{group.label}</h2>
        <span className="text-xs text-muted">{pluralResults(group.total)}</span>
      </div>
      <ul className="flex flex-col gap-3">
        {group.items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href as Route}
              className="block transition-colors duration-[var(--semantic-motion-duration-instant)]"
            >
              <Card interactive className="p-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                    {item.meta !== null && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                        {group.key === "eventos" && <MapPin size={12} aria-hidden="true" />}
                        {item.meta}
                      </span>
                    )}
                  </div>
                  {item.snippet !== null && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                      {item.snippet}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={group.verTodosHref as Route}
        className="flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[var(--accent)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
      >
        Ver todos em {group.label}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  )
}

function BuscaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { current } = useLocalityContext()
  const term = resolveTerm((key) => searchParams.get(key))
  const supabaseRef = useRef(createBrowserClient())

  const [status, setStatus] = useState<Status>("idle")
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const searchSeq = useRef(0)

  const runSearch = useCallback(async () => {
    const seq = searchSeq.current + 1
    searchSeq.current = seq
    const supabase = supabaseRef.current

    if (term === "") {
      setGroups([])
      setStatus("idle")
      return
    }

    setStatus("loading")
    const nowIso = new Date().toISOString()
    const [providers, guide, events] = await Promise.all([
      supabase.rpc("search_providers", { p_query: term }),
      supabase
        .from("arrival_guide_entries")
        .select("id, name, description, category")
        .eq("locality_id", current.id)
        .eq("status", "approved"),
      supabase
        .from("events")
        .select("id, title, description, starts_at, venue")
        .eq("locality_id", current.id)
        .neq("status", "cancelled")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true }),
    ])

    if (seq !== searchSeq.current) return

    const failed = [providers, guide, events].find((result) => result.error)
    if (failed?.error) {
      // Uma consulta que falha não pode virar lista vazia disfarçada: a tela
      // inteira declara o erro e a retomada refaz as três.
      setGroups([])
      setStatus(isSessionExpiredError(failed.error) ? "expired" : "error")
      return
    }

    setGroups(
      buildSearchGroups({
        term,
        providers: (providers.data ?? []) as unknown as ProviderHit[],
        guideEntries: (guide.data ?? []) as unknown as GuideHit[],
        events: (events.data ?? []) as unknown as EventHit[],
      }),
    )
    setStatus("ok")
  }, [term, current.id])

  useEffect(() => {
    void runSearch()
  }, [runSearch])

  const buscaExpira = `/login?redirect=${encodeURIComponent(`/explorar/busca?q=${term}`)}`

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">
        {term === "" ? "Buscar no Bivaque" : `Resultados para “${term}”`}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {current.cityName}, {current.stateCode} — guia, serviços e eventos.
      </p>

      <div className="mt-6">
        {status === "loading" ? (
          <div className="flex flex-col gap-8" aria-busy="true">
            <GroupSkeleton />
            <GroupSkeleton />
          </div>
        ) : status === "expired" ? (
          <AccessUnavailableState
            title="Sua sessão expirou"
            description="Entre de novo para buscar. Seus filtros e o termo continuam na página anterior."
            primaryAction={
              <Link
                href={buscaExpira as Route}
                className="flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
              >
                Entrar novamente
              </Link>
            }
          />
        ) : status === "error" ? (
          <ErrorState
            message="Não foi possível buscar agora. Tente novamente."
            onRetry={() => void runSearch()}
          />
        ) : status === "idle" ? (
          <EmptyState
            title="Digite o que você procura"
            description="A busca do cabeçalho encontra guias, profissionais e eventos na sua cidade."
            action={
              <Link
                href="/explorar"
                className="flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
              >
                Explorar categorias
              </Link>
            }
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title={`Nenhum resultado para “${term}”`}
            description={`Nada no guia, nos serviços ou nos eventos de ${current.cityName} corresponde a esse termo.`}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/explorar/busca")}
                  className="flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
                >
                  Limpar busca
                </button>
                <Link
                  href="/localidade"
                  className="flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
                >
                  Trocar de cidade
                </Link>
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <GroupSection key={group.key} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function BuscaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-4 py-6" aria-busy="true">
          <h1 className="text-xl font-semibold tracking-tight">Buscar no Bivaque</h1>
          <div className="mt-6 flex flex-col gap-8">
            <GroupSkeleton />
            <GroupSkeleton />
          </div>
        </div>
      }
    >
      <BuscaContent />
    </Suspense>
  )
}
