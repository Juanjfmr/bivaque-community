import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const raiz = join(import.meta.dirname, "../..")
const ler = (caminho) => readFileSync(join(raiz, caminho), "utf8")

function arquivos(diretorio) {
  const caminho = join(raiz, diretorio)
  const encontrados = []
  for (const entrada of readdirSync(caminho)) {
    const filho = join(caminho, entrada)
    if (statSync(filho).isDirectory()) encontrados.push(...arquivos(join(diretorio, entrada)))
    else encontrados.push(filho)
  }
  return encontrados
}

// F04 / ADR-20261105: as perguntas da cidade saíram da demonstração. O que
// estes testes travam não é a tela, é o formato da porta que o F05 inaugurou.

test("Comunidade e Pergunta leem pela porta real, nunca pela demonstração", () => {
  for (const tela of ["apps/app/src/telas/Comunidade.tsx", "apps/app/src/telas/Pergunta.tsx"]) {
    const fonte = ler(tela)
    assert.doesNotMatch(fonte, /dadosDoApp/, `${tela} ainda usa dadosDoApp`)
    assert.doesNotMatch(fonte, /from "@\/lib\/dados"$/m, `${tela} ainda importa a demonstração`)
    assert.match(fonte, /@\/lib\/dados\/perguntas/, `${tela} não lê pela porta da jornada`)
  }
  // As outras jornadas continuam na demonstração: a porta não é big bang.
  assert.match(ler("apps/app/src/telas/Inicio.tsx"), /dadosDoApp/)
})

test("as rotas de perguntas usam a sessão sob RLS, nunca o cliente de serviço", () => {
  const rotas = arquivos("apps/web/app/api/app/perguntas").filter((caminho) =>
    caminho.endsWith("route.ts"),
  )
  assert.equal(rotas.length, 3, `esperava as três rotas da jornada, achei ${rotas.length}`)
  for (const caminho of rotas) {
    const fonte = readFileSync(caminho, "utf8")
    assert.match(fonte, /exigirSessao/, `${caminho} não resolve a sessão pelo encanamento`)
    assert.match(fonte, /opcoesDoApp/, `${caminho} não responde ao preflight do contrato`)
    assert.doesNotMatch(
      fonte,
      /clienteDeServicoOuNulo|service_role/,
      `${caminho} usa privilégio onde a RLS da sessão basta`,
    )
  }
})

test("a escrita passa pelo CSRF e grava a autoria da sessão", () => {
  const fonte = ler("apps/web/app/api/app/perguntas/[id]/respostas/route.ts")
  assert.match(fonte, /conferirEscrita\(/)
  // Autoria e pergunta vêm da sessão e do caminho, nunca do corpo.
  assert.match(fonte, /author_id: userId/)
  assert.doesNotMatch(fonte, /corpo\["author_id"\]|corpo\.author_id/)
  // A régua do texto é a mesma que o banco e a web antiga usam.
  assert.match(fonte, /lib\/recommendations\/reply/)
})

test("a cidade da sessão é lida no vínculo current, num lugar só", () => {
  for (const caminho of arquivos("apps/web/app/api/app/perguntas").filter((c) =>
    c.endsWith("route.ts"),
  )) {
    assert.doesNotMatch(
      readFileSync(caminho, "utf8"),
      /from\("locality_memberships"\)/,
      `${caminho} lê a cidade por conta própria em vez do módulo comum`,
    )
  }
})
