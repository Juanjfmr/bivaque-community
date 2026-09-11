// Visual capture + deterministic UI audit for the Bivaque build loop.
//
// Produces, per run:
//   .visual/<run>/shots/<route>--<viewport>.png   screenshots for visual review
//   .visual/<run>/report.json                     machine-readable findings
//   .visual/<run>/report.md                       findings a text-only model can act on
//
// The JSON/markdown audit exists so the loop still self-corrects when the driving
// model cannot read images. Screenshots stay authoritative for taste; the audit is
// authoritative for the mechanical rules (touch targets, overflow, contrast, motion).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "@playwright/test"

const BASE_URL = process.env["BIVAQUE_VISUAL_BASE_URL"] ?? "http://127.0.0.1:3000"
const OUT_ROOT = process.env["BIVAQUE_VISUAL_OUT"] ?? ".visual"
const RUN_ID = process.env["BIVAQUE_VISUAL_RUN"] ?? new Date().toISOString().replace(/[:.]/g, "-")
const ROUTE_PATH = process.env["BIVAQUE_VISUAL_ROUTE"]

// Fixture de captura de Moradia. Precisa existir em `supabase/seed.sql` (com
// `property_details` e ao menos uma foto) para a ficha de `/imoveis/[id]`
// renderizar dado real. Enquanto não existir, a captura do detalhe mostra o
// não-encontrado — e o relatório precisa dizer isso.
const IMOVEIS_FIXTURE_ID = "d0000000-0000-4000-8000-000000000001"

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
]

