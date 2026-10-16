import { action, expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 16: propostas lado a lado no pedido, com linhas alinhadas, destaques de menor valor e
// data mais cedo, e reordenação (padrão: ordem de chegada, sem ranking pago).
async function fixture(page, { chosen = false } = {}) {
  const s = await snapshot(page)
  const biz = s.biz.filter((b) => b.city === s.homeCity && b.claimed !== false).slice(0, 3)
  await page.evaluate(
    ([k, city, ids, chosenFlag]) => {
      const x = JSON.parse(localStorage.getItem(k))
      const at = Date.now()
      const p = (id, bizId, price, date, n) => ({
        id,
        bizId,
        price,
        date,
        validUntil: "2099-12-31",
        duration: "1 dia",
        msg: `Proposta ${n}`,
        status: chosenFlag ? (id === "p2" ? "chosen" : "declined") : "sent",
        at: at + n,
      })
      x.requests = [
        {
          id: "r-cmp",
          city,
          cat: "Casa e reparos",
          spec: null,
          hood: "Centro",
          desc: "Comparar propostas",
          when: { kind: "asap", date: null },
          photos: [],
          status: chosenFlag ? "chosen" : "open",
          chosen: chosenFlag ? "p2" : undefined,
          createdAt: at,
          expiresAt: at + 864e5,
          who: "Eu",
          mine: true,
          proposals: [
            p("p1", ids[0], { kind: "fixed", min: 400 }, "2099-03-10", 1),
            p("p2", ids[1], { kind: "range", min: 250, max: 350 }, "2099-03-05", 2),
            p("p3", ids[2], { kind: "visit" }, "2099-03-01", 3),
          ],
        },
      ]
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, s.homeCity, biz.map((b) => b.id), chosen],
  )
  await reload(page)
  await go(page, "pedido/r-cmp")
}
// Pedidos sob medida: cada um é [id, status, propostas como [preço, data, msg, duração]].
async function custom(page, requests) {
  const s = await snapshot(page)
  const ids = s.biz.filter((b) => b.city === s.homeCity && b.claimed !== false).map((b) => b.id)
  await page.evaluate(
    ([k, city, bizIds, reqs]) => {
      const x = JSON.parse(localStorage.getItem(k))
      const at = Date.now()
      x.requests = reqs.map(([rid, status, props]) => ({
        id: rid,
        city,
        cat: "Casa e reparos",
        spec: null,
        hood: "Centro",
        desc: "Pedido de teste",
        when: { kind: "asap", date: null },
        photos: [],
        status,
        createdAt: at,
        expiresAt: at + 864e5,
        who: "Eu",
        mine: true,
        proposals: props.map(([price, date, msg, duration], i) => ({
          id: `${rid}-p${i}`,
          bizId: bizIds[i],
          price,
          date,
          validUntil: "2099-12-31",
          duration: duration ?? "1 dia",
          msg: msg ?? "Olá",
          status: status === "cancelled" ? "declined" : "sent",
          at: at + i,
        })),
      }))
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, s.homeCity, ids, requests],
  )
  await reload(page)
}
const columns = (page) =>
  page.locator(".prop-col").evaluateAll((cols) =>
    cols.map((c) => ({
      id: c.querySelector('[data-action="report"]')?.dataset.value.split("|")[1],
      badges: [...c.querySelectorAll(".prop-badge")].map((b) => b.innerText.trim()),
      priceTop: Math.round(c.querySelector(".prop-price").getBoundingClientRect().top),
      label: c.querySelector('[data-action="choose-proposal"]')?.getAttribute("aria-label"),
    })),
  )

const checkpoints = {
  async "side-by-side-with-highlights"(page) {
    await fixture(page)
    const cols = await columns(page)
    expect(cols.length === 3, `colunas: ${cols.length}`)
    expect(cols.map((c) => c.id).join() === "p1,p2,p3", "ordem padrão não é a de chegada")
    const by = Object.fromEntries(cols.map((c) => [c.id, c.badges.join(" ")]))
    expect(
      /Menor valor/.test(by.p2) && !/Menor valor/.test(by.p1 + by.p3),
      `menor valor: ${JSON.stringify(by)}`,
    )
    expect(
      /Mais cedo/.test(by.p3) && !/Mais cedo/.test(by.p1 + by.p2),
      `mais cedo: ${JSON.stringify(by)}`,
    )
    const labels = new Set(cols.map((c) => c.label))
    expect(labels.size === 3 && [...labels].every(Boolean), "botões Escolher sem nome distinto")
  },
  async "rows-aligned-across-columns"(page) {
    if (page.viewportSize().width < 720) return
    await fixture(page)
    const tops = new Set((await columns(page)).map((c) => c.priceTop))
    expect(tops.size === 1, `valores desalinhados: ${[...tops].join(", ")}`)
  },
  async "sort-by-price-and-date"(page) {
    await fixture(page)
    await action(page, "proposal-sort", "price")
    await settle(page)
    expect(
      (await columns(page)).map((c) => c.id).join() === "p2,p1,p3",
      "menor valor não ordenou (a combinar por último)",
    )
    await action(page, "proposal-sort", "date")
    await settle(page)
    expect((await columns(page)).map((c) => c.id).join() === "p3,p2,p1", "mais cedo não ordenou")
    await action(page, "proposal-sort", "arrival")
    await settle(page)
    expect((await columns(page)).map((c) => c.id).join() === "p1,p2,p3", "chegada não voltou")
  },
  async "choose-still-works-and-chosen-state"(page) {
    await fixture(page)
    await page.locator('[data-action="choose-proposal"][data-value="r-cmp|p2"]').click()
    await settle(page)
    await page.locator("#confirm-dialog md-filled-button").last().click()
    await page
      .waitForFunction(
        (k) => JSON.parse(localStorage.getItem(k)).requests[0].status === "chosen",
        KEY,
        { timeout: 5000 },
      )
      .catch(() => {})
    await go(page, "pedido/r-cmp")
    const chosen = await page.locator(".prop-col.is-chosen").count()
    const declined = await page.locator(".prop-col.is-declined").count()
    expect(chosen === 1 && declined === 2, `escolhida ${chosen}, recusadas ${declined}`)
    expect(
      !(await page.locator('[data-action="choose-proposal"]').count()),
      "ainda dá para escolher",
    )
    expect(!(await page.locator(".prop-sort").count()), "ordenação depois de escolher")
  },
  async "every-icon-exists-in-embedded-font"(page) {
    await fixture(page)
    const wide = await page.evaluate(async () => {
      await document.fonts.ready
      const names = [
        ...new Set(
          [...document.querySelectorAll(".prop-compare md-icon")].map((i) => i.textContent.trim()),
        ),
      ]
      return names.filter((n) => {
        const s = document.createElement("span")
        s.style.cssText =
          "font-family:'Material Symbols Rounded';font-size:24px;position:absolute;white-space:nowrap"
        s.textContent = n
        document.body.append(s)
        const w = s.getBoundingClientRect().width
        s.remove()
        return w > 30
      })
    })
    expect(!wide.length, `ícones fora da fonte: ${wide.join(", ")}`)
  },
  async "ties-do-not-badge-everyone"(page) {
    const same = { kind: "fixed", min: 300 }
    await custom(page, [
      [
        "r-tie",
        "open",
        [
          [same, "2099-03-01"],
          [same, "2099-03-01"],
          [same, "2099-03-01"],
        ],
      ],
    ])
    await go(page, "pedido/r-tie")
    expect(!(await page.locator(".prop-badge").count()), "empate total ainda mostra selos")
  },
  async "sort-does-not-leak-between-requests"(page) {
    const props = [
      [{ kind: "fixed", min: 500 }, "2099-03-01"],
      [{ kind: "fixed", min: 100 }, "2099-03-02"],
    ]
    await custom(page, [
      ["r-a", "open", props],
      ["r-b", "open", props],
    ])
    await go(page, "pedido/r-a")
    await action(page, "proposal-sort", "price")
    await settle(page)
    await go(page, "pedido/r-b")
    const order = (await columns(page)).map((c) => c.id).join()
    expect(order === "r-b-p0,r-b-p1", `outro pedido abriu reordenado: ${order}`)
  },
  async "single-and-cancelled-have-no-sort"(page) {
    await custom(page, [
      ["r-one", "open", [[{ kind: "fixed", min: 200 }, "2099-03-01"]]],
      [
        "r-cancel",
        "cancelled",
        [
          [{ kind: "fixed", min: 200 }, "2099-03-01"],
          [{ kind: "fixed", min: 300 }, "2099-03-02"],
        ],
      ],
    ])
    await go(page, "pedido/r-one")
    expect(
      !(await page.locator(".prop-sort").count()) && !(await page.locator(".prop-badge").count()),
      "uma proposta só com ordenação ou selo",
    )
    await go(page, "pedido/r-cancel")
    expect(
      !(await page.locator(".prop-sort").count()) &&
        !(await page.locator('[data-action="choose-proposal"]').count()),
      "pedido cancelado com ordenação ou escolha",
    )
  },
  async "proposal-text-is-escaped"(page) {
    const evil = '<img src=x onerror="window.__xss=1">'
    await custom(page, [
      [
        "r-xss",
        "open",
        [
          [{ kind: "fixed", min: 200 }, "2099-03-01", evil, evil],
          [{ kind: "visit" }, "2099-03-02"],
        ],
      ],
    ])
    await go(page, "pedido/r-xss")
    expect(
      await page.evaluate(() => !document.querySelector(".prop-compare img") && !window.__xss),
      "mensagem ou prazo injetou HTML",
    )
    expect(
      /onerror/.test(await page.locator(".prop-compare").innerText()),
      "texto escapado não aparece",
    )
  },
}

await runProof(checkpoints, "round16")
