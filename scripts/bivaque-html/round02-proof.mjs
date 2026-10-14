import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Rodada 02: Acesso/onboarding, Cidade e momento, Configurações e controles do protótipo.
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
const step = (page) =>
  page.evaluate(() => document.querySelector(".onboard-step span")?.textContent ?? null)
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
async function openOnboarding(page) {
  await action(page, "prototype")
  await page.locator('#dialog [data-action="onboarding"]').click()
  await settle(page)
  expect((await dialogKind(page)) === "onboarding", "cadastro não abriu")
}
async function toStep2(page) {
  await openOnboarding(page)
  await action(page, "onboard-next")
  expect((await step(page)) === "Etapa 2 de 5", `esperava etapa 2, veio ${await step(page)}`)
}
async function passStep2(page, name = "Joana Lima") {
  await fill(page, "onboard-name", name)
  await page.locator("#onboard-terms").click()
  await action(page, "onboard-next")
}
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

const checkpoints = {
  async "onboarding-happy-path"(page) {
    await toStep2(page)
    await passStep2(page)
    expect((await step(page)) === "Etapa 3 de 5", "não avançou para a verificação")
    await page.locator('md-radio[value="yes"]').click()
    await action(page, "onboard-next")
    expect((await step(page)) === "Etapa 4 de 5", "não avançou para cidade")
    await choose(page, "onboard-city", "Brasília")
    await choose(page, "onboard-mode", "chegando")
    await page.locator("#onboard-date").fill(inDays(20))
    await action(page, "onboard-next")
    expect((await step(page)) === "Etapa 5 de 5", "não avançou para interesses")
    const chips = page.locator('#dialog [data-action="interest-toggle"]')
    for (let i = 0; i < 4; i++) {
      await chips.nth(i).click()
      await settle(page)
    }
    const selected = await page.locator("#dialog md-filter-chip[selected]").count()
    expect(selected === 3, `limite de 3 interesses violado: ${selected}`)
    await action(page, "onboard-finish")
    expect((await dialogKind(page)) === null, "cadastro não fechou")
    const s = await stored(page)
    expect(s.profile.name === "Joana Lima" && s.profile.verified === true, "perfil não salvo")
    expect(
      s.homeCity === "Brasília" && s.city === "Brasília" && s.mode === "chegando",
      "cidade/momento não salvos",
    )
    expect(
      s.arrival === inDays(20) && s.profile.interests.length === 3,
      "data/interesses não salvos",
    )
    expect((await toast(page)).length > 0, "sem confirmação ao concluir")
    await page.reload()
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    expect(
      (await page.evaluate(() => window.Bivaque.inspect().homeCity)) === "Brasília",
      "não persistiu após reload",
    )
  },
  async "onboarding-validation"(page) {
    await toStep2(page)
    const before = JSON.stringify(await stored(page))
    await action(page, "onboard-next")
    expect((await step(page)) === "Etapa 2 de 5", "avançou sem nome/termos")
    expect(/nome/i.test(await toast(page)), "sem feedback de campo obrigatório")
    await fill(page, "onboard-name", "Al")
    await page.locator("#onboard-terms").click()
    await action(page, "onboard-next")
    expect((await step(page)) === "Etapa 2 de 5", "aceitou nome com 2 letras")
    await fill(page, "onboard-name", "Joana Lima")
    await page.locator("#onboard-terms").click()
    await action(page, "onboard-next")
    expect((await step(page)) === "Etapa 2 de 5", "avançou com termos desmarcados")
    expect(JSON.stringify(await stored(page)) === before, "estado alterado durante validação")
  },
  async "onboarding-family-invite"(page) {
    await action(page, "city")
    await action(page, "apply-city")
    await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k))
      s.invites = [...(s.invites || []), { code: "FAM-TESTE1", used: false, created: Date.now() }]
      localStorage.setItem(k, JSON.stringify(s))
    }, KEY)
    await page.reload()
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    await toStep2(page)
    await fill(page, "onboard-name", "Joana Lima")
    await choose(page, "onboard-role", "familia")
    expect(
      (await page.locator("#onboard-name input").inputValue()) === "Joana Lima",
      "nome perdido ao trocar vínculo",
    )
    await page.locator("#onboard-terms").click()
    await action(page, "onboard-next")
    expect((await step(page)) === "Etapa 2 de 5", "família avançou sem código")
    await fill(page, "onboard-code", "FAM-ERRADO")
    await action(page, "onboard-next")
    expect(
      (await step(page)) === "Etapa 2 de 5" && /convite/i.test(await toast(page)),
      "código inválido aceito",
    )
    await fill(page, "onboard-code", "fam-teste1")
    await action(page, "onboard-next")
    expect((await step(page)) === "Etapa 3 de 5", "código válido recusado")
    for (let i = 0; i < 2; i++) await action(page, "onboard-next")
    await action(page, "onboard-finish")
    const s = await stored(page)
    expect(s.profile.role === "familia", "vínculo família não salvo")
    expect(
      s.invites.find((x) => x.code === "FAM-TESTE1")?.used === true,
      "convite não marcado como usado",
    )
  },
  async "onboarding-pending-blocks-publish"(page) {
    await toStep2(page)
    await passStep2(page)
    await page.locator('md-radio[value="pending"]').click()
    for (let i = 0; i < 2; i++) await action(page, "onboard-next")
    await action(page, "onboard-finish")
    expect((await stored(page)).profile.verified === false, "verificação pendente não salva")
    expect(/análise/i.test(await toast(page)), "sem aviso de perfil em análise")
    const items = (await stored(page)).items.length
    await page.locator('[data-action="create"]:visible').first().click()
    await settle(page)
    await page.locator("#create-menu [data-action]:visible").first().click()
    await settle(page)
    const kind = await dialogKind(page)
    expect(
      kind === "onboarding" || /verifica|análise/i.test(await toast(page)),
      `publicação liberada sem verificação (diálogo ${kind})`,
    )
    expect((await stored(page)).items.length === items, "item criado sem verificação")
  },
  async "onboarding-leaving-needs-destination"(page) {
    await toStep2(page)
    await passStep2(page)
    await action(page, "onboard-next")
    await choose(page, "onboard-city", "Natal")
    await choose(page, "onboard-mode", "saindo")
    await choose(page, "onboard-dest", "Natal")
    await page.locator("#onboard-date").fill(inDays(15))
    await action(page, "onboard-next")
    expect(
      (await step(page)) === "Etapa 4 de 5" && /destino/i.test(await toast(page)),
      "aceitou destino igual à cidade",
    )
    await choose(page, "onboard-dest", "Brasília")
    await action(page, "onboard-next")
    expect((await step(page)) === "Etapa 5 de 5", "destino válido recusado")
    expect(
      /Brasília/.test(await page.locator("#dialog").innerText()),
      "turma do destino não indicada",
    )
    await action(page, "onboard-finish")
    const s = await stored(page)
    expect(
      s.mode === "saindo" && s.dest === "Brasília" && s.leaveDate === inDays(15),
      "saída não salva",
    )
  },
  async "onboarding-back-and-escape"(page) {
    await toStep2(page)
    await passStep2(page)
    await action(page, "onboard-prev")
    expect((await step(page)) === "Etapa 2 de 5", "Voltar não retornou etapa")
    expect(
      (await page.locator("#onboard-name input").inputValue()) === "Joana Lima",
      "nome perdido ao voltar",
    )
    await passStep2(page)
    await page.goBack()
    await settle(page)
    expect((await step(page)) === "Etapa 2 de 5", `voltar do navegador: ${await step(page)}`)
    const before = JSON.stringify(await stored(page))
    await page.keyboard.press("Escape")
    await settle(page)
    expect((await dialogKind(page)) === null, "Escape não fechou o cadastro")
    expect(JSON.stringify(await stored(page)) === before, "cancelar gravou dados parciais")
    expect(
      await page.evaluate(
        () => !!document.activeElement && document.activeElement !== document.body,
      ),
      "foco perdido após fechar",
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
    await settle(page)
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
    await toStep2(page)
    await passStep2(page)
    for (let i = 0; i < 2; i++) await action(page, "onboard-next")
    const before = JSON.stringify(await stored(page))
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("quota", "QuotaExceededError")
      }
    })
    await action(page, "onboard-finish")
    expect((await dialogKind(page)) === "onboarding", "cadastro fechou apesar da falha")
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
