import { existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { expect, type Page, type TestInfo, test } from "@playwright/test"

// Prova da composição B da entrada (ENT-002), nas três telas do lote: aceite,
// vínculo e vínculo confirmado. Textos, passo atual, indicador acessível,
// destinos, o "porquê" aberto, a simulação que continua funcionando, foco no
// título, ausência de rolagem horizontal e o CPF que não sai do componente.
//
// As capturas de página inteira em 375, 768 e 1440 px ficam em
// .visual/ENT-002/ para o revisor comparar com as referências aprovadas.
//
// O cwd é apps/app; a raiz do repositório é encontrada subindo até o arquivo do
// workspace. `import.meta` não existe aqui (o spec é transpilado).

function raizDoRepositorio(inicio: string): string {
  let atual = inicio
  while (!existsSync(join(atual, "pnpm-workspace.yaml")) && dirname(atual) !== atual) {
    atual = dirname(atual)
  }
  return atual
}

const PASTA_DAS_CAPTURAS = join(raizDoRepositorio(process.cwd()), ".visual", "ENT-002")
const PROJETOS_COM_CAPTURA = ["mobile-375", "tablet-768", "desktop-1440"]
const AVISO_DEMONSTRATIVO = "Jornada demonstrativa"

/** A captura é da página inteira: o app rola dentro de #conteudo, então a
 *  rolagem interna é desfeita só para o retrato, sem tocar no layout. */
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

const ehCelular = (testInfo: TestInfo) =>
  !["tablet-768", "desktop-1440"].includes(testInfo.project.name)

test("aceite fica no passo 1 e o botão só destrava com o aceite", async ({ page }, testInfo) => {
  await page.goto("/app/entrar/aceite")
  const titulo = page.getByRole("heading", { name: "Só falta aceitar o combinado." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByText("Leia e aceite para continuar com sua conta Google.")).toBeVisible()
  await expect(page.getByRole("img", { name: "Etapa 1 de 5: Conta" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible()

  // Celular: legenda e barra de segmentos. Desktop: os cinco passos nomeados.
  await expect(page.locator(".entrada-etapa-legenda")).toHaveText("Etapa 1 de 5 · Conta")
  if (ehCelular(testInfo)) {
    await expect(page.locator(".entrada-etapa-legenda")).toBeVisible()
    await expect(page.locator(".entrada-etapa-opcional")).toBeHidden()
  } else {
    await expect(page.locator(".entrada-etapa-legenda")).toBeHidden()
    await expect(page.locator(".entrada-etapa-opcional")).toBeVisible()
  }

  await expect(page.getByRole("button", { name: "Aceitar e continuar" })).toBeDisabled()
  await page.getByRole("checkbox", { name: /Li e concordo/ }).check()
  await expect(page.getByRole("button", { name: "Aceitar e continuar" })).toBeEnabled()
  await page.getByRole("button", { name: "Aceitar e continuar" }).click()
  await expect(page.getByRole("heading", { name: "Confirme seu vínculo." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/cpf$/)

  // "Sair" leva ao login a partir de qualquer etapa.
  await page.goto("/app/entrar/aceite")
  await page.getByRole("button", { name: "Sair" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
})

test("vínculo mostra o aviso do cadeado, o porquê já aberto e leva ao resultado", async ({
  page,
}, testInfo) => {
  await page.goto("/app/entrar/cpf")
  const titulo = page.getByRole("heading", { name: "Confirme seu vínculo." })
  await expect(titulo).toBeFocused()
  await expect(page.getByText("Vamos conferir seu CPF para confirmar seu vínculo.")).toBeVisible()
  await expect(page.getByRole("img", { name: "Etapa 2 de 5: Vínculo" })).toBeVisible()
  if (ehCelular(testInfo)) {
    await expect(page.locator(".entrada-etapa-legenda")).toBeVisible()
  } else {
    await expect(page.locator(".entrada-etapa-legenda")).toBeHidden()
  }
  await expect(page.locator(".entrada-etapa-legenda")).toHaveText("Etapa 2 de 5 · Vínculo")

  // Conta concluída, Vínculo atual e as três etapas seguintes em aberto.
  await expect(page.locator('.entrada-etapa-passo[data-estado="concluido"]')).toHaveCount(1)
  await expect(page.locator('.entrada-etapa-passo[data-estado="atual"]')).toHaveCount(1)
  await expect(page.locator('.entrada-etapa-passo[data-estado="futuro"]')).toHaveCount(3)

  const cpf = page.getByLabel("CPF")
  await expect(cpf).toBeVisible()
  await expect(cpf).toHaveAttribute("inputmode", "numeric")
  await expect(cpf).toHaveAttribute("autocomplete", "off")
  await expect(
    page.getByText("Seu CPF é usado só nesta consulta e não fica guardado."),
  ).toBeVisible()

  const detalhe = page.locator("details.entrada-etapa-detalhe")
  await expect(detalhe).toHaveAttribute("open", "")
  await expect(page.getByText("Por que pedimos seu CPF?")).toBeVisible()
  await expect(
    page.getByText(
      "Conferimos na fonte oficial se você é militar federal da ativa, veterano ou pensionista. Leva poucos segundos. Familiares entram pelo convite, sem CPF.",
    ),
  ).toBeVisible()

  await expect(page.getByRole("button", { name: "Usar convite" })).toBeVisible()

  // A simulação da demonstração continua funcionando, agora como texto discreto.
  await page.getByRole("button", { name: "Simular consulta indisponível" }).click()
  await expect(
    page.getByRole("heading", { name: "Não foi possível concluir a consulta." }),
  ).toBeVisible()

  await page.goto("/app/entrar/cpf")
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByRole("heading", { name: "Vínculo confirmado." })).toBeVisible()
})

test("vínculo confirmado traz o ícone, o título do passo 2 e o destino da cidade", async ({
  page,
}) => {
  await page.goto("/app/entrar/resultado")
  const titulo = page.getByRole("heading", { name: "Vínculo confirmado." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByText("Tudo certo. Agora escolha sua cidade.")).toBeVisible()
  await expect(page.getByRole("img", { name: "Etapa 2 de 5: Vínculo" })).toBeVisible()
  await expect(page.locator(".entrada-etapa-confirmacao")).toBeVisible()

  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByRole("heading", { name: "Sua cidade e seu momento." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/cidade$/)
})

test("as três etapas não têm o aviso de jornada demonstrativa", async ({ page }) => {
  for (const tela of ["aceite", "cpf", "resultado"]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect(page.getByText(AVISO_DEMONSTRATIVO), tela).toHaveCount(0)
  }
})

test("a ordem do Tab começa em Sair e segue para o conteúdo", async ({ page }) => {
  await page.goto("/app/entrar/cpf")
  // A entrada foca o título ao abrir. Dele, Shift+Tab volta para a barra: é a
  // prova de que "Sair" vem antes do conteúdo na ordem natural.
  await expect(page.locator("#titulo-da-tela")).toBeFocused()
  const ordem: string[] = []
  const anotar = async () =>
    ordem.push(
      await page.evaluate(() => {
        const alvo = document.activeElement
        if (!(alvo instanceof HTMLElement)) return "?"
        return alvo.getAttribute("id") ?? alvo.textContent?.trim() ?? alvo.tagName
      }),
    )
  await page.keyboard.press("Shift+Tab")
  await anotar()
  for (let passo = 0; passo < 3; passo += 1) {
    await page.keyboard.press("Tab")
    await anotar()
  }
  expect(ordem).toEqual(["Sair", "entrar-cpf", "Por que pedimos seu CPF?", "Continuar"])
})

test("as três etapas não rolam na horizontal", async ({ page }) => {
  for (const tela of ["aceite", "cpf", "resultado"]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }
})

test("o CPF digitado não aparece em localStorage, sessionStorage nem na URL", async ({ page }) => {
  const digitado = "529.982.247-25"
  const digitos = digitado.replace(/\D/g, "")
  await page.goto("/app/entrar/cpf")
  await page.getByLabel("CPF").fill(digitado)
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByRole("heading", { name: "Vínculo confirmado." })).toBeVisible()

  const guardado = await page.evaluate(() => {
    const tudo = (armazem: Storage) => {
      const itens: string[] = []
      for (let indice = 0; indice < armazem.length; indice += 1) {
        const chave = armazem.key(indice)
        if (chave === null) continue
        itens.push(chave, armazem.getItem(chave) ?? "")
      }
      return itens.join(" ")
    }
    return `${tudo(localStorage)} ${tudo(sessionStorage)}`
  })
  expect(guardado).not.toContain(digitado)
  expect(guardado).not.toContain(digitos)
  expect(page.url()).not.toContain(digitos)
  expect(page.url()).not.toContain(encodeURIComponent(digitado))
})

test("capturas de página inteira de aceite, vínculo e vínculo confirmado", async ({
  page,
}, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  for (const [tela, titulo] of [
    ["aceite", "Só falta aceitar o combinado."],
    ["cpf", "Confirme seu vínculo."],
    ["resultado", "Vínculo confirmado."],
  ] as const) {
    await page.goto(`/app/entrar/${tela}`)
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible()
    await capturar(page, tela, testInfo)
  }
})
