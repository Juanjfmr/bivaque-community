import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext, stabilize } from "./capture-support.mjs"

// Independent oracle: public UI interactions and browser-visible/local demo state.
// Fixtures only create deterministic empty, unavailable and failure conditions.
const root = resolve(import.meta.dirname, "../..")
const output = resolve(
  root,
  process.env.BIVAQUE_HTML_PROOF_OUT ?? ".visual/bivaque-html-round01/independent-functional",
)
const candidate = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex")
const key = "bivaque-material-web-v3"
const selectedCheckpoint = process.env.BIVAQUE_HTML_PROOF_CHECKPOINT
const selectedContext = process.env.BIVAQUE_HTML_PROOF_CONTEXT
if (selectedContext) assert(/^(375|768|1440)-(light|dark)$/.test(selectedContext))
const targeted = !!(selectedCheckpoint || selectedContext)
mkdirSync(join(output, "shots"), { recursive: true })
const report = {
  mode: targeted ? "targeted" : "full",
  selectedCheckpoint,
  selectedContext,
  candidateHash: sha(candidate),
  scriptHash: sha(readFileSync(import.meta.filename)),
  cases: [],
  actionCheckpoints: {},
  captures: [],
  browserErrors: [],
  externalRequests: [],
}
const server = createServer((req, res) => {
  if (new URL(req.url, "http://localhost").pathname === "/favicon.ico")
    return res.writeHead(204).end()
  if (new URL(req.url, "http://localhost").pathname !== "/candidate.html")
    return res.writeHead(404).end()
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(candidate)
})
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const origin = `http://127.0.0.1:${server.address().port}`
const url = `${origin}/candidate.html`
let browser

async function state(page) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)
}
async function route(page, name, id) {
  await page.waitForFunction(
    ({ name, id }) =>
      window.Bivaque?.inspect().route.name === name &&
      (id === undefined || window.Bivaque.inspect().route.id === id),
    { name, id },
    { timeout: 5000 },
  )
}
async function focus(page) {
  return page.evaluate(() => {
    const chain = []
    let active = document.activeElement
    while (active) {
      chain.push({
        tag: active.tagName,
        id: active.id,
        action: active.dataset?.action,
        value: active.dataset?.value,
      })
      active = active.shadowRoot?.activeElement
    }
    return chain
  })
}
async function expectFocus(page, action, value) {
  await page.waitForFunction(
    ({ action, value }) => {
      let active = document.activeElement
      while (active) {
        if (
          active.dataset?.action === action &&
          (value === undefined || (active.dataset.value ?? "") === value)
        )
          return true
        active = active.shadowRoot?.activeElement
      }
      return false
    },
    { action, value },
    { timeout: 5000 },
  )
}
async function feedback(page, expression) {
  await page.waitForFunction(
    (pattern) =>
      new RegExp(pattern, "i").test(
        Array.from(
          document.querySelectorAll(
            "#snackbar.show,[role=status],#dialog[open] [slot=content],.empty",
          ),
        )
          .map((el) => el.textContent)
          .join(" "),
      ),
    expression,
    { timeout: 5000 },
  )
}
async function storageFailure(page, failed = true) {
  await page.evaluate((failed) => {
    if (!window.__proofNativeSet) {
      window.__proofNativeSet = Storage.prototype.setItem
      Storage.prototype.setItem = function (...args) {
        if (window.__proofStorageFailure)
          throw new DOMException("Synthetic quota failure", "QuotaExceededError")
        return window.__proofNativeSet.apply(this, args)
      }
    }
    window.__proofStorageFailure = failed
  }, failed)
}
async function clipboard(page, mode, shareMode = "absent") {
  await page.evaluate(
    ({ mode, shareMode }) => {
      window.__proofClipboard = []
      window.__proofShares = []
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            if (mode === "denied") throw new DOMException("Synthetic denied", "NotAllowedError")
            window.__proofClipboard.push(text)
          },
        },
      })
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value:
          shareMode === "absent"
            ? undefined
            : async (data) => {
                window.__proofShares.push(data)
                if (shareMode === "abort") throw new DOMException("Synthetic cancel", "AbortError")
                if (shareMode === "denied")
                  throw new DOMException("Synthetic denied", "NotAllowedError")
              },
      })
      if (mode === "denied") document.execCommand = () => false
    },
    { mode, shareMode },
  )
}

