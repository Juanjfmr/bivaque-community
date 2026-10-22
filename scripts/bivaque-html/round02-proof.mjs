import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Rodada 02: Acesso (passo 3 da entrada desde a Rodada 56), Cidade e momento, Configurações e controles do protótipo.
// Interações por clique/teclado na UI; localStorage só é lido, exceto o convite de família
// semeado (fixture) e a quota simulada para a falha de gravação.
const root = resolve(import.meta.dirname, "../..")
const output = resolve(
  root,
  process.env.BIVAQUE_HTML_PROOF_OUT ?? ".visual/bivaque-html-round02/functional",
)
const candidate = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const KEY = "bivaque-material-web-v3"
const contexts = process.argv.includes("--full")
  ? ["375-light", "375-dark", "768-light", "768-dark", "1440-light", "1440-dark"]
  : (process.env.BIVAQUE_HTML_CONTEXTS ?? "375-light").split(",")
const only = process.env.BIVAQUE_HTML_CHECKPOINT
mkdirSync(join(output, "shots"), { recursive: true })
const report = {
  candidateHash: createHash("sha256").update(candidate).digest("hex"),
  contexts,
  cases: [],
  browserErrors: [],
  externalRequests: [],
}
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname
  if (path === "/favicon.ico") return res.writeHead(204).end()
  if (path !== "/candidate.html") return res.writeHead(404).end()
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(candidate)
})
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const url = `http://127.0.0.1:${server.address().port}/candidate.html`

const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)
const toast = (page) => page.locator("#snackbar").innerText()
const dialogKind = (page) =>
  page.evaluate(() => {
    const d = document.querySelector("#dialog")
    return d?.open ? d.dataset.kind || "dialog" : null
  })
const entryUrl = (page) => page.evaluate(() => location.hash.slice(1))
const err = (page) => page.locator("#en-err").innerText()
const settle = (page) => page.waitForTimeout(350)
function expect(condition, message) {
  if (!condition) throw new Error(message)
}
async function action(page, name, value) {
  const selector = value
    ? `#dialog [data-action="${name}"][data-value="${value}"]`
    : `[data-action="${name}"]:visible`
  if (!value && (await page.locator(selector).count()) === 0) {
    // Em 375 px, Cidade/Configurações/Protótipo ficam na tela Você, não na barra superior.
    await page.evaluate(() => {
      location.hash = "voce"
    })
    await settle(page)
  }
  await page.locator(selector).first().click()
  await settle(page)
}
async function choose(page, id, value) {
  await page.locator(`#${id}`).click()
  await page.locator(`#${id} md-select-option[value="${value}"]`).click()
  await settle(page)
}
async function fill(page, id, text) {
  await page.locator(`#${id} input`).fill(text)
}
// Rodada 56: o cadastro em diálogo virou o passo 3 da entrada (cidade, momento e nome). A conta e a
// elegibilidade já confirmada entram pelo armazenamento; as Rodadas 54 e 55 provam esses passos.
// Grava o estado inicial uma vez (o app só grava na primeira mudança), como o snapshot do harness.
async function persisted(page) {
  if (!(await stored(page))) {
    await action(page, "city")
    await action(page, "apply-city")
  }
}
async function openStep3(page, account = {}) {
  await persisted(page)
  await page.evaluate(
    ([k, extra]) => {
      const s = JSON.parse(localStorage.getItem(k))
      s.signedOut = true
      s.entry = {
        account: {
          name: "Joana Lima",
          email: "joana.teste@exemplo.com",
          provider: "email",
          ...extra,
        },
        consentAt: Date.now(),
        eligibility: "verified",
      }
      localStorage.setItem(k, JSON.stringify(s))
    },
    [KEY, account],
  )
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.evaluate(() => {
    location.hash = "entrar/cidade"
  })
  await settle(page)
  expect(await page.locator("#en-city-form").isVisible(), "passo 3 da entrada não abriu")
}
async function moment(page, value) {
  await page.locator(`#en-city-form input[name="en-mode"][value="${value}"]`).click()
  await settle(page)
}
async function finish(page) {
  await page.locator('#main [data-action="entry-finish"]').click()
  await settle(page)
}
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

