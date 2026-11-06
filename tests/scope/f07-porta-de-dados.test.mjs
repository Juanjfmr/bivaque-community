import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const raiz = join(import.meta.dirname, "..", "..")
const ler = (caminho) => readFileSync(join(raiz, caminho), "utf8")

test("F07: telas ligadas usam a porta de negócios sem demonstração", () => {
  for (const caminho of [
    "apps/app/src/negocios/Negocios.tsx",
    "apps/app/src/telas/Negocio.tsx",
    "apps/app/src/telas/Pedidos.tsx",
    "apps/app/src/telas/Pedido.tsx",
  ]) {
    const fonte = ler(caminho)
    assert.doesNotMatch(fonte, /dadosDoApp|from "@\/lib\/dados"/)
    assert.match(fonte, /@\/lib\/dados\/negocios/)
  }
  const roteador = ler("apps/app/src/roteador.tsx")
  assert.match(roteador, /import \{ Negocios \} from "@\/src\/negocios\/Negocios"/)
})

test("F07: todas as rotas usam sessão e preflight, escrita confere CSRF", () => {
  for (const base of ["apps/web/app/api/app/negocios", "apps/web/app/api/app/pedidos"]) {
    const rotas = readdirSync(join(raiz, base), { recursive: true }).filter((nome) =>
      nome.endsWith("route.ts"),
    )
    assert.ok(rotas.length >= 2)
    for (const rota of rotas) {
      const fonte = ler(join(base, rota))
      assert.doesNotMatch(fonte, /clienteDeServicoOuNulo|service_role/)
      assert.match(fonte, /exigirSessao/)
      assert.match(fonte, /opcoesDoApp/)
      if (/export async function POST/.test(fonte)) assert.match(fonte, /conferirEscrita\(/)
    }
  }
})
