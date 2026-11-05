import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// RUN-004: o caminho real da entrada não pode importar o servidor simulado da
// prévia. O build de produção não inclui `src/previa-f01/servidor-simulado` pelo
// shell da prévia, mas as etapas compartilhadas falavam com ele — o que levava
// Manaus com membros, perguntas e encontro inventados para a tela real.

const root = join(import.meta.dirname, "../..")
const read = (path) => readFileSync(join(root, path), "utf8")

const ETAPAS_COMPARTILHADAS = [
  "apps/app/src/previa-f01/etapas-conta.tsx",
  "apps/app/src/previa-f01/etapas-comunidade.tsx",
  "apps/app/src/previa-f01/telas.ts",
  "apps/app/src/previa-f01/fluxo.ts",
  "apps/app/src/previa-f01/moldura.tsx",
  "apps/app/src/previa-f01/entrada-dados.ts",
]

function arquivosDeEntrada() {
  const diretorio = join(root, "apps/app/src/entrada")
  return readdirSync(diretorio, { recursive: true, withFileTypes: true })
    .filter((entrada) => entrada.isFile() && /\.(ts|tsx)$/.test(entrada.name))
    .map((entrada) => {
      const pai = entrada.parentPath ?? entrada.path
      return join(pai, entrada.name)
        .slice(root.length + 1)
        .replaceAll("\\", "/")
    })
}

test("o caminho real da entrada não importa o servidor simulado", () => {
  const arquivos = [...arquivosDeEntrada(), ...ETAPAS_COMPARTILHADAS]
  assert.ok(arquivos.length >= 10, "a varredura precisa cobrir a entrada e as etapas")
  for (const arquivo of arquivos) {
    assert.doesNotMatch(
      read(arquivo),
      /servidor-simulado/,
      `${arquivo} importa o servidor simulado; o caminho real precisa de dado do servidor ou estado neutro`,
    )
  }
})

test("o passo que a tela real usa não tem texto inventado de Manaus", () => {
  const etapas = read("apps/app/src/previa-f01/etapas-comunidade.tsx")
  assert.doesNotMatch(etapas, /Pediatra que atende pelo FUSEx/)
  assert.doesNotMatch(etapas, /Café de boas-vindas/)
})
