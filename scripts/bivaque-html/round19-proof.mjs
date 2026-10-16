import { expect, go, KEY, reload, runProof, snapshot } from "./proof-harness.mjs"

// Rodada 19: número que sobe ao aparecer na tela e avatares de quem indicou. O HTML já traz o
// valor final; com movimento reduzido nada anima. Celular e tablet mantêm a Início original.
const desktop = (page) => page.viewportSize().width >= 1024
const counter = (page) => page.locator("#main .fact-proof [data-count-to]")

async function busiest(page) {
  const s = await snapshot(page)
  const b = s.biz
    .filter((x) => x.city === s.homeCity && x.claimed !== false && (x.says || []).length)
    .sort((a, z) => (z.recN || 0) - (a.recN || 0))[0]
  expect(b && b.recN >= 2, "sem negócio com indicações suficientes para animar")
  return b
}
async function withMotion(page) {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await reload(page)
}
// Amostra o texto do contador a cada quadro por ~1,3 s, depois de rolar até ele.
const samples = (page) =>
  page.evaluate(async () => {
    const el = document.querySelector("#main .fact-proof [data-count-to]")
    el.scrollIntoView({ block: "center" })
    const seen = []
    const t0 = performance.now()
    while (performance.now() - t0 < 1300) {
      seen.push(el.textContent)
      await new Promise((r) => requestAnimationFrame(r))
    }
    return seen
  })

const checkpoints = {
  async "reduced-motion-shows-final-value"(page) {
    const b = await busiest(page)
    await go(page, `negocio/${b.id}`)
    const seen = await samples(page)
    expect(
      seen.every((v) => v === String(b.recN)),
      `com movimento reduzido o número mudou: ${[...new Set(seen)].join(",")}`,
    )
  },
  async "count-up-runs-once-and-lands-on-final"(page) {
    const b = await busiest(page)
    await withMotion(page)
    await go(page, `negocio/${b.id}`)
    const seen = await samples(page)
    const nums = seen.map(Number)
    expect(
      nums.some((n) => n < b.recN),
      "o número não subiu",
    )
    expect(seen.at(-1) === String(b.recN), `terminou em ${seen.at(-1)}, esperado ${b.recN}`)
    expect(
      nums.every((n, i) => i === 0 || n >= nums[i - 1] || nums[i - 1] === b.recN),
      `o número voltou: ${nums.join(",")}`,
    )
    const again = await samples(page)
    expect(
      again.every((v) => v === String(b.recN)),
      "o número animou de novo ao rolar outra vez",
    )
  },
  async "final-value-in-html-before-visible"(page) {
    const b = await busiest(page)
    await withMotion(page)
    await go(page, `negocio/${b.id}`)
    await page.evaluate(() => document.querySelector("#main").scrollTo(0, 0))
    const visible = await counter(page).evaluate((el) => {
      const r = el.getBoundingClientRect()
      return r.top < innerHeight && r.bottom > 0
    })
    // A partir do tablet o fato fica na coluna lateral, sempre à vista; no celular fica bem abaixo.
    if (page.viewportSize().width >= 768) return
    expect(!visible, "no celular o contador já está à vista; a verificação ficaria vazia")
    await page.waitForTimeout(400)
    expect(
      (await counter(page).innerText()) === String(b.recN),
      "fora da tela o contador não mostra o valor final",
    )
  },
  async "rerender-does-not-replay"(page) {
    const b = await busiest(page)
    await withMotion(page)
    await go(page, `negocio/${b.id}`)
    await page.evaluate(() =>
      document
        .querySelector("#main .fact-proof [data-count-to]")
        .scrollIntoView({ block: "center" }),
    )
    await page.waitForTimeout(200)
    // Salvar redesenha a tela no meio da animação: o número novo já nasce no valor final.
    await page.locator('#detail-actions [data-action="save-biz"]').click()
    const mid = await samples(page)
    expect(
      mid.every((v) => v === String(b.recN)),
      `o número recomeçou depois de salvar: ${[...new Set(mid)].join(",")}`,
    )
    await page.locator('#detail-actions [data-action="save-biz"]').click()
    const after = await samples(page)
    expect(
      after.every((v) => v === String(b.recN)),
      "o número recomeçou ao redesenhar de novo",
    )
    expect(
      !(await page.locator("#main .fact-proof .sr").count()),
      "texto oculto do leitor de tela sobrou depois da animação",
    )
  },
  async "hostile-incoming-is-escaped"(page) {
    if (!desktop(page)) return
    await snapshot(page)
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.incoming = '"><img src=x onerror="window.__pwned=1">'
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "inicio")
    expect(
      !(await page.locator("#main .home-arrival img").count()) &&
        !(await page.evaluate(() => window.__pwned)),
      "valor de famílias chegando entrou como HTML",
    )
  },
  async "avatars-of-who-recommended"(page) {
    const b = await busiest(page)
    await go(page, `negocio/${b.id}`)
    const stack = page.locator("#main .fact-proof .avatar-stack")
    expect(
      (await stack.getAttribute("aria-hidden")) === "true",
      "avatares lidos pelo leitor de tela",
    )
    const shown = Math.min(3, b.says.length)
    const people = await stack.locator(".avatar:not(.more)").allInnerTexts()
    expect(
      people.join() ===
        b.says
          .slice(0, shown)
          .map((x) => x[0])
          .join(),
      `avatares ${people.join()} não batem com quem indicou`,
    )
    const extra = b.recN - shown
    const more = await stack.locator(".avatar.more").allInnerTexts()
    expect(
      extra > 0 ? more.join() === `+${extra}` : !more.length,
      `contagem extra errada: ${more.join() || "nenhuma"} (esperado ${extra})`,
    )
    const label = await page.locator("#main .fact-proof").innerText()
    expect(/indicações da comunidade/.test(label), "rótulo da contagem sumiu")
  },
  async "business-without-says-has-no-stack"(page) {
    const s = await snapshot(page)
    const b = s.biz.find((x) => !(x.says || []).length)
    if (!b) return
    await go(page, `negocio/${b.id}`)
    expect(
      !(await page.locator("#main .fact-proof .avatar-stack").count()),
      "avatares inventados sem relatos",
    )
  },
  async "home-cards-by-width"(page) {
    await go(page, "inicio")
    const stacks = await page.locator("#main .avatar-stack").count()
    const counts = await page.locator("#main [data-count-to]").count()
    if (!desktop(page)) {
      expect(!stacks && !counts, "a Início do celular mudou")
      return
    }
    expect(counts > 0, "Início do desktop sem contador")
    expect(stacks > 0, "cartões de serviço sem avatares")
    expect(
      !(await page.locator("#main .home-arrival .avatar-stack").count()),
      "cartão de chegada com avatares",
    )
    const bad = await page
      .locator("#main [data-count-to]")
      .evaluateAll((els) => els.filter((e) => e.textContent !== e.dataset.countTo).length)
    expect(!bad, "contador da Início sem o valor final")
  },
}

await runProof(checkpoints, "round19")
