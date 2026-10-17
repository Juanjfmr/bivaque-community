import {
  expect,
  go,
  KEY,
  reload,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 30: comparar imóveis salvos lado a lado, do menor para o maior total do mês, com
// destaques só quando os valores diferem; tirar dos salvos e abrir o anúncio pela comparação.
async function saveOnly(page, ids) {
  await snapshot(page)
  await page.evaluate(
    ([k, list]) => {
      const x = JSON.parse(localStorage.getItem(k))
      for (const i of x.items) i.saved = list.includes(i.id)
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, ids],
  )
  await reload(page)
  await go(page, "salvos")
}
const cols = (page) =>
  page.locator("#dialog .cmp-col").evaluateAll((els) =>
    els.map((e) => ({
      title: e.querySelector("header b").textContent,
      badges: [...e.querySelectorAll(".prop-badge")].map((b) => b.textContent.trim()),
    })),
  )
async function openCompare(page) {
  await page.locator('#main [data-action="compare-saved"]').click()
  await settle(page)
}

const checkpoints = {
  async "entry-needs-two-saved-rentals"(page) {
    await saveOnly(page, ["i5"])
    expect(
      !(await page.locator('#main [data-action="compare-saved"]').count()),
      "comparar com um imóvel só",
    )
    await saveOnly(page, ["i5", "i2"])
    expect(
      await page.locator('#main [data-action="compare-saved"]').count(),
      "sem comparar com dois imóveis",
    )
  },
  async "sorted-by-total-with-differing-badges"(page) {
    await saveOnly(page, ["i2", "i5", "i7"])
    await openCompare(page)
    const c = await cols(page)
    expect(
      c.map((x) => x.title).join("|") ===
        "Apartamento 2 quartos|Casa 3 quartos com quintal|Apartamento 3 quartos",
      `ordem pelo total: ${c.map((x) => x.title).join("|")}`,
    )
    const has = (i, b) => c[i].badges.some((t) => t.includes(b))
    expect(
      has(0, "Menor total") && !has(1, "Menor total") && !has(2, "Menor total"),
      "menor total errado",
    )
    expect(
      has(1, "Mais quartos") && has(2, "Mais quartos") && !has(0, "Mais quartos"),
      "mais quartos errado",
    )
    expect(has(1, "Maior área") && !has(2, "Maior área"), "maior área errado")
    expect(has(0, "Disponível antes") && !has(2, "Disponível antes"), "disponível antes errado")
  },
  async "equal-values-get-no-badge"(page) {
    await saveOnly(page, ["i8", "i9"])
    await openCompare(page)
    const c = await cols(page)
    expect(
      !c.some((x) => x.badges.some((b) => b.includes("Mais quartos"))),
      "destaque de quartos com valores iguais",
    )
  },
  async "unsave-inside-compare"(page) {
    await saveOnly(page, ["i2", "i5", "i7"])
    await openCompare(page)
    await page.locator('#dialog [data-action="compare-unsave"][data-value="i2"]').click()
    await settle(page)
    expect(!(await stored(page)).items.find((x) => x.id === "i2").saved, "não tirou dos salvos")
    expect((await cols(page)).length === 2, "coluna continuou na comparação")
    expect(
      /saiu dos salvos/.test(await page.locator("#dialog").innerText()),
      "sem aviso dentro da comparação",
    )
    await page.locator('#dialog [data-action="compare-unsave"][data-value="i7"]').click()
    await settle(page)
    expect(
      !(await page.evaluate(() => document.querySelector("#dialog").open)),
      "comparação continuou com um imóvel",
    )
  },
  async "open-listing-from-compare"(page) {
    await saveOnly(page, ["i2", "i5"])
    await openCompare(page)
    await page.locator('#dialog [data-action="compare-open"][data-value="i5"]').click()
    await settle(page)
    const r = await routeOf(page)
    expect(r.name === "anuncio" && r.id === "i5", `abriu ${r.name}/${r.id}`)
  },
}

await runProof(checkpoints, "round30")
