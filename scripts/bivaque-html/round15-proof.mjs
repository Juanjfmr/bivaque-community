import { action, expect, go, KEY, reload, runProof, settle, snapshot } from "./proof-harness.mjs"

// Rodada 15: plano de chegada e saída como linha do tempo. Vale em todas as larguras.
async function setMode(page, mode) {
  await snapshot(page)
  await page.evaluate(
    ([k, m]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.mode = m
      for (const s of x.plan[m]) s.done = false
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, mode],
  )
  await reload(page)
  await go(page, "inicio")
}
// Dias como a pessoa conta: do meio-dia de hoje ao meio-dia da data, nunca negativo.
const daysTo = (page, field) =>
  page.evaluate(
    ([k, f]) => {
      const x = JSON.parse(localStorage.getItem(k))
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      return Math.max(
        0,
        Math.ceil((new Date(`${x[f]}T12:00:00`) - new Date(`${today}T12:00:00`)) / 864e5),
      )
    },
    [KEY, field],
  )
const steps = (page, scope = "#main") =>
  page.locator(`${scope} .plan-step`).evaluateAll((els) =>
    els.map((e) => ({
      state: ["is-done", "is-current", "is-todo"].find((c) => e.classList.contains(c)),
      now: Boolean(e.querySelector(".plan-now")),
    })),
  )

const checkpoints = {
  async "timeline-states-follow-progress"(page) {
    await setMode(page, "chegando")
    let list = await steps(page)
    expect(list.length === 3, `etapas na Início: ${list.length}`)
    expect(list[0].state === "is-current" && list[0].now, "a primeira etapa não é a próxima")
    expect(
      list.slice(1).every((s) => s.state === "is-todo"),
      "etapas pendentes com estado errado",
    )
    const first = await page
      .locator('#main [data-action="plan-check"]')
      .first()
      .getAttribute("data-value")
    await action(page, "plan-check", first)
    await settle(page)
    list = await steps(page)
    expect(
      list[0].state === "is-done" && list[1].state === "is-current",
      "concluir não avançou a próxima etapa",
    )
    expect(list.filter((s) => s.now).length === 1, "mais de uma etapa marcada como próxima")
  },
  async "days-counter-and-full-plan"(page) {
    await setMode(page, "chegando")
    const days = await page.locator("#main .plan-days").innerText()
    const expected = await daysTo(page, "arrival")
    expect(
      Number(days.match(/(\d+)\s+dias?/)?.[1]) === expected,
      `contador de chegada: ${days}, esperado ${expected}`,
    )
    await action(page, "plan", "chegando")
    await settle(page)
    const s = await snapshot(page)
    const full = await steps(page, "#dialog")
    expect(full.length === s.plan.chegando.length, "plano completo sem todas as etapas")
  },
  async "leaving-plan-uses-leave-date"(page) {
    await setMode(page, "saindo")
    expect(
      /Sua saída/.test(await page.locator("#main .plan-card").innerText()),
      "plano de saída sem título",
    )
    const days = await page.locator("#main .plan-days").innerText()
    const expected = await daysTo(page, "leaveDate")
    expect(
      Number(days.match(/(\d+)\s+dias?/)?.[1]) === expected,
      `contador de saída: ${days}, esperado ${expected}`,
    )
  },
  async "all-done-shows-ready"(page) {
    await setMode(page, "chegando")
    await page.evaluate((k) => {
      const x = JSON.parse(localStorage.getItem(k))
      for (const s of x.plan.chegando) s.done = true
      localStorage.setItem(k, JSON.stringify(x))
    }, KEY)
    await reload(page)
    await go(page, "inicio")
    const head = await page.locator("#main .plan-card").innerText()
    expect(/Tudo pronto/.test(head), "plano concluído sem Tudo pronto")
    expect(!(await page.locator("#main .plan-now").count()), "plano concluído com etapa Próxima")
  },
  async "every-icon-exists-in-embedded-font"(page) {
    await setMode(page, "saindo")
    const wide = await page.evaluate(async () => {
      await document.fonts.ready
      const names = [
        ...new Set(
          [...document.querySelectorAll(".plan-card md-icon, .home-arrival md-icon")].map((i) =>
            i.textContent.trim(),
          ),
        ),
      ]
      return names.filter((n) => {
        const s = document.createElement("span")
        s.style.cssText =
          "font-family:'Material Symbols Outlined';font-size:24px;position:absolute;white-space:nowrap"
        s.textContent = n
        document.body.append(s)
        const w = s.getBoundingClientRect().width
        s.remove()
        return w > 30
      })
    })
    expect(!wide.length, `ícones fora da fonte: ${wide.join(", ")}`)
  },
}

await runProof(checkpoints, "round15")
