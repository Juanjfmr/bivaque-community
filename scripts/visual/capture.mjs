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

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "@playwright/test"
import {
  assessCapture,
  DYNAMIC_HEADING,
  isCaptureReportPassing,
  summarizeCaptures,
} from "./capture-proof.mjs"

const BASE_URL = process.env["BIVAQUE_VISUAL_BASE_URL"] ?? "http://127.0.0.1:3000"
const OUT_ROOT = process.env["BIVAQUE_VISUAL_OUT"] ?? ".visual"
const RUN_ID = process.env["BIVAQUE_VISUAL_RUN"] ?? new Date().toISOString().replace(/[:.]/g, "-")
const ROUTE_PATH = process.env["BIVAQUE_VISUAL_ROUTE"]
const SCENARIO = process.env["BIVAQUE_VISUAL_SCENARIO"]

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
]

// Route identity is explicit, and EVERY route in ROUTES declares it. A route
// with no declaration stays invalid — that is the contract. But "no static
// title" is not the same as "no identity": a detail page, a profile or a city
// names itself from data. Those declare DYNAMIC_HEADING, which still requires a
// real, non-empty h1 and still refuses a login, a fallback or the wrong actor.
// Leaving them undeclared reddened the whole loop for reasons unrelated to any
// screen under work, which is how a fail-closed rule turns into a disabled tool.
// `tests/scope/visual-capture-proof.test.mjs` fails if the two lists drift.
export const HEADINGS = {
  "/": "Bivaque",
  "/login": "^Que bom ter você de volta\\.$",
  "/signup": "^Vamos começar\\.$",
  "/consent": "^Antes de entrar, conheça as regras\\.$",
  "/onboarding": "Confirme sua elegibilidade|Aceite seu convite|Preparando o próximo passo",
  // O status é leitura de banco (RPC read_verification_status), não query: com
  // uma conta pending autenticada a tela renderiza; com visual@ (verified) ela
  // redireciona — run dedicada com a conta certa, não caminho com query falsa.
  "/onboarding/status": "^Sua elegibilidade está em análise\\.$",
  "/onboarding/welcome": "^Você chegou ao Bivaque\\.$",
  "/onboarding/locality": "Escolha sua localidade|Preparando as localidades",
  "/admissions": "^Fila de admissões$",
  "/reports": "^Fila de denúncias$",
  "/arrivals": "^Chegadas declaradas$",
  "/guide-queue": "^Curadoria do guia$",
  "/inicio": "Bom dia|Boa tarde|Boa noite|Olá",
  "/explorar": "Explorar",
  "/explorar/servicos": "Serviços|Resultados",
  "/configuracoes": "^Configurações$",
  "/groups": "Grupos",
  "/communities": "Comunidades",
  "/community": "Comunidade|Manaus",
  "/guide": "Guia",
  "/events": "^Explorar eventos$",
  "/notifications": "^Notificações$",
  "/messages": "^Mensagens$",
  "/recommendations": "^Indicações$",
  "/prestador": "^Painel do prestador$",
  "/prestador/ficha": "^Minha ficha$",
  "/prestador/catalogo": "^Catálogo e portfólio$",
  // RECON-033 (pranchas 45/60/15): a rota /publicacoes. A conversa é nomeada
  // pelo próprio pedido do seed; a edição tem título fixo mesmo no estado
  // honesto "só o autor pode editar".
  "/publicacoes/nova": "^Nova pergunta$",
  "/publicacoes/80000000-0000-4000-8000-000000000f00": DYNAMIC_HEADING,
  "/publicacoes/80000000-0000-4000-8000-000000000f01/editar": "^Editar publicação$",
  // Named by their own data: the community, the guide entry, the group, the
  // event, the member and the city carry the title. The fixture id pins WHICH
  // record; the h1 text belongs to the seed, not to this file.
  "/communities/71000000-0000-4000-8000-000000000001": DYNAMIC_HEADING,
  "/guide/a0000000-0000-4000-8000-000000000001": DYNAMIC_HEADING,
  "/groups/70000000-0000-4000-8000-000000000001": DYNAMIC_HEADING,
  "/events/80000000-0000-4000-8000-000000000001": DYNAMIC_HEADING,
  "/communities/71000000-0000-4000-8000-000000000001/indicar-prestador": DYNAMIC_HEADING,
  "/prestadores/30000000-0000-4000-8000-000000000010": DYNAMIC_HEADING,
  "/profile": DYNAMIC_HEADING,
  "/localidade": DYNAMIC_HEADING,
}

