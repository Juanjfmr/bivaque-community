import { expect, test } from "@playwright/test"

test("cadastro exige aceite e permite simular análise de documento", async ({ page }) => {
  await page.goto("/app/entrar/conta")
  await expect(page.getByRole("button", { name: "Criar conta" })).toBeDisabled()
  await page.getByRole("checkbox", { name: /Li e concordo/ }).check()
  await page.getByRole("button", { name: "Criar conta" }).click()
  await expect(page.getByRole("heading", { name: "Confirme seu vínculo." })).toBeVisible()
  await page.getByRole("button", { name: "Simular consulta indisponível" }).click()
  await expect(
    page.getByRole("heading", { name: "Não foi possível concluir a consulta." }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Enviar identidade" }).click()
  await expect(page.getByRole("button", { name: "Enviar arquivo" })).toBeDisabled()
  await page.locator('input[type="file"]').setInputFiles({
    name: "identidade.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("exemplo"),
  })
  await page.getByRole("button", { name: "Enviar arquivo" }).click()
  await expect(page.getByRole("heading", { name: "Vínculo em análise." })).toBeVisible()
})

test("cadastro percorre vínculo, cidade, grupos e boas-vindas", async ({ page }) => {
  await page.goto("/app/entrar/conta")
  await page.getByRole("checkbox", { name: /Li e concordo/ }).check()
  await page.getByRole("button", { name: "Criar conta" }).click()
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Vínculo confirmado." })).toBeVisible()
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Sua cidade e seu momento." })).toBeVisible()
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Encontre seus grupos." })).toBeVisible()
  const familia = page.getByRole("checkbox", { name: /Famílias com crianças pequenas/ })
  await familia.check()
  await expect(familia).toBeChecked()
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Você tem um negócio ou oferece algum serviço?" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Decidir depois" }).click()
  await expect(page.getByRole("heading", { name: "Bem-vindo ao Bivaque." })).toBeVisible()
  await page.getByRole("button", { name: "Ir para o início" }).click()
  await expect(page).toHaveURL(/\/app\/(inicio)?$/)
})

test("sugestões podem ser puladas e não mostram grupos de outra cidade", async ({ page }) => {
  await page.goto("/app/entrar/cidade")
  await page.getByLabel("Cidade", { exact: true }).fill("Recife")
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(
    page.getByText("Ainda não há grupos sugeridos para esta cidade. Você pode continuar."),
  ).toBeVisible()
  await expect(page.getByText("Famílias com crianças pequenas")).toHaveCount(0)
  await page.getByRole("button", { name: "Escolher depois" }).click()
  await expect(
    page.getByRole("heading", { name: "Você tem um negócio ou oferece algum serviço?" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Tenho interesse em criar" }).click()
  await expect(page.getByRole("heading", { name: "Ideias para seu negócio." })).toBeVisible()
  await page.getByRole("button", { name: "Continuar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Bem-vindo ao Bivaque." })).toBeVisible()
})

test("negócio pode ser criado por etapas sem obrigar detalhes", async ({ page }) => {
  await page.goto("/app/entrar/negocio")
  await page.getByRole("button", { name: "Divulgar agora" }).click()
  await page.getByLabel("Nome do negócio").fill("Oficina de exemplo")
  await page
    .getByLabel("Tipo de serviço", { exact: true })
    .selectOption({ label: "Casa e reparos" })
  await page.getByLabel("Elétrica", { exact: true }).check()
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toHaveCount(0)
  expect(await page.evaluate(() => sessionStorage.getItem("bivaque:onboarding-negocio"))).toBeNull()
  await page.getByLabel("Em toda a cidade").check()
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByLabel("Atendo com horário combinado").check()
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByLabel("Fotos do negócio (até 6)").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAIAAADZSiLoAAAAEklEQVR4nGNkaGCAACYojcwCAA54AIZp6Rr0AAAAAElFTkSuQmCC",
      "base64",
    ),
  })
  await expect(page.getByAltText("Foto 1, capa")).toBeVisible()
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByText("Oficina de exemplo")).toBeVisible()
  await expect(page.getByText("Elétrica", { exact: true })).toBeVisible()
  await expect(page.getByText("Atendimento com horário combinado")).toBeVisible()
  await expect(page.getByAltText("Prévia da foto 1, capa")).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem("bivaque:onboarding-negocio"))).toBeNull()
  await page.getByRole("button", { name: "Salvar rascunho" }).click()
  await expect(page.getByRole("status")).toContainText("não foi publicado")
  const draft = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("bivaque:onboarding-negocio") ?? "{}"),
  )
  expect(draft.especialidades).toContain("Elétrica")
  expect(draft.fotos).toHaveLength(1)
  expect(draft.atendimento).toBe("combinado")
})

