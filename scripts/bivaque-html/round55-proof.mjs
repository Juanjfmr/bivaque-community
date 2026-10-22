import {
  choose,
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
    // R71: a landing v8 repete "Criar conta" e "Entrar" no topo (escondido até rolar), na folha do
    // menu e no rodapé; clica no primeiro que está à vista.
    .locator(`#main [data-action="${action}"]${value ? `[data-value="${value}"]` : ""}:visible`)
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
    // Entrar só compara (a regra da senha vale para criar a conta). Sem senha, a mesma mensagem;
    // a senha digitada é apagada depois de uma falha.
    await fill(page, "en-email", "rafael@exemplo.com")
    await fill(page, "en-pass-login", "")
    await click(page, "entry-login-submit")
    expect((await err(page)) === "E-mail ou senha incorretos.", `sem senha: ${await err(page)}`)
    await fill(page, "en-email", "outra@exemplo.com")
    await fill(page, "en-pass-login", "senha1234")
    await click(page, "entry-login-submit")
    expect(
      (await page.locator("#en-pass-login input").inputValue()) === "",
      "a senha ficou no campo depois da falha",
    )
    await fill(page, "en-email", "rafael@exemplo.com")
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
    // Dá para corrigir o e-mail: "Usar outro e-mail" volta ao formulário vazio.
    await click(page, "entry-go", "senha")
    expect(
      (await page.locator("#en-email").count()) === 1 &&
        !/qualquer@exemplo.com/.test(await page.locator("#main").innerText()),
      "recuperar a senha ficou preso no envio anterior",
    )
  },
  async "google-asks-for-consent-in-its-own-step"(page) {
    await startOut(page)
    await click(page, "entry-join")
    await click(page, "entry-google", "conta")
    expect((await routeOf(page)).id === "aceite", "o Google não pediu o aceite")
    // Sair e voltar por Entrar não pula o aceite.
    await click(page, "entry-cancel")
    await click(page, "entry-login")
    await fill(page, "en-email", "conta.google@exemplo.com")
    await fill(page, "en-pass-login", "senha1234")
    await click(page, "entry-login-submit")
    expect((await routeOf(page)).id === "aceite", "voltar por Entrar pulou o aceite")
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
      const day = 864e5
      x.invites = [
        ...(x.invites || []),
        {
          name: "Joana Lima",
          email: "joana@exemplo.com",
          code: "DEMO-TESTE01",
          used: false,
          at: Date.now() - day,
        },
        {
          name: "Antigo",
          email: "antigo@exemplo.com",
          code: "DEMO-VENCIDO",
          used: false,
          at: Date.now() - 8 * day,
        },
      ]
    })
    // R71: o convite de familiar saiu da landing; o link "É cônjuge ou dependente?" fica no passo do CPF
    // e leva a #entrar/convite. Esta prova cobre o aceite do convite, então abre a rota direto.
    await go(page, "entrar/convite")
    await fill(page, "en-code", "DEMO-ERRADO")
    await click(page, "entry-invite-code")
    expect(
      /não existe, venceu ou já foi usado/.test(await err(page)),
      `código errado: ${await err(page)}`,
    )
    await fill(page, "en-code", "DEMO-VENCIDO")
    await click(page, "entry-invite-code")
    expect(/venceu/.test(await err(page)), `convite vencido aceito: ${await err(page)}`)
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
    // O convite vale só para o e-mail de quem foi convidado.
    expect(
      (await page.locator("#en-email input").inputValue()) === "joana@exemplo.com" &&
        (await page.locator("#en-email").evaluate((e) => e.readOnly)),
      "o e-mail do convite não veio fixo",
    )
    await fill(page, "en-pass", "senha1234")
    await page.locator("#en-consent").click()
    await click(page, "entry-invite-accept")
    expect((await routeOf(page)).id === "cidade", "o convite não seguiu para cidade e momento")
    let s = await stored(page)
    expect(
      s.entry.account.family &&
        s.entry.account.email === "joana@exemplo.com" &&
        s.entry.eligibility === "verified",
      "conta de família não registrada",
    )
    // O convite só é consumido quando a pessoa conclui a entrada.
    expect(
      !s.invites.find((i) => i.code === "DEMO-TESTE01").used,
      "convite consumido antes de concluir",
    )
    await choose(page, "en-city", "Manaus")
    await page.locator('#en-city-form input[name="en-mode"][value="moro"]').click()
    await click(page, "entry-finish")
    s = await stored(page)
    expect(s.invites.find((i) => i.code === "DEMO-TESTE01").used, "o convite não ficou usado")
    expect(s.profile.role === "familia", "conta de família sem o papel de família")
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
    // Entrar abre o formulário (dá para usar outra conta); com o e-mail da análise, retoma.
    await click(page, "entry-login")
    expect((await routeOf(page)).id === "login", "Entrar não abriu o formulário")
    await fill(page, "en-email", "carla.teste@exemplo.com")
    await fill(page, "en-pass-login", "senha1234")
    await click(page, "entry-login-submit")
    expect((await routeOf(page)).id === "analise", "entrar não retomou a análise")
  },
}

await runProof(checkpoints, "round55")
