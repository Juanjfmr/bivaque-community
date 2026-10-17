import { expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 46: blocos também em Comunidade, busca, feed dos grupos, Conversas, Salvos e Meus
// anúncios. Cada checkpoint multiplica os dados só neste navegador.
async function withVolume(page, fill) {
  await snapshot(page)
  await page.evaluate(
    ([k, src]) => {
      const x = JSON.parse(localStorage.getItem(k))
      new Function("x", src)(x)
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, `(${fill})(x)`],
  )
  await reload(page)
}
const shown = (page, id) => page.locator(`[data-paged="${id}"] > *`).count()
const foot = (page, id) => page.locator(`[data-paged-foot="${id}"] small`).innerText()

const checkpoints = {
  async "indications-come-in-blocks"(page) {
    await withVolume(page, (x) => {
      const base = x.asks.find((a) => a.status === "open" && !a.mine && !a.fromMemory)
      for (let n = 0; n < 60; n++)
        x.asks.push({
          ...base,
          id: `vol-a${n}`,
          q: `Pergunta ${n + 1}`,
          answers: [],
          createdAt: base.createdAt - n,
        })
    })
    await go(page, "comunidade")
    expect(
      (await shown(page, "asks")) === 24,
      `perguntas no primeiro bloco: ${await shown(page, "asks")}`,
    )
    expect(
      /^Mostrando 24 de \d+ perguntas$/.test(await foot(page, "asks")),
      `contagem: ${await foot(page, "asks")}`,
    )
  },
  async "search-shows-the-first-and-see-all"(page) {
    await withVolume(page, (x) => {
      const base = x.items.find((i) => i.id === "i1")
      for (let n = 0; n < 40; n++)
        x.items.push({
          ...base,
          id: `vol-i${n}`,
          title: `Sofá volume ${n + 1}`,
          mine: false,
          saved: false,
        })
    })
    await go(page, "busca")
    await page.locator("#search-query input").fill("sofá")
    await page.waitForTimeout(600)
    const sec = page.locator("#search-results section", { hasText: "Anúncios" })
    const first = await sec.locator(".photo-card").count()
    expect(first === 4, `anúncios em Tudo: ${first}`)
    const all = sec.locator(".search-all")
    expect(
      /^Ver todos os \d+ anúncios$/.test((await all.innerText()).trim()),
      `botão: ${await all.innerText()}`,
    )
    await all.click()
    await settle(page)
    expect(
      (await shown(page, "search-items")) === 24,
      `anúncios filtrados: ${await shown(page, "search-items")}`,
    )
    expect(
      /^Mostrando 24 de \d+ anúncios$/.test(await foot(page, "search-items")),
      "busca filtrada sem contagem",
    )
  },
  async "group-feed-comes-in-tens"(page) {
    await withVolume(page, (x) => {
      const g = x.groups.find((i) => i.id === "g-familias")
      const base = g.posts.find((p) => p.type === "post") || g.posts[0]
      for (let n = 0; n < 30; n++)
        g.posts.push({
          ...base,
          id: `vol-p${n}`,
          type: "post",
          text: `Publicação ${n + 1}`,
          at: base.at - (n + 1) * 6e4,
          comments: [],
        })
    })
    await go(page, "grupo/g-familias")
    expect(
      (await shown(page, "feed-g-familias")) === 10,
      `publicações no primeiro bloco: ${await shown(page, "feed-g-familias")}`,
    )
    expect(
      /^Mostrando 10 de \d+ publicações$/.test(await foot(page, "feed-g-familias")),
      "feed sem contagem",
    )
    expect(
      /^Mostrar mais 10$/.test(
        (
          await page.locator('[data-action="list-more"][data-value="feed-g-familias"]').innerText()
        ).trim(),
      ),
      "botão do feed não diz 10",
    )
  },
  async "threads-saved-and-my-ads-come-in-blocks"(page) {
    await withVolume(page, (x) => {
      const t = x.threads[0]
      for (let n = 0; n < 40; n++)
        x.threads.push({ ...t, id: `vol-t${n}`, who: `Pessoa ${n + 1}`, pinned: false })
      const base = x.items.find((i) => i.id === "i1")
      for (let n = 0; n < 30; n++)
        x.items.push({
          ...base,
          id: `vol-s${n}`,
          title: `Salvo ${n + 1}`,
          saved: true,
          mine: false,
        })
      const mine = x.items.find((i) => i.mine)
      for (let n = 0; n < 30; n++)
        x.items.push({
          ...mine,
          id: `vol-m${n}`,
          title: `Meu ${n + 1}`,
          saved: false,
          status: "active",
        })
    })
    await go(page, "conversas")
    expect((await shown(page, "threads")) === 24, `conversas: ${await shown(page, "threads")}`)
    await go(page, "salvos")
    expect((await shown(page, "saved-items")) === 24, `salvos: ${await shown(page, "saved-items")}`)
    await go(page, "meus-anuncios")
    expect((await shown(page, "my-ads")) === 24, `meus anúncios: ${await shown(page, "my-ads")}`)
    expect(
      await page.locator('[data-paged="my-ads"] [data-action="edit-item"]').count(),
      "meus anúncios sem os botões do cartão",
    )
  },
  async "short-lists-stay-as-they-were"(page) {
    await snapshot(page)
    for (const h of ["comunidade", "conversas", "salvos", "meus-anuncios", "grupo/g-familias"]) {
      await go(page, h)
      expect(
        !(await page.locator("#main .paged-foot, #main .paged-end").count()),
        `${h} ganhou fim de bloco com poucos itens`,
      )
    }
    await go(page, "busca")
    await page.locator("#search-query input").fill("sofá")
    await page.waitForTimeout(600)
    expect(
      !(await page.locator("#search-results .search-all").count()),
      "busca curta com Ver todos",
    )
  },
  // Revisão do lote: foco no feed depois de "Mostrar mais" e artigo feminino no fim.
  async "feed-focus-and-feminine-end"(page) {
    await page.addInitScript(() => {
      window.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      }
    })
    await withVolume(page, (x) => {
      const g = x.groups.find((i) => i.id === "g-familias")
      const base = g.posts.find((p) => p.type === "post") || g.posts[0]
      for (let n = 0; n < 12; n++)
        g.posts.push({
          ...base,
          id: `vol-p${n}`,
          type: "post",
          text: `Publicação ${n + 1}`,
          at: base.at - (n + 1) * 6e4,
          comments: [],
        })
      const q = x.asks.find((a) => a.status === "open" && !a.mine && !a.fromMemory)
      for (let n = 0; n < 30; n++)
        x.asks.push({ ...q, id: `vol-a${n}`, q: `Pergunta ${n + 1}`, answers: [] })
    })
    await go(page, "grupo/g-familias")
    await page.locator('[data-action="list-more"][data-value="feed-g-familias"]').click()
    await settle(page)
    const at = await page.evaluate(() => {
      const feed = document.querySelector('[data-paged="feed-g-familias"]')
      const el = document.activeElement
      return feed.contains(el)
        ? [...feed.children].findIndex((c) => c === el || c.contains(el))
        : -1
    })
    expect(at === 10, `foco depois de Mostrar mais no feed: ${at}`)
    await go(page, "comunidade")
    await page.locator('[data-action="list-more"][data-value="asks"]').click()
    await settle(page)
    expect(
      /^Você viu as \d+ perguntas$/.test(await foot(page, "asks")),
      `fim: ${await foot(page, "asks")}`,
    )
  },
}

await runProof(checkpoints, "round46")
