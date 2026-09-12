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

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))
const VISUAL = join(repoRoot, ".visual")
const GUIDE = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")
const INVENTORY = join(repoRoot, "docs", "agents", "PRANCHAS-WEB-RESTANTES.md")
const OUT_DIR = join(VISUAL, "compare")

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
  const quando = statSync(report).mtime
  for (const entrada of data.results ?? []) {
    if (!entrada.screenshot || entrada.status !== 200) continue
    const atual = ultimaPorRota.get(entrada.route)
    if (!atual || quando > atual.quando) {
      ultimaPorRota.set(entrada.route, { ...entrada, quando, run, data })
    }
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

// rota -> prancha (primeira que reivindica a rota)
const pranchaDaRota = new Map()
for (const [prancha, rotas] of pranchaRota) {
  for (const r of rotas) if (!pranchaDaRota.has(r)) pranchaDaRota.set(r, prancha)
}

// ---------------------------------------------------------------- pareamento

const pares = [] // prancha com captura
const pranchaSemCaptura = []
for (const [prancha, rotas] of [...pranchaRota.entries()].sort()) {
  const capturas = rotas.map((r) => ({ rota: r, dado: ultimaPorRota.get(r) })).filter((c) => c.dado)
  if (capturas.length) pares.push({ prancha, rotas, capturas })
  else pranchaSemCaptura.push(prancha)
}

const rotaSemPrancha = [...ultimaPorRota.keys()].filter((r) => !pranchaDaRota.has(r)).sort()

// ---------------------------------------------------------------- html

const arquivoPrancha = (id) => {
  const a = manifest.artifacts.find((x) => x.id === id)
  return a ? join(GUIDE, a.file) : null
}

const cartao = (par) => {
  const png = arquivoPrancha(par.prancha)
  const ref =
    png && existsSync(png)
      ? `<img src="${url(png)}" alt="prancha ${par.prancha}">`
      : "<p>PNG ausente</p>"
  const lados = par.capturas
    .map((c) => {
      const d = c.dado
      const foto = join(repoRoot, d.screenshot)
      const total = d.data.total ?? 0
      const high = d.data.high ?? 0
      const selo =
        high > 0
          ? `<span class="selo ruim">${high} high</span>`
          : total > 0
            ? `<span class="selo medio">${total}</span>`
            : `<span class="selo ok">limpo</span>`
      return `<figure>
        <img src="${url(foto)}" alt="runtime ${c.rota} ${d.viewport}" loading="lazy">
        <figcaption><code>${c.rota}</code> · ${d.viewport} ${selo}</figcaption>
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
.lista{columns:2;font-size:13px;color:var(--muted);margin:8px 0 0;padding-left:18px}
.lista li{break-inside:avoid}
</style>
</head>
<body>
<header class="topo">
  <h1>Prancha × runtime</h1>
  <p class="lede">O que foi aprovado, ao lado do que está no ar. Pareamento por rota, não por pixel.</p>
  <p class="aviso"><strong>Isto não julga.</strong> Semelhança não é prova de acerto e diferença não é prova de erro: a prancha é proposta de aparência, e as notas textuais prevalecem sobre o bitmap. O veredito é da rubrica, e é humano.</p>
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
