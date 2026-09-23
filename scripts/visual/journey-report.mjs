// Relatório das jornadas simuladas: prancha x tela real, passo a passo.
//
// Lê os registros que tests/e2e/helpers/journey.ts grava em
// .visual/journeys/<jornada>/<projeto>/registro.json e monta .visual/journeys/index.html. Para cada
// passo: o recorte da prancha que a jornada cita (geometria de frames.json, recortada por CSS, sem
// gerar imagem), a captura do app no mesmo passo, a URL alcançada e o resultado. LACUNA e ATALHO
// aparecem destacados: são o que o teste verde não conta sozinho.
//
// O relatório não julga semelhança visual — isso é trabalho de quem olha. Ele põe as duas coisas
// lado a lado, na ordem da jornada, para o olho não ter de procurar.
//
// Uso:
//   node scripts/visual/journey-report.mjs          escreve .visual/journeys/index.html
//   node scripts/visual/journey-report.mjs --json   imprime o resumo por jornada

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))
const OUT_DIR = join(repoRoot, ".visual", "journeys")
const GUIDE_DIR = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")
const FRAMES = join(repoRoot, "scripts", "visual", "flows", "frames.json")
const MANIFEST = join(GUIDE_DIR, "manifest.json")

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

/** Estilo de recorte: o quadro vira a janela, a prancha inteira se desloca dentro dela. */
export function cropStyle(frame, board) {
  const aspect = (frame.w * board.width) / (frame.h * board.height)
  const pct = (n) => `${Number((n * 100).toFixed(4))}%`
  return {
    box: `aspect-ratio:${aspect.toFixed(4)}`,
    img: `width:${pct(1 / frame.w)};left:${pct(-frame.x / frame.w)};top:${pct(-frame.y / frame.h)}`,
  }
}

export function resolveScreen(ref, frames, manifest) {
  const [boardId, rawIndex] = ref.split("#")
  const index = Number(rawIndex)
  const board = frames.boards[boardId]
  const artifact = manifest.artifacts.find((candidate) => candidate.id === boardId)
  const frame = board?.frames?.[index]
  if (!board || !frame || !artifact) return null
  return { board, frame, label: artifact.screens[index] ?? ref, title: artifact.title }
}

function resultBadge(entry) {
  if (entry.resultado === "lacuna") return '<span class="badge gap">lacuna</span>'
  if (entry.atalho) return '<span class="badge shortcut">observado por atalho</span>'
  return '<span class="badge ok">observado</span>'
}

function renderEntry(entry, run, frames, manifest, guideHref) {
  const screen = resolveScreen(entry.ref, frames, manifest)
  const board = screen
    ? (() => {
        const style = cropStyle(screen.frame, screen.board)
        return `<div class="crop" style="${style.box}"><img src="${escapeHtml(
          `${guideHref}/${screen.board.file}`,
        )}" style="${style.img}" alt="Prancha ${escapeHtml(entry.ref)}" loading="lazy"></div>`
      })()
    : `<p class="missing">sem geometria para ${escapeHtml(entry.ref)}</p>`
  const real = entry.captura
    ? `<img class="shot" src="${escapeHtml(`${run.href}/${entry.captura}`)}" alt="Tela real em ${escapeHtml(
        entry.url,
      )}" loading="lazy">`
    : '<p class="missing">sem captura: o passo não foi alcançado</p>'
  const notes = [
    entry.acao ? `<p><strong>Ação:</strong> ${escapeHtml(entry.acao)}</p>` : "",
    entry.quando ? `<p><strong>Quando:</strong> ${escapeHtml(entry.quando)}</p>` : "",
    entry.persona ? `<p><strong>Persona:</strong> ${escapeHtml(entry.persona)}</p>` : "",
    entry.url ? `<p><strong>URL:</strong> <code>${escapeHtml(entry.url)}</code></p>` : "",
    entry.motivo ? `<p class="why"><strong>Motivo:</strong> ${escapeHtml(entry.motivo)}</p>` : "",
    entry.atalho ? `<p class="why"><strong>Atalho:</strong> ${escapeHtml(entry.atalho)}</p>` : "",
  ].join("")
  return `<article class="step">
  <header><span class="n">${entry.ordem}</span> <code>${escapeHtml(entry.ref)}</code> ·
  ${escapeHtml(screen?.label ?? "")} ${resultBadge(entry)}</header>
  <div class="pair"><figure><figcaption>Prancha</figcaption>${board}</figure>
  <figure><figcaption>App</figcaption>${real}</figure></div>
  <div class="notes">${notes}</div>
</article>`
}

