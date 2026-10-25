import { html, nothing, render } from "lit"
import "@material/web/button/filled-button.js"
import "@material/web/button/filled-tonal-button.js"
import "@material/web/button/outlined-button.js"
import "@material/web/button/text-button.js"
import "@material/web/dialog/dialog.js"
import "@material/web/tabs/primary-tab.js"
import "@material/web/tabs/tabs.js"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../supabase/client"
import {
  type AppRoute,
  activeAppTab,
  appHash,
  type NavigationContext,
  parseAppHash,
} from "./navigation"

type Filter = NavigationContext["filter"]
type Question = {
  id: string
  author_id: string
  title: string
  body: string
  category: Database["public"]["Enums"]["recommendation_category"]
  created_at: string
  is_resolved: boolean
  resolved_reply_id: string | null
  last_resolved_reply_id: string | null
  group_id: string | null
}
type Reply = {
  id: string
  author_id: string | null
  body: string | null
  created_at: string
  edited_at: string | null
  is_removed: boolean
}
type Row = Database["public"]["Functions"]["list_indications"]["Returns"][number]
type Context = NavigationContext
const PAGE_SIZE = 20
const FILTERS: { id: Filter; label: string; resolved?: boolean; mine?: boolean }[] = [
  { id: "ajudar", label: "Para ajudar", resolved: false, mine: false },
  { id: "resolvidas", label: "Resolvidas", resolved: true },
  { id: "minhas", label: "Minhas", mine: true },
]
const INITIAL: Context = {
  route: { name: "inicio", id: null },
  origin: "inicio",
  parent: null,
  filter: "ajudar",
  scroll: 0,
  focus: null,
}
const FAILURE = "Não foi possível carregar as perguntas."
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const category = (value: Question["category"]) =>
  ({
    saude_bem_estar: "Saúde",
    servicos_locais: "Serviços locais",
    educacao: "Educação",
    moradia: "Moradia",
    transporte: "Transporte",
    alimentacao: "Alimentação",
    esporte_lazer: "Esporte e lazer",
    outros: "Outros",
  })[value] ?? "Outros"
