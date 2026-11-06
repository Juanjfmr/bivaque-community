import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

for (const tela of ["Inicio", "Busca"]) {
  test(`${tela} não usa dados de demonstração`, () => {
    const codigo = readFileSync(`apps/app/src/telas/${tela}.tsx`, "utf8")
    assert.doesNotMatch(codigo, /\bdadosDoApp\b/)
  })
}

for (const rota of ["inicio", "busca"]) {
  test(`rota ${rota} não usa cliente de serviço`, () => {
    const codigo = readFileSync(`apps/web/app/api/app/${rota}/route.ts`, "utf8")
    assert.doesNotMatch(codigo, /\bclienteDeServicoOuNulo\b/)
  })
}
