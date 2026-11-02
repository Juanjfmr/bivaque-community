import assert from "node:assert/strict"
import test from "node:test"
import {
  htmlDoPar,
  matrizDeCaptura,
  validarCobertura,
  validarDestino,
  validarResultadoE2e,
} from "../../scripts/app/contrato-captura.mjs"
import { linhasDoInventario } from "../../scripts/app/inventario.mjs"

test("a matriz cobre cada rota em 375/1440 e ambos os temas, sem duplicatas", () => {
  const matriz = matrizDeCaptura(["inicio", "grupo", "cidade"])
  assert.equal(matriz.length, 12)
  assert.equal(new Set(matriz.map((item) => item.id)).size, 12)
  for (const rota of ["inicio", "grupo", "cidade"]) {
    assert.deepEqual(
      matriz.filter((item) => item.rota === rota).map(({ largura, tema }) => [largura, tema]),
      [
        [375, "light"],
        [375, "dark"],
        [1440, "light"],
        [1440, "dark"],
      ],
    )
  }
})

test("o par mantém HTML à esquerda e app à direita com rótulos explícitos", () => {
  const html = htmlDoPar({ esquerda: "referencia.png", direita: "app.png", largura: 375 })
  assert(html.indexOf('src="referencia.png"') < html.indexOf('src="app.png"'))
  assert.match(html, /Protótipo HTML/)
  assert.match(html, /App novo/)
})

test("rota, título ou boot incorretos impedem captura válida", () => {
  const esperado = { caminho: "/app/grupo/g1", titulo: "Grupo" }
  validarDestino({ caminho: "/app/grupo/g1", titulo: "Grupo", pronto: true }, esperado)
  for (const atual of [
    { caminho: "/login", titulo: "Grupo", pronto: true },
    { caminho: "/app/grupo/g1", titulo: "Página indisponível", pronto: true },
    { caminho: "/app/grupo/g1", titulo: "Grupo", pronto: false },
  ])
    assert.throws(() => validarDestino(atual, esperado))
})

test("um endereço correto com conteúdo de outra tela não serve de captura", () => {
  const esperado = { caminho: "/app/anuncio/i1", titulo: "Sofá", tela: "anuncio" }
  validarDestino({ ...esperado, pronto: true }, esperado)
  assert.throws(() => validarDestino({ ...esperado, pronto: true, tela: "indisponivel" }, esperado))
})

test("a cobertura rejeita falta, duplicata e pronto sem arquivo, teste ou prova", () => {
  const completo = {
    id: "casca",
    estado: "implementado",
    arquivos: ["casca.tsx"],
    testes: ["casca.spec.ts"],
    provas: ["gate.log"],
  }
  const existe = () => true
  assert.deepEqual(validarCobertura([completo], ["casca"], existe), [])
  assert(validarCobertura([], ["casca"], existe).length)
  assert(validarCobertura([completo, completo], ["casca"], existe).length)
  for (const campo of ["arquivos", "testes", "provas"]) {
    assert(validarCobertura([{ ...completo, [campo]: [] }], ["casca"], existe).length)
  }
  assert(validarCobertura([completo], ["casca"], () => false).length)
  assert(validarCobertura([{ ...completo, arquivos: [""] }], ["casca"], existe).length)
  assert.deepEqual(
    validarCobertura(
      [{ id: "onda-2", estado: "pendente", motivo: "Jornada futura" }],
      ["onda-2"],
      existe,
    ),
    [],
  )
})

test("a régua vem das tabelas da referência, com IDs estáveis e origem por linha", () => {
  const fonte =
    "## 6. Movimento\n### Tabela\n| # | Movimento |\n|---|---|\n| 1 | Abrir |\n| 2 | Voltar |\n\n## 7. Componentes\n| Componente | Arquivo |\n|---|---|\n| `campo` | input.tsx |\n"
  const itens = linhasDoInventario(fonte)
  assert.equal(itens.length, 3)
  assert.deepEqual(
    itens.map((i) => [i.secao, i.rotulo, i.linha]),
    [
      [6, "1", 5],
      [6, "2", 6],
      [7, "`campo`", 11],
    ],
  )
  assert.deepEqual(
    linhasDoInventario(`\n${fonte}`).map((i) => i.id),
    itens.map((i) => i.id),
  )
  assert.notDeepEqual(
    linhasDoInventario(fonte.replace("`campo`", "`outro`")).map((i) => i.id),
    itens.map((i) => i.id),
  )
  assert.equal(linhasDoInventario("## 11. Resumo\n| X | Y |\n|---|---|\n| a | b |\n").length, 0)
})

test("log existente ou relato do app não substitui a bateria externa completa", () => {
  validarResultadoE2e("\n  480 passed (3m)\n  12 skipped\n", 480)
  for (const texto of [
    "app informa: 480 passed",
    "",
    "  477 passed\n  3 failed",
    "  479 passed",
    "  480 passed\n  1 flaky",
    "  480 passed\n  1 interrupted",
  ])
    assert.throws(() => validarResultadoE2e(texto, 480))
})