const ROUTES = [
  { path: "/", name: "root", auth: false },
  { path: "/login", name: "login", auth: false },
  { path: "/signup", name: "signup", auth: false },
  { path: "/recuperar-senha", name: "recuperar-senha", auth: false },
  { path: "/nova-senha", name: "nova-senha", auth: false },
  // RECON-018 (prancha 37): os três painéis do cartão de confirmação. A rota é
  // alcançável por sessão de membro no proxy; o painel pendente e o expirado
  // dependem do estado local (sessionStorage) que `pendingEmail` planta, com
  // um endereço de exemplo — fixture de tela, não dado real.
  { path: "/auth/confirmar-email", name: "auth-confirmar-email", auth: true },
  {
    path: "/auth/confirmar-email",
    name: "auth-confirmar-email-pendente",
    auth: true,
    pendingEmail: "ana@exemplo.invalid",
  },
  {
    path: "/auth/confirmar-email?estado=expirado",
    name: "auth-confirmar-email-expirado",
    auth: true,
    pendingEmail: "ana@exemplo.invalid",
  },
  { path: "/consent", name: "consent", auth: false },
  { path: "/onboarding", name: "onboarding", auth: false },
  { path: "/onboarding", name: "onboarding", auth: true },
  { path: "/onboarding/status", name: "onboarding-status", auth: true },
  { path: "/onboarding/welcome", name: "onboarding-welcome", auth: true },
  { path: "/onboarding/locality", name: "onboarding-locality", auth: true },
  { path: "/onboarding/perfil", name: "onboarding-perfil", auth: true },
  { path: "/reports", name: "admin-reports", auth: true },
  { path: "/admissions", name: "admin-admissions", auth: true },
  { path: "/guide-queue", name: "admin-guide-queue", auth: true },
  { path: "/groups", name: "groups", auth: true },
  { path: "/groups/70000000-0000-4000-8000-000000000001", name: "group-detail", auth: true },
  { path: "/profile", name: "profile", auth: true },
  { path: "/events", name: "events", auth: true },
  { path: "/events/80000000-0000-4000-8000-000000000001", name: "event-detail", auth: true },
  // RECON-025: o Mercado. A rota de detalhe depende de um anúncio no seed,
  // que este lote não pode criar (supabase/seed.sql fora dos allowed_paths);
  // capture-a quando a fixture existir.
  { path: "/mercado", name: "mercado", auth: true },
  { path: "/mercado/novo", name: "mercado-novo", auth: true },
  // RECON-026: a gestão dos próprios anúncios. `/meus-anuncios` é rota fixa. A
  // edição depende de um anúncio no seed; `supabase/seed.sql` está fora dos
  // allowed_paths deste lote, então o caminho fica cadastrado com um id
  // determinístico e a captura cai no estado honesto "indisponível" até existir
  // a fixture — nunca em 404 silencioso nem em tela de login.
  { path: "/meus-anuncios", name: "meus-anuncios", auth: true },
  {
    path: "/mercado/a0000000-0000-4000-8000-000000000001/editar",
    name: "mercado-editar",
    auth: true,
  },
  { path: "/community", name: "community", auth: true },
  { path: "/communities", name: "communities", auth: true },
  { path: "/guide", name: "arrival-guide", auth: true },
  // RECON-021: prova que o Ver-todos do grupo Guia chega com o filtro `q`
  // preenchido (hunk de uma linha no /guide).
  { path: "/guide?q=escola", name: "arrival-guide-termo", auth: true },
  // G0 (reconstrução visual 2026-09-06): containers novos da navegação.
  { path: "/inicio", name: "inicio", auth: true },
  { path: "/explorar", name: "explorar", auth: true },
  { path: "/explorar/servicos", name: "explorar-servicos", auth: true },
  // RECON-021: painel direito da prancha 61 com o fixture real do seed —
  // capturar com BIVAQUE_VISUAL_EMAIL=membro-25@ (unico ator que ve o
  // prestador pela RLS).
  { path: "/explorar/servicos?q=climatiza", name: "explorar-servicos-termo", auth: true },
  // RECON-021: fixture concreta do seed de Manaus — "escola" casa com a
  // entrada aprovada "Escola Modelo do Centro" e NÃO pode casar com a
  // pendente "Escola de Acolhimento Militar" (status pending, RLS).
  { path: "/explorar/busca?q=escola", name: "explorar-busca", auth: true },
  // Onda T Task 4: the "cidade" container's actual landing page — NAV_ITEMS
  // pointed here since E10 (406d4f6), but the route did not exist until T4.
  { path: "/localidade", name: "localidade", auth: true },
  // RECON-027: Moradia. `/imoveis` e `/imoveis/novo` não dependem de fixture.
  // O detalhe aponta para a fixture de anúncio que `supabase/seed.sql` precisa
  // criar (fora do allowed_paths deste lote) — sem ela a captura cai no 404
  // honesto, que NÃO conta como fidelidade comprovada.
  { path: "/imoveis", name: "imoveis", auth: true },
  { path: "/imoveis/novo", name: "imoveis-novo", auth: true },
  { path: `/imoveis/${IMOVEIS_FIXTURE_ID}`, name: "imoveis-detail", auth: true },
  // Onda T Task 5: o console do fundador. Renders empty state honesto para a
  // conta default do seed (sem operador capturado), que é a tela vazia com
  // identificação, não uma tela ausente.
  { path: "/arrivals", name: "admin-arrivals", auth: true },
  // Onda G: a vitrine do prestador. Com a conta default (membro sem vila) a
  // ficha pública renderiza o 404 honesto e o painel o estado sem-permissão —
  // telas do CRUD real usam runs dedicadas com prestador-seed@ (ver VISUAL_AUDIT G).
  { path: "/prestador", name: "provider-panel", auth: true },
  { path: "/prestador/ficha", name: "provider-ficha", auth: true },
  { path: "/prestador/catalogo", name: "provider-catalogo", auth: true },
  {
    path: "/prestadores/30000000-0000-4000-8000-000000000010",
    name: "provider-public-ficha",
    auth: true,
  },
  // RECON-022: o formulário de pedido com destinatário fixo na URL. A fixture
  // concreta é a ficha semeada da vitrine G (Climatiza Manaus).
  {
    path: "/pedidos/novo?prestador=30000000-0000-4000-8000-000000000010",
    name: "pedido-novo",
    auth: true,
  },
  {
    path: "/communities/71000000-0000-4000-8000-000000000001/indicar-prestador",
    name: "provider-indicar",
    auth: true,
  },
  { path: "/groups", name: "groups", auth: true },
  { path: "/events", name: "events", auth: true },
  { path: "/recommendations", name: "recommendations", auth: true },
  { path: "/messages", name: "messages", auth: true },
  { path: "/notifications", name: "notifications", auth: true },
  { path: "/profile", name: "profile", auth: true },
  // RECON-032 (pranchas 54 e 56). Fixtures concretas, não templates:
  // - /denuncias/nova: alvo é um post do seed que o visual@ vê pela RLS e
  //   ainda não denunciou (medido em 10/09/2026 com o token dele via REST);
  //   mantém o formulário aberto na captura. A spec e2e deste lote denuncia o
  //   mesmo post e resolve a denúncia que cria, então ele segue apto aqui.
  // - /denuncias/<own-report>: o id da denúncia do próprio ator é resolvido na
  //   hora por REST (fixture "own-report"). O seed gera ids aleatórios, então
  //   id fixo aqui virava fixture morta a cada reset do banco compartilhado.
  // - /messages/<thread>: a conversa precisa de dois participantes; o
  //   visual@ não compartilha contexto com ninguém do seed. A rota usa a
  //   conta própria (account: "thread") e resolve o id do arquivo de fixture
  //   escrito por tests/e2e/recon-032-messages.spec.ts (open_conversation é
  //   idempotente pelo par, então o mesmo id vale entre execuções).
  { path: "/salvos", name: "salvos", auth: true },
  { path: "/ajuda", name: "ajuda", auth: true },
  { path: "/denuncias", name: "denuncias", auth: true },
  {
    path: "/denuncias/nova?tipo=post&id=80000000-0000-4000-8000-000000000f01",
    name: "denuncia-nova",
    auth: true,
  },
  {
    path: "/denuncias/<own-report>",
    name: "denuncia-detalhe",
    auth: true,
    fixture: "own-report",
  },
  {
    path: "/messages/<thread>",
    name: "message-thread",
    auth: true,
    account: "thread",
    fixture: "message-thread",
  },
]

