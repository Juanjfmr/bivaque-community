// Comparação lado a lado: prancha (o que foi aprovado) × runtime (o que está no ar).
//
// O mapa de jornadas tem a referência; o loop visual tem a captura. Faltava juntar os dois na
// mesma tela — que é a Task 7 do plano de auditoria, "revisão de julgamento, tela a tela".
//
// Este script não julga. Ele monta o par e mede a cobertura: quantas pranchas têm captura, quais
// rotas capturadas não têm prancha, e quais pranchas nunca foram conferidas contra o runtime.
// Julgar é da rubrica, e é humano.
//
// Cuidado deliberado: o pareamento é por rota, não por pixel. Semelhança entre a prancha e o print
// NÃO é prova de acerto, e diferença NÃO é prova de erro — a prancha é proposta de aparência, e as
// notas textuais prevalecem sobre o bitmap.
//
// Uso:
//   node scripts/visual/compare.mjs

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))
const VISUAL = join(repoRoot, ".visual")
const GUIDE = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")
const INVENTORY = join(repoRoot, "docs", "agents", "PRANCHAS-WEB-RESTANTES.md")
const OUT_DIR = join(VISUAL, "compare")
const CURRENT_REVISION =
  process.env["BIVAQUE_COMPARE_REVISION"] ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()

const url = (abs) => relative(OUT_DIR, abs).split(sep).join("/")

// ---------------------------------------------------------------- capturas

if (!existsSync(VISUAL)) {
  console.error(".visual/ não existe — rode node scripts/visual/loop.mjs primeiro")
  process.exit(1)
}

const ultimaPorRota = new Map()
for (const run of readdirSync(VISUAL)) {
  const dir = join(VISUAL, run)
  if (!statSync(dir).isDirectory() || run === "compare") continue
  const report = join(dir, "report.json")
  if (!existsSync(report)) continue
  let data
  try {
    data = JSON.parse(readFileSync(report, "utf8"))
  } catch {
    continue
  }
  // A comparação é uma prova da revisão atual. Um screenshot de um run antigo
  // continua sendo útil para auditoria, mas não pode competir por mtime com o
  // estado entregue; do contrário uma revisão de board poderia herdar um PASS
  // mecânico de outro commit.
  if (data.runnerRevision !== CURRENT_REVISION || data.runnerDirty !== false) continue
  const quando = statSync(report).mtime
  for (const entrada of data.results ?? []) {
    if (!entrada.screenshot || entrada.status !== 200) continue
    const chaveEstado = `${entrada.state ?? "route"}:${entrada.actorAccount ?? entrada.actor ?? ""}:${entrada.flow ?? "direct-route"}:${entrada.viewport}`
    const atuais = ultimaPorRota.get(entrada.route) ?? []
    const indice = atuais.findIndex((atual) => atual.chaveEstado === chaveEstado)
    if (indice === -1) {
      atuais.push({ ...entrada, chaveEstado, quando, run, data })
    } else if (quando > atuais[indice].quando) {
      atuais[indice] = { ...entrada, chaveEstado, quando, run, data }
    }
    ultimaPorRota.set(entrada.route, atuais)
  }
}

// ---------------------------------------------------------------- prancha -> rota

const manifest = JSON.parse(readFileSync(join(GUIDE, "manifest.json"), "utf8"))
const tituloDaPrancha = new Map(manifest.artifacts.map((a) => [a.id, a.title]))

