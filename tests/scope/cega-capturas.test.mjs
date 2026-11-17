import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { arquivoDaCaptura, ROTEIRO } from "../e2e/cega-capturas-roteiro.ts"

// DS-022: o parecer cego precisa de uma imagem por tela e por largura nas sete
// jornadas do lançamento. Estes testes falham em milissegundos quando o roteiro
// perde uma jornada, repete um nome de arquivo ou deixa uma tela sem a prova de
// que ela carregou com dado real.

const JORNADAS = ["f02", "f03", "f06", "f07", "f08", "f09", "f10"]

test("o roteiro cobre as sete jornadas do lançamento", () => {
  assert.deepEqual(
    ROTEIRO.map((jornada) => jornada.jornada),
    JORNADAS,
  )
  for (const jornada of ROTEIRO) {
    assert.ok(jornada.telas.length > 0, `${jornada.jornada} sem telas`)
    assert.ok(jornada.titulo.trim().length > 0, `${jornada.jornada} sem título`)
  }
})

test("os nomes de arquivo são únicos", () => {
  const vistos = new Set()
  for (const jornada of ROTEIRO) {
    for (const tela of jornada.telas) {
      const chave = `${jornada.jornada}/${tela.id}`
      assert.equal(vistos.has(chave), false, `nome de arquivo repetido: ${chave}`)
      vistos.add(chave)
    }
  }
})

test("cada tela tem seletor de prova, rota e persona do seed", () => {
  for (const jornada of ROTEIRO) {
    for (const tela of jornada.telas) {
      const nome = `${jornada.jornada}/${tela.id}`
      assert.ok(tela.seletor.trim().length > 0, `${nome} sem seletor de prova`)
      assert.match(tela.rota, /^\//, `${nome} sem rota`)
      assert.match(tela.persona, /@bivaque\.example\.invalid$/, `${nome} sem persona do seed`)
      for (const passo of tela.passos ?? []) {
        assert.ok(passo.alvo.trim().length > 0, `${nome} com passo sem alvo`)
        if (passo.tipo === "preenchimento") {
          assert.ok((passo.valor ?? "").length > 0, `${nome} preenche campo vazio`)
        }
      }
    }
  }
})

test("a captura vai para .visual/cega/<jornada>/<tela>-<largura>-claro.png", () => {
  assert.equal(arquivoDaCaptura("f02", "inicio", 375), ".visual/cega/f02/inicio-375-claro.png")
})

test("as capturas fixam a localidade e mostram os estados preenchidos", () => {
  const inicio = ROTEIRO.find((jornada) => jornada.jornada === "f02")?.telas.find(
    (tela) => tela.id === "inicio",
  )
  const conversa = ROTEIRO.find((jornada) => jornada.jornada === "f09")?.telas.find(
    (tela) => tela.id === "conversa",
  )
  const spec = readFileSync(new URL("../e2e/cega-capturas.spec.ts", import.meta.url), "utf8")
  assert.ok((inicio?.seletor ?? "").includes('data-cartao="publicacao"'))
  assert.match(spec, /locale: "pt-BR", timezoneId: "America\/Manaus"/)
  assert.match(spec, /reducedMotion: "reduce"/)
  assert.match(spec, /#mensagem-da-conversa.*fill/)
  assert.equal(conversa?.id, "conversa")
})
