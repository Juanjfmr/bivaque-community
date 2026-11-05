import { expect, test } from "@playwright/test"
import {
  ContaIndisponivel,
  CPF_SINTETICO,
  capturarEmDoisTemas,
  capturarFinais,
  criarContaConfirmada,
  criarContaVerificada,
  enderecoSintetico,
  esperarEtapaDaEntrada,
  esperarGruposDaCidade,
  esperarProvisionamento,
  lerCodigoDoEmail,
  MEMBRO_SEMEADO,
  preencherCodigoDeEntrada,
  semearSessaoDeMembro,
} from "./entrada-real-ajuda"

// F01 — a entrada REAL do app no navegador (LAN-F01, lote B; RUN-001).
//
// Contra o Next que serve `/app` (baseURL 127.0.0.1:3000) e o Supabase local com
// seed. A tela é `apps/app/src/entrada/TelaDeEntrada.tsx`, que roda a máquina de
// estados aprovada (`src/previa-f01`) sobre as rotas `/api/app/entry/*`.
//
// Pré-requisitos (o Lead mantém o stack):
//   * Supabase local com seed (`supabase db reset --local`);
//   * build do app copiado para `apps/web/public/app` (`npx pnpm@11.18.0 app:export`)
//     e o Next de `/app` no ar;
//   * `apps/web/.env.local` com as chaves (o harness lê daí quando o ambiente não
//     as define);
//   * Mailpit em `http://127.0.0.1:55324`.
//
// Execução só deste arquivo (ele grava no banco: lote serial):
//   npx playwright test tests/e2e/f01-entrada-real.spec.ts --workers=1
//
// Nada de CPF real: a tela recebe o sintético válido `52998224725` e a fixture
// marca o vínculo como `verified` pelo caminho canônico do banco (o Portal não
// responde no stack local). O e-mail completo nunca entra em log: as mensagens
// de erro usam a forma mascarada.
//
// @stateful: os três casos criam/consomem conta no Auth local (e o primeiro grava
// vínculo, interesses, combinado e avisos), então rodam no lote serial.

// Grupos PÚBLICOS semeados em Manaus (supabase/seed.sql: 8 grupos, 2 privados).
// A rota /api/app/entry/groups devolve só os públicos da cidade do vínculo.
const GRUPOS_PUBLICOS_SEMEADOS = [
  "Caminhada no Mindu",
  "Corrida às Terças",
  "Estudos para Concurso",
  "Pais e Filhos",
  "Reformas e Consertos",
  "Trocas de Livros",
] as const

const ROTA_DA_ENTRADA = "/app/entrar"