export const ROUTES = [
  { path: "/", name: "root", auth: false },
  { path: "/login", name: "login", auth: false },
  { path: "/signup", name: "signup", auth: false },
  { path: "/consent", name: "consent", auth: false },
  { path: "/onboarding", name: "onboarding", auth: false },
  { path: "/onboarding", name: "onboarding", auth: true },
  // In this branch the status comes from the DB (RPC), not the query —see HEADINGS.
  { path: "/onboarding/status", name: "onboarding-status", auth: true },
  { path: "/onboarding/welcome", name: "onboarding-welcome", auth: true },
  { path: "/onboarding/locality", name: "onboarding-locality", auth: true },
  { path: "/reports", name: "admin-reports", auth: true },
  { path: "/admissions", name: "admin-admissions", auth: true },
  { path: "/guide-queue", name: "admin-guide-queue", auth: true },
  // Reconstrucao dos grupos A e D (RECON-009, 012, 013): tres telas entregues
  // que a captura nao enxergava. Sem elas, "auditoria visual das 10 telas"
  // auditava sete.
  {
    path: "/communities/71000000-0000-4000-8000-000000000001",
    name: "community-detail",
    auth: true,
  },
  { path: "/configuracoes", name: "configuracoes", auth: true },
  {
    path: "/guide/a0000000-0000-4000-8000-000000000001",
    name: "guide-entry",
    auth: true,
  },
  { path: "/groups", name: "groups", auth: true },
  { path: "/groups/70000000-0000-4000-8000-000000000001", name: "group-detail", auth: true },
  { path: "/profile", name: "profile", auth: true },
  { path: "/events", name: "events", auth: true },
  { path: "/events/80000000-0000-4000-8000-000000000001", name: "event-detail", auth: true },
  { path: "/community", name: "community", auth: true },
  { path: "/communities", name: "communities", auth: true },
  { path: "/guide", name: "arrival-guide", auth: true },
  // G0 (reconstrução visual 2026-09-06): containers novos da navegação.
  { path: "/inicio", name: "inicio", auth: true },
  { path: "/explorar", name: "explorar", auth: true },
  { path: "/explorar/servicos", name: "explorar-servicos", auth: true },
  // Onda T Task 4: the "cidade" container's actual landing page — NAV_ITEMS
  // pointed here since E10 (406d4f6), but the route did not exist until T4.
  { path: "/localidade", name: "localidade", auth: true },
  // Onda T Task 5: o console do fundador. Rota de operador — o ator correto é
  // resolvido por sessão dede operator abaixo, não pela conta default de membro.
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
  // RECON-033 (pranchas 45/60/15): as páginas da rota /publicacoes. A conversa
  // usa o pedido do seed authored por visual@; a edição usa um post do seed
  // authored por dono-vila@ — capturada com visual@ renderiza o estado honesto
  // "só o autor edita", e com dono-vila@ a tela real (run dedicada).
  { path: "/publicacoes/nova", name: "publicacao-nova", auth: true },
  {
    path: "/publicacoes/80000000-0000-4000-8000-000000000f00",
    name: "conversa-detalhe",
    auth: true,
  },
  {
    path: "/publicacoes/80000000-0000-4000-8000-000000000f01/editar",
    name: "publicacao-editar",
    auth: true,
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
// Public-only runs need no credentials. Protected runs fail before browsing if
// sign-in is unavailable; login screenshots cannot certify member/operator UI.
// --------------------------------------------------------------------------

export async function fetchSession({ email, password } = {}) {
  const url =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
    process.env["SUPABASE_URL"] ??
    dotEnv["NEXT_PUBLIC_SUPABASE_URL"] ??
    dotEnv["SUPABASE_URL"]
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? dotEnv["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  const resolvedEmail =
    email ?? process.env["BIVAQUE_VISUAL_EMAIL"] ?? dotEnv["BIVAQUE_VISUAL_EMAIL"]
  const resolvedPassword =
    password ?? process.env["BIVAQUE_VISUAL_PASSWORD"] ?? dotEnv["BIVAQUE_VISUAL_PASSWORD"]

  if (!url || !anonKey || !resolvedEmail || !resolvedPassword) {
    throw new Error("Protected capture requires Supabase URL/key and BIVAQUE_VISUAL_EMAIL/PASSWORD")
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: resolvedEmail, password: resolvedPassword }),
  })

  if (!response.ok) {
    throw new Error(`Visual sign-in failed (HTTP ${response.status})`)
  }

  // supabase-js derives its storage key from the first hostname label.
  const ref = new URL(url).hostname.split(".")[0]
  return { storageKey: `sb-${ref}-auth-token`, session: await response.json() }
}

