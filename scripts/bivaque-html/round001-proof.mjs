import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext, stabilize } from "./capture-support.mjs"

const root = resolve(import.meta.dirname, "../..")
const output = resolve(
  root,
  process.env.BIVAQUE_HTML_PROOF_OUT ?? ".visual/bivaque-html-round00-1/functional",
)
const candidatePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const candidate = readFileSync(candidatePath)
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex")
const storageKey = "bivaque-material-web-v3"
mkdirSync(join(output, "shots"), { recursive: true })
const report = {
  candidateHash: sha(candidate),
  scriptHash: sha(readFileSync(import.meta.filename)),
  cases: [],
  captures: [],
  browserErrors: [],
  externalRequests: [],
}
const server = createServer((request, response) => {
  if (new URL(request.url, "http://localhost").pathname !== "/candidate.html") {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
  response.end(candidate)
})
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const baseUrl = `http://127.0.0.1:${server.address().port}/candidate.html`
let browser

async function click(page, action, value) {
  await page
    .locator(`[data-action="${action}"]${value ? `[data-value="${value}"]` : ""}:visible`)
    .first()
    .click()
}

async function route(page, name, id) {
  await page.waitForFunction(
    ({ name, id }) => {
      const route = window.Bivaque?.inspect().route
      return route?.name === name && (id === undefined || route.id === id)
    },
    { name, id },
    { timeout: 5000 },
  )
}

async function stored(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey)
}

async function focused(page) {
  return page.evaluate(() => {
    let active = document.activeElement
    const chain = []
    while (active) {
      chain.push({
        tag: active.tagName,
        id: active.id,
        action: active.dataset?.action,
        value: active.dataset?.value,
      })
      if (!active.shadowRoot?.activeElement) break
      active = active.shadowRoot.activeElement
    }
    return { tag: active?.tagName, id: active?.id, chain }
  })
}

async function screenshot(page, scene, width, theme) {
  await stabilize(page)
  const path = join(output, "shots", `${scene}-${width}-${theme}.png`)
  const bytes = await page.screenshot({ path, animations: "disabled" })
  report.captures.push({ scene, width, theme, path, sha256: sha(bytes) })
}

