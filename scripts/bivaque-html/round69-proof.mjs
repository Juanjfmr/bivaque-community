import {
  action,
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

// Rodada 69: lançamento sem cobrança (decisão do dono em 2026-10-19). Sem a chave de laboratório
// (window.BIVAQUE_LABS.paidPlans), ninguém aparece como Patrocinado, a página do negócio conversa sem
// limite, "Planos" explica que vêm depois e o Painel do Bivaque não mostra receita de planos.
const BIZ = "b6"
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
const mainText = (page) => page.locator("#main").innerText()
const dialogText = (page) => page.locator("#dialog").innerText()
const MY_BIZ = `const b=s.biz.find(x=>x.id==='${BIZ}');s.myBiz={...b,spon:false,mine:true,live:true,claimed:true,owner:'Rafael Souza · responsável de teste'};s.biz=s.biz.filter(x=>x.id!=='${BIZ}')`
const SIX_THREADS = `s.threads=[...[1,2,3,4,5,6].map(n=>({id:'t-r69-'+n,who:['Marina L.','Caio R.','Helena P.','Otávio S.','Bianca F.','Lúcio M.'][n-1],ini:'XX',city:s.homeCity,about:{type:'biz',id:s.myBiz.id},snapshot:{title:s.myBiz.name,city:s.homeCity},msgs:[{me:false,t:'Olá! Atendem no meu bairro?',at:Date.now()-n*6e4}],unread:true,updatedAt:Date.now()-n*6e4})),...s.threads]`

const checkpoints = {
  async "nobody-is-sponsored"(page) {
    const s = await snapshot(page)
    const spon = s.biz.filter((b) => b.city === s.homeCity && b.spon)
    expect(spon.length > 0, "o exemplo deveria ter um negócio marcado como patrocinado")
    await go(page, "inicio")
    expect(!/Patrocinado/.test(await mainText(page)), "Início mostra Patrocinado")
    await go(page, "negocios")
    expect(!/Patrocinado/.test(await mainText(page)), "Negócios mostra Patrocinado")
    for (const b of spon) {
      await go(page, `negocio/${b.id}`)
      expect(!/Patrocinado/.test(await mainText(page)), `${b.name} aparece como Patrocinado`)
    }
  },

  async "the-business-page-talks-without-a-limit"(page) {
    await patchState(page, `${MY_BIZ};${SIX_THREADS}`)
    for (const n of [1, 2, 3, 4, 5, 6]) {
      await go(page, `conversa/t-r69-${n}`)
      await fill(page, "chat-input", "Olá! Atendemos sim.")
      await action(page, "send-message", `t-r69-${n}`)
      const msgs = (await stored(page)).threads.find((t) => t.id === `t-r69-${n}`).msgs
      expect(msgs.length === 2, `a resposta ${n} não foi enviada`)
    }
    expect(
      !/conversas novas/.test(await page.evaluate(() => document.body.innerText)),
      "apareceu limite de conversas",
    )
  },

  async "plans-say-they-come-later"(page) {
    await patchState(page, MY_BIZ)
    await go(page, `negocio/${BIZ}`)
    const text = await mainText(page)
    expect(/Página gratuita, com conversas sem limite/.test(text), "métricas sem a página gratuita")
    expect(!/conversas novas respondidas|Destaque/.test(text), "métricas mostram plano pago")
    await action(page, "plans")
    const d = await dialogText(page)
    expect(/página do negócio é gratuita e completa/.test(d), `planos: ${d.slice(0, 160)}`)
    expect(/nunca é vendida/.test(d), "planos sem a garantia da ordem")
    expect(!(await page.locator("#dialog md-radio").count()), "planos ainda oferecem escolha paga")
    expect(!/R\$/.test(d), "planos mostram preço")
  },

  async "the-owner-panel-shows-no-plan-revenue"(page) {
    await snapshot(page)
    await go(page, "dono")
    expect(!(await page.locator("#main .ow-kpi-revenue").count()), "visão geral mostra receita")
    await go(page, "dono/negocios")
    await settle(page)
    const text = await mainText(page)
    expect(/Lançamento sem cobrança/.test(text), "Negócios sem o aviso do lançamento")
    expect(
      !/Receita|Planos pagos|Vencem em 7 dias|R\$/.test(text),
      `Negócios com planos: ${text.slice(0, 200)}`,
    )
  },
}

await runProof(checkpoints, "round69")