// Rota de operador capturada com login de membro não é evidência: o layout
// (admin) expulsa para /community antes de qualquer fila. O ator certo é buscado
// adiante, com a conta do runbook — a senha é a mesma env que a suíte e2e lê.
export const OPERATOR_EMAIL =
  process.env["BIVAQUE_E2E_OPERATOR_EMAIL"] ?? "operador@bivaque.example.invalid"

export async function fetchOperatorSession() {
  const password =
    process.env["BIVAQUE_E2E_OPERATOR_PASSWORD"] ?? dotEnv["BIVAQUE_E2E_OPERATOR_PASSWORD"]
  if (!password) {
    throw new Error(
      "Operator capture requires BIVAQUE_E2E_OPERATOR_PASSWORD (env or apps/web/.env.local)",
    )
  }
  return fetchSession({ email: OPERATOR_EMAIL, password })
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
    const cls =
      typeof element.className === "string" && element.className.trim().length > 0
        ? `.${element.className.trim().split(/\s+/)[0]}`
        : ""
    // Sem contexto, um achado em `input.` nao diz QUAL controle consertar —
    // foi o que travou a correcao dos achados de /profile em 09/09. O tipo e o
    // data-slot do ancestral mais proximo identificam o componente sem depender
    // de classe, que o HeroUI nem sempre poe no elemento interativo.
    const type = element.getAttribute("type")
    const slot = element.closest("[data-slot]")?.getAttribute("data-slot") ?? ""
    const extra = `${type ? `[${type}]` : ""}${slot ? `@${slot}` : ""}`
    return `${element.tagName.toLowerCase()}${id}${cls}${extra}`.slice(0, 120)
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

  // Controle escondido do React Aria: `Checkbox`, `Switch` e `Radio` renderizam
  // um <input> real dentro de um wrapper recortado (clip-path: inset(50%),
  // 1px), e quem recebe o clique, o foco e o nome acessível é o label ao lado.
  //
  // Auditar esse input como alvo de toque produz um high por controle — 24 só
  // na tela de perfil, todos falsos: ninguém toca nele, e ele não deve ter nome
  // próprio, senão o leitor de tela anuncia o controle duas vezes.
  const dentroDeWrapperOculto = (element) => {
    let node = element.parentElement
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      const recortado = style.clipPath === "inset(50%)" || style.clip === "rect(0px, 0px, 0px, 0px)"
      const box = node.getBoundingClientRect()
      const minusculo = box.width <= 1 && box.height <= 1
      if (recortado || minusculo) return true
      node = node.parentElement
    }
    return false
  }
  for (const element of interactive) {
    if (dentroDeWrapperOculto(element)) continue
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
    // `aria-labelledby` é fonte de nome acessível tão válida quanto
    // `aria-label` e `label[for]` — e tem PRECEDÊNCIA sobre as duas na ordem
    // do accname. A regra não a resolvia, então todo controle rotulado por
    // referência aparecia como high sem nome: a tela de perfil sozinha
    // produzia 60 achados assim, todos falsos.
    //
    // O atributo aceita VÁRIOS ids separados por espaço, e o nome é a
    // concatenação dos textos na ordem em que aparecem.
    if (name.length === 0) {
      const refs = (element.getAttribute("aria-labelledby") ?? "").trim()
      if (refs.length > 0) {
        name = refs
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .filter((part) => part.length > 0)
          .join(" ")
          .trim()
      }
    }
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
    // aria-current vale em QUALQUER elemento, nao so em ancora: numa trilha de
    // navegacao o item atual e corretamente um nao-link (a pessoa ja esta nele),
    // e exigir <a> reprovava breadcrumb bem marcado.
    const current = nav.querySelectorAll(
      '[aria-current="page"], a[data-active="true"], a[role="tab"][aria-selected="true"]',
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
  if (SCENARIO && SCENARIO !== "publish") throw new Error(`Unknown visual scenario: ${SCENARIO}`)
  if (SCENARIO && ROUTE_PATH && ROUTE_PATH !== "/inicio") {
    throw new Error("The publish scenario starts at /inicio")
  }
  const requested = SCENARIO ? "/inicio" : ROUTE_PATH
  const selected = requested ? ROUTES.filter((route) => route.path === requested) : ROUTES
  const routes = [
    ...new Map(selected.map((route) => [`${route.path}:${route.auth}`, route])).values(),
  ].map((route) => ({
    ...route,
    name: `${route.name}${route.auth ? "--authenticated" : "--visitor"}${SCENARIO ? `--${SCENARIO}` : ""}`,
    expectedHeading: HEADINGS[route.path],
    operator: ["/admissions", "/reports", "/guide-queue", "/arrivals"].includes(route.path),
    dialog: SCENARIO === "publish" ? "Criar publicação" : undefined,
  }))
  mkdirSync(shotsDir, { recursive: true })

  if (routes.length === 0) {
    throw new Error(`No visual route configured for ${ROUTE_PATH}`)
  }

  // Dois atores, duas sessões: provar uma rota de operador exige o login de
  // operador (o layout (admin) expulsa membro para /community — e captura com
  // papel errado não é evidência). A de membro segue a conta default do env.
  let memberAuth = null
  let operatorAuth = null
  if (routes.some((route) => route.auth)) {
    try {
      memberAuth = await fetchSession()
      if (routes.some((route) => route.operator)) {
        operatorAuth = await fetchOperatorSession()
      }
    } catch (error) {
      writeResults(
        runDir,
        routes.flatMap((route) =>
          VIEWPORTS.map((viewport) => ({
            route: route.path,
            viewport: viewport.name,
            status: 0,
            error: error.message,
            findings: [],
            proof: { valid: false, failures: [error.message] },
          })),
        ),
        false,
      )
      return
    }
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

      const session = route.operator ? operatorAuth : memberAuth
      if (route.auth && session) {
        // supabase-js stores the session in localStorage; @supabase/ssr (the new B2 middleware)
        // reads it from a cookie of the same name. Without the cookie the server-side middleware
        // has no session and redirects every gated route to /login.
        const sessionValue = `base64-${Buffer.from(JSON.stringify(session.session)).toString("base64url")}`
        await context.addCookies([
          { name: "bivaque-consent-version", value: "2", url: BASE_URL },
          {
            name: session.storageKey,
            value: sessionValue,
            url: BASE_URL,
          },
        ])
        await context.addInitScript(
          ([key, current]) => window.localStorage.setItem(key, JSON.stringify(current)),
          [session.storageKey, session.session],
        )
      }

      const page = await context.newPage()
      const consoleErrors = []
      let pageErrors = 0
      page.on("pageerror", () => {
        pageErrors += 1
      })
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200))
      })

      const label = `${route.name}--${viewport.name}`
      try {
        const response = await page.goto(route.path, { waitUntil: "networkidle", timeout: 30_000 })
        await page.waitForTimeout(400)
        if (route.expectedHeading) {
          // A data-named route waits for any h1: matching the sentinel would
          // just burn the timeout on every viewport and prove nothing.
          const wanted =
            route.expectedHeading === DYNAMIC_HEADING
              ? page.getByRole("heading", { level: 1 })
              : page.getByRole("heading", {
                  level: 1,
                  name: new RegExp(route.expectedHeading, "i"),
                })
          await wanted
            .first()
            .waitFor({ state: "visible", timeout: 10_000 })
            .catch(() => {})
        }
        if (SCENARIO === "publish") {
          await page
            .getByRole("button", { name: "No que você está pensando?", exact: true })
            .click()
          await page
            .getByRole("dialog", { name: route.dialog, exact: true })
            .waitFor({ state: "visible" })
        }

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
        const observed = {
          heading: audit.heading,
          // Este shell marca a superfície do operador pelo par de navs cujo
          // aria-label começa com "Operação": a lateral (≥md) e a barra mobile
          // (<md). "Painel do operador" é o rótulo da branch irmã; aqui cada
          // largura tem exatamente um dos dois visível, e a prova aceita ambos.
          operator: await page.evaluate(() =>
            [...document.querySelectorAll('nav[aria-label^="Operação"]')].some(
              (nav) => nav.offsetWidth > 0 || nav.offsetHeight > 0,
            ),
          ),
          dialog:
            route.dialog &&
            (await page.getByRole("dialog", { name: route.dialog, exact: true }).isVisible())
              ? route.dialog
              : null,
          fallback: await page
            .getByText(
              /Página não encontrada|Application error|Você ainda não tem acesso|Não foi possível carregar/,
            )
            .first()
            .isVisible(),
          pageErrors,
        }
        const landedOn = new URL(page.url()).pathname + new URL(page.url()).search
        const proof = assessCapture({
          route,
          authenticated: Boolean(session),
          status: response?.status() ?? 0,
          landedOn,
          observed,
        })

        results.push({
          route: route.path,
          viewport: viewport.name,
          status: response?.status() ?? 0,
          landedOn,
          actor: route.operator ? "operator" : route.auth ? "member" : "visitor",
          state: SCENARIO ?? "route",
          proof,
          screenshot: fold,
          screenshotFull: full,
          consoleErrors: consoleErrors.splice(0),
          ...audit,
        })
      } catch (error) {
        results.push({
          route: route.path,
          viewport: viewport.name,
          status: 0,
          error: String(error).slice(0, 300),
          findings: [],
          proof: { valid: false, failures: ["Capture did not reach its expected state"] },
        })
      } finally {
        await context.close()
      }
    }
  }

  await browser.close()
  writeResults(runDir, results, Boolean(memberAuth || operatorAuth))
}

