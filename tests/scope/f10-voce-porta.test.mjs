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
  //
  // A terceira é os interesses (RUN-160), com teste próprio abaixo: a tabela
  // user_group_interests é operacional e os três RPCs têm execute só para
  // service_role, então a sessão sob RLS não lê nem grava interesse nenhum.
  const rotas = arquivos(ROTAS)
    .filter((caminho) => caminho.endsWith("route.ts"))
    .filter((caminho) => !relativo(caminho).includes("/familia/"))
    .filter((caminho) => !relativo(caminho).includes("/localizacao/"))
    .filter((caminho) => !relativo(caminho).includes("/interesses/"))
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

test("a família deriva a posse da sessão e só lê ou enfileira com privilégio", () => {
  const envio = read(...ROTAS.split("/"), "familia", "route.ts")
  const revogacao = read(...ROTAS.split("/"), "familia", "[id]", "route.ts")

  // SEC-011 (auditoria de 16/11, A2-1 / A2-4): a criação e a revogação chamam
  // as funções públicas que derivam o titular de auth.uid() (migration
  // 20261116221048) com o cliente da SESSÃO. O id do titular não é parâmetro de
  // nada e não existe mais assinatura pública que o aceite.
  assert.match(
    envio,
    /enviarConvite\(\s*auth\.sessao\.cliente,/,
    "o envio não chama a função de criação com o cliente da sessão",
  )
  assert.match(
    revogacao,
    /revogarConvite\(auth\.sessao\.cliente, id\)/,
    "a revogação não chama a função de revogação com o cliente da sessão",
  )
  assert.doesNotMatch(
    revogacao,
    /clienteDeServicoOuNulo|service_role/,
    "a revogação abre privilégio onde a posse derivada basta",
  )

  // O privilégio que resta na leitura e no outbox vem DEPOIS da sessão e não é
  // escrita de posse.
  const sessao = envio.indexOf("exigirSessao(")
  const privilegio = envio.indexOf("clienteDeServicoOuNulo(")
  assert.ok(sessao >= 0, "o envio não resolve a sessão pelo encanamento")
  assert.ok(privilegio > sessao, "o envio abre o privilégio antes da sessão")

  for (const fonte of [envio, revogacao]) {
    assert.match(fonte, /lerFamilia|enviarConvite|revogarConvite/, "a rota foge do módulo")
    assert.match(fonte, /opcoesDoApp/, "a rota não responde ao preflight do contrato")
    assert.doesNotMatch(
      fonte,
      /corpo\[(?:"|')((user_id|userId|usuario))(?:"|')\]|searchParams\.get\("(user_id|userId|usuario)"\)/,
      "a rota aceita o dono vindo do pedido",
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
    /responder\(request, \{ localizacao, distanciaDisponivel \}, 200\)/,
    "a resposta de sucesso não é só a localização lida pela RPC e se há posição",
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

test("os interesses usam o privilégio só depois da sessão e só nos RPCs de interesse", () => {
  // RUN-160 / F10: `user_group_interests` é tabela operacional — não tem grant
  // para anon/authenticated — e os três RPCs de interesse têm execute só para o
  // papel de serviço. A sessão, sozinha, não lê nem grava interesse nenhum; a
  // exceção é medida, e é esta a prova dela.
  const rota = read(...ROTAS.split("/"), "interesses", "route.ts")
  const sessao = rota.indexOf("exigirSessao(")
  const privilegio = rota.indexOf("clienteDeServicoOuNulo(")
  assert.ok(sessao >= 0, "a rota de interesses não resolve a sessão pelo encanamento")
  assert.ok(privilegio > sessao, "a rota de interesses abre o privilégio antes da sessão")
  for (const rpc of [
    "list_available_groups_for_interests",
    "list_user_group_interests",
    "record_user_group_interests",
  ]) {
    assert.match(rota, new RegExp(rpc), `a rota de interesses não usa ${rpc}`)
  }
  // Exatamente um cliente de privilégio por handler, e nenhum aberto à mão.
  assert.strictEqual(
    (rota.match(/clienteDeServicoOuNulo\(/g) ?? []).length,
    2,
    "a rota de interesses abre o cliente de serviço fora do encanamento",
  )
  assert.doesNotMatch(rota, /createServerClient/, "a rota de interesses monta cliente próprio")
  assert.doesNotMatch(
    rota,
    /from\("user_group_interests"\)/,
    "a rota de interesses toca a tabela operacional direto",
  )
  assert.match(rota, /conferirEscrita\(/, "a escrita de interesses não confere a porta")
  assert.match(rota, /opcoesDoApp/, "a rota de interesses não responde ao preflight do contrato")
  assert.match(
    rota,
    /from "\.\.\/\.\.\/eventos\/_comum"/,
    "a rota de interesses não usa a cidade e o UUID do _comum",
  )
  assert.doesNotMatch(
    rota,
    /searchParams\.get\("(user_id|usuario|userId|dono|locality_id)"\)|corpo\[(?:"|')(user_id|userId|usuario|locality_id)(?:"|')\]/,
    "a rota de interesses aceita dono ou cidade vindos do pedido",
  )
})

// RUN-172 tirou as Server Actions de família de `(shell)/profile`; o SEC-011
// (16/11) tirou as últimas, que já eram código morto: a tela
// `(shell)/configuracoes/familia` é 307 para /app/voce (next.config.ts) e quem
// convida é o app, pela porta `/api/app/voce/familia`. O teste acima prova que a
// porta usa o cliente da sessão; aqui só resta o 307, provado em
// tests/unit/infra/lan-troca-redirect.test.ts.

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