// --------------------------------------------------------------------------
// .env.local fallback — when process env is empty, parse the local dotenv file
// --------------------------------------------------------------------------

function parseEnvFile(path) {
  try {
    const content = readFileSync(path, "utf-8")
    const result = {}
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

const APP_DOTENV = join(import.meta.dirname, "..", "..", "apps", "web", ".env.local")
const dotEnv = parseEnvFile(APP_DOTENV)
const TOKEN_SOURCE = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "..", "..", "packages", "tokens", "src", "tokens.json"),
    "utf8",
  ),
)

// --------------------------------------------------------------------------
// auth — optional; without credentials the gated routes are captured signed out
// --------------------------------------------------------------------------

// Uma rota pode exigir outra pessoa: a prancha 56 mostra a tela de uma conta
// com dados, e nem todo ator do seed compartilha todo contexto. `account` na
// rota lê BIVAQUE_VISUAL_EMAIL__<CONTA>/BIVAQUE_VISUAL_PASSWORD__<CONTA> e cai
// na conta global quando não definida.
async function fetchSession(account) {
  const url =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
    process.env["SUPABASE_URL"] ??
    dotEnv["NEXT_PUBLIC_SUPABASE_URL"] ??
    dotEnv["SUPABASE_URL"]
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? dotEnv["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  const suffix = account ? `__${account.toUpperCase()}` : ""
  const email =
    process.env[`BIVAQUE_VISUAL_EMAIL${suffix}`] ??
    dotEnv[`BIVAQUE_VISUAL_EMAIL${suffix}`] ??
    process.env["BIVAQUE_VISUAL_EMAIL"] ??
    dotEnv["BIVAQUE_VISUAL_EMAIL"]
  const password =
    process.env[`BIVAQUE_VISUAL_PASSWORD${suffix}`] ??
    dotEnv[`BIVAQUE_VISUAL_PASSWORD${suffix}`] ??
    process.env["BIVAQUE_VISUAL_PASSWORD"] ??
    dotEnv["BIVAQUE_VISUAL_PASSWORD"]

  if (!url || !anonKey || !email || !password) return null

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    console.warn(`[visual] sign-in failed (${response.status}); capturing signed out`)
    return null
  }

  // supabase-js derives its storage key from the first hostname label.
  const ref = new URL(url).hostname.split(".")[0]
  return { storageKey: `sb-${ref}-auth-token`, session: await response.json() }
}