function writeResults(runDir, results, authenticated) {
  const summary = summarizeCaptures(results)
  const { total, high, invalid } = summary
  // This identifies the runner checkout. A reviewer must also establish that
  // the server was built/started from this tree; a SHA alone cannot prove that.
  const runnerRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
  const runnerDirty =
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0
  const report = {
    runDir,
    authenticated,
    ...summary,
    runnerRevision,
    runnerDirty,
    baseURL: BASE_URL,
    fidelity: "not-assessed",
    results,
  }

  writeFileSync(join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`)

  const lines = [
    `# Visual audit — ${runDir}`,
    "",
    `Authenticated capture: **${authenticated ? "yes" : "no"}**`,
    `Capture identity: **${summary.valid ? "VALID" : "INVALID"}** (${invalid} invalid captures).`,
    `Runner revision: ${runnerRevision}; dirty: ${runnerDirty}; server: ${BASE_URL}.`,
    "Reference fidelity: **not assessed** — requires image comparison and independent review.",
    `Findings: **${total}** total, **${high}** high severity.`,
    "",
  ]

  for (const entry of results) {
    const findings = entry.findings ?? []
    lines.push(`## ${entry.route} @ ${entry.viewport} — HTTP ${entry.status}`)
    if (entry.error) lines.push(`- ERROR: ${entry.error}`)
    for (const failure of entry.proof?.failures ?? []) lines.push(`- INVALID: ${failure}`)
    if (entry.landedOn && entry.landedOn !== entry.route) {
      lines.push(`- redirected to \`${entry.landedOn}\``)
    }
    if (entry.screenshot) {
      lines.push(`- fold: \`${entry.screenshot}\` · full: \`${entry.screenshotFull}\``)
    }
    for (const error of entry.consoleErrors ?? []) lines.push(`- console error: ${error}`)
    if (findings.length === 0) {
      lines.push(
        entry.proof?.valid
          ? "- no mechanical findings (fidelity not assessed)"
          : "- invalid capture; zero findings is not a pass",
      )
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
  if (!isCaptureReportPassing(report)) process.exitCode = 1
}

if (process.argv[1]?.endsWith("capture.mjs")) await main()