const age = (value: string) => {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  return days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`
}

export function mountApp(root: HTMLElement): () => void {
  const db = createBrowserClient()
  let route = parseAppHash(location.hash)
  let context = { ...INITIAL }
  let filter: Filter = "ajudar"
  let viewerId = ""
  let localityId = ""
  let cityName = ""
  let rows: Row[] = []
  let replies: Reply[] = []
  let names: Record<string, string> = {}
  let detail: Question | null = null
  let saved = false
  let resolvedCount = 0
  let loading = true
  let loadingMore = false
  let hasMore = false
  let listError = ""
  let unavailable = false
  let detailError = ""
  let askOpen = false
  let askDraft = ""
  let askDetails = ""
  let askCategory: Question["category"] = "outros"
  let answerDraft = ""
  let feedback = ""
  let similar: Row[] = []
  let groupsSelected = false
  let publishing = false
  let requestKey = ""
  let generation = 0
  let similarGeneration = 0
  let restorePending = false
  const media = matchMedia("(prefers-color-scheme: dark)")
  const setTheme = () => {
    document.documentElement.dataset["theme"] = media.matches ? "dark" : "light"
  }
  setTheme()
  media.addEventListener("change", setTheme)
  document.body.classList.add("app-lit-body")

  const focus = (selector?: string | null) =>
    requestAnimationFrame(() => {
      const element = selector ? root.querySelector<HTMLElement>(selector) : null
      ;(element ?? root.querySelector<HTMLElement>("#screen-title"))?.focus({ preventScroll: true })
    })
  const descriptor = () => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active.dataset["focus"])
      return `[data-focus="${active.dataset["focus"]}"]`
    if (active instanceof HTMLElement && active.id) return `#${CSS.escape(active.id)}`
    return null
  }
  const saveContext = (focusTarget = descriptor()) => {
    context = {
      ...context,
      route,
      filter,
      focus: focusTarget,
      scroll: root.querySelector<HTMLElement>("main")?.scrollTop ?? 0,
    }
    history.replaceState({ ...history.state, navigation: context }, "", location.href)
  }
  const restore = () => {
    if (!restorePending) return
    restorePending = false
    const main = root.querySelector<HTMLElement>("main")
    if (main) {
      const behavior = main.style.scrollBehavior
      main.style.scrollBehavior = "auto"
      main.scrollTo({ top: context.scroll, behavior: "instant" })
      main.style.scrollBehavior = behavior
    }
    focus(context.focus)
  }
  const title = () =>
    route.name === "minhas"
      ? "Minhas perguntas e indicações"
      : route.name === "pergunta"
        ? (detail?.title ?? "Indicação")
        : route.name === "comunidade"
          ? "Comunidade"
          : route.name === "conversas"
            ? "Conversas"
            : route.name === "voce"
              ? "Você"
              : route.name === "indisponivel"
                ? "Indicação indisponível"
                : `O que você precisa em ${cityName}`

  const questionRow = (row: Row) => html`
    <li class="question-row"><button class="list-row" type="button" aria-label=${row.title}
      data-focus=${`question:${row.id}`} @click=${() => navigate({ name: "pergunta", id: row.id })}>
      <span class="avatar" aria-hidden="true">${row.title.slice(0, 1).toLocaleUpperCase("pt-BR")}</span>
      <span class="txt"><b>${row.title}</b><small>${category(row.category)} · ${age(row.created_at)}</small>
      <span class="pill ${row.is_resolved ? "ok" : ""}">${row.is_resolved ? "Resolvida" : row.reply_count ? `${row.reply_count} respostas` : "Sem resposta"}</span></span>
      <span class="chev" aria-hidden="true">›</span></button></li>
  `
  const questionList = (items: Row[]) =>
    html`<ul class="list question-list" role="list" aria-label="Perguntas">${items.map(questionRow)}</ul>`
  const loadingView = (label = "Carregando perguntas") =>
    html`<div class="loading-state" role="status" aria-live="polite" aria-busy="true"><span class="spinner" aria-hidden="true"></span>${label}</div>`
  const questionsLoading = () =>
    html`<ul class="list question-list" role="list" aria-label="Perguntas" aria-busy="true"><li>${loadingView()}</li></ul>`
  const empty = (heading: string, description: string) =>
    html`<section class="empty"><span class="empty-art" aria-hidden="true">âœ³</span><h3>${heading}</h3><p>${description}</p></section>`
  const retry = (message: string, fn: () => void) =>
    html`<section role="alert" class="error-state"><p>${message}</p><md-outlined-button @click=${fn}>Tentar de novo</md-outlined-button></section>`
  const heading = (text: string, description = "") =>
    html`<div class="page-head"><div><h1 id="screen-title" tabindex="-1">${text}</h1>${description ? html`<p>${description}</p>` : nothing}</div></div>`

  function view() {
    const active = activeAppTab(route, context.origin)
    const nav = (
      name: Context["origin"],
      label: string,
      symbol: string,
    ) => html`<button class="nav-item" type="button"
      aria-current=${active === name ? "page" : nothing} data-focus=${`nav:${name}`} @click=${() => navigate({ name, id: null })}>
      <span class="nav-icon material-symbols-outlined" aria-hidden="true">${symbol}</span><span>${label}</span></button>`
    const isDetail = route.name === "pergunta"
    const mainContent =
      route.name === "inicio"
        ? home()
        : route.name === "comunidade"
          ? community()
          : route.name === "minhas"
            ? mine()
            : isDetail
              ? detailView()
              : route.name === "conversas" || route.name === "voce"
                ? html`${heading(title())}${empty("Em breve", "")}`
                : html`${heading("Indicação indisponível")}`

    render(
      html`
      <header class="topbar"><div class="topbar-in">${isDetail ? html`<button class="app-back" type="button" aria-label="Voltar" @click=${back}>‹</button>` : nothing}<span class="brand">${route.name === "inicio" ? "Bivaque" : title()}</span><span class="city-label">${cityName}</span></div></header>
      <nav class="nav-main" aria-label="Navegação principal">
        ${nav("inicio", "Início", "home")}${nav("comunidade", "Comunidade", "groups")}
        <span class="nav-create-slot" aria-hidden="true">Criar</span>${nav("conversas", "Conversas", "forum")}${nav("voce", "Você", "person")}
      </nav><md-filled-tonal-button class="create-fab" aria-label="Criar" @click=${openAsk}><span class="material-symbols-outlined" slot="icon">add</span><span class="fab-label">Criar</span></md-filled-tonal-button>
      <main id="main" role="main"><div class="page ${isDetail ? "detail-page" : ""}">${mainContent}</div></main>
      ${askOpen ? askDialog() : nothing}
      ${feedback ? html`<p class="snackbar show" role="status">${feedback}</p>` : nothing}
    `,
      root,
    )
    if (askOpen) requestAnimationFrame(() => root.querySelector("md-dialog")?.show())
    if (!loading && !listError) restore()
  }

  function home() {
    return html`<section class="home-mob">${heading(`O que você precisa em ${cityName}`)}
      <div class="home-top"><button class="home-search-button" type="button" aria-label="Buscar no Bivaque" @click=${() => navigate({ name: "comunidade", id: null })}>⌕ <span>Busque <b>indicações para sua cidade</b></span></button>
        <nav class="intent-grid" aria-label="Áreas"><button class="intent" type="button">Negócios</button><button class="intent" type="button">Desapegos</button><button class="intent" type="button">Imóveis</button><button class="intent" type="button" data-focus="home-indications" @click=${() => navigate({ name: "comunidade", id: null })}>Indicações</button></nav>
      </div><section class="section"><div class="section-title"><h2>A comunidade procura</h2></div>
      ${loading && !rows.length ? questionsLoading() : listError ? retry(listError, loadFirst) : rows.length ? questionList(rows.slice(0, 2)) : empty("Uma pergunta pode ajudar muita gente", "Busque uma indicação ou compartilhe uma dúvida com sua cidade.")}</section>
    </section>`
  }
  function filterChips() {
    return html`<div class="filter-row" aria-label="Filtros de perguntas">${FILTERS.map(
      (item) => html`<button type="button" class="filter-chip"
      aria-pressed=${filter === item.id ? "true" : "false"} data-focus=${`filter:${item.id}`} @click=${() => changeFilter(item.id)}>${item.label}</button>`,
    )}</div>`
  }
  function community() {
    return html`${heading("Comunidade", "O que a comunidade sabe fica disponível para quem chegar depois.")}
      <div class="tabs-wrap" role="tablist" aria-label="Comunidade">
        <md-primary-tab role="tab" aria-selected=${String(!groupsSelected)} data-focus="tab:ind" @click=${() => {
          groupsSelected = false
          view()
        }}>Indicações</md-primary-tab>
        <md-primary-tab role="tab" aria-selected=${String(groupsSelected)} @click=${() => {
          groupsSelected = true
          view()
        }}>Grupos</md-primary-tab>
      </div>
      ${
        groupsSelected
          ? empty("Em breve", "")
          : html`
      <section class="context-strip"><span aria-hidden="true">◷</span><span><b>${resolvedCount} indicações resolvidas</b><br>Busque uma resposta antes de perguntar.</span></section>
      ${filterChips()}<div class="section-title"><h2>Indicações</h2><md-filled-tonal-button data-focus="ask" @click=${openAsk}>Perguntar</md-filled-tonal-button></div>
      ${loading && !rows.length ? questionsLoading() : listError ? retry(listError, loadFirst) : rows.length ? questionList(rows) : empty(filter === "ajudar" ? "Ninguém esperando resposta" : "Nenhuma pergunta por aqui", "Você pode buscar uma indicação ou iniciar uma nova pergunta.")}
      ${hasMore ? html`<div class="paged-foot"><md-outlined-button ?disabled=${loadingMore} @click=${loadMore}>${loadingMore ? "Carregando…" : "Carregar mais"}</md-outlined-button></div>` : nothing}`
      }`
  }
  function mine() {
    return html`${heading("Minhas perguntas e indicações", "Seu histórico de participação na comunidade.")}
      <div class="section-title"><h2>Indicações</h2><md-filled-tonal-button data-focus="ask" @click=${openAsk}>Perguntar</md-filled-tonal-button></div>
      ${loading && !rows.length ? questionsLoading() : listError ? retry(listError, loadFirst) : rows.length ? questionList(rows) : empty("Seu histórico começa aqui", "Uma dúvida sua pode virar uma resposta útil para outras famílias.")}`
  }
  function detailView() {
    if (detailError) return retry(detailError, () => void loadDetail(route.id ?? ""))
    if (unavailable) return heading("Indicação indisponível")
    if (loading) return loadingView("Carregando indicação")
    if (!detail) return heading("Indicação indisponível")
    const author = detail.author_id === viewerId
    const authorName = (id: string | null) =>
      id ? (names[id] ?? "Membro da comunidade") : "Membro da comunidade"
    return html`<article class="question"><div class="row"><p class="small muted">${category(detail.category)} · ${age(detail.created_at)} · ${authorName(detail.author_id)}</p>
        <md-filled-tonal-button aria-pressed=${saved ? "true" : "false"} @click=${toggleFollow}>${saved ? "Parar de seguir respostas" : "Seguir respostas"}</md-filled-tonal-button></div>
        <h1 id="screen-title" tabindex="-1">${detail.title}</h1>${detail.body ? html`<p class="detail-copy">${detail.body}</p>` : nothing}
        <span class="pill ${detail.is_resolved ? "ok" : ""}">${detail.is_resolved ? "Resolvida" : replies.length ? `${replies.length} respostas` : "Sem resposta"}</span>
      </article>
      <section class="section"><div class="section-title"><h2>Respostas</h2></div>
        ${
          replies.length
            ? html`<ul class="stack answer-list" role="list" aria-label="Respostas">${replies.map(
                (
                  reply,
                ) => html`<li><article class="answer ${detail?.resolved_reply_id === reply.id ? "accepted" : ""}">
          <b class="small">${authorName(reply.author_id)}</b>${reply.is_removed ? html`<p class="small muted">Resposta removida pela moderação.</p>` : html`<p class="detail-copy">${reply.body}</p>`}
          ${
            author && !reply.is_removed
              ? html`<div class="answer-actions">${
                  detail?.resolved_reply_id === reply.id
                    ? html`<md-outlined-button @click=${() => resolveReply(reply.id, true)}>Reabrir pergunta</md-outlined-button>`
                    : html`<md-outlined-button @click=${() => resolveReply(reply.id, false)}>Ajudou a resolver</md-outlined-button>`
                }</div>`
              : nothing
          }
        </article></li>`,
              )}</ul>`
            : empty(
                "A comunidade ainda não respondeu",
                "Sua pergunta já está disponível. Você pode acompanhar as respostas por aqui.",
              )
        }
      </section>
      ${author && !detail.is_resolved ? html`<md-outlined-button @click=${() => resolveQuestion(false)}>Marcar como resolvida</md-outlined-button>` : nothing}
      ${
        !detail.is_resolved
          ? html`<section class="question-compose"><h3>Compartilhe uma indicação</h3><label for="answer-input">Sua resposta</label>
        <textarea id="answer-input" aria-label="Sua resposta" rows="3" maxlength="2000" .value=${answerDraft}
          @input=${(event: Event) => {
            answerDraft = (event.target as HTMLTextAreaElement).value
          }}></textarea>
        ${feedback ? html`<p role="alert">${feedback}</p>` : nothing}<md-filled-button @click=${sendAnswer}>Enviar indicação</md-filled-button></section>`
          : nothing
      }
      ${author && detail.is_resolved && !detail.resolved_reply_id ? html`<md-outlined-button @click=${() => resolveQuestion(true)}>Reabrir pergunta</md-outlined-button>` : nothing}`
  }
  function askDialog() {
    return html`<md-dialog class="form-dialog" aria-label="Pedir indicação">
      <div slot="headline" class="dialog-title">Pedir indicação</div><div slot="content" class="ask-content">
        <label for="ask-title">Sua pergunta</label><textarea id="ask-title" aria-label="Sua pergunta" rows="3" required minlength="8" maxlength="300" .value=${askDraft}
          @input=${(event: Event) => {
            askDraft = (event.target as HTMLTextAreaElement).value.slice(0, 300)
            void searchSimilar()
          }}></textarea>
        <p class="form-note">Sua pergunta aparece para a comunidade de ${cityName}.</p>
        ${similar.length ? html`<h3>Já perguntaram</h3>${questionList(similar)}` : nothing}
        <label for="ask-details">Detalhes (opcional)</label><textarea id="ask-details" rows="3" maxlength="2000" .value=${askDetails}
          @input=${(event: Event) => {
            askDetails = (event.target as HTMLTextAreaElement).value.slice(0, 2000)
          }}></textarea>
        <label for="ask-category">Assunto</label><select id="ask-category" .value=${askCategory}
          @change=${(event: Event) => {
            askCategory = (event.target as HTMLSelectElement).value as Question["category"]
          }}>
          <option value="saude_bem_estar">Saúde</option><option value="servicos_locais">Serviços locais</option><option value="educacao">Educação</option><option value="moradia">Moradia</option><option value="transporte">Transporte</option><option value="alimentacao">Alimentação</option><option value="esporte_lazer">Esporte e lazer</option><option value="outros">Outros</option></select>
        ${feedback ? html`<p role="alert">Não foi possível publicar. Sua pergunta continua aqui.</p>` : nothing}
      </div><div slot="actions" class="dialog-actions"><md-text-button @click=${closeAsk}>Cancelar</md-text-button>
        <md-filled-button ?disabled=${askDraft.trim().length < 8 || publishing} @click=${publish}>${publishing ? "Publicando…" : "Publicar pergunta"}</md-filled-button></div>
    </md-dialog>`
  }

  function navigate(next: AppRoute, replace = false) {
    saveContext()
    const parent = replace ? (history.state?.parent ?? null) : { ...route }
    route = next
    if (next.name === "comunidade") filter = "ajudar"
    if (next.name === "minhas") filter = "minhas"
    if (["inicio", "comunidade", "minhas"].includes(next.name)) rows = []
    context = {
      ...context,
      route,
      origin:
        next.name === "inicio" ||
        next.name === "comunidade" ||
        next.name === "conversas" ||
        next.name === "voce"
          ? next.name
          : context.origin,
      parent,
      filter,
      scroll: 0,
      focus: null,
    }
    history[replace ? "replaceState" : "pushState"](
      { ...history.state, parent, navigation: context },
      "",
      appHash(next),
    )
    if (next.name === "pergunta") void loadDetail(next.id ?? "")
    else if (next.name === "comunidade" || next.name === "minhas" || next.name === "inicio")
      void loadFirst()
    else {
      loading = false
      view()
    }
    view()
    focus("#screen-title")
  }
  function back() {
    if (askOpen || history.state?.parent) {
      history.back()
      return
    }
    route = { name: "comunidade", id: null }
    filter = "ajudar"
    context = { ...context, route, filter, scroll: 0, focus: "#screen-title" }
    history.replaceState({ ...history.state, navigation: context }, "", appHash(route))
    void loadFirst()
  }
  async function loadFirst() {
    const ticket = ++generation
    loading = true
    listError = ""
    view()
    const active = FILTERS.find((item) => item.id === filter) ?? {
      id: "ajudar" as const,
      label: "Para ajudar",
      resolved: false,
      mine: false,
    }
    const result = await db.rpc("list_indications", {
      p_locality_id: localityId,
      ...(active.resolved === undefined ? {} : { p_resolved: active.resolved }),
      ...(route.name === "inicio" ? {} : { p_mine: active.mine }),
      p_limit: PAGE_SIZE,
      p_offset: 0,
    })
    if (ticket !== generation) return
    loading = false
    if (result.error) listError = FAILURE
    else {
      rows = result.data ?? []
      hasMore = rows.length === PAGE_SIZE
    }
    view()
  }
  async function loadMore() {
    if (loadingMore) return
    const ticket = generation
    const currentRoute = route.name
    const currentFilter = filter
    const offset = rows.length
    loadingMore = true
    view()
    const active = FILTERS.find((item) => item.id === filter) ?? {
      id: "ajudar" as const,
      label: "Para ajudar",
      resolved: false,
      mine: false,
    }
    const result = await db.rpc("list_indications", {
      p_locality_id: localityId,
      ...(active.resolved === undefined ? {} : { p_resolved: active.resolved }),
      ...(active.mine === undefined ? {} : { p_mine: active.mine }),
      p_limit: PAGE_SIZE,
      p_offset: offset,
    })
    if (ticket !== generation || currentRoute !== route.name || currentFilter !== filter) {
      loadingMore = false
      view()
      return
    }
    loadingMore = false
    if (result.error) {
      listError = FAILURE
      view()
      return
    }
    const more = result.data ?? []
    const known = new Set(rows.map((row) => row.id))
    rows = [...rows, ...more.filter((row) => !known.has(row.id))]
    hasMore = more.length === PAGE_SIZE
    view()
  }
  function changeFilter(next: Filter) {
    filter = next
    context.filter = next
    rows = []
    saveContext(`[data-focus="filter:${next}"]`)
    void loadFirst()
  }
  async function loadDetail(id: string) {
    const ticket = ++generation
    loading = true
    unavailable = false
    detailError = ""
    detail = null
    replies = []
    view()
    if (!UUID.test(id)) {
      loading = false
      unavailable = true
      view()
      return
    }
    const result = await db
      .from("recommendation_requests")
      .select(
        "id, author_id, title, body, category, created_at, is_resolved, resolved_reply_id, last_resolved_reply_id, group_id",
      )
      .eq("id", id)
      .maybeSingle()
    if (ticket !== generation) return
    if (result.error || !result.data) {
      loading = false
      unavailable = !result.error
      detailError = result.error ? FAILURE : ""
      view()
      return
    }
    detail = result.data as Question
    const [replyResult, saveResult] = await Promise.all([
      db.rpc("list_question_replies", { p_request_id: id }),
      db
        .from("recommendation_saves")
        .select("request_id")
        .eq("user_id", viewerId)
        .eq("request_id", id)
        .maybeSingle(),
    ])
    if (ticket !== generation) return
    if (replyResult.error || saveResult.error) {
      loading = false
      detailError = "Não foi possível carregar as respostas."
      view()
      return
    }
    replies = (replyResult.data ?? []) as Reply[]
    saved = Boolean(saveResult.data)
    const authorIds = [
      ...new Set([
        detail.author_id,
        ...replies.map((r) => r.author_id).filter((v): v is string => Boolean(v)),
      ]),
    ]
    const profiles = await db
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", authorIds)
    if (!profiles.error)
      names = Object.fromEntries(
        (profiles.data ?? []).map((row) => [row.user_id, row.display_name]),
      )
    loading = false
    view()
    if (restorePending) restore()
    else focus("#screen-title")
  }
  function openAsk() {
    saveContext()
    askDraft = ""
    askDetails = ""
    feedback = ""
    similar = []
    requestKey = crypto.randomUUID()
    askOpen = true
    history.pushState({ ...history.state, askDialog: true, navigation: context }, "", location.href)
    view()
    requestAnimationFrame(() => root.querySelector<HTMLElement>("#ask-title")?.focus())
  }
  function closeAsk() {
    similarGeneration++
    if (history.state?.askDialog) history.back()
    else {
      askOpen = false
      view()
      focus('[data-focus="ask"]')
    }
  }
  async function searchSimilar() {
    const ticket = ++similarGeneration
    const query = askDraft.trim()
    if (query.length < 3) {
      similar = []
      view()
      return
    }
    const result = await db.rpc("list_indications", {
      p_locality_id: localityId,
      p_query: query,
      p_limit: 5,
    })
    if (ticket !== similarGeneration || !askOpen || query !== askDraft.trim()) return
    similar = result.error ? [] : (result.data ?? [])
    view()
  }
  async function publish() {
    if (publishing) return
    const text = askDraft.trim()
    if (text.length < 8 || text.length > 300) {
      feedback = "Escreva uma pergunta com pelo menos 8 caracteres."
      view()
      return
    }
    publishing = true
    view()
    try {
      const {
        data: { user },
      } = await db.auth.getUser()
      if (!user) {
        feedback = "Sua sessão expirou. Entre de novo para publicar."
        view()
        return
      }
      const existing = await db
        .from("recommendation_requests")
        .select("id")
        .eq("id", requestKey)
        .maybeSingle()
      if (existing.error) {
        feedback = "Não foi possível publicar. Sua pergunta continua aqui."
        view()
        return
      }
      if (existing.data) {
        askOpen = false
        feedback = ""
        history.replaceState({ ...history.state, askDialog: false }, "", location.href)
        route = { name: "pergunta", id: requestKey }
        context = {
          ...context,
          route,
          parent: { ...context.route },
          focus: null,
          scroll: 0,
        }
        history.pushState({ parent: context.parent, navigation: context }, "", appHash(route))
        void loadDetail(requestKey)
        view()
        return
      }
      const result = await db
        .from("recommendation_requests")
        .insert({
          id: requestKey,
          author_id: user.id,
          locality_id: localityId,
          title: text,
          body: askDetails.trim(),
          category: askCategory,
        })
        .select("id")
        .single()
      if (result.error) {
        feedback = "Não foi possível publicar. Sua pergunta continua aqui."
        view()
        return
      }
      const id = result.data.id
      askOpen = false
      feedback = ""
      history.replaceState({ ...history.state, askDialog: false }, "", location.href)
      route = { name: "pergunta", id }
      context = {
        ...context,
        route,
        parent: { ...context.route },
        focus: null,
        scroll: 0,
      }
      history.pushState({ parent: context.parent, navigation: context }, "", appHash(route))
      void loadDetail(id)
      view()
    } finally {
      publishing = false
      if (askOpen) view()
    }
  }
  async function sendAnswer() {
    if (answerDraft.trim().length < 5 || !detail) {
      feedback = "Escreva uma resposta com pelo menos 5 caracteres."
      view()
      return
    }
    const {
      data: { user },
    } = await db.auth.getUser()
    if (!user) {
      feedback = "Não foi possível enviar sua indicação. Tente de novo."
      view()
      return
    }
    const result = await db
      .from("recommendation_replies")
      .insert({ request_id: detail.id, author_id: user.id, body: answerDraft.trim() })
    if (result.error) {
      feedback = "Não foi possível enviar sua indicação. Tente de novo."
      view()
      return
    }
    answerDraft = ""
    await loadDetail(detail.id)
  }
  async function toggleFollow() {
    if (!detail) return
    const result = saved
      ? await db
          .from("recommendation_saves")
          .delete()
          .eq("user_id", viewerId)
          .eq("request_id", detail.id)
      : await db.from("recommendation_saves").insert({ user_id: viewerId, request_id: detail.id })
    if (result.error) {
      feedback = "Não foi possível concluir a ação. Tente de novo."
      view()
      return
    }
    saved = !saved
    view()
  }
  async function resolveReply(replyId: string, reopen: boolean) {
    if (!detail) return
    const result = reopen
      ? await db.rpc("reopen_recommendation", { p_request_id: detail.id })
      : await db.rpc("mark_recommendation_reply_resolved", {
          p_request_id: detail.id,
          p_reply_id: replyId,
        })
    if (result.error) {
      feedback = "Não foi possível concluir a ação. Tente de novo."
      view()
      return
    }
    await loadDetail(detail.id)
  }
  async function resolveQuestion(reopen: boolean) {
    if (!detail) return
    const result = reopen
      ? await db.rpc("reopen_recommendation", { p_request_id: detail.id })
      : await db.rpc("mark_recommendation_resolved", { p_request_id: detail.id })
    if (result.error) {
      feedback = "Não foi possível concluir a ação. Tente de novo."
      view()
      return
    }
    await loadDetail(detail.id)
  }
  async function loadSummary() {
    const result = await db
      .from("recommendation_requests")
      .select("id", { count: "exact", head: true })
      .eq("locality_id", localityId)
      .eq("is_resolved", true)
    resolvedCount = result.error ? 0 : (result.count ?? 0)
    view()
  }
  function onScroll() {
    if (history.state?.navigation) saveContext()
  }
  function onFocusIn() {
    if (history.state?.navigation) saveContext()
  }
  function onVisibility() {
    if (document.visibilityState === "visible" && ["comunidade", "minhas"].includes(route.name))
      void loadFirst()
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && askOpen) closeAsk()
  }

  async function start() {
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()
    if (authError || !user) {
      location.replace(`/login?redirect=${encodeURIComponent(`/app${location.hash || "#inicio"}`)}`)
      return
    }
    viewerId = user.id
    const member = await db
      .from("locality_memberships")
      .select("locality_id, localities(city_name)")
      .eq("kind", "current")
      .maybeSingle()
    if (member.error) {
      loading = false
      listError = FAILURE
      view()
      return
    }
    if (!member.data) {
      location.replace("/onboarding/locality")
      return
    }
    const locality = member.data as unknown as {
      locality_id: string
      localities: { city_name: string } | null
    }
    localityId = locality.locality_id
    cityName = locality.localities?.city_name ?? "sua cidade"
    const stored = history.state?.navigation as Context | undefined
    if (stored?.route.name === route.name && stored.route.id === route.id) {
      context = { ...INITIAL, ...stored }
      filter = context.filter
      restorePending = true
    } else if (route.name === "pergunta") {
      context = { ...INITIAL, route, parent: { name: "comunidade", id: null } }
      history.replaceState(
        { navigation: { ...context, route: { name: "comunidade", id: null } } },
        "",
        "#comunidade",
      )
      history.pushState({ navigation: context, parent: context.parent }, "", appHash(route))
    } else {
      context = { ...INITIAL, route }
      if (
        route.name === "inicio" ||
        route.name === "comunidade" ||
        route.name === "conversas" ||
        route.name === "voce"
      )
        context.origin = route.name
      history.replaceState({ navigation: context }, "", appHash(route))
    }
    filter = route.name === "minhas" ? "minhas" : context.filter
    view()
    if (route.name === "pergunta") void loadDetail(route.id ?? "")
    else if (["comunidade", "minhas", "inicio"].includes(route.name)) {
      void loadFirst()
      void loadSummary()
    } else {
      loading = false
      view()
    }
  }

  const onPopState = (event: PopStateEvent) => {
    if (askOpen) {
      askOpen = false
      similarGeneration++
      context = { ...context, focus: '[data-focus="ask"]' }
      restorePending = false
      view()
      focus('[data-focus="ask"]')
      return
    }
    route = parseAppHash(location.hash)
    const restored = event.state?.navigation as Context | undefined
    context =
      restored?.route.name === route.name && restored.route.id === route.id
        ? { ...INITIAL, ...restored }
        : { ...INITIAL, route }
    filter = context.filter
    if (["inicio", "comunidade", "minhas"].includes(route.name)) rows = []
    restorePending = true
    if (route.name === "pergunta") void loadDetail(route.id ?? "")
    else if (["comunidade", "minhas", "inicio"].includes(route.name)) void loadFirst()
    else {
      loading = false
      view()
    }
  }
  const onHashChange = () => {
    const next = parseAppHash(location.hash)
    if (next.name !== route.name || next.id !== route.id) {
      const parent = { ...route }
      route = next
      if (next.name === "comunidade") filter = "ajudar"
      if (next.name === "minhas") filter = "minhas"
      if (["inicio", "comunidade", "minhas"].includes(next.name)) rows = []
      context = {
        ...context,
        route,
        parent,
        origin:
          next.name === "inicio" ||
          next.name === "comunidade" ||
          next.name === "conversas" ||
          next.name === "voce"
            ? next.name
            : context.origin,
        filter,
        scroll: 0,
        focus: null,
      }
      history.replaceState({ ...history.state, parent, navigation: context }, "", location.href)
      if (route.name === "pergunta") void loadDetail(route.id ?? "")
      else if (["inicio", "comunidade", "minhas"].includes(route.name)) void loadFirst()
      else {
        loading = false
        view()
      }
    }
  }
  root.addEventListener("scroll", onScroll, true)
  root.addEventListener("focusin", onFocusIn, true)
  window.addEventListener("popstate", onPopState)
  window.addEventListener("hashchange", onHashChange)
  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("focus", onVisibility)
  void start()
  return () => {
    root.removeEventListener("scroll", onScroll, true)
    root.removeEventListener("focusin", onFocusIn, true)
    window.removeEventListener("popstate", onPopState)
    window.removeEventListener("hashchange", onHashChange)
    window.removeEventListener("keydown", onKeyDown)
    window.removeEventListener("focus", onVisibility)
    media.removeEventListener("change", setTheme)
    document.body.classList.remove("app-lit-body")
  }
}