// Fixtures concretas de rotas dinâmicas. Duas fontes, ambas reais:
// - arquivo (`.visual/fixtures/<nome>.json`), escrito pelo spec e2e que cria a
//   linha (conversa, cujo id só nasce de open_conversation);
// - consulta REST com o token do próprio ator (denúncia própria: o seed gera
//   ids aleatórios, então id fixo morre a cada reset).
// Sem fixture a captura falha alto — fotografar 404 disfarçado não é evidência.
async function resolveRoutePath(route, auth) {
  if (!route.fixture) return route.path

  if (route.fixture === "own-report") {
    if (!auth?.session?.access_token) {
      throw new Error(`rota ${route.name}: fixture "own-report" exige sessão autenticada`)
    }
    const url =
      process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
      process.env["SUPABASE_URL"] ??
      dotEnv["NEXT_PUBLIC_SUPABASE_URL"] ??
      dotEnv["SUPABASE_URL"]
    const anonKey =
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? dotEnv["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    const query = new URLSearchParams({ select: "id", order: "created_at.desc", limit: "1" })
    const response = await fetch(`${url}/rest/v1/reports?${query.toString()}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${auth.session.access_token}` },
    })
    const rows = response.ok ? await response.json() : []
    const id = Array.isArray(rows) ? rows[0]?.id : null
    if (typeof id !== "string") {
      throw new Error(`rota ${route.name}: o ator não tem denúncia própria para a fixture`)
    }
    return `/denuncias/${id}`
  }

  const file = join(OUT_ROOT, "fixtures", `${route.fixture}.json`)
  try {
    const { path } = JSON.parse(readFileSync(file, "utf8"))
    if (typeof path !== "string" || path.length === 0) {
      throw new Error(`fixture ${route.fixture}: campo "path" ausente`)
    }
    return path
  } catch (error) {
    throw new Error(
      `rota ${route.name} exige a fixture "${route.fixture}" (${file}): ${error.message}. ` +
        "Rode o spec e2e que a cria antes da captura.",
    )
  }
}

// --------------------------------------------------------------------------
// audit — runs inside the page, returns plain JSON
// --------------------------------------------------------------------------

