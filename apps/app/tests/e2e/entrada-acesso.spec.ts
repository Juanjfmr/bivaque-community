import { existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { expect, type Page, type TestInfo, test } from "@playwright/test"

// Prova da composição A do acesso (ENT-001): textos, ordem do Tab, destinos,
// aceite, estado enviado e ausência de rolagem horizontal. As capturas de página
// inteira em 375, 768 e 1440 px ficam em .visual/ENT-001/ para o revisor.
//
// O cwd do script é apps/app; a raiz do repositório é encontrada subindo até o
// arquivo do workspace. `import.meta` não existe aqui (o spec é transpilado).

function raizDoRepositorio(inicio: string): string {
  let atual = inicio
  while (!existsSync(join(atual, "pnpm-workspace.yaml")) && dirname(atual) !== atual) {
    atual = dirname(atual)
  }
  return atual
}

const PASTA_DAS_CAPTURAS = join(raizDoRepositorio(process.cwd()), ".visual", "ENT-001")
const PASTA_DAS_CAPTURAS_DO_LOTE = join(raizDoRepositorio(process.cwd()), ".visual", "ENT-006")
const PASTA_DAS_CAPTURAS_DO_ACEITE = join(raizDoRepositorio(process.cwd()), ".visual", "ENT-007")
const PROJETOS_COM_CAPTURA = ["mobile-375", "tablet-768", "desktop-1440"]

/** A captura é da página inteira: o app rola dentro de #conteudo, então a
 *  rolagem interna é desfeita só para o retrato, sem tocar no layout — a altura
 *  do conteúdo vira explícita para as cadeias de 100% continuarem valendo. */
async function capturar(page: Page, nome: string, testInfo: TestInfo, pasta = PASTA_DAS_CAPTURAS) {
  const altura = await page.evaluate(() => {
    const conteudo = document.getElementById("conteudo")
    return conteudo ? Math.max(conteudo.clientHeight, conteudo.scrollHeight) : 900
  })
  await page.addStyleTag({
    content:
      "html,body,#root{height:auto!important;overflow:visible!important}" +
      '[data-casca="entrada"]{height:auto!important}' +
      `#conteudo{height:${altura}px!important;overflow:visible!important}`,
  })
  mkdirSync(pasta, { recursive: true })
  await page.screenshot({
    path: join(pasta, `${nome}-${testInfo.project.name}.png`),
    fullPage: true,
  })
}

test("login mostra a composição, o Google antes do formulário e os destinos de hoje", async ({
  page,
}) => {
  await page.goto("/app/entrar/login")
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  await expect(page.getByText("Entre com o e-mail e a senha da sua conta.")).toBeVisible()
  await expect(page.getByRole("img", { name: "Bivaque" })).toBeVisible()
  await expect(page.getByText("Muda a cidade.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible()
  await expect(page.locator('[data-icone="google"]')).toBeVisible()
  await expect(page.getByText("ou continue com e-mail")).toBeVisible()

  await page.getByRole("button", { name: "Esqueci minha senha" }).click()
  await expect(page.getByRole("heading", { name: "Esqueci minha senha." })).toBeVisible()
  await page.getByRole("button", { name: "Voltar para entrar" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()

  await page.getByRole("button", { name: "Criar conta" }).click()
  await expect(page.getByRole("heading", { name: "Vamos começar." })).toBeVisible()

  await page.goto("/app/entrar/login")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/app\/(inicio)?$/)
})

test("a ordem do Tab no login é Google, e-mail, link de senha, senha, mostrar, entrar, criar conta", async ({
  page,
}) => {
  await page.goto("/app/entrar/login")
  // A entrada foca o título depois da carga; a caminhada do Tab começa daí.
  await expect(page.locator("#titulo-da-tela")).toBeFocused()
  const ordem: string[] = []
  for (let passo = 0; passo < 7; passo += 1) {
    await page.keyboard.press("Tab")
    ordem.push(
      await page.evaluate(() => {
        const alvo = document.activeElement
        if (!(alvo instanceof HTMLElement)) return "?"
        return alvo.getAttribute("id") ?? alvo.textContent?.trim() ?? alvo.tagName
      }),
    )
  }
  expect(ordem).toEqual([
    "Continuar com Google",
    "login-email",
    "Esqueci minha senha",
    "login-senha",
    "Mostrar",
    "Entrar",
    "Criar conta",
  ])
})

test("criar conta traz a proposta de valor, o tempo e o aceite que libera o vínculo", async ({
  page,
}, testInfo) => {
  await page.goto("/app/entrar/conta")
  await expect(
    page.getByText("Militares federais, veteranos, pensionistas e famílias"),
  ).toBeVisible()
  await expect(page.getByText("Muda a cidade.")).toBeVisible()
  const valor = page.locator(".entrada-acesso-valor")
  await expect(valor).toContainText("Guia da cidade")
  await expect(valor).toContainText("Serviços indicados")
  await expect(valor).toContainText("Só entra quem tem o vínculo confirmado.")

  // Abaixo de 768 px vale o rótulo curto; de 768 para cima, o longo.
  const celular = !["tablet-768", "desktop-1440"].includes(testInfo.project.name)
  await expect(page.locator(`.entrada-acesso-${celular ? "curto" : "longo"}`).first()).toBeVisible()
  await expect(page.locator(`.entrada-acesso-${celular ? "longo" : "curto"}`).first()).toBeHidden()

  await expect(page.getByRole("heading", { name: "Vamos começar." })).toBeVisible()
  await expect(page.getByText("Crie sua conta para fazer parte da comunidade.")).toBeVisible()
  await expect(page.getByText("Leva cerca de 2 minutos.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible()
  await expect(page.getByText("ou continue com e-mail")).toBeVisible()
  await expect(page.getByText("Ao menos 8 caracteres, com letras e números.")).toBeVisible()

  await expect(page.getByRole("button", { name: "Criar conta" })).toBeDisabled()
  await page.getByRole("checkbox", { name: /Li e concordo/ }).check()
  await expect(page.getByRole("button", { name: "Criar conta" })).toBeEnabled()
  await page.getByRole("button", { name: "Criar conta" }).click()
  await expect(page.getByRole("heading", { name: "Confirme seu vínculo." })).toBeVisible()

  await page.goto("/app/entrar/conta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
})

test("recuperar senha confirma o envio sem dizer se a conta existe", async ({ page }) => {
  await page.goto("/app/entrar/senha")
  await expect(page.getByRole("heading", { name: "Esqueci minha senha." })).toBeVisible()
  await expect(
    page.getByText("Informe o e-mail da sua conta para receber as instruções."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Voltar para entrar" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()

  await page.getByRole("button", { name: "Esqueci minha senha" }).click()
  // A região do anúncio existe (vazia) antes do envio; o texto entra dentro dela.
  const regiaoDeStatus = page.getByRole("status")
  await expect(regiaoDeStatus).toHaveCount(1)
  await expect(regiaoDeStatus).toBeEmpty()
  await page.getByLabel("E-mail").fill("pessoa@example.invalid")
  await page.getByRole("button", { name: "Enviar instruções" }).click()

  await expect(regiaoDeStatus).toContainText(
    "Se houver uma conta com este e-mail, as instruções chegam em instantes. Confira também o spam.",
  )
  await expect(page.getByLabel("E-mail")).toHaveValue("pessoa@example.invalid")
  await page.getByRole("button", { name: "Voltar para entrar" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
})

test("nenhuma rota de /app/entrar/* mostra o aviso de jornada demonstrativa", async ({ page }) => {
  const aviso = "Jornada demonstrativa"
  for (const tela of [
    "conta",
    "retomar",
    "aceite",
    "cpf",
    "resultado",
    "analise",
    "documento",
    "consulta-indisponivel",
    "convite-indisponivel",
    "cidade",
    "sugestoes-grupos",
    "negocio",
    "negocio-formulario",
    "negocio-interesse",
    "boas-vindas",
    "login",
    "senha",
    "convite",
    "apagada",
  ]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect(page.getByText(aviso), tela).toHaveCount(0)
    await expect(page.locator(".entrada-cartao"), tela).toHaveCount(0)
  }
})

test("nenhuma das três telas de acesso rola na horizontal", async ({ page }) => {
  for (const tela of ["login", "conta", "senha"]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }
  await page.goto("/app/entrar/conta")
  await page.getByRole("checkbox", { name: /Li e concordo/ }).check()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

test("o tema escuro usa os tokens, troca a marca e mantém a foto e a frase", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/app/entrar/login")
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    "rgb(23, 30, 32)",
  )
  expect(
    await page
      .locator(".entrada-acesso-formulario input#login-email")
      .evaluate((campo) => getComputedStyle(campo).backgroundColor),
  ).toBe("rgb(32, 41, 43)")
  expect(
    await page
      .getByRole("img", { name: "Bivaque" })
      .evaluate((marca) => (marca as HTMLImageElement).currentSrc),
  ).toMatch(/bivaque-logo-horizontal-white\.svg$/)
  expect(
    await page.locator(".entrada-acesso-frase").evaluate((frase) => getComputedStyle(frase).color),
  ).toBe("rgb(255, 255, 255)")
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

test("o painel de criar conta respira entre a frase da marca e os itens", async ({
  page,
}, testInfo) => {
  test.skip(
    !["tablet-768", "desktop-1440"].includes(testInfo.project.name),
    "no celular os itens ficam abaixo da faixa, não do painel",
  )
  await page.goto("/app/entrar/conta")
  const frase = await page.locator(".entrada-acesso-frase").boundingBox()
  const item = await page.locator(".entrada-acesso-itens li").first().boundingBox()
  if (!frase || !item) throw new Error("frase ou item de valor ausente no painel")
  expect(item.y - (frase.y + frase.height)).toBeGreaterThanOrEqual(16)
})

test("no celular os três itens de valor ficam numa linha só, sem rolagem", async ({
  page,
}, testInfo) => {
  test.skip(
    ["tablet-768", "desktop-1440"].includes(testInfo.project.name),
    "no painel os itens viram lista vertical",
  )
  await page.goto("/app/entrar/conta")
  const topos = await page
    .locator(".entrada-acesso-itens li")
    .evaluateAll((itens) => itens.map((item) => item.getBoundingClientRect().top))
  expect(topos).toHaveLength(3)
  expect(Math.max(...topos) - Math.min(...topos)).toBeLessThanOrEqual(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test("o título da coluna do formulário cresce no desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "medida do título em 1440 px")
  await page.goto("/app/entrar/login")
  const tamanho = await page
    .locator(".entrada-acesso-formulario h1")
    .evaluate((titulo) => Number.parseFloat(getComputedStyle(titulo).fontSize))
  expect(tamanho).toBeGreaterThanOrEqual(38)
})

test("capturas de página inteira das quatro situações de acesso", async ({ page }, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  await page.goto("/app/entrar/login")
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  await capturar(page, "login", testInfo)

  await page.goto("/app/entrar/conta")
  await expect(page.getByRole("heading", { name: "Vamos começar." })).toBeVisible()
  await capturar(page, "conta", testInfo)

  await page.goto("/app/entrar/senha")
  await page.getByLabel("E-mail").fill("pessoa@example.invalid")
  await capturar(page, "senha", testInfo)

  await page.getByRole("button", { name: "Enviar instruções" }).click()
  await expect(page.getByRole("status")).toBeVisible()
  await capturar(page, "senha-enviada", testInfo)
})

// ENT-006 — retomar, convite, convite indisponível e conta apagada (F01, lote 6).

test("retomar mostra a conta em andamento, com o nome da demonstração quando não há dados", async ({
  page,
}) => {
  await page.goto("/app/entrar/retomar")
  const titulo = page.getByRole("heading", { name: "Continue de onde parou." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByText("Você começou seu cadastro e pode continuar.")).toBeVisible()
  await expect(page.getByRole("img", { name: "Bivaque" })).toBeVisible()
  expect(await page.locator(".entrada-acesso-foto").getAttribute("src")).toMatch(/chegada\.webp$/)

  // Sem dados na entrada, o cartão traz a pessoa da demonstração, lida de lib/dados,
  // e nenhum e-mail.
  const conta = page.locator(".entrada-acesso-conta")
  await expect(conta).toBeVisible()
  await expect(conta).toContainText("Rafael Souza")
  await expect(conta.locator(".entrada-acesso-avatar")).toHaveText("RS")
  await expect(conta).not.toContainText("@")

  await page.getByRole("button", { name: "Continuar cadastro" }).click()
  await expect(page.getByRole("heading", { name: "Confirme seu vínculo." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/cpf$/)

  await page.goto("/app/entrar/retomar")
  await page.getByRole("button", { name: "Usar outra conta" }).click()
  await expect(page.getByRole("heading", { name: "Vamos começar." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/conta$/)
})

test("convite pede o código em maiúsculas, o e-mail somente leitura e o aceite obrigatório", async ({
  page,
}) => {
  await page.goto("/app/entrar/convite")
  const titulo = page.getByRole("heading", { name: "Convite de família." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByText("Use o código recebido para aceitar seu convite.")).toBeVisible()
  expect(await page.locator(".entrada-acesso-foto").getAttribute("src")).toMatch(
    /landing-hero-retrato\.webp$/,
  )
  // Sem Google nem divisor nesta tela.
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toHaveCount(0)

  // Código único, em maiúsculas, monoespaçado e com espaçamento entre letras.
  const codigo = page.getByLabel("Código do convite")
  await expect(codigo).toHaveCount(1)
  await codigo.fill("k7p2-9qxa")
  await expect(codigo).toHaveValue("K7P2-9QXA")
  const estiloDoCodigo = await codigo.evaluate((campo) => {
    const estilo = getComputedStyle(campo)
    return {
      fonte: estilo.fontFamily,
      espaco: estilo.letterSpacing,
      transformacao: estilo.textTransform,
    }
  })
  expect(estiloDoCodigo.fonte).toMatch(/mono/i)
  expect(Number.parseFloat(estiloDoCodigo.espaco)).toBeGreaterThan(0)
  expect(estiloDoCodigo.transformacao).toBe("uppercase")

  await expect(page.getByLabel("Nome completo")).toBeVisible()
  const emailDoConvite = page.getByLabel("E-mail do convite")
  await expect(emailDoConvite).toHaveAttribute("readonly", "")
  expect(await emailDoConvite.evaluate((campo) => getComputedStyle(campo).backgroundColor)).toBe(
    "rgb(238, 235, 229)",
  )
  await expect(page.locator(".entrada-acesso-somente-leitura [data-icone='lock']")).toBeVisible()

  const senha = page.getByLabel("Senha")
  await expect(senha).toHaveAttribute("type", "password")
  await page.getByRole("button", { name: "Mostrar" }).click()
  await expect(senha).toHaveAttribute("type", "text")

  const aceitar = page.getByRole("button", { name: "Aceitar convite" })
  await expect(aceitar).toBeDisabled()
  await page.getByRole("checkbox", { name: /Li e concordo/ }).check()
  await expect(aceitar).toBeEnabled()
  await aceitar.click()
  await expect(page.getByRole("heading", { name: "Sua cidade e seu momento." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/cidade$/)
})

test("o convite indisponível e a conta apagada explicam e levam adiante", async ({ page }) => {
  await page.goto("/app/entrar/convite")
  await page.getByRole("button", { name: "Simular convite indisponível" }).click()

  const indisponivel = page.getByRole("heading", { name: "Convite indisponível." })
  await expect(indisponivel).toBeVisible()
  await expect(indisponivel).toBeFocused()
  await expect(page.getByText("O código não é válido ou não está mais disponível.")).toBeVisible()
  await expect(page.locator(".entrada-acesso-marco [data-icone='error']")).toBeVisible()
  expect(await page.locator(".entrada-acesso-foto").getAttribute("src")).toMatch(
    /landing-hero-retrato\.webp$/,
  )

  await page.getByRole("button", { name: "Voltar para entrar" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()

  await page.goto("/app/entrar/convite-indisponivel")
  await page.getByRole("button", { name: "Tentar outro código" }).click()
  await expect(page.getByRole("heading", { name: "Convite de família." })).toBeVisible()

  await page.goto("/app/entrar/apagada")
  const apagada = page.getByRole("heading", { name: "Conta apagada." })
  await expect(apagada).toBeVisible()
  await expect(apagada).toBeFocused()
  await expect(page.getByText("Sua conta e seus dados foram apagados.")).toBeVisible()
  await expect(page.locator(".entrada-acesso-marco [data-icone='check']")).toBeVisible()
  expect(await page.locator(".entrada-acesso-foto").getAttribute("src")).toMatch(
    /landing-hero\.webp$/,
  )

  await page.getByRole("button", { name: "Voltar ao início" }).click()
  await expect(page).toHaveURL(/\/app\/inicio$/)
})

test("o convite e a conta apagada seguem os tokens no tema escuro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/app/entrar/convite")
  await expect(page.getByRole("heading", { name: "Convite de família." })).toBeVisible()
  expect(
    await page
      .locator("#convite-codigo")
      .evaluate((campo) => getComputedStyle(campo).backgroundColor),
  ).toBe("rgb(32, 41, 43)")
  expect(
    await page
      .locator(".entrada-acesso-somente-leitura input")
      .evaluate((campo) => getComputedStyle(campo).backgroundColor),
  ).toBe("rgb(35, 45, 47)")
  expect(
    await page
      .getByRole("img", { name: "Bivaque" })
      .evaluate((marca) => (marca as HTMLImageElement).currentSrc),
  ).toMatch(/bivaque-logo-horizontal-white\.svg$/)

  await page.goto("/app/entrar/apagada")
  await expect(page.getByRole("heading", { name: "Conta apagada." })).toBeVisible()
  expect(
    await page.locator(".entrada-acesso-marco").evaluate((marco) => getComputedStyle(marco).color),
  ).toBe("rgb(236, 234, 228)")
})

test("retomar, convite, convite indisponível e conta apagada não rolam na horizontal", async ({
  page,
}) => {
  for (const tela of ["retomar", "convite", "convite-indisponivel", "apagada"]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }
})

test("capturas de página inteira do retomar, convite, convite indisponível e conta apagada", async ({
  page,
}, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  await page.goto("/app/entrar/retomar")
  await expect(page.getByRole("heading", { name: "Continue de onde parou." })).toBeVisible()
  await capturar(page, "retomar", testInfo, PASTA_DAS_CAPTURAS_DO_LOTE)

  await page.goto("/app/entrar/convite")
  await page.getByLabel("Código do convite").fill("K7P2-9QXA")
  await page.getByLabel("Nome completo").fill("Ana Souza")
  await expect(page.getByRole("heading", { name: "Convite de família." })).toBeVisible()
  await capturar(page, "convite", testInfo, PASTA_DAS_CAPTURAS_DO_LOTE)

  await page.goto("/app/entrar/convite-indisponivel")
  await expect(page.getByRole("heading", { name: "Convite indisponível." })).toBeVisible()
  await capturar(page, "convite-indisponivel", testInfo, PASTA_DAS_CAPTURAS_DO_LOTE)

  await page.goto("/app/entrar/apagada")
  await expect(page.getByRole("heading", { name: "Conta apagada." })).toBeVisible()
  await capturar(page, "apagada", testInfo, PASTA_DAS_CAPTURAS_DO_LOTE)
})

// ENT-007 — o aceite visual do dono: a composição parte do Split Sign In Form
// (21st.dev), com duas colunas iguais no desktop e faixa 16:10 no celular.

test("no desktop a composição de acesso tem duas colunas iguais e conteúdo de até 480 px", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "medida do desktop em 1440 px")
  await page.goto("/app/entrar/login")

  const colunas = await page.locator(".entrada-acesso").evaluate((tela) =>
    getComputedStyle(tela)
      .gridTemplateColumns.split(" ")
      .map((largura) => Number.parseFloat(largura)),
  )
  expect(colunas).toHaveLength(2)
  expect(Math.abs((colunas[0] ?? 0) - (colunas[1] ?? 0))).toBeLessThanOrEqual(2)

  const formulario = await page.locator(".entrada-acesso-formulario").boundingBox()
  expect(formulario?.width ?? 0).toBeGreaterThan(400)
  expect(formulario?.width ?? 0).toBeLessThanOrEqual(480)

  const tamanho = (seletor: string) =>
    page
      .locator(seletor)
      .first()
      .evaluate((elemento) => Number.parseFloat(getComputedStyle(elemento).fontSize))
  expect(await tamanho(".entrada-acesso-formulario h1")).toBeCloseTo(44, 1)
  expect(await tamanho(".entrada-acesso-apoio")).toBeCloseTo(17, 1)

  const altura = async (seletor: string) =>
    (await page.locator(seletor).first().boundingBox())?.height
  expect(await altura(".entrada-acesso-google")).toBeCloseTo(48, 0)
  expect(await altura("#login-email")).toBeCloseTo(48, 0)
  expect(await altura(".entrada-acesso-marca img")).toBeCloseTo(48, 0)
})

test("no celular o título mede 24 px e a foto da composição é 16:10", async ({
  page,
}, testInfo) => {
  test.skip(
    ["tablet-768", "desktop-1440"].includes(testInfo.project.name),
    "regra de tamanho do celular",
  )
  for (const tela of [
    "login",
    "conta",
    "senha",
    "retomar",
    "convite",
    "convite-indisponivel",
    "apagada",
  ]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect(page.locator("#titulo-da-tela"), tela).toHaveCSS("font-size", "24px")
    const foto = await page.locator(".entrada-acesso-foto").boundingBox()
    if (!foto) throw new Error(`foto ausente em ${tela}`)
    expect(Math.abs(foto.width / foto.height / 1.6 - 1), tela).toBeLessThanOrEqual(0.02)
  }
  await page.goto("/app/entrar/login")
  expect((await page.locator("#login-email").boundingBox())?.height).toBeCloseTo(44, 0)
  expect((await page.locator(".entrada-acesso-google").boundingBox())?.height).toBeCloseTo(44, 0)
})

test("capturas do aceite visual do acesso em 375, 768 e 1440 px", async ({ page }, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  for (const [nome, rota] of [
    ["01-login", "login"],
    ["02-conta", "conta"],
    ["14-retomar", "retomar"],
    ["15-senha", "senha"],
    ["16-convite", "convite"],
    ["17-convite-indisponivel", "convite-indisponivel"],
    ["18-apagada", "apagada"],
  ] as const) {
    await page.goto(`/app/entrar/${rota}`)
    await expect(page.locator("#titulo-da-tela")).toBeVisible()
    if (rota === "senha") await page.getByLabel("E-mail").fill("pessoa@example.invalid")
    if (rota === "convite") await page.getByLabel("Código do convite").fill("K7P2-9QXA")
    await capturar(page, nome, testInfo, PASTA_DAS_CAPTURAS_DO_ACEITE)
  }

  await page.goto("/app/entrar/senha")
  await page.getByLabel("E-mail").fill("pessoa@example.invalid")
  await page.getByRole("button", { name: "Enviar instruções" }).click()
  await expect(page.getByRole("status")).toBeVisible()
  await capturar(page, "15b-senha-enviada", testInfo, PASTA_DAS_CAPTURAS_DO_ACEITE)
})
