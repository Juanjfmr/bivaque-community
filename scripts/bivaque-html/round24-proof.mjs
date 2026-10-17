import { expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 24: esqueleto só onde há espera real (fotos) e estados vazios ilustrados. Nenhuma tela
// ganha atraso artificial: os dados do protótipo são locais.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)
async function emptyFilter(page) {
  await snapshot(page)
  await go(page, "desapegos")
  await page.locator('#main [data-action="catalog-pill"][data-value="cat"]').click()
  await page.waitForTimeout(250)
  await page.locator('#filter-panel [data-field="cats"][data-v="Eletrônicos"]').click()
  await page.locator('#filter-panel [data-f="apply"]').click()
  await settle(page)
}
// Troca a foto do primeiro cartão por uma que demora (ou falha) e devolve o estado da moldura.
async function slowCover(page) {
  await page.evaluate(() => {
    const img = document.querySelector("#catalog-results .cover img")
    img.removeAttribute("loading")
    img.src = `/slow-${Date.now()}.png`
  })
  await page.waitForTimeout(150)
  return page.evaluate(() => {
    const img = document.querySelector("#catalog-results .cover img")
    const frame = img.closest(".cover")
    return {
      waiting: frame.classList.contains("img-wait"),
      shimmer: getComputedStyle(frame, "::before").content !== "none",
      opacity: getComputedStyle(img).opacity,
    }
  })
}
const frameReady = (page) =>
  page.evaluate(
    () =>
      !document
        .querySelector("#catalog-results .cover img")
        .closest(".cover")
        .classList.contains("img-wait"),
  )
const waitingInView = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll(".img-wait")].filter((f) => {
        const r = f.getBoundingClientRect()
        return r.bottom > 0 && r.top < innerHeight
      }).length,
  )

const checkpoints = {
  async "empty-state-is-illustrated-and-actionable"(page) {
    await emptyFilter(page)
    const art = page.locator("#catalog-results .empty .empty-art")
    expect(await art.count(), "estado vazio sem ilustração")
    expect(
      (await art.getAttribute("aria-hidden")) === "true",
      "ilustração lida pelo leitor de tela",
    )
    expect(
      /Nenhum desapego com esses filtros/.test(
        await page.locator("#catalog-results .empty h3").innerText(),
      ),
      "título do estado vazio mudou",
    )
    await page.locator('#catalog-results [data-action="clear-filters"]').click()
    await settle(page)
    expect(
      (await page.locator('#catalog-results [data-action="open-item"]').count()) >= 7,
      "Limpar filtros não trouxe os anúncios de volta",
    )
  },
  async "every-empty-uses-the-illustration"(page) {
    await snapshot(page)
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.threads = []
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "conversas")
    expect(await page.locator("#main .empty .empty-art").count(), "conversas vazias sem ilustração")
    await go(page, "rota-inexistente")
    expect(
      await page.locator("#main .empty .empty-art").count(),
      "página indisponível sem ilustração",
    )
  },
  async "illustration-motion-respects-preference"(page) {
    await emptyFilter(page)
    const still = await page.locator(".empty-ic").evaluate((e) => getComputedStyle(e).animationName)
    expect(still === "none", `animou com movimento reduzido: ${still}`)
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const moving = await page
      .locator(".empty-ic")
      .evaluate((e) => getComputedStyle(e).animationName)
    expect(moving === "empty-float", `sem animação com movimento permitido: ${moving}`)
  },
  async "photo-frame-shimmers-until-loaded"(page) {
    let release
    const gate = new Promise((r) => {
      release = r
    })
    await page.route("**/slow-*.png", async (route) => {
      await gate
      await route.fulfill({ status: 200, contentType: "image/png", body: PNG })
    })
    await snapshot(page)
    await go(page, "imoveis")
    const loading = await slowCover(page)
    expect(
      !loading.ready && loading.shimmer,
      `moldura sem esqueleto enquanto carrega: ${JSON.stringify(loading)}`,
    )
    expect(loading.opacity === "0", "foto incompleta aparece antes de carregar")
    release()
    await page.waitForTimeout(400)
    expect(await frameReady(page), "moldura não liberou depois de carregar")
  },
  async "failed-photo-does-not-shimmer-forever"(page) {
    await page.route("**/slow-*.png", (route) => route.abort())
    await snapshot(page)
    await go(page, "imoveis")
    await slowCover(page)
    await page.waitForTimeout(400)
    expect(await frameReady(page), "foto que falhou deixou a moldura carregando para sempre")
  },
  async "visible-photos-settle-on-first-render"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await page.waitForTimeout(500)
    const stuck = await waitingInView(page)
    expect(!stuck, `${stuck} fotos à vista continuam carregando`)
  },
  async "redraw-does-not-flash-photos"(page) {
    await snapshot(page)
    await go(page, "imoveis")
    await page.waitForTimeout(500)
    // Um toque que redesenha a tela: as fotos já decodificadas não voltam a carregar.
    const flashed = await page.evaluate(async () => {
      document.querySelector('#main [data-action="catalog-toggle"][data-value="pets"]').click()
      await Promise.resolve()
      await new Promise((r) => requestAnimationFrame(r))
      return [...document.querySelectorAll("#catalog-results .img-wait")].filter((f) => {
        const r = f.getBoundingClientRect()
        return r.bottom > 0 && r.top < innerHeight
      }).length
    })
    expect(!flashed, `${flashed} fotos piscaram no redesenho`)
  },
}

await runProof(checkpoints, "round24")
