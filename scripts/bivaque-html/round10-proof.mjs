import {
  action,
  addChips,
  choose,
  dialogKind,
  expect,
  fill,
  go,
  KEY,
  reload,
  routeOf,
  runProof,
  settle,
  snapshot,
  stored,
  toast,
} from "./proof-harness.mjs"

// Rodada 10: componentes Material visíveis onde se encaixam. Slider de faixa de preço,
// chips de entrada (bairros e serviços do negócio) e chips de sugestão (buscas recentes
// e respostas rápidas na conversa, que só preenchem o rascunho).
async function step3(page) {
  await snapshot(page)
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k))
    s.signedOut = true
    s.entry = {
      account: { name: "Joana Lima", email: "joana.teste@exemplo.com", provider: "email" },
      consentAt: Date.now(),
      eligibility: "verified",
    }
    localStorage.setItem(k, JSON.stringify(s))
  }, KEY)
  await reload(page)
  await go(page, "entrar/cidade")
}
async function mode(page, value) {
  await page.locator(`#en-city-form input[name="en-mode"][value="${value}"]`).click()
  await settle(page)
}
async function openBizEditor(page) {
  await go(page, "voce")
  await action(page, "my-biz")
  expect((await dialogKind(page)) !== null, "editor de negócio não abriu")
  await fill(page, "biz-name", "Marcenaria Teste")
  await choose(page, "biz-category")
  await fill(page, "biz-hours", "Seg a sex, 8h às 18h")
}
const chips = (page, id) =>
  page
    .locator(`#${id}-chips md-input-chip`)
    .evaluateAll((els) => els.map((e) => e.dataset.chipValue))

