import {
  confirmOk,
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
    await sendCpf(page, "111.111.111-11")
    expect(/CPF inválido/.test(await err(page)), `CPF inválido: ${await err(page)}`)
    await sendCpf(page)
    expect((await dialogKind(page)) === "onboarding", "vínculo confirmado não seguiu para a cidade")
    const raw = await page.evaluate((k) => localStorage.getItem(k), KEY)
    expect(!raw.includes("52998224725") && !raw.includes(VALID_CPF), "o CPF ficou guardado")
  },
  async "not-found-then-document-then-pending"(page) {
    await startOut(page, "notfound")
    await createAccount(page)
    await sendCpf(page)
    expect(
      (await routeOf(page)).id === "resultado",
      "vínculo não localizado sem a tela de resultado",
    )
    await page.locator("#en-doc").setInputFiles({
      name: "contracheque.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 teste"),
    })
    await settle(page)
    expect((await routeOf(page)).id === "analise", "o documento não levou à análise")
    expect(
      /Recebemos seu documento/.test(await page.locator("#main").innerText()),
      "análise sem o documento",
    )
    const s = await stored(page)
    expect(
      s.entry.doc.name === "contracheque.pdf" && s.entry.eligibility === "pending",
      "documento não registrado",
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
    expect((await dialogKind(page)) === "onboarding", "aprovação não seguiu para a cidade")
  },
  async "source-down-offers-retry"(page) {
    await startOut(page, "error")
    await createAccount(page)
    await sendCpf(page)
    expect(/fora do ar/.test(await page.locator("#main").innerText()), "fonte fora do ar sem aviso")
    await page.locator('#main [data-action="entry-go"][data-value="cpf"]').last().click()
    await settle(page)
    expect((await routeOf(page)).id === "cpf", "Tentar de novo não voltou ao CPF")
  },
}

await runProof(checkpoints, "round54")
