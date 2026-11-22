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
function instrumentarRede(pagina) {
  pagina.on("requestfailed", (pedido) =>
    logRede(
      `requestfailed ${pedido.method()} ${urlSemQuery(pedido.url())} ${sanitizar(pedido.failure()?.errorText ?? "falha sem detalhe")}`,
    ),
  )
  pagina.on("response", (resposta) => {
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
async function passo(nome, acao) {
  log(`Início: ${nome}`)
  try {
    await acao()
    captura(nome)
    log(`OK: ${nome}`)
  } catch (erro) {
    log(
      `FALHOU: ${nome}; URL ${urlSemQuery(page?.url() ?? "")}; erro ${sanitizar(erro instanceof Error ? erro.message : String(erro))}`,
    )
    throw new Error(`Falha no passo ${nome}; consulte a captura e o log filtrado`)
  }
}
async function webview(device) {
  for (let i = 0; i < 90; i++) {
    const view = device.webViews().find((v) => v.pkg() === pacote)
    if (view) return view.page()
    await esperar(1000)
  }
  throw new Error("WebView de depuração não apareceu")
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
let device
let page
try {
  const seed = readFileSync("supabase/seed.sql", "utf8")
  const email = seed.match(/'([^']*membro-rio@bivaque\.example\.invalid)'/)?.[1]
  if (!email) throw new Error("Persona verificada não encontrada no seed")
  ;[device] = await _android.devices()
  if (!device) throw new Error("Emulador Android indisponível")
  abrir()
  page = await webview(device)
  instrumentarRede(page)
  page.setDefaultTimeout(60000)
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
  await passo("02-codigo", async () => {
    await page.getByRole("button", { name: "Continuar com e-mail" }).click()
    await page.getByLabel("E-mail", { exact: true }).fill(email)
    const desde = Date.now()
    await page.getByRole("button", { name: "Enviar código" }).click()
    await page.getByLabel("Código de 6 números").fill(await codigoDoMailpit(email, desde))
    await page.getByRole("button", { name: "Você", exact: true }).waitFor({ timeout: 90000 })
  })
  await passo("03-reabrir", async () => {
    adb("shell", "am", "force-stop", pacote)
    abrir()
    page = await webview(device)
    instrumentarRede(page)
    await page.getByRole("button", { name: "Você", exact: true }).waitFor({ timeout: 90000 })
    await page.getByRole("button", { name: "Você", exact: true }).click()
    await page.getByText("Sua conta, seus anúncios e seus ajustes.").waitFor()
    await page.getByText("Rio de Janeiro", { exact: true }).first().waitFor()
    await page.getByText("Sair da conta", { exact: true }).waitFor()
  })
  await passo("04-sair", async () => {
    await page.getByText("Sair da conta", { exact: true }).click()
    await page.getByRole("button", { name: "Sair", exact: true }).click()
    await page.getByRole("button", { name: "Continuar com e-mail" }).waitFor()
    adb("shell", "am", "force-stop", pacote)
    abrir()
    page = await webview(device)
    instrumentarRede(page)
    await page.getByRole("button", { name: "Continuar com e-mail" }).waitFor()
  })
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
    if (
      !["http://localhost:54321", "http://127.0.0.1:54321"].includes(url.origin) ||
      url.pathname !== "/auth/v1/authorize" ||
      url.searchParams.get("provider") !== "google" ||
      url.searchParams.get("code_challenge_method")?.toLowerCase() !== "s256" ||
      !/^[\w-]{43}$/.test(url.searchParams.get("code_challenge") ?? "")
    )
      throw new Error("URL OAuth ou PKCE inválido")
    await esperar(5000)
    const atividade = adb("shell", "dumpsys", "activity", "activities")
    if (
      !atividade.includes("/auth/v1/authorize") ||
      !/com\.android\.chrome|org\.chromium/i.test(atividade)
    )
      throw new Error("Navegador do sistema não abriu")
  })
} catch (erro) {
  try {
    const campo = page?.getByLabel("Código de 6 números")
    if (campo && (await campo.isVisible())) await campo.fill("")
  } catch {
    // A captura de falha é omitida se não for possível limpar o campo sensível.
    page = undefined
  }
  log(erro instanceof Error ? erro.message : "Falha inesperada")
  process.exitCode = 1
} finally {
  diagnostico(Boolean(page))
  await device?.close()
}
