import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const read = (...segments) => readFileSync(join(root, ...segments), "utf8")

function arquivos(diretorio) {
  const caminho = join(root, diretorio)
  const encontrados = []
  for (const entrada of readdirSync(caminho)) {
    const filho = join(caminho, entrada)
    if (statSync(filho).isDirectory()) encontrados.push(...arquivos(join(diretorio, entrada)))
    else encontrados.push(filho)
  }
  return encontrados
}

function ler(caminhoAbsoluto) {
  return readFileSync(caminhoAbsoluto, "utf8")
}

// F05 / ADR-20261105: a jornada de eventos saiu da demonstração. Este teste é o
// que impede a volta silenciosa — uma tela que lê de `dadosDoApp` "funciona" em
// qualquer estado do banco, então voltar para ela não quebra teste nenhum.
test("Agenda e Evento não leem mais a demonstração", () => {
  for (const tela of ["Agenda.tsx", "Evento.tsx"]) {
    const fonte = read("apps", "app", "src", "telas", tela)
    assert.doesNotMatch(fonte, /dadosDoApp/, `${tela} ainda usa dadosDoApp`)
    assert.doesNotMatch(fonte, /from "@\/lib\/dados"/, `${tela} ainda importa a demonstração`)
    assert.match(
      fonte,
      /from "@\/lib\/dados\/eventos"/,
      `${tela} precisa ler pela porta da jornada (lib/dados/eventos)`,
    )
  }
})

test("a demonstração continua servindo as telas que ainda não foram ligadas", () => {
  const telas = arquivos("apps/app/src/telas")
  const aindaNaDemo = telas.filter((caminho) => ler(caminho).includes("dadosDoApp"))
  // F05 ligou duas telas; as outras continuam na demonstração de propósito.
  assert.ok(
    aindaNaDemo.length >= 10,
    `só ${aindaNaDemo.length} telas ainda leem a demonstração: a F05 não podia ter ligado as outras jornadas`,
  )
  for (const caminho of aindaNaDemo) {
    assert.ok(
      !caminho.endsWith("Agenda.tsx") && !caminho.endsWith("Evento.tsx"),
      `${caminho} voltou para a demonstração`,
    )
  }
})

test("as rotas de eventos usam a sessão sob RLS, nunca o cliente de serviço", () => {
  const rotas = arquivos("apps/web/app/api/app/eventos")
  assert.ok(rotas.length >= 4, `esperava as rotas da jornada, achei ${rotas.length} arquivos`)
  for (const caminho of rotas) {
    const fonte = ler(caminho)
    assert.doesNotMatch(
      fonte,
      /clienteDeServicoOuNulo|service_role/,
      `${caminho} usa privilégio onde a RLS da sessão basta`,
    )
    assert.match(fonte, /exigirSessao/, `${caminho} não resolve a sessão pelo encanamento do app`)
    assert.match(fonte, /opcoesDoApp/, `${caminho} não responde ao preflight do contrato`)
  }
})

test("toda escrita das rotas passa pela conferência de CSRF", () => {
  const rotas = arquivos("apps/web/app/api/app/eventos").filter((caminho) =>
    /export async function (POST|PUT|PATCH|DELETE)/.test(ler(caminho)),
  )
  assert.ok(rotas.length >= 4, `esperava as escritas da jornada, achei ${rotas.length} arquivos`)
  for (const caminho of rotas) {
    assert.match(ler(caminho), /conferirEscrita\(/, `${caminho} escreve sem conferir a porta`)
  }
})
