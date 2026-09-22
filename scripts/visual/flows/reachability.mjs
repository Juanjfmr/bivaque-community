// Análise de chegabilidade das jornadas.
//
// O mapa de jornadas prova cobertura de tela: cada tela das pranchas está em alguma jornada. Não
// prova chegabilidade — uma jornada pode estar mapeada e não ter porta de entrada no app, ou um
// passo pode não ter caminho adiante. O repositório vinha encontrando isso por acidente
// (NAV-PEDIDOS-ORFA, RECON-032, RECON-045). Este script encontra de propósito.
//
// Monta o grafo rota -> rotas a partir da navegação estática do app e responde:
//   1. órfã              — ninguém aponta para ela
//   2. sem saída própria — só sai pela navegação da casca; nenhum link dela leva adiante
//   3. inalcançável      — não se chega a partir das entradas públicas
//   4. link quebrado     — aponta para rota que não existe
//
// A atribuição segue o grafo de imports: o que a página renderiza conta como link dela, mesmo que
// o href more num componente importado. Sem isso, quase toda tela pareceria beco sem saída.
//
// É heurística declarada: só lê literal estático. Link montado em execução (`href={item.url}`) não
// é visto, então achado aqui é CANDIDATO e se confirma andando no app. Falso negativo é esperado;
// falso positivo, não.
//
// Uso:
//   node scripts/visual/flows/reachability.mjs [--json]

import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve as resolvePath, sep } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const APP = join(repoRoot, "apps", "web", "app")
const WEB = join(repoRoot, "apps", "web")
const INVENTORY = join(repoRoot, "docs", "agents", "PRANCHAS-WEB-RESTANTES.md")
const JSON_OUT = process.argv.includes("--json")

const ENTRADAS = ["/", "/login", "/signup"]

// ---------------------------------------------------------------- arquivos

function andar(dir, out = []) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) andar(p, out)
    else out.push(p)
  }
  return out
}

const normalizaRota = (dirRel) => {
  const segs = dirRel.split(sep).filter((s) => s && !s.startsWith("(") && !s.startsWith("@"))
  return `/${segs.join("/")}`
}

const arquivos = andar(APP).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
const ehApi = (rota) => rota === "/api" || rota.startsWith("/api/")

// Um handler (`route.ts`) não é página, mas pode redirecionar para uma. `/auth/callback-error`,
// por exemplo, só é alcançado pelo redirect do handler de callback — sem contar isso, ele
// apareceria como órfão e o achado seria falso.
const handlers = []
const rotasHandler = new Set()
const rotas = new Set()
const rotaDaPagina = new Map()
for (const f of arquivos) {
  if (f.endsWith(`${sep}route.ts`)) {
    handlers.push(f)
    rotasHandler.add(normalizaRota(relative(APP, dirname(f))))
    continue
  }
  if (!f.endsWith(`${sep}page.tsx`)) continue
  const rota = normalizaRota(relative(APP, dirname(f)))
  if (ehApi(rota)) continue
  rotas.add(rota)
  rotaDaPagina.set(f, rota)
}

// ---------------------------------------------------------------- links

const semComentario = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1")

