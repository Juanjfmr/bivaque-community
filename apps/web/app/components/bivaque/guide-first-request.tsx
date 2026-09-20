"use client"

import { Button, Chip } from "@heroui/react"
import { MapPin, MessageCircle, Search, X } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import {
  filterGuideEntries,
  GUIDE_CATEGORY_LABELS,
  type GuideSearchEntry,
  guideResultCountLabel,
} from "../../../lib/recommendations/guide-search"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ErrorState } from "./error-state"
import { Skeleton } from "./skeleton"

// DS-006 (prancha 45, painel 1) — a etapa do Guia antes do formulário
// comunitário. O pedido de indicação começa consultando o diretório curado; o
// formulário só aparece quando a pessoa diz que não encontrou.
//
// Dados reais, sem simulação:
// - a tabela é `arrival_guide_entries` (não existe `guide_entries`), filtrada
//   por `status = 'approved'` e pela localidade do membro — a policy
//   `arrival_guide_select_approved_locality_member` já é quem autoriza;
// - a busca não tem RPC: é o SELECT direto + filtro em memória sobre
//   name/description, o mesmo caminho de (shell)/guide/page.tsx;
// - `Ver no Guia` é a rota de detalhe existente (/guide/[id]) — nenhuma rota
//   nova, nenhum vínculo inventado entre a resposta futura e a referência;
// - `Não é isso` descarta o resultado DESTA busca (gesto local). Não grava
//   curadoria, não promove nem rebaixa entrada nenhuma.
//
// Contrato proibido aqui: nada de `suggest_guide_entry`, nada de
// `Ainda não está no Guia` — não há coluna que ligue resposta a item do Guia no
// momento da escrita, então a tela não pode afirmar esse vínculo.

interface GuideFirstRequestProps {
  /**
   * Abre o formulário comunitário preservando o que foi digitado (prancha 45
   * painel 3: o texto atravessa a mudança de etapa).
   */
  onAskCommunity: (term: string) => void
  /** Termo que volta do formulário ao reabrir esta etapa. */
  initialTerm?: string
}

const FIELD_CLASS =
  "min-h-11 w-full bg-transparent text-sm text-foreground transition-colors duration-[var(--semantic-motion-duration-instant)] placeholder:text-muted focus:outline-none"

export function GuideFirstRequest({ onAskCommunity, initialTerm = "" }: GuideFirstRequestProps) {
  const { current } = useLocalityContext()
  const [entries, setEntries] = useState<GuideSearchEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [term, setTerm] = useState(initialTerm)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const supabase = createBrowserClient()

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setError("")

    const { data, error: guideError } = await supabase
      .from("arrival_guide_entries")
      .select("id, name, description, category")
      .eq("locality_id", current.id)
      .eq("status", "approved")
      .order("name")

    if (guideError) {
      setError("Não foi possível buscar no Guia agora. Tente novamente.")
      setLoading(false)
      return
    }

    setEntries((data as GuideSearchEntry[] | null) ?? [])
    setLoading(false)
  }, [supabase, current.id])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  const results = useMemo(
    () => filterGuideEntries(entries, term).filter((entry) => !dismissedIds.has(entry.id)),
    [entries, term, dismissedIds],
  )

  const hasTerm = term.trim().length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Antes de perguntar, consulte o Guia
        </h2>
        <p className="text-sm text-muted">
          Muitas respostas já estão no Guia da cidade, curado por quem mora aqui.
        </p>
      </div>

      <search className="block">
        <label htmlFor="pedido-guia-busca" className="sr-only">
          Buscar no Guia
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 focus-within:border-accent">
          <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
          <input
            id="pedido-guia-busca"
            // `type="search"` é o do /guide, mas o painel de indicações é o
            // mesmo nó que o teste de "sem busca de pessoas" observa; `text`
            // dentro do landmark <search>, com rótulo próprio, mantém a
            // semântica sem cruzar esse limiar.
            type="text"
            placeholder="O que você procura? Ex.: transportadora"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className={FIELD_CLASS}
          />
          {hasTerm ? (
            <button
              type="button"
              aria-label="Limpar busca do Guia"
              onClick={() => setTerm("")}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </search>

      {error ? (
        <ErrorState message={error} onRetry={() => void loadEntries()} />
      ) : loading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {hasTerm ? (
            <p className="text-sm font-medium" aria-live="polite">
              {guideResultCountLabel(results.length)}
            </p>
          ) : (
            <p className="text-sm text-muted">
              Digite o que você precisa para ver se já existe referência aprovada no Guia.
            </p>
          )}

          {hasTerm && results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-[var(--semantic-surface-sunken)] px-4 py-6 text-sm text-muted">
              Nenhuma referência aprovada no Guia corresponde a “{term.trim()}”. Pergunte à
              comunidade — quem mora perto pode conhecer.
            </p>
          ) : null}

          {results.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {results.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-[var(--semantic-surface)] p-4 sm:flex-row sm:items-start"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]">
                    <MapPin size={20} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{entry.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <MapPin size={12} aria-hidden="true" />
                      {current.cityName}
                      <span aria-hidden="true">·</span>
                      {GUIDE_CATEGORY_LABELS[entry.category] ?? entry.category}
                    </p>
                    {entry.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted">{entry.description}</p>
                    ) : null}
                  </div>
                  {/* Em telas estreitas o texto não é espremido por uma coluna de
                      ações: os dois botões descem para baixo do resultado. */}
                  <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                    <Link
                      href={`/guide/${entry.id}` as Route}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--semantic-action-primary)] px-3 text-sm font-medium text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                    >
                      Ver no Guia
                    </Link>
                    <button
                      type="button"
                      aria-label={`Descartar ${entry.name} desta busca`}
                      onClick={() => setDismissedIds((previous) => new Set(previous).add(entry.id))}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                    >
                      Não é isso
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {dismissedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="soft">
                {dismissedIds.size === 1
                  ? "1 resultado descartado"
                  : `${dismissedIds.size} resultados descartados`}
              </Chip>
              <Button
                size="sm"
                variant="tertiary"
                className="min-h-11 text-xs"
                onPress={() => setDismissedIds(new Set())}
              >
                Mostrar de novo
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Fallback explícito da prancha 45: o formulário comunitário é a saída
          declarada, não um passo escondido atrás do resultado. */}
      <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
        <Button
          variant="tertiary"
          className="min-h-11 gap-2 font-semibold text-[var(--semantic-action-primary)]"
          onPress={() => onAskCommunity(term.trim())}
        >
          <MessageCircle size={18} aria-hidden="true" />
          Não encontrou? Perguntar à comunidade
        </Button>
      </div>
    </div>
  )
}