const pranchaRota = new Map()
try {
  const inv = readFileSync(INVENTORY, "utf8")
  for (const m of inv.matchAll(/^##\s+(\d+-web-[a-z0-9-]+)\s*—\s*(.+)$/gm)) {
    const rs = [...m[2].matchAll(/`(\/[^`]*)`/g)].map((x) => x[1].split("#")[0].split("?")[0])
    if (rs.length) pranchaRota.set(m[1], rs)
  }
} catch {
  /* inventário ausente: só o lado do runtime aparece */
}

// A seção 15 descreve a conversa de uma publicação, não o compositor. O
// inventário antigo apontava `/publicacoes/nova`; não deixar essa associação
// contaminar o par com screenshots de criação/offline.
if (pranchaRota.get("15-web-conversa")?.includes("/publicacoes/nova")) {
  pranchaRota.set("15-web-conversa", ["/publicacoes/[id]"])
}

// As pranchas canônicas estão no guia, mas não entram no inventário de
// roteamento. O compare ainda deve mostrar a evidência runtime quando a rota
// existe. O estado de edição legado ainda vem do modal do feed e permanece
// sinalizado como divergência; criação/offline agora têm a rota estável.
for (const [prancha, rotas] of [
  ["12-web-guia", ["/guide"]],
  ["42-web-comunidades", ["/communities"]],
  ["45-web-publicacao", ["/publicacoes/nova", "/publicacoes/[id]/editar", "/inicio"]],
  ["60-web-estados", ["/communities/71000000-0000-4000-8000-000000000002", "/publicacoes/nova"]],
]) {
  if (!pranchaRota.has(prancha)) pranchaRota.set(prancha, rotas)
}

// rota -> prancha (primeira que reivindica a rota)
const pranchaDaRota = new Map()
for (const [prancha, rotas] of pranchaRota) {
  for (const r of rotas) if (!pranchaDaRota.has(r)) pranchaDaRota.set(r, prancha)
}

// A captura não guarda o padrão, guarda a rota concreta (`/communities/71000.../admin/media`
// depois de substituir o `[id]` máscara e adicionar query real). Sem casar concreto com o padrão,
// toda prancha de rota dinâmica parecia "sem captura" quando na verdade estava no disco.
const DYNAMIC_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function achadosPara(padrao, mapa) {
  const out = []
  const pSegs = padrao.split("/").filter(Boolean)
  for (const [concreta, dados] of mapa) {
    const limpa = concreta.split("?")[0]
    if (padrao === "/publicacoes/[id]" && limpa === "/publicacoes/nova") continue
    const segs = limpa.split("/").filter(Boolean)
    if (pSegs.length !== segs.length) continue
    if (
      pSegs.every((s, i) => (s.startsWith("[") ? DYNAMIC_SEGMENT.test(segs[i]) : s === segs[i]))
    ) {
      for (const dado of dados) out.push({ rota: concreta, dado })
    }
  }
  return out
}

// Publication has separate create/edit states; 60 has the denied state and
// the connection-failure state. The concrete routes are part of the contract,
// otherwise a home feed screenshot can masquerade as a question composer.
function estadoCompativel(prancha, dado) {
  if (prancha === "45-web-publicacao") {
    return (
      (dado.route === "/publicacoes/nova" && dado.state === "publish") ||
      ((dado.route === "/inicio" || dado.route.endsWith("/editar")) && dado.state === "edit")
    )
  }
  if (prancha === "60-web-estados") {
    if (dado.route.endsWith("/71000000-0000-4000-8000-000000000002")) {
      return dado.state === "denied" && dado.actorAccount === "membro1"
    }
    return dado.route === "/publicacoes/nova" && dado.state === "offline"
  }
  return true
}

function canonicalizeCaptures(prancha, captures) {
  if (prancha === "60-web-estados") {
    const selected = [...captures]
    for (const viewport of ["mobile-375", "tablet-768", "desktop-1440"]) {
      const offline = selected.filter(
        (capture) =>
          capture.dado.route === "/publicacoes/nova" &&
          capture.dado.state === "offline" &&
          capture.dado.viewport === viewport,
      )
      if (offline.length <= 1) continue
      const newest = offline.reduce((latest, capture) =>
        capture.dado.quando > latest.dado.quando ? capture : latest,
      )
      for (let index = selected.length - 1; index >= 0; index -= 1) {
        const capture = selected[index]
        if (
          capture.dado.route === "/publicacoes/nova" &&
          capture.dado.state === "offline" &&
          capture.dado.viewport === viewport &&
          capture !== newest
        ) {
          selected.splice(index, 1)
        }
      }
    }
    return selected
  }
  if (prancha !== "45-web-publicacao") return captures
  const selected = [...captures]
  for (const viewport of ["mobile-375", "tablet-768", "desktop-1440"]) {
    const pageEdit = selected.filter(
      (capture) =>
        capture.dado.route.endsWith("/editar") &&
        capture.dado.state === "edit" &&
        capture.dado.viewport === viewport,
    )
    if (pageEdit.length) {
      const newestPageEdit = pageEdit.reduce((latest, capture) =>
        capture.dado.quando > latest.dado.quando ? capture : latest,
      )
      for (let index = selected.length - 1; index >= 0; index -= 1) {
        const capture = selected[index]
        if (
          capture.dado.route.endsWith("/editar") &&
          capture.dado.state === "edit" &&
          capture.dado.viewport === viewport &&
          capture !== newestPageEdit
        ) {
          selected.splice(index, 1)
        }
        if (
          capture.dado.route === "/inicio" &&
          capture.dado.state === "edit" &&
          capture.dado.viewport === viewport
        ) {
          selected.splice(index, 1)
        }
      }
    }

    const pagePublish = selected.filter(
      (capture) =>
        capture.dado.route === "/publicacoes/nova" &&
        capture.dado.state === "publish" &&
        capture.dado.viewport === viewport,
    )
    if (pagePublish.length > 1) {
      const newest = pagePublish.reduce((latest, capture) =>
        capture.dado.quando > latest.dado.quando ? capture : latest,
      )
      for (let index = selected.length - 1; index >= 0; index -= 1) {
        const capture = selected[index]
        if (
          capture.dado.route === "/publicacoes/nova" &&
          capture.dado.state === "publish" &&
          capture.dado.viewport === viewport &&
          capture !== newest
        ) {
          selected.splice(index, 1)
        }
      }
    }
  }
  return selected
}

// ---------------------------------------------------------------- pareamento

const pares = [] // prancha com captura
const pranchaSemCaptura = []
for (const [prancha, rotas] of [...pranchaRota.entries()].sort()) {
  const capturas = canonicalizeCaptures(
    prancha,
    rotas
      .flatMap((r) => achadosPara(r, ultimaPorRota))
      .filter((c) => c.dado && estadoCompativel(prancha, c.dado)),
  )
  if (capturas.length) pares.push({ prancha, rotas, capturas })
  else pranchaSemCaptura.push(prancha)
}

const rotaSemPrancha = [...ultimaPorRota.keys()].filter((r) => !pranchaDaRota.has(r)).sort()

// ---------------------------------------------------------------- html

const arquivoPrancha = (id) => {
  const a = manifest.artifacts.find((x) => x.id === id)
  return a ? join(GUIDE, a.file) : null
}

function fidelityWarning(prancha, dado) {
  if (dado.proof?.valid === false) {
    return "Captura inválida: a prova de estado/rota não fecha; não usar como fidelidade."
  }
  if (prancha === "43-web-comunidade-grupos") {
    return "BLOCKED: a rota da comunidade precisa de revisão por estado e ator antes de aceitar a aparência desta prancha."
  }
  if (prancha === "60-web-estados" && dado.state === "denied") {
    return "REVISÃO PENDENTE: o estado de acesso está autorizado pelo owner; a ação “Trocar de cidade” versus “Voltar” da prancha ainda precisa de adjudicação visual."
  }
  if (
    (prancha === "45-web-publicacao" || prancha === "60-web-estados") &&
    dado.route === "/inicio"
  ) {
    return "ATENÇÃO: a captura é um modal sobre o feed; a prancha mostra uma página de composição inteira. Não é evidência de fidelidade."
  }
  return "Fidelidade: revisão visual humana ainda não aprovada."
}

const cartao = (par) => {
  const png = arquivoPrancha(par.prancha)
  const ref =
    png && existsSync(png)
      ? `<img src="${url(png)}" alt="prancha ${par.prancha}">`
      : "<p>PNG ausente</p>"
  const lados = [...par.capturas]
    .sort((a, b) =>
      `${a.dado.state}:${a.dado.viewport}`.localeCompare(`${b.dado.state}:${b.dado.viewport}`),
    )
    .map((c) => {
      const d = c.dado
      const displayRoute = d.target ?? c.rota
      const foto = join(repoRoot, d.screenshot)
      const total = d.data.total ?? 0
      const high = d.data.high ?? 0
      const valid = d.proof?.valid !== false
      const selo = !valid
        ? `<span class="selo ruim">captura inválida</span>`
        : high > 0
          ? `<span class="selo ruim">${high} high</span>`
          : total > 0
            ? `<span class="selo medio">${total}</span>`
            : `<span class="selo ok">mecanicamente ok</span>`
      return `<figure>
        <img src="${url(foto)}" alt="runtime ${displayRoute} ${d.viewport}" loading="lazy">
        <figcaption><code>${displayRoute}</code> · ${d.state ?? "route"} · ${d.actorAccount ?? d.actor ?? "desconhecido"} · ${d.flow ?? "direct-route"} · ${d.viewport} ${selo}</figcaption>
         <p class="fidelity-note">${fidelityWarning(par.prancha, d)}</p>
      </figure>`
    })
    .join("")
  return `<section>
    <header>
      <h2>${tituloDaPrancha.get(par.prancha) ?? par.prancha}</h2>
      <p><code>${par.prancha}</code> · ${par.capturas.length} captura(s)</p>
    </header>
    <div class="par">
      <div class="ref"><h3>Prancha aprovada</h3>${ref}</div>
      <div class="run"><h3>No ar</h3>${lados}</div>
    </div>
  </section>`
}

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bivaque — prancha × runtime</title>
<style>
:root{--canvas:#FAFBF8;--surface:#fff;--sage:#EEF1E7;--ink:#262A27;--muted:#6B7370;--line:#E2E6E0;--green:#164734}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas);color:var(--ink);font:15px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Inter,Roboto,sans-serif}
header.topo{max-width:1600px;margin:0 auto;padding:28px 24px 6px}
h1{font-size:26px;margin:0 0 6px;letter-spacing:-.01em}
.lede{color:var(--muted);max-width:82ch;margin:0 0 6px}
.aviso{background:var(--sage);border-radius:10px;padding:12px 16px;font-size:14px;max-width:82ch;margin:14px 0 0}
main{max-width:1600px;margin:0 auto;padding:16px 24px 80px}
.sumario{display:flex;gap:24px;flex-wrap:wrap;margin:18px 0 6px;font-size:14px;color:var(--muted)}
.sumario b{color:var(--ink)}
section{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-top:20px}
section h2{font-size:18px;margin:0 0 2px}
section header p{margin:0;color:var(--muted);font-size:13px}
.par{display:flex;gap:24px;margin-top:14px;align-items:flex-start;flex-wrap:wrap}
.ref,.run{flex:1 1 420px;min-width:320px}
.ref h3,.run h3{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--green);margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.ref img{width:100%;border:1px solid var(--line);border-radius:10px;background:#fff}
.run{display:flex;gap:14px;flex-wrap:wrap}
.run figure{margin:0;flex:1 1 200px;min-width:180px}
.run img{width:100%;border:1px solid var(--line);border-radius:10px;background:#fff}
figcaption{font-size:12px;color:var(--muted);margin-top:6px}
code{background:var(--sage);padding:1px 6px;border-radius:6px;font-size:12px}
.selo{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:600;margin-left:4px}
.selo.ok{background:var(--sage);color:var(--green)}
.selo.medio{background:#FFF0D5;color:#8A4B00}
.selo.ruim{background:#FDE8E7;color:#B42318}
 .fidelity-note{margin:4px 0 0;color:#8A4B00;font-size:11px;line-height:1.35}
.lista{columns:2;font-size:13px;color:var(--muted);margin:8px 0 0;padding-left:18px}
.lista li{break-inside:avoid}
</style>
</head>
<body>
<header class="topo">
  <h1>Prancha × runtime</h1>
  <p class="lede">O que foi aprovado, ao lado do que está no ar. O pareamento é por rota/estado; “mecanicamente ok” nunca significa fidelidade aprovada. Revisão considerada: <code>${CURRENT_REVISION.slice(0, 12)}</code>.</p>
  <p class="aviso"><strong>Isto não julga fidelidade.</strong> Semelhança não é prova de acerto e diferença não é prova de erro: a prancha é proposta de aparência, e as notas textuais prevalecem sobre o bitmap. Um runtime mecanicamente limpo ainda pode ter superfície, densidade ou hierarquia divergentes; o veredito é da rubrica, e é humano.</p>
  <div class="sumario">
    <span><b>${pares.length}</b> pranchas com captura</span>
    <span><b>${pranchaSemCaptura.length}</b> pranchas sem captura</span>
    <span><b>${rotaSemPrancha.length}</b> rotas capturadas sem prancha</span>
    <span><b>${ultimaPorRota.size}</b> rotas com captura no total</span>
  </div>
</header>
<main>
  ${
    pares.length
      ? pares.map(cartao).join("\n")
      : "<section><p>Nenhuma prancha tem captura correspondente. Rode <code>node scripts/visual/loop.mjs</code>.</p></section>"
  }
  ${
    pranchaSemCaptura.length
      ? `<section><h2>Pranchas sem captura — nunca conferidas contra o runtime</h2><ul class="lista">${pranchaSemCaptura.map((p) => `<li><code>${p}</code></li>`).join("")}</ul></section>`
      : ""
  }
  ${
    rotaSemPrancha.length
      ? `<section><h2>Rotas capturadas sem prancha — ninguém aprovou a aparência</h2><ul class="lista">${rotaSemPrancha.map((r) => `<li><code>${r}</code></li>`).join("")}</ul></section>`
      : ""
  }
</main>
</body>
</html>
`

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, "index.html"), html, "utf8")

console.log(`escrito ${relative(repoRoot, join(OUT_DIR, "index.html"))}`)
console.log(`  pranchas com captura:      ${pares.length}`)
console.log(`  pranchas sem captura:      ${pranchaSemCaptura.length}`)
console.log(`  rotas capturadas s/ prancha: ${rotaSemPrancha.length}`)
console.log(`  rotas com captura (total):  ${ultimaPorRota.size}`)
