import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// A suíte do apps/app já teve 15 casos vermelhos que ninguém via porque o job do
// CI rodava uma lista fixa de specs. Este teste trava o contrato pelo lado que
// não se esquece: o CI chama o script do pacote, e o script roda o config
// inteiro — sem lista de specs e sem recorte de tamanho. Spec nova entra na
// cobertura sem editar o workflow.
const root = join(import.meta.dirname, "../..")
const read = (caminho) => readFileSync(join(root, caminho), "utf8")

const passos = read(".github/workflows/bivaque-app-visual-smoke.yml")
  .split("\n")
  .map((linha) => linha.trim())
  .filter((linha) => linha.includes("test:e2e"))

test("o CI do app roda a suíte inteira, nos seis tamanhos", () => {
  assert.ok(passos.length > 0, "nenhum passo do CI roda a suíte do app")
  const inteira = passos.filter(
    (linha) => !linha.includes("tests/e2e/") && !linha.includes("--project"),
  )
  assert.ok(inteira.length > 0, `o job recorta a suíte: ${passos.join(" | ")}`)

  const script = JSON.parse(read("apps/app/package.json")).scripts["test:e2e"]
  assert.match(script, /playwright test --config playwright\.config\.ts$/)
})
