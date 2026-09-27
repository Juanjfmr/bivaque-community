"use client"

import { Button, TextArea } from "@heroui/react"
import { BookOpen, Search } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import {
  type GuideCandidate,
  guideMatches,
  INDICATION_CATEGORIES,
  INDICATION_SEARCH_DEBOUNCE_MS,
  INDICATION_SEARCH_MIN_CHARS,
  INDICATION_SIMILAR_LIMIT,
  INDICATION_TITLE_MAX,
  type IndicationCategory,
  type IndicationRow,
  indicationHref,
  suggestCategory,
  titleProblem,
} from "../../../lib/indications/indications"
import { log } from "../../../lib/logger"
import { GUIDE_CATEGORY_LABELS } from "../../../lib/recommendations/guide-search"
import { writeFailure } from "../../../lib/recommendations/write-failure-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { IndicationItem } from "./indication-item"

// Pedir começa por procurar (ADR-20260925-memoria-de-indicacoes). A mesma
// frase serve às duas coisas: enquanto se escreve, aparece o que a cidade já
// perguntou; se nada serve, a frase vira o pedido. Uma frase basta — detalhe e
// categoria são opcionais, e a categoria vem sugerida pelo texto. O Guia da
// cidade entra junto: se o lugar já está lá, nem é preciso perguntar.

type GuideState =
  | { kind: "idle" | "loading" | "error" }
  | { kind: "done"; entries: GuideCandidate[] }

type SimilarState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "done"; rows: IndicationRow[] }