async function verify(width, theme) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  page.setDefaultTimeout(5000)
  page.on("pageerror", (error) =>
    report.browserErrors.push({ width, theme, message: error.message }),
  )
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(origin))
      report.externalRequests.push({ width, theme, url: request.url() })
  })
  const checkpoints = [],
    failures = [],
    actionCheckpoints = {}
  let fixture,
    otherCity,
    observed = new Set()
  const action = async (name, value, { keyboard = false, scope = page } = {}) => {
    const control = scope
      .locator(
        `[data-action="${name}"]${value === undefined ? "" : `[data-value="${value}"]`}:visible`,
      )
      .first()
    if (keyboard) {
      await control.focus()
      await page.keyboard.press("Enter")
    } else await control.click()
    observed.add(name)
  }
  const reset = async (change, hash = "inicio") => {
    await page.goto("about:blank")
    await page.goto(`${url}#inicio`)
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    const data = structuredClone(fixture)
    change?.(data)
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), {
      key,
      data,
    })
    await page.goto("about:blank")
    await page.goto(`${url}#${hash}`)
    await stabilize(page)
  }
  const shot = async (scene) => {
    await stabilize(page)
    const path = join(output, "shots", `${scene}-${width}-${theme}.png`)
    const bytes = await page.screenshot({ path, animations: "disabled" })
    report.captures.push({
      scene,
      width,
      theme,
      path,
      sha256: sha(bytes),
      route: await page.evaluate(() => window.Bivaque.inspect().route),
    })
  }
  const test = async (name, fn) => {
    if (selectedCheckpoint && selectedCheckpoint !== name) return
    observed = new Set()
    try {
      await fn()
      checkpoints.push(name)
      for (const action of observed) {
        actionCheckpoints[action] ??= []
        actionCheckpoints[action].push(name)
        report.actionCheckpoints[action] ??= []
        if (!report.actionCheckpoints[action].includes(name))
          report.actionCheckpoints[action].push(name)
      }
    } catch (error) {
      failures.push({ checkpoint: name, message: error.message, stack: error.stack })
      await page
        .screenshot({ path: join(output, "shots", `FAIL-${name}-${width}-${theme}.png`) })
        .catch(() => {})
    }
  }
  try {
    await page.goto(`${url}#voce`)
    await stabilize(page)
    await action("settings")
    await action("save-settings")
    fixture = await state(page)
    assert(fixture?.schema === 2, "Demo fixture must come from an actual UI save")
    await page.locator("#dialog").waitFor({ state: "hidden" })
    await action("city")
    const availableCities = await page
      .locator("#city-select md-select-option")
      .evaluateAll((options) => options.map((option) => option.value))
    assert(availableCities.includes(fixture.homeCity))
    otherCity = availableCities.includes("Natal")
      ? "Natal"
      : availableCities.find((city) => city !== fixture.homeCity)
    assert(otherCity, "Positive alternate-city fixture must be a real selectable demo city")
    await action("close-dialog")
    await test("guide-entry-search-back-reload-context", async () => {
      await reset()
      await action("guide", undefined, { keyboard: true })
      await route(page, "guia")
      await stabilize(page)
      assert((await focus(page)).some((item) => item.tag === "H1"))
      await shot("guide")
      const search = page.locator('[data-action="guide-search"]:visible').first()
      const query = await search.getAttribute("data-value")
      await action("guide-search", query, { keyboard: true })
      await route(page, "busca")
      assert.equal(await page.locator("#search-query input").inputValue(), query)
      await page.reload()
      await stabilize(page)
      assert.equal(await page.locator("#search-query input").inputValue(), query)
      await action("back")
      await route(page, "guia")
      await expectFocus(page, "guide-search", query)
      await action("back")
      await route(page, "inicio")
      await expectFocus(page, "guide")
    })
    await test("agenda-selected-event-reading-reload-back-focus", async () => {
      await reset()
      await action("agenda")
      await route(page, "agenda")
      const id = await page.locator('[data-action="open-event"]').first().getAttribute("data-value")
      assert(id)
      await action("open-event", id, { keyboard: true })
      await route(page, "evento", id)
      assert(
        (await page.locator("#main").innerText()).includes(
          fixture.events.find((e) => e.id === id).title,
        ),
      )
      await shot("event-read")
      await page.reload()
      await stabilize(page)
      await action("back")
      await route(page, "agenda")
      await expectFocus(page, "open-event", id)
    })
    await test("agenda-empty-and-event-missing-specific-recovery", async () => {
      await reset((data) => {
        data.events = []
      }, "agenda")
      assert((await page.locator("#main .empty").innerText()).includes("Nenhum encontro"))
      assert.equal(await page.locator('[data-action="open-event"]').count(), 0)
      await reset((data) => {
        data.events = []
      }, "evento/absent-demo-event")
      await feedback(page, "indispon.vel|n.o.*encontr")
      await action("home")
      await route(page, "inicio")
    })
    await test("resume-exact-reference-and-back", async () => {
      const item = fixture.items[0]
      await reset((data) => {
        data.lastViewed = { type: "item", id: item.id, city: data.city }
      })
      await action("resume", `item|${item.id}`, { keyboard: true })
      await route(page, "anuncio", item.id)
      await page.reload()
      await stabilize(page)
      await action("back")
      await route(page, "inicio")
      await expectFocus(page, "resume", `item|${item.id}`)
    })
    await test("resume-missing-and-other-city-not-executable", async () => {
      await reset((data) => {
        data.lastViewed = { type: "item", id: "absent-demo-item", city: data.city }
      })
      assert.equal(await page.locator('[data-action="resume"]').count(), 0)
      await reset((data) => {
        data.lastViewed = { type: "item", id: data.items[0].id, city: "Belém" }
      })
      assert.equal(await page.locator('[data-action="resume"]').count(), 0)
    })
    await test("create-menu-tab-cycle-arrows-escape-restore-inert", async () => {
      await reset()
      await action("create", undefined, { keyboard: true })
      await page.locator("#create-menu").waitFor({ state: "visible" })
      const items = await page
        .locator("#create-menu [data-action]")
        .evaluateAll((items) => items.map((e) => e.dataset.action))
      // Rodada 11 acrescentou "Contratar serviço" (create-request) aos 6 itens originais.
      assert.equal(items.length, 7)
      assert.ok(items.includes("create-request"))
      await expectFocus(page, items[0])
      for (let index = 1; index <= items.length; index++) {
        await page.keyboard.press("Tab")
        await expectFocus(page, items[index % items.length])
      }
      await page.keyboard.press("Shift+Tab")
      await expectFocus(page, items.at(-1))
      await page.keyboard.press("Home")
      await expectFocus(page, items[0])
      await page.keyboard.press("ArrowUp")
      await expectFocus(page, items.at(-1))
      await page.keyboard.press("ArrowDown")
      await expectFocus(page, items[0])
      await page.keyboard.press("End")
      await expectFocus(page, items.at(-1))
      await page.keyboard.press("Escape")
      await page.locator("#create-menu").waitFor({ state: "hidden" })
      await expectFocus(page, "create")
      assert(
        await page.evaluate(
          () =>
            !document.querySelector("#main").inert &&
            !document.querySelector("#nav").inert &&
            !document.querySelector("#topbar").inert,
        ),
      )
    })
    await test("create-history-back-and-event-editor", async () => {
      await reset()
      await action("create")
      await page.goBack()
      await page.locator("#create-menu").waitFor({ state: "hidden" })
      await expectFocus(page, "create")
      await action("create")
      await action("create-event", undefined, {
        keyboard: true,
        scope: page.locator("#create-menu"),
      })
      assert(await page.locator("#dialog").evaluate((e) => e.open))
      await page.locator("#event-title").waitFor({ state: "visible" })
      await action("close-dialog")
      await expectFocus(page, "create")
    })
    await test("community-tabs-and-search-filters-selection-focus", async () => {
      await reset(undefined, "comunidade")
      await action("community-tab", "grp", { keyboard: true })
      await expectFocus(page, "community-tab", "grp")
      assert(
        await page
          .locator('[data-action="community-tab"][data-value="grp"]')
          .evaluate((e) => e.active),
      )
      await action("community-tab", "biz")
      await expectFocus(page, "community-tab", "biz")
      await action("search")
      await page.locator("#search-query input").fill("zzzz-no-demo-match")
      await action("search-type", "items")
      await expectFocus(page, "search-type", "items")
      assert(
        await page
          .locator('[data-action="search-type"][data-value="items"]')
          .evaluate((e) => e.selected),
      )
      await feedback(page, "Nada sobre|nenhum|n.o.*encontr")
    })
    await test("existing-global-filters-and-tab-arrows-enter-panel", async () => {
      await reset((data) => {
        data.asks.forEach((item) => {
          item.mine = false
        })
      }, "comunidade")
      await action("question-filter", "mine", { keyboard: true })
      await expectFocus(page, "question-filter", "mine")
      assert(
        await page
          .locator('[data-action="question-filter"][data-value="mine"]')
          .evaluate((element) => element.selected),
      )
      assert.match(await page.locator("#main .empty").innerText(), /nenhuma pergunta/i)
      await action("question-filter", "ok")
      const question = await page
        .locator('[data-action="open-question"]')
        .first()
        .getAttribute("data-value")
      assert.equal(fixture.asks.find((item) => item.id === question).status, "ok")
      await action("open-question", question)
      await route(page, "pergunta", question)
      await action("back")
      await route(page, "comunidade")
      await expectFocus(page, "open-question", question)
      assert(
        await page
          .locator('[data-action="question-filter"][data-value="ok"]')
          .evaluate((element) => element.selected),
      )
      await page.locator('[data-action="community-tab"][data-value="ind"]').focus()
      for (const [key, destination, selector] of [
        ["ArrowRight", "grp", "#group-search"],
        ["ArrowLeft", "ind", '[data-action="question-filter"]'],
        ["End", "biz", '[data-action="businesses"]'],
        ["Home", "ind", '[data-action="question-filter"]'],
      ]) {
        await page.keyboard.press(key)
        await expectFocus(page, "community-tab", destination)
        await page.keyboard.press("Enter")
        observed.add("community-tab")
        await expectFocus(page, "community-tab", destination)
        assert(
          await page
            .locator(`[data-action="community-tab"][data-value="${destination}"]`)
            .evaluate((element) => element.active),
        )
        await page.locator(selector).first().waitFor({ state: "visible" })
      }
      // Rodadas 22 e 23: Imóveis é tela própria; a faixa de valor fica no painel da pílula.
      await reset(undefined, "imoveis")
      const types = ["Apartamento", "Casa", "Casa em condomínio", "Flat ou studio", "Kitnet"]
      const tags = await page.locator("#catalog-results .cover .pill").allInnerTexts()
      assert(tags.length > 0)
      assert(
        tags.every((tag) => types.includes(tag)),
        `tela de imóveis com outro tipo: ${tags}`,
      )
      await action("catalog-pill", "price", { keyboard: true })
      await page.locator("#filter-panel[open]").waitFor()
      // Leva o mínimo ao extremo pelo teclado e aplica: nenhum imóvel cabe na faixa.
      await page.locator("#fp-price input").first().focus()
      await page.keyboard.press("End")
      await page.waitForTimeout(250)
      await page.locator('#filter-panel [data-f="apply"]').click()
      await expectFocus(page, "catalog-pill", "price")
      await feedback(page, "Nenhum im.vel com esses filtros")
      await action("clear-filters")
      assert(
        /^Total por mês/.test(
          await page.locator('[data-action="catalog-pill"][data-value="price"]').innerText(),
        ),
      )
      const item = await page
        .locator('[data-action="open-item"]')
        .first()
        .getAttribute("data-value")
      await action("open-item", item)
      await route(page, "anuncio", item)
      await page.reload()
      await stabilize(page)
      await action("back")
      await route(page, "imoveis")
      await expectFocus(page, "open-item", item)
      await reset(undefined, "negocios")
      const category = fixture.biz[0].cat
      await action("biz-filter", category, { keyboard: true })
      await expectFocus(page, "biz-filter", category)
      const bizIds = await page
        .locator('[data-action="open-biz"]')
        .evaluateAll((items) => items.map((item) => item.dataset.value))
      assert(bizIds.length > 0)
      assert(bizIds.every((id) => fixture.biz.find((item) => item.id === id).cat === category))
      await page.locator("#biz-search input").fill("zzzz-sem-negocio-demo")
      await feedback(page, "Nenhum neg.cio encontrado")
      assert(
        await page
          .locator(`[data-action="biz-filter"][data-value="${category}"]`)
          .evaluate((element) => element.selected),
      )
    })
    await test("saved-entry-filter-empty-selection-and-detail-return", async () => {
      const item = fixture.items[0]
      await reset((data) => {
        data.items.forEach((x) => {
          x.saved = x.id === item.id
        })
        data.biz.forEach((x) => {
          x.saved = false
        })
        data.myBiz = null
      }, "voce")
      await action("saved")
      await route(page, "salvos")
      await action("saved-filter", "biz", { keyboard: true })
      await expectFocus(page, "saved-filter", "biz")
      assert(
        await page
          .locator('[data-action="saved-filter"][data-value="biz"]')
          .evaluate((e) => e.selected),
      )
      assert.match(await page.locator("#main .empty").innerText(), /neg.cio|salv/i)
      await shot("saved-filter-empty")
      await action("saved-filter", "items")
      await action("open-item", item.id)
      await route(page, "anuncio", item.id)
      await page.reload()
      await stabilize(page)
      await action("back")
      await route(page, "salvos")
      await expectFocus(page, "open-item", item.id)
      assert(
        await page
          .locator('[data-action="saved-filter"][data-value="items"]')
          .evaluate((e) => e.selected),
      )
    })
    await test("saved-all-empty-and-cross-city-context-return", async () => {
      await reset((data) => {
        data.items.forEach((x) => {
          x.saved = false
        })
        data.biz.forEach((x) => {
          x.saved = false
        })
        data.myBiz = null
      }, "salvos")
      assert.match(await page.locator("#main .empty").innerText(), /salv/i)
      const item = fixture.items[0]
      await reset((data) => {
        data.items.forEach((x) => {
          x.saved = x.id === item.id
        })
        data.items[0].city = otherCity
        data.biz.forEach((x) => {
          x.saved = false
        })
      }, "voce")
      await action("saved")
      await action("open-item", item.id)
      await route(page, "anuncio", item.id)
      assert.equal(await page.evaluate(() => window.Bivaque.inspect().city), otherCity)
      assert((await page.locator("#topbar").innerText()).includes(otherCity))
      await action("back")
      await route(page, "salvos")
      assert.equal(await page.evaluate(() => window.Bivaque.inspect().city), fixture.city)
    })
    await test("my-ads-filters-empty-draft-open-cancel", async () => {
      await reset((data) => {
        data.items.forEach((x) => {
          x.mine = false
        })
        data.drafts = []
      }, "voce")
      await action("my-ads")
      await route(page, "meus-anuncios")
      for (const value of ["active", "sold", "drafts"]) {
        await action("my-ads-filter", value)
        await expectFocus(page, "my-ads-filter", value)
        assert(
          await page
            .locator(`[data-action="my-ads-filter"][data-value="${value}"]`)
            .evaluate((e) => e.selected),
        )
        assert((await page.locator("#main .empty").count()) > 0)
      }
      await reset((data) => {
        data.drafts = [
          {
            id: "proof-draft",
            title: "Rascunho fictício",
            desc: "Descrição fictícia suficiente",
            kind: "desapego",
            numPrice: 50,
            hood: "Planalto",
            photos: [],
            at: 1,
          },
        ]
      }, "voce")
      await action("my-ads")
      await action("my-ads-filter", "drafts")
      await action("open-draft", "proof-draft")
      assert.equal(await page.locator("#item-title input").inputValue(), "Rascunho fictício")
      await action("close-dialog")
      await expectFocus(page, "open-draft", "proof-draft")
    })
    await test("family-invalid-create-copy-revoke-cancel-confirm", async () => {
      await reset((data) => {
        data.invites = []
      }, "voce")
      await action("family")
      await action("new-invite")
      assert.equal((await state(page)).invites.length, 0)
      assert(
        await page
          .locator("#invite-name")
          .evaluate(
            (e) => e.error || e.shadowRoot?.querySelector("input")?.validity.valid === false,
          ),
      )
      await page.locator("#invite-name input").fill("Familiar fictício")
      await action("new-invite")
      const invite = (await state(page)).invites[0]
      assert.equal(invite.name, "Familiar fictício")
      assert(invite.code)
      await clipboard(page, "success")
      await action("copy-invite", invite.code)
      assert.equal(await page.evaluate(() => window.__proofClipboard.at(-1)), invite.code)
      await expectFocus(page, "copy-invite", invite.code)
      await action("remove-invite", invite.code)
      await action("cancel-confirm")
      assert.equal((await state(page)).invites.length, 1)
      await action("remove-invite", invite.code)
      await action("accept-confirm")
      await page.waitForFunction(
        (key) => JSON.parse(localStorage.getItem(key)).invites.length === 0,
        key,
      )
      assert.equal((await state(page)).invites.length, 0)
      await shot("family-empty-after-revoke")
    })
    await test("family-clipboard-denied-selectable-recovery", async () => {
      await reset((data) => {
        data.invites = [{ code: "DEMO-PROOF", name: "Pessoa fictícia", used: false }]
      }, "voce")
      await action("family")
      await clipboard(page, "denied")
      await action("copy-invite", "DEMO-PROOF")
      const field = page.locator("#invite-copy input")
      await field.waitFor({ state: "visible" })
      assert.equal(await field.inputValue(), "DEMO-PROOF")
      assert(await page.locator("#invite-copy").evaluate((e) => e.readOnly))
      await feedback(page, "copi|manual|selec")
      await shot("family-copy-denied")
    })
    await test("family-storage-rollback-and-used-invite", async () => {
      await reset((data) => {
        data.invites = []
      }, "voce")
      await action("family")
      await page.locator("#invite-name input").fill("Exemplo de rollback")
      await storageFailure(page)
      await action("new-invite")
      await feedback(page, "salvar|armazen|espaço|grav")
      assert.equal((await state(page)).invites.length, 0)
      assert.equal(await page.locator("#invite-name input").inputValue(), "Exemplo de rollback")
      await storageFailure(page, false)
      await action("new-invite")
      assert.equal((await state(page)).invites.length, 1)
      await reset((data) => {
        data.invites = [{ code: "DEMO-USED", name: "Consumido fictício", used: true }]
      }, "voce")
      await action("family")
      assert.match(await page.locator("#dialog").innerText(), /utilizado|consumido/i)
      assert(
        await page
          .locator('[data-action="copy-invite"]')
          .first()
          .evaluate(
            (element) => element.disabled && element.shadowRoot?.querySelector("button")?.disabled,
          ),
      )
    })
    await test("family-disabled-has-settings-recovery", async () => {
      await reset((data) => {
        data.prefs.familyOnly = false
      }, "voce")
      await action("family")
      assert(await page.locator("#dialog").evaluate((e) => e.open))
      await feedback(page, "configura|desativ")
      const settings = page.locator('[data-action="family-settings"]:visible').first()
      assert(await settings.isVisible())
      await action("family-settings")
      await page.locator("#privacy-family").waitFor({ state: "visible" })
      await page.locator("#privacy-family").click()
      await action("save-settings")
      assert.equal((await state(page)).prefs.familyOnly, true)
      await action("family")
      assert(await page.locator("#invite-name").isVisible())
    })
    await test("notices-read-local-badge-and-exact-destination-return", async () => {
      const item = fixture.items[0]
      await reset((data) => {
        data.notices = [
          {
            id: "proof-notice",
            text: "Aviso fictício do anúncio",
            city: data.city,
            unread: true,
            when: "Agora",
            go: ["anuncio", item.id],
          },
        ]
      })
      await action("notices")
      await action("notice-read", "proof-notice")
      assert.equal((await state(page)).notices[0].unread, false)
      await action("notice-open", "proof-notice")
      await route(page, "anuncio", item.id)
      await action("back")
      await route(page, "inicio")
      await page
        .locator('[data-action="notice-open"][data-value="proof-notice"]')
        .waitFor({ state: "visible" })
      await expectFocus(page, "notice-open", "proof-notice")
      await shot("notices-return")
      await action("close-dialog")
      assert.equal(await page.locator(".notice-button .badge").count(), 0)
    })
    await test("notices-empty-missing-destination-city-and-storage-rollback", async () => {
      await reset((data) => {
        data.notices = []
      })
      await action("notices")
      await feedback(page, "Nenhum aviso")
      await reset((data) => {
        data.notices = [
          {
            id: "proof-absent",
            city: data.city,
            unread: true,
            text: "Referência removida fictícia",
            go: ["anuncio", "absent-demo-item"],
          },
        ]
      })
      await action("notices")
      await action("notice-open", "proof-absent")
      await feedback(page, "indispon.vel|remov|encontr")
      await route(page, "inicio")
      assert.equal((await state(page)).notices[0].unread, true)
      await reset((data) => {
        data.notices = [
          {
            id: "proof-quota",
            city: data.city,
            unread: true,
            text: "Aviso de quota fictício",
            go: ["guia"],
          },
        ]
      })
      await action("notices")
      await storageFailure(page)
      await action("notice-read", "proof-quota")
      await feedback(page, "salvar|leitura|n.o lido")
      assert.equal((await state(page)).notices[0].unread, true)
      await reset((data) => {
        data.city = otherCity
      }, "inicio")
      await action("notices")
      await action("notice-home")
      assert.equal(await page.evaluate(() => window.Bivaque.inspect().city), fixture.homeCity)
    })
    await test("cap-local-change-boundary-and-quota-rollback", async () => {
      await reset(undefined, "voce")
      const original = fixture.prefs.cap
      await action("cap", "1", { keyboard: true })
      assert.equal((await state(page)).prefs.cap, original + 1)
      await expectFocus(page, "cap", "1")
      await action("cap", "-1")
      assert.equal((await state(page)).prefs.cap, original)
      await page.reload()
      await stabilize(page)
      assert.equal((await state(page)).prefs.cap, original)
      await storageFailure(page)
      await action("cap", "1")
      await feedback(page, "salvar|espaço|grav")
      assert.equal((await state(page)).prefs.cap, original)
      await reset((data) => {
        data.prefs.cap = 0
      }, "voce")
      await action("cap", "-1")
      assert.equal((await state(page)).prefs.cap, 0)
      await feedback(page, "zero|limite")
    })
    await test("plans-existing-information-demo-price-close-focus", async () => {
      const biz = fixture.biz[0]
      await reset((data) => {
        data.myBiz = { ...data.biz[0], mine: true, live: true, claimed: true }
      }, `negocio/${biz.id}`)
      await action("plans", undefined, { keyboard: true })
      const text = await page.locator("#dialog").innerText()
      assert.match(text, /teste|demonstra/i)
      assert.match(text, /nenhum pagamento/i)
      assert.match(text, /9,90/)
      assert.match(text, /39/)
      await action("close-dialog")
      await expectFocus(page, "plans")
      assert.equal((await state(page)).subscription.tier, fixture.subscription.tier)
    })
    await test("personal-plan-local-check-persist-go-and-quota-rollback", async () => {
      await reset((data) => {
        data.mode = "chegando"
      })
      const step = fixture.plan.chegando[0],
        value = `chegando|${step.id}`,
        prior = !!step.done
      await action("plan-check", value)
      assert.equal((await state(page)).plan.chegando[0].done, !prior)
      await expectFocus(page, "plan-check", value)
      await page.reload()
      await stabilize(page)
      assert.equal(
        await page
          .locator(`[data-action="plan-check"][data-value="${value}"]`)
          .evaluate((e) => e.checked),
        !prior,
      )
      await storageFailure(page)
      await action("plan-check", value)
      await feedback(page, "salvar|espaço|grav")
      assert.equal((await state(page)).plan.chegando[0].done, !prior)
      assert.equal(
        await page
          .locator(`[data-action="plan-check"][data-value="${value}"]`)
          .evaluate((e) => e.checked),
        !prior,
      )
      await storageFailure(page, false)
      await action("plan", "chegando")
      assert(
        (await page.locator('#dialog [data-action="plan-check"]').count()) >=
          fixture.plan.chegando.length,
      )
      await action("plan-go", value, { scope: page.locator("#dialog") })
      await route(page, "imoveis")
    })
    await test("personal-plan-search-and-destination-guides", async () => {
      await reset((data) => {
        data.mode = "chegando"
      })
      const search = fixture.plan.chegando.find((s) => s.go?.[0] === "search")
      await action("plan", "chegando")
      await action("plan-go", `chegando|${search.id}`, { scope: page.locator("#dialog") })
      await route(page, "busca")
      assert.equal(await page.locator("#search-query input").inputValue(), search.go[1])
      await reset((data) => {
        data.mode = "saindo"
        data.dest = otherCity
      })
      await action("plan", "saindo")
      const dest = fixture.plan.saindo.find((s) => s.go?.[0] === "destination")
      await action("plan-go", `saindo|${dest.id}`, { scope: page.locator("#dialog") })
      await route(page, "guia")
      assert.equal(await page.evaluate(() => window.Bivaque.inspect().city), otherCity)
    })
    await test("share-copy-success-exact-local-url-and-focus", async () => {
      const item = fixture.items[0]
      await reset(undefined, `anuncio/${item.id}`)
      await clipboard(page, "success")
      await action("share", `anuncio|${item.id}`)
      await page.waitForFunction(() => window.__proofClipboard.length > 0)
      const link = new URL(await page.evaluate(() => window.__proofClipboard.at(-1)))
      assert.equal(link.origin, origin)
      assert.equal(link.hash, `#anuncio/${item.id}?cidade=${encodeURIComponent(fixture.city)}`)
      await feedback(page, "copiad|local|demonstra|navegador")
      await expectFocus(page, "share", `anuncio|${item.id}`)
    })
    await test("share-denied-visible-copy-failure-and-retry", async () => {
      const item = fixture.items[0]
      await reset(undefined, `anuncio/${item.id}`)
      await clipboard(page, "denied", "denied")
      await action("share", `anuncio|${item.id}`)
      const field = page.locator("#share-link input")
      await field.waitFor({ state: "visible" })
      const value = await field.inputValue()
      assert(value.includes(`#anuncio/${item.id}`))
      assert(await page.locator("#share-link").evaluate((e) => e.readOnly))
      await action("copy-share")
      assert.equal(await field.inputValue(), value)
      await feedback(page, "manual|selec|n.o.*copi|copiar")
      await shot("share-manual-recovery")
      await clipboard(page, "success")
      await action("copy-share")
      assert.equal(await page.evaluate(() => window.__proofClipboard.at(-1)), value)
    })
    await test("web-share-abort-not-a-false-success", async () => {
      const item = fixture.items[0]
      await reset(undefined, `anuncio/${item.id}`)
      await clipboard(page, "success", "abort")
      await action("share", `anuncio|${item.id}`)
      assert.equal(await page.evaluate(() => window.__proofShares.length), 1)
      assert.equal(await page.evaluate(() => window.__proofClipboard.length), 0)
      assert(
        !/copiado|compartilhado com sucesso/i.test(await page.locator("#snackbar").innerText()),
      )
      await route(page, "anuncio", item.id)
    })
    await test("six-create-options-real-editors-or-specific-dependency-cancel-focus", async () => {
      const choices = [
        ["ask", "#ask-input"],
        ["create-item", "#item-title"],
        ["create-property", "#item-beds"],
        ["indicate", "#ind-name"],
        ["create-event", "#event-title"],
        ["my-biz", "#biz-name"],
      ]
      for (const [choice, field] of choices) {
        await reset((data) => {
          data.myBiz = null
        })
        await action("create", undefined, { keyboard: true })
        await action(choice, undefined, { keyboard: true, scope: page.locator("#create-menu") })
        await page.locator("#dialog").waitFor({ state: "visible" })
        if (field) await page.locator(field).waitFor({ state: "visible" })
        else {
          assert.match(await page.locator("#dialog").innerText(), /encontro|evento/i)
          assert(!/encontro (criado|publicado)/i.test(await page.locator("#dialog").innerText()))
        }
        await action("close-dialog")
        await expectFocus(page, "create")
        assert(await page.evaluate(() => !document.querySelector("#main").inert))
      }
    })
    await test("family-unverified-and-readonly-create-revoke-denied", async () => {
      for (const permission of ["unverified", "readonly"]) {
        await reset((data) => {
          data.invites = [{ code: "DEMO-GUARD", name: "Familiar fictício", used: false }]
          if (permission === "unverified") data.profile.verified = false
          else data.city = otherCity
        }, "voce")
        await action("family")
        await page.locator("#invite-name input").fill("Novo fictício bloqueado")
        await action("new-invite")
        await feedback(page, permission === "unverified" ? "verifi" : "cidade")
        assert.equal((await state(page)).invites.length, 1)
        await action("remove-invite", "DEMO-GUARD")
        assert.equal((await state(page)).invites.length, 1)
        assert.equal(
          await page.locator("#confirm-dialog").evaluate((element) => element.open),
          false,
        )
      }
    })
    await test("personal-plan-unverified-check-reverts-readonly-not-emitted-invalid-destination", async () => {
      const step = fixture.plan.chegando[0],
        value = `chegando|${step.id}`,
        prior = !!step.done
      await reset((data) => {
        data.mode = "chegando"
        data.profile.verified = false
      })
      await action("plan-check", value)
      await feedback(page, "verifi|nenhuma etapa")
      await stabilize(page)
      assert.equal((await state(page)).plan.chegando[0].done, prior)
      assert.equal(
        await page
          .locator(`[data-action="plan-check"][data-value="${value}"]`)
          .first()
          .evaluate((element) => element.checked),
        prior,
      )
      await action("close-dialog")
      await reset((data) => {
        data.mode = "chegando"
        data.city = otherCity
      })
      assert.equal(await page.locator('[data-action="plan-check"]').count(), 0)
      assert.equal((await state(page)).plan.chegando[0].done, prior)
      await reset((data) => {
        data.mode = "saindo"
        data.dest = "Belém"
      })
      const destination = fixture.plan.saindo.find((item) => item.go?.[0] === "destination")
      await action("plan", "saindo")
      await action("plan-go", `saindo|${destination.id}`, { scope: page.locator("#dialog") })
      await feedback(page, "n.o.*dispon.vel|indispon.vel|destino|plano|depend")
      assert.match(await page.locator("#dialog").innerText(), /etapa indispon.vel/i)
      assert.equal(await page.evaluate(() => window.Bivaque.inspect().city), fixture.city)
      await route(page, "inicio")
    })
    await test("activate-existing-demo-plan-persist-and-storage-rollback", async () => {
      const biz = fixture.biz[0]
      await reset((data) => {
        data.myBiz = { ...data.biz[0], mine: true, live: true, claimed: true }
        data.subscription.tier = "free"
      }, `negocio/${biz.id}`)
      await action("plans")
      await page.locator('md-radio[name="plan"][value="moment"]').click()
      await page.waitForFunction(
        () => document.querySelector('md-radio[name="plan"][value="moment"]').checked,
      )
      await action("activate-plan")
      await page.waitForFunction(
        (key) => JSON.parse(localStorage.getItem(key)).subscription.tier === "moment",
        key,
      )
      await feedback(page, "teste|nenhum pagamento")
      await page.reload()
      await stabilize(page)
      assert.equal((await state(page)).subscription.tier, "moment")
      await action("plans")
      await page.locator('md-radio[name="plan"][value="free"]').click()
      await storageFailure(page)
      await action("activate-plan")
      await feedback(page, "salvar|espaço|armazen")
      assert.equal((await state(page)).subscription.tier, "moment")
      assert(await page.locator("#dialog").evaluate((element) => element.open))
    })
    await test("draft-delete-cancel-quota-no-false-success-and-retry", async () => {
      await reset((data) => {
        data.drafts = [
          {
            id: "proof-delete-draft",
            title: "Rascunho fictício",
            desc: "Descrição fictícia suficiente",
            kind: "desapego",
            numPrice: 50,
            hood: "Planalto",
            photos: [],
            at: 1,
          },
        ]
      }, "voce")
      await action("my-ads")
      await action("my-ads-filter", "drafts")
      await action("delete-draft", "proof-delete-draft")
      await action("cancel-confirm")
      assert.equal((await state(page)).drafts.length, 1)
      await storageFailure(page)
      await action("delete-draft", "proof-delete-draft")
      await action("accept-confirm")
      await feedback(page, "salvar|espaço|armazen")
      assert.equal((await state(page)).drafts.length, 1)
      assert(!/rascunho excluído/i.test(await page.locator("#snackbar.show").innerText()))
      await storageFailure(page, false)
      await action("delete-draft", "proof-delete-draft")
      await action("accept-confirm")
      await page.waitForFunction(
        (key) => JSON.parse(localStorage.getItem(key)).drafts.length === 0,
        key,
      )
      await feedback(page, "rascunho exclu.do")
    })
    await test("event-editor-overlay-reload-back-no-phantom-history", async () => {
      // Rodada 05 ligou os encontros: o overlay agora é o editor de um encontro próprio.
      const event = fixture.events[2] ?? fixture.events[0]
      assert(event)
      await reset((data) => {
        data.events.find((item) => item.id === event.id).mine = true
      })
      await action("agenda")
      await action("open-event", event.id)
      await route(page, "evento", event.id)
      await action("edit-event", event.id)
      assert(await page.locator("#dialog").evaluate((element) => element.open))
      const current = (await state(page)).events.find((item) => item.id === event.id)
      assert.equal(current.on, event.on)
      await page.reload()
      await stabilize(page)
      await action("back")
      await route(page, "agenda")
      await expectFocus(page, "open-event", event.id)
    })
    await test("global-overlay-reload-native-back-restores-live-page", async () => {
      for (const name of ["create", "family", "notices"]) {
        const initial = name === "family" ? "voce" : "inicio"
        await reset(undefined, initial)
        await action(name)
        await page.reload()
        await stabilize(page)
        assert.equal(await page.locator("#dialog").evaluate((element) => element.open), false)
        assert(await page.locator("#create-menu").isHidden())
        await page.goBack()
        await route(page, initial)
        assert(await page.evaluate(() => !document.querySelector("#main").inert))
        if (initial === "voce") {
          await action("saved")
          await route(page, "salvos")
        } else {
          await action("guide")
          await route(page, "guia")
        }
        await action("back")
        await route(page, initial)
        assert.equal(await page.locator("#dialog").evaluate((element) => element.open), false)
      }
    })
    await test("invalid-deep-link-safe-fallback-and-normal-motion-menu", async () => {
      await reset(undefined, "anuncio/%ZZ")
      await feedback(page, "inv.lid|indispon.vel|endere.o")
      await action("home")
      await route(page, "inicio")
      await page.emulateMedia({ reducedMotion: "no-preference" })
      await action("create")
      await stabilize(page)
      await page.keyboard.press("Escape")
      await page.locator("#create-menu").waitFor({ state: "hidden" })
      await expectFocus(page, "create")
      await page.emulateMedia({ reducedMotion: "reduce" })
      assert.equal(
        await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
        true,
      )
    })
    report.cases.push({
      width,
      theme,
      reducedMotion: "reduce",
      extraNormalMotion: checkpoints.includes(
        "invalid-deep-link-safe-fallback-and-normal-motion-menu",
      ),
      checkpoints,
      actionCheckpoints,
      failures,
      status: failures.length ? "FAIL" : "PASS",
    })
  } catch (error) {
    report.cases.push({
      width,
      theme,
      checkpoints,
      actionCheckpoints,
      failures,
      status: "BLOCKED",
      error: error.stack,
    })
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
  for (const width of [375, 768, 1440])
    for (const theme of ["light", "dark"]) {
      if (selectedContext && selectedContext !== `${width}-${theme}`) continue
      await verify(width, theme)
      console.log(
        `Global ${width} ${theme}: ${report.cases.at(-1).status} (${report.cases.at(-1).checkpoints.length} checkpoints)`,
      )
    }
  report.status =
    report.cases.length === (selectedContext ? 1 : 6) &&
    report.cases.every((c) => c.status === "PASS" && c.checkpoints.length > 0) &&
    !report.browserErrors.length &&
    !report.externalRequests.length
      ? targeted
        ? "PASS_TARGETED"
        : "PASS"
      : "FAIL"
} catch (error) {
  report.status = "BLOCKED"
  report.failure = error.stack
} finally {
  await browser?.close()
  await new Promise((done) => server.close(done))
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`${report.status}: ${output}`)
  process.exitCode = ["PASS", "PASS_TARGETED"].includes(report.status) ? 0 : 1
}
