import {
  confirmOk,
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
} from "./proof-harness.mjs"

// Rodada 54: criar conta (aceite obrigatório, senha nunca guardada) e elegibilidade por CPF (dígitos
// conferidos, CPF nunca guardado), com os resultados: confirmado, não localizado com documento, em
// análise (conteúdo fechado) e fonte fora do ar.
const VALID_CPF = "529.982.247-25"
async function startOut(page, portal = "verified") {
  await snapshot(page)
  await page.evaluate(
    ([k, p]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.test = { ...(x.test || {}), portal: p }
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, portal],
  )
  await reload(page)
  await go(page, "voce")
  await page.locator('#main [data-action="sign-out"]').click()
  await settle(page)
  await confirmOk(page)
  await page.locator('#main [data-action="entry-join"]').click()
  await settle(page)
}
// Volta ao perfil de exemplo sem entrada em andamento, para recomeçar pelo Sair.
const signBackIn = (page) =>
  page.evaluate((k) => {
    const x = JSON.parse(localStorage.getItem(k))
    if (!x) return
    x.entry = {}
    x.signedOut = false
    localStorage.setItem(k, JSON.stringify(x))
  }, KEY)
const err = (page) => page.locator("#en-err").innerText()
async function createAccount(page, email = "carla.teste@exemplo.com") {
  await fill(page, "en-name", "Carla Teste")
  await fill(page, "en-email", email)
  await fill(page, "en-pass", "senha1234")
  await page.locator("#en-consent").click()
  await page.locator('#main [data-action="entry-signup"]').click()
  await settle(page)
}
async function sendCpf(page, cpf = VALID_CPF) {
  await fill(page, "en-cpf", cpf)
  await page.locator('#main [data-action="entry-cpf"]').click()
  await settle(page)
}

const checkpoints = {
  async "account-needs-consent-and-never-stores-the-password"(page) {
    await startOut(page)
    expect((await routeOf(page)).id === "conta", "Quero fazer parte não abriu a conta")
    await page.locator('#main [data-action="entry-signup"]').click()
    await settle(page)
    expect(/nome/i.test(await err(page)), `sem nome: ${await err(page)}`)
    await fill(page, "en-name", "Carla Teste")
    await fill(page, "en-email", "carla.teste@exemplo.com")
    await fill(page, "en-pass", "senhafraca")
    await page.locator('#main [data-action="entry-signup"]').click()
    await settle(page)
    expect(/letras e números/.test(await err(page)), `senha fraca: ${await err(page)}`)
    await fill(page, "en-pass", "senha1234")
    await page.locator('#main [data-action="entry-signup"]').click()
    await settle(page)
    expect(/aceite/i.test(await err(page)), `sem aceite: ${await err(page)}`)
    await page.locator("#en-consent").click()
    await page.locator('#main [data-action="entry-signup"]').click()
    await settle(page)
    expect((await routeOf(page)).id === "cpf", "a conta não seguiu para o CPF")
    const raw = await page.evaluate((k) => localStorage.getItem(k), KEY)
    expect(
      raw.includes("carla.teste@exemplo.com") && !raw.includes("senha1234"),
      "senha guardada ou conta não gravada",
    )
    expect(JSON.parse(raw).entry.consentAt, "aceite não registrado")
  },
  async "existing-email-is-refused"(page) {
    await startOut(page)
    await createAccount(page, "rafael@exemplo.com")
    expect(
      /já tem conta/.test(await err(page)) && (await routeOf(page)).id === "conta",
      `e-mail existente: ${await err(page)}`,
    )
  },
  async "cpf-digits-checked-and-never-stored"(page) {
    await startOut(page)
    await createAccount(page)
    await sendCpf(page, "123.456.789-00")
    expect(/CPF inválido/.test(await err(page)), `CPF inválido: ${await err(page)}`)
    await sendCpf(page)
    expect((await routeOf(page)).id === "cidade", "vínculo confirmado não seguiu para a cidade")
    const raw = await page.evaluate((k) => localStorage.getItem(k), KEY)
    expect(!raw.includes("52998224725") && !raw.includes(VALID_CPF), "o CPF ficou guardado")
  },
  // Fechamento do lote (BIVAQUE.md §4.2): todo resultado sem confirmação leva à mesma análise, com
  // envio de documento. Do arquivo fica só o tipo e o tamanho (o nome pode trazer o CPF).
  async "not-confirmed-then-document-in-the-same-review"(page) {
    await startOut(page, "notfound")
    await createAccount(page)
    await sendCpf(page)
    expect((await routeOf(page)).id === "analise", "vínculo não confirmado fora da análise")
    expect(
      /Precisamos conferir seu vínculo/.test(await page.locator("#main").innerText()),
      "análise sem o título neutro",
    )
    await page.locator("#en-doc").setInputFiles({
      name: "contracheque-52998224725.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 teste"),
    })
    await settle(page)
    expect(
      /Recebemos seu documento/.test(await page.locator("#main").innerText()),
      "análise sem o documento",
    )
    const raw = await page.evaluate((k) => localStorage.getItem(k), KEY)
    const s = JSON.parse(raw)
    expect(
      s.entry.doc.type === "PDF" && s.entry.eligibility === "pending",
      "documento não registrado",
    )
    expect(
      !raw.includes("contracheque") && !raw.includes("52998224725"),
      "nome do arquivo guardado",
    )
    await page.locator('#main [data-action="entry-notify"]').click()
    await settle(page)
    expect((await stored(page)).entry.notify, "Avise-me não ficou gravado")
  },
  async "pending-keeps-content-closed-until-approved"(page) {
    await startOut(page, "pending")
    await createAccount(page)
    await sendCpf(page)
    expect((await routeOf(page)).id === "analise", "em análise sem a tela")
    await go(page, "comunidade")
    expect((await routeOf(page)).name === "entrar", "em análise abriu o conteúdo")
    await go(page, "entrar/analise")
    await page.locator('#main [data-action="entry-approve"]').click()
    await settle(page)
    expect((await stored(page)).entry.eligibility === "verified", "aprovação não gravada")
    expect((await routeOf(page)).id === "cidade", "aprovação não seguiu para a cidade")
  },
  async "every-unconfirmed-result-looks-the-same"(page) {
    const screens = []
    for (const portal of ["notfound", "pending", "error"]) {
      await signBackIn(page)
      await startOut(page, portal)
      await createAccount(page, `teste.${portal}@exemplo.com`)
      await sendCpf(page)
      expect((await routeOf(page)).id === "analise", `${portal} fora da análise`)
      screens.push((await page.locator("#main").innerText()).replace(/teste\.\w+@exemplo\.com/, ""))
    }
    expect(new Set(screens).size === 1, "os resultados sem confirmação são diferentes")
    // Análise não é atalho: sem consulta, o endereço volta ao CPF.
    await signBackIn(page)
    await startOut(page)
    await createAccount(page)
    await go(page, "entrar/analise")
    expect((await routeOf(page)).id === "cpf", "o endereço abriu a análise sem consulta")
  },
}

await runProof(checkpoints, "round54")
