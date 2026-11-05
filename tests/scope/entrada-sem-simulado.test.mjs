import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import test from "node:test"

// RUN-004: o caminho real da entrada não pode importar o servidor simulado da
// prévia. A varredura é transitiva a partir de TelaDeEntrada.tsx: lista fixa
// envelhece quando uma etapa nova entra no caminho.

const root = join(import.meta.dirname, "../..")
const APP = join(root, "apps/app")
const ENTRADA = join(APP, "src/entrada/TelaDeEntrada.tsx")
const EXTENSOES = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"]

const read = (path) => readFileSync(path, "utf8")

function resolver(specifier, de) {
  let base
  if (specifier.startsWith("@/")) base = join(APP, specifier.slice(2))
  else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = resolve(dirname(de), specifier)
  } else return null
  for (const extensao of EXTENSOES) {
    const candidato = `${base}${extensao}`
    if (existsSync(candidato) && !candidato.endsWith(".css")) return candidato
  }
  return null
}

function importacoes(texto) {
  const achados = []
  const padrao = /(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g
  for (const achado of texto.matchAll(padrao)) {
    achados.push(achado[1] ?? achado[2])
  }
  return achados
}

function caminhoReal() {
  const vistos = new Set()
  const fila = [ENTRADA]
  while (fila.length > 0) {
    const atual = fila.pop()
    if (vistos.has(atual)) continue
    vistos.add(atual)
    for (const specifier of importacoes(read(atual))) {
      const alvo = resolver(specifier, atual)
      if (alvo !== null) fila.push(alvo)
    }
  }
  return vistos
}

test("o caminho real da entrada não importa o servidor simulado", () => {
  const arquivos = caminhoReal()
  const relativos = [...arquivos].map((arquivo) =>
    arquivo.slice(root.length + 1).replaceAll("\\", "/"),
  )

  // Sanidade: a varredura chegou às etapas compartilhadas, não parou na porta.
  assert.ok(relativos.length >= 20, `a varredura cobriu ${relativos.length} arquivos`)
  for (const esperado of [
    "apps/app/src/previa-f01/telas.ts",
    "apps/app/src/previa-f01/etapas-conta.tsx",
    "apps/app/src/previa-f01/etapas-comunidade.tsx",
    "apps/app/src/previa-f01/fluxo.ts",
    "apps/app/src/previa-f01/entrada-dados.ts",
  ]) {
    assert.ok(relativos.includes(esperado), `${esperado} ficou fora da varredura`)
  }

  for (const arquivo of relativos) {
    assert.doesNotMatch(
      read(join(root, arquivo)),
      /servidor-simulado/,
      `${arquivo} importa o servidor simulado; o caminho real precisa de dado do servidor ou estado neutro`,
    )
  }
})

test("o passo que a tela real usa não tem texto inventado de Manaus", () => {
  const etapas = read(join(APP, "src/previa-f01/etapas-comunidade.tsx"))
  assert.doesNotMatch(etapas, /Pediatra que atende pelo FUSEx/)
  assert.doesNotMatch(etapas, /Café de boas-vindas/)
})
