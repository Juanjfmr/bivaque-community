"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { registerFilledButton, registerIconButton } from "../../app/components/material/register"
import type {} from "../../types/material-web"
import type { IndicationRow } from "../indications/indications"
import {
  categoryLabel,
  INDICATION_PAGE_SIZE,
  suggestCategory,
  titleProblem,
} from "../indications/indications"
import { callResolutionRpc } from "../recommendations/resolution-rpcs"
import { createBrowserClient } from "../supabase/client"
import {
  type AppNavigation,
  type AppRoute,
  activeAppTab,
  appHash,
  needsCommunityParent,
  parseAppHash,
} from "./navigation"
import "./app-react.css"

type Filter = AppNavigation["filter"]
type Request = {
  id: string
  author_id: string
  title: string
  body: string
  category: IndicationRow["category"]
  created_at: string
  is_resolved: boolean
  resolved_reply_id: string | null
}
type Reply = {
  id: string
  author_id: string | null
  body: string | null
  created_at: string
  is_removed: boolean
}
type Listing = { kind: "loading" } | { kind: "error" } | { kind: "done"; rows: IndicationRow[] }
type Detail =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "done"; request: Request; replies: Reply[]; following: boolean }
export function AppReact() {
  const supabase = createBrowserClient(),
    main = useRef<HTMLElement>(null),
    dialogEl = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement>(null),
    generation = useRef(0),
    detailGeneration = useRef(0),
    draftId = useRef(""),
    wasDialog = useRef(false)
  const pendingRestore = useRef<AppNavigation | null>(null)
  const pendingListRestoreAt = useRef(0)
  const listRevisionRef = useRef(0)
  const [route, setRoute] = useState<AppRoute>({ name: "inicio" }),
    [origin, setOrigin] = useState<AppNavigation["origin"]>("inicio"),
    [filter, setFilter] = useState<Filter>("help"),
    [city, setCity] = useState(""),
    [locality, setLocality] = useState(""),
    [user, setUser] = useState(""),
    [ready, setReady] = useState(false)
  const [communityTab, setCommunityTab] = useState<"ind" | "grp">("ind")
  const [resolvedCount, setResolvedCount] = useState(0)
  const [listRevision, setListRevision] = useState(0)
  const [suggestions, setSuggestions] = useState<IndicationRow[]>([])
  const [listing, setListing] = useState<Listing>({ kind: "loading" }),
    [detail, setDetail] = useState<Detail>({ kind: "loading" }),
    [dialog, setDialog] = useState(false),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [answer, setAnswer] = useState(""),
    [offset, setOffset] = useState(0)
  const [actionError, setActionError] = useState("")
  const navigation = useCallback((hash = window.location.hash): AppNavigation => {
    const saved = window.history.state?.navigation as AppNavigation | undefined,
      parsed = parseAppHash(hash)
    return saved && appHash(saved.route) === appHash(parsed)
      ? saved
      : { route: parsed, origin: "inicio", filter: "help", scroll: 0, focus: null }
  }, [])
  useEffect(() => {
    void registerFilledButton()
    void registerIconButton()
    void import("@material/web/button/filled-tonal-button.js")
    void import("@material/web/tabs/tabs.js")
    void import("@material/web/tabs/primary-tab.js")
  }, [])
  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.dataset["theme"] = matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    }
    applyTheme()
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme)
    return () =>
      matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", applyTheme)
  }, [])
  useEffect(() => {
    let alive = true
    void (async () => {
      const {
        data: { user: u },
        error: e,
      } = await supabase.auth.getUser()
      if (e || !u) {
        const dest = `${location.pathname}${location.search}${location.hash || "#inicio"}`
        location.replace(`/login?redirect=${encodeURIComponent(dest)}`)
        return
      }
      const { data, error: membershipError } = await supabase
        .from("locality_memberships")
        .select("locality_id, localities(city_name)")
        .eq("kind", "current")
        .maybeSingle()
      if (!alive) return
      if (membershipError) {
        setReady(true)
        setListing({ kind: "error" })
        setDetail({ kind: "error" })
        return
      }
      if (!data) {
        location.replace("/onboarding/locality")
        return
      }
      const member = data as unknown as {
          locality_id: string
          localities: { city_name: string } | null
        },
        nav = navigation()
      if (needsCommunityParent(nav.route, history.state)) {
        const parent = { name: "comunidade" } as const,
          parentNav: AppNavigation = {
            route: parent,
            origin: "comunidade",
            filter: "help",
            scroll: 0,
            focus: null,
          }
        history.replaceState({ bivaque: true, navigation: parentNav }, "", appHash(parent))
        history.pushState({ bivaque: true, parent, navigation: nav }, "", appHash(nav.route))
      }
      history.replaceState({ ...history.state, bivaque: true, navigation: nav }, "", location.href)
      setUser(u.id)
      setLocality(member.locality_id)
      setCity(member.localities?.city_name ?? "sua cidade")
      setRoute(nav.route)
      setOrigin(nav.origin)
      setFilter(nav.filter)
      pendingRestore.current = nav
      pendingListRestoreAt.current = listRevisionRef.current + 1
      setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [navigation, supabase])
  const saveContext = useCallback(() => {
    if (!main.current || !history.state) return
    const old = (history.state.navigation ?? {}) as Partial<AppNavigation>,
      active = document.activeElement as HTMLElement | null
    history.replaceState(
      {
        ...history.state,
        navigation: {
          ...old,
          route,
          origin,
          filter,
          scroll: main.current.scrollTop,
          focus: active?.dataset["focusKey"] ?? null,
        },
      },
      "",
      location.href,
    )
  }, [route, origin, filter])
  const restore = useCallback(() => {
    const nav = navigation()
    pendingRestore.current = nav
    pendingListRestoreAt.current = listRevisionRef.current + 1
    setRoute(nav.route)
    setOrigin(nav.origin)
    setFilter(nav.filter)
    requestAnimationFrame(() => {
      if (main.current) main.current.scrollTop = nav.scroll
      if (nav.focus)
        document.querySelector<HTMLElement>(".app-main h1")?.focus({ preventScroll: true })
    })
  }, [navigation])
  const go = useCallback(
    (next: AppRoute, replace = false) => {
      saveContext()
      const nextOrigin = ["inicio", "comunidade", "conversas", "voce"].includes(next.name)
          ? (next.name as AppNavigation["origin"])
          : origin,
        parent = navigation().route
      const nav: AppNavigation = {
          route: next,
          parent,
          origin: nextOrigin,
          filter,
          scroll: 0,
          focus: null,
        },
        hash = appHash(next)
      history[replace ? "replaceState" : "pushState"](
        { bivaque: true, parent, navigation: nav },
        "",
        hash,
      )
      setRoute(next)
      setOrigin(nextOrigin)
      setOffset(0)
      requestAnimationFrame(() => {
        if (main.current) main.current.scrollTop = 0
        document.querySelector<HTMLElement>(".app-main h1")?.focus({ preventScroll: true })
      })
    },
    [filter, navigation, origin, saveContext],
  )
  useEffect(() => {
    const pop = () => {
      if (wasDialog.current) {
        wasDialog.current = false
        setDialog(false)
        dialogEl.current?.close()
        const nav = navigation()
        requestAnimationFrame(() => {
          if (main.current) main.current.scrollTop = nav.scroll
          trigger.current?.focus({ preventScroll: true })
        })
        return
      }
      restore()
    }
    window.addEventListener("popstate", pop)
    window.addEventListener("pagehide", saveContext)
    return () => {
      window.removeEventListener("popstate", pop)
      window.removeEventListener("pagehide", saveContext)
    }
  }, [navigation, restore, saveContext])
  useEffect(() => {
    if (!locality) return
    void supabase
      .from("recommendation_requests")
      .select("id", { count: "exact", head: true })
      .eq("locality_id", locality)
      .eq("is_resolved", true)
      .then(({ count }) => setResolvedCount(count ?? 0))
  }, [locality, supabase])
  const loadList = useCallback(
    async (f: Filter, skip = 0) => {
      if (!locality) return
      const ticket = ++generation.current
      if (!skip) setListing({ kind: "loading" })
      const args = {
        p_locality_id: locality,
        p_limit: INDICATION_PAGE_SIZE,
        p_offset: skip,
        ...(f === "help"
          ? { p_resolved: false, p_mine: false }
          : f === "resolved"
            ? { p_resolved: true }
            : { p_mine: true }),
      }
      const { data, error: e } = await supabase.rpc("list_indications", args)
      if (ticket !== generation.current) return
      if (e) {
        setListing({ kind: "error" })
        return
      }
      const got = data ?? []
      setListing((old) =>
        skip && old.kind === "done"
          ? {
              kind: "done",
              rows: [...old.rows, ...got.filter((x) => !old.rows.some((y) => y.id === x.id))],
            }
          : { kind: "done", rows: got },
      )
      listRevisionRef.current += 1
      setListRevision(listRevisionRef.current)
      setOffset(skip + got.length)
    },
    [locality, supabase],
  )
  useEffect(() => {
    if (ready && locality && ["inicio", "comunidade", "minhas"].includes(route.name))
      void loadList(route.name === "minhas" ? "mine" : filter)
  }, [ready, locality, route.name, filter, loadList])
  useEffect(() => {
    const nav = pendingRestore.current
    if (
      !nav ||
      listRevision < pendingListRestoreAt.current ||
      listing.kind !== "done" ||
      route.name === "pergunta"
    )
      return
    pendingRestore.current = null
    if (main.current) main.current.scrollTop = nav.scroll
    const target = nav.focus
      ? document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(nav.focus)}"]`)
      : null
    ;(target ?? document.querySelector<HTMLElement>(".app-main h1"))?.focus({
      preventScroll: true,
    })
  }, [listRevision, listing.kind, route.name])
  const loadDetail = useCallback(async () => {
    if (!locality || !route.id) return
    const ticket = ++detailGeneration.current
    const id = route.id
    setDetail({ kind: "loading" })
    const q = await supabase
      .from("recommendation_requests")
      .select("id,author_id,title,body,category,created_at,is_resolved,resolved_reply_id")
      .eq("id", id)
      .maybeSingle()
    if (ticket !== detailGeneration.current || route.name !== "pergunta" || route.id !== id) return
    if (q.error) {
      setDetail({ kind: "error" })
      return
    }
    if (!q.data) {
      setDetail({ kind: "missing" })
      return
    }
    const [r, s] = await Promise.all([
      supabase.rpc("list_question_replies", { p_request_id: id }),
      supabase
        .from("recommendation_saves")
        .select("request_id")
        .eq("user_id", user)
        .eq("request_id", id)
        .maybeSingle(),
    ])
    if (ticket !== detailGeneration.current || route.name !== "pergunta" || route.id !== id) return
    if (r.error || s.error) {
      setDetail({ kind: "error" })
      return
    }
    setDetail({
      kind: "done",
      request: q.data as Request,
      replies: (r.data ?? []) as Reply[],
      following: !!s.data,
    })
  }, [locality, route.id, route.name, supabase, user])
  useEffect(() => {
    if (ready && route.name === "pergunta") void loadDetail()
  }, [ready, route.name, loadDetail])
  useEffect(() => {
    if (detail.kind !== "done" || route.name !== "pergunta") return
    const nav = pendingRestore.current
    pendingRestore.current = null
    requestAnimationFrame(() => {
      if (main.current && nav) main.current.scrollTop = nav.scroll
      const key = nav?.focus ?? "question-heading"
      document
        .querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(key)}"]`)
        ?.focus({ preventScroll: true })
    })
  }, [detail.kind, route.name])
  useEffect(() => {
    if (!dialog || title.trim().length < 3 || !locality) {
      setSuggestions([])
      return
    }
    let current = true
    const timer = window.setTimeout(() => {
      void supabase
        .rpc("list_indications", { p_locality_id: locality, p_query: title.trim(), p_limit: 5 })
        .then(({ data }) => {
          if (current) setSuggestions(data ?? [])
        })
    }, 300)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [dialog, locality, supabase, title])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return
      if (["inicio", "comunidade", "minhas"].includes(route.name))
        void loadList(route.name === "minhas" ? "mine" : filter)
      if (route.name === "pergunta") void loadDetail()
    }
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [filter, loadDetail, loadList, route.name])
  const chooseFilter = (f: Filter) => {
    setFilter(f)
    const key = `filter-${f}`,
      nav: AppNavigation = {
        ...navigation(),
        route,
        origin,
        filter: f,
        scroll: main.current?.scrollTop ?? 0,
        focus: key,
      }
    history.replaceState({ ...history.state, navigation: nav }, "", location.href)
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(`[data-focus-key="${key}"]`)
        ?.focus({ preventScroll: true }),
    )
  }
  const openAsk = () => {
    saveContext()
    draftId.current = crypto.randomUUID()
    setTitle("")
    setBody("")
    setError("")
    setDialog(true)
    wasDialog.current = true
    history.pushState(
      {
        ...history.state,
        askDialog: true,
        navigation: {
          ...navigation(),
          route,
          origin,
          filter,
          scroll: main.current?.scrollTop ?? 0,
          focus: "ask-trigger",
        },
      },
      "",
      location.href,
    )
    requestAnimationFrame(() => dialogEl.current?.showModal())
  }
  const closeAsk = () => {
    if (history.state?.askDialog) history.back()
    else {
      wasDialog.current = false
      setDialog(false)
      dialogEl.current?.close()
      trigger.current?.focus()
    }
  }
  const publish = async () => {
    const clean = title.trim()
    if (titleProblem(clean)) {
      setError("Escreva sua pergunta com pelo menos 8 caracteres.")
      return
    }
    if (busy) return
    setBusy(true)
    setError("")
    const already = await supabase
      .from("recommendation_requests")
      .select("id")
      .eq("id", draftId.current)
      .maybeSingle()
    if (already.data?.id) {
      setBusy(false)
      wasDialog.current = false
      setDialog(false)
      dialogEl.current?.close()
      go({ name: "pergunta", id: already.data.id })
      return
    }
    const { error: e } = await supabase.from("recommendation_requests").insert({
      id: draftId.current,
      author_id: user,
      locality_id: locality,
      title: clean,
      body: body.trim(),
      category: suggestCategory(clean) ?? "outros",
    })
    if (e) {
      setBusy(false)
      setError("Não foi possível publicar. Sua pergunta continua aqui.")
      return
    }
    const id = draftId.current
    setBusy(false)
    wasDialog.current = false
    setDialog(false)
    dialogEl.current?.close()
    go({ name: "pergunta", id })
  }
  const back = () => (history.state?.parent ? history.back() : go({ name: "comunidade" }, true))
  const follow = async () => {
    if (detail.kind !== "done") return
    const was = detail.following,
      next = !was
    setDetail({ ...detail, following: next })
    const result = next
      ? await supabase
          .from("recommendation_saves")
          .insert({ user_id: user, request_id: detail.request.id })
      : await supabase
          .from("recommendation_saves")
          .delete()
          .eq("user_id", user)
          .eq("request_id", detail.request.id)
    if (result.error)
      setDetail((value) => (value.kind === "done" ? { ...value, following: was } : value))
  }
  const send = async () => {
    if (detail.kind !== "done" || answer.trim().length < 5) return
    setActionError("")
    const { error: e } = await supabase
      .from("recommendation_replies")
      .insert({ request_id: detail.request.id, author_id: user, body: answer.trim() })
    if (!e) {
      setAnswer("")
      await loadDetail()
    } else setActionError("Não foi possível enviar sua indicação. Tente novamente.")
  }
  const solve = async (id: string) => {
    if (detail.kind !== "done") return
    setActionError("")
    const { error: e } = await callResolutionRpc(supabase, "mark_recommendation_reply_resolved", {
      p_request_id: detail.request.id,
      p_reply_id: id,
    })
    if (!e) await loadDetail()
    else setActionError("Não foi possível marcar a resposta como resolvida. Tente novamente.")
  }
  const reopen = async () => {
    if (detail.kind !== "done") return
    setActionError("")
    const { error: e } = await callResolutionRpc(supabase, "reopen_recommendation", {
      p_request_id: detail.request.id,
    })
    if (!e) await loadDetail()
    else setActionError("Não foi possível reabrir a pergunta. Tente novamente.")
  }
  if (!ready)
    return (
      <div className="app-react">
        <p className="app-appbusy" role="status" aria-label="Carregando perguntas">
          Carregando…
        </p>
      </div>
    )
  const active = activeAppTab(route, origin)
  const questions = (data: IndicationRow[]) => (
    <ul className="list" aria-label="Perguntas">
      {data.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            className="list-row app-question"
            aria-label={row.title}
            aria-describedby={`meta-${row.id}`}
            data-focus-key={`question-${row.id}`}
            onClick={(event) => {
              event.currentTarget.focus()
              go({ name: "pergunta", id: row.id })
            }}
          >
            <span className="avatar" aria-hidden="true">
              {row.title.slice(0, 1).toLocaleUpperCase("pt-BR")}
            </span>
            <span className="txt">
              <b>{row.title}</b>
              <small id={`meta-${row.id}`}>
                {categoryLabel(row.category)} ·{" "}
                {new Date(row.created_at).toLocaleDateString("pt-BR")}
              </small>
              <span className="question-status">
                {row.is_resolved
                  ? "Resolvida"
                  : row.reply_count
                    ? `${row.reply_count} respostas`
                    : "Sem resposta"}
              </span>
            </span>
            <md-icon>chevron_right</md-icon>
          </button>
        </li>
      ))}
    </ul>
  )
  const list = (mine = false, home = false) =>
    listing.kind === "loading" ? (
      <div role="status" aria-label="Carregando perguntas" aria-busy="true">
        Carregando perguntas…
      </div>
    ) : listing.kind === "error" ? (
      <div className="app-error" role="alert">
        Não foi possível carregar as perguntas.{" "}
        <button
          type="button"
          className="app-button"
          onClick={() => void loadList(mine ? "mine" : filter)}
        >
          Tentar de novo
        </button>
      </div>
    ) : listing.rows.length === 0 ? (
      <section className="context-strip">
        <h3>
          {mine
            ? "Seu histórico começa aqui"
            : filter === "help"
              ? "Ninguém esperando resposta"
              : "Nenhuma pergunta por aqui"}
        </h3>
        <p className="app-muted">Você pode buscar uma indicação ou iniciar uma pergunta.</p>
      </section>
    ) : (
      <>
        {questions(home ? listing.rows.slice(0, 2) : listing.rows)}
        {!home && listing.rows.length >= INDICATION_PAGE_SIZE && (
          <button
            type="button"
            className="app-button"
            onClick={() => void loadList(mine ? "mine" : filter, offset)}
          >
            Carregar mais
          </button>
        )}
      </>
    )
  const community = (mine = false) => (
    <>
      <header className="page-head">
        <div>
          <h1 tabIndex={-1} data-focus-key={mine ? "mine-heading" : "community-heading"}>
            {mine ? "Minhas perguntas e indicações" : "Comunidade"}
          </h1>
          {!mine && <p>O que a comunidade sabe fica disponível para quem chegar depois.</p>}
        </div>
        <md-filled-tonal-button ref={trigger} className="ask-inline" onClick={openAsk}>
          <md-icon slot="icon">edit_square</md-icon> Perguntar
        </md-filled-tonal-button>
      </header>
      {!mine && (
        <>
          <div className="tabs-wrap app-tabs">
            <md-tabs>
              <md-primary-tab
                active={communityTab === "ind"}
                onClick={() => setCommunityTab("ind")}
              >
                Indicações
              </md-primary-tab>
              <md-primary-tab
                active={communityTab === "grp"}
                onClick={() => setCommunityTab("grp")}
              >
                Grupos
              </md-primary-tab>
            </md-tabs>
          </div>
          <div className="context-strip">
            {resolvedCount} indicações resolvidas. Busque uma resposta antes de perguntar.
          </div>
          {communityTab === "grp" ? (
            <section className="context-strip">
              <h2>Grupos</h2>
              <p>Em breve</p>
            </section>
          ) : (
            <>
              <div className="app-filters">
                {(
                  [
                    ["help", "Para ajudar"],
                    ["resolved", "Resolvidas"],
                    ["mine", "Minhas"],
                  ] as [Filter, string][]
                ).map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    className="filter-chip"
                    aria-pressed={filter === key}
                    data-focus-key={`filter-${key}`}
                    onClick={() => chooseFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {communityTab === "ind" || mine ? list(mine) : null}
    </>
  )
  const detailView = () =>
    detail.kind === "loading" ? (
      <p role="status" aria-label="Carregando perguntas">
        Carregando…
      </p>
    ) : detail.kind === "error" ? (
      <div className="app-error" role="alert">
        Não foi possível carregar as perguntas.{" "}
        <button type="button" className="app-button" onClick={() => void loadDetail()}>
          Tentar de novo
        </button>
      </div>
    ) : detail.kind === "missing" ? (
      <>
        <h1 tabIndex={-1}>Indicação indisponível</h1>
        <p>Esta indicação não está disponível nesta cidade.</p>
      </>
    ) : (
      <>
        <button type="button" className="app-button back-button" onClick={back}>
          Voltar
        </button>
        <article className="question">
          <p className="app-meta">
            {categoryLabel(detail.request.category)} ·{" "}
            {new Date(detail.request.created_at).toLocaleDateString("pt-BR")}
          </p>
          <h1 tabIndex={-1} data-focus-key="question-heading">
            {detail.request.title}
          </h1>
          {detail.request.body && <p className="detail-copy">{detail.request.body}</p>}
          <div className="app-row">
            <span>{detail.request.is_resolved ? "Resolvida" : "Indicação da comunidade"}</span>
            <button
              type="button"
              className="app-button"
              aria-pressed={detail.following}
              onClick={() => void follow()}
            >
              {detail.following ? "Parar de seguir respostas" : "Seguir respostas"}
            </button>
          </div>
        </article>
        <section>
          <h2>Respostas</h2>
          {detail.replies.length ? (
            <ul className="stack" aria-label="Respostas">
              {detail.replies.map((reply) => (
                <li key={reply.id} className="answer">
                  {reply.is_removed ? (
                    <p>Resposta removida pela moderação.</p>
                  ) : (
                    <>
                      <p className="detail-copy">{reply.body}</p>
                      {detail.request.author_id === user && !detail.request.is_resolved && (
                        <button
                          type="button"
                          className="app-button"
                          onClick={() => void solve(reply.id)}
                        >
                          Ajudou a resolver
                        </button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <h3>A comunidade ainda não respondeu</h3>
          )}
        </section>
        {detail.request.author_id === user && detail.request.is_resolved && (
          <button type="button" className="app-button" onClick={() => void reopen()}>
            Reabrir pergunta
          </button>
        )}
        {actionError && (
          <p className="app-error" role="alert">
            {actionError}
          </p>
        )}
        {!detail.request.is_resolved && (
          <div className="app-compose">
            <label htmlFor="answer-box">Sua resposta</label>
            <textarea
              id="answer-box"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={2000}
            />
            <button type="button" className="app-button primary" onClick={() => void send()}>
              Enviar indicação
            </button>
          </div>
        )}
      </>
    )
  return (
    <div className="app-react">
      <header className="app-top">Bivaque · {city}</header>
      <div className="app-frame">
        <nav className="nav-main" aria-label="Navegação principal">
          <div className="rail-brand" aria-hidden="true">
            <span className="brand-mark">B</span>
          </div>
          {(["inicio", "comunidade", "conversas", "voce"] as const).map((name, i) => (
            <button
              type="button"
              className="nav-item"
              key={name}
              aria-label={["Início", "Comunidade", "Conversas", "Você"][i]}
              aria-current={active === name ? "page" : undefined}
              onClick={() => go({ name })}
            >
              <md-icon>{["home", "groups", "chat_bubble", "person"][i]}</md-icon>
              <span>{["Início", "Comunidade", "Conversas", "Você"][i]}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="create-fab" aria-label="Criar" onClick={openAsk}>
          <md-icon>add</md-icon>
          <span className="fab-label">Criar</span>
        </button>
        <main className="app-main" ref={main} onScroll={saveContext}>
          {route.name === "inicio" ? (
            <div className="app-content home-mob">
              <header className="page-head">
                <h1 tabIndex={-1}>O que você precisa em {city}</h1>
              </header>
              <button type="button" className="home-search-button" aria-label="Buscar no Bivaque">
                <md-icon>search</md-icon>
                <span>Busque “diarista de confiança”</span>
              </button>
              <nav className="intent-grid" aria-label="Áreas">
                <button type="button" className="intent">
                  <md-icon>storefront</md-icon>
                  <span>Negócios</span>
                </button>
                <button type="button" className="intent">
                  <md-icon>sell</md-icon>
                  <span>Desapegos</span>
                </button>
                <button type="button" className="intent">
                  <md-icon>apartment</md-icon>
                  <span>Imóveis</span>
                </button>
                <button type="button" className="intent" onClick={() => go({ name: "comunidade" })}>
                  <md-icon>volunteer_activism</md-icon>
                  <span>Indicações</span>
                </button>
              </nav>
              <section className="section">
                <div className="section-title">
                  <h2>A comunidade procura</h2>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => go({ name: "comunidade" })}
                  >
                    Ver perguntas
                  </button>
                </div>
                {list(false, true)}
              </section>
            </div>
          ) : route.name === "comunidade" ? (
            <div className="app-content">{community()}</div>
          ) : route.name === "minhas" ? (
            <div className="app-content">{community(true)}</div>
          ) : route.name === "pergunta" ? (
            <div className="app-content">{detailView()}</div>
          ) : (
            <div className="app-content">
              <h1>
                {route.name === "conversas"
                  ? "Conversas"
                  : route.name === "voce"
                    ? "Você"
                    : "Destino indisponível"}
              </h1>
              <p>Em breve</p>
            </div>
          )}
        </main>
      </div>
      {dialog && (
        <dialog
          ref={dialogEl}
          className="app-dialog"
          aria-labelledby="ask-title"
          onCancel={(event) => {
            event.preventDefault()
            closeAsk()
          }}
          onClose={() => {
            setDialog(false)
            if (wasDialog.current) {
              wasDialog.current = false
              requestAnimationFrame(() => trigger.current?.focus())
            }
          }}
        >
          <h2 id="ask-title">Pedir indicação</h2>
          <div className="app-compose">
            <label htmlFor="ask-question">Sua pergunta</label>
            <textarea
              id="ask-question"
              value={title}
              maxLength={300}
              onChange={(e) => {
                setTitle(e.target.value)
                setError("")
              }}
            />
            {title.trim().length >= 3 && (
              <aside aria-live="polite">
                <h3>Já perguntaram</h3>
                {suggestions.length ? (
                  suggestions.map((row) => <p key={row.id}>{row.title}</p>)
                ) : (
                  <p className="app-muted">Buscando perguntas parecidas…</p>
                )}
              </aside>
            )}
            <label htmlFor="ask-details">
              Detalhes <span className="app-muted">(opcional)</span>
            </label>
            <textarea
              id="ask-details"
              value={body}
              maxLength={2000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Conte um pouco mais, se ajudar."
            />
            {error && (
              <p role="alert" className="app-error">
                {error}
              </p>
            )}
            <div className="app-row">
              <button type="button" className="app-button" onClick={closeAsk}>
                Cancelar
              </button>
              <md-filled-button
                className="app-button primary"
                disabled={busy}
                onClick={() => void publish()}
              >
                Publicar pergunta
              </md-filled-button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