const checkpoints = {
  async "entry-step3-happy-path"(page) {
    await openStep3(page)
    expect(
      (await page.locator("#en-name input").inputValue()) === "Joana Lima",
      "nome da conta não veio preenchido",
    )
    await choose(page, "en-city", "Brasília")
    await moment(page, "chegando")
    await page.locator("#en-date").fill(inDays(20))
    await finish(page)
    expect(
      (await entryUrl(page)) === "entrar/boas-vindas",
      `não abriu as boas-vindas: ${await entryUrl(page)}`,
    )
    const text = await page.locator("#main").innerText()
    expect(
      /Você chegou ao Bivaque/.test(text) && /plano de chegada a Brasília/.test(text),
      `boas-vindas: ${text.slice(0, 160)}`,
    )
    const s = await stored(page)
    expect(
      s.profile.name === "Joana Lima" &&
        s.profile.verified === true &&
        s.profile.email === "joana.teste@exemplo.com",
      "perfil não salvo",
    )
    expect(
      s.homeCity === "Brasília" && s.city === "Brasília" && s.mode === "chegando",
      "cidade/momento não salvos",
    )
    expect(s.arrival === inDays(20) && !s.signedOut && s.entry.done, "data ou entrada não salvas")
    await page.locator('#main [data-action="entry-home"][data-value="comunidade"]').click()
    await settle(page)
    expect((await entryUrl(page)) === "comunidade", "Entrar na comunidade não abriu a Comunidade")
    await page.reload()
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    expect(
      (await page.evaluate(() => window.Bivaque.inspect().homeCity)) === "Brasília",
      "não persistiu após reload",
    )
  },
  async "entry-step3-validation"(page) {
    await openStep3(page)
    const before = JSON.stringify(await stored(page))
    await moment(page, "chegando")
    await finish(page)
    expect(/cidade/i.test(await err(page)), `sem cidade: ${await err(page)}`)
    await choose(page, "en-city", "Manaus")
    await finish(page)
    expect(/data de chegada/i.test(await err(page)), `sem data: ${await err(page)}`)
    await page.locator("#en-date").fill(inDays(10))
    await fill(page, "en-name", "J")
    await finish(page)
    expect(/chamado/i.test(await err(page)), `nome curto: ${await err(page)}`)
    expect((await entryUrl(page)) === "entrar/cidade", "saiu do passo 3 com erro")
    expect(JSON.stringify(await stored(page)) === before, "estado alterado durante validação")
  },
  async "entry-step3-family-account"(page) {
    await openStep3(page, { family: true, invitedBy: "Rafael Souza" })
    await choose(page, "en-city", "Manaus")
    await moment(page, "moro")
    expect((await page.locator("#en-date").count()) === 0, "quem mora precisa informar data")
    await finish(page)
    const s = await stored(page)
    expect(s.profile.role === "familia" && s.mode === "moro", "conta de família não salva")
    expect(
      /Conhecer/.test(await page.locator("#main").innerText()),
      "boas-vindas sem o guia da cidade",
    )
  },
  async "unverified-profile-blocks-publish"(page) {
    await persisted(page)
    await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k))
      s.profile.verified = false
      localStorage.setItem(k, JSON.stringify(s))
    }, KEY)
    await page.reload()
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    const items = (await stored(page)).items.length
    await page.locator('[data-action="create"]:visible').first().click()
    await settle(page)
    await page.locator("#create-menu [data-action]:visible").first().click()
    await settle(page)
    const kind = await dialogKind(page)
    expect(kind === "unverified", `publicação liberada sem verificação (diálogo ${kind})`)
    expect((await stored(page)).items.length === items, "item criado sem verificação")
  },
  async "entry-step3-leaving-needs-destination"(page) {
    await openStep3(page)
    await choose(page, "en-city", "Natal")
    await moment(page, "saindo")
    await page.locator("#en-date").fill(inDays(15))
    await choose(page, "en-dest", "Natal")
    await finish(page)
    expect(
      (await entryUrl(page)) === "entrar/cidade" && /destino/i.test(await err(page)),
      "aceitou destino igual à cidade",
    )
    await choose(page, "en-dest", "Brasília")
    await finish(page)
    expect(
      /plano de saída para Brasília/.test(await page.locator("#main").innerText()),
      "boas-vindas sem o plano de saída",
    )
    const s = await stored(page)
    expect(
      s.mode === "saindo" && s.dest === "Brasília" && s.leaveDate === inDays(15),
      "saída não salva",
    )
  },
  async "entry-step3-exit-and-resume"(page) {
    await openStep3(page)
    const before = JSON.stringify(await stored(page))
    await page.locator('#main [data-action="entry-cancel"]').click()
    await settle(page)
    expect(
      (await entryUrl(page)) === "entrar",
      `Sair não voltou à landing: ${await entryUrl(page)}`,
    )
    expect(JSON.stringify(await stored(page)) === before, "sair gravou dados parciais")
    // R71: a landing v8 tem "Entrar" no topo, na folha do menu e no rodapé; o do topo é o primeiro.
    await page.locator('#main [data-action="entry-login"]').first().click()
    await settle(page)
    await fill(page, "en-email", "joana.teste@exemplo.com")
    await fill(page, "en-pass-login", "senha1234")
    await page.locator('#main [data-action="entry-login-submit"]').click()
    await settle(page)
    expect(
      (await entryUrl(page)) === "entrar/cidade",
      `entrar não retomou o passo 3: ${await entryUrl(page)}`,
    )
  },
  async "city-consult-and-return"(page) {
    await action(page, "city")
    await choose(page, "city-select", "Natal")
    await action(page, "apply-city")
    const s = await stored(page)
    expect(s.city === "Natal" && s.homeCity === "Manaus", "consulta de cidade não aplicada")
    const create = page.locator('[data-action="create"]:visible').first()
    const blocked = await create.evaluate(
      (el) =>
        el.disabled || el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled"),
    )
    if (!blocked) {
      await create.click()
      await settle(page)
      expect(/Manaus/.test(await toast(page)), "publicação em outra cidade sem aviso")
    }
    expect(
      /Natal/.test(await page.locator("#main").innerText()),
      "sem indicação da cidade consultada",
    )
    expect((await stored(page)).items.length === s.items.length, "publicou em cidade consultada")
    await page.locator('[data-action="home-city"]:visible').first().click()
    await settle(page)
    expect((await stored(page)).city === "Manaus", "retorno à cidade de origem falhou")
  },
  async "city-validation"(page) {
    await action(page, "city")
    await choose(page, "moment-select", "saindo")
    await page.locator("#leave-date").fill("")
    await action(page, "apply-city")
    expect(
      (await dialogKind(page)) !== null && /data/i.test(await toast(page)),
      "aceitou saída sem data",
    )
    await page.locator("#leave-date").fill(inDays(30))
    await choose(page, "destination-select", "Natal")
    await action(page, "apply-city")
    const s = await stored(page)
    expect(
      s.mode === "saindo" && s.dest === "Natal" && s.leaveDate === inDays(30),
      "momento de saída não salvo",
    )
  },
  async "settings-save-and-persist"(page) {
    await action(page, "settings")
    await fill(page, "profile-name", "Jo")
    await action(page, "save-settings")
    expect((await dialogKind(page)) !== null, "salvou nome curto")
    await fill(page, "profile-name", "Joana Lima")
    await choose(page, "appearance-select", "dark")
    await page.locator("#privacy-hood").click()
    await action(page, "save-settings")
    expect((await dialogKind(page)) === null, "configurações não fecharam")
    await page.reload()
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    const s = await stored(page)
    expect(
      s.profile.name === "Joana Lima" &&
        s.prefs.appearance === "dark" &&
        s.prefs.showHood === false,
      "configurações não persistiram",
    )
    expect(
      (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark",
      "tema escuro não aplicado",
    )
  },
  async "prototype-controls"(page) {
    await action(page, "prototype")
    await fill(page, "prototype-incoming", "37")
    await page.locator("#verified-test").click()
    await action(page, "apply-prototype")
    let s = await stored(page)
    expect(s.incoming === 37 && s.profile.verified === false, "controles de teste não aplicados")
    await action(page, "prototype")
    await choose(page, "prototype-stage", "seed")
    await fill(page, "prototype-incoming", "5")
    await action(page, "apply-prototype")
    await page
      .locator('#confirm-dialog [data-action="confirm-ok"], #confirm-dialog md-filled-button')
      .last()
      .click()
    // A confirmação grava de forma assíncrona: espera a condição, não um tempo fixo.
    await page
      .waitForFunction((k) => JSON.parse(localStorage.getItem(k))?.stage === "seed", KEY, {
        timeout: 5000,
      })
      .catch(() => {})
    s = await stored(page)
    expect(s.stage === "seed", "troca de cenário não aplicada")
    expect(s.incoming === 5, `famílias declaradas descartadas na troca de cenário: ${s.incoming}`)
    // Trocar só o cenário, sem editar o número, usa o padrão do novo cenário (live = 14).
    await action(page, "prototype")
    await choose(page, "prototype-stage", "live")
    await action(page, "apply-prototype")
    await page.locator("#confirm-dialog md-filled-button").last().click()
    await page
      .waitForFunction((k) => JSON.parse(localStorage.getItem(k))?.stage === "live", KEY, {
        timeout: 5000,
      })
      .catch(() => {})
    s = await stored(page)
    expect(
      s.stage === "live" && s.incoming === 14,
      `valor antigo levado ao novo cenário: ${s.incoming}`,
    )
    await action(page, "prototype")
    await action(page, "reset-prototype")
    await page.locator("#confirm-dialog md-filled-button").last().click()
    // Mesma espera por condição da troca de cenário: a confirmação grava de forma assíncrona.
    await page
      .waitForFunction(
        (k) => {
          const x = JSON.parse(localStorage.getItem(k))
          return x?.stage === "live" && x?.profile?.verified === true
        },
        KEY,
        { timeout: 5000 },
      )
      .catch(() => {})
    s = await stored(page)
    expect(s.stage === "live" && s.profile.verified === true, "reinício não restaurou exemplos")
  },
  async "reset-storage-failure"(page) {
    await action(page, "settings")
    await fill(page, "profile-name", "Joana Lima")
    await action(page, "save-settings")
    await action(page, "prototype")
    await action(page, "reset-prototype")
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("quota", "QuotaExceededError")
      }
    })
    await page.locator("#confirm-dialog md-filled-button").last().click()
    await settle(page)
    expect(/salvar/i.test(await toast(page)), "sem feedback de falha ao reiniciar")
    expect(!/reiniciado/i.test(await toast(page)), "anunciou reinício que não foi gravado")
    expect((await stored(page)).profile.name === "Joana Lima", "dados perdidos")
    await page.reload()
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    expect(
      (await page.locator("#main").innerText()).length > 0 &&
        (await stored(page)).profile.name === "Joana Lima",
      "estado divergente após reload",
    )
  },
  async "storage-failure-rolls-back"(page) {
    await openStep3(page)
    await choose(page, "en-city", "Manaus")
    await moment(page, "moro")
    const before = JSON.stringify(await stored(page))
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("quota", "QuotaExceededError")
      }
    })
    await finish(page)
    expect((await entryUrl(page)) === "entrar/cidade", "passo 3 fechou apesar da falha")
    expect(/salvar/i.test(await toast(page)), "sem feedback de falha de gravação")
    expect(JSON.stringify(await stored(page)) === before, "estado parcial gravado")
  },
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)
try {
  for (const ctx of contexts) {
    const [width, theme] = ctx.split("-")
    for (const [name, run] of Object.entries(checkpoints)) {
      if (only && only !== name) continue
      const context = await createDeterministicContext(browser, { width: Number(width), theme })
      const page = await context.newPage()
      page.on("pageerror", (e) => report.browserErrors.push({ ctx, name, message: e.message }))
      page.on("request", (r) => {
        if (!r.url().startsWith("http://127.0.0.1") && !r.url().startsWith("data:"))
          report.externalRequests.push({ ctx, name, url: r.url() })
      })
      const result = { ctx, name, status: "PASS" }
      try {
        await page.goto(url)
        await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
        await run(page)
      } catch (error) {
        result.status = "FAIL"
        result.error = error.message.split("\n")[0]
        await page.screenshot({ path: join(output, "shots", `${ctx}-${name}.png`) }).catch(() => {})
      }
      report.cases.push(result)
      console.log(`${result.status} ${ctx} ${name}${result.error ? ` — ${result.error}` : ""}`)
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.close()
  const failed = report.cases.filter((c) => c.status !== "PASS").length
  report.status =
    failed || report.browserErrors.length || report.externalRequests.length ? "FAIL" : "PASS"
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
  console.log(
    `${report.status}: ${report.cases.length - failed}/${report.cases.length} checkpoints; JS errors ${report.browserErrors.length}; external ${report.externalRequests.length}`,
  )
  process.exitCode = report.status === "PASS" ? 0 : 1
}
