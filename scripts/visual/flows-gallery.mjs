// Gerador da galeria de jornadas — formato Mobbin, a partir das pranchas.
//
// A visão principal é a JORNADA: uma sequência ordenada de telas com início, meio e fim, no
// molde do Mobbin. Cada tela vem de uma prancha; a prancha é a fonte, não a unidade. Uma visão
// secundária mostra as pranchas inteiras, para quem quer ver o quadro de origem.
//
// Recorte por CSS sobre o PNG original: nenhum PNG derivado. Documental por decisão — o selo é
// "referência visual", nunca "pronto".
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

const withAspect = (frame, board) => ({
  frame,
  aspect: Number(((frame.w * board.width) / (frame.h * board.height)).toFixed(4)),
})

function normalize(catalog) {
  const jornadas = catalog.journeys.map((j) => ({
    id: j.id,
    titulo: j.titulo,
    plataforma: j.plataforma,
    grupo: j.grupo,
    persona: j.persona,
    comeca: j.comeca,
    termina: j.termina,
    acoes: j.acoes,
    passos: j.passos.map((p) => ({
      tela: p.tela,
      fase: p.fase,
      prancha: p.prancha,
      arquivo: p.arquivo,
      frame: p.frame,
      aspect: p.aspect,
    })),
    variantes: j.variantes.map((p) => ({
      tela: p.tela,
      prancha: p.prancha,
      arquivo: p.arquivo,
      frame: p.frame,
      aspect: p.aspect,
    })),
  }))

  const pranchas = catalog.flows.map((f) => ({
    id: f.id,
    titulo: f.title,
    plataforma: f.platform,
    grupo: f.group,
    acoes: f.actions,
    status: f.status,
    reviewNotes: f.reviewNotes,
    passos: f.steps.map((s) => {
      const board = catalog.frames.boards[f.id]
      return {
        tela: s.label,
        arquivo: f.prancha.file,
        frame: s.frame,
        aspect: withAspect(s.frame, board).aspect,
      }
    }),
  }))

  return { jornadas, pranchas }
}

