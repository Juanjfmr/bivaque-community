import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"

/*
 * Grava as respostas de `/api/` que o app pede enquanto uma persona do seed
 * navega por ele, para o APK de experimento (EXP-CASCA-CAPACITOR) funcionar
 * sem servidor. Só fala com a stack LOCAL: Next em localhost e o Supabase do
 * `supabase start`, com `supabase/seed.sql` aplicado. Nada de banco remoto.
 *
 * Saída (gerada, não versionada): apps/app/casca-gravacao/gravacao.json e
 * apps/app/casca-gravacao/midia/. `montar-casca.mjs` leva as duas para o build.
 *
 * Credenciais: BIVAQUE_VISUAL_EMAIL / BIVAQUE_VISUAL_PASSWORD e a chave anônima,
 * do ambiente ou de apps/web/.env.local. Sem elas o script falha.
 */

const raiz = process.cwd()
const saida = join(raiz, "apps", "app", "casca-gravacao")
const base = process.env["BIVAQUE_CASCA_ORIGEM"] ?? "http://localhost:3000"
const LIMITE_DE_TELAS = Number(process.env["BIVAQUE_CASCA_LIMITE"] ?? "320")
const PREFIXO_DA_MIDIA = "/app/casca/midia/"

function doEnvLocal(chave) {
  try {
    const arquivo = readFileSync(join(raiz, "apps", "web", ".env.local"), "utf8")
    for (const linha of arquivo.split("\n")) {
      const igual = linha.indexOf("=")
      if (igual !== -1 && linha.slice(0, igual).trim() === chave) {
        return linha
          .slice(igual + 1)
          .trim()
          .replace(/^["']|["']$/g, "")
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

function exigir(chave) {
  const valor = process.env[chave] ?? doEnvLocal(chave)
  if (!valor) throw new Error(`gravar-casca: falta ${chave} (ambiente ou apps/web/.env.local)`)
  return valor
}

const supabase = exigir("NEXT_PUBLIC_SUPABASE_URL")
const chaveAnonima = exigir("NEXT_PUBLIC_SUPABASE_ANON_KEY")
const email = exigir("BIVAQUE_VISUAL_EMAIL")
const senha = exigir("BIVAQUE_VISUAL_PASSWORD")

for (const endereco of [base, supabase]) {
  const { hostname } = new URL(endereco)
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error(`gravar-casca: só grava da stack local, não de ${hostname}`)
  }
}

async function entrar() {
  const resposta = await fetch(`${supabase}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: chaveAnonima, "content-type": "application/json" },
    body: JSON.stringify({ email, password: senha }),
  })
  if (!resposta.ok)
    throw new Error(`gravar-casca: a entrada da persona falhou (${resposta.status})`)
  const corpo = await resposta.json()
  return corpo.access_token
}

const token = await entrar()
const respostas = new Map()
const midia = new Map()

function ehDaApi(url) {
  return url.origin === new URL(base).origin && url.pathname.startsWith("/api/")
}

function guardarMidia(endereco, bytes, tipo) {
  if (midia.has(endereco)) return
  const extensao = (tipo.split("/")[1] ?? "bin")
    .split(";")[0]
    .replace("jpeg", "jpg")
    .replace("+xml", "")
  const nome = `${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.${extensao}`
  midia.set(endereco, { nome, bytes })
}

const executavel = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
const navegador = await chromium.launch(executavel ? { executablePath: executavel } : {})
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
})
await contexto.route(
  (url) => ehDaApi(url),
  async (rota) => {
    // A gravação só lê: um toque que tentasse escrever para aqui.
    if (rota.request().method() !== "GET") {
      await rota.abort()
      return
    }
    await rota.continue({
      headers: { ...rota.request().headers(), authorization: `Bearer ${token}` },
    })
  },
)
const pagina = await contexto.newPage()

pagina.on("response", async (resposta) => {
  const pedido = resposta.request()
  if (pedido.method() !== "GET") return
  const url = new URL(resposta.url())
  const tipo = resposta.headers()["content-type"] ?? ""
  try {
    if (ehDaApi(url) && tipo.includes("application/json")) {
      if (resposta.status() !== 200) return
      respostas.set(`${url.pathname}${url.search}`, { status: 200, corpo: await resposta.json() })
      return
    }
    const foraDoBuild = url.origin !== new URL(base).origin || ehDaApi(url)
    if (foraDoBuild && tipo.startsWith("image/") && resposta.status() === 200) {
      guardarMidia(resposta.url(), await resposta.body(), tipo)
    }
  } catch {
    // A tela navegou antes de o corpo chegar: a próxima visita grava de novo.
  }
})

/** Pedidos de `/api/` ainda sem resposta: a tela assentou quando não há nenhum. */
let pendentes = 0
pagina.on("request", (pedido) => {
  if (ehDaApi(new URL(pedido.url()))) pendentes += 1
})
for (const fim of ["requestfinished", "requestfailed"]) {
  pagina.on(fim, (pedido) => {
    if (ehDaApi(new URL(pedido.url()))) pendentes = Math.max(0, pendentes - 1)
  })
}

async function assentar() {
  let quieto = 0
  for (let volta = 0; volta < 200 && quieto < 4; volta += 1) {
    await pagina.waitForTimeout(100)
    quieto = pendentes === 0 ? quieto + 1 : 0
  }
}

/** Rola o conteúdo até o fim, para a tela pedir todas as páginas da lista. */
async function rolarAteOFim() {
  let parado = 0
  for (let volta = 0; volta < 40 && parado < 3; volta += 1) {
    const antes = respostas.size
    const andou = await pagina.evaluate(() => {
      const alvo = document.querySelector("#conteudo") ?? document.scrollingElement
      if (!alvo) return false
      const topo = alvo.scrollTop
      alvo.scrollTop = alvo.scrollHeight
      alvo.dispatchEvent(new Event("scroll", { bubbles: true }))
      return alvo.scrollTop !== topo
    })
    await pagina.mouse.wheel(0, 1200)
    await pagina.waitForTimeout(150)
    await assentar()
    parado = !andou && respostas.size === antes ? parado + 1 : 0
  }
}

/** Listas da API cujo item abre uma tela de detalhe: chave da lista -> rota. */
const DETALHES = {
  conversas: "conversa",
  grupos: "grupo",
  perguntas: "pergunta",
  anuncios: "anuncio",
  negocios: "negocio",
  eventos: "evento",
  pedidos: "pedido",
  publicacoes: "publicacao",
}
const LIMITE_POR_ROTA = Number(process.env["BIVAQUE_CASCA_LIMITE_POR_ROTA"] ?? "80")
const porRota = new Map()

/**
 * O app navega por botão, não por âncora: os endereços de detalhe saem das
 * próprias respostas (o `id` de cada item de lista e todo texto `/app/...`).
 */
function enderecosDasRespostas(valor, achados) {
  if (typeof valor === "string") {
    if (valor.startsWith("/app/")) achados.add(valor)
  } else if (Array.isArray(valor)) {
    for (const item of valor) enderecosDasRespostas(item, achados)
  } else if (valor !== null && typeof valor === "object") {
    for (const [chave, item] of Object.entries(valor)) {
      const rota = DETALHES[chave]
      if (rota && Array.isArray(item)) {
        for (const linha of item) {
          if (linha !== null && typeof linha === "object" && typeof linha.id === "string") {
            achados.add(`/app/${rota}/${encodeURIComponent(linha.id)}`)
          }
        }
      }
      enderecosDasRespostas(item, achados)
    }
  }
  return achados
}

function cabeNoLimite(caminho) {
  const rota = caminho.split("/")[2] ?? ""
  const quantos = porRota.get(rota) ?? 0
  if (quantos >= LIMITE_POR_ROTA) return false
  porRota.set(rota, quantos + 1)
  return true
}

/**
 * Abre cada segmento, chip e filtro da tela, para gravar o que eles pedem. Duas
 * passadas, porque trocar de aba revela filtros que não estavam na tela.
 */
async function abrirSecoes() {
  const seletor = "[data-segmentos] button[data-secao], button[data-filtro], [data-chip]"
  const tocados = new Set()
  for (let passada = 0; passada < 2; passada += 1) {
    const quantas = await pagina.locator(seletor).count()
    for (let indice = 0; indice < quantas; indice += 1) {
      const botao = pagina.locator(seletor).nth(indice)
      if (!(await botao.isVisible().catch(() => false))) continue
      const nome = (await botao.textContent().catch(() => "")) ?? ""
      if (tocados.has(nome)) continue
      tocados.add(nome)
      await botao.click({ timeout: 5_000 }).catch(() => undefined)
      await assentar()
      await rolarAteOFim()
    }
  }
}

const RAIZES = [
  "/app/",
  "/app/comunidade",
  "/app/conversas",
  "/app/avisos",
  "/app/voce",
  "/app/busca",
  "/app/mercado",
  "/app/desapegos",
  "/app/imoveis",
  "/app/negocios",
  "/app/agenda",
  "/app/guia",
  "/app/salvos",
  "/app/meus-anuncios",
  "/app/minhas",
  "/app/pedidos",
  "/app/ocultados",
  "/app/bloqueados",
]
const fila = [...RAIZES]
const vistas = new Set()

while (fila.length > 0 && vistas.size < LIMITE_DE_TELAS) {
  const caminho = fila.shift()
  if (caminho === undefined || vistas.has(caminho)) continue
  if (/\/app\/(entrar|apagar-conta|dono|galeria|previa)/.test(caminho)) continue
  vistas.add(caminho)
  await pagina.goto(`${base}${caminho}`, { waitUntil: "domcontentloaded", timeout: 120_000 })
  await assentar()
  await rolarAteOFim()
  await abrirSecoes()
  for (const proximo of enderecosDasRespostas([...respostas.values()], new Set())) {
    if (vistas.has(proximo) || fila.includes(proximo)) continue
    if (cabeNoLimite(proximo)) fila.push(proximo)
  }
  console.log(`gravar-casca: ${caminho} (${respostas.size} respostas, ${midia.size} imagens)`)
}

/** Endereços de imagem que só aparecem dentro das respostas: baixa também. */
function textosDe(valor, achados) {
  if (typeof valor === "string") achados.add(valor)
  else if (Array.isArray(valor)) for (const item of valor) textosDe(item, achados)
  else if (valor !== null && typeof valor === "object") {
    for (const item of Object.values(valor)) textosDe(item, achados)
  }
  return achados
}

const origemDoBanco = new URL(supabase).origin
for (const texto of textosDe([...respostas.values()], new Set())) {
  const daApi = texto.startsWith("/api/")
  if (!daApi && !texto.startsWith(origemDoBanco)) continue
  if (midia.has(texto) || midia.has(`${base}${texto}`)) continue
  const resposta = await fetch(daApi ? `${base}${texto}` : texto, {
    headers: daApi ? { authorization: `Bearer ${token}`, origin: base } : {},
  }).catch(() => null)
  const tipo = resposta?.headers.get("content-type") ?? ""
  if (resposta?.ok && tipo.startsWith("image/")) {
    guardarMidia(texto, Buffer.from(await resposta.arrayBuffer()), tipo)
  }
}

await navegador.close()

/** Troca, nas respostas, cada endereço de imagem pelo arquivo embutido. */
function reescrever(valor) {
  if (typeof valor === "string") {
    const achada = midia.get(valor) ?? midia.get(`${base}${valor}`)
    return achada ? `${PREFIXO_DA_MIDIA}${achada.nome}` : valor
  }
  if (Array.isArray(valor)) return valor.map(reescrever)
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [chave, reescrever(item)]),
    )
  }
  return valor
}

rmSync(saida, { recursive: true, force: true })
mkdirSync(join(saida, "midia"), { recursive: true })
for (const { nome, bytes } of midia.values()) writeFileSync(join(saida, "midia", nome), bytes)
const gravacao = {
  gravadaEm: new Date().toISOString(),
  respostas: Object.fromEntries(
    [...respostas.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, valor]) => [chave, reescrever(valor)]),
  ),
}
writeFileSync(join(saida, "gravacao.json"), `${JSON.stringify(gravacao)}\n`)
console.log(
  `gravar-casca: ${vistas.size} telas, ${respostas.size} respostas, ${midia.size} imagens em ${saida}`,
)
