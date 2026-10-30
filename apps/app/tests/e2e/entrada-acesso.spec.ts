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
const PROJETOS_COM_CAPTURA = ["mobile-375", "tablet-768", "desktop-1440"]

/** A captura é da página inteira: o app rola dentro de #conteudo, então a
 *  rolagem interna é desfeita só para o retrato, sem tocar no layout — a altura
 *  do conteúdo vira explícita para as cadeias de 100% continuarem valendo. */
async function capturar(page: Page, nome: string, testInfo: TestInfo) {
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
  mkdirSync(PASTA_DAS_CAPTURAS, { recursive: true })
  await page.screenshot({
    path: join(PASTA_DAS_CAPTURAS, `${nome}-${testInfo.project.name}.png`),
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
  await page.getByLabel("E-mail").fill("pessoa@example.invalid")
  await page.getByRole("button", { name: "Enviar instruções" }).click()

  await expect(page.getByRole("status")).toContainText(
    "Se houver uma conta com este e-mail, as instruções chegam em instantes. Confira também o spam.",
  )
  await expect(page.getByLabel("E-mail")).toHaveValue("pessoa@example.invalid")
  await page.getByRole("button", { name: "Voltar para entrar" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
})

test("o aviso de jornada demonstrativa sai das três telas de acesso e fica nas etapas", async ({
  page,
}) => {
  const aviso = "Jornada demonstrativa: nenhuma informação é enviada ou verificada."
  for (const tela of ["login", "conta", "senha"]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect(page.getByText(aviso)).toHaveCount(0)
  }
  await page.goto("/app/entrar/aceite")
  await expect(page.getByText(aviso)).toBeVisible()
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
