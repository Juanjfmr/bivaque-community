// Static contract regression checks, not a browser-based visual parity certification.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const app = read("components/library-app.tsx");
const routes = read("app/[section]/[id]/page.tsx");
const fixtures = read("components/modules/fixtures.ts");
const has = (source, text) => assert.ok(source.includes(text), "Missing: " + text);
const lacks = (source, text) => assert.ok(!source.includes(text), "Unexpected: " + text);

test("Mobile navigation keeps Criar centered within five targets", () => {
  has(app, 'aria-label="Navegação principal mobile"');
  has(app, "grid-cols-5 items-center");
  has(app, 'aria-label="Abrir menu Criar"');
  lacks(app, "bottom-[calc(92px");
});
test("Search indexes all relevant city-specific module data", () => {
  const index = app.slice(app.indexOf("const searchRecords="), app.indexOf("const visibleSearch="));
  for (const key of ["allItems", "QUESTIONS", "GROUPS", "EVENTS", "REQUESTS"]) has(index, key);
  has(app, 'slug==="busca"?searchPage()');
  has(app, 'const visibleSearch=searchRecords.filter');
});
test("Different cities do not borrow Brasília demo content", () => {
  has(app, 'city==="Brasília"?<Accordion');
  has(app, 'REQUESTS.filter(r=>r.city===city');
  has(app, 'const localVillas=VILLAS.filter(v=>v.city===city)');
  has(app, 'Nenhuma vila de demonstração em');
  has(app, 'Ainda não há negócios de demonstração nesta cidade');
});
test("Local drafts persist and remain scoped to their chosen city", () => {
  has(app, 'kind:composeType,city');
  has(app, 'p.city||INITIAL_CITY)===city');
  has(app, 'Rascunhos locais, sem publicação real');
  has(app, 'localDrafts(localKinds)');
  has(app, 'localDrafts(["Pedido"])');
  has(app, 'localDrafts(["Encontro"])');
});
test("Every existing demo detail family is prerendered", () => {
  for (const category of ["anuncio", "negocio", "pergunta", "grupo", "evento", "pedido"]) {
    has(routes, 'section:"' + category + '"');
  }
  has(routes, "dynamicParams = false");
});
test("Simulated data and darker photographs are explicit", () => {
  has(fixtures, "Fictional content");
  has(app, "localStorage.setItem(store");
  has(app, "Algumas imagens são carregadas de serviços externos.");
  has(app, "dark:brightness-90");
});

test("P1: fictional onboarding never solicits CPF, document, password or real email",()=>{
  const access=read("components/demo-access.tsx");
  has(access, "Simulação, não autenticação");
  has(access, "não aceita documentos");
  has(access, "Simular aprovação");
  has(access, "Apelido fictício");
  assert.ok(!/<Input[^>]*type="password"/.test(access));
  has(app, 'slug==="acesso"?<DemoAccessPage');
});
test("P1: moderated items can be reported and locally hidden, with a review queue",()=>{
  const mod=read("components/demo-moderation.tsx");
  has(app, "submitReport");
  has(app, "hiddenByDemo");
  has(app, "onClick={()=>openReport");
  has(mod, "Fila de moderação");
  has(mod, "Ocultar no laboratório");
  has(mod, "Reabrir");
  has(app, 'slug==="painel"?<DemoModerationPage');
});
test("P1: owned demo publications can be edited, paused and deleted",()=>{
  has(app, "function editPost(p:Post)");
  has(app, "Rascunho atualizado neste navegador");
  has(app, "Retomar");
  has(app, "Pausar");
  has(app, "Salvar alterações");
  has(app, "localDrafts(options)");
});
test("P1: access and moderation pages exported as static routes",()=>{
  const page=read("app/[section]/page.tsx");
  for(const key of ['"acesso"','"painel"'])has(page,key);
});

test("P2: restricted groups track pending requests without pretending to approve access",()=>{
  has(app, 'groupRequests');
  has(app, 'Cancelar solicitação');
  has(app, 'A aprovação real dependeria da administração do grupo');
  has(app, 'joinGroup(g.id,g.open)');
});
test("P2: group thread supports local posts, comments, likes and per-post moderation",()=>{
  has(app, 'function groupFeed(');
  has(app, 'submitGroupPost');
  has(app, 'submitGroupReply');
  has(app, 'setGroupComments(');
  has(app, 'groupLikes');
  has(app, 'openReport("publicacao",p.id');
  has(app, 'hiddenByDemo("publicacao",p.id)');
});
test("P2: listing gallery and neighborhood never invent coordinates",()=>{
  has(app, 'Ver foto ampliada');
  has(app, '1 foto ilustrativa disponível');
  has(app, 'window.open("https://www.openstreetmap.org/search?query="');
  has(app, 'Sem coordenada homologada');
  has(app, 'navigator.share');
  has(app, 'HOUSING.filter(h=>h.city===city).map(h=>h.om)');
});
test("P2: moderation excludes hidden entries from catalog and home",()=>{
  has(app, 'hiddenByDemo(x.kind==="servicos"?"negocio":"anuncio",x.id)');
  has(app, 'hiddenByDemo("grupo",g.id)');
  has(app, 'hiddenByDemo("pergunta",q.id)');
});

test("P2: rental detail doesn't duplicate its per-month suffix",()=>{
  lacks(app, '>R$ 3.500/mês/mês<');
  lacks(app, '>{it.price}{home?.type==="Aluguel"');
  has(app, '>{it.price}</p>');
});

test("R72 public entry is a distinct branded landing, not logged-in home",()=>{
  const landing=read("components/public-landing.tsx");
  const root=read("app/page.tsx");
  has(root, "PublicLanding");
  for(const section of ["Juntos somos mais fortes.","Marinha, Exército e Aeronáutica","Como funciona","Transferido? Chegue sabendo.","Perguntas frequentes"])has(landing,section);
  for(const dest of ["/acesso/","/ajuda/","/privacidade/","/conduta/"])has(landing,dest);
});
test("R72 help, conduct, privacy, free plans and support have static routes",()=>{
  const page=read("app/[section]/page.tsx");
  for(const route of ["ajuda","privacidade","conduta","planos","contato","chamados"])has(page,'\"'+route+'\"');
  const appInfo=read("components/r72-info.tsx"),support=read("components/r72-support.tsx");
  has(appInfo,"Versão de teste");
  has(appInfo,"Sem cobrança");
  has(support,"Ela permanece somente neste navegador.");
});