const extraiLinks = (src) => {
  const achados = new Set()
  // Qualquer literal que comece com "/" — pega href, redirect, router.push E link montado em
  // variavel (`` `/mercado/${id}` ``), que a leitura de `href=` sozinha perde. Comentário é
  // removido antes: sem isso, `// veja /counts` vira link fantasma.
  for (const m of semComentario(src).matchAll(/["'`](\/[^"'`\s]*)["'`]?/g)) {
    const limpo = m[1].split("${")[0].split("#")[0].split("?")[0]
    if (!limpo.startsWith("/") || limpo.startsWith("//")) continue
    achados.add(limpo)
  }
  return [...achados]
}

const extraiImports = (src) => [...src.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1])

function resolveImport(de, especificador) {
  const base = resolvePath(dirname(de), especificador)
  const tentativas = [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]
  for (const tentativa of tentativas) {
    try {
      if (statSync(tentativa).isFile()) return tentativa
    } catch {
      /* tenta o proximo */
    }
  }
  return null
}

function linksDaPagina(entrada) {
  const visto = new Set()
  const links = new Set()
  const fila = [entrada]
  while (fila.length) {
    const atual = fila.pop()
    if (visto.has(atual) || !atual.startsWith(WEB)) continue
    visto.add(atual)
    if (atual !== entrada && atual.endsWith(`${sep}layout.tsx`)) continue
    let src
    try {
      src = readFileSync(atual, "utf8")
    } catch {
      continue
    }
    for (const l of extraiLinks(src)) links.add(l)
    for (const imp of extraiImports(src)) {
      const alvo = resolveImport(atual, imp)
      if (alvo) fila.push(alvo)
    }
  }
  return links
}

function resolveLink(link) {
  if (rotas.has(link) || rotasHandler.has(link)) return [link]
  // Prefixo de template literal (`/mercado/${id}` vira "/mercado/") aponta para os FILHOS, não
  // para a rota-mãe. Testar isso antes do casamento exato é o que evita perder toda página de
  // detalhe — sem esta ordem, `/mercado` engolia `/mercado/[id]`.
  if (link.endsWith("/")) {
    const filhos = [...rotas].filter((r) => r.startsWith(link) && r !== link)
    if (filhos.length) return filhos
  }
  const doLink = link.split("/").filter(Boolean)
  const exatos = []
  for (const rota of rotas) {
    const daRota = rota.split("/").filter(Boolean)
    if (daRota.length !== doLink.length) continue
    if (daRota.every((seg, i) => seg.startsWith("[") || seg === doLink[i])) exatos.push(rota)
  }
  return exatos
}

// ---------------------------------------------------------------- grafo

const saida = new Map()
const global = new Set()
const quebrados = new Map()

for (const f of handlers) {
  for (const link of linksDaPagina(f)) {
    for (const destino of resolveLink(link)) global.add(destino)
  }
}

for (const f of arquivos) {
  if (!f.endsWith(`${sep}layout.tsx`)) continue
  for (const link of linksDaPagina(f)) {
    for (const destino of resolveLink(link)) global.add(destino)
  }
}

for (const [f, rota] of rotaDaPagina) {
  for (const link of linksDaPagina(f)) {
    const destinos = resolveLink(link)
    if (!destinos.length) {
      if (link.startsWith("/api") || link === "/") continue
      if (/\.(webp|png|jpe?g|svg|ico|json|txt|xml|css|js|woff2?)$/i.test(link)) continue
      if (link.includes("\\") || link.startsWith("/auth/v1")) continue
      if (!quebrados.has(link)) quebrados.set(link, new Set())
      quebrados.get(link).add(rota)
      continue
    }
    if (!saida.has(rota)) saida.set(rota, new Set())
    for (const d of destinos) saida.get(rota).add(d)
  }
}

// ---------------------------------------------------------------- achados

const todas = [...rotas].sort()
const temEntrada = (r) => global.has(r) || [...saida.values()].some((s) => s.has(r))

const orfas = todas.filter((r) => !ENTRADAS.includes(r) && !temEntrada(r))
const semSaida = todas.filter((r) => !ENTRADAS.includes(r) && !saida.has(r))

const visto = new Set()
const fila = [...ENTRADAS]
while (fila.length) {
  const atual = fila.pop()
  if (visto.has(atual)) continue
  visto.add(atual)
  for (const d of saida.get(atual) ?? []) if (!visto.has(d)) fila.push(d)
  for (const d of global) if (!visto.has(d)) fila.push(d)
}
const inalcancaveis = todas.filter((r) => !visto.has(r) && !ENTRADAS.includes(r))

// ---------------------------------------------------------------- prancha -> rota

const pranchaRota = new Map()
try {
  const inv = readFileSync(INVENTORY, "utf8")
  for (const m of inv.matchAll(/^##\s+(\d+-web-[a-z0-9-]+)\s*—\s*(.+)$/gm)) {
    const rs = [...m[2].matchAll(/`(\/[^`]*)`/g)].map((x) => x[1].split("#")[0].split("?")[0])
    if (rs.length) pranchaRota.set(m[1], rs)
  }
} catch {
  /* inventario ausente: a analise de rota segue valida */
}

const pranchasSemPorta = []
for (const [prancha, rs] of pranchaRota) {
  const internas = rs.filter((r) => todas.includes(r))
  if (!internas.length) continue
  if (internas.every((r) => !temEntrada(r))) pranchasSemPorta.push({ prancha, rotas: internas })
}

const relatorio = {
  rotas: todas.length,
  arestasDePagina: [...saida.values()].reduce((n, s) => n + s.size, 0),
  alcancaveisPelaCasca: global.size,
  orfas,
  semSaidaPropria: semSaida,
  inalcancaveis,
  linksQuebrados: [...quebrados.entries()].map(([link, origens]) => ({
    link,
    origens: [...origens].sort(),
  })),
  pranchasSemPorta,
}

if (JSON_OUT) {
  console.log(JSON.stringify(relatorio, null, 2))
  process.exit(0)
}

const bloco = (titulo, itens) => {
  console.log(`\n## ${titulo} (${itens.length})`)
  for (const i of itens) console.log(`  ${i}`)
}

console.log(
  `rotas: ${relatorio.rotas} | arestas de página: ${relatorio.arestasDePagina} | destinos pela casca: ${relatorio.alcancaveisPelaCasca}`,
)
bloco("Órfãs — ninguém aponta para elas", orfas)
bloco("Sem saída própria — só saem pela casca", semSaida)
bloco("Inalcançáveis a partir das entradas", inalcancaveis)
console.log(`\n## Links para rota inexistente (${relatorio.linksQuebrados.length})`)
for (const l of relatorio.linksQuebrados) console.log(`  ${l.link}  <- ${l.origens.join(", ")}`)
console.log(`\n## Pranchas web sem porta de entrada (${pranchasSemPorta.length})`)
for (const p of pranchasSemPorta) console.log(`  ${p.prancha}  ->  ${p.rotas.join(", ")}`)
