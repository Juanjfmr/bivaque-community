import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const ler = (path) => readFileSync(join(import.meta.dirname, "../..", path), "utf8")

test("F03: criação e meus anúncios usam a porta real sem demonstração", () => {
  for (const path of [
    "apps/app/src/criar/Perguntar.tsx",
    "apps/app/src/criar/Desapego.tsx",
    "apps/app/src/telas/MeusAnuncios.tsx",
  ]) {
    const fonte = ler(path)
    assert.doesNotMatch(fonte, /dadosDoApp|fetch\(/)
    assert.match(fonte, /@\/lib\/dados\/criar/)
  }
  assert.doesNotMatch(ler("apps/app/src/telas/Comunidade.tsx"), /criarPerguntaLocal/)
  assert.doesNotMatch(ler("apps/app/lib/dados/criar.ts"), /dadosDoApp|fetch\(/)
  assert.match(ler("apps/app/lib/dados/criar.ts"), /AbortSignal/)
})

test("F03: sessão sob RLS e CSRF nas novas escritas", () => {
  for (const path of [
    "apps/web/app/api/app/perguntas/route.ts",
    "apps/web/app/api/app/mercado/_criar.ts",
    "apps/web/app/api/app/mercado/meus/route.ts",
  ]) {
    const fonte = ler(path)
    assert.match(fonte, /exigirSessao\(/)
    assert.doesNotMatch(fonte, /clienteDeServicoOuNulo|createServerClient|service_role/)
    if (!path.includes("/meus/")) assert.match(fonte, /conferirEscrita\(/)
  }
  assert.match(ler("apps/web/app/api/app/mercado/meus/route.ts"), /opcoesDoApp\(/)
  assert.match(ler("apps/web/lib/storage/listing-photo.ts"), /sanitizeImage\(/)
  assert.match(ler("apps/web/lib/listings/actions.ts"), /enviarFotoDoAnuncio\(/)
  assert.match(ler("apps/web/lib/recommendations/create.ts"), /titleProblem\(/)
  assert.match(ler("apps/web/lib/listings/create.ts"), /validateNewListing\(/)
})
