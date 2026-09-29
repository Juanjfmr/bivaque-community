// Teste de mutação: quebra de propósito invariantes e confirma que a sonda certa acusa cada uma.
// Uso: node docs/design/prototype-v35/mutate.mjs   (termina em 0 só se TODAS as quebras forem detectadas)
// Frágil de propósito: cada mutação troca um trecho exato do HTML. Se o trecho mudar, o script avisa.

import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, "Bivaque_v35.html"), "utf8")
const muts = [
  [
    "M1 anúncio entra no orgânico",
    "P01",
    "const organic = list.filter((p) => !p.campaign).sort((a, b) => evScore(b.id) - evScore(a.id))",
    "const organic = list.sort((a, b) => evScore(b.id) - evScore(a.id))",
  ],
  [
    "M2 busca cria necessidade",
    "P06",
    "const r = buildResults(cl)\n      const tracked = trackedNeed(q)",
    'const r = buildResults(cl)\n      if (!trackedNeed(q)) createNeed({ title: q, dir: "need", intent: cl.intent, cityKey: r.cityKey, extra: { query: q } })\n      const tracked = trackedNeed(q)',
  ],
  [
    "M3 orçamento ancora na mudança",
    "P07",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: trecho literal do HTML a ser substituído
    'const n = f.need.value === "new" ? createNeed({ title: `${f.what.value.trim()} · ${p.name}`, dir: "need", intent: relatedIntentOf("provider", d.id), cityKey: p.city }) : needById(f.need.value)',
    'const n = needById("n-move")',
  ],
  [
    "M4 evidência guarda texto livre",
    "P18",
    'const e = { id: uid("ev"), needId: n.id,',
    'const e = { title: n.title, id: uid("ev"), needId: n.id,',
  ],
  [
    "M5 entra na comunidade sem confirmar",
    "P16",
    'if (d.comm && !isMember(d.comm)) { A.openJoin({ id: d.comm, then: "ask", q: d.q || "" }); return }',
    'if (d.comm && !isMember(d.comm)) { S.membership[d.comm] = "member" }',
  ],
  ["M6 gaveta sem role=dialog", "P26", 'role="dialog" aria-modal="true" ', ""],
  [
    "M8 o tempo passa e o pedido não recebe proposta",
    "P24",
    'if (n) { n.proposals.push({ id: uid("pr"), providerId: q.providerId, price, days: 7,',
    'if (false) { n.proposals.push({ id: uid("pr"), providerId: q.providerId, price, days: 7,',
  ],
  [
    "M9 Editar descarta o que a pessoa preencheu",
    "P35",
    'A.offerBack = () => offerForm(DRAFT.type, "", DRAFT.v)',
    'A.offerBack = () => offerForm(DRAFT.type, "", {})',
  ],
  [
    "M10 atalho dispara dentro de campo de texto",
    "P38",
    "if (typing || overlayOpen || MENU || e.ctrlKey || e.metaKey || e.altKey) return",
    "if (overlayOpen || MENU || e.ctrlKey || e.metaKey || e.altKey) return",
  ],
  [
    "M11 selecionar texto e soltar fora fecha a janela",
    "P40",
    'if (e.target.id === "overlay" && was) closeDrawer()',
    'if (e.target.id === "overlay") closeDrawer()',
  ],
  [
    "M12 anúncio ganha 'por que apareceu' no menu",
    "P43",
    '...(ad ? [] : [{ label: "Por que apareceu", icon: "info", act: "openWhy", d: { dtype: "provider", id } }])',
    '{ label: "Por que apareceu", icon: "info", act: "openWhy", d: { dtype: "provider", id } }',
  ],
  [
    "M13 ocultar não oculta",
    "P44",
    'const vis = (type, arr) => arr.filter((x) => !S.hidden[type + ":" + x.id])',
    "const vis = (type, arr) => arr",
  ],
  [
    "M14 Desfazer do salvamento não desfaz",
    "P44",
    "{ undo: () => flip() })",
    "{ undo: () => {} })",
  ],
  ["M15 validação inline desligada", "P46", "if (!validateForm(f)) return", "validateForm(f)"],
  [
    "M16 botão ⋯ escondido",
    "P43",
    "background:transparent;color:var(--muted);display:inline-grid;place-items:center;cursor:pointer;flex:none;",
    "background:transparent;color:var(--muted);display:none;place-items:center;cursor:pointer;flex:none;",
  ],
  [
    "M17 clique direito não abre o menu",
    "P43",
    "if (e.button === 2) openMenuFor(c, { x: e.clientX, y: e.clientY })",
    "if (e.button === 2) menuClose(false)",
  ],
  [
    "M18 ligar conversa sem necessidade estoura",
    "P47",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: trecho literal do HTML a ser substituído
    '<input type="radio" name="need" value="new"${needs.length ? "" : " checked"}><div class="grow"><b>Criar uma necessidade nova</b><span>Título editável depois</span>',
    '<input type="radio" name="need" value="new"><div class="grow"><b>Criar uma necessidade nova</b><span>Título editável depois</span>',
  ],
  [
    "M7 data exata de terceiros",
    "P15",
    'return (+d <= 10 ? "início de " : +d <= 20 ? "meados de " : "fim de ") + mon',
    'return d + "/" + m',
  ],
]
const dir = mkdtempSync(join(tmpdir(), "bv35-"))
let ok = true
for (const [name, probe, old, neu] of muts) {
  if (!src.includes(old)) {
    console.log("!! trecho não encontrado (o HTML mudou):", name)
    ok = false
    continue
  }
  const f = join(dir, "mut.html")
  writeFileSync(f, src.replace(old, neu))
  const r = spawnSync("node", [join(here, "verify.mjs"), f], {
    env: { ...process.env, ONLY: probe },
    encoding: "utf8",
  })
  const lines = r.stdout.split("\n").filter((l) => /^(PASS|FAIL) /.test(l))
  const line = lines.find((l) => l.startsWith("FAIL")) || lines[0] || ""
  const caught = lines.some((l) => l.startsWith("FAIL"))
  console.log(`${(caught ? "DETECTADA      " : "NÃO DETECTADA  ") + name} → ${line.slice(0, 110)}`)
  ok = ok && caught
}
rmSync(dir, { recursive: true, force: true })
console.log(ok ? "todas as mutações detectadas" : "HÁ MUTAÇÃO NÃO DETECTADA")
process.exit(ok ? 0 : 1)
