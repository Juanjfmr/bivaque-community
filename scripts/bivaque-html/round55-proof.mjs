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

// Rodada 55: entrar (mesma mensagem para e-mail ou senha errados), recuperar a senha (resposta neutra),
// Google com o aceite em passo próprio e convite familiar sem CPF.
async function startOut(page, prep) {
  await snapshot(page)
  await page.evaluate(
    ([k, src]) => {
      const x = JSON.parse(localStorage.getItem(k))
      if (src) new Function("x", src)(x)
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, prep ? `(${prep})(x)` : ""],
  )
  await reload(page)
  await go(page, "voce")
  await page.locator('#main [data-action="sign-out"]').click()
  await settle(page)
  await confirmOk(page)
}
const err = (page) => page.locator("#en-err").innerText()
const click = async (page, action, value) => {
  await page
    .locator(`#main [data-action="${action}"]${value ? `[data-value="${value}"]` : ""}`)
    .first()
    .click()
  await settle(page)
}

const checkpoints = {
  async "login-keeps-one-message-for-wrong-email-or-password"(page) {
    await startOut(page)
    await click(page, "entry-login")
    expect((await routeOf(page)).id === "login", "Entrar não abriu o formulário")
    await fill(page, "en-email", "ninguem@exemplo.com")
    await fill(page, "en-pass-login", "senha1234")
    await click(page, "entry-login-submit")
    expect((await err(page)) === "E-mail ou senha incorretos.", `e-mail errado: ${await err(page)}`)
    await fill(page, "en-email", "rafael@exemplo.com")
    await fill(page, "en-pass-login", "curta")
    await click(page, "entry-login-submit")
    expect((await err(page)) === "E-mail ou senha incorretos.", `senha errada: ${await err(page)}`)
    await fill(page, "en-pass-login", "senha1234")
    await click(page, "entry-login-submit")
    expect((await routeOf(page)).name === "inicio", "o perfil de exemplo não entrou")
  },
  async "forgot-password-answers-the-same-for-any-email"(page) {
    await startOut(page)
    await click(page, "entry-login")
    await click(page, "entry-go", "senha")
    await fill(page, "en-email", "nao-e-email")
    await click(page, "entry-forgot-submit")
    expect(/Confira o e-mail/.test(await err(page)), `e-mail inválido: ${await err(page)}`)
    await fill(page, "en-email", "qualquer@exemplo.com")
    await click(page, "entry-forgot-submit")
    const text = await page.locator("#main").innerText()
    expect(/Se qualquer@exemplo.com puder entrar/.test(text), `resposta: ${text.slice(0, 200)}`)
  },
  async "google-asks-for-consent-in-its-own-step"(page) {
    await startOut(page)
    await click(page, "entry-join")
    await click(page, "entry-google", "conta")
    expect((await routeOf(page)).id === "aceite", "o Google não pediu o aceite")
    await click(page, "entry-google-consent")
    expect(/aceite/i.test(await err(page)), `sem aceite: ${await err(page)}`)
    await page.locator("#en-consent").click()
    await click(page, "entry-google-consent")
    expect((await routeOf(page)).id === "cpf", "o aceite não seguiu para o CPF")
    const e = (await stored(page)).entry
    expect(e.account.provider === "google" && e.consentAt, "aceite do Google não registrado")
  },
  async "family-invite-joins-without-cpf"(page) {
    await startOut(page, (x) => {
      x.invites = [...(x.invites || []), { name: "Joana Lima", code: "DEMO-TESTE01", used: false }]
    })
    await click(page, "entry-invite")
    await fill(page, "en-code", "DEMO-ERRADO")
    await click(page, "entry-invite-code")
    expect(/não existe ou já foi usado/.test(await err(page)), `código errado: ${await err(page)}`)
    await fill(page, "en-code", "demo-teste01")
    await click(page, "entry-invite-code")
    const text = await page.locator("#main").innerText()
    expect(
      /Rafael Souza convidou você/.test(text) && /não precisa de CPF/.test(text),
      `convite: ${text.slice(0, 200)}`,
    )
    expect(
      (await page.locator("#en-name input").inputValue()) === "Joana Lima",
      "nome do convite não veio preenchido",
    )
    await fill(page, "en-email", "joana@exemplo.com")
    await fill(page, "en-pass", "senha1234")
    await page.locator("#en-consent").click()
    await click(page, "entry-invite-accept")
    expect((await dialogKind(page)) === "onboarding", "o convite não seguiu para cidade e momento")
    const s = await stored(page)
    expect(s.invites.find((i) => i.code === "DEMO-TESTE01").used, "o convite não ficou usado")
    expect(
      s.entry.account.family && s.entry.eligibility === "verified",
      "conta de família não registrada",
    )
  },
  async "login-resumes-an-account-under-review"(page) {
    await startOut(page, (x) => {
      x.test = { ...(x.test || {}), portal: "pending" }
    })
    await click(page, "entry-join")
    await fill(page, "en-name", "Carla Teste")
    await fill(page, "en-email", "carla.teste@exemplo.com")
    await fill(page, "en-pass", "senha1234")
    await page.locator("#en-consent").click()
    await click(page, "entry-signup")
    await fill(page, "en-cpf", "529.982.247-25")
    await click(page, "entry-cpf")
    await click(page, "entry-cancel")
    expect((await routeOf(page)).id === null, "Sair da análise não voltou à landing")
    await go(page, "entrar/login")
    await fill(page, "en-email", "carla.teste@exemplo.com")
    await fill(page, "en-pass-login", "senha1234")
    await click(page, "entry-login-submit")
    expect((await routeOf(page)).id === "analise", "entrar não retomou a análise")
  },
}

await runProof(checkpoints, "round55")
