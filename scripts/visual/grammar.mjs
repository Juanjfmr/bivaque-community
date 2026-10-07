// Placar da gramática visual — ver docs/agents/GRAMATICA-VISUAL.md
//
// Mede, sobre a superfície real do app, as regras verificáveis sem renderizar. Não substitui o
// audit mecânico de scripts/visual/capture.mjs: aquele cobre alvo de toque, overflow, contraste e
// movimento; este cobre esqueleto de tela, estado, número, token cru e drift de escala.
//
// A clausura de cada rota é analisada, não só o page.tsx: boa parte das rotas delega a seções
// irmãs (inicio/page.tsx -> community-section.tsx, composer.tsx, ...). Olhar só o page.tsx
// produziria falso positivo em massa. Folhas .css importadas por módulo também entram, porque é
// nelas que vive o gradiente legado.
//
// Exceção documentada: uma linha com "grammar-allow: G-XX" no arquivo suprime G-XX naquele
// arquivo — é a forma exigida por DESIGN_SYSTEM.md §1.2.3 para valor bruto.
//
// Uso:
//   node scripts/visual/grammar.mjs
//   node scripts/visual/grammar.mjs --json
//   node scripts/visual/grammar.mjs --top 20

import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"

const ROOT = resolve(import.meta.dirname, "..", "..")
const APP_DIR = join(ROOT, "apps", "web", "app")
const OUT_DIR = join(ROOT, ".visual", "grammar")
const MAX_CLOSURE_FILES = 80
const MAX_DEPTH = 4
const BT = String.fromCharCode(96)

const args = process.argv.slice(2)
const asJson = args.includes("--json")
const topIndex = args.indexOf("--top")
const topN = topIndex >= 0 ? Number(args[topIndex + 1]) || 20 : 20
const showEvidence = args.includes("--evidence")

// ── regras (docs/agents/GRAMATICA-VISUAL.md §4) ──────────────────────────────────────────────
// escopo: "rota" classifica a rota entre normalizar e recriar; "sistema" é fato do código.
// confianca: "alta" | "media" | "nao-medido" — regra de proxy fraco não pode reportar zero.
const RULES = {
  "G-01": { titulo: "rota sem h1", classe: "estrutural", escopo: "rota", confianca: "alta" },
  "G-02": {
    titulo: "esqueleto não compartilhado (PageHeader ausente)",
    classe: "estrutural",
    escopo: "sistema",
    confianca: "alta",
  },
  "G-03": {
    titulo: "lista sem estado vazio",
    classe: "estrutural",
    escopo: "rota",
    confianca: "nao-medido",
  },
  "G-04": {
    titulo: "leitura assíncrona sem estado de erro",
    classe: "estrutural",
    escopo: "rota",
    confianca: "media",
  },
  "G-05": {
    titulo: "leitura assíncrona sem carregamento",
    classe: "estrutural",
    escopo: "rota",
    confianca: "media",
  },
  "G-10": {
    titulo: "cor bruta fora de token",
    classe: "cosmetico",
    escopo: "rota",
    confianca: "alta",
  },
  "G-11": {
    titulo: "valor Tailwind arbitrário fora da escala",
    classe: "cosmetico",
    escopo: "sistema",
    confianca: "alta",
  },
  "G-12": {
    titulo: "número formatado sem nowrap/tabular-nums",
    classe: "cosmetico",
    escopo: "rota",
    confianca: "media",
  },
  "G-13": { titulo: "style inline", classe: "cosmetico", escopo: "rota", confianca: "alta" },
  "G-14": {
    titulo: "gradiente decorativo",
    classe: "cosmetico",
    escopo: "sistema",
    confianca: "alta",
  },
  "G-15": {
    titulo: "emoji/glyph como ícone",
    classe: "cosmetico",
    escopo: "rota",
    confianca: "alta",
  },
}
const IDS = Object.keys(RULES)

