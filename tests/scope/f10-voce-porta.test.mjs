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

const ROTAS = "apps/web/app/api/app/voce"
const PORTA = /from "@\/lib\/dados\/voce"/

// RUN-016 / F10: a área "Você" saiu da demonstração. Estes testes travam o que
// o ADR-20261105 chama de porta: a tela lê por um módulo da jornada, e a rota
// resolve o dono pela sessão — nunca por um cliente de privilégio.

const TELAS_DA_JORNADA = [
  "apps/app/src/telas/Voce.tsx",
  "apps/app/src/telas/Minhas.tsx",
  "apps/app/src/telas/Bloqueados.tsx",
  "apps/app/src/telas/Ocultados.tsx",
  "apps/app/src/telas/ApagarConta.tsx",
  ...arquivos("apps/app/src/voce").map(relativo),
]

test("as telas da jornada leem pela porta, nunca pela demonstração", () => {
  for (const tela of TELAS_DA_JORNADA) {
    const fonte = read(...tela.split("/"))
    assert.doesNotMatch(fonte, /dadosDoApp/, `${tela} ainda usa dadosDoApp`)
    assert.doesNotMatch(fonte, /from "@\/lib\/dados"$/m, `${tela} ainda importa a demonstração`)
    assert.match(fonte, PORTA, `${tela} não lê pela porta da jornada`)
  }
})

