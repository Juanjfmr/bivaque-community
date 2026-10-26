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
  has(app, 'Rascunhos visíveis apenas neste navegador');
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
  has(app, "Nenhuma ação envia informações para terceiros");
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
