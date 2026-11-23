import { execFileSync } from "node:child_process"
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { _android } from "playwright"

const pasta = join(process.cwd(), ".visual", "loja-004", "nativo")
const pacote = "br.com.bivaque.app"
mkdirSync(pasta, { recursive: true })
const log = (texto) => appendFileSync(join(pasta, "roteiro.log"), `${texto}\n`)
const logRede = (texto) => appendFileSync(join(pasta, "rede.log"), `${texto}\n`)
const sanitizar = (texto) =>
  texto
    .replace(/eyJ[A-Za-z0-9._-]+/g, "[omitido]")
    .replace(/Bearer\s+[^\s]+/gi, "[omitido]")
    .replace(/\b\d{6}\b/g, "[omitido]")
    .replace(/\?[^\s]*/g, "[omitido]")
    .slice(0, 300)
const urlSemQuery = (valor) => {
  try {
    const url = new URL(valor)
    return `${url.origin}${url.pathname}`
  } catch {
    return "URL indisponível"
  }
}
let diagnosticarCodigo = false
function instrumentarRede(pagina) {
  pagina.on("pageerror", () => {
    if (diagnosticarCodigo) log("02-codigo: erro JavaScript nao tratado")
  })
  pagina.on("requestfailed", (pedido) =>
    logRede(
      `requestfailed ${pedido.method()} ${urlSemQuery(pedido.url())} ${sanitizar(pedido.failure()?.errorText ?? "falha sem detalhe")}`,
    ),
  )
  pagina.on("response", (resposta) => {
    if (diagnosticarCodigo) {
      const pedido = resposta.request()
      const caminho = new URL(resposta.url()).pathname
      if (caminho.startsWith("/api/app/")) {
        const rotas = new Set([
          "/api/app/entry/otp/verify",
          "/api/app/entry/progress",
          "/api/app/entry/verification",
          "/api/app/inicio",
          "/api/app/mercado/salvos",
        ])
        const rota = rotas.has(caminho) ? caminho : "/api/app/[outra]"
        const autorizacao = pedido.headers()["authorization"] ? "sim" : "nao"
        log(
          `02-codigo: ${pedido.method()} ${rota} status=${resposta.status()} authorization=${autorizacao}`,
        )
      }
    }
    if (resposta.status() >= 400)
      logRede(
        `response ${resposta.request().method()} ${urlSemQuery(resposta.url())} ${resposta.status()}`,
      )
  })
  pagina.on("console", (mensagem) => {
    if (mensagem.type() === "error" || mensagem.type() === "warning")
      logRede(`console ${mensagem.type()} ${sanitizar(mensagem.text())}`)
  })
}
const adb = (...args) =>
  execFileSync("adb", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function captura(nome) {
  const png = execFileSync("adb", ["exec-out", "screencap", "-p"], { maxBuffer: 20_000_000 })
  writeFileSync(join(pasta, `${nome}.png`), png)
}
function diagnostico(podeCapturar) {
  if (podeCapturar) {
    try {
      captura("falha")
    } catch {
      log("Captura de falha indisponível")
    }
  }
  try {
    // Apenas prioridade e tag: mensagens do Android podem conter URLs ou credenciais.
    const linhas = adb("logcat", "-d", "-v", "brief", "--pid", adb("shell", "pidof", pacote).trim())
      .split("\n")
      .map((linha) =>
        linha
          .match(/^([VDIWEF])\/([^(: ]+)/)
          ?.slice(1)
          .join(" "),
      )
      .filter(Boolean)
      .join("\n")
    writeFileSync(join(pasta, "logcat-filtrado.log"), `${linhas}\n`)
  } catch {
    writeFileSync(join(pasta, "logcat-filtrado.log"), "Processo indisponível\n")
  }
}
const paginasInstrumentadas = new WeakSet()
let device
let page
let falhou = false
function comLimite(promessa, ms, rotulo) {
  let relogio
  const limite = new Promise((_, rejeitar) => {
    relogio = setTimeout(() => rejeitar(new Error(`${rotulo} excedeu ${ms / 1000}s`)), ms)
  })
  return Promise.race([promessa, limite]).finally(() => clearTimeout(relogio))
}
async function paginaAtual() {
  const limite = Date.now() + 30000
  while (Date.now() < limite) {
    for (const view of device.webViews().filter((v) => v.pkg() === pacote)) {
      try {
        let atual = await comLimite(view.page(), 10000, "Conexão à WebView")
        if (atual.isClosed()) {
          // O Playwright guarda a primeira página do socket; quando a WebView troca de alvo
          // no mesmo processo, procura a página aberta no contexto ou reconecta ao socket.
          const aberta = atual
            .context()
            .pages()
            .find((candidata) => !candidata.isClosed())
          if (aberta) atual = aberta
          else {
            view._pagePromise = undefined
            atual = await comLimite(view.page(), 10000, "Reconexão à WebView")
          }
          if (atual.isClosed()) continue
          log("WebView readquirida depois de trocar de alvo")
        }
        if (!paginasInstrumentadas.has(atual)) {
          instrumentarRede(atual)
          paginasInstrumentadas.add(atual)
          atual.setDefaultTimeout(60000)
        }
        page = atual
        return atual
      } catch {
        // A WebView pode desaparecer enquanto é consultada.
      }
    }
    await esperar(500)
  }
  throw new Error("WebView de depuração não apareceu em 30 segundos")
}
async function limparCodigo() {
  try {
    if (!page || page.isClosed()) await paginaAtual()
    const campo = page.getByLabel("Código de 6 números")
    if (await campo.isVisible()) await campo.fill("")
    return true
  } catch {
    return false
  }
}
async function passo(nome, acao, dependencia = true) {
  log(`Início: ${nome}`)
  try {
    if (!dependencia) throw new Error("Dependência do passo falhou")
    if (/^0[5-8]-/.test(nome)) {
      if (falhou) {
        adb("shell", "pm", "clear", pacote)
        log(`Dados do app limpos antes de ${nome}`)
        page = undefined
      }
      abrir()
      // O processo antigo some com o pm clear; espera a WebView nova assentar.
      await esperar(5000)
    }
    await paginaAtual()
    await acao()
    if (!(await limparCodigo())) throw new Error("Não foi possível limpar o campo de código")
    captura(nome)
    log(`OK: ${nome}`)
    return true
  } catch (erro) {
    falhou = true
    log(
      `FALHOU: ${nome}; URL ${urlSemQuery(page?.isClosed() ? "" : (page?.url() ?? ""))}; erro ${sanitizar(erro instanceof Error ? erro.message : String(erro))}`,
    )
    if (nome === "02-codigo" && page && !page.isClosed()) {
      try {
        const estado = await page.evaluate(() => ({
          rota: location.pathname,
          filhos: Boolean(document.querySelector("#root")?.children.length),
        }))
        log(
          `02-codigo: rota=${/^\/app\/[a-z0-9/_-]*$/.test(estado.rota) ? estado.rota : "outra"} root_com_filhos=${estado.filhos}`,
        )
      } catch {
        log("02-codigo: estado da WebView indisponivel")
      }
    }
    const limpa = await limparCodigo()
    if (limpa) {
      try {
        captura(nome)
      } catch {
        log(`Captura indisponível: ${nome}`)
      }
    } else log(`Captura omitida para proteger o código: ${nome}`)
    diagnostico(false)
    return false
  }
}
async function esperarAutenticada() {
  const limite = Date.now() + 120000
  let reaberto = false
  while (Date.now() < limite) {
    let atual
    try {
      atual = await paginaAtual()
    } catch (erro) {
      if (reaberto) throw erro
      // A WebView troca de alvo depois do código e pode não voltar ao depurador; a sessão
      // gravada é o que importa, então reabre o app e confere a tela autenticada.
      log("WebView não voltou depois do código; app reaberto para conferir a sessão")
      adb("shell", "am", "force-stop", pacote)
      abrir()
      await esperar(3000)
      reaberto = true
      continue
    }
    try {
      await atual
        .getByRole("button", { name: "Você", exact: true })
        .waitFor({ timeout: Math.min(5000, limite - Date.now()) })
      return
    } catch (erro) {
      if (!atual.isClosed() && Date.now() >= limite) throw erro
    }
  }
  throw new Error("Tela autenticada não apareceu")
}
function abrir() {
  adb("shell", "monkey", "-p", pacote, "1")
}
async function codigoDoMailpit(email, desde) {
  const config = readFileSync("supabase/config.toml", "utf8")
  const inbucket = config.match(/^\[inbucket\]\s*([\s\S]*?)(?=^\[|$)/m)?.[1]
  const porta = inbucket?.match(/^\s*port\s*=\s*(\d+)/m)?.[1]
  const base = process.env.MAILPIT_URL ?? `http://127.0.0.1:${porta ?? "55324"}`
  log(`Mailpit: ${urlSemQuery(base)}`)
  const url = (path) => `${base.replace(/\/$/, "")}${path}`
  for (let i = 0; i < 90; i++) {
    const lista = await (await fetch(url("/api/v1/messages?limit=50"))).json()
    const mensagem = lista.messages?.find(
      (m) => m.To?.some((p) => p.Address === email) && Date.parse(m.Created) >= desde - 2000,
    )
    if (mensagem) {
      const detalhe = await (
        await fetch(url(`/api/v1/message/${encodeURIComponent(mensagem.ID)}`))
      ).json()
      const codigo =
        `${detalhe.Text ?? ""} ${detalhe.Subject ?? ""} ${(detalhe.HTML ?? "").replace(/<[^>]*>/g, " ")}`.match(
          /\b(\d{6})\b/,
        )?.[1]
      if (codigo) return codigo
    }
    await esperar(1000)
  }
  throw new Error("Mensagem de código não chegou ao Mailpit")
}
try {
  const seed = readFileSync("supabase/seed.sql", "utf8")
  const email = seed.match(/'([^']*membro-rio@bivaque\.example\.invalid)'/)?.[1]
  if (!email) throw new Error("Persona verificada não encontrada no seed")
  ;[device] = await _android.devices()
  if (!device) throw new Error("Emulador Android indisponível")
  abrir()
  await passo("01-entrada", async () => {
    const entrada = page.getByRole("button", { name: "Continuar com e-mail" })
    try {
      await entrada.waitFor({ timeout: 60000 })
      log("Resultado 01-entrada: tela de entrada")
    } catch {
      log(`Resultado 01-entrada: outra tela; URL ${urlSemQuery(page.url())}`)
      throw new Error(`app não foi para a entrada sem sessão; URL ${urlSemQuery(page.url())}`)
    }
  })
  const codigoOk = await passo("02-codigo", async () => {
    await page.getByRole("button", { name: "Continuar com e-mail" }).click()
    await page.getByLabel("E-mail", { exact: true }).fill("")
    await page.getByLabel("E-mail", { exact: true }).click()
    await esperar(1500)
    captura("02-teclado")
    await page.getByLabel("E-mail", { exact: true }).fill(email)
    const desde = Date.now()
    await page.getByRole("button", { name: "Enviar código" }).click()
    diagnosticarCodigo = true
    await page.getByLabel("Código de 6 números").fill(await codigoDoMailpit(email, desde))
    await esperarAutenticada()
    captura("02-inicio-barras")
    diagnosticarCodigo = false
  })
  const reabriu = await passo(
    "03-reabrir",
    async () => {
      adb("shell", "am", "force-stop", pacote)
      abrir()
      page = await paginaAtual()
      await page.getByRole("button", { name: "Você", exact: true }).waitFor({ timeout: 90000 })
      await page.getByRole("button", { name: "Você", exact: true }).click()
      await page.getByText("Sua conta, seus anúncios e seus ajustes.").waitFor()
      await page.getByText("Rio de Janeiro", { exact: true }).first().waitFor()
      await page.getByText("Sair da conta", { exact: true }).waitFor()
    },
    codigoOk,
  )
  await passo(
    "04-sair",
    async () => {
      await page.getByText("Sair da conta", { exact: true }).click()
      await page.getByRole("button", { name: "Sair", exact: true }).click()
      await page.getByRole("button", { name: "Continuar com e-mail" }).waitFor()
      adb("shell", "am", "force-stop", pacote)
      abrir()
      page = await paginaAtual()
      await page.getByRole("button", { name: "Continuar com e-mail" }).waitFor()
    },
    reabriu,
  )
  await passo("05-link", async () => {
    adb(
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      "bivaque://app/entrar",
      pacote,
    )
    await page.waitForURL(/\/app\/entrar/)
    await page.getByRole("button", { name: "Continuar com e-mail" }).waitFor()
  })
  await passo("06-callback-sem-fluxo", async () => {
    await page.getByRole("button", { name: "Continuar com e-mail" }).waitFor()
    const antes = page.url()
    adb(
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      "bivaque://auth-callback",
      pacote,
    )
    await esperar(3000)
    if (page.url() !== antes) throw new Error("Callback alterou a rota")
    await page.getByRole("button", { name: "Continuar com e-mail" }).waitFor()
  })
  await passo("07-backup", async () => {
    const manifest = adb("shell", "dumpsys", "package", pacote)
    const flags = manifest.match(/pkgFlags=\[([^\]]*)\]/)?.[1]
    if (!flags || /\bALLOW_BACKUP\b/.test(flags)) throw new Error("allowBackup não comprovado")
  })
  await passo("08-google", async () => {
    const resposta = page.waitForResponse(
      (r) => r.url().endsWith("/api/app/entry/oauth") && r.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Continuar com Google" }).click()
    const corpo = await (await resposta).json()
    const url = new URL(corpo.url)
    if (!process.env.VITE_SUPABASE_URL) throw new Error("VITE_SUPABASE_URL ausente no roteiro")
    const origemEsperada = new URL(process.env.VITE_SUPABASE_URL).origin
    const provider = url.searchParams.get("provider")
    const metodo = url.searchParams.get("code_challenge_method")
    const desafio = url.searchParams.get("code_challenge") ?? ""
    const formatoValido = /^[\w-]{43}$/.test(desafio)
    const campoSeguro = (valor) => (/^[a-z0-9_-]{1,20}$/i.test(valor ?? "") ? valor : "inválido")
    log(
      `OAuth: origem=${url.origin} caminho=${url.pathname === "/auth/v1/authorize" ? url.pathname : "inesperado"} provider=${campoSeguro(provider)} metodo=${campoSeguro(metodo)} desafio_comprimento=${desafio.length} desafio_formato_valido=${formatoValido}`,
    )
    if (
      url.origin !== origemEsperada ||
      url.pathname !== "/auth/v1/authorize" ||
      provider !== "google" ||
      metodo?.toLowerCase() !== "s256" ||
      !formatoValido
    )
      throw new Error("URL OAuth ou PKCE inválido")
    await esperar(5000)
    // Consultar somente endereco fixo, sem parametros OAuth.
    const resolucao = adb(
      "shell",
      "cmd",
      "package",
      "resolve-activity",
      "--brief",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      "https://example.invalid/",
    )
    const padrao =
      resolucao
        .match(/([a-zA-Z0-9_.]+)\/[a-zA-Z0-9_.$]+/g)
        ?.at(-1)
        ?.split("/")[0] ?? "indisponivel"
    const atividade = adb("shell", "dumpsys", "activity", "activities")
    const primeiroPlano =
      atividade.match(/mResumedActivity[^\n]*? ([a-zA-Z0-9_.]+)\/[a-zA-Z0-9_.$]+/)?.[1] ??
      "indisponivel"
    const abriu =
      padrao !== "indisponivel" &&
      primeiroPlano === padrao &&
      atividade.includes("/auth/v1/authorize")
    log(
      `Google: imagem=google_apis API=${adb("shell", "getprop", "ro.build.version.sdk").trim()} intent=VIEW navegador_padrao=${padrao} primeiro_plano=${primeiroPlano} authorize_em_atividade=${abriu}`,
    )
    if (!abriu) throw new Error("Intent VIEW OAuth nao observado em atividade")
  })
  if (falhou) process.exitCode = 1
} catch (erro) {
  log(`FALHOU: preparação; erro ${sanitizar(erro instanceof Error ? erro.message : String(erro))}`)
  process.exitCode = 1
} finally {
  diagnostico(await limparCodigo())
  await device?.close()
}