test("o módulo da porta não conhece a demonstração nem fala HTTP por conta própria", () => {
  const fonte = read("apps", "app", "lib", "dados", "voce.ts")
  assert.doesNotMatch(
    fonte,
    /dadosDoApp|lib\/demo|demo\//,
    "lib/dados/voce.ts volta à demonstração",
  )
  assert.doesNotMatch(fonte, /fetch\(/, "lib/dados/voce.ts fura o cliente único")
  assert.match(fonte, /from "\.\.\/api\/cliente"/, "lib/dados/voce.ts não usa o cliente único")
})

test("as rotas da jornada usam a sessão sob RLS, nunca o cliente de serviço", () => {
  // Duas exceções medidas, cada uma com teste próprio logo abaixo: a família
  // (RUN-018), cujos wrappers públicos de convite só têm execute para
  // service_role, e a localização (RUN-029), que precisa do cache de CEP e da
  // função set_member_location — único caminho de escrita da coordenada.
  const rotas = arquivos(ROTAS)
    .filter((caminho) => caminho.endsWith("route.ts"))
    .filter((caminho) => !relativo(caminho).includes("/familia/"))
    .filter((caminho) => !relativo(caminho).includes("/localizacao/"))
  assert.ok(rotas.length >= 6, `esperava as rotas da jornada, achei ${rotas.length}`)
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
    assert.doesNotMatch(
      fonte,
      /searchParams\.get\("(user_id|usuario|userId|dono)"\)|corpo\[(?:"|')(user_id|userId|usuario)/,
      `${relativo(caminho)} aceita o dono vindo do pedido`,
    )
  }
})

test("a família usa o privilégio só depois da sessão e só nos wrappers de convite", () => {
  const rotas = arquivos(join(ROTAS, "familia")).filter((caminho) => caminho.endsWith("route.ts"))
  assert.ok(rotas.length >= 2, `esperava as rotas de família, achei ${rotas.length}`)
  const doModulo = /lerFamilia|enviarConvite|revogarConvite/
  for (const caminho of rotas) {
    const fonte = ler(caminho)
    const sessao = fonte.indexOf("exigirSessao(")
    const privilegio = fonte.indexOf("clienteDeServicoOuNulo(")
    assert.ok(sessao >= 0, `${relativo(caminho)} não resolve a sessão pelo encanamento`)
    assert.ok(privilegio > sessao, `${relativo(caminho)} abre o privilégio antes da sessão`)
    assert.match(fonte, doModulo, `${relativo(caminho)} usa o privilégio fora dos wrappers`)
    assert.match(fonte, /opcoesDoApp/, `${relativo(caminho)} não responde ao preflight do contrato`)
    assert.doesNotMatch(
      fonte,
      /corpo\[(?:"|')((user_id|userId|usuario))(?:"|')\]|searchParams\.get\("(user_id|userId|usuario)"\)/,
      `${relativo(caminho)} aceita o dono vindo do pedido`,
    )
  }
})

test("a localização usa o privilégio só para o cache e a escrita medida", () => {
  // RUN-029 / ADR-20261022-localizacao §4: a coordenada nunca volta ao cliente,
  // o dono é sempre a sessão e o privilégio abre depois dela, só para
  // public.cep_geocodes e a RPC set_member_location.
  const rota = read(...ROTAS.split("/"), "localizacao", "route.ts")
  const sessao = rota.indexOf("exigirSessao(")
  const privilegio = rota.indexOf("clienteDeServicoOuNulo(")
  assert.ok(sessao >= 0, "a rota de localização não resolve a sessão")
  assert.ok(privilegio > sessao, "a rota de localização abre o privilégio antes da sessão")
  assert.match(rota, /set_member_location/, "a rota não grava pela função de serviço")
  assert.match(rota, /lib\/geo\/cache/, "a rota não usa o cache de CEP (public.cep_geocodes)")
  assert.doesNotMatch(
    rota,
    /from\("profiles"\)/,
    "a rota de localização lê ou escreve profiles pelo cliente de serviço",
  )
  assert.match(rota, /Object\.hasOwn\(lido\.corpo, "cep"\)/, "a rota aceita campos além de cep")
  assert.doesNotMatch(
    rota,
    /searchParams\.get\("(user_id|usuario|userId|dono)"\)|corpo\[(?:"|')(user_id|userId|usuario)(?:"|')\]/,
    "a rota de localização aceita o dono vindo do pedido",
  )
  assert.match(
    rota,
    /responder\(request, \{ localizacao \}, 200\)/,
    "a resposta de sucesso não é só a localização lida pela RPC",
  )

  // O cache é o único lugar do privilégio que toca tabela, e só cep_geocodes.
  const cache = read("apps", "web", "lib", "geo", "cache.ts")
  assert.match(cache, /from\("cep_geocodes"\)/, "o cache não fala com public.cep_geocodes")
  assert.doesNotMatch(cache, /from\("(?!cep_geocodes")/, "o cache de CEP toca outra tabela")

  // O geocodificador é server-only, sem log e sem chave pública.
  const geocodificador = read("apps", "web", "lib", "geo", "geocodificador.ts")
  assert.match(geocodificador, /import "server-only"/, "o geocodificador não é server-only")
  assert.doesNotMatch(geocodificador, /console\./, "o geocodificador imprime CEP ou coordenada")
  assert.doesNotMatch(
    geocodificador,
    /NEXT_PUBLIC_/,
    "o geocodificador lê chave pública em vez da server-side",
  )

  const exemplo = read("apps", "web", ".env.example")
  assert.match(exemplo, /^GOOGLE_MAPS_API_KEY=/m, "a reserva do Google não está documentada")
  assert.doesNotMatch(
    exemplo,
    /NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/,
    "a chave do Google foi exposta ao cliente",
  )
})

test("a extração do módulo de família mantém a tela antiga funcionando", () => {
  const acao = read("apps", "web", "app", "(shell)", "profile", "family-invite-section-actions.ts")
  assert.match(
    acao,
    /from "\.\.\/\.\.\/\.\.\/lib\/convite\/familia"/,
    "a Server Action antiga não importa o módulo compartilhado",
  )
  for (const funcao of ["lerFamilia", "enviarConvite", "revogarConvite"]) {
    assert.match(acao, new RegExp(funcao), `a Server Action antiga não usa ${funcao}`)
  }
})

test("toda escrita da jornada passa pela conferência de CSRF", () => {
  const escritas = arquivos(ROTAS).filter((caminho) =>
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

test("as rotas da jornada reaproveitam o encanamento em vez de redefinir a regra", () => {
  for (const caminho of arquivos(ROTAS).filter((item) => item.endsWith("route.ts"))) {
    const fonte = ler(caminho)
    assert.doesNotMatch(
      fonte,
      /const UUID =/,
      `${relativo(caminho)} redefine o regex de UUID em vez de usar _comum.ts`,
    )
    assert.doesNotMatch(
      fonte,
      /from\("locality_memberships"\)/,
      `${relativo(caminho)} lê a cidade por conta própria em vez de _comum.ts`,
    )
  }
})

test("a rota de exclusão de conta não inventa prazo nem apaga pela metade", () => {
  const rota = read(...ROTAS.split("/"), "apagar-conta", "route.ts")
  assert.match(rota, /request_account_deletion/, "a rota não chama o pedido existente")
  assert.doesNotMatch(rota, /delete\(\s*\)\s*\.from\("auth/, "a rota apaga conta por conta própria")
})
