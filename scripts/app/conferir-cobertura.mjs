import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { validarCobertura, validarResultadoE2e } from "./contrato-captura.mjs"
import { linhasDoInventario } from "./inventario.mjs"

const raiz = resolve(import.meta.dirname, "../..")
const ler = (p) => readFileSync(resolve(raiz, p), "utf8")
const inventario = ler("docs/agents/prototipo-shadcn/inventario.md")
const cobertura = JSON.parse(ler("docs/agents/prototipo-shadcn/cobertura.json"))
assert.equal(
  cobertura.inventarioSha256,
  createHash("sha256").update(inventario).digest("hex"),
  "Inventário mudou: reconciliar cobertura antes de medir",
)
const origem = linhasDoInventario(inventario)
const erros = validarCobertura(
  cobertura.itens,
  origem.map((i) => i.id),
  (p) => existsSync(resolve(raiz, p)) && statSync(resolve(raiz, p)).isFile(),
)
for (const item of cobertura.itens) {
  const esperado = origem.find((i) => i.id === item.id)
  if (
    esperado &&
    (item.origem !== `inventario.md:${esperado.linha}` || item.rotulo !== esperado.rotulo)
  )
    erros.push(`Origem divergente: ${item.id}`)
  if (!item.onda) erros.push(`Onda ausente: ${item.id}`)
}
assert.deepEqual(erros, [], "Cobertura inconsistente")
validarResultadoE2e(ler(".visual/coordenacao/APP-CODEX-final-e2e.log"), 509)
assert.match(
  ler(".visual/coordenacao/APP-CODEX-final-gate.log"),
  /^GATE VERDE\.$/m,
  "Gate completo não passou",
)
const porOnda = {}
for (const item of cobertura.itens) {
  porOnda[item.onda] ??= { implementados: 0, dispensados: 0, pendentes: [] }
  const grupo = porOnda[item.onda]
  if (item.estado === "implementado") grupo.implementados++
  else if (item.estado === "dispensado") grupo.dispensados++
  else
    grupo.pendentes.push({
      id: item.id,
      origem: item.origem,
      rotulo: item.rotulo,
      motivo: item.motivo,
    })
}
console.log(JSON.stringify({ entradas: origem.length, porOnda }, null, 2))
console.log(
  "Conferência estrutural PASS; existência de arquivos não aprova comportamento ou jornada.",
)