function auditPage({ nonTextPairs, minimumTextSize, readingMeasureMax }) {
  const findings = []
  const add = (rule, severity, selector, detail) =>
    findings.push({ rule, severity, selector, detail })

  const describe = (element) => {
    const id = element.id ? `#${element.id}` : ""
    const cls = typeof element.className === "string" ? `.${element.className.split(/\s+/)[0]}` : ""
    return `${element.tagName.toLowerCase()}${id}${cls}`.slice(0, 80)
  }

  const parseColor = (value) => {
    const match = /rgba?\(([^)]+)\)/.exec(value)
    if (!match) return null
    const parts = match[1].split(",").map((part) => Number.parseFloat(part))
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
  }

  const luminance = (color) => {
    const channel = (raw) => {
      const c = raw / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
  }

  const contrast = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (high + 0.05) / (low + 0.05)
  }

  const tokenColor = (name) => {
    const probe = document.createElement("span")
    probe.style.color = `var(${name})`
    document.body.append(probe)
    const color = parseColor(getComputedStyle(probe).color)
    probe.remove()
    return color
  }

  const backgroundOf = (element) => {
    let node = element
    while (node) {
      const color = parseColor(getComputedStyle(node).backgroundColor)
      if (color && color.a > 0.9) return color
      node = node.parentElement
    }
    return { r: 255, g: 255, b: 255, a: 1 }
  }

  // 1. horizontal overflow — the page body must never scroll sideways
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
    add(
      "layout-overflow",
      "high",
      "html",
      `scrollWidth ${document.documentElement.scrollWidth} > clientWidth ${document.documentElement.clientWidth}`,
    )
  }

  const interactive = [...document.querySelectorAll("a, button, [role='button'], input, select")]

  // Fonts must be served by the application itself. This catches a stylesheet or
  // component that silently reintroduces a hosted font after the local loader runs.
  for (const entry of performance.getEntriesByType("resource")) {
    const url = new URL(entry.name)
    if (/\.(?:woff2?|ttf|otf)(?:$|\?)/i.test(url.pathname) && url.origin !== location.origin) {
      add(
        "external-font-request",
        "high",
        url.hostname,
        "font asset requested outside the app origin",
      )
    }
  }

  for (const element of interactive) {
    const box = element.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) continue

    // 2. touch targets — 44x44 CSS px minimum
    if (box.width < 44 || box.height < 44) {
      add(
        "touch-target",
        "high",
        describe(element),
        `${Math.round(box.width)}x${Math.round(box.height)} (min 44x44)`,
      )
    }

    const style = getComputedStyle(element)

    // 3. motion presence — interactive elements need a state transition
    const hasTransition = style.transitionDuration
      .split(",")
      .some((duration) => Number.parseFloat(duration) > 0)
    const hasAnimation = Number.parseFloat(style.animationDuration) > 0
    if (!hasTransition && !hasAnimation) {
      add("no-transition", "medium", describe(element), "no transition/animation on interactive")
    }

    // 4. accessible name
    // Resolve `<label for=id>` associations: a label-for is a valid source of
    // an accessible name (ARIA), and the repo labels inputs through it (the
    // HeroUI lesson — its Input does not forward aria-label). Without this
    // resolution every properly-labeled input is a false positive every wave.
    let name = (element.getAttribute("aria-label") ?? "").trim()
    if (name.length === 0 && element.id) {
      const labeled = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
      name = (labeled?.textContent ?? "").trim()
    }
    if (name.length === 0) {
      name = (element.textContent ?? "").trim()
    }
    if (name.length === 0) {
      name = (element.getAttribute("title") ?? "").trim()
    }
    if (name.length === 0) {
      add("missing-accessible-name", "high", describe(element), "no label, text, or title")
    }
  }

  // 5. text contrast + minimum size
  const textNodes = [...document.querySelectorAll("p, span, h1, h2, h3, h4, li, label, a, button")]
  for (const element of textNodes) {
    if (!element.textContent || element.textContent.trim().length === 0) continue
    const box = element.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue

    const style = getComputedStyle(element)
    const size = Number.parseFloat(style.fontSize)
    if (size < minimumTextSize)
      add("font-too-small", "medium", describe(element), `${size}px (min ${minimumTextSize}px)`)

    const foreground = parseColor(style.color)
    if (!foreground) continue
    const ratio = contrast(foreground, backgroundOf(element))
    const large = size >= 24 || (size >= 18.66 && Number.parseInt(style.fontWeight, 10) >= 700)
    const required = large ? 3 : 4.5
    if (ratio < required) {
      add(
        "contrast",
        "high",
        describe(element),
        `${ratio.toFixed(2)}:1 (needs ${required}:1) — ${style.color} on background`,
      )
    }
  }

  // Reading surfaces opt into the measure audit with a class or data attribute.
  // The estimate uses the current font size and the CSS `ch` convention, so it
  // remains useful across the three capture widths without hardcoded layout sizes.
  for (const element of document.querySelectorAll(".measure-reading, [data-reading-measure]")) {
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const size = Number.parseFloat(style.fontSize)
    if (box.width === 0 || size === 0) continue
    const charactersPerLine = box.width / (size * 0.5)
    if (charactersPerLine > readingMeasureMax) {
      add(
        "reading-measure",
        "medium",
        describe(element),
        `${Math.round(charactersPerLine)} characters per line (max ${readingMeasureMax})`,
      )
    }
  }

  // 6. non-text contrast — focus rings and control boundaries are measured
  // from the generated token values, not inferred from text color.
  const cssVariable = (reference) => {
    const [layer, name] = reference.split(".")
    return `--${layer}-${name}`
  }
  for (const {
    name,
    foreground: foregroundReference,
    background: backgroundReference,
  } of nonTextPairs) {
    const foregroundToken = cssVariable(foregroundReference)
    const backgroundToken = cssVariable(backgroundReference)
    const foreground = tokenColor(foregroundToken)
    const background = tokenColor(backgroundToken)
    if (!foreground || !background) {
      add(
        "non-text-contrast-unmeasurable",
        "high",
        name,
        "focus or control-boundary token is not a color",
      )
      continue
    }
    const ratio = contrast(foreground, background)
    if (ratio < 3) {
      const rule = name.startsWith("focus-")
        ? "non-text-contrast-focus"
        : "non-text-contrast-control-boundary"
      add(
        rule,
        "high",
        name,
        `${ratio.toFixed(2)}:1 (needs 3:1) — ${foregroundToken} on ${backgroundToken}`,
      )
    }
  }

  // 7. design-token discipline — no raw colors in inline styles
  for (const element of document.querySelectorAll("[style]")) {
    const inline = element.getAttribute("style") ?? ""
    if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(inline)) {
      add("hardcoded-color", "medium", describe(element), inline.slice(0, 100))
    }
  }

  // 8. images need alt text
  for (const image of document.querySelectorAll("img")) {
    if (image.getAttribute("alt") === null) {
      add("missing-alt", "high", describe(image), image.getAttribute("src") ?? "")
    }
  }

  // 9. exactly one h1 per screen
  const h1Count = document.querySelectorAll("h1").length
  if (h1Count !== 1) add("heading-structure", "medium", "h1", `${h1Count} h1 elements (expected 1)`)

  // 10. active navigation — each visible nav has exactly one current item (rubrica item 4).
  // Anchors use aria-current="page"; tab role anchors use aria-selected="true" (ARIA Tabs pattern).
  for (const nav of document.querySelectorAll("nav")) {
    if (nav.offsetWidth === 0 && nav.offsetHeight === 0) continue
    const anchors = nav.querySelectorAll("a")
    if (anchors.length === 0) continue
    const current = nav.querySelectorAll(
      'a[aria-current="page"], a[data-active="true"], a[role="tab"][aria-selected="true"]',
    )
    if (current.length !== 1) {
      add(
        "nav-active",
        "medium",
        "nav",
        `${current.length} active nav items (expected 1) in nav: ${nav.getAttribute("aria-label") || "unlabeled"}`,
      )
    }
  }

  // 11. forbidden copy — the same privacy vocabulary the database rejects
  // 10. forbidden copy — the same privacy vocabulary the database rejects
  // (see supabase/migrations/20260802001300_fix_forbidden_content_regex.sql).
  // The DB guards post bodies; the UI copy must guard itself.
  //
  // The match targets *exposure* — the vocabulary used to label or attribute
  // a value to the user (e.g. "sua patente", "Patente:"). Pedagogical
  // negation copy in `/consent` ("Nenhum dado pessoal sensível (CPF, patente,
  // endereço) será armazenado") is intentionally allowed: telling the user
  // what is NOT stored is the contract itself. Same for the runbook docs.
  const exposure =
    /((?:sua|seu|do usu[áa]rio|do membro|minha|seus|suas)\s+)?\b(patente|posto militar|gradua[çc][ãa]o militar|organiza[çc][ãa]o militar|endere[çc]o residencial|selo de verifica[çc][ãa]o|verificado publicamente)\b\s*[:-]/i
  const bodyText = document.body.innerText || ""
  const hit = exposure.exec(bodyText)
  if (hit) {
    add("forbidden-copy", "high", "body", `forbidden term exposed in UI copy: "${hit[0]}"`)
  }
  return {
    findings,
    title: document.title,
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    url: location.pathname,
  }
}

