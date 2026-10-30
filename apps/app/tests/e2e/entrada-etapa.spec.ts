import { existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { expect, type Page, type TestInfo, test } from "@playwright/test"

// Prova da composição B da entrada: as telas do lote ENT-002 (aceite, vínculo e
// vínculo confirmado) e as do lote ENT-003 (consulta indisponível, documento e
// análise). Textos, passo atual, indicador acessível, destinos, o "porquê" aberto,
// a simulação que continua funcionando, o arquivo que nunca expõe o nome, foco no
// título, ausência de rolagem horizontal e o CPF que não sai do componente.
//
// As capturas de página inteira em 375, 768 e 1440 px ficam em
// .visual/ENT-002/ e .visual/ENT-003/ para o revisor comparar com as referências
// aprovadas.
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
const PASTA_DAS_CAPTURAS_DO_LOTE = join(raizDoRepositorio(process.cwd()), ".visual", "ENT-003")
const PROJETOS_COM_CAPTURA = ["mobile-375", "tablet-768", "desktop-1440"]
const AVISO_DEMONSTRATIVO = "Jornada demonstrativa"

/** A captura é da página inteira: o app rola dentro de #conteudo, então a
 *  rolagem interna é desfeita só para o retrato, sem tocar no layout. */
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

const ehCelular = (testInfo: TestInfo) =>
  !["tablet-768", "desktop-1440"].includes(testInfo.project.name)

// O nome do documento pode trazer o CPF: é por isso que a tela mostra só o tipo e
// o tamanho, e o teste procura o nome no texto e em todos os atributos do DOM.
const NOME_COM_CPF = "12345678909.pdf"
const DOCUMENTO_DE_EXEMPLO = Buffer.from("%PDF-1.4\n% exemplo sem conteudo\n")

const ESCOLHER_ARQUIVO = 'input[type="file"]'
const ERRO_DE_ARQUIVO = "Escolha um PDF, JPG ou PNG de até 10 MB."

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

test("as etapas não têm o aviso de jornada demonstrativa", async ({ page }) => {
  for (const tela of [
    "aceite",
    "cpf",
    "resultado",
    "consulta-indisponivel",
    "documento",
    "analise",
  ]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect(page.getByText(AVISO_DEMONSTRATIVO), tela).toHaveCount(0)
    await expect(page.getByText("Na demonstração"), tela).toHaveCount(0)
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

test("as etapas não rolam na horizontal", async ({ page }) => {
  for (const tela of [
    "aceite",
    "cpf",
    "resultado",
    "consulta-indisponivel",
    "documento",
    "analise",
  ]) {
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

// ENT-003 — consulta indisponível, documento e análise (F01, lote 3).

test("no indicador, o passo 5 não tem traço entre o círculo e o rótulo", async ({
  page,
}, testInfo) => {
  test.skip(ehCelular(testInfo), "no celular o indicador é a legenda com a barra de segmentos")
  await page.goto("/app/entrar/cpf")
  const ultimo = page.locator(".entrada-etapa-passo:last-child")
  await expect(ultimo.locator(".entrada-etapa-rotulo")).toHaveText(/Negócio\s*opcional/)

  // O conector entre círculos não pode sobrar no último passo: ele fica sem
  // caixa (display:none), e só o círculo e o rótulo desenham ali.
  const filhos = await ultimo.locator("xpath=./*").evaluateAll((elementos) =>
    elementos.map((elemento) => {
      const caixa = elemento.getBoundingClientRect()
      return { classe: elemento.getAttribute("class") ?? "", altura: caixa.height, topo: caixa.top }
    }),
  )
  const visiveis = filhos.filter((filho) => filho.altura > 0)
  expect(visiveis.map((filho) => filho.classe)).toEqual([
    "entrada-etapa-circulo",
    "entrada-etapa-rotulo",
  ])
  expect(visiveis[0]?.topo).toBeLessThan(visiveis[1]?.topo ?? 0)
})

test("o check do vínculo confirmado tem pelo menos 36 px no círculo de 72 px", async ({ page }) => {
  await page.goto("/app/entrar/resultado")
  const circulo = page.locator(".entrada-etapa-confirmacao")
  await expect(circulo).toBeVisible()
  expect((await circulo.boundingBox())?.width).toBe(72)
  const check = await circulo.locator('[data-icone="check"]').boundingBox()
  if (!check) throw new Error("check ausente dentro do círculo de confirmação")
  expect(check.width).toBeGreaterThanOrEqual(36)
  expect(check.height).toBeGreaterThanOrEqual(36)
})

test("consulta indisponível explica a causa e leva ao vínculo ou ao documento", async ({
  page,
}) => {
  await page.goto("/app/entrar/consulta-indisponivel")
  const titulo = page.getByRole("heading", { name: "Não foi possível concluir a consulta." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByRole("img", { name: "Etapa 2 de 5: Vínculo" })).toBeVisible()
  await expect(page.locator('[data-icone="search_off"]')).toBeVisible()
  await expect(
    page.getByText("A fonte oficial está fora do ar agora. Não é nada com seus dados."),
  ).toBeVisible()
  await expect(
    page.getByText("Tente novamente em alguns minutos ou envie sua identidade para análise."),
  ).toBeVisible()

  await page.getByRole("button", { name: "Enviar identidade" }).click()
  await expect(page.getByRole("heading", { name: "Envie sua identidade." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/documento$/)

  await page.goto("/app/entrar/consulta-indisponivel")
  await page.getByRole("button", { name: "Tentar novamente" }).click()
  await expect(page.getByRole("heading", { name: "Confirme seu vínculo." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/cpf$/)
})

test("documento mostra só o tipo e o tamanho, nunca o nome do arquivo", async ({ page }) => {
  await page.goto("/app/entrar/documento")
  const titulo = page.getByRole("heading", { name: "Envie sua identidade." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByRole("img", { name: "Etapa 2 de 5: Vínculo" })).toBeVisible()
  await expect(
    page.getByText(
      "Se a consulta por CPF não for concluída, você pode enviar sua identidade militar digital.",
    ),
  ).toBeVisible()
  await expect(
    page.getByText("Envie um único arquivo completo. PDF, JPG ou PNG, até 10 MB."),
  ).toBeVisible()
  await expect(page.getByText("Selecionar arquivo")).toBeVisible()
  await expect(page.locator(ESCOLHER_ARQUIVO)).toHaveAttribute(
    "accept",
    ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
  )

  const envio = page.getByRole("button", { name: "Enviar arquivo" })
  await expect(envio).toBeDisabled()

  await page.locator(ESCOLHER_ARQUIVO).setInputFiles({
    name: NOME_COM_CPF,
    mimeType: "application/pdf",
    buffer: DOCUMENTO_DE_EXEMPLO,
  })
  await expect(page.getByText(/^PDF · \d+ KB$/)).toBeVisible()
  await expect(page.getByText("Trocar arquivo")).toBeVisible()
  await expect(envio).toBeEnabled()

  // O nome pode trazer o CPF: não pode aparecer no texto nem em atributo nenhum.
  const comNome = await page.evaluate(() => {
    const valores: string[] = []
    for (const elemento of document.querySelectorAll("*")) {
      for (const atributo of elemento.attributes) valores.push(atributo.value)
    }
    return `${document.body.innerText} ${valores.join(" ")}`
  })
  expect(comNome).not.toContain(NOME_COM_CPF)
  expect(comNome).not.toContain("12345678909")

  await envio.click()
  await expect(page.getByRole("heading", { name: "Vínculo em análise." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/analise$/)

  await page.goto("/app/entrar/documento")
  await page.getByRole("button", { name: "Voltar" }).click()
  await expect(page.getByRole("heading", { name: "Confirme seu vínculo." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/cpf$/)
})

test("documento recusa tipo ou tamanho inválido e mantém o envio travado", async ({ page }) => {
  await page.goto("/app/entrar/documento")
  const envio = page.getByRole("button", { name: "Enviar arquivo" })
  const erro = page.getByRole("alert")

  await page.locator(ESCOLHER_ARQUIVO).setInputFiles({
    name: "identidade.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("não é documento"),
  })
  await expect(erro).toHaveText(ERRO_DE_ARQUIVO)
  await expect(envio).toBeDisabled()

  // PDF acima de 10 MB: o tipo serve, o tamanho não.
  await page.locator(ESCOLHER_ARQUIVO).setInputFiles({
    name: "identidade.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  })
  await expect(erro).toHaveText(ERRO_DE_ARQUIVO)
  await expect(envio).toBeDisabled()
  await expect(page.getByText(/^PDF · /)).toHaveCount(0)

  // Um arquivo válido limpa o erro e libera o envio.
  await page.locator(ESCOLHER_ARQUIVO).setInputFiles({
    name: "identidade.pdf",
    mimeType: "application/pdf",
    buffer: DOCUMENTO_DE_EXEMPLO,
  })
  await expect(erro).toHaveCount(0)
  await expect(envio).toBeEnabled()
})

test("análise traz a linha do tempo com o marco atual acessível", async ({ page }) => {
  await page.goto("/app/entrar/analise")
  const titulo = page.getByRole("heading", { name: "Vínculo em análise." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByRole("img", { name: "Etapa 2 de 5: Vínculo" })).toBeVisible()
  await expect(page.getByText("Acompanhe as etapas da análise por aqui.")).toBeVisible()

  const marcos = page.locator("ol.entrada-linha > li")
  await expect(marcos).toHaveCount(3)
  await expect(marcos.nth(0)).toHaveText(/Documento enviado/)
  await expect(marcos.nth(1)).toHaveText(/Em análise\s*Até 2 dias úteis, normalmente no mesmo dia/)
  await expect(marcos.nth(2)).toHaveText(/Resultado\s*Você recebe um aviso assim que liberar/)

  const atual = page.locator('ol.entrada-linha > li[aria-current="step"]')
  await expect(atual).toHaveCount(1)
  await expect(atual).toHaveText(/Em análise/)

  const aviso = page.getByRole("checkbox", { name: "Avise-me quando houver uma atualização." })
  await expect(aviso).not.toBeChecked()
  await aviso.check()
  await expect(aviso).toBeChecked()

  await page.getByRole("button", { name: "Substituir documento" }).click()
  await expect(page.getByRole("heading", { name: "Envie sua identidade." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/documento$/)
})

test("capturas de página inteira de consulta, documento e análise", async ({ page }, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  for (const [tela, titulo] of [
    ["consulta-indisponivel", "Não foi possível concluir a consulta."],
    ["documento", "Envie sua identidade."],
    ["analise", "Vínculo em análise."],
  ] as const) {
    await page.goto(`/app/entrar/${tela}`)
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible()
    await capturar(page, tela, testInfo, PASTA_DAS_CAPTURAS_DO_LOTE)
  }

  await page.goto("/app/entrar/documento")
  await page.locator(ESCOLHER_ARQUIVO).setInputFiles({
    name: NOME_COM_CPF,
    mimeType: "application/pdf",
    buffer: DOCUMENTO_DE_EXEMPLO,
  })
  await expect(page.getByText("Trocar arquivo")).toBeVisible()
  await capturar(page, "documento-escolhido", testInfo, PASTA_DAS_CAPTURAS_DO_LOTE)
})
