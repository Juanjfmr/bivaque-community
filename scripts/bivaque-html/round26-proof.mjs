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

// Rodada 26: o cartão do plano ganha anel de progresso e "Continuar" na próxima etapa.
// Vale no celular e no desktop; o restante do cartão é o da Rodada 15.
async function setMode(page, mode, done = 0) {
  await snapshot(page)
  await page.evaluate(
    ([k, m, n]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.mode = m
      x.plan[m].forEach((s, i) => {
        s.done = i < n
      })
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, mode, done],
  )
  await reload(page)
  await go(page, "inicio")
}
const ring = (page) => page.locator("#main .plan-card .plan-ring")
const next = (page) => page.locator('#main .plan-next [data-action="plan-go"]')

const checkpoints = {
  async "ring-shows-progress"(page) {
    await setMode(page, "chegando", 2)
    const total = (await stored(page)).plan.chegando.length
    expect(
      (await ring(page).getAttribute("aria-label")) === `2 de ${total} etapas concluídas`,
      `rótulo do anel: ${await ring(page).getAttribute("aria-label")}`,
    )
    expect((await ring(page).locator("text").textContent()) === `2/${total}`, "número do anel")
    const share = await ring(page)
      .locator(".fill")
      .evaluate((c) => {
        const [dash, gap] = c.getAttribute("stroke-dasharray").split(" ").map(Number)
        return dash / gap
      })
    expect(Math.abs(share - 2 / total) < 0.01, `anel não reflete 2/${total}: ${share}`)
  },
  async "continue-opens-next-step"(page) {
    await setMode(page, "chegando", 0)
    const first = (await stored(page)).plan.chegando.find((s) => s.go)
    expect(
      (await next(page).getAttribute("data-value")) === `chegando|${first.id}`,
      "Continuar não aponta para a próxima etapa",
    )
    expect(
      (await next(page).evaluate((e) => e.ariaLabel || e.getAttribute("aria-label"))) ===
        `Continuar: ${first.t}`,
      "Continuar sem o nome da etapa para o leitor de tela",
    )
    await next(page).click()
    await settle(page)
    if (first.go[0] === "filter")
      expect(
        (await routeOf(page)).name === (first.go[1] === "imovel" ? "imoveis" : "desapegos"),
        `Continuar foi para ${(await routeOf(page)).name}`,
      )
    else
      expect(
        (await routeOf(page)).name !== "inicio" || (await page.locator("#dialog[open]").count()),
        "Continuar não levou a lugar nenhum",
      )
  },
  async "checking-a-step-updates-ring"(page) {
    await setMode(page, "chegando", 0)
    const total = (await stored(page)).plan.chegando.length
    await page.locator('#main .plan-card [data-action="plan-check"]').first().click()
    await settle(page)
    expect(
      (await ring(page).locator("text").textContent()) === `1/${total}`,
      `anel não acompanhou a marcação: ${await ring(page).locator("text").textContent()}`,
    )
  },
  async "all-done-hides-continue-and-leaving-works"(page) {
    const s = await (async () => {
      await snapshot(page)
      return stored(page)
    })()
    await setMode(page, "chegando", s.plan.chegando.length)
    expect(!(await next(page).count()), "Continuar com o plano concluído")
    await setMode(page, "saindo", 0)
    expect(
      /Sua saída/.test(await page.locator("#main .plan-card").innerText()),
      "plano de saída sem título",
    )
    expect(await ring(page).count(), "plano de saída sem anel")
  },
}

await runProof(checkpoints, "round26")