export function AskIndication({
  localityId,
  cityName,
  autoFocus = false,
  initialQuery = "",
}: {
  localityId: string
  cityName: string
  autoFocus?: boolean
  /** Termo vindo da busca do topo ("Ver todos"): a caixa já procura por ele. */
  initialQuery?: string
}) {
  const router = useRouter()
  const inputId = useId()
  const detailsId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(initialQuery)
  const [similar, setSimilar] = useState<SimilarState>({ kind: "idle" })
  const [composing, setComposing] = useState(false)
  const [pickedCategory, setPickedCategory] = useState<IndicationCategory | null>(null)
  const [details, setDetails] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [now] = useState(() => new Date())
  const [guide, setGuide] = useState<GuideState>({ kind: "idle" })

  const query = draft.trim()
  const category = pickedCategory ?? suggestCategory(query) ?? "outros"

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // O Guia aprovado da cidade é curto: lê uma vez, quando a pessoa começa a
  // escrever, e casa os termos aqui (mesma leitura de /guide, pela RLS).
  const wantsGuide = query.length >= INDICATION_SEARCH_MIN_CHARS
  useEffect(() => {
    if (!wantsGuide || guide.kind !== "idle") return
    setGuide({ kind: "loading" })
    void createBrowserClient()
      .from("arrival_guide_entries")
      .select("id, name, description, category")
      .eq("locality_id", localityId)
      .eq("status", "approved")
      .then(({ data, error }) => {
        if (error) {
          log.error("indication_guide_failed", { serverMessage: error.message })
          setGuide({ kind: "error" })
          return
        }
        setGuide({ kind: "done", entries: (data ?? []) as GuideCandidate[] })
      })
  }, [wantsGuide, guide.kind, localityId])

  useEffect(() => {
    if (query.length < INDICATION_SEARCH_MIN_CHARS) {
      setSimilar({ kind: "idle" })
      return
    }
    let active = true
    setSimilar({ kind: "loading" })
    const timer = window.setTimeout(async () => {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.rpc("list_indications", {
        p_locality_id: localityId,
        p_query: query,
        p_limit: INDICATION_SIMILAR_LIMIT,
      })
      if (!active) return
      if (error) {
        log.error("indication_search_failed", { serverMessage: error.message })
        setSimilar({ kind: "error" })
        return
      }
      setSimilar({ kind: "done", rows: data ?? [] })
    }, INDICATION_SEARCH_DEBOUNCE_MS)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query, localityId])

  async function publish() {
    const problem = titleProblem(query)
    if (problem) {
      setPublishError(problem)
      inputRef.current?.focus()
      return
    }
    setPublishing(true)
    setPublishError("")
    const supabase = createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setPublishing(false)
      setPublishError("Sua sessão expirou. Entre de novo para publicar.")
      return
    }
    const { data, error } = await supabase
      .from("recommendation_requests")
      .insert({
        author_id: user.id,
        locality_id: localityId,
        title: query,
        body: details.trim(),
        category,
      })
      .select("id")
      .single()
    if (error || !data) {
      setPublishing(false)
      setPublishError(writeFailure("publicar_pedido", error?.message ?? "insert sem linha"))
      return
    }
    router.push(indicationHref(data.id) as Route)
  }

  const showResults = similar.kind !== "idle"
  const guideHits = guide.kind === "done" && wantsGuide ? guideMatches(guide.entries, query) : []

  return (
    <section
      aria-labelledby={`${inputId}-titulo`}
      className="rounded-ui-lg bg-ui-surface p-4 shadow-ui ring-1 ring-ui-line sm:p-5"
    >
      <h2 id={`${inputId}-titulo`} className="text-base font-semibold text-ui-ink">
        O que você procura?
      </h2>
      <p className="mt-0.5 text-sm text-ui-ink-2">
        Veja o que {cityName} já respondeu. Se ninguém perguntou, peça em uma frase.
      </p>

      <div className="mt-3 flex min-h-12 items-center gap-2 rounded-full bg-ui-bg px-4 ring-1 ring-ui-line focus-within:ring-2 focus-within:ring-ui-brand">
        <Search size={18} className="shrink-0 text-ui-ink-2" aria-hidden="true" />
        <label htmlFor={inputId} className="sr-only">
          O que você procura
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={draft}
          maxLength={INDICATION_TITLE_MAX}
          onChange={(event) => {
            setDraft(event.target.value)
            setPublishError("")
          }}
          placeholder="Ex.: pediatra que atenda FuSEx"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-ui-ink outline-none placeholder:text-ui-ink-2"
        />
      </div>

      {showResults ? (
        <div className="mt-4" aria-live="polite">
          {similar.kind === "loading" ? (
            <p className="text-sm text-ui-ink-2">Procurando no que a cidade já perguntou…</p>
          ) : null}
          {similar.kind === "error" ? (
            <p className="text-sm text-ui-danger">
              Não foi possível procurar agora. Você ainda pode pedir à cidade.
            </p>
          ) : null}
          {similar.kind === "done" && similar.rows.length === 0 ? (
            <p className="text-sm text-ui-ink-2">Ninguém perguntou isso ainda.</p>
          ) : null}
          {similar.kind === "done" && similar.rows.length > 0 ? (
            <>
              <h3 className="text-xs font-semibold tracking-wide text-ui-ink-2 uppercase">
                Já perguntaram
              </h3>
              <ul className="mt-2 space-y-2">
                {similar.rows.map((row) => (
                  <li key={row.id}>
                    <IndicationItem row={row} now={now} compact />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {guideHits.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-xs font-semibold tracking-wide text-ui-ink-2 uppercase">
                No Guia da cidade
              </h3>
              <ul className="mt-2 space-y-2">
                {guideHits.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/guide/${entry.id}` as Route}
                      className="flex items-start gap-2 rounded-ui-lg bg-ui-surface px-3 py-2.5 ring-1 ring-ui-line transition-colors hover:bg-ui-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-brand"
                    >
                      <BookOpen
                        size={16}
                        className="mt-0.5 shrink-0 text-ui-brand"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ui-ink">
                          {entry.name}
                        </span>
                        <span className="block text-xs text-ui-ink-2">
                          {GUIDE_CATEGORY_LABELS[entry.category] ?? "Guia"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {guide.kind === "error" ? (
            <p className="mt-3 text-xs text-ui-ink-2">O Guia da cidade não carregou agora.</p>
          ) : null}
        </div>
      ) : null}

      {query.length >= INDICATION_SEARCH_MIN_CHARS && !composing ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ui-line pt-4">
          <p className="text-sm text-ui-ink-2">Não achou o que precisa?</p>
          <Button variant="primary" onPress={() => setComposing(true)}>
            Pedir à cidade
          </Button>
        </div>
      ) : null}

      {composing ? (
        <div className="mt-4 space-y-4 border-t border-ui-line pt-4">
          <fieldset>
            <legend className="text-sm font-medium text-ui-ink">Assunto</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {INDICATION_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={category === item.id}
                  onClick={() => setPickedCategory(item.id)}
                  className={`min-h-9 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand ${
                    category === item.id
                      ? "bg-ui-brand text-ui-on-brand"
                      : "bg-ui-subtle text-ui-ink hover:bg-ui-brand-soft"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={detailsId} className="text-sm font-medium text-ui-ink">
              Detalhes <span className="font-normal text-ui-ink-2">(opcional)</span>
            </label>
            <TextArea
              id={detailsId}
              value={details}
              onChange={(event) =>
                setDetails((event.target as HTMLTextAreaElement).value.slice(0, 2000))
              }
              placeholder="Bairro, idade da criança, o que já tentou…"
              rows={3}
              className="mt-2 w-full"
            />
          </div>

          {publishError ? (
            <p role="alert" className="text-sm text-ui-danger">
              {publishError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onPress={() => setComposing(false)} isDisabled={publishing}>
              Cancelar
            </Button>
            <Button variant="primary" onPress={publish} isPending={publishing}>
              Publicar pedido
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
