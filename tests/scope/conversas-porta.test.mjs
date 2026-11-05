import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const raiz = join(import.meta.dirname, "../..")
const ler = (caminho) => readFileSync(join(raiz, caminho), "utf8")

test("conversas ligadas usam a porta real e preservam as demais jornadas", () => {
  for (const tela of ["Conversas", "Conversa"]) {
    const fonte = ler(`apps/app/src/telas/${tela}.tsx`)
    assert.doesNotMatch(fonte, /dadosDoApp|lerMensagensDePrevia|guardarMensagemDePrevia/)
    assert.match(fonte, /@\/lib\/dados\/conversas/)
  }
  assert.match(ler("apps/app/src/telas/Inicio.tsx"), /@\/lib\/dados\/inicio/)
})

test("rotas de conversas usam sessão e não usam privilégio de serviço", () => {
  for (const rota of ["route.ts", "[id]/route.ts", "[id]/mensagens/route.ts"]) {
    const fonte = ler(`apps/web/app/api/app/conversas/${rota}`)
    assert.match(fonte, /exigirSessao/)
    assert.match(fonte, /opcoesDoApp/)
    assert.doesNotMatch(fonte, /clienteDeServicoOuNulo|service_role/)
  }
  assert.match(ler("apps/web/app/api/app/conversas/[id]/mensagens/route.ts"), /conferirEscrita/)
})
