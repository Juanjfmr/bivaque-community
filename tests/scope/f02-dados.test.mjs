import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const ler = (arquivo) => readFileSync(new URL(`../../${arquivo}`, import.meta.url), "utf8")

test("as rotas de início e busca usam a sessão sem cliente de serviço", () => {
  for (const nome of ["inicio", "busca"]) {
    const fonte = ler(`apps/web/app/api/app/${nome}/route.ts`)
    assert.match(fonte, /exigirSessao\(request\)/)
    assert.match(fonte, /auth\.sessao\.cliente/)
    assert.doesNotMatch(fonte, /clienteDeServicoOuNulo|service_role/)
  }
})

test("a porta de dados da jornada não recorre à demonstração", () => {
  const fonte = ler("apps/app/lib/dados/inicio.ts")
  assert.doesNotMatch(fonte, /dadosDoApp|criarDadosDemo/)
  assert.match(fonte, /from "\.\.\/api\/cliente"/)
})
