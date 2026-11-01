import { existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { expect, type Locator, type Page, type TestInfo, test } from "@playwright/test"

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
const PASTA_DAS_CAPTURAS_DE_CIDADE_E_GRUPOS = join(
  raizDoRepositorio(process.cwd()),
  ".visual",
  "ENT-004",
)
const PASTA_DAS_CAPTURAS_DO_NEGOCIO = join(raizDoRepositorio(process.cwd()), ".visual", "ENT-005")
const PASTA_DAS_CAPTURAS_DA_ENTRADA = join(raizDoRepositorio(process.cwd()), ".visual", "ENT-006")
const PASTA_DAS_CAPTURAS_DO_ACEITE = join(raizDoRepositorio(process.cwd()), ".visual", "ENT-007")
const PROJETOS_COM_CAPTURA = ["mobile-375", "tablet-768", "desktop-1440"]
const AVISO_DEMONSTRATIVO = "Jornada demonstrativa"

/** A captura é da página inteira: o app rola dentro de #conteudo, então a
 *  rolagem interna é desfeita só para o retrato, sem tocar no layout. */
async function capturar(page: Page, nome: string, testInfo: TestInfo, pasta = PASTA_DAS_CAPTURAS) {
  // As boas-vindas entram em sequência: o retrato espera o fim de toda animação,
  // ou sai com a foto esmaecida e sem o título.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  )
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

// ENT-004 — cidade e momento, sugestões de grupos (F01, lote 4).

/** Largura de borda e cor do cartão: a seleção é borda Grafite de 2 px. */
async function bordaDoCartao(cartao: Locator) {
  return cartao.evaluate((elemento) => {
    const estilo = getComputedStyle(elemento)
    return { largura: estilo.borderTopWidth, cor: estilo.borderTopColor }
  })
}

test("cidade fica no passo 3, com ícone no campo e os três momentos na mesma linha", async ({
  page,
}) => {
  await page.goto("/app/entrar/cidade")
  const titulo = page.getByRole("heading", { name: "Sua cidade e seu momento." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByRole("img", { name: "Etapa 3 de 5: Cidade" })).toBeVisible()
  await expect(page.locator(".entrada-etapa-legenda")).toHaveText("Etapa 3 de 5 · Cidade")
  await expect(page.locator('.entrada-etapa-passo[data-estado="concluido"]')).toHaveCount(2)
  await expect(page.locator('.entrada-etapa-passo[data-estado="atual"]')).toHaveCount(1)
  await expect(page.locator('.entrada-etapa-passo[data-estado="futuro"]')).toHaveCount(2)

  // A cidade da demonstração vem preenchida, com o ícone de lugar no campo.
  const cidade = page.getByLabel("Cidade", { exact: true })
  await expect(cidade).toHaveValue("Manaus")
  await expect(page.locator(".entrada-etapa-campo [data-icone='place']")).toBeVisible()
  await expect(page.getByText("Jornada demonstrativa")).toHaveCount(0)

  // Os três cartões, de largura igual e na mesma linha acima de 344 px.
  const cartoes = page.locator(".entrada-etapa-momento label")
  await expect(cartoes).toHaveCount(3)
  const caixas = await cartoes.evaluateAll((elementos) =>
    elementos.map((elemento) => {
      const caixa = elemento.getBoundingClientRect()
      return { topo: Math.round(caixa.top), largura: Math.round(caixa.width) }
    }),
  )
  expect(new Set(caixas.map((caixa) => caixa.largura)).size).toBe(1)
  const empilhado = (page.viewportSize()?.width ?? 0) <= 344
  if (empilhado) {
    expect(caixas[0]?.topo).toBeLessThan(caixas[1]?.topo ?? 0)
    expect(caixas[1]?.topo).toBeLessThan(caixas[2]?.topo ?? 0)
  } else {
    expect(new Set(caixas.map((caixa) => caixa.topo)).size).toBe(1)
  }

  // Rádio desenhado: o nativo fica invisível e o desenho é do span em Grafite.
  await expect(page.locator(".entrada-etapa-radio")).toHaveCount(3)
  await expect(page.getByLabel("Moro aqui", { exact: true })).toBeChecked()
  const selecionado = await bordaDoCartao(cartoes.nth(1))
  const naoSelecionado = await bordaDoCartao(cartoes.nth(0))
  expect(selecionado.largura).toBe("2px")
  expect(naoSelecionado.largura).toBe("1px")
  expect(selecionado.cor).not.toBe(naoSelecionado.cor)
  const pontoDoRadio = await page
    .locator(".entrada-etapa-momento label")
    .nth(1)
    .locator(".entrada-etapa-radio")
    .evaluate((elemento) => getComputedStyle(elemento, "::after").backgroundColor)
  expect(pontoDoRadio).not.toBe("rgba(0, 0, 0, 0)")

  // Sem data nem destino em "Moro aqui"; "Como quer ser chamado" fica sempre.
  await expect(page.getByLabel("Como quer ser chamado")).toBeVisible()
  await expect(page.getByLabel("Data de chegada")).toHaveCount(0)
  await expect(page.getByLabel("Data de saída")).toHaveCount(0)
  await expect(page.getByLabel("Cidade de destino")).toHaveCount(0)

  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Encontre seus grupos." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/sugestoes-grupos$/)
})

test("cidade mostra a data de chegada ou a data e o destino da saída", async ({ page }) => {
  await page.goto("/app/entrar/cidade")
  const data = page.getByLabel("Data de chegada")
  const destino = page.getByLabel("Cidade de destino")

  await page.getByLabel("Chegando", { exact: true }).check()
  await expect(data).toBeVisible()
  await expect(data).toHaveAttribute("type", "date")
  await expect(destino).toHaveCount(0)

  await page.getByLabel("Saindo", { exact: true }).check()
  await expect(page.getByLabel("Data de chegada")).toHaveCount(0)
  await expect(page.getByLabel("Data de saída")).toBeVisible()
  await expect(page.getByLabel("Data de saída")).toHaveAttribute("type", "date")
  await expect(destino).toBeVisible()

  await page.getByLabel("Moro aqui", { exact: true }).check()
  await expect(page.getByLabel("Data de saída")).toHaveCount(0)
  await expect(destino).toHaveCount(0)
})

test("grupos sugeridos trazem foto, nome, descrição e a caixa desenhada", async ({ page }) => {
  await page.goto("/app/entrar/sugestoes-grupos")
  const titulo = page.getByRole("heading", { name: "Encontre seus grupos." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(
    page.getByText("Conheça alguns grupos de Manaus. Escolher é opcional."),
  ).toBeVisible()
  await expect(page.getByRole("img", { name: "Etapa 4 de 5: Grupos" })).toBeVisible()
  await expect(page.locator(".entrada-etapa-legenda")).toHaveText("Etapa 4 de 5 · Grupos")
  await expect(
    page.getByText("Demonstração: selecionar grupos não cria participação."),
  ).toHaveCount(0)
  await expect(page.getByText("Jornada demonstrativa")).toHaveCount(0)

  // Só os grupos abertos da cidade: os quatro primeiros, nenhum fechado.
  const cartoes = page.locator(".entrada-etapa-grupo")
  await expect(cartoes).toHaveCount(4)
  for (const nome of ["Chegadas 2027 em Manaus", "Famílias com crianças pequenas"]) {
    await expect(page.getByRole("checkbox", { name: new RegExp(nome) })).toBeVisible()
  }
  for (const fechado of ["Futebol de sábado", "Pais do Colégio Militar de Manaus"]) {
    await expect(page.getByText(fechado)).toHaveCount(0)
  }

  // Foto de capa de cada cartão, vinda da pasta de demonstração.
  const fotos = cartoes.locator("img")
  await expect(fotos).toHaveCount(4)
  for (const fonte of await fotos.evaluateAll((imagens) =>
    imagens.map((imagem) => imagem.getAttribute("src") ?? ""),
  )) {
    expect(fonte).toContain("/demo/")
  }
  await expect(cartoes.first().locator("strong")).toHaveText("Chegadas 2027 em Manaus")
  await expect(cartoes.first().locator("small")).toContainText("Quem chega a Manaus")

  // O cartão inteiro é o rótulo da caixa: marcar acende a caixa e a borda.
  const familia = page.getByRole("checkbox", { name: /Famílias com crianças pequenas/ })
  await expect(familia).not.toBeChecked()
  await familia.check()
  await expect(familia).toBeChecked()
  const marcado = await bordaDoCartao(cartoes.nth(1))
  const livre = await bordaDoCartao(cartoes.nth(0))
  expect(marcado.largura).toBe("2px")
  expect(livre.largura).toBe("1px")

  await page.getByRole("button", { name: "Escolher depois" }).click()
  await expect(
    page.getByRole("heading", { name: "Você tem um negócio ou oferece algum serviço?" }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/negocio$/)
})

test("cidade sem grupos mostra o vazio e deixa continuar", async ({ page }) => {
  await page.goto("/app/entrar/cidade")
  await page.getByLabel("Cidade", { exact: true }).fill("Recife")
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(
    page.getByText("Ainda não há grupos sugeridos para esta cidade. Você pode continuar."),
  ).toBeVisible()
  await expect(page.locator(".entrada-etapa-grupo")).toHaveCount(0)
  await expect(page.getByText("Famílias com crianças pequenas")).toHaveCount(0)

  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Você tem um negócio ou oferece algum serviço?" }),
  ).toBeVisible()
})

test("documento com tipo herdado do objeto é recusado", async ({ page }) => {
  await page.goto("/app/entrar/documento")
  await page.locator(ESCOLHER_ARQUIVO).setInputFiles({
    name: "identidade.pdf",
    mimeType: "toString",
    buffer: DOCUMENTO_DE_EXEMPLO,
  })
  await expect(page.getByRole("alert")).toHaveText(ERRO_DE_ARQUIVO)
  await expect(page.getByRole("button", { name: "Enviar arquivo" })).toBeDisabled()
  await expect(page.getByText(/^Documento · /)).toHaveCount(0)
})

test("cidade e grupos não rolam na horizontal", async ({ page }) => {
  for (const cidade of ["moro", "chegando", "saindo"]) {
    await page.goto("/app/entrar/cidade")
    if (cidade !== "moro") {
      await page.getByLabel(cidade === "chegando" ? "Chegando" : "Saindo").check()
    }
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
  }
  await page.goto("/app/entrar/sugestoes-grupos")
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test("capturas de página inteira de cidade e grupos", async ({ page }, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  const cidade = (momento: string) => page.getByLabel(momento, { exact: true })

  await page.goto("/app/entrar/cidade")
  await cidade("Moro aqui").check()
  await capturar(page, "cidade-moro", testInfo, PASTA_DAS_CAPTURAS_DE_CIDADE_E_GRUPOS)

  await cidade("Chegando").check()
  await expect(page.getByLabel("Data de chegada")).toBeVisible()
  await capturar(page, "cidade-chegando", testInfo, PASTA_DAS_CAPTURAS_DE_CIDADE_E_GRUPOS)

  await cidade("Saindo").check()
  await expect(page.getByLabel("Cidade de destino")).toBeVisible()
  await capturar(page, "cidade-saindo", testInfo, PASTA_DAS_CAPTURAS_DE_CIDADE_E_GRUPOS)

  await page.goto("/app/entrar/sugestoes-grupos")
  await page.getByRole("checkbox", { name: /Chegadas 2027 em Manaus/ }).check()
  await expect(page.locator(".entrada-etapa-grupo").first()).toBeVisible()
  await capturar(page, "grupos", testInfo, PASTA_DAS_CAPTURAS_DE_CIDADE_E_GRUPOS)
})

// ENT-005 — negócio opcional (F01, lote 5): escolha, formulário em cinco etapas
// e interesse na composição de etapa.

/** PNG 3 × 3: serve para a miniatura e nunca vai para lugar nenhum. */
const FOTO_DE_EXEMPLO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAIAAADZSiLoAAAAEklEQVR4nGNkaGCAACYojcwCAA54AIZp6Rr0AAAAAElFTkSuQmCC",
  "base64",
)

/** Preenche o primeiro passo com os dados da referência aprovada. */
async function preencherOferece(page: Page) {
  await page.getByLabel("Nome do negócio").fill("Bolos da Cláudia")
  await page
    .getByLabel("Tipo de serviço", { exact: true })
    .selectOption({ label: "Festas e comida" })
  await page.getByLabel("Bolos e doces", { exact: true }).check()
  await page.getByLabel("Salgados", { exact: true }).check()
}

/** "Continuar" do formulário; "Salvar rascunho" só existe na revisão. */
async function avancar(page: Page) {
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
}

/** Caminho mínimo até a revisão: cidade inteira, horário combinado, uma foto. */
async function chegarARevisao(page: Page) {
  await page.goto("/app/entrar/negocio-formulario")
  await preencherOferece(page)
  await avancar(page)
  await page.getByLabel("Em toda a cidade", { exact: true }).check()
  await avancar(page)
  await page.getByLabel("Atendo com horário combinado", { exact: true }).check()
  await avancar(page)
  await page.locator('input[type="file"]').setInputFiles({
    name: "bolo.png",
    mimeType: "image/png",
    buffer: FOTO_DE_EXEMPLO,
  })
  await expect(page.getByAltText("Foto 1, capa")).toBeVisible()
  await avancar(page)
  await expect(page.getByText("Passo 5 de 5", { exact: true })).toBeVisible()
}

test("a escolha do negócio fica no passo 5, com as três ações empilhadas", async ({ page }) => {
  await page.goto("/app/entrar/negocio")
  const titulo = page.getByRole("heading", {
    name: "Você tem um negócio ou oferece algum serviço?",
  })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(
    page.getByText("No Mercado, você pode apresentar seu negócio ou serviço à comunidade."),
  ).toBeVisible()
  await expect(
    page.getByText("Esta etapa é opcional. Você pode voltar a ela depois."),
  ).toBeVisible()
  await expect(page.getByRole("img", { name: "Etapa 5 de 5: Negócio" })).toBeVisible()
  await expect(page.locator('.entrada-etapa-passo[data-estado="concluido"]')).toHaveCount(4)
  await expect(page.locator('.entrada-etapa-passo[data-estado="atual"]')).toHaveCount(1)

  // Três ações empilhadas na largura da coluna, nesta ordem.
  const acoes = page.locator(".entrada-etapa-corpo > button")
  await expect(acoes).toHaveCount(3)
  await expect(acoes.nth(0)).toHaveText("Divulgar agora")
  await expect(acoes.nth(1)).toHaveText("Tenho interesse em criar")
  await expect(acoes.nth(2)).toHaveText("Decidir depois")
  const coluna = await page.locator(".entrada-etapa-corpo").boundingBox()
  if (!coluna) throw new Error("coluna do conteúdo ausente")
  const caixas = await acoes.evaluateAll((botoes) =>
    botoes.map((botao) => {
      const caixa = botao.getBoundingClientRect()
      return { topo: Math.round(caixa.top), largura: Math.round(caixa.width) }
    }),
  )
  for (const caixa of caixas) {
    expect(Math.abs(caixa.largura - Math.round(coluna.width))).toBeLessThanOrEqual(1)
  }
  expect(caixas[0]?.topo).toBeLessThan(caixas[1]?.topo ?? 0)
  expect(caixas[1]?.topo).toBeLessThan(caixas[2]?.topo ?? 0)

  // Principal em Grafite; "Decidir depois" é só texto.
  expect(await acoes.nth(0).evaluate((botao) => getComputedStyle(botao).backgroundColor)).toBe(
    "rgb(37, 48, 51)",
  )
  expect(await acoes.nth(2).evaluate((botao) => getComputedStyle(botao).backgroundColor)).toBe(
    "rgba(0, 0, 0, 0)",
  )

  await acoes.nth(0).click()
  await expect(page.getByRole("heading", { name: "Apresente seu negócio." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/negocio-formulario$/)

  await page.goto("/app/entrar/negocio")
  await page.getByRole("button", { name: "Tenho interesse em criar" }).click()
  await expect(page.getByRole("heading", { name: "Ideias para seu negócio." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/negocio-interesse$/)

  await page.goto("/app/entrar/negocio")
  await page.getByRole("button", { name: "Decidir depois" }).click()
  await expect(page.getByRole("heading", { name: "Você chegou ao Bivaque." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/boas-vindas$/)
})

test("o formulário mostra Passo X de 5, a barra de cinco segmentos e os subtítulos", async ({
  page,
}) => {
  await page.goto("/app/entrar/negocio-formulario")
  const titulo = page.getByRole("heading", { name: "Apresente seu negócio." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.getByRole("img", { name: "Etapa 5 de 5: Negócio" })).toBeVisible()
  await expect(page.getByText("Nenhuma informação será publicada nesta demonstração")).toHaveCount(
    0,
  )
  await expect(page.getByText(/Rascunho local de/)).toHaveCount(0)

  const feito = page.locator('.entrada-etapa-progresso-barra > span[data-estado="feito"]')
  const futuro = page.locator('.entrada-etapa-progresso-barra > span[data-estado="futuro"]')
  const subtitulo = page.locator(".entrada-etapa-subtitulo")
  const subtitulos = [
    "O que você oferece?",
    "Onde você atende?",
    "Como funciona seu atendimento?",
    "Como podem conhecer seu trabalho?",
    "Confira sua página",
  ] as const

  for (let passo = 1; passo <= 5; passo += 1) {
    await expect(page.getByText(`Passo ${passo} de 5`, { exact: true })).toBeVisible()
    await expect(page.locator(".entrada-etapa-progresso-barra > span")).toHaveCount(5)
    await expect(feito).toHaveCount(passo)
    await expect(futuro).toHaveCount(5 - passo)
    await expect(subtitulo).toHaveText(subtitulos[passo - 1] ?? "")

    if (passo === 1) {
      // Noto Serif semibold, alinhado à esquerda da coluna.
      const estilo = await subtitulo.evaluate((elemento) => {
        const estilo = getComputedStyle(elemento)
        return {
          familia: estilo.fontFamily,
          peso: estilo.fontWeight,
          alinhamento: estilo.textAlign,
        }
      })
      expect(estilo.familia).toMatch(/Noto Serif/i)
      expect(estilo.peso).toBe("600")
      expect(estilo.alinhamento).toBe("start")
      const texto = await subtitulo.boundingBox()
      const formulario = await page.locator(".entrada-etapa-formulario").boundingBox()
      expect(Math.abs((texto?.x ?? 0) - (formulario?.x ?? 0))).toBeLessThanOrEqual(1)

      await preencherOferece(page)
      await avancar(page)
      // O foco acompanha a troca de etapa.
      await expect(subtitulo).toBeFocused()
    } else if (passo === 2) {
      await page.getByLabel("Em toda a cidade", { exact: true }).check()
      await avancar(page)
    } else if (passo === 3) {
      await page.getByLabel("Atendo com horário combinado", { exact: true }).check()
      await avancar(page)
    } else if (passo === 4) {
      await avancar(page)
    }
  }

  // Na revisão o principal é "Salvar rascunho".
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Continuar", exact: true })).toHaveCount(0)
})

test("os rádios de área são cartões de linha inteira e o condicional abre logo abaixo", async ({
  page,
}) => {
  await page.goto("/app/entrar/negocio-formulario")
  await preencherOferece(page)
  await avancar(page)

  const cartoes = page.locator(".entrada-etapa-cartao")
  await expect(cartoes).toHaveCount(4)
  await expect(page.getByLabel("Informar depois", { exact: true })).toBeChecked()
  const livre = await bordaDoCartao(cartoes.nth(0))
  const marcado = await bordaDoCartao(cartoes.nth(3))
  expect(marcado.largura).toBe("2px")
  expect(livre.largura).toBe("1px")
  expect(marcado.cor).not.toBe(livre.cor)

  await page.getByLabel("Em bairros específicos", { exact: true }).check()
  await expect(page.getByLabel("Adicionar bairro")).toBeVisible()
  const campos = await page.locator(".entrada-etapa-cartao-campos").boundingBox()
  const selecionado = await cartoes.nth(1).boundingBox()
  const seguinte = await cartoes.nth(2).boundingBox()
  expect(campos?.y ?? 0).toBeGreaterThan((selecionado?.y ?? 0) + (selecionado?.height ?? 0) - 1)
  expect(campos?.y ?? 0).toBeLessThan(seguinte?.y ?? 0)

  // Sem bairro não avança; com um bairro, sim.
  await avancar(page)
  await expect(page.getByRole("alert")).toContainText("Adicione ao menos um bairro")
  await page.getByLabel("Adicionar bairro").fill("Ponta Negra")
  await page.getByRole("button", { name: "Adicionar bairro" }).click()
  await expect(page.getByRole("button", { name: "Remover Ponta Negra" })).toBeVisible()
  await avancar(page)
  await expect(page.getByText("Passo 3 de 5", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Informar depois", { exact: true })).toBeChecked()
})

test("especialidades e dias são chips com a seleção em Grafite e check", async ({ page }) => {
  await page.goto("/app/entrar/negocio-formulario")
  await page.getByLabel("Nome do negócio").fill("Bolos da Cláudia")
  await page
    .getByLabel("Tipo de serviço", { exact: true })
    .selectOption({ label: "Festas e comida" })

  const chip = page.locator(".entrada-etapa-chip").first()
  await expect(chip).toHaveText("Bolos e doces")
  await expect(chip).toHaveCSS("background-color", "rgb(255, 255, 255)")
  await page.getByLabel("Bolos e doces", { exact: true }).check()
  await expect(chip).toHaveCSS("background-color", "rgb(37, 48, 51)")
  await expect(chip).toHaveCSS("color", "rgb(242, 240, 235)")
  expect(
    await chip
      .locator(".entrada-etapa-chip-caixa")
      .evaluate((caixa) => getComputedStyle(caixa, "::after").borderRightColor),
  ).toBe("rgb(242, 240, 235)")

  await avancar(page)
  await page.getByLabel("Em toda a cidade", { exact: true }).check()
  await avancar(page)
  await page.getByLabel("Tenho horário fixo", { exact: true }).check()
  const dias = page.locator(".entrada-etapa-cartao-campos .entrada-etapa-chip")
  await expect(dias).toHaveCount(7)
  await page.getByLabel("Segunda-feira", { exact: true }).check()
  await expect(dias.nth(0)).toHaveCSS("background-color", "rgb(37, 48, 51)")
  await page.getByLabel("Segunda-feira", { exact: true }).uncheck()
  await expect(dias.nth(0)).toHaveCSS("background-color", "rgb(255, 255, 255)")
})

test("os campos de horário ficam lado a lado", async ({ page }) => {
  await page.goto("/app/entrar/negocio-formulario")
  await preencherOferece(page)
  await avancar(page)
  await page.getByLabel("Em toda a cidade", { exact: true }).check()
  await avancar(page)
  await page.getByLabel("Tenho horário fixo", { exact: true }).check()

  const abre = await page.getByLabel("Abre às").boundingBox()
  const fecha = await page.getByLabel("Fecha às").boundingBox()
  expect(Math.abs((abre?.y ?? 0) - (fecha?.y ?? 0))).toBeLessThanOrEqual(1)
  expect(Math.abs((abre?.width ?? 0) - (fecha?.width ?? 0))).toBeLessThanOrEqual(1)
  expect(abre?.width ?? 0).toBeGreaterThan(100)
})

test("fotos em miniatura, com a primeira marcada Capa e um quadro para adicionar", async ({
  page,
}) => {
  await page.goto("/app/entrar/negocio-formulario")
  await preencherOferece(page)
  await avancar(page)
  await page.getByLabel("Em toda a cidade", { exact: true }).check()
  await avancar(page)
  await page.getByLabel("Atendo com horário combinado", { exact: true }).check()
  await avancar(page)

  const entrada = page.locator('input[type="file"]')
  await entrada.setInputFiles({
    name: "bolo.png",
    mimeType: "image/png",
    buffer: FOTO_DE_EXEMPLO,
  })
  await expect(page.getByAltText("Foto 1, capa")).toBeVisible()
  await expect(page.locator(".entrada-etapa-foto-capa")).toHaveCount(1)
  await expect(page.locator(".entrada-etapa-foto-capa")).toHaveText("Capa")
  await expect(page.getByRole("button", { name: "Adicionar foto" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Tornar capa a foto 1" })).toHaveCount(0)

  await entrada.setInputFiles({
    name: "bolo-2.png",
    mimeType: "image/png",
    buffer: FOTO_DE_EXEMPLO,
  })
  await expect(page.locator(".entrada-etapa-foto")).toHaveCount(2)
  await page.getByRole("button", { name: "Tornar capa a foto 2" }).click()
  await expect(page.locator(".entrada-etapa-foto").first().locator("img")).toHaveAttribute(
    "alt",
    "Foto 1, capa",
  )
  await page.getByRole("button", { name: "Remover foto 2" }).click()
  await expect(page.locator(".entrada-etapa-foto")).toHaveCount(1)
})

test("a revisão traz a capa no topo e uma linha por bloco com Editar para a etapa certa", async ({
  page,
}) => {
  await chegarARevisao(page)

  const capa = page.getByAltText("Prévia da foto 1, capa")
  await expect(capa).toBeVisible()
  const linhas = page.locator(".entrada-etapa-revisao-linhas li")
  await expect(linhas).toHaveCount(6)
  await expect(linhas.nth(0)).toContainText("Bolos da Cláudia")
  await expect(linhas.nth(1)).toContainText("Festas e comida")
  await expect(linhas.nth(2)).toContainText("Bolos e doces, Salgados")
  await expect(linhas.nth(3)).toContainText("Atende em toda a cidade de Manaus")
  await expect(linhas.nth(4)).toContainText("Atendimento com horário combinado")
  await expect(linhas.nth(5)).toContainText("1 foto(s) adicionada(s)")
  for (let indice = 0; indice < 6; indice += 1) {
    await expect(linhas.nth(indice).locator("button")).toHaveText("Editar")
    await expect(linhas.nth(indice).locator(".bv-icone")).toHaveCount(1)
  }

  const caixaDaCapa = await capa.boundingBox()
  const caixaDasLinhas = await page.locator(".entrada-etapa-revisao-linhas").boundingBox()
  expect((caixaDaCapa?.y ?? 0) + (caixaDaCapa?.height ?? 0)).toBeLessThanOrEqual(
    caixaDasLinhas?.y ?? 0,
  )

  // Fotografia volta à etapa 4; nome volta à etapa 1.
  await linhas.nth(5).getByRole("button", { name: "Editar" }).click()
  await expect(page.getByText("Passo 4 de 5", { exact: true })).toBeVisible()
  await expect(page.locator(".entrada-etapa-subtitulo")).toHaveText(
    "Como podem conhecer seu trabalho?",
  )
  await avancar(page)
  await page
    .locator(".entrada-etapa-revisao-linhas li")
    .nth(0)
    .getByRole("button", { name: "Editar" })
    .click()
  await expect(page.getByText("Passo 1 de 5", { exact: true })).toBeVisible()
  await expect(page.locator(".entrada-etapa-subtitulo")).toHaveText("O que você oferece?")
})

test("Salvar rascunho mostra o status sem publicar e leva às boas-vindas", async ({ page }) => {
  await chegarARevisao(page)
  await page.getByRole("button", { name: "Salvar rascunho" }).click()
  await expect(page.getByRole("status")).toContainText(
    "Rascunho salvo nesta sessão. Seu negócio não foi publicado.",
  )
  const rascunho = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("bivaque:onboarding-negocio") ?? "{}"),
  )
  expect(rascunho.nome).toBe("Bolos da Cláudia")
  expect(rascunho.fotos).toHaveLength(1)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Você chegou ao Bivaque." })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/entrar\/boas-vindas$/)
})

test("o interesse empilha Continuar e Voltar, com os destinos de hoje", async ({ page }) => {
  await page.goto("/app/entrar/negocio-interesse")
  const titulo = page.getByRole("heading", { name: "Ideias para seu negócio." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(
    page.getByText(
      "Quando quiser, explore os negócios locais no Mercado e conheça o que a comunidade procura.",
    ),
  ).toBeVisible()
  await expect(page.getByRole("img", { name: "Etapa 5 de 5: Negócio" })).toBeVisible()

  const continuar = await page.getByRole("button", { name: "Continuar", exact: true }).boundingBox()
  const voltar = await page.getByRole("button", { name: "Voltar", exact: true }).boundingBox()
  expect(continuar?.y ?? 0).toBeLessThan(voltar?.y ?? 0)
  expect(Math.abs((continuar?.width ?? 0) - (voltar?.width ?? 0))).toBeLessThanOrEqual(1)

  await page.getByRole("button", { name: "Voltar", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Você tem um negócio ou oferece algum serviço?" }),
  ).toBeVisible()

  await page.goto("/app/entrar/negocio-interesse")
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Você chegou ao Bivaque." })).toBeVisible()
})

test("a capa da turma de chegada usa a foto de chegada", async ({ page }) => {
  await page.goto("/app/entrar/sugestoes-grupos")
  const capa = page.locator(".entrada-etapa-grupo").first().locator("img")
  await expect(capa).toHaveAttribute("src", /chegada\.webp$/)
})

test("as validações de hoje continuam: nome curto, horário e contatos", async ({ page }) => {
  await page.goto("/app/entrar/negocio-formulario")
  await avancar(page)
  await expect(page.getByRole("alert")).toContainText("Informe o nome e escolha o tipo de serviço.")

  await page.getByLabel("Nome do negócio").fill("Bo")
  await page.getByLabel("Tipo de serviço", { exact: true }).selectOption({ label: "Outros" })
  await avancar(page)
  await expect(page.getByRole("alert")).toContainText("Informe o nome e escolha o tipo de serviço.")

  await page.getByLabel("Nome do negócio").fill("Loja exemplo")
  await avancar(page)
  await page.getByLabel("Em toda a cidade", { exact: true }).check()
  await avancar(page)
  await page.getByLabel("Tenho horário fixo", { exact: true }).check()
  await avancar(page)
  await expect(page.getByRole("alert")).toContainText("posterior à abertura")

  await page.getByLabel("Segunda-feira", { exact: true }).check()
  await page.getByLabel("Abre às").fill("18:00")
  await page.getByLabel("Fecha às").fill("08:00")
  await avancar(page)
  await expect(page.getByRole("alert")).toContainText("posterior à abertura")

  await page.getByLabel("Fecha às").fill("19:00")
  await avancar(page)
  await page.getByLabel("WhatsApp (opcional)").fill("123")
  await avancar(page)
  await expect(page.getByRole("alert")).toContainText("Confira WhatsApp, Instagram e site.")
  await expect(page.getByText("Passo 4 de 5", { exact: true })).toBeVisible()
})

test("as telas do negócio não rolam na horizontal", async ({ page }) => {
  const semRolagem = () =>
    expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)

  for (const tela of ["negocio", "negocio-formulario", "negocio-interesse"]) {
    await page.goto(`/app/entrar/${tela}`)
    await semRolagem()
  }

  await page.goto("/app/entrar/negocio-formulario")
  await preencherOferece(page)
  await semRolagem()
  await avancar(page)
  await page.getByLabel("Em bairros específicos", { exact: true }).check()
  await semRolagem()
  await page.getByLabel("Adicionar bairro").fill("Ponta Negra")
  await page.getByRole("button", { name: "Adicionar bairro" }).click()
  await avancar(page)
  await page.getByLabel("Tenho horário fixo", { exact: true }).check()
  await semRolagem()
})

test("o negócio segue os tokens no tema escuro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/app/entrar/negocio-formulario")
  await expect(page.getByRole("heading", { name: "Apresente seu negócio." })).toBeVisible()
  expect(
    await page
      .locator(".entrada-etapa-acoes .entrada-etapa-acao")
      .last()
      .evaluate((botao) => getComputedStyle(botao).backgroundColor),
  ).toBe("rgb(236, 234, 228)")
  expect(
    await page
      .locator(".entrada-etapa-subtitulo")
      .evaluate((subtitulo) => getComputedStyle(subtitulo).color),
  ).toBe("rgb(236, 234, 228)")
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test("capturas de página inteira da escolha, das cinco etapas e do interesse", async ({
  page,
}, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  await page.goto("/app/entrar/negocio")
  await expect(
    page.getByRole("heading", { name: "Você tem um negócio ou oferece algum serviço?" }),
  ).toBeVisible()
  await capturar(page, "negocio", testInfo, PASTA_DAS_CAPTURAS_DO_NEGOCIO)

  await page.goto("/app/entrar/negocio-formulario")
  await preencherOferece(page)
  await expect(page.getByText("Passo 1 de 5", { exact: true })).toBeVisible()
  await capturar(page, "negocio-etapa-1", testInfo, PASTA_DAS_CAPTURAS_DO_NEGOCIO)

  await avancar(page)
  await page.getByLabel("Em bairros específicos", { exact: true }).check()
  for (const bairro of ["Ponta Negra", "Adriánopolis"]) {
    await page.getByLabel("Adicionar bairro").fill(bairro)
    await page.getByRole("button", { name: "Adicionar bairro" }).click()
  }
  await expect(page.getByText("Passo 2 de 5", { exact: true })).toBeVisible()
  await capturar(page, "negocio-etapa-2", testInfo, PASTA_DAS_CAPTURAS_DO_NEGOCIO)

  await avancar(page)
  await page.getByLabel("Tenho horário fixo", { exact: true }).check()
  for (const dia of [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
  ]) {
    await page.getByLabel(dia, { exact: true }).check()
  }
  await page.getByLabel("Abre às").fill("08:00")
  await page.getByLabel("Fecha às").fill("18:00")
  await expect(page.getByText("Passo 3 de 5", { exact: true })).toBeVisible()
  await capturar(page, "negocio-etapa-3", testInfo, PASTA_DAS_CAPTURAS_DO_NEGOCIO)

  await avancar(page)
  await page
    .getByLabel("Apresentação (opcional)")
    .fill("Bolos caseiros feitos por encomenda para momentos especiais.")
  await page.locator('input[type="file"]').setInputFiles([
    { name: "bolo-1.png", mimeType: "image/png", buffer: FOTO_DE_EXEMPLO },
    { name: "bolo-2.png", mimeType: "image/png", buffer: FOTO_DE_EXEMPLO },
    { name: "bolo-3.png", mimeType: "image/png", buffer: FOTO_DE_EXEMPLO },
  ])
  await expect(page.getByAltText("Foto 3")).toBeVisible()
  await expect(page.getByText("Passo 4 de 5", { exact: true })).toBeVisible()
  await capturar(page, "negocio-etapa-4", testInfo, PASTA_DAS_CAPTURAS_DO_NEGOCIO)

  await avancar(page)
  await expect(page.getByText("Passo 5 de 5", { exact: true })).toBeVisible()
  await capturar(page, "negocio-etapa-5", testInfo, PASTA_DAS_CAPTURAS_DO_NEGOCIO)

  await page.goto("/app/entrar/negocio-interesse")
  await expect(page.getByRole("heading", { name: "Ideias para seu negócio." })).toBeVisible()
  await capturar(page, "negocio-interesse", testInfo, PASTA_DAS_CAPTURAS_DO_NEGOCIO)
})

// ENT-006 — boas-vindas por momento (F01, lote 6). O momento escolhido na tela da
// cidade decide o apoio, os atalhos e o destino de cada um.

/** Caminho real até as boas-vindas: cidade → grupos → negócio → decidir depois. */
async function chegarAsBoasVindas(
  page: Page,
  momento: "Chegando" | "Moro aqui" | "Saindo",
  destino = "",
) {
  await page.goto("/app/entrar/cidade")
  await page.getByLabel(momento, { exact: true }).check()
  if (destino !== "") await page.getByLabel("Cidade de destino").fill(destino)
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await page.getByRole("button", { name: "Escolher depois" }).click()
  await page.getByRole("button", { name: "Decidir depois" }).click()
  await expect(page.getByRole("heading", { name: "Você chegou ao Bivaque." })).toBeVisible()
}

test("boas-vindas de quem chega trazem o plano, a turma e o destino de cada atalho", async ({
  page,
}) => {
  await chegarAsBoasVindas(page, "Chegando")
  const titulo = page.getByRole("heading", { name: "Você chegou ao Bivaque." })
  await expect(titulo).toBeFocused()
  await expect(page.getByText("Seu plano de chegada a Manaus já está pronto.")).toBeVisible()

  const atalhos = page.locator(".entrada-etapa-atalho")
  await expect(atalhos).toHaveCount(2)
  await expect(atalhos.nth(0)).toContainText("Ver o plano de chegada")
  await expect(atalhos.nth(0)).toContainText("Moradia, escola, saúde e mudança, na ordem.")
  await expect(atalhos.nth(1)).toContainText("Conhecer quem chega com você")
  await expect(atalhos.nth(1)).toContainText("Chegadas 2027 em Manaus")

  // Cada atalho tem ícone e seta; a seta é só decoração.
  await expect(atalhos.nth(0).locator("[data-icone='map']")).toBeVisible()
  await expect(atalhos.nth(1).locator("[data-icone='group']")).toBeVisible()
  await expect(atalhos.locator("[data-icone='chevron_right']")).toHaveCount(2)

  await atalhos.nth(1).click()
  await expect(page).toHaveURL(/\/app\/grupo\/turma-manaus-2027$/)

  await chegarAsBoasVindas(page, "Chegando")
  await page.getByRole("button", { name: /Ver o plano de chegada/ }).click()
  await expect(page).toHaveURL(/\/app\/inicio$/)

  await chegarAsBoasVindas(page, "Chegando")
  await page.getByRole("button", { name: "Entrar na comunidade" }).click()
  await expect(page).toHaveURL(/\/app\/comunidade$/)
})

test("boas-vindas de quem mora levam ao guia e não têm atalho de turma", async ({ page }) => {
  await chegarAsBoasVindas(page, "Moro aqui")
  await expect(
    page.getByText("O que a comunidade de Manaus indica já está à sua espera."),
  ).toBeVisible()

  const atalho = page.locator(".entrada-etapa-atalho")
  await expect(atalho).toHaveCount(1)
  await expect(atalho).toContainText("Conhecer Manaus")
  await expect(atalho).toContainText("O que a comunidade indica, por assunto.")
  await expect(page.getByText("Chegadas 2027 em Manaus")).toHaveCount(0)

  await atalho.click()
  await expect(page).toHaveURL(/\/app\/guia$/)
})

test("boas-vindas de quem sai mudam com o destino e só têm o plano de saída", async ({ page }) => {
  await chegarAsBoasVindas(page, "Saindo", "Brasília")
  await expect(page.getByText("Seu plano de saída para Brasília já está pronto.")).toBeVisible()
  const atalhos = page.locator(".entrada-etapa-atalho")
  await expect(atalhos).toHaveCount(1)
  await expect(atalhos.first()).toContainText("Ver o plano de saída")
  await expect(atalhos.first()).toContainText("Moradia, escola, saúde e mudança, na ordem.")

  await atalhos.first().click()
  await expect(page).toHaveURL(/\/app\/inicio$/)

  // Sem destino, a frase continua verdadeira.
  await chegarAsBoasVindas(page, "Saindo")
  await expect(page.getByText("Seu plano de saída já está pronto.")).toBeVisible()
  await expect(page.locator(".entrada-etapa-atalho")).toHaveCount(1)
})

test("as boas-vindas não têm indicador de passos nem Sair, e a foto leva o check na borda", async ({
  page,
}) => {
  await page.goto("/app/entrar/boas-vindas")
  const titulo = page.getByRole("heading", { name: "Você chegou ao Bivaque." })
  await expect(titulo).toBeVisible()
  await expect(titulo).toBeFocused()
  await expect(page.locator(".entrada-etapa-passos")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0)
  await expect(page.getByRole("img", { name: "Bivaque" })).toBeVisible()

  // Título em Noto Serif, centralizado.
  const estilo = await titulo.evaluate((elemento) => {
    const estilo = getComputedStyle(elemento)
    return { familia: estilo.fontFamily, alinhamento: estilo.textAlign }
  })
  expect(estilo.familia).toMatch(/Noto Serif/i)
  expect(estilo.alinhamento).toBe("center")

  // Foto larga, decorativa (alt vazio), com cantos de 16 px.
  const foto = page.locator(".entrada-etapa-boas-vindas-foto img")
  await expect(foto).toHaveAttribute("alt", "")
  expect(await foto.getAttribute("src")).toMatch(/demo\/landing-hero\.webp$/)
  expect(await foto.evaluate((elemento) => getComputedStyle(elemento).borderTopLeftRadius)).toBe(
    "16px",
  )
  const coluna = await page.locator(".entrada-etapa-corpo").boundingBox()
  const caixaDaFoto = await foto.boundingBox()
  expect(Math.abs((caixaDaFoto?.width ?? 0) - (coluna?.width ?? 0))).toBeLessThanOrEqual(1)

  // O check cobre a borda inferior da foto: parte dentro, parte fora.
  const check = await page.locator(".entrada-etapa-boas-vindas-check").boundingBox()
  if (!caixaDaFoto || !check) throw new Error("foto ou check ausente nas boas-vindas")
  expect(check.y).toBeGreaterThan(caixaDaFoto.y)
  expect(check.y + check.height).toBeGreaterThan(caixaDaFoto.y + caixaDaFoto.height)
  await expect(page.locator(".entrada-etapa-boas-vindas-check [data-icone='check']")).toBeVisible()
})

test("a barra interna do negócio fica com 60% da coluna e centralizada em 375 px", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-375", "medida do celular em 375 px")
  await page.goto("/app/entrar/negocio-formulario")
  await expect(page.getByText("Passo 1 de 5", { exact: true })).toBeVisible()

  const barra = await page.locator(".entrada-etapa-progresso-barra").boundingBox()
  const coluna = await page.locator(".entrada-etapa-formulario").boundingBox()
  const geral = await page.locator(".entrada-etapa-segmentos").boundingBox()
  if (!barra || !coluna || !geral) throw new Error("barra, coluna ou barra geral ausente")

  // No máximo 60% da coluna e distinta da barra geral da etapa.
  expect(barra.width).toBeLessThanOrEqual(coluna.width * 0.6 + 0.5)
  expect(barra.width).toBeLessThan(geral.width)
  const esquerda = barra.x - coluna.x
  const direita = coluna.x + coluna.width - (barra.x + barra.width)
  expect(Math.abs(esquerda - direita)).toBeLessThanOrEqual(1)
})

test("as boas-vindas não rolam na horizontal nos três momentos", async ({ page }) => {
  for (const momento of ["Moro aqui", "Chegando", "Saindo"] as const) {
    await chegarAsBoasVindas(page, momento)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
  }
})

test("as boas-vindas seguem os tokens no tema escuro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/app/entrar/boas-vindas")
  await expect(page.getByRole("heading", { name: "Você chegou ao Bivaque." })).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    "rgb(23, 30, 32)",
  )
  expect(
    await page
      .locator(".entrada-etapa-atalho")
      .first()
      .evaluate((atalho) => getComputedStyle(atalho).backgroundColor),
  ).toBe("rgb(32, 41, 43)")
  expect(
    await page
      .getByRole("img", { name: "Bivaque" })
      .evaluate((marca) => (marca as HTMLImageElement).currentSrc),
  ).toMatch(/bivaque-logo-horizontal-white\.svg$/)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test("capturas de página inteira das boas-vindas nos três momentos", async ({ page }, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  await chegarAsBoasVindas(page, "Chegando")
  await capturar(page, "boas-vindas-chegando", testInfo, PASTA_DAS_CAPTURAS_DA_ENTRADA)

  await chegarAsBoasVindas(page, "Moro aqui")
  await capturar(page, "boas-vindas-moro", testInfo, PASTA_DAS_CAPTURAS_DA_ENTRADA)

  await chegarAsBoasVindas(page, "Saindo", "Brasília")
  await capturar(page, "boas-vindas-saindo", testInfo, PASTA_DAS_CAPTURAS_DA_ENTRADA)
})

// ENT-007 — o aceite visual do dono: a regra comum de tamanho no celular, a
// miniatura dos grupos em 40% do cartão, as fotos do negócio em quatro colunas e
// as boas-vindas na coluna de 760 px.

test("no celular o título de display mede 24 px em todas as telas de /app/entrar/*", async ({
  page,
}, testInfo) => {
  test.skip(!ehCelular(testInfo), "regra de tamanho do celular")
  for (const tela of [
    "aceite",
    "cpf",
    "resultado",
    "consulta-indisponivel",
    "documento",
    "analise",
    "cidade",
    "sugestoes-grupos",
    "negocio",
    "negocio-formulario",
    "negocio-interesse",
    "boas-vindas",
  ]) {
    await page.goto(`/app/entrar/${tela}`)
    await expect(page.locator("#titulo-da-tela"), tela).toHaveCSS("font-size", "24px")
  }
})

test("a miniatura de cada grupo ocupa 40% do cartão, em 4:3", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-375", "medida do celular em 375 px")
  await page.goto("/app/entrar/sugestoes-grupos")
  await expect(page.getByRole("heading", { name: "Encontre seus grupos." })).toBeVisible()

  const cartao = await page.locator(".entrada-etapa-grupo").first().boundingBox()
  const foto = await page.locator(".entrada-etapa-grupo-foto").first().boundingBox()
  if (!cartao || !foto) throw new Error("cartão ou foto do grupo ausente")
  expect(Math.abs(foto.width / cartao.width / 0.4 - 1) * 100).toBeLessThanOrEqual(2)
  expect(Math.abs(foto.width / foto.height / (4 / 3) - 1) * 100).toBeLessThanOrEqual(2)
})

test("no celular as fotos do negócio ficam em quatro colunas", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-375", "medida do celular em 375 px")
  await page.goto("/app/entrar/negocio-formulario")
  await preencherOferece(page)
  await avancar(page)
  await page.getByLabel("Em toda a cidade", { exact: true }).check()
  await avancar(page)
  await page.getByLabel("Atendo com horário combinado", { exact: true }).check()
  await avancar(page)
  await page.locator('input[type="file"]').setInputFiles([
    { name: "bolo.png", mimeType: "image/png", buffer: FOTO_DE_EXEMPLO },
    { name: "bolo-2.png", mimeType: "image/png", buffer: FOTO_DE_EXEMPLO },
  ])
  await expect(page.getByAltText("Foto 1, capa")).toBeVisible()

  const colunas = await page.locator(".entrada-etapa-fotos").evaluate((lista) =>
    getComputedStyle(lista)
      .gridTemplateColumns.split(" ")
      .map((largura) => Number.parseFloat(largura)),
  )
  expect(colunas).toHaveLength(4)
  expect(Math.abs((colunas[0] ?? 0) - (colunas[3] ?? 0))).toBeLessThanOrEqual(1)
  expect(colunas[0] ?? 0).toBeGreaterThan(60)
  expect(colunas[0] ?? 0).toBeLessThan(90)
})

test("as boas-vindas usam a coluna de 760 px, a foto larga e os cartões de 56–80/80–96 px", async ({
  page,
}, testInfo) => {
  await page.goto("/app/entrar/boas-vindas")
  const foto = await page.locator(".entrada-etapa-boas-vindas-foto img").boundingBox()
  if (!foto) throw new Error("foto das boas-vindas ausente")
  const atalho = (await page.locator(".entrada-etapa-atalho").first().boundingBox())?.height ?? 0

  if (ehCelular(testInfo)) {
    expect(Math.abs(foto.width / foto.height / 1.6 - 1)).toBeLessThanOrEqual(0.02)
    expect(atalho).toBeGreaterThanOrEqual(56)
    expect(atalho).toBeLessThanOrEqual(80)
  } else {
    expect(Math.abs(foto.width / foto.height / (21 / 9) - 1)).toBeLessThanOrEqual(0.02)
    // 760 px no desktop, como a referência; no tablet a coluna cabe na janela.
    const coluna = await page.locator(".entrada-etapa-conteudo").boundingBox()
    const janela = page.viewportSize()?.width ?? 0
    expect(coluna?.width ?? 0).toBeCloseTo(Math.min(760, janela), 0)
    expect(atalho).toBeGreaterThanOrEqual(80)
    expect(atalho).toBeLessThanOrEqual(96)
    expect(
      await page
        .locator(".entrada-etapa-titulo")
        .evaluate((titulo) => Number.parseFloat(getComputedStyle(titulo).fontSize)),
    ).toBeCloseTo(48, 0)
  }
})

test("no celular a capa da revisão tem proporção 16:9", async ({ page }, testInfo) => {
  test.skip(!ehCelular(testInfo), "medida do celular")
  await chegarARevisao(page)
  const capa = await page.getByAltText("Prévia da foto 1, capa").boundingBox()
  if (!capa) throw new Error("capa da revisão ausente")
  expect(Math.abs(capa.width / capa.height / (16 / 9) - 1)).toBeLessThanOrEqual(0.02)
})

test("capturas do aceite visual das etapas em 375, 768 e 1440 px", async ({ page }, testInfo) => {
  test.skip(
    !PROJETOS_COM_CAPTURA.includes(testInfo.project.name),
    "captura só em 375, 768 e 1440 px",
  )

  await page.goto("/app/entrar/sugestoes-grupos")
  await expect(page.getByRole("heading", { name: "Encontre seus grupos." })).toBeVisible()
  await capturar(page, "10-grupos", testInfo, PASTA_DAS_CAPTURAS_DO_ACEITE)

  await page.goto("/app/entrar/negocio-formulario")
  await preencherOferece(page)
  await avancar(page)
  await page.getByLabel("Em toda a cidade", { exact: true }).check()
  await avancar(page)
  await page.getByLabel("Atendo com horário combinado", { exact: true }).check()
  await avancar(page)
  await page.locator('input[type="file"]').setInputFiles([
    { name: "bolo.png", mimeType: "image/png", buffer: FOTO_DE_EXEMPLO },
    { name: "bolo-2.png", mimeType: "image/png", buffer: FOTO_DE_EXEMPLO },
    { name: "bolo-3.png", mimeType: "image/png", buffer: FOTO_DE_EXEMPLO },
  ])
  await expect(page.getByAltText("Foto 3")).toBeVisible()
  await capturar(page, "12d-negocio-fotos", testInfo, PASTA_DAS_CAPTURAS_DO_ACEITE)

  await avancar(page)
  await expect(page.getByText("Passo 5 de 5", { exact: true })).toBeVisible()
  await capturar(page, "12e-negocio-revisao", testInfo, PASTA_DAS_CAPTURAS_DO_ACEITE)

  for (const [nome, momento] of [
    ["13-boas-vindas", "Moro aqui"],
    ["13b-boas-vindas-chegando", "Chegando"],
    ["13c-boas-vindas-saindo", "Saindo"],
  ] as const) {
    await chegarAsBoasVindas(page, momento)
    await capturar(page, nome, testInfo, PASTA_DAS_CAPTURAS_DO_ACEITE)
  }
})