export function renderReport(runs, frames, manifest, guideHref) {
  const sections = runs.map((run) => {
    const r = run.registro
    const pending = r.passosPendentes.length
      ? `<p class="why"><strong>Passos não alcançados:</strong> ${r.passosPendentes
          .map(escapeHtml)
          .join(", ")}</p>`
      : ""
    const deviations = r.desviosNaoExercitados.length
      ? `<p><strong>Desvios não exercitados:</strong> ${r.desviosNaoExercitados
          .map(escapeHtml)
          .join(", ")}</p>`
      : ""
    const state = r.estado === "concluida" ? "concluída" : "INCOMPLETA"
    return `<section>
  <h2>${escapeHtml(r.titulo)} <small>${escapeHtml(r.jornada)} · ${escapeHtml(r.projeto)}</small></h2>
  <p>${escapeHtml(r.persona)} · <strong>${state}</strong> · ${r.registros.length} registros ·
  ${r.lacunas} lacuna(s) · ${r.atalhos} atalho(s) · gerado em ${escapeHtml(r.geradoEm)}</p>
  ${pending}${deviations}
  ${r.registros.map((entry) => renderEntry(entry, run, frames, manifest, guideHref)).join("\n")}
</section>`
  })
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Jornadas simuladas</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#f6f7f5;--fg:#1c2420;--muted:#5b6660;--line:#d9ded9;--ok:#1f6b45;--gap:#9a3412;--cut:#7c5b00}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
h1{margin:0 0 4px}h2{margin:40px 0 4px}h2 small{color:var(--muted);font-weight:400;font-size:14px}
.step{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin:16px 0}
.step header{font-weight:600}.n{display:inline-block;min-width:24px;color:var(--muted)}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
@media (max-width:800px){.pair{grid-template-columns:1fr}}
figure{margin:0}figcaption{font-size:12px;color:var(--muted);margin-bottom:4px}
.crop{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:8px}
.crop img{position:absolute;max-width:none}
.shot{width:100%;border:1px solid var(--line);border-radius:8px}
.badge{font-size:12px;border-radius:999px;padding:2px 8px;margin-left:8px;color:#fff}
.ok{background:var(--ok)}.gap{background:var(--gap)}.shortcut{background:var(--cut)}
.why{color:var(--gap)}.missing{color:var(--muted);font-style:italic}.notes p{margin:4px 0}
</style></head><body>
<h1>Jornadas simuladas</h1>
<p>Prancha e tela real lado a lado, na ordem da jornada. Verde não é aprovação visual: a
semelhança é julgada por quem olha.</p>
${sections.join("\n") || "<p>Nenhum registro em .visual/journeys.</p>"}
</body></html>
`
}

function loadRuns() {
  if (!existsSync(OUT_DIR)) return []
  const runs = []
  for (const journey of readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (!journey.isDirectory()) continue
    for (const project of readdirSync(join(OUT_DIR, journey.name), { withFileTypes: true })) {
      const file = join(OUT_DIR, journey.name, project.name, "registro.json")
      if (!project.isDirectory() || !existsSync(file)) continue
      runs.push({
        href: `${journey.name}/${project.name}`,
        registro: JSON.parse(readFileSync(file, "utf8")),
      })
    }
  }
  return runs.sort((a, b) => a.href.localeCompare(b.href))
}

function main() {
  const runs = loadRuns()
  if (process.argv.includes("--json")) {
    const summary = runs.map(({ registro: r }) => ({
      jornada: r.jornada,
      projeto: r.projeto,
      estado: r.estado,
      registros: r.registros.length,
      lacunas: r.lacunas,
      atalhos: r.atalhos,
      passosPendentes: r.passosPendentes,
    }))
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
    return
  }
  const frames = JSON.parse(readFileSync(FRAMES, "utf8"))
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"))
  const guideHref = relative(OUT_DIR, GUIDE_DIR).split("\\").join("/")
  const target = join(OUT_DIR, "index.html")
  writeFileSync(target, renderReport(runs, frames, manifest, guideHref))
  const incomplete = runs.filter((run) => run.registro.estado !== "concluida").length
  process.stdout.write(
    `${runs.length} registro(s) de jornada, ${incomplete} incompleto(s) -> ${relative(repoRoot, target)}\n`,
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
