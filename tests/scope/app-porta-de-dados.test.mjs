import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

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

const ler = (caminhoAbsoluto) => readFileSync(caminhoAbsoluto, "utf8")
const read = (...segmentos) => readFileSync(join(root, ...segmentos), "utf8")
const relativo = (caminhoAbsoluto) => caminhoAbsoluto.slice(root.length + 1).replaceAll("\\", "/")

// F05 / ADR-20261105: a jornada de eventos saiu da demonstração. Estes testes são
// o molde que as próximas oito jornadas copiam — o que eles travam não é a F05,
// é o formato da porta.

/**
 * As telas que JÁ foram ligadas ao banco, com a porta da jornada de cada uma.
 * A lista é explícita de propósito.
 */
const TELAS_LIGADAS = [
  { tela: "apps/app/src/telas/Agenda.tsx", porta: /from "@\/lib\/dados\/eventos"/ },
  { tela: "apps/app/src/telas/Evento.tsx", porta: /from "@\/lib\/dados\/eventos"/ },
  { tela: "apps/app/src/telas/Mercado.tsx", porta: /from "@\/lib\/dados\/mercado"/ },
  { tela: "apps/app/src/telas/Anuncio.tsx", porta: /from "@\/lib\/dados\/mercado"/ },
]

test("as telas ligadas leem pela porta da jornada, nunca pela demonstração", () => {
  for (const { tela, porta } of TELAS_LIGADAS) {
    const fonte = read(...tela.split("/"))
    assert.doesNotMatch(fonte, /dadosDoApp/, `${tela} ainda usa dadosDoApp`)
    assert.doesNotMatch(fonte, /from "@\/lib\/dados"$/m, `${tela} ainda importa a demonstração`)
    assert.match(fonte, porta, `${tela} não lê pela porta da jornada`)
  }
})

test("a demonstração continua servindo as telas que ainda não foram ligadas", () => {
  const telas = arquivos("apps/app/src/telas")
  const ligadas = new Set(TELAS_LIGADAS.map(({ tela }) => join(root, ...tela.split("/"))))
  const portas = TELAS_LIGADAS.map(({ porta }) => porta)
  for (const caminho of telas) {
    if (ligadas.has(caminho)) continue
    for (const porta of portas) {
      assert.doesNotMatch(
        ler(caminho),
        porta,
        `${relativo(caminho)} passou a ler uma jornada ligada sem estar na lista das ligadas`,
      )
    }
  }
  // A demonstração continua existindo e servindo o resto.
  assert.ok(
    telas.some((caminho) => ler(caminho).includes("dadosDoApp")),
    "nenhuma tela lê a demonstração: a galeria e as outras jornadas quebraram",
  )
})

test("os módulos de dados não conhecem a demonstração", () => {
  const jornadas = arquivos("apps/app/lib/dados").filter((caminho) => !caminho.endsWith("index.ts"))
  assert.ok(jornadas.length >= 1, "nenhum módulo de jornada em lib/dados")
  for (const caminho of jornadas) {
    assert.doesNotMatch(
      ler(caminho),
      /dadosDoApp|lib\/demo|demo\//,
      `${relativo(caminho)} volta à demonstração`,
    )
  }
})

