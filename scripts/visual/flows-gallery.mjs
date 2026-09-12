// Gerador da galeria de jornadas — formato Mobbin, a partir das pranchas.
//
// Lê o catálogo (manifest + taxonomia + geometria) e escreve um HTML autocontido ao lado dos
// PNGs. Cada fluxo é uma prancha; cada passo é um recorte de um quadro, feito por CSS sobre o
// PNG original. Nenhum PNG derivado é criado: o recorte é uma janela, e o original segue a
// única fonte. Documental por decisão — o selo é "referência visual", nunca "pronto".
//
// Uso:
//   node scripts/visual/flows-gallery.mjs          escreve flows.html
//   node scripts/visual/flows-gallery.mjs --check   falha se o HTML no disco difere do gerado
//
// O HTML é determinístico de propósito: sem data nem revisão embutidas, senão o --check ficaria
// vermelho a cada dia e a cada commit. A proveniência vive no histórico do Git.

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { GUIDE_DIR, loadFlowCatalog } from "./flows/catalog.mjs"

const OUT = join(GUIDE_DIR, "flows.html")
const CHECK = process.argv.includes("--check")

function withAspect(flows) {
  return flows.map((flow) => ({
    ...flow,
    steps: flow.steps.map((step) => ({
      ...step,
      aspect: Number(
        ((step.frame.w * flow.prancha.width) / (step.frame.h * flow.prancha.height)).toFixed(4),
      ),
    })),
  }))
}