const RE = {
  h1: /<h1[\s>]/,
  pageHeader: /\bPageHeader\b/,
  mapRender: /\.map\(/,
  emptyState: /\bEmptyState\b/,
  emptyWord: /nenhum|nenhuma|nada aqui|sem resultados|ainda não/i,
  errorState: /\bErrorState\b/,
  feedbackAlert: /\bFeedbackAlert\b/,
  catchClause: /\bcatch\b/,
  skeleton: /\bSkeleton\b/,
  loadingWord: /loading|carregando|isLoading/i,
  asyncRead: /\bawait\b|\.then\(|createBrowserClient|useEffect\(/,
  hexColor: /(?<!&)#[0-9a-fA-F]{3,8}\b/g,
  rgbColor: /\brgba?\(|\bhsla?\(/g,
  numberFormat: /Intl\.NumberFormat|toLocaleString|\bR\$/,
  nowrap: /whitespace-nowrap|tabular-nums/,
  gradient: /gradient/,
  inlineStyle: /style=\{\{/g,
  // Cobre também entidade numérica (&#128075; = 👋), que o literal não pega.
  emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|&#\d{6};/gu,
  className: /className=(?:"([^"]*)"|\{([^}]*)\})/g,
  arbitrary: /\[[^\]]{1,40}\]/g,
  importSpec: /from\s+"([^"]+)"|import\s*\(\s*"([^"]+)"\s*\)/g,
  routeGroup: /^\(.*\)$/,
  // (?!var\() importa: text-[var(--token)] é referência a token, não drift de escala.
  rawValue:
    /(?:^|\s)(?:max-w|min-w|w|h|text|gap|grid-cols|p|px|py|m|mx|my|top|left|right|bottom)-\[(?!var\()[^\]]{1,40}\]/g,
}

const _LOCAL = /\.(tsx?|jsx?|css)$/

// ── coleta de rotas ──────────────────────────────────────────────────────────────────────────
async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (entry.isFile() && entry.name === "page.tsx") out.push(full)
  }
  return out
}

function routeOf(file) {
  const parts = relative(APP_DIR, file).split(sep)
  parts.pop()
  return `/${parts.filter((p) => !RE.routeGroup.test(p)).join("/")}`
}

// ── clausura ─────────────────────────────────────────────────────────────────────────────────
const cache = new Map()
async function source(file) {
  if (!cache.has(file)) cache.set(file, await readFile(file, "utf8").catch(() => ""))
  return cache.get(file)
}

function resolveSpecifier(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec)
  const candidates = [base, `${base}.tsx`, `${base}.ts`, `${base}.css`, join(base, "index.tsx")]
  for (const candidate of candidates) {
    if (candidate.startsWith(APP_DIR) && existsSync(candidate)) return candidate
  }
  return null
}

async function closureOf(entry) {
  const seen = new Set([entry])
  const queue = [[entry, 0]]
  let head = 0
  while (head < queue.length && seen.size < MAX_CLOSURE_FILES) {
    const [file, depth] = queue[head]
    head += 1
    if (depth >= MAX_DEPTH) continue
    for (const match of (await source(file)).matchAll(RE.importSpec)) {
      const spec = match[1] ?? match[2]
      if (!spec.startsWith("./") && !spec.startsWith("../")) continue
      const target = resolveSpecifier(file, spec)
      if (target && !seen.has(target)) {
        seen.add(target)
        queue.push([target, depth + 1])
      }
    }
  }
  return [...seen]
}

// ── avaliação ────────────────────────────────────────────────────────────────────────────────
function suppressed(text, id) {
  return text.includes(`grammar-allow: ${id}`)
}

function evaluate(files) {
  const hits = new Map()
  const add = (id, where) => {
    if (!hits.has(id)) hits.set(id, [])
    const list = hits.get(id)
    if (list.length < 4) list.push(where)
  }
  const bump = (id, n, where) => {
    for (let i = 0; i < n; i += 1) add(id, where)
  }

  const joined = files.map((f) => f.text).join("\n")

  // regras de clausura
  const hasH1 = RE.h1.test(joined)
  const hasPageHeader = RE.pageHeader.test(joined)
  if (!hasH1 && !hasPageHeader) add("G-01", "clausura inteira")
  if (hasH1 && !hasPageHeader) add("G-02", "clausura inteira")

  if (RE.mapRender.test(joined) && !RE.emptyState.test(joined) && !RE.emptyWord.test(joined)) {
    add("G-03", "clausura inteira")
  }

  const asyncRead = RE.asyncRead.test(joined)
  if (
    asyncRead &&
    !RE.errorState.test(joined) &&
    !RE.feedbackAlert.test(joined) &&
    !RE.catchClause.test(joined)
  ) {
    add("G-04", "clausura inteira")
  }
  if (asyncRead && !RE.skeleton.test(joined) && !RE.loadingWord.test(joined)) {
    add("G-05", "clausura inteira")
  }

  if (RE.numberFormat.test(joined) && !RE.nowrap.test(joined)) add("G-12", "clausura inteira")

  // regras por arquivo, com linha
  for (const file of files) {
    const label = file.path
    if (file.ext === "css") {
      const lines = file.text.split("\n")
      lines.forEach((line, index) => {
        if (RE.gradient.test(line) && !suppressed(file.text, "G-14")) {
          add("G-14", `${label}:${index + 1}`)
        }
      })
      continue
    }
    const lines = file.text.split("\n")
    lines.forEach((line, index) => {
      const where = `${label}:${index + 1}`
      const cor = (line.match(RE.hexColor) ?? []).length + (line.match(RE.rgbColor) ?? []).length
      if (cor > 0 && !suppressed(file.text, "G-10")) bump("G-10", cor, where)
      if (RE.inlineStyle.test(line) && !suppressed(file.text, "G-13")) add("G-13", where)
      if (RE.emoji.test(line) && !suppressed(file.text, "G-15")) add("G-15", where)
      const arbit = (line.match(RE.rawValue) ?? []).length
      if (arbit > 0 && !suppressed(file.text, "G-11")) bump("G-11", arbit, where)
    })
  }

  return hits
}

// ── execução ─────────────────────────────────────────────────────────────────────────────────
const pages = await walk(APP_DIR)
const rows = []

for (const page of pages.sort()) {
  const files = []
  for (const file of await closureOf(page)) {
    const text = await source(file)
    files.push({
      path: relative(ROOT, file),
      ext: file.endsWith(".css") ? "css" : "code",
      lines: text.split("\n").length,
      text,
    })
  }
  const hits = evaluate(files)
  const violations = [...hits.entries()].map(([id, evidencia]) => ({ id, evidencia }))
  const route = routeOf(page)
  const porClasse = (classe, escopo) =>
    violations
      .filter((v) => RULES[v.id].classe === classe && RULES[v.id].escopo === escopo)
      .reduce((sum, v) => sum + v.evidencia.length, 0)

  rows.push({
    route,
    file: relative(ROOT, page),
    experimento: route.startsWith("/experimento"),
    lines: files.reduce((sum, f) => sum + f.lines, 0),
    closureFiles: files.length,
    estrutural: porClasse("estrutural", "rota"),
    cosmetico: porClasse("cosmetico", "rota"),
    violations,
  })
}

const scored = rows.filter((r) => !r.experimento)
const comEstrutural = scored.filter((r) => r.estrutural > 0)
const limpas = scored.filter((r) => r.estrutural === 0 && r.cosmetico === 0)
const aderencia = scored.length === 0 ? 0 : (limpas.length / scored.length) * 100

const contaRotas = (id) => scored.filter((r) => r.violations.some((v) => v.id === id)).length
const contaOcorrencias = (id) =>
  scored.reduce((sum, r) => sum + (r.violations.find((v) => v.id === id)?.evidencia.length ?? 0), 0)

const porRegra = IDS.map((id) => ({
  id,
  ...RULES[id],
  rotas: contaRotas(id),
  ocorrencias: contaOcorrencias(id),
})).sort((a, b) => b.rotas - a.rotas)

const placar = {
  geradoEm: new Date().toISOString(),
  rotasMedidas: scored.length,
  experimentos: rows.length - scored.length,
  aderencia: Number(aderencia.toFixed(1)),
  rotasComEstrutural: comEstrutural.length,
  rotasSoCosmetico: scored.length - comEstrutural.length - limpas.length,
  rotasLimpas: limpas.length,
  porRegra,
  rotas: scored
    .map((r) => ({
      route: r.route,
      file: r.file,
      lines: r.lines,
      closureFiles: r.closureFiles,
      estrutural: r.estrutural,
      cosmetico: r.cosmetico,
      violations: r.violations,
    }))
    .sort(
      (a, b) =>
        b.estrutural - a.estrutural || b.cosmetico - a.cosmetico || a.route.localeCompare(b.route),
    ),
}

await mkdir(OUT_DIR, { recursive: true })
await writeFile(join(OUT_DIR, "placar.json"), `${JSON.stringify(placar, null, 2)}\n`)

const sistema = porRegra.filter((r) => r.escopo === "sistema")
const confiavel = porRegra.filter((r) => r.escopo === "rota" && r.confianca !== "nao-medido")
const fraco = porRegra.filter((r) => r.escopo === "rota" && r.confianca === "nao-medido")

const linha = (r) =>
  `| ${BT}${r.id}${BT} | ${r.titulo} | ${r.classe} | ${r.confianca} | ${r.rotas} | ${r.ocorrencias} |`

const md = [
  "# Placar da gramática visual",
  "",
  `> Gerado por ${BT}scripts/visual/grammar.mjs${BT}. Regras em ${BT}docs/agents/GRAMATICA-VISUAL.md${BT}.`,
  "> Mede o que é medível sem renderizar: **limite inferior**, não o total existente.",
  "> A camada de runtime (R-01 a R-05) não está implementada — ver §5 da gramática.",
  "",
  "| Métrica | Valor |",
  "|---|---|",
  `| Rotas medidas | ${placar.rotasMedidas} |`,
  `| Rotas com violação estrutural de rota | **${placar.rotasComEstrutural}** |`,
  `| Rotas só com violação cosmética | ${placar.rotasSoCosmetico} |`,
  `| Rotas limpas | ${placar.rotasLimpas} |`,
  `| Aderência (§11.4) | **${placar.aderencia}%** |`,
  "",
  "## Achados de sistema (não classificam rota)",
  "",
  "| ID | Regra | Classe | Confiança | Rotas | Ocorrências |",
  "|---|---|---|---|---:|---:|",
  ...sistema.map(linha),
  "",
  "## Regras de rota com confiança",
  "",
  "| ID | Regra | Classe | Confiança | Rotas | Ocorrências |",
  "|---|---|---|---|---:|---:|",
  ...confiavel.map(linha),
  "",
  "## Regras de rota NÃO medidas (proxy fraco — não leia como zero)",
  "",
  ...fraco.map(
    (r) => `- ${BT}${r.id}${BT} ${r.titulo} — proxy estático não distingue estado vazio real`,
  ),
  "",
  "## Rotas por custo de conserto",
  "",
  "| Rota | Estrutural | Cosmético | Arquivos | Linhas | Regras |",
  "|---|---:|---:|---:|---:|---|",
  ...placar.rotas
    .slice(0, topN)
    .map(
      (r) =>
        "| " +
        BT +
        r.route +
        BT +
        " | " +
        r.estrutural +
        " | " +
        r.cosmetico +
        " | " +
        r.closureFiles +
        " | " +
        r.lines +
        " | " +
        r.violations.map((v) => v.id).join(" ") +
        " |",
    ),
  "",
]
if (showEvidence) {
  md.push("## Evidência", "")
  for (const r of placar.rotas.slice(0, topN)) {
    md.push(`### ${BT}${r.route}${BT}`, "")
    for (const v of r.violations) {
      md.push(`- ${BT}${v.id}${BT} ${v.evidencia.slice(0, 3).join(", ")}`)
    }
    md.push("")
  }
}
md.push("", `Evidência completa: ${BT}.visual/grammar/placar.json${BT}`)
await writeFile(join(OUT_DIR, "placar.md"), md.join("\n"))

if (asJson) console.log(JSON.stringify(placar, null, 2))
else console.log(md.join("\n"))