test("só o cliente único chama /api/app", () => {
  // A entrada tem o cliente próprio dela, que migra para o único depois do #128
  // (pendência registrada no ADR). É a ÚNICA exceção aceita: se aparecer outra,
  // o molde já nasceu com duas portas.
  const EXCECOES = new Set(["apps/app/src/entrada/servidor.ts"])
  const infratores = arquivos("apps/app")
    .filter(
      (caminho) =>
        !caminho.includes("tests") &&
        !caminho.includes("node_modules") &&
        !caminho.includes("dist"),
    )
    .filter((caminho) => relativo(caminho) !== "apps/app/lib/api/cliente.ts")
    .filter((caminho) => !EXCECOES.has(relativo(caminho)))
    .filter((caminho) => /fetch\(/.test(ler(caminho)) && /\/api\/app/.test(ler(caminho)))
  assert.deepEqual(infratores.map(relativo), [], "chamada direta a /api/app fora do cliente")
})

test("as rotas de eventos usam a sessão sob RLS, nunca o cliente de serviço", () => {
  const rotas = arquivos("apps/web/app/api/app/eventos").filter((caminho) =>
    caminho.endsWith("route.ts"),
  )
  assert.ok(rotas.length >= 4, `esperava as rotas da jornada, achei ${rotas.length}`)
  for (const caminho of rotas) {
    const fonte = ler(caminho)
    assert.doesNotMatch(
      fonte,
      /clienteDeServicoOuNulo|service_role/,
      `${relativo(caminho)} usa privilégio onde a RLS da sessão basta`,
    )
    assert.match(
      fonte,
      /exigirSessao/,
      `${relativo(caminho)} não resolve a sessão pelo encanamento`,
    )
    assert.match(fonte, /opcoesDoApp/, `${relativo(caminho)} não responde ao preflight do contrato`)
  }
})

test("toda escrita das rotas passa pela conferência de CSRF", () => {
  const escritas = arquivos("apps/web/app/api/app/eventos").filter((caminho) =>
    /export async function (POST|PUT|PATCH|DELETE)/.test(ler(caminho)),
  )
  assert.ok(escritas.length >= 4, `esperava as escritas da jornada, achei ${escritas.length}`)
  for (const caminho of escritas) {
    assert.match(
      ler(caminho),
      /conferirEscrita\(/,
      `${relativo(caminho)} escreve sem conferir a porta`,
    )
  }
})

test("a cidade da sessão é lida no vínculo current, num lugar só", () => {
  const comum = read("apps", "web", "app", "api", "app", "eventos", "_comum.ts")
  assert.match(comum, /eq\("kind", "current"\)/)
  for (const caminho of arquivos("apps/web/app/api/app/eventos").filter((c) =>
    c.endsWith("route.ts"),
  )) {
    assert.doesNotMatch(
      ler(caminho),
      /from\("locality_memberships"\)/,
      `${relativo(caminho)} lê a cidade por conta própria em vez de _comum.ts`,
    )
  }
})

test("o detalhe não devolve caminho cru de mídia", () => {
  const rota = read(...["apps", "web", "app", "api", "app", "eventos", "[id]", "route.ts"])
  assert.doesNotMatch(rota, /cover_path/, "o detalhe projeta o caminho do bucket na resposta")
  assert.doesNotMatch(rota, /capa:/, "o detalhe devolve capa crua")
})

test("as rotas de eventos têm a função única de UUID", () => {
  for (const caminho of arquivos("apps/web/app/api/app/eventos").filter((c) =>
    c.endsWith("route.ts"),
  )) {
    const fonte = ler(caminho)
    assert.doesNotMatch(
      fonte,
      /const UUID =/,
      `${relativo(caminho)} redefine o regex de UUID em vez de usar _comum.ts`,
    )
  }
})

// ── F06 (mercado): mesmo molde da porta ─────────────────────────────────────

test("as rotas do mercado usam a sessão sob RLS, nunca o cliente de serviço", () => {
  const rotas = arquivos("apps/web/app/api/app/mercado").filter((caminho) =>
    caminho.endsWith("route.ts"),
  )
  assert.ok(rotas.length === 3, `esperava as 3 rotas da jornada, achei ${rotas.length}`)
  for (const caminho of rotas) {
    const fonte = ler(caminho)
    assert.doesNotMatch(
      fonte,
      /clienteDeServicoOuNulo|service_role/,
      `${relativo(caminho)} usa privilégio onde a RLS da sessão basta`,
    )
    assert.match(
      fonte,
      /exigirSessao/,
      `${relativo(caminho)} não resolve a sessão pelo encanamento`,
    )
    assert.match(fonte, /opcoesDoApp/, `${relativo(caminho)} não responde ao preflight do contrato`)
  }
})

test("toda escrita das rotas do mercado passa pela conferência de CSRF", () => {
  const escritas = arquivos("apps/web/app/api/app/mercado").filter((caminho) =>
    /export async function (POST|PUT|PATCH|DELETE)/.test(ler(caminho)),
  )
  assert.ok(escritas.length >= 1, `esperava a escrita da jornada, achei ${escritas.length}`)
  for (const caminho of escritas) {
    assert.match(
      ler(caminho),
      /conferirEscrita\(/,
      `${relativo(caminho)} escreve sem conferir a porta`,
    )
  }
})

test("a cidade da sessão do mercado é lida no vínculo current, num lugar só", () => {
  const comum = read("apps", "web", "app", "api", "app", "mercado", "_comum.ts")
  assert.match(comum, /eq\("kind", "current"\)/)
  for (const caminho of arquivos("apps/web/app/api/app/mercado").filter((c) =>
    c.endsWith("route.ts"),
  )) {
    assert.doesNotMatch(
      ler(caminho),
      /from\("locality_memberships"\)/,
      `${relativo(caminho)} lê a cidade por conta própria em vez de _comum.ts`,
    )
  }
})

test("as rotas do mercado têm a função única de UUID", () => {
  for (const caminho of arquivos("apps/web/app/api/app/mercado").filter((c) =>
    c.endsWith("route.ts"),
  )) {
    const fonte = ler(caminho)
    assert.doesNotMatch(
      fonte,
      /const UUID =/,
      `${relativo(caminho)} redefine o regex de UUID em vez de usar _comum.ts`,
    )
  }
})

// F08 / RUN-009: o guia copiou o molde do F05 — e a cópia precisa manter as
// mesmas garantias, não só os mesmos nomes.

const TELAS_DO_GUIA = ["apps/app/src/telas/Guia.tsx", "apps/app/src/guia/Verbete.tsx"]

test("as telas do guia leem pela porta da jornada, nunca pela demonstração", () => {
  for (const tela of TELAS_DO_GUIA) {
    const fonte = read(...tela.split("/"))
    assert.doesNotMatch(fonte, /dadosDoApp/, `${tela} ainda usa dadosDoApp`)
    assert.doesNotMatch(fonte, /from "@\/lib\/dados"$/m, `${tela} ainda importa a demonstração`)
    assert.match(fonte, /from "@\/lib\/dados\/guia"/, `${tela} não lê pela porta do guia`)
  }
})

test("as rotas do guia usam a sessão sob RLS, nunca o cliente de serviço", () => {
  const rotas = arquivos("apps/web/app/api/app/guia").filter((caminho) =>
    caminho.endsWith("route.ts"),
  )
  assert.ok(rotas.length >= 4, `esperava as rotas do guia, achei ${rotas.length}`)
  for (const caminho of rotas) {
    const fonte = ler(caminho)
    assert.doesNotMatch(
      fonte,
      /clienteDeServicoOuNulo|service_role/,
      `${relativo(caminho)} usa privilégio onde a RLS da sessão basta`,
    )
    assert.match(
      fonte,
      /exigirSessao/,
      `${relativo(caminho)} não resolve a sessão pelo encanamento`,
    )
    assert.match(fonte, /opcoesDoApp/, `${relativo(caminho)} não responde ao preflight do contrato`)
  }
})

test("toda escrita das rotas do guia passa pela conferência de CSRF", () => {
  const escritas = arquivos("apps/web/app/api/app/guia").filter((caminho) =>
    /export async function (POST|PUT|PATCH|DELETE)/.test(ler(caminho)),
  )
  assert.ok(escritas.length >= 2, `esperava as escritas do guia, achei ${escritas.length}`)
  for (const caminho of escritas) {
    assert.match(
      ler(caminho),
      /conferirEscrita\(/,
      `${relativo(caminho)} escreve sem conferir a porta`,
    )
  }
})

test("as rotas do guia reusam a cidade e o id do encanamento do F05", () => {
  for (const caminho of arquivos("apps/web/app/api/app/guia").filter((c) =>
    c.endsWith("route.ts"),
  )) {
    const fonte = ler(caminho)
    assert.doesNotMatch(
      fonte,
      /from\("locality_memberships"\)/,
      `${relativo(caminho)} lê a cidade por conta própria em vez de _comum.ts`,
    )
    assert.doesNotMatch(
      fonte,
      /const UUID =/,
      `${relativo(caminho)} redefine o regex de UUID em vez de usar _comum.ts`,
    )
  }
})