test.describe("F01 — entrada real no app", { tag: "@stateful" }, () => {
  test("conta nova percorre a entrada real até o Início", async ({ page }, testInfo) => {
    test.setTimeout(240_000)
    const projeto = testInfo.project.name
    const email = enderecoSintetico(`entrada-${projeto}`)

    // Fixture: conta sintética confirmada e vínculo já `verified`. É o que faz a
    // rota do CPF devolver `verified` sem chamar o Portal.
    const conta = await criarContaVerificada(email)
    expect(conta.userId, "a conta sintética precisa existir no Auth local").toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )

    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(ROTA_DA_ENTRADA)

    // ── a porta: uma entrada só ────────────────────────────────────────────
    await expect(
      page.getByRole("heading", { level: 1, name: "A comunidade militar da sua cidade." }),
      "O build servido em /app/entrar não é a entrada real (TelaDeEntrada): " +
        "rode `npx pnpm@11.18.0 app:export` e suba o Next antes do E2E.",
    ).toBeVisible({ timeout: 20_000 })
    await capturarEmDoisTemas(page, projeto, "porta")

    // ── e-mail e código de verdade ────────────────────────────────────────
    await page.getByRole("button", { name: "Continuar com e-mail" }).click()
    await esperarEtapaDaEntrada(page, "Qual é o seu e-mail?")
    await page.getByLabel("E-mail").fill(email)
    await capturarEmDoisTemas(page, projeto, "email")

    const desde = new Date()
    await page.getByRole("button", { name: "Enviar código" }).click()
    await esperarEtapaDaEntrada(page, "Digite o código")
    const lido = await lerCodigoDoEmail(email, { desde })
    await capturarEmDoisTemas(page, projeto, "codigo")
    await preencherCodigoDeEntrada(page, lido.codigo)

    // ── aceite antes do CPF ───────────────────────────────────────────────
    await esperarEtapaDaEntrada(page, "Antes de começar")
    await capturarEmDoisTemas(page, projeto, "aceite")
    await page.getByRole("button", { name: "Aceito e continuo" }).click()

    // ── CPF: o vínculo verificado volta do servidor, sem Portal ───────────
    await esperarEtapaDaEntrada(page, "Qual é o seu CPF?")
    await page.getByLabel("CPF").fill(CPF_SINTETICO)
    await capturarEmDoisTemas(page, projeto, "cpf")
    await page.getByRole("button", { name: "Confirmar vínculo" }).click()

    // ── nome ──────────────────────────────────────────────────────────────
    await esperarEtapaDaEntrada(page, "Como você se chama?")
    await page.getByLabel("Nome", { exact: true }).fill("Pessoa")
    await page.getByLabel("Sobrenome").fill("Sintética")
    await capturarEmDoisTemas(page, projeto, "nome")
    await page.getByRole("button", { name: "Continuar", exact: true }).click()

    // ── cidade pelo catálogo (UF AM → Manaus) e momento "morando" ─────────
    await esperarEtapaDaEntrada(page, "Onde você está?")
    await expect(page.getByLabel("Estado (UF)")).toBeVisible({ timeout: 20_000 })
    await page.getByLabel("Estado (UF)").selectOption({ label: "AM" })

    const selectDaCidade = page.getByLabel("Cidade", { exact: true })
    await expect(selectDaCidade).toBeEnabled({ timeout: 30_000 })
    await expect(
      selectDaCidade.locator("option", { hasText: /^Manaus$/ }),
      "o catálogo de /api/localities/AM precisa trazer Manaus",
    ).toHaveCount(1, { timeout: 30_000 })
    await selectDaCidade.selectOption({ label: "Manaus" })

    // "Moro aqui" não pede data: a etapa não pode exigir calendário. O rádio é
    // visualmente escondido (sr-only) dentro do cartão; quem clica é o cartão.
    await page.getByText("Moro aqui", { exact: true }).click()
    await expect(page.getByRole("radio", { name: "Moro aqui" })).toBeChecked()
    await expect(page.getByLabel(/Data da (chegada|saída)/)).toHaveCount(0)
    await capturarEmDoisTemas(page, projeto, "cidade")

    // O provisionamento nasce sozinho ao concluir cidade e momento. Ele precisa
    // terminar antes da etapa de grupos: /groups lê o vínculo da sessão.
    const provisionamento = esperarProvisionamento(page)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    const respostaDoProvisionamento = await provisionamento
    if (respostaDoProvisionamento.status() !== 200) {
      throw new Error(
        `POST /api/app/entry/provision respondeu ${respostaDoProvisionamento.status()}: ` +
          `${(await respostaDoProvisionamento.text()).slice(0, 200)}`,
      )
    }

    // ── prévia da cidade ──────────────────────────────────────────────────
    await esperarEtapaDaEntrada(page, /Em Manaus, sempre tem alguém precisando do que você sabe\./)
    // O selo e o texto do vínculo trazem o ícone (ligadura) no mesmo elemento:
    // por isso a busca é por trecho, não por texto exato.
    await expect(page.getByText("Vínculo confirmado").first()).toBeVisible()
    // O provisionamento limpa a falha que a tela mostrou enquanto faltava dado.
    await expect(page.getByRole("alert")).toHaveCount(0, { timeout: 30_000 })
    await capturarEmDoisTemas(page, projeto, "previa-cidade")

    // ── interesses e grupos reais da cidade ───────────────────────────────
    const carregamentoDosGrupos = esperarGruposDaCidade(page)
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    const respostaDosGrupos = await carregamentoDosGrupos
    if (respostaDosGrupos.status() !== 200) {
      throw new Error(
        `GET /api/app/entry/groups respondeu ${respostaDosGrupos.status()}: ` +
          `${(await respostaDosGrupos.text()).slice(0, 200)}`,
      )
    }
    const corpoDosGrupos = (await respostaDosGrupos.json()) as { grupos?: readonly unknown[] }
    const gruposDaCidade = Array.isArray(corpoDosGrupos.grupos) ? corpoDosGrupos.grupos : []
    expect(
      gruposDaCidade.length,
      "a rota /groups deve devolver os grupos públicos de Manaus: o vínculo precisa existir " +
        "antes de a etapa de interesses montar",
    ).toBeGreaterThan(0)

    await esperarEtapaDaEntrada(page, "O que interessa a você?")
    const primeiroGrupo = page.getByRole("button", { name: /^Entrar em /i }).first()
    await expect(primeiroGrupo).toBeVisible({ timeout: 30_000 })
    const rotuloDoGrupo = (await primeiroGrupo.getAttribute("aria-label")) ?? ""
    const nomeDoGrupo = rotuloDoGrupo.replace(/^Entrar em\s+/i, "")
    expect(
      [...GRUPOS_PUBLICOS_SEMEADOS],
      `o grupo "${nomeDoGrupo}" não é um dos grupos públicos semeados de Manaus`,
    ).toContain(nomeDoGrupo)

    await capturarEmDoisTemas(page, projeto, "interesses")
    await primeiroGrupo.click()
    await expect(page.getByRole("button", { name: `Sair de ${nomeDoGrupo}` })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await page.getByRole("button", { name: "Continuar com 1 grupo" }).click()

    // ── o combinado ───────────────────────────────────────────────────────
    await esperarEtapaDaEntrada(page, "O combinado")
    await capturarEmDoisTemas(page, projeto, "combinado")
    await page.getByRole("button", { name: "Entendi" }).click()

    // ── avisos: escolher "agora não" também é escolher ────────────────────
    await esperarEtapaDaEntrada(page, "Saiba quando responderem")
    await capturarEmDoisTemas(page, projeto, "avisos")
    await page.getByRole("button", { name: "Agora não" }).click()

    // ── o Início do app ───────────────────────────────────────────────────
    await expect(page).toHaveURL(/\/app\/inicio$/, { timeout: 30_000 })
    await expect(
      page.getByRole("heading", { level: 1, name: /Sua rede em/ }),
      "o Início do app não abriu depois do fim da entrada",
    ).toBeVisible({ timeout: 30_000 })
    await capturarEmDoisTemas(page, projeto, "inicio")
    await capturarFinais(page, projeto)

    // Prova de persistência atravessando o banco: a rota de verificação lê, sob
    // RLS, o estado canônico e o vínculo da sessão que a própria entrada criou.
    // A sonda roda no contexto da página para levar o cookie da sessão (o
    // APIRequestContext do Playwright não herda o cookie HttpOnly).
    const sonda = await page.evaluate(async () => {
      const resposta = await fetch("/api/app/entry/verification", { credentials: "include" })
      const corpo = (await resposta.json().catch(() => null)) as {
        status?: string | null
        membroDaCidade?: boolean
      } | null
      return { status: resposta.status, corpo }
    })
    expect(sonda.status, "GET /api/app/entry/verification").toBe(200)
    expect(sonda.corpo?.status, "o vínculo precisa estar verificado no banco").toBe("verified")
    expect(sonda.corpo?.membroDaCidade, "a pessoa precisa ter vínculo com a cidade").toBe(true)
  })

  test("código errado mostra a mensagem única de erro e o código certo ainda entra", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000)
    const projeto = testInfo.project.name
    const email = enderecoSintetico(`entrada-erro-${projeto}`)
    await criarContaVerificada(email)

    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(ROTA_DA_ENTRADA)

    // Mesma porta da jornada completa, sem as capturas: o alvo aqui é o caminho
    // de erro do código.
    await expect(
      page.getByRole("heading", { level: 1, name: "A comunidade militar da sua cidade." }),
      "O build servido em /app/entrar não é a entrada real (TelaDeEntrada).",
    ).toBeVisible({ timeout: 20_000 })
    await page.getByRole("button", { name: "Continuar com e-mail" }).click()
    await esperarEtapaDaEntrada(page, "Qual é o seu e-mail?")
    await page.getByLabel("E-mail").fill(email)
    const desde = new Date()
    await page.getByRole("button", { name: "Enviar código" }).click()
    await esperarEtapaDaEntrada(page, "Digite o código")

    const lido = await lerCodigoDoEmail(email, { desde })
    test.skip(
      lido.codigo === "000000",
      "o código emitido coincidiu com o código errado do caso; rode de novo",
    )

    // O caminho de erro é único de propósito (ADR de entrada §2): errado, vencido
    // e reusado respondem a mesma frase, sem dizer qual foi.
    // O ícone do aviso entra como ligadura no mesmo parágrafo: por trecho, não
    // por texto exato.
    await preencherCodigoDeEntrada(page, "000000")
    await expect(page.getByText("Código errado ou vencido. Confira ou peça outro.")).toBeVisible({
      timeout: 20_000,
    })
    await expect(
      page.getByRole("heading", { level: 1, name: "Digite o código" }),
      "a tela não pode avançar com código errado",
    ).toBeVisible()
    await capturarEmDoisTemas(page, projeto, "codigo-invalido")

    // Uma tentativa errada não queima o código: o certo ainda entra (o teto é 6).
    await preencherCodigoDeEntrada(page, lido.codigo)
    await esperarEtapaDaEntrada(page, "Antes de começar")
    await expect(page.getByText("Código errado ou vencido. Confira ou peça outro.")).toHaveCount(0)
  })

  test("documento: sem vínculo no Portal, o envio entra para análise", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000)
    const projeto = testInfo.project.name
    const email = enderecoSintetico(`entrada-doc-${projeto}`)
    // Sem vínculo pré-gravado: a rota do CPF consulta o Portal, que no stack
    // local não tem chave e responde "fora do ar". É o caminho de falha real.
    await criarContaConfirmada(email)

    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(ROTA_DA_ENTRADA)
    await page.getByRole("button", { name: "Continuar com e-mail" }).click()
    await esperarEtapaDaEntrada(page, "Qual é o seu e-mail?")
    await page.getByLabel("E-mail").fill(email)
    const desde = new Date()
    await page.getByRole("button", { name: "Enviar código" }).click()
    await esperarEtapaDaEntrada(page, "Digite o código")
    const lido = await lerCodigoDoEmail(email, { desde })
    await preencherCodigoDeEntrada(page, lido.codigo)

    await esperarEtapaDaEntrada(page, "Antes de começar")
    await page.getByRole("button", { name: "Aceito e continuo" }).click()

    await esperarEtapaDaEntrada(page, "Qual é o seu CPF?")
    await page.getByLabel("CPF").fill(CPF_SINTETICO)
    await page.getByRole("button", { name: "Confirmar vínculo" }).click()

    await esperarEtapaDaEntrada(page, "Como você se chama?")
    await page.getByLabel("Nome", { exact: true }).fill("Pessoa")
    await page.getByLabel("Sobrenome").fill("Sintética")
    await page.getByRole("button", { name: "Continuar", exact: true }).click()

    await esperarEtapaDaEntrada(page, "Onde você está?")
    await page.getByLabel("Estado (UF)").selectOption({ label: "AM" })
    const selectDaCidade = page.getByLabel("Cidade", { exact: true })
    await expect(selectDaCidade).toBeEnabled({ timeout: 30_000 })
    await selectDaCidade.selectOption({ label: "Manaus" })
    await page.getByText("Moro aqui", { exact: true }).click()
    await page.getByRole("button", { name: "Continuar", exact: true }).click()

    await esperarEtapaDaEntrada(page, "O Portal está fora do ar")
    await page.getByRole("button", { name: "Enviar documento" }).click()

    await esperarEtapaDaEntrada(page, "Envie um documento")
    // PDF mínimo válido pela regra do servidor (assinatura `%PDF-` no offset 0).
    const pdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
    )
    await page.getByLabel("Escolher arquivo").setInputFiles({
      name: "identidade.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    })
    const envio = page.waitForResponse(
      (resposta) =>
        resposta.url().includes("/api/app/entry/document") &&
        resposta.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Enviar para análise" }).click()
    const resposta = await envio
    expect(resposta.status(), `POST /api/app/entry/document respondeu ${resposta.status()}`).toBe(
      200,
    )
    await esperarEtapaDaEntrada(page, "Documento em análise")
  })

  test("membro com sessão em /app/entrar cai no Início", async ({ page, context }, testInfo) => {
    test.setTimeout(90_000)
    const projeto = testInfo.project.name

    try {
      // A persona do seed (visual@) é verificada e já é membro de Manaus. O
      // password grant é o caminho confiável no stack local; o link do Mailpit não é.
      await semearSessaoDeMembro(context, MEMBRO_SEMEADO)
    } catch (erro: unknown) {
      if (erro instanceof ContaIndisponivel) {
        // Sem chave anônima no ambiente ou persona sem a senha sintética: o
        // password grant não é possível neste stack. Não é defeito da entrada —
        // o caso fica registrado como pulado, com o motivo.
        test.skip(
          true,
          `password grant indisponível para a persona semeada (${erro.message}); ` +
            "defina SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY (ou BIVAQUE_VISUAL_PASSWORD) " +
            "para habilitar este caso",
        )
      }
      throw erro
    }

    await page.emulateMedia({ colorScheme: "light" })
    await page.goto(ROTA_DA_ENTRADA)

    // Quem já é membro não repete a entrada: a tela devolve a pessoa ao Início.
    await expect(page).toHaveURL(/\/app\/inicio$/, { timeout: 30_000 })
    await expect(
      page.getByRole("heading", { level: 1, name: /Sua rede em/ }),
      "membro autenticado em /app/entrar deveria terminar no Início",
    ).toBeVisible({ timeout: 30_000 })
    await capturarEmDoisTemas(page, projeto, "membro-inicio")
  })
})