// --------------------------------------------------------------------------

// driver
// --------------------------------------------------------------------------

async function main() {
  const runDir = join(OUT_ROOT, RUN_ID)
  const shotsDir = join(runDir, "shots")
  // BIVAQUE_VISUAL_ROUTE casa o caminho exato ou o nome da rota — o nome é a
  // única forma de pedir uma rota cujo caminho só existe em runtime (fixture).
  const routes = ROUTE_PATH
    ? ROUTES.filter((route) => route.path === ROUTE_PATH || route.name === ROUTE_PATH)
    : ROUTES
  mkdirSync(shotsDir, { recursive: true })

  if (routes.length === 0) {
    throw new Error(`No visual route configured for ${ROUTE_PATH}`)
  }

  const sessions = new Map()
  async function sessionFor(route) {
    const key = route.account ?? ""
    if (!sessions.has(key)) {
      sessions.set(key, await fetchSession(route.account))
    }
    return sessions.get(key)
  }
  // Same dev-host escape hatch as playwright.config.ts: point at a system Chrome when
  // the managed browser bundle is not installed.
  const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  const results = []

  for (const viewport of VIEWPORTS) {
    for (const route of routes) {
      // Public routes must be inspected as visitors see them. Reusing a signed-in
      // context makes `/` redirect to the member funnel and turns a landing audit
      // into a consent-screen audit.
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        baseURL: BASE_URL,
        locale: "pt-BR",
      })

      const auth = await sessionFor(route)
      if (route.auth && auth) {
        // supabase-js stores the session in localStorage; @supabase/ssr (the new B2 middleware)
        // reads it from a cookie of the same name. Without the cookie the server-side middleware
        // has no session and redirects every gated route to /login.
        const sessionValue = JSON.stringify(auth.session)
        await context.addCookies([
          { name: "bivaque-consent-version", value: "1", path: "/", domain: "127.0.0.1" },
          {
            name: auth.storageKey,
            value: sessionValue,
            path: "/",
            domain: "127.0.0.1",
          },
        ])
        await context.addInitScript(
          ([key, session]) => window.localStorage.setItem(key, JSON.stringify(session)),
          [auth.storageKey, auth.session],
        )
      }

      // RECON-018: espelha a flag local que o cadastro escreve antes de mandar
      // para /auth/confirmar-email (chave em
      // apps/web/app/components/auth/resend-clock.ts — manter em sincronia).
      // Sem ela a rota captura o painel "nada pendente", que também é estado
      // válido, mas não é o painel da prancha.
      if (route.pendingEmail) {
        await context.addInitScript(
          ([payload]) =>
            window.sessionStorage.setItem("bivaque:confirmacao-pendente", JSON.stringify(payload)),
          [{ email: route.pendingEmail, lastResendAt: null }],
        )
      }

      const page = await context.newPage()
      const consoleErrors = []
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200))
      })

      const label = `${route.name}--${viewport.name}`
      let targetPath = route.path
      try {
        targetPath = await resolveRoutePath(route, auth)
        const response = await page.goto(targetPath, { waitUntil: "networkidle", timeout: 30_000 })
        await page.waitForTimeout(400)

        // Two shots per route: the fold shot keeps first-impression detail legible for
        // visual review, the full-page shot carries scroll rhythm and the bottom states.
        const fold = join(shotsDir, `${label}--fold.png`)
        const full = join(shotsDir, `${label}--full.png`)
        await page.screenshot({ path: fold })
        await page.screenshot({ path: full, fullPage: true })
        const audit = await page.evaluate(auditPage, {
          nonTextPairs: TOKEN_SOURCE.contrast.nonTextPairs,
          minimumTextSize: TOKEN_SOURCE.contrast.minimumTextSize,
          readingMeasureMax: Number(TOKEN_SOURCE.primitive["type-reading-max-characters"]),
        })

        results.push({
          route: route.path,
          target: targetPath,
          viewport: viewport.name,
          status: response?.status() ?? 0,
          landedOn: page.url().replace(BASE_URL, ""),
          screenshot: fold,
          screenshotFull: full,
          consoleErrors: consoleErrors.splice(0),
          ...audit,
        })
      } catch (error) {
        results.push({
          route: route.path,
          target: targetPath,
          viewport: viewport.name,
          status: 0,
          error: String(error).slice(0, 300),
          findings: [],
        })
      } finally {
        await context.close()
      }
    }
  }

  await browser.close()
  writeResults(runDir, results, [...sessions.values()].some(Boolean))
}