function buildHtml() {
  const catalog = loadFlowCatalog()
  const data = normalize(catalog)
  const groups = [
    ...new Map([
      ...data.jornadas.map((j) => [j.grupo.id, j.grupo.label]),
      ...data.pranchas.map((f) => [f.grupo.id, f.grupo.label]),
    ]),
  ].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
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
.lede{color:var(--muted);max-width:76ch;margin:0 0 8px}
.note{font-size:13px;color:var(--muted);margin:0 0 18px}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;position:sticky;top:0;background:var(--canvas);padding:10px 0;z-index:5;border-bottom:1px solid var(--line)}
input[type=search],select{font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:inherit;min-height:44px}
input[type=search]{flex:1 1 220px;min-width:190px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)}
.seg button{font:inherit;border:0;background:transparent;padding:0 15px;min-height:44px;cursor:pointer;color:var(--muted)}
.seg button[aria-pressed=true]{background:var(--sage);color:var(--green);font-weight:600}
main{max-width:1360px;margin:0 auto;padding:20px 24px 80px}
.count{color:var(--muted);font-size:14px;margin:0 0 14px}
.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(330px,1fr))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column}
.thumb{border:0;background:var(--sage);padding:14px 12px;cursor:pointer;border-bottom:1px solid var(--line);width:100%}
.strip{display:flex;gap:7px;align-items:flex-end;justify-content:center}
.frame{overflow:hidden;background:#fff;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.12)}
.thumb .frame{height:150px}
.frame img{display:block;width:calc(100% / var(--w));height:auto;max-width:none;transform:translateX(calc(var(--x) * -100%))}
.stepmark{display:flex;flex-direction:column;align-items:center;gap:5px}
.stepmark small{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.more{align-self:center;font-size:12px;color:var(--green);font-weight:600;padding:4px 8px}
.info{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.badge{font-size:12px;padding:3px 9px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.badge.grupo{background:var(--sage);border-color:transparent;color:var(--green);font-weight:600}
.info h2{font-size:19px;margin:0;letter-spacing:-.01em}
.tags{font-size:13px;color:var(--green);margin:0}
.narrativa{font-size:13px;color:var(--muted);margin:0}
.narrativa b{color:var(--ink);font-weight:600}
.screens{font-size:13px;color:var(--muted);margin:0}
.status{font-size:12px;color:var(--muted);margin-top:auto}
details summary{cursor:pointer;font-size:13px;color:var(--green);min-height:32px;display:flex;align-items:center}
details ul{margin:8px 0 0;padding-left:18px;font-size:13px;color:var(--muted)}
.empty{text-align:center;color:var(--muted);padding:60px 20px;grid-column:1/-1}
#lightbox{position:fixed;inset:0;background:rgba(20,26,22,.72);display:none;align-items:center;justify-content:center;padding:24px;z-index:50}
#lightbox.on{display:flex}
.lb{background:var(--canvas);border-radius:18px;max-width:1220px;width:100%;max-height:92vh;overflow:auto;padding:22px}
.lb-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.lb-head h2{margin:0 0 4px;font-size:22px}
.lb-close{font:inherit;border:1px solid var(--line);background:var(--surface);border-radius:10px;min-width:44px;min-height:44px;cursor:pointer}
.steps{display:flex;gap:16px;overflow-x:auto;padding:18px 4px;scroll-snap-type:x proximity}
.step{scroll-snap-align:start;flex:0 0 auto;max-width:46vw;margin:0}
.step .frame{height:54vh;max-height:600px}
.step figcaption{font-size:13px;color:var(--muted);text-align:center;margin-top:8px}
.step b{color:var(--green)}
.step .fase{display:block;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-top:2px}
.lb-nav{display:flex;gap:10px;align-items:center;justify-content:center;margin-top:6px}
.lb-nav button{font:inherit;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:0 16px;min-height:44px;cursor:pointer}
.lb-nav button:disabled{opacity:.45;cursor:default}
.lb-extra{margin-top:18px;border-top:1px solid var(--line);padding-top:14px}
.lb-extra h3{font-size:15px;margin:0 0 10px}
.variantes{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px}
.variantes .frame{height:190px}
.variantes figure{margin:0;flex:0 0 auto}
.variantes figcaption{font-size:12px;color:var(--muted);text-align:center;margin-top:6px;max-width:150px}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(max-width:640px){.step{max-width:84vw}.step .frame{height:42vh}}
</style>
</head>
<body>
<header>
  <div class="brand">Bivaque</div>
  <h1>Jornadas</h1>
  <p class="lede">Cada jornada é uma sequência de telas com <strong>início, meio e fim</strong> — no molde do Mobbin. As telas vêm das pranchas do guia visual; a prancha é a fonte, a jornada é a história.</p>
  <p class="note">Referência de aparência e fluxo, não prova de implementação: a prancha orienta, o runtime prova. Jornadas montadas das pranchas, não gravadas em runtime.</p>
  <div class="controls">
    <div class="seg" role="group" aria-label="Visão">
      <button data-view="jornadas" aria-pressed="true">Jornadas</button>
      <button data-view="pranchas" aria-pressed="false">Pranchas</button>
    </div>
    <input id="q" type="search" placeholder="Buscar jornada, tela ou tag" aria-label="Buscar jornada, tela ou tag">
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
    <div id="lbnarrativa"></div>
    <div class="steps" id="lbsteps"></div>
    <div class="lb-nav">
      <button id="lbprev">Anterior</button>
      <span id="lbpos" aria-live="polite"></span>
      <button id="lbnext">Próximo</button>
    </div>
    <div class="lb-extra" id="lbvariantes"></div>
    <div class="lb-extra" id="lbnotes"></div>
  </div>
</div>
<script id="dataset" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>
(function(){
  "use strict";
  var DATA = JSON.parse(document.getElementById("dataset").textContent);
  var PLATFORM_LABEL = { mobile: "Mobile", web: "Desktop web" };
  var grid = document.getElementById("grid");
  var count = document.getElementById("count");
  var q = document.getElementById("q");
  var groupSel = document.getElementById("group");
  var view = "jornadas";
  var platform = "all";
  var current = [];
  var cursor = 0;
  var lastFocus = null;

  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function normalize(s){ return s.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase(); }

  function frame(step, label){
    var wrap = el("div","frame");
    wrap.style.aspectRatio = String(step.aspect);
    wrap.style.setProperty("--x", String(step.frame.x));
    wrap.style.setProperty("--w", String(step.frame.w));
    var img = document.createElement("img");
    img.src = step.arquivo; img.alt = label; img.loading = "lazy"; img.decoding = "async";
    wrap.appendChild(img);
    return wrap;
  }

  function source(){
    return view === "jornadas" ? DATA.jornadas : DATA.pranchas;
  }

  function matches(item, term){
    if(platform !== "all" && item.plataforma !== platform) return false;
    if(groupSel.value !== "all" && item.grupo.id !== groupSel.value) return false;
    if(!term) return true;
    var hay = normalize([item.titulo, item.grupo.label, item.acoes.join(" "), item.passos.map(function(s){return s.tela}).join(" ")].join(" "));
    return hay.indexOf(term) >= 0;
  }

  function mark(step, index){
    var box = el("div","stepmark");
    box.appendChild(frame(step, view === "jornadas" ? step.tela : step.tela));
    box.appendChild(el("small", null, view === "jornadas" ? "passo " + (index + 1) : String(index + 1)));
    return box;
  }

  function card(item){
    var article = el("article","card");
    article.id = item.id;
    var thumb = el("button","thumb");
    thumb.type = "button";
    thumb.setAttribute("aria-label","Abrir " + item.titulo);
    var strip = el("div","strip");
    var shown = item.passos.slice(0, 4);
    shown.forEach(function(step, i){ strip.appendChild(mark(step, i)); });
    if(item.passos.length > shown.length){
      strip.appendChild(el("span","more","+" + (item.passos.length - shown.length)));
    }
    thumb.appendChild(strip);
    thumb.addEventListener("click", function(){ open(item.id); });

    var info = el("div","info");
    var meta = el("div","meta");
    meta.appendChild(el("span","badge", PLATFORM_LABEL[item.plataforma] || item.plataforma));
    meta.appendChild(el("span","badge grupo", item.grupo.label));
    meta.appendChild(el("span","badge", item.passos.length + (item.passos.length === 1 ? " tela" : " telas")));
    info.appendChild(meta);
    info.appendChild(el("h2", null, item.titulo));
    info.appendChild(el("p","tags", item.acoes.join(" · ")));
    if(view === "jornadas"){
      var narr = el("p","narrativa");
      var b1 = el("b", null, "Começa ");
      narr.appendChild(b1);
      narr.appendChild(document.createTextNode(item.comeca));
      narr.appendChild(el("br"));
      var b2 = el("b", null, "Termina ");
      narr.appendChild(b2);
      narr.appendChild(document.createTextNode(item.termina));
      info.appendChild(narr);
    } else if(item.reviewNotes.length){
      var details = el("details");
      details.appendChild(el("summary", null, "Ajustes de construção (" + item.reviewNotes.length + ")"));
      var ul = el("ul");
      item.reviewNotes.forEach(function(n){ ul.appendChild(el("li", null, n)); });
      details.appendChild(ul);
      info.appendChild(details);
    }
    info.appendChild(el("p","screens", item.passos.map(function(s){return s.tela}).join(" · ")));
    if(view === "pranchas") info.appendChild(el("p","status", item.status));
    article.appendChild(thumb);
    article.appendChild(info);
    return article;
  }

  function render(){
    var term = normalize(q.value.trim());
    current = source().filter(function(item){ return matches(item, term); });
    grid.textContent = "";
    var noun = view === "jornadas" ? "jornadas" : "pranchas";
    count.textContent = current.length + " de " + source().length + " " + noun;
    if(!current.length){
      var empty = el("div","empty");
      empty.appendChild(el("h2", null, "Nada com esses filtros"));
      empty.appendChild(el("p", null, "Tente outro termo, plataforma ou fluxo."));
      grid.appendChild(empty);
      return;
    }
    current.forEach(function(item){ grid.appendChild(card(item)); });
  }

  var lightbox = document.getElementById("lightbox");

  function open(id){
    var idx = -1;
    current.forEach(function(item, i){ if(item.id === id) idx = i; });
    if(idx < 0) return;
    cursor = idx;
    lastFocus = document.activeElement;
    paint();
    lightbox.classList.add("on");
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    document.getElementById("lbclose").focus();
  }
  function close(){
    lightbox.classList.remove("on");
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function paint(){
    var item = current[cursor];
    if(!item) return;
    document.getElementById("lbtitle").textContent = item.titulo;
    var meta = document.getElementById("lbmeta");
    meta.textContent = "";
    meta.appendChild(el("span","badge", PLATFORM_LABEL[item.plataforma] || item.plataforma));
    meta.appendChild(el("span","badge grupo", item.grupo.label));
    meta.appendChild(el("span","badge", view === "jornadas" ? "jornada" : item.status));

    var narrativa = document.getElementById("lbnarrativa");
    narrativa.textContent = "";
    if(view === "jornadas"){
      var p = el("p","narrativa");
      p.appendChild(el("b", null, "Começa "));
      p.appendChild(document.createTextNode(item.comeca + "  ·  "));
      p.appendChild(el("b", null, "Termina "));
      p.appendChild(document.createTextNode(item.termina));
      narrativa.appendChild(p);
    }

    var steps = document.getElementById("lbsteps");
    steps.textContent = "";
    item.passos.forEach(function(step, i){
      var fig = el("figure","step");
      fig.appendChild(frame(step, item.titulo + " — " + step.tela));
      var cap = el("figcaption");
      cap.appendChild(el("b", null, "Passo " + (i + 1) + ". "));
      cap.appendChild(document.createTextNode(step.tela));
      if(step.fase) cap.appendChild(el("span","fase", step.fase));
      if(view === "jornadas") cap.appendChild(el("span","fase", step.prancha));
      fig.appendChild(cap);
      steps.appendChild(fig);
    });
    document.getElementById("lbpos").textContent = item.passos.length + " telas";
    document.getElementById("lbprev").disabled = cursor === 0;
    document.getElementById("lbnext").disabled = cursor === current.length - 1;

    var variantes = document.getElementById("lbvariantes");
    variantes.textContent = "";
    if(item.variantes && item.variantes.length){
      variantes.appendChild(el("h3", null, "Estados alternativos desta jornada"));
      var row = el("div","variantes");
      item.variantes.forEach(function(step){
        var fig = el("figure");
        fig.appendChild(frame(step, step.tela));
        fig.appendChild(el("figcaption", null, step.tela));
        row.appendChild(fig);
      });
      variantes.appendChild(row);
    }

    var notes = document.getElementById("lbnotes");
    notes.textContent = "";
    if(view === "pranchas" && item.reviewNotes.length){
      notes.appendChild(el("h3", null, "Ajustes de construção"));
      var ul = el("ul");
      item.reviewNotes.forEach(function(n){ ul.appendChild(el("li", null, n)); });
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
  document.querySelectorAll("[data-view]").forEach(function(btn){
    btn.addEventListener("click", function(){
      view = btn.dataset.view;
      document.querySelectorAll("[data-view]").forEach(function(b){ b.setAttribute("aria-pressed", String(b === btn)); });
      render();
    });
  });
  q.addEventListener("input", render);
  groupSel.addEventListener("change", render);
  render();
  var deep = decodeURIComponent(location.hash.replace(/^#/, ""));
  if(deep){
    var found = current.some(function(item){ return item.id === deep; });
    if(found) open(deep);
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
  const { journeys } = loadFlowCatalog()
  console.log(`escrito ${OUT} (${journeys.length} jornadas)`)
}
