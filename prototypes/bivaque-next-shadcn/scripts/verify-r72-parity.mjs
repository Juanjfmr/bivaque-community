// Smoke checks of the shadcn port contract; NOT a visual or interaction test.
// The R72-approved HTML remains the authoritative baseline.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (relative) => readFileSync(new URL("../" + relative, import.meta.url), "utf8");
const app = read("components/library-app.tsx");
const detailRoutes = read("app/[section]/[id]/page.tsx");
const fixtures = read("components/modules/fixtures.ts");

test("R72: Criar is centered inside a five-destination mobile bar", () => {
  assert.match(app, /aria-label="Navegação principal mobile"/);
  assert.match(app, /grid-cols-5 items-center/);
  assert.match(app, /aria-label="Abrir menu Criar"/);
  assert.doesNotMatch(app, /bottom-\\[calc\\(92px/);
});
test("R72: search includes all main content families, not only classifieds", () => {
  assert.match(app, /const searchRecords=/);
  for (const name of ["QUESTIONS", "GROUPS", "EVENTS", "REQUESTS", "allItems"]) {
    assert.match(app.slice(app.indexOf("const searchRecords="), app.indexOf("const visibleSearch=")), new RegExp(name));
  }
  assert.match(app, /slug==="busca"\\?searchPage\\(\\)/);
});
test("National demo never presents Brasília-only guides, villas, or requests as local", () => {
  assert.match(app, /city==="Brasília"\\?<Accordion/);
  assert.match(app, /REQUESTS\\.filter\\(r=>r\\.city===city/);
  assert.match(app, /const localVillas=VILLAS\\.filter\\(v=>v\\.city===city\\)/);
  assert.match(app, /Nenhuma vila de demonstração em/);
  assert.match(app, /Ainda não há negócios de demonstração nesta cidade/);
});
test("Static detail routes cover the existing demo families", () => {
  for (const section of ["anuncio", "negocio", "pergunta", "grupo", "evento", "pedido"]) {
    assert.ok(detailRoutes.includes('section:"' + section + '"'), section);
  }
  assert.match(detailRoutes, /dynamicParams = false/);
});
test("Demo content and local-only persistence are explicit", () => {
  assert.match(fixtures, /Fictional content/);
  assert.match(app, /localStorage\\.setItem\\(store/);
  assert.match(app, /Nenhuma ação envia informações para terceiros/);
});
test("Dark-theme photos use R72 reduced brightness", () => {
  assert.match(app, /dark:brightness-90/);
});
