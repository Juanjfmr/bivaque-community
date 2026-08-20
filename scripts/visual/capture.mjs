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

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
]

const ROUTES = [
  { path: "/", name: "root", auth: false },
  { path: "/login", name: "login", auth: false },
  { path: "/consent", name: "consent", auth: false },
  { path: "/onboarding", name: "onboarding", auth: false },
  { path: "/onboarding", name: "onboarding", auth: true },
  { path: "/onboarding/status", name: "onboarding-status", auth: true },
  { path: "/onboarding/welcome", name: "onboarding-welcome", auth: true },
  { path: "/onboarding/locality", name: "onboarding-locality", auth: true },
  { path: "/reports", name: "admin-reports", auth: true },
  { path: "/admissions", name: "admin-admissions", auth: true },
  { path: "/guide-queue", name: "admin-guide-queue", auth: true },
  { path: "/groups", name: "groups", auth: true },
  { path: "/groups/70000000-0000-4000-8000-000000000001", name: "group-detail", auth: true },
  { path: "/profile", name: "profile", auth: true },
  { path: "/events", name: "events", auth: true },
  { path: "/events/80000000-0000-4000-8000-000000000001", name: "event-detail", auth: true },
  { path: "/community", name: "community", auth: true },
  { path: "/communities", name: "communities", auth: true },
  { path: "/guide", name: "arrival-guide", auth: true },
  // Onda T Task 4: the "cidade" container's actual landing page — NAV_ITEMS
  // pointed here since E10 (406d4f6), but the route did not exist until T4.
  { path: "/localidade", name: "localidade", auth: true },
  // Onda T Task 5: the founder console's arrivals volume. Renders empty for
  // the default seed account (no operator session captured), which is the
  // honest empty state, not a missing screen.
  { path: "/arrivals", name: "admin-arrivals", auth: true },
  { path: "/groups", name: "groups", auth: true },
  { path: "/events", name: "events", auth: true },
  { path: "/recommendations", name: "recommendations", auth: true },
  { path: "/messages", name: "messages", auth: true },
  { path: "/notifications", name: "notifications", auth: true },
  { path: "/profile", name: "profile", auth: true },
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

// --------------------------------------------------------------------------
// auth — optional; without credentials the gated routes are captured signed out
// --------------------------------------------------------------------------

async function fetchSession() {
  const url =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
    process.env["SUPABASE_URL"] ??
    dotEnv["NEXT_PUBLIC_SUPABASE_URL"] ??
    dotEnv["SUPABASE_URL"]
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? dotEnv["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  const email = process.env["BIVAQUE_VISUAL_EMAIL"] ?? dotEnv["BIVAQUE_VISUAL_EMAIL"]
  const password = process.env["BIVAQUE_VISUAL_PASSWORD"] ?? dotEnv["BIVAQUE_VISUAL_PASSWORD"]

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

// --------------------------------------------------------------------------
// audit — runs inside the page, returns plain JSON
// --------------------------------------------------------------------------

function auditPage() {
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
    const name = (
      element.getAttribute("aria-label") ??
      element.textContent ??
      element.getAttribute("title") ??
      ""
    ).trim()
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
    if (size < 12) add("font-too-small", "medium", describe(element), `${size}px (min 12px)`)

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

  // 6. design-token discipline — no raw colors in inline styles
  for (const element of document.querySelectorAll("[style]")) {
    const inline = element.getAttribute("style") ?? ""
    if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(inline)) {
      add("hardcoded-color", "medium", describe(element), inline.slice(0, 100))
    }
  }

  // 7. images need alt text
  for (const image of document.querySelectorAll("img")) {
    if (image.getAttribute("alt") === null) {
      add("missing-alt", "high", describe(image), image.getAttribute("src") ?? "")
    }
  }

  // 8. exactly one h1 per screen
  const h1Count = document.querySelectorAll("h1").length
  if (h1Count !== 1) add("heading-structure", "medium", "h1", `${h1Count} h1 elements (expected 1)`)

  // 9. active navigation — each visible nav has exactly one current item (rubrica item 4).
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

  // 10. forbidden copy — the same privacy vocabulary the database rejects
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
  mkdirSync(shotsDir, { recursive: true })

  const auth = await fetchSession()

  // Same dev-host escape hatch as playwright.config.ts: point at a system Chrome when
  // the managed browser bundle is not installed.
  const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  const results = []

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      baseURL: BASE_URL,
      locale: "pt-BR",
    })

    await context.addCookies([
      { name: "bivaque-consent-version", value: "1", path: "/", domain: "127.0.0.1" },
    ])

    if (auth) {
      // supabase-js stores the session in localStorage; @supabase/ssr (the new B2 middleware)
      // reads it from a cookie of the same name. Without the cookie the server-side middleware
      // has no session and redirects every gated route to /login.
      const sessionValue = JSON.stringify(auth.session)
      await context.addCookies([
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

    const page = await context.newPage()
    const consoleErrors = []
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200))
    })

    for (const route of ROUTES) {
      const label = `${route.name}--${viewport.name}`
      try {
        const response = await page.goto(route.path, { waitUntil: "networkidle", timeout: 30_000 })
        await page.waitForTimeout(400)

        // Two shots per route: the fold shot keeps first-impression detail legible for
        // visual review, the full-page shot carries scroll rhythm and the bottom states.
        const fold = join(shotsDir, `${label}--fold.png`)
        const full = join(shotsDir, `${label}--full.png`)
        await page.screenshot({ path: fold })
        await page.screenshot({ path: full, fullPage: true })
        const audit = await page.evaluate(auditPage)

        results.push({
          route: route.path,
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
          viewport: viewport.name,
          status: 0,
          error: String(error).slice(0, 300),
          findings: [],
        })
      }
    }

    await context.close()
  }

  await browser.close()
  writeResults(runDir, results, Boolean(auth))
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
    if (entry.landedOn && entry.landedOn !== entry.route) {
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
