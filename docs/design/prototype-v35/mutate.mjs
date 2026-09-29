// Teste de mutação: quebra de propósito invariantes e confirma que a sonda certa acusa cada uma.
// Uso: node docs/design/prototype-v35/mutate.mjs   (termina em 0 só se TODAS as quebras forem detectadas)
//      MUT=M9,M15 node docs/design/prototype-v35/mutate.mjs   (só algumas, para depurar)
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
    'A.offerBack = () => offerForm(DRAFT.type, "", DRAFT.v, true)',
    'A.offerBack = () => offerForm(DRAFT.type, "", {}, true)',
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
    "M19 símbolo Unicode volta como ícone",
    "P36",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: trecho literal do HTML a ser substituído
    '<span class="arrow" aria-hidden="true">${ic("chevron-right")}</span>',
    '<span class="arrow" aria-hidden="true">❯</span>',
  ],
  [
    "M20 texto cru na tela (template dentro de aspas simples)",
    "P36",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: trecho literal do HTML a ser substituído
    '`<small class="good">${ic("check")} A que mais ajudou</small>`',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: trecho literal do HTML a ser substituído
    '\'<small class="good">${ic("check")} A que mais ajudou</small>\'',
  ],
  [
    "M21 Enter na paleta não navega",
    "P37",
    'A[it.run.act](it.run.d || {}, document.createElement("button"))',
    "void it",
  ],
  [
    "M22 título da página não acompanha a tela",
    "P39",
    'PAGE_TITLE[route.page]) || "Bivaque"} · Bivaque, protótipo v35',
    'PAGE_TITLE.home) || "Bivaque"} · Bivaque, protótipo v35',
  ],
  [
    "M23 movimento reduzido ignorado",
    "P41",
    "@media (prefers-reduced-motion:reduce){",
    "@media (prefers-reduced-motion:no-preference-off){",
  ],
  [
    "M24 Esc não devolve o foco ao botão ⋯",
    "P42",
    "if (restore && document.contains(trigger)) trigger.focus()",
    "if (restore && document.contains(trigger)) document.body.focus()",
  ],
  [
    "M25 toque longo também abre o cartão",
    "P45",
    "suppressClick = Date.now(); openMenuFor(c, { x, y })",
    "openMenuFor(c, { x, y })",
  ],
  [
    "M26 anúncio próprio oferece o menu de terceiros",
    "P43",
    'return own ? [detail("housing", "Ver detalhes"), sep, { label: "Encerrar anúncio"',
    'return false ? [detail("housing", "Ver detalhes"), sep, { label: "Encerrar anúncio"',
  ],
  [
    "M27 anúncio fura o filtro",
    "P48",
    "const ads = res.filter(spec.isAd)",
    "const ads = spec.items.filter(spec.isAd)",
  ],
  [
    "M28 Limpar tudo não limpa os filtros",
    "P48",
    'st.q = ""; st.g = {}; catRender() }\nA.filtRemove',
    'st.q = ""; catRender() }\nA.filtRemove',
  ],
  [
    "M29 ordenar por menor preço sai invertido",
    "P49",
    '["price", "Menor preço inicial", (a, b) => a.base - b.base]',
    '["price", "Menor preço inicial", (a, b) => b.base - a.base]',
  ],
  [
    "M30 contagem da opção não bate com o resultado",
    "P48",
    "return base.filter(has).length",
    "return base.filter(has).length + 1",
  ],
  [
    "M31 mínimo de quartos vira quantidade exata",
    "P48",
    'case "min": return (g.get(x) ?? 0) >= v',
    'case "min": return (g.get(x) ?? 0) === v',
  ],
  [
    "M32 trocar o tipo de serviço não limpa a especialidade",
    "P49",
    "for (const c of g.clears || []) delete st.g[c]\n  catRender()",
    "catRender()",
  ],
  [
    "M33 comodidades do anúncio publicado se perdem",
    "P53",
    "amen: asArr(v.amen), guar: asArr(v.guar), tags: [kind]",
    "amen: [], guar: asArr(v.guar), tags: [kind]",
  ],
  [
    "M34 sem resultado não sugere o que tirar",
    "P52",
    ".filter((x) => x.n > 0 && x.n > adsShown)",
    ".filter(() => false)",
  ],
  [
    "M35 folha do celular não atualiza 'Ver N'",
    "P54",
    '$("#fsFoot").innerHTML = fsFootHTML(kind, spec, st, filtRes(spec, st).length)',
    "void 0",
  ],
  [
    "M36 bairros escolhidos viram 'todos ao mesmo tempo'",
    "P50",
    'case "multi": { const a = asArr(g.get(x)); return v.some((k) => a.includes(k)) }',
    'case "multi": { const a = asArr(g.get(x)); return v.every((k) => a.includes(k)) }',
  ],
  [
    "M37 comodidades 'todas as marcadas' viram 'qualquer uma'",
    "P48",
    'case "all": { const a = asArr(g.get(x)); return v.every((k) => a.includes(k)) }',
    'case "all": { const a = asArr(g.get(x)); return v.some((k) => a.includes(k)) }',
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
const only = process.env.MUT ? new Set(process.env.MUT.split(",")) : null // ex.: MUT=M9,M15
for (const [name, probe, old, neu] of muts) {
  if (only && !only.has(name.split(" ")[0])) continue
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
  // Só conta como detectada uma falha de ASSERÇÃO. Uma sonda que falha porque a página quebrou
  // (exceção da própria sonda ou erro de JavaScript na página) prova que o mutante estragou algo,
  // não que a sonda enxerga a violação que ele representa.
  // Falha de asserção = sobra texto de asserção depois de tirar o "erro JS" anexado; "exceção:" sozinha
  // significa que a sonda nem chegou a concluir (ex.: esgotou o tempo esperando um botão que sumiu).
  const assertion = (l) => {
    const main = l.split("→").slice(1).join("→").split(" · erro JS:")[0].trim()
    return main !== "" && !main.startsWith("exceção:")
  }
  const fails = lines.filter((l) => l.startsWith("FAIL"))
  const asserted = fails.filter(assertion)
  const caught = asserted.length > 0
  const line = asserted[0] || fails[0] || lines[0] || ""
  const tag = caught ? "DETECTADA      " : fails.length ? "SÓ QUEBROU A PÁGINA " : "NÃO DETECTADA  "
  console.log(`${tag + name} → ${line.slice(0, 110)}`)
  ok = ok && caught
}
rmSync(dir, { recursive: true, force: true })
console.log(ok ? "todas as mutações detectadas" : "HÁ MUTAÇÃO NÃO DETECTADA")
process.exit(ok ? 0 : 1)
