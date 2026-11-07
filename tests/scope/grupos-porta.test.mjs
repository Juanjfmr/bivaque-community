import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const ler = (path) => readFileSync(join(import.meta.dirname, "../..", path), "utf8")
test("grupo e diretório usam a porta real sem demonstração ou estado local de participação", () => {
  for (const path of [
    "apps/app/src/telas/Grupo.tsx",
    "apps/app/src/telas/Publicacao.tsx",
    "apps/app/src/grupos/Diretorio.tsx",
  ]) {
    const fonte = ler(path)
    assert.match(fonte, /lib\/dados\/grupos/)
    assert.doesNotMatch(fonte, /dadosDoApp|grupos-locais/)
  }
})
test("porta de grupos usa o cliente único e aceita cancelamento", () => {
  const fonte = ler("apps/app/lib/dados/grupos.ts")
  assert.match(fonte, /api\/cliente/)
  assert.match(fonte, /signal\?: AbortSignal/)
  assert.doesNotMatch(fonte, /dadosDoApp|fetch\(/)
})