const checkpoints = {
  async "price-slider-filters-and-resets"(page) {
    // Rodada 23: o slider de preço vive no painel da pílula "Preço" e só vale ao aplicar.
    await go(page, "desapegos")
    const cards = () => page.locator('#catalog-results [data-action="open-item"]').count()
    const pricePill = page.locator('#main [data-action="catalog-pill"][data-value="price"]')
    const all = await cards()
    expect(all > 1, "catálogo sem itens suficientes")
    await pricePill.click()
    await settle(page)
    const slider = page.locator("#fp-price")
    const max = Number(await slider.evaluate((s) => s.max))
    // Leva o máximo para baixo pelo teclado: menos itens e a pílula descreve a faixa.
    await page.locator("#fp-price input").last().focus()
    for (let i = 0; i < 40; i++) await page.keyboard.press("PageDown")
    await page.waitForTimeout(300)
    expect(Number(await slider.evaluate((s) => s.valueEnd)) < max, "máximo não mudou")
    await page.locator('#filter-panel [data-f="apply"]').click()
    await settle(page)
    const narrowed = await cards()
    const label = await pricePill.innerText()
    expect(narrowed < all, `faixa não filtrou: ${narrowed}/${all}`)
    expect(/R\$/.test(label), `pílula sem a faixa: "${label}"`)
    await pricePill.click()
    await settle(page)
    await page.locator('#filter-panel [data-f="clear"]').first().click()
    await page.locator('#filter-panel [data-f="apply"]').click()
    await settle(page)
    expect((await cards()) === all, "limpar não restaurou")
    expect(/^Preço/.test(await pricePill.innerText()), "pílula não voltou")
  },
  async "input-chips-add-remove-dedupe-persist"(page) {
    await openBizEditor(page)
    await addChips(page, "biz-hoods", ["Centro", "Adrianópolis", "centro"])
    expect(
      JSON.stringify(await chips(page, "biz-hoods")) === '["Centro","Adrianópolis"]',
      `duplicado aceito: ${await chips(page, "biz-hoods")}`,
    )
    // Vírgula também confirma; remover pelo chip.
    await page.locator("#biz-hoods-entry input").fill("Flores")
    await page.locator("#biz-hoods-entry input").press(",")
    await page
      .locator('#biz-hoods-chips md-input-chip[data-chip-value="Adrianópolis"]')
      .locator("button")
      .last()
      .click()
    await settle(page)
    expect(
      JSON.stringify(await chips(page, "biz-hoods")) === '["Centro","Flores"]',
      `remover/vírgula: ${await chips(page, "biz-hoods")}`,
    )
    // Texto digitado sem Enter também entra ao publicar.
    await page.locator("#biz-services-entry input").fill("Móveis sob medida")
    await action(page, "submit-biz")
    const s = await stored(page)
    expect(
      JSON.stringify(s.myBiz?.hoods) === '["Centro","Flores"]',
      `bairros salvos: ${JSON.stringify(s.myBiz?.hoods)}`,
    )
    expect(
      JSON.stringify(s.myBiz?.svc) === '["Móveis sob medida"]',
      `serviço pendente perdido: ${JSON.stringify(s.myBiz?.svc)}`,
    )
    await action(page, "edit-biz", s.myBiz.id)
    expect(
      JSON.stringify(await chips(page, "biz-hoods")) === '["Centro","Flores"]',
      "edição não carregou os chips",
    )
  },
  async "input-chips-require-one"(page) {
    await openBizEditor(page)
    await addChips(page, "biz-services", ["Móveis sob medida"])
    await action(page, "submit-biz")
    expect(
      (await dialogKind(page)) !== null && /bairro/i.test(await toast(page)),
      "publicou sem bairro",
    )
    expect(
      await page.evaluate(() =>
        document.querySelector("#biz-hoods-entry").matches(":focus-within"),
      ),
      "foco não foi para o campo de bairro",
    )
  },
  async "chip-remove-marks-dirty-and-paste-splits"(page) {
    await openBizEditor(page)
    // Texto com vírgulas (como ao colar uma lista) vira vários chips.
    await page.locator("#biz-hoods-entry input").fill("Centro, Bela Vista")
    await page.locator("#biz-hoods-entry input").press("Enter")
    await settle(page)
    expect(
      JSON.stringify(await chips(page, "biz-hoods")) === '["Centro","Bela Vista"]',
      `lista não separada: ${await chips(page, "biz-hoods")}`,
    )
    await addChips(page, "biz-services", ["Móveis sob medida"])
    await action(page, "submit-biz")
    const id = (await stored(page)).myBiz.id
    await action(page, "edit-biz", id)
    // Só remover um chip já é alteração: fechar precisa pedir confirmação.
    await page
      .locator('#biz-hoods-chips md-input-chip[data-chip-value="Bela Vista"]')
      .locator("button")
      .last()
      .click()
    await settle(page)
    expect(
      await page.evaluate(() =>
        document.querySelector("#biz-hoods-entry").matches(":focus-within"),
      ),
      "foco não voltou ao campo após remover o chip",
    )
    await page.keyboard.press("Escape")
    await settle(page)
    expect(
      await page.evaluate(() => document.querySelector("#confirm-dialog")?.open),
      "remoção de chip não pediu confirmação ao fechar",
    )
  },
  async "quick-reply-appends-to-draft"(page) {
    const s = await snapshot(page)
    const t = s.threads.find((x) => !x.deleted && x.city === s.homeCity)
    await go(page, `conversa/${t.id}`)
    await page.locator("#chat-input textarea").fill("Olá!")
    const chip = page.locator('[data-action="quick-reply"]:visible').first()
    const text = await chip.getAttribute("label")
    await chip.click()
    await settle(page)
    const value = await page.locator("#chat-input textarea").inputValue()
    expect(value === `Olá! ${text}`, `rascunho sobrescrito: "${value}"`)
  },
  async "quick-reply-fills-draft-only"(page) {
    const s = await snapshot(page)
    const t = s.threads.find((x) => !x.deleted && x.city === s.homeCity)
    await go(page, `conversa/${t.id}`)
    const before = (await stored(page)).threads.find((x) => x.id === t.id).msgs.length
    const chip = page.locator('[data-action="quick-reply"]:visible').first()
    const text = await chip.getAttribute("label")
    await chip.click()
    await settle(page)
    expect(
      (await page.locator("#chat-input textarea").inputValue()) === text,
      "resposta rápida não preencheu o rascunho",
    )
    expect(
      await page.evaluate(() => document.querySelector("#chat-input").matches(":focus-within")),
      "foco não foi para a mensagem",
    )
    expect(
      (await stored(page)).threads.find((x) => x.id === t.id).msgs.length === before,
      "resposta rápida enviou sozinha",
    )
    expect((await routeOf(page)).name === "conversa", "saiu da conversa")
  },
  async "quick-replies-hidden-when-cannot-send"(page) {
    await snapshot(page)
    await action(page, "prototype")
    await page.locator("#verified-test").click()
    await action(page, "apply-prototype")
    const s = await stored(page)
    const t = s.threads.find((x) => !x.deleted && x.city === s.homeCity)
    await go(page, `conversa/${t.id}`)
    expect(
      !(await page.locator('[data-action="quick-reply"]:visible').count()),
      "sugestões ativas sem permissão de enviar",
    )
  },
  async "search-keeps-suggestions-after-history"(page) {
    await go(page, "busca")
    expect(
      !(await page.getByText("Buscas recentes").count()),
      "sugestões rotuladas como recentes sem histórico",
    )
    await page.locator("#search-query input").fill("berço")
    await page.waitForTimeout(400)
    await page.locator("#search-query input").press("Enter")
    await settle(page)
    // Volta ao app depois: a busca digitada não fica no campo, o histórico fica salvo.
    await reload(page)
    await go(page, "busca")
    const recent = await page
      .locator("section", { hasText: "Buscas recentes" })
      .locator('[data-action="recent-search"]')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    const suggested = await page
      .locator("section", { hasText: "Sugestões" })
      .locator('[data-action="recent-search"]')
      .evaluateAll((els) => els.map((e) => e.dataset.value))
    expect(JSON.stringify(recent) === '["berço"]', `histórico: ${recent}`)
    expect(
      suggested.length >= 3 && !suggested.includes("berço"),
      `sugestões sumiram ou repetem: ${suggested}`,
    )
  },
  async "moment-shows-only-relevant-fields"(page) {
    // Decisão do usuário (14/10/2026): quem mora na cidade não vê campos de transferência.
    const shown = () =>
      page.evaluate(() =>
        ["#arrival-date", "#leave-date", "#destination-select"].filter((sel) => {
          const el = document.querySelector(sel)
          return el && el.getBoundingClientRect().height > 0
        }),
      )
    await action(page, "city")
    await choose(page, "moment-select", "moro")
    expect(JSON.stringify(await shown()) === "[]", `"moro" mostra campos: ${await shown()}`)
    await choose(page, "moment-select", "chegando")
    expect(JSON.stringify(await shown()) === '["#arrival-date"]', `"chegando": ${await shown()}`)
    await choose(page, "moment-select", "saindo")
    expect(
      JSON.stringify(await shown()) === '["#leave-date","#destination-select"]',
      `"saindo": ${await shown()}`,
    )
    await page.keyboard.press("Escape")
    await settle(page)
    const arrivalBefore = (await snapshot(page)).arrival
    await action(page, "city")
    await choose(page, "moment-select", "saindo")
    await page
      .locator("#leave-date")
      .fill(await page.evaluate(() => new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10)))
    await choose(page, "destination-select", "Natal")
    await action(page, "apply-city")
    const s = await stored(page)
    expect(
      s.mode === "saindo" && s.dest === "Natal" && s.arrival === arrivalBefore,
      "saída sobrescreveu a chegada",
    )
    // "Moro na cidade" aplica sem pedir data nenhuma.
    await action(page, "city")
    await choose(page, "moment-select", "moro")
    await action(page, "apply-city")
    expect(
      (await dialogKind(page)) === null && (await stored(page)).mode === "moro",
      "moro exigiu dados de transferência",
    )
  },
  // Rodada 56: os campos do momento ficam no passo 3 da entrada (antes, no cadastro em diálogo).
  async "onboarding-moment-fields"(page) {
    await step3(page)
    await mode(page, "moro")
    expect(
      (await page.locator("#en-date").count()) === 0 &&
        (await page.locator("#en-dest").count()) === 0,
      "entrada pede data ou destino para quem mora",
    )
    await mode(page, "saindo")
    expect(
      (await page.locator("#en-date").isVisible()) && (await page.locator("#en-dest").isVisible()),
      "saindo sem data ou destino",
    )
    expect(
      /Data da saída/.test(await page.locator("#main").innerText()),
      "rótulo da data não é de saída",
    )
    await mode(page, "moro")
    await choose(page, "en-city", "Manaus")
    await page.locator('#main [data-action="entry-finish"]').click()
    await settle(page)
    expect((await routeOf(page)).id === "boas-vindas", "moro não concluiu sem data")
  },
  async "onboarding-keeps-arrival-and-leave-apart"(page) {
    const day = (n) =>
      page.evaluate((k) => new Date(Date.now() + k * 864e5).toISOString().slice(0, 10), n)
    await step3(page)
    await mode(page, "chegando")
    const arrival = await day(12)
    await page.locator("#en-date").fill(arrival)
    await page.locator("#en-date").dispatchEvent("change")
    await mode(page, "saindo")
    expect(
      await page.evaluate(() =>
        document.activeElement?.matches('input[name="en-mode"][value="saindo"]'),
      ),
      "foco perdido ao trocar o momento",
    )
    expect(
      (await page.locator("#en-date").inputValue()) !== arrival,
      "data de chegada reaproveitada como saída",
    )
    const leave = await day(40)
    await page.locator("#en-date").fill(leave)
    await page.locator("#en-date").dispatchEvent("change")
    await mode(page, "chegando")
    expect(
      (await page.locator("#en-date").inputValue()) === arrival,
      "data de chegada perdida ao alternar",
    )
  },
  async "recent-search-suggestion-runs"(page) {
    await go(page, "busca")
    // Rodada 44: sugestões e recentes viraram linhas tocáveis (antes, chips de sugestão).
    const chip = page.locator('#search-results [data-action="recent-search"]').first()
    expect(await chip.count(), "sem sugestão tocável na busca")
    const term = await chip.getAttribute("data-value")
    await chip.click()
    await settle(page)
    const text = await page.locator("#main").innerText()
    expect(text.toLowerCase().includes(term.toLowerCase()), `busca "${term}" não executou`)
  },
}

await runProof(checkpoints, "round10")
