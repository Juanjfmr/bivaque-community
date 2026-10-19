import {
  action,
  addChips,
  choose,
  expect,
  fill,
  go,
  KEY,
  reload,
  runProof,
  settle,
  snapshot,
  stored,
} from "./proof-harness.mjs"

// Rodada 68: correções das revisões do Lote Bairros. CEP nunca chega ao armazenamento, nem pelo rascunho,
// nem junto de texto ("CEP 59075-000", "Rua X, 69050-000"), nem nos bairros em que o negócio atende;
// empresa que escreveu o bairro de outro jeito recebe o pedido; alerta só guarda distância que vale.
async function patchState(page, code) {
  await snapshot(page)
  await page.evaluate(
    ([k, src]) => {
      const s = JSON.parse(localStorage.getItem(k))
      new Function("s", `{${src}}`)(s)
      localStorage.setItem(k, JSON.stringify(s))
    },
    [KEY, code],
  )
  await reload(page)
}
async function inCity(page, city) {
  await patchState(page, `s.homeCity='${city}';s.city='${city}'`)
  await go(page, `inicio?cidade=${city}`)
}
const raw = (page) => page.evaluate((k) => localStorage.getItem(k) || "", KEY)
async function openCreateChoice(page, choice) {
  await page.locator('[data-action="create"]:visible').first().click()
  await settle(page)
  await page.locator(`#create-menu [data-action="${choice}"]`).click()
  await settle(page)
}
const type = (page, id, text) => page.locator(`#${id} input`).fill(text)
const menuText = async (page, id) => {
  await page.locator(`#${id}-menu`).waitFor({ state: "visible", timeout: 3000 })
  return page.locator(`#${id}-menu`).innerText()
}

const checkpoints = {
  async "draft-never-keeps-a-cep"(page) {
    await snapshot(page)
    await go(page, "inicio")
    await openCreateChoice(page, "create-item")
    await fill(page, "item-title", "Rascunho com CEP no bairro")
    await type(page, "item-hood", "69050-000")
    await page.locator('#dialog [data-action="save-draft"]').click()
    await settle(page)
    const d = (await stored(page)).drafts?.find((x) => x.title === "Rascunho com CEP no bairro")
    expect(d && d.hood === "", `rascunho: ${JSON.stringify(d?.hood)}`)
    expect(!/69050/.test(await raw(page)), "o CEP foi gravado no rascunho")
  },

  async "cep-inside-text-is-never-a-free-hood"(page) {
    await inCity(page, "Natal")
    await openCreateChoice(page, "create-request")
    await type(page, "request-hood", "CEP 59075-000")
    const m = await menuText(page, "request-hood")
    expect(/Lagoa Nova/.test(m) && /pelo CEP/.test(m), `CEP com texto: ${m}`)
    expect(
      !(await page.locator("#request-hood-menu .hood-free").count()),
      "ofereceu usar como está",
    )
    await type(page, "request-hood", "Rua das Flores, 59075-000")
    await menuText(page, "request-hood")
    expect(!(await page.locator("#request-hood-menu .hood-free").count()), "endereço como bairro")
    const before = ((await stored(page)).requests || []).length
    await choose(page, "request-cat", "Casa e reparos")
    await fill(page, "request-desc", "Preciso trocar a fiação do quarto, com material incluso.")
    await action(page, "submit-request")
    await settle(page)
    expect(((await stored(page)).requests || []).length === before, "pedido saiu com endereço")
    expect(!/59075/.test(await raw(page)), "o CEP foi gravado")
    // "Parque 10" e outros nomes com número continuam valendo
    await type(page, "request-hood", "Vila 2")
    expect(/Usar “Vila 2” como está/.test(await menuText(page, "request-hood")), "nome com número")
  },

  async "business-hoods-reject-a-cep"(page) {
    await snapshot(page)
    await go(page, "voce")
    await action(page, "my-biz")
    await fill(page, "biz-name", "Prestador Teste")
    await choose(page, "biz-category")
    await fill(page, "biz-hours", "Seg a sex, 8h às 18h")
    await addChips(page, "biz-hoods", ["69050-000"])
    await addChips(page, "biz-services", ["Atendimento geral"])
    await action(page, "submit-biz")
    await settle(page)
    expect(!/69050/.test(await raw(page)), "o CEP entrou nos bairros do negócio")
    expect(!(await stored(page)).myBiz?.live, "a página foi publicada com CEP")
  },

  async "provider-gets-the-request-with-another-spelling"(page) {
    await patchState(
      page,
      `s.homeCity='Natal';s.city='Natal';
       const b=s.biz.find(x=>x.cat==='Casa e reparos')||s.biz[0];
       s.myBiz={...b,id:'b-r68',city:'Natal',cat:'Casa e reparos',specs:[],hoods:['candelaria'],spon:false,mine:true,live:true,claimed:true,suspended:false,paused:false};
       s.requests=[{id:'r-r68',city:'Natal',cat:'Casa e reparos',spec:null,hood:'Candelária',desc:'Preciso de um eletricista para trocar a fiação da sala, material incluso.',when:{kind:'asap',date:null},photos:[],status:'open',createdAt:Date.now()-36e5,expiresAt:Date.now()+5*864e5,who:'Paula V.',mine:false,proposals:[]}]`,
    )
    await go(page, "inicio?cidade=Natal")
    await go(page, "pedido/r-r68")
    expect(
      /trocar a fiação da sala/.test(await page.locator("#main").innerText()),
      "a empresa que escreveu candelaria não vê o pedido de Candelária",
    )
  },

  async "alert-keeps-distance-only-when-it-applies"(page) {
    await patchState(page, "s.profile.hood=''")
    await go(page, "imoveis")
    // sem bairro no perfil: o alerta não guarda nem promete distância
    await action(page, "catalog-pill", "hood")
    await page.locator("#filter-panel[open]").waitFor()
    await page.locator('#filter-panel [data-f="set"][data-field="hoods"][data-v="Centro"]').click()
    await page.locator("#fp-apply").click()
    await settle(page)
    await action(page, "search-alert")
    await settle(page)
    const al = (await stored(page)).alerts?.[0]
    expect(al && !al.attrs.dist && !/km/.test(al.label), `alerta: ${JSON.stringify(al)}`)
    // com bairro no perfil, 3 km entra no alerta e no rótulo
    await patchState(page, "s.profile.hood='Parque 10';s.alerts=[]")
    await go(page, "imoveis")
    await action(page, "catalog-pill", "hood")
    await page.locator("#filter-panel[open]").waitFor()
    await page.locator('#filter-panel [data-f="set"][data-field="dist"][data-v="3"]').click()
    await page.locator("#fp-apply").click()
    await settle(page)
    await action(page, "search-alert")
    await settle(page)
    const a3 = (await stored(page)).alerts?.[0]
    expect(
      a3?.attrs.dist === 3 && /até 3 km do seu bairro/.test(a3.label),
      `alerta 3 km: ${JSON.stringify(a3)}`,
    )
  },
}

await runProof(checkpoints, "round68")