function writeResults(runDir, results, authenticated) {
  const total = results.reduce((sum, entry) => sum + (entry.findings?.length ?? 0), 0)
  const high = results.reduce(
    (sum, entry) => sum + (entry.findings ?? []).filter((f) => f.severity === "high").length,
    0,
  )

  writeFileSync(
    join(runDir, "report.json"),
    `${JSON.stringify({ runDir, authenticated, total, high, results }, null, 2)}\n`,
  )

  const lines = [
    `# Visual audit — ${runDir}`,
    "",
    `Authenticated capture: **${authenticated ? "yes" : "no (gated routes show the signed-out state)"}**`,
    `Findings: **${total}** total, **${high}** high severity.`,
    "",
  ]

  for (const entry of results) {
    const findings = entry.findings ?? []
    lines.push(`## ${entry.route} @ ${entry.viewport} — HTTP ${entry.status}`)
    if (entry.error) lines.push(`- ERROR: ${entry.error}`)
    const expected = entry.target ?? entry.route
    if (entry.landedOn && entry.landedOn !== expected) {
      lines.push(`- redirected to \`${entry.landedOn}\``)
    }
    if (entry.screenshot) {
      lines.push(`- fold: \`${entry.screenshot}\` · full: \`${entry.screenshotFull}\``)
    }
    for (const error of entry.consoleErrors ?? []) lines.push(`- console error: ${error}`)
    if (findings.length === 0) {
      lines.push("- clean")
    } else {
      const grouped = new Map()
      for (const finding of findings) {
        const bucket = grouped.get(finding.rule) ?? []
        bucket.push(finding)
        grouped.set(finding.rule, bucket)
      }
      for (const [rule, bucket] of grouped) {
        lines.push(`- **${rule}** (${bucket[0].severity}) × ${bucket.length}`)
        for (const finding of bucket.slice(0, 5)) {
          lines.push(`  - \`${finding.selector}\` — ${finding.detail}`)
        }
      }
    }
    lines.push("")
  }

  writeFileSync(join(runDir, "report.md"), `${lines.join("\n")}\n`)
  console.log(`[visual] ${total} findings (${high} high) → ${join(runDir, "report.md")}`)
}

await main()