test("negócio permite informar horário fixo e voltar sem perder dados", async ({ page }) => {
  await page.goto("/app/entrar/negocio-formulario")
  await page.getByLabel("Nome do negócio").fill("Ateliê de teste")
  await page.getByLabel("Tipo de serviço", { exact: true }).selectOption({ label: "Outros" })
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByRole("button", { name: "Voltar" }).click()
  await expect(page.getByLabel("Nome do negócio")).toHaveValue("Ateliê de teste")
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByLabel("Tenho horário fixo").check()
  await page.getByLabel("Segunda-feira").check()
  await page.getByLabel("Abre às").fill("08:00")
  await page.getByLabel("Fecha às").fill("18:00")
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByText(/Segunda-feira.*08:00.*18:00/)).toBeVisible()
})

test("negócio orienta dados incompletos e fotos inválidas", async ({ page }) => {
  await page.goto("/app/entrar/negocio-formulario")
  await page.getByLabel("Nome do negócio").fill("Loja exemplo")
  await page.getByLabel("Tipo de serviço", { exact: true }).selectOption({ label: "Outros" })
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByLabel("Em bairros específicos").check()
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByRole("alert")).toContainText("Adicione ao menos um bairro")
  await page.getByLabel("Adicionar bairro").fill("Centro")
  await page.getByRole("button", { name: "Adicionar bairro" }).click()
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByLabel("Tenho horário fixo").check()
  await page.getByLabel("Segunda-feira").check()
  await page.getByLabel("Abre às").fill("18:00")
  await page.getByLabel("Fecha às").fill("08:00")
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByRole("alert")).toContainText("posterior à abertura")
  await page.getByLabel("Fecha às").fill("19:00")
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByLabel("Fotos do negócio (até 6)").setInputFiles({
    name: "invalido.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("não é imagem"),
  })
  await expect(page.getByRole("alert")).toContainText("JPG, PNG, WebP ou AVIF")
})

test("cidade mostra campos adequados ao momento e mantém o layout", async ({ page }) => {
  await page.goto("/app/entrar/cidade")
  await page.getByLabel("Chegando", { exact: true }).check()
  await expect(page.getByLabel("Data de chegada")).toBeVisible()
  await page.getByLabel("Saindo", { exact: true }).check()
  await expect(page.getByLabel("Data de chegada")).toHaveCount(0)
  await expect(page.getByLabel("Data de saída")).toBeVisible()
  await expect(page.getByLabel("Cidade de destino")).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.getByLabel("Moro aqui", { exact: true }).check()
  await expect(page.getByLabel("Cidade de destino")).toHaveCount(0)
  await expect(page.getByLabel("Data de saída")).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test("recuperação informa que não houve envio e retorna ao login", async ({ page }) => {
  await page.goto("/app/entrar/login")
  await expect(page.getByRole("img", { name: "Bivaque" })).toBeVisible()
  await page.getByRole("button", { name: "Esqueci minha senha" }).click()
  await page.getByLabel("E-mail").fill("pessoa@example.invalid")
  await page.getByRole("button", { name: "Enviar instruções" }).click()
  await expect(page.getByRole("status")).toContainText("as instruções chegam em instantes")
  await page.getByRole("button", { name: "Voltar para entrar" }).click()
  await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
})
