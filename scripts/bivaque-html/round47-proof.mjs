import {
  expect,
  go,
  KEY,
  reload,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 47: salvar e "Útil" atualizam só o que foi tocado. Uma marca num cartão que não foi tocado
// prova que a lista não foi redesenhada.
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
const manyItems = (x) => {
  const base = x.items.find((i) => i.id === "i1")
  for (let n = 0; n < 60; n++)
    x.items.push({ ...base, id: `vol-i${n}`, title: `Volume ${n + 1}`, saved: false, mine: false })
}
const mark = (page, sel) =>
  page.evaluate((s) => (document.querySelector(s).dataset.mark = "1"), sel)
const marked = (page) => page.locator("[data-mark='1']").count()
// O botão do Material guarda aria-pressed como propriedade (é o que o leitor de tela lê).
const pressed = (loc) =>
  loc.evaluate((e) => String(e.ariaPressed ?? e.getAttribute("aria-pressed")))

const checkpoints = {
  async "saving-in-a-long-list-does-not-redraw"(page) {
    await withVolume(page, manyItems)
    await go(page, "desapegos")
    await mark(page, '[data-paged="catalog-desapego"] > .photo-card')
    const btn = page
      .locator('[data-paged="catalog-desapego"] > .photo-card')
      .nth(5)
      .locator('[data-action="save-item"]')
    const id = await btn.getAttribute("data-value")
    // Pelo teclado (Enter), o foco continua no botão trocado.
    await btn.focus()
    await page.keyboard.press("Enter")
    await settle(page)
    expect(await marked(page), "a lista foi redesenhada ao salvar")
    const now = page.locator(
      `[data-paged="catalog-desapego"] [data-action="save-item"][data-value="${id}"]`,
    )
    expect((await pressed(now)) === "true", "o botão não ficou marcado")
    expect(
      (await now.evaluate((e) => e.ariaLabel ?? e.getAttribute("aria-label"))) ===
        "Remover dos salvos",
      "rótulo do botão não mudou",
    )
    expect((await now.locator("md-icon").innerText()).trim() === "bookmark", "ícone não mudou")
    expect((await stored(page)).items.find((x) => x.id === id).saved, "não gravou")
    expect(/salvo/i.test(await toast(page)), `aviso: ${await toast(page)}`)
    expect(await now.evaluate((e) => document.activeElement === e), "o foco não voltou ao botão")
    await now.click()
    await settle(page)
    expect(
      !(await stored(page)).items.find((x) => x.id === id).saved,
      "tirar dos salvos não gravou",
    )
    expect(await marked(page), "a lista foi redesenhada ao tirar dos salvos")
  },
  async "saved-screen-still-removes-the-card"(page) {
    await snapshot(page)
    await go(page, "anuncio/i3")
    await page.locator('[data-action="save-item"][data-value="i3"]').first().click()
    await settle(page)
    expect(
      (await pressed(page.locator('[data-action="save-item"][data-value="i3"]').first())) ===
        "true",
      "a página do anúncio não marcou",
    )
    await go(page, "salvos")
    expect(
      await page.locator('#main [data-action="save-item"][data-value="i3"]').count(),
      "o salvo não apareceu em Salvos",
    )
    await page.locator('#main [data-action="save-item"][data-value="i3"]').click()
    await settle(page)
    expect(
      !(await page.locator('#main [data-action="save-item"][data-value="i3"]').count()),
      "o cartão ficou em Salvos",
    )
  },
  async "businesses-save-in-place"(page) {
    await snapshot(page)
    await go(page, "negocios")
    await mark(page, "#business-results .photo-card")
    const btn = page.locator('#business-results [data-action="save-biz"]').nth(1)
    const id = await btn.getAttribute("data-value")
    await btn.click()
    await settle(page)
    expect(await marked(page), "Negócios foi redesenhado")
    expect(
      (await pressed(
        page.locator(`#business-results [data-action="save-biz"][data-value="${id}"]`),
      )) === "true",
      "negócio não marcou",
    )
  },
  async "useful-on-the-feed-replaces-one-post"(page) {
    await withVolume(page, (x) => {
      const g = x.groups.find((i) => i.id === "g-familias")
      const base = g.posts.find((p) => p.type === "post") || g.posts[0]
      for (let n = 0; n < 12; n++)
        g.posts.push({
          ...base,
          id: `vol-p${n}`,
          type: "post",
          poll: undefined,
          text: `Publicação ${n + 1}`,
          at: base.at - (n + 1) * 6e4,
          comments: [],
          liked: false,
          useful: 0,
        })
    })
    await go(page, "grupo/g-familias")
    await mark(page, ".gpost")
    const like = page.locator('[data-action="like-post"]').nth(2)
    const value = await like.getAttribute("data-value")
    await like.click()
    await settle(page)
    expect(await marked(page), "o feed foi redesenhado")
    const now = page.locator(`[data-action="like-post"][data-value="${value}"]`)
    expect(/Útil · \d+/.test(await now.innerText()), `contagem do Útil: ${await now.innerText()}`)
    const [gid, pid] = value.split("|")
    expect(
      (await stored(page)).groups.find((g) => g.id === gid).posts.find((p) => p.id === pid).liked,
      "não gravou o Útil",
    )
  },
}

await runProof(checkpoints, "round47")
