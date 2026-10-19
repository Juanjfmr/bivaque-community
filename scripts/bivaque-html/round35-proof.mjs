import { expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 35: Início do celular com a organização do desktop e a barra nova (Criar no centro,
// luz na aba ativa, ícones em SVG). O desktop não muda, exceto os ícones da barra lateral.
const phone = (page) => page.viewportSize().width < 720
const desktop = (page) => page.viewportSize().width >= 1024
async function setState(page, fn) {
  await snapshot(page)
  await page.evaluate(
    ([k, src]) => {
      const x = JSON.parse(localStorage.getItem(k))
      new Function("x", src)(x)
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, `(${fn})(x)`],
  )
  await reload(page)
  await go(page, "inicio")
}
const headings = (page) =>
  page.locator("#main h2").evaluateAll((els) => els.map((e) => e.textContent.trim()))
const visible = (page, sel) =>
  page.locator(sel).evaluate((e) => {
    const r = e.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== "none"
  })

const checkpoints = {
  async "create-label-opens-create"(page) {
    if (!phone(page)) return
    await snapshot(page)
    await go(page, "inicio")
    // Toca no texto "Criar", embaixo do círculo (o centro da célula é o próprio círculo).
    const slot = page.locator("#nav .nav-create-slot")
    const b = await slot.boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height - 14)
    await settle(page)
    expect(
      await page.evaluate(() => document.querySelector("#create-menu").classList.contains("open")),
      "tocar em Criar não abriu o menu",
    )
  },
  async "away-city-returns-to-the-bar"(page) {
    if (desktop(page)) return
    await snapshot(page)
    await go(page, "imoveis?cidade=Brasília")
    expect(await visible(page, "#topbar .city-chip"), "cidade de consulta fora da barra")
    await go(page, "imoveis?cidade=Manaus")
    expect(!(await visible(page, "#topbar .city-chip")), "cidade de casa voltou para a barra")
  },
  async "phone-home-follows-desktop-order"(page) {
    await snapshot(page)
    await go(page, "inicio")
    const h = await headings(page)
    if (desktop(page)) {
      expect(await page.locator(".home-desk").count(), "o desktop perdeu a Início própria")
      expect(await page.locator(".home-notice").count(), "o desktop perdeu o aviso pessoal")
      return
    }
    const order = [
      "Serviços recomendados",
      "Oportunidades",
      "Nos seus grupos",
      "Próximo encontro",
      "A comunidade procura",
      "Guia de Manaus",
    ]
    expect(
      order.every((t, i) => h[i] === t),
      `ordem das seções: ${h.join(" | ")}`,
    )
    expect(!(await page.locator("#main .home-notice").count()), "aviso repetido do sino")
    expect(!(await page.locator("#main .sponsored-section").count()), "bloco patrocinado separado")
    expect(await page.locator("#main .home-hire").count(), "sem Precisa contratar?")
    expect(
      /famílias estão chegando/.test(await page.locator("#main .home-arrival").innerText()),
      "sem a chegada pelo momento",
    )
    const last = await page
      .locator("#main .home-mob > :last-child")
      .evaluate((e) => e.classList.contains("home-biz-cta"))
    expect(last, "Tem um negócio? não ficou no fim")
  },
  async "sponsored-is-second-on-phone"(page) {
    await snapshot(page)
    await go(page, "inicio")
    const tags = await page
      .locator("#main .home-row")
      .first()
      .locator(".photo-card")
      .evaluateAll((els) => els.map((e) => /Patrocinado/.test(e.textContent)))
    const at = tags.indexOf(true)
    expect(at === (desktop(page) ? 2 : 1), `patrocinado na posição ${at + 1}`)
  },
  async "city-lives-in-the-title"(page) {
    await snapshot(page)
    await go(page, "inicio")
    if (desktop(page)) {
      expect(await visible(page, "#topbar .city-chip"), "o desktop perdeu a cidade na barra")
      return
    }
    expect(!(await visible(page, "#topbar .city-chip")), "cidade continua na barra")
    const city = page.locator("#main h1 .h1-city")
    expect((await city.innerText()).startsWith("Manaus"), "cidade fora do título")
    await city.click()
    await settle(page)
    expect(
      await page.evaluate(() => document.querySelector("#dialog")?.open),
      "tocar na cidade não abriu a troca",
    )
    await page.keyboard.press("Escape")
    await go(page, "imoveis")
    expect(!(await visible(page, "#topbar .city-chip")), "cidade na barra de uma tela interna")
  },
  async "create-sits-in-the-middle-of-the-bar"(page) {
    await snapshot(page)
    await go(page, "inicio")
    const geo = await page.evaluate(() => {
      const f = document.querySelector("#fab").getBoundingClientRect()
      const n = document.querySelector("#nav").getBoundingClientRect()
      return {
        cx: f.left + f.width / 2,
        w: innerWidth,
        fTop: f.top,
        fBottom: f.bottom,
        nTop: n.top,
        fw: f.width,
        fh: f.height,
        left: f.left,
      }
    })
    if (!phone(page)) {
      expect(geo.left < 120, `Criar fora da barra lateral: ${geo.left}`)
      return
    }
    expect(Math.abs(geo.cx - geo.w / 2) < 2, `Criar fora do centro: ${geo.cx}`)
    expect(geo.fTop < geo.nTop && geo.fBottom > geo.nTop, "Criar não fica sobre a borda da barra")
    expect(Math.abs(geo.fw - geo.fh) < 1, "Criar não é um círculo")
    const plus = await page.evaluate(() => {
      const f = document.querySelector("#fab").getBoundingClientRect()
      const i = document.querySelector("#fab md-icon").getBoundingClientRect()
      return Math.abs(f.left + f.width / 2 - (i.left + i.width / 2))
    })
    expect(plus < 1, `"+" fora do centro do círculo: ${plus}px`)
    expect(
      (await page.locator("#nav .nav-create-slot").innerText()) === "Criar",
      "sem o nome Criar na barra",
    )
    await page.locator("#fab").click()
    await settle(page)
    const menu = await page.evaluate(() => {
      const m = document.querySelector("#create-menu").getBoundingClientRect()
      return Math.abs(m.left + m.width / 2 - innerWidth / 2)
    })
    expect(menu < 3, `menu Criar fora do centro: ${menu}`)
  },
  async "bar-icons-are-svg-with-light-on-active"(page) {
    await snapshot(page)
    await go(page, "comunidade")
    const icons = await page.evaluate(() =>
      ["inicio", "comunidade", "conversas", "voce"].map((v) => {
        const b = document.querySelector(`#nav .nav-item[data-value="${v}"]`)
        return b.querySelector(".nav-svg") ? "svg" : b.querySelector(".nav-avatar")?.textContent
      }),
    )
    expect(
      icons.slice(0, 3).every((x) => x === "svg"),
      `ícones: ${icons}`,
    )
    expect(icons[3] === "RS", `Você sem as iniciais: ${icons[3]}`)
    const active = page.locator('#nav .nav-item[data-value="comunidade"]')
    expect((await active.getAttribute("aria-current")) === "page", "aba ativa sem aria-current")
    if (phone(page)) {
      const light = await active.evaluate((e) => getComputedStyle(e, "::before").content)
      expect(light !== "none", "aba ativa sem a luz")
    }
  },
  async "search-example-rotates-only-with-motion"(page) {
    if (desktop(page)) return
    await snapshot(page)
    await go(page, "inicio")
    const ex = () => page.locator("#home-search .home-search-ex").innerText()
    const first = await ex()
    expect(first === "“diarista de confiança”", `exemplo: ${first}`)
    await page.waitForTimeout(3500)
    expect((await ex()) === first, "exemplo girou com movimento reduzido")
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await go(page, "voce")
    await go(page, "inicio")
    await page.waitForTimeout(3500)
    expect((await ex()) !== first, "exemplo não girou")
  },
  async "read-only-city-and-arrival-countdown"(page) {
    if (desktop(page)) return
    // A cidade guardada volta para a de casa ao abrir; o link com ?cidade= abre outra cidade.
    await snapshot(page)
    await go(page, "inicio?cidade=Brasília")
    const title = await page.locator("#main h1").innerText()
    expect(/^Conheça Brasília/.test(title), `título em cidade de consulta: ${title}`)
    expect(!(await page.locator("#main .home-hire").count()), "Precisa contratar? em consulta")
    expect(!(await page.locator("#main .home-biz-cta").count()), "Tem um negócio? em consulta")
    await setState(page, (x) => {
      x.mode = "chegando"
    })
    await go(page, "inicio?cidade=Manaus")
    expect(
      /dias para chegar/.test(await page.locator("#main .page-head p").innerText()),
      "quem chega sem a contagem",
    )
    expect(
      /Chegando a /.test(await page.locator("#main .home-arrival").innerText()),
      "quem chega sem o guia de chegada",
    )
  },
}

// Rodada 69: o produto pago saiu do lançamento; esta prova liga a chave para continuar guardando as regras dele.
await runProof(checkpoints, "round35", { labs: { paidPlans: true } })