async function verify(width, theme) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.clock.setFixedTime("2026-10-13T16:00:00Z")
  page.setDefaultTimeout(5000)
  page.on("pageerror", (error) =>
    report.browserErrors.push({ width, theme, message: error.message }),
  )
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(baseUrl)) {
      report.externalRequests.push({ width, theme, url: request.url() })
    }
  })
  const checkpoints = []
  const record = async (name, fn) => {
    await fn()
    checkpoints.push(name)
  }
  const input = () => page.locator("#chat-input textarea")
  const bubbles = () => page.locator("#message-list .bubble")
  const feedback = async (expression) => {
    await page.waitForFunction(
      (pattern) => {
        const text = [
          document.querySelector("#snackbar.show"),
          document.querySelector("#chat-status"),
        ]
          .filter(Boolean)
          .map((element) => element.textContent)
          .join(" ")
        return new RegExp(pattern, "i").test(text)
      },
      expression,
      { timeout: 5000 },
    )
  }
  let fixture
  let selectedId
  const reset = async (change, hash = `conversa/${selectedId}`) => {
    const data = structuredClone(fixture)
    change?.(data)
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), {
      key: storageKey,
      data,
    })
    await page.goto("about:blank")
    await page.goto(`${baseUrl}#${hash}`)
    await stabilize(page)
  }
  try {
    await page.goto(`${baseUrl}#conversas`)
    await stabilize(page)
    const first = page.locator('button.txt[data-action="open-thread"]').first()
    selectedId = await first.getAttribute("data-value")
    assert(selectedId)
    await record("keyboard-opens-selected-thread", async () => {
      await first.focus()
      await page.keyboard.press("Enter")
      await route(page, "conversa", selectedId)
      await stabilize(page)
      assert(await input().isVisible())
      assert(
        (await focused(page)).chain.some((element) => element.id === "chat-input"),
        "A conversa deve focar seu compositor",
      )
    })
    await screenshot(page, "opened", width, theme)
    const before = await bubbles().count()
    await record("whitespace-feedback-no-message", async () => {
      await input().fill("   ")
      await click(page, "send-message", selectedId)
      await feedback("escreva|mensagem.*vazia|digite")
      assert.equal(await bubbles().count(), before)
    })
    await screenshot(page, "invalid", width, theme)
    await record("send-immediate-escaped-demo-feedback", async () => {
      const text = `Mensagem ficticia ${width} ${theme} <img src=x onerror=alert(1)>`
      await input().fill(text)
      await click(page, "send-message", selectedId)
      assert.equal(await bubbles().count(), before + 1)
      assert((await bubbles().last().innerText()).includes(text))
      assert.equal(await bubbles().last().locator("img").count(), 0)
      assert.equal(await input().inputValue(), "")
      await feedback("salv|simulad|enviad|demonstr")
      const data = await stored(page)
      assert.equal(data.threads.find((thread) => thread.id === selectedId).msgs.at(-1).t, text)
    })
    await screenshot(page, "sent", width, theme)
    await record("history-persists-after-reload", async () => {
      const text = (await stored(page)).threads
        .find((thread) => thread.id === selectedId)
        .msgs.at(-1).t
      await page.reload()
      await stabilize(page)
      assert.equal(await bubbles().count(), before + 1)
      assert((await bubbles().last().innerText()).includes(text))
    })
    await record("shift-enter-newline-ime-does-not-send-enter-sends", async () => {
      const count = await bubbles().count()
      await input().fill("Primeira linha")
      await input().press("Shift+Enter")
      await input().pressSequentially("Segunda linha")
      assert((await input().inputValue()).includes("\n"))
      assert.equal(await bubbles().count(), count)
      await input().evaluate((element) =>
        element.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            isComposing: true,
            bubbles: true,
            composed: true,
            cancelable: true,
          }),
        ),
      )
      assert.equal(await bubbles().count(), count)
      await input().press("Enter")
      await page.waitForFunction(
        (count) => document.querySelectorAll("#message-list .bubble").length === count + 1,
        count,
      )
      assert.equal(await input().inputValue(), "")
    })
    await record("over-limit-feedback-no-message", async () => {
      const count = await bubbles().count()
      await page.locator("#chat-input").evaluate((element) => {
        element.value = "x".repeat(2001)
      })
      await click(page, "send-message", selectedId)
      await feedback("2000|2.000|limite|caracter")
      assert.equal(await bubbles().count(), count)
    })
    await record("storage-failure-keeps-text-and-history-retry-succeeds", async () => {
      const count = await bubbles().count()
      const text = "Retentativa de gravacao ficticia"
      await input().fill(text)
      await page.evaluate(() => {
        window.__bivaqueTestFailSave = true
        const originalSave = Storage.prototype.setItem
        Storage.prototype.setItem = function (...args) {
          if (window.__bivaqueTestFailSave)
            throw new DOMException("Falha de teste", "QuotaExceededError")
          return originalSave.apply(this, args)
        }
      })
      await click(page, "send-message", selectedId)
      await feedback("poss.vel.*salvar|grav|armazen|espaco|espaço")
      assert.equal(await bubbles().count(), count)
      assert.equal(await input().inputValue(), text)
      await page.evaluate(() => {
        window.__bivaqueTestFailSave = false
      })
      await screenshot(page, "storage-error", width, theme)
      await click(page, "send-message", selectedId)
      assert.equal(await bubbles().count(), count + 1)
      assert.equal(await input().inputValue(), "")
    })
    fixture = await stored(page)
    await record("local-menu-pin-delete-confirm-and-undo", async () => {
      const pinned = !!fixture.threads.find((thread) => thread.id === selectedId).pinned
      await click(page, "thread-menu", selectedId)
      await click(page, "pin-thread", selectedId)
      assert.equal(
        (await stored(page)).threads.find((thread) => thread.id === selectedId).pinned,
        !pinned,
      )
      await click(page, "thread-menu", selectedId)
      await click(page, "swipe-delete-thread", selectedId)
      await click(page, "accept-confirm")
      await route(page, "conversas")
      assert.equal(
        (await stored(page)).threads.find((thread) => thread.id === selectedId).deleted,
        true,
      )
      await click(page, "undo")
      assert.equal(
        (await stored(page)).threads.find((thread) => thread.id === selectedId).deleted,
        false,
      )
      await click(page, "open-thread", selectedId)
      await route(page, "conversa", selectedId)
    })
    await record("reload-back-to-inbox-and-selected-row-focus", async () => {
      await page.reload()
      await stabilize(page)
      await click(page, "back")
      await route(page, "conversas")
      await stabilize(page)
      assert(
        (await focused(page)).chain.some(
          (element) => element.action === "open-thread" && element.value === selectedId,
        ),
        "O retorno deve focar a entrada da conversa selecionada",
      )
      await click(page, "open-thread", selectedId)
      await route(page, "conversa", selectedId)
    })
    await record("thread-origin-and-back", async () => {
      const thread = fixture.threads.find((item) => item.id === selectedId)
      await click(page, "thread-origin", selectedId)
      await route(page, thread.about.type === "item" ? "anuncio" : "negocio", thread.about.id)
      await click(page, "back")
      await route(page, "conversa", selectedId)
    })
    await record("missing-origin-feedback-no-wrong-navigation", async () => {
      await reset((data) => {
        data.threads.find((thread) => thread.id === selectedId).about.id = "absent-demo-origin"
      })
      await click(page, "thread-origin", selectedId)
      await feedback("origem|dispon.vel|encerrad|encontr")
      await route(page, "conversa", selectedId)
    })
    await record("deleted-and-missing-thread-not-rendered", async () => {
      await reset((data) => {
        data.threads.find((thread) => thread.id === selectedId).deleted = true
      })
      assert.equal(await page.locator("#chat-input").count(), 0)
      await reset(undefined, "conversa/absent-demo-thread")
      assert.equal(await page.locator("#chat-input").count(), 0)
    })
    await record("other-city-thread-not-rendered", async () => {
      await reset((data) => {
        data.threads.find((thread) => thread.id === selectedId).city = "Belém"
      })
      assert.equal(await page.locator("#chat-input").count(), 0)
    })
    await record("unverified-demo-cannot-send", async () => {
      await reset((data) => {
        data.profile.verified = false
      })
      const count = fixture.threads.find((thread) => thread.id === selectedId).msgs.length
      if (await input().isVisible()) {
        if (await input().isEnabled()) await input().fill("Tentativa sem verificacao demo")
        const button = page.locator('[data-action="send-message"]').first()
        if (await button.isEnabled()) await button.click()
      }
      assert.equal(
        (await stored(page)).threads.find((thread) => thread.id === selectedId).msgs.length,
        count,
      )
      assert(
        (await page.locator("#dialog[open]").count()) ||
          /verifica|leitura|consult/i.test(await page.locator("body").innerText()),
      )
    })
    await record("read-only-demo-cannot-send", async () => {
      await reset((data) => {
        data.city = "Belém"
        data.threads.find((thread) => thread.id === selectedId).city = "Belém"
      })
      const count = fixture.threads.find((thread) => thread.id === selectedId).msgs.length
      if (await input().isVisible()) {
        if (await input().isEnabled()) await input().fill("Tentativa em cidade de consulta")
        const button = page.locator('[data-action="send-message"]').first()
        if (await button.isEnabled()) await button.click()
      }
      assert.equal(
        (await stored(page)).threads.find((thread) => thread.id === selectedId).msgs.length,
        count,
      )
      assert(/consult|cidade|leitura/i.test(await page.locator("body").innerText()))
    })
    await record("empty-inbox-honest-state", async () => {
      await reset((data) => {
        data.threads = []
      }, "conversas")
      assert((await page.locator("#main").innerText()).includes("Nenhuma conversa ainda"))
      assert.equal(await page.locator('[data-action="open-thread"]').count(), 0)
    })
    await reset()
    await screenshot(page, "persisted", width, theme)
    report.cases.push({ width, theme, checkpoints, status: "PASS" })
  } catch (error) {
    report.cases.push({ width, theme, checkpoints, status: "FAIL", error: error.stack })
    await page
      .screenshot({ path: join(output, "shots", `failure-${width}-${theme}.png`) })
      .catch(() => {})
  } finally {
    await context.close()
  }
}

try {
  browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  )
  for (const width of [375, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      await verify(width, theme)
      console.log(`Conversas ${width} ${theme}: ${report.cases.at(-1).status}`)
    }
  }
  report.status =
    report.cases.length === 6 &&
    report.cases.every((item) => item.status === "PASS") &&
    !report.browserErrors.length &&
    !report.externalRequests.length
      ? "PASS"
      : "FAIL"
} catch (error) {
  report.status = "BLOCKED"
  report.failure = error.stack
} finally {
  await browser?.close()
  await new Promise((done) => server.close(done))
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`${report.status}: ${output}`)
  process.exitCode = report.status === "PASS" ? 0 : 1
}