function buildHtml() {
  const { flows } = loadFlowCatalog()
  const withFrames = withAspect(flows)
  const groups = [...new Map(withFrames.map((f) => [f.group.id, f.group.label]))].sort((a, b) =>
    a[1].localeCompare(b[1], "pt-BR"),
  )
  const payload = {
    flows: withFrames,
  }
  const groupOptions = groups
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join("")

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bivaque — jornadas</title>
<style>
:root{--green:#164734;--canvas:#FAFBF8;--surface:#fff;--sage:#EEF1E7;--ink:#262A27;--muted:#6B7370;--line:#E2E6E0;--radius:14px}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--canvas);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif}
a{color:var(--green)}
header{padding:30px 24px 8px;max-width:1360px;margin:0 auto}
.brand{font-weight:700;color:var(--green);letter-spacing:.02em}
h1{font-size:clamp(24px,3vw,34px);margin:10px 0 6px;letter-spacing:-.01em}
.lede{color:var(--muted);max-width:74ch;margin:0 0 8px}
.note{font-size:13px;color:var(--muted);margin:0 0 18px}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;position:sticky;top:0;background:var(--canvas);padding:10px 0;z-index:5;border-bottom:1px solid var(--line)}
input[type=search],select{font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:inherit;min-height:44px}
input[type=search]{flex:1 1 240px;min-width:200px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)}
.seg button{font:inherit;border:0;background:transparent;padding:0 14px;min-height:44px;cursor:pointer;color:var(--muted)}
.seg button[aria-pressed=true]{background:var(--sage);color:var(--green);font-weight:600}
main{max-width:1360px;margin:0 auto;padding:20px 24px 80px}
.count{color:var(--muted);font-size:14px;margin:0 0 14px}
.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column}
.thumb{border:0;background:var(--sage);padding:12px;cursor:pointer;border-bottom:1px solid var(--line);width:100%}
.strip{display:flex;gap:8px;align-items:flex-start;justify-content:center}
.frame{overflow:hidden;background:#fff;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.12)}
.thumb .frame{height:150px}
.frame img{display:block;width:calc(100% / var(--w));max-width:none;transform:translateX(calc(var(--x) * -100%))}
.info{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.badge{font-size:12px;padding:3px 9px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.badge.grupo{background:var(--sage);border-color:transparent;color:var(--green);font-weight:600}
.info h2{font-size:19px;margin:0;letter-spacing:-.01em}
.tags{font-size:13px;color:var(--green);margin:0}
.screens{font-size:13px;color:var(--muted);margin:0}
.status{font-size:12px;color:var(--muted);margin-top:auto}
details summary{cursor:pointer;font-size:13px;color:var(--green);min-height:32px;display:flex;align-items:center}
details ul{margin:8px 0 0;padding-left:18px;font-size:13px;color:var(--muted)}
.empty{text-align:center;color:var(--muted);padding:60px 20px;grid-column:1/-1}
#lightbox{position:fixed;inset:0;background:rgba(20,26,22,.72);display:none;align-items:center;justify-content:center;padding:24px;z-index:50}
#lightbox[open],#lightbox.on{display:flex}
.lb{background:var(--canvas);border-radius:18px;max-width:1180px;width:100%;max-height:92vh;overflow:auto;padding:22px}
.lb-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.lb-head h2{margin:0 0 4px;font-size:22px}
.lb-close{font:inherit;border:1px solid var(--line);background:var(--surface);border-radius:10px;min-width:44px;min-height:44px;cursor:pointer}
.steps{display:flex;gap:16px;overflow-x:auto;padding:18px 4px;scroll-snap-type:x proximity}
.step{scroll-snap-align:start;flex:0 0 auto;max-width:44vw}
.step .frame{height:56vh;max-height:620px}
.step figcaption{font-size:13px;color:var(--muted);text-align:center;margin-top:8px}
.step b{color:var(--green)}
.lb-nav{display:flex;gap:10px;align-items:center;justify-content:center;margin-top:6px}
.lb-nav button{font:inherit;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:0 16px;min-height:44px;cursor:pointer}
.lb-nav button:disabled{opacity:.45;cursor:default}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(max-width:640px){.step{max-width:82vw}.step .frame{height:44vh}}
</style>
</head>
<body>
<header>
  <div class="brand">Bivaque</div>
  <h1>Jornadas</h1>
  <p class="lede">Cada prancha do guia visual é um fluxo; cada tela ou estado é um passo, recortado do próprio PNG. Este é um mapa de <strong>referência de aparência e fluxo</strong>.</p>
  <p class="note">Não é prova de implementação: a prancha orienta, o runtime prova. Gerado a partir do manifest, da taxonomia e da geometria das pranchas.</p>
  <div class="controls">
    <input id="q" type="search" placeholder="Buscar fluxo, tela ou tag" aria-label="Buscar fluxo, tela ou tag">
    <div class="seg" role="group" aria-label="Plataforma">
      <button data-kind="all" aria-pressed="true">Todas</button>
      <button data-kind="mobile" aria-pressed="false">Mobile</button>
      <button data-kind="web" aria-pressed="false">Desktop web</button>
    </div>
    <label class="visually-hidden" for="group">Fluxo</label>
    <select id="group"><option value="all">Todos os fluxos</option>${groupOptions}</select>
  </div>
</header>
<main>
  <p class="count" id="count"></p>
  <div class="grid" id="grid"></div>
</main>
<div id="lightbox" role="dialog" aria-modal="true" aria-labelledby="lbtitle">
  <div class="lb">
    <div class="lb-head">
      <div>
        <h2 id="lbtitle"></h2>
        <div class="meta" id="lbmeta"></div>
      </div>
      <button class="lb-close" id="lbclose" aria-label="Fechar">Fechar</button>
    </div>
    <div class="steps" id="lbsteps"></div>
    <div class="lb-nav">
      <button id="lbprev">Anterior</button>
      <span id="lbpos" aria-live="polite"></span>
      <button id="lbnext">Próximo</button>
    </div>
    <div id="lbnotes"></div>
  </div>
</div>
<script id="dataset" type="application/json">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>
<script>
(function(){
  "use strict";
  var DATA = JSON.parse(document.getElementById("dataset").textContent);
  var flows = DATA.flows;
  var PLATFORM_LABEL = { mobile: "Mobile", web: "Desktop web" };
  var grid = document.getElementById("grid");
  var count = document.getElementById("count");
  var q = document.getElementById("q");
  var groupSel = document.getElementById("group");
  var platform = "all";
  var current = [];
  var cursor = 0;

  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function normalize(s){ return s.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase(); }

  function frame(step, flow, label){
    var wrap = el("div","frame");
    wrap.style.aspectRatio = String(step.aspect);
    wrap.style.setProperty("--x", String(step.frame.x));
    wrap.style.setProperty("--w", String(step.frame.w));
    var img = document.createElement("img");
    img.src = flow.prancha.file; img.alt = label; img.loading = "lazy"; img.decoding = "async";
    img.width = flow.prancha.width; img.height = flow.prancha.height;
    wrap.appendChild(img);
    return wrap;
  }

  function matches(flow, term){
    if(platform !== "all" && flow.platform !== platform) return false;
    if(groupSel.value !== "all" && flow.group.id !== groupSel.value) return false;
    if(!term) return true;
    var hay = normalize([flow.title, flow.group.label, flow.actions.join(" "), flow.steps.map(function(s){return s.label}).join(" ")].join(" "));
    return hay.indexOf(term) >= 0;
  }

  function card(flow, index){
    var article = el("article","card");
    article.id = flow.id;
    var thumb = el("button","thumb");
    thumb.type = "button";
    thumb.setAttribute("aria-label","Abrir fluxo " + flow.title);
    var strip = el("div","strip");
    flow.steps.forEach(function(step){
      strip.appendChild(frame(step, flow, flow.title + " — " + step.label));
    });
    thumb.appendChild(strip);
    thumb.addEventListener("click", function(){ open(index); });

    var info = el("div","info");
    var meta = el("div","meta");
    meta.appendChild(el("span","badge plataforma", PLATFORM_LABEL[flow.platform] || flow.platform));
    meta.appendChild(el("span","badge grupo", flow.group.label));
    meta.appendChild(el("span","badge", flow.steps.length + (flow.steps.length === 1 ? " tela" : " telas")));
    info.appendChild(meta);
    info.appendChild(el("h2", null, flow.title));
    info.appendChild(el("p","tags", flow.actions.join(" · ")));
    info.appendChild(el("p","screens", flow.steps.map(function(s){return s.label}).join(" · ")));
    if(flow.reviewNotes.length){
      var details = el("details");
      details.appendChild(el("summary", null, "Ajustes de construção (" + flow.reviewNotes.length + ")"));
      var ul = el("ul");
      flow.reviewNotes.forEach(function(note){ ul.appendChild(el("li", null, note)); });
      details.appendChild(ul);
      info.appendChild(details);
    }
    info.appendChild(el("p","status", flow.status));
    article.appendChild(thumb);
    article.appendChild(info);
    return article;
  }

  function render(){
    var term = normalize(q.value.trim());
    current = flows.filter(function(f){ return matches(f, term); });
    grid.textContent = "";
    count.textContent = current.length + (current.length === 1 ? " fluxo" : " fluxos") + " de " + flows.length;
    if(!current.length){
      var empty = el("div","empty");
      empty.appendChild(el("h2", null, "Nenhum fluxo com esses filtros"));
      empty.appendChild(el("p", null, "Tente outro termo, plataforma ou fluxo."));
      grid.appendChild(empty);
      return;
    }
    current.forEach(function(flow, i){ grid.appendChild(card(flow, i)); });
  }

  var lightbox = document.getElementById("lightbox");
  var lastFocus = null;

  function open(index){
    cursor = index;
    lastFocus = document.activeElement;
    paint();
    lightbox.classList.add("on");
    try { history.replaceState(null, "", "#" + flow_id_at(cursor)); } catch (e) {}
    document.getElementById("lbclose").focus();
  }
  function flow_id_at(index){ return current[index] ? current[index].id : ""; }
  function close(){
    lightbox.classList.remove("on");
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function paint(){
    var flow = current[cursor];
    if(!flow) return;
    document.getElementById("lbtitle").textContent = flow.title;
    var meta = document.getElementById("lbmeta");
    meta.textContent = "";
    meta.appendChild(el("span","badge plataforma", PLATFORM_LABEL[flow.platform] || flow.platform));
    meta.appendChild(el("span","badge grupo", flow.group.label));
    meta.appendChild(el("span","badge", flow.status));
    var steps = document.getElementById("lbsteps");
    steps.textContent = "";
    flow.steps.forEach(function(step){
      var fig = el("figure","step");
      fig.style.margin = "0";
      fig.appendChild(frame(step, flow, flow.title + " — " + step.label));
      var cap = el("figcaption");
      cap.appendChild(el("b", null, "Passo " + step.index + ". "));
      cap.appendChild(document.createTextNode(step.label));
      fig.appendChild(cap);
      steps.appendChild(fig);
    });
    document.getElementById("lbpos").textContent = flow.steps.length + " telas/estados";
    document.getElementById("lbprev").disabled = cursor === 0;
    document.getElementById("lbnext").disabled = cursor === current.length - 1;
    var notes = document.getElementById("lbnotes");
    notes.textContent = "";
    if(flow.reviewNotes.length){
      notes.appendChild(el("h3", null, "Ajustes de construção"));
      var ul = el("ul");
      flow.reviewNotes.forEach(function(note){ ul.appendChild(el("li", null, note)); });
      notes.appendChild(ul);
    }
  }

  document.getElementById("lbclose").addEventListener("click", close);
  document.getElementById("lbprev").addEventListener("click", function(){ if(cursor > 0){ cursor--; paint(); } });
  document.getElementById("lbnext").addEventListener("click", function(){ if(cursor < current.length - 1){ cursor++; paint(); } });
  lightbox.addEventListener("click", function(e){ if(e.target === lightbox) close(); });
  document.addEventListener("keydown", function(e){
    if(!lightbox.classList.contains("on")) return;
    if(e.key === "Escape") close();
    if(e.key === "ArrowRight" && cursor < current.length - 1){ cursor++; paint(); }
    if(e.key === "ArrowLeft" && cursor > 0){ cursor--; paint(); }
  });
  document.querySelectorAll("[data-kind]").forEach(function(btn){
    btn.addEventListener("click", function(){
      platform = btn.dataset.kind;
      document.querySelectorAll("[data-kind]").forEach(function(b){ b.setAttribute("aria-pressed", String(b === btn)); });
      render();
    });
  });
  q.addEventListener("input", render);
  groupSel.addEventListener("change", render);
  render();
  var deep = decodeURIComponent(location.hash.replace(/^#/, ""));
  if(deep){
    var idx = -1;
    current.forEach(function(f, i){ if(f.id === deep) idx = i; });
    if(idx >= 0) open(idx);
  }
})();
</script>
</body>
</html>
`
}

const html = buildHtml()

if (CHECK) {
  let existing = ""
  try {
    existing = readFileSync(OUT, "utf8")
  } catch {
    console.error("flows.html não existe — rode sem --check para gerar")
    process.exit(1)
  }
  if (existing !== html) {
    console.error("flows.html está desatualizado — rode node scripts/visual/flows-gallery.mjs")
    process.exit(1)
  }
  console.log("--check ok: flows.html em dia")
} else {
  writeFileSync(OUT, html, "utf8")
  const { flows } = loadFlowCatalog()
  console.log(`escrito ${OUT} (${flows.length} fluxos)`)
}
