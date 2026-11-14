import { appendFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { type BrowserContext, expect, test } from "@playwright/test"
import { ROTAS } from "../../apps/app/lib/navegacao/rotas"
import {
  type AllowedUnreached,
  buildPatterns,
  caminhosDoCatalogo,
  Frontier,
  internalTarget,
  type RoutePattern,
  staleAllowances,
  unreachedRoutes,
} from "./helpers/crawl-model"
import { signInAs } from "./helpers/session"

// Rastreador de links em runtime: link quebrado e rota sem porta.
//
// Cada persona entra pelas portas reais dela e segue todo <a href> que o app renderiza, página
// após página. Reprova quando:
//   1. um link leva a rota que não existe (nem página do Next nem tela do app em /app, pelo
//      catálogo do roteador), a 404, ou à tela "Algo deu errado";
//   2. uma rota de página não é alcançada por nenhum link de nenhuma persona e não tem porta
//      declarada em PORTAS_FORA_DO_LINK — ou seja, só se chega a ela digitando a URL;
//   3. uma porta declarada ficou velha: a rota passou a ter link, ou deixou de existir.
//
// O que ele NÃO vê: navegação feita por botão com router.push. Por isso essas rotas entram na
// lista de portas com o botão nomeado — a lista é a dívida visível, não um esconderijo.
//
// @stateful: só faz GET, mas lê telas que outros specs mudam (feed, pedidos, fila); serial.

const APP_DIR = join(process.cwd(), "apps", "web", "app")
const OUT_DIR = join(process.cwd(), ".visual", "crawl")
const CAP_PER_ROUTE = 1
const NAV_TIMEOUT = 15_000
// Uma linha por visita: com várias personas em paralelo, é o que mostra onde o percurso está.
const PROGRESS = join(OUT_DIR, "progresso.log")
// Cada segmento tem o próprio "não encontrado" ("Imóvel não encontrado", "Denúncia não
// encontrada"...) e, com streaming, o notFound() chega com HTTP 200. O texto é o sinal.
// "Este endereço não existe" é a tela de endereço inexistente do próprio SPA (TelaIndisponivel).
const BROKEN_TEXT =
  /não encontrad[oa]|Algo deu errado|This page could not be found|Este endereço não existe/i

// `chega` é onde a primeira entrada TEM de cair. Se não cair, a persona não entrou (o proxy
// falha fechado em /onboarding quando não consegue ler o tipo da conta) e tudo o que ela
// percorresse seria o app visto por outra pessoa — o spec para antes de medir errado.
// /login e /signup não são entradas declaradas: a web as manda para /app/entrar
// (ENTRADA-WEB-ANTIGA), e o rastreador as percorre pelos links da landing.
// A persona de verificado sem cidade saiu com a mesma mudança: a única entrada dela era
// /onboarding/locality, que agora também cai em /app/entrar.
const PERSONAS: Array<{ nome: string; email: string | null; entradas: string[]; chega: RegExp }> = [
  { nome: "visitante", email: null, entradas: ["/"], chega: /^\/$/ },
  {
    nome: "membro",
    email: "membro-1@bivaque.example.invalid",
    entradas: ["/inicio", "/profile"],
    chega: /^\/app\/inicio$/,
  },
  {
    nome: "dono de vila",
    email: "dono-vila@bivaque.example.invalid",
    entradas: ["/inicio", "/profile"],
    chega: /^\/app\/inicio$/,
  },
  {
    nome: "operador",
    email: "operador@bivaque.example.invalid",
    entradas: ["/admissions"],
    chega: /^\/admissions$/,
  },
  {
    nome: "prestador",
    email: "prestador-seed@bivaque.example.invalid",
    // A fila mostra só a aba ativa (?tab=; padrão "novos"), e o pedido respondido sai da aba
    // padrão — a porta do detalhe só existe nas outras abas. São entradas declaradas, não links:
    // passam por frontier.enter, que ignora o teto por rota.
    entradas: ["/prestador", "/prestador?tab=em_conversa", "/prestador?tab=encerrados"],
    chega: /^\/prestador$/,
  },
]

// Rotas legítimas que nenhum <a href> alcança. Cada uma diz por onde se chega de verdade.
// Rota que só se alcança digitando a URL NÃO entra aqui. A exceção é a dívida declarada: a
// porta existia e a fase em curso a retirou da navegação, com a tela antiga ainda viva — a
// linha nomeia o que falta e a fase que a fecha, e a checagem de porta velha obriga a tirá-la
// quando a porta voltar.
// Triagem de 22/09/2026 (rota a rota, no código). Categorias: FLUXO (redirect, passo após
// envio), EXTERNO (e-mail, link compartilhado), BOTÃO (router.push — navegação que deveria
// ser link), CONDICIONAL (link que só aparece em certo estado ou atrás de uma aba que o
// rastreador não abre), DÍVIDA (porta que falta e tem card).
const PORTAS_FORA_DO_LINK: readonly AllowedUnreached[] = [
  {
    route: "/auth/callback-error",
    porta: "FLUXO: redirect do /auth/callback quando o OAuth falha",
  },
  {
    route: "/auth/confirmar-email",
    porta: "FLUXO: router.push depois do cadastro e next= do link de confirmação",
  },
  {
    route: "/cidade/[id]",
    porta: "BOTÃO: 'Sua cidade' no cabeçalho > outra cidade (city-switcher, router.push)",
  },
  {
    route: "/conta-apagada",
    porta: "FLUXO: redirect depois de apagar a conta em Configurações > Conta (lote 4, PORT-006)",
  },
  {
    route: "/convite",
    porta:
      "CONDICIONAL: link do e-mail do convite e 'É cônjuge ou dependente?' na elegibilidade, que a persona do rastreador não vê (lote 4, PORT-006)",
  },
  {
    route: "/explorar/servicos",
    porta:
      "DÍVIDA LAN-TROCA: a porta era a lista /mercado e a página /explorar, ambas trocadas para o app (F02/F06); a lista de serviços segue na web até o lote próprio",
  },
  {
    route: "/groups",
    porta:
      "CONDICIONAL: 'Veja os grupos' no compositor e 'Criar o primeiro grupo' em Interesses, que só aparecem para quem não tem grupo; o painel 'Grupos ativos' saiu com o feed da Início (lote 5 N2)",
    dependeDeDados: true,
  },
  {
    route: "/groups/[id]",
    porta:
      "DÍVIDA LAN-TROCA: 'Grupos ativos' no rail da Início web saiu com a fase 1; grupos ficam na web até F04",
  },
  {
    route: "/communities/[id]/admin",
    porta:
      "CONDICIONAL: menu do console, cuja entrada é 'Analisar pedidos de entrada' na aba Sobre (moderador)",
    dependeDeDados: true,
  },
  {
    route: "/communities/[id]/admin/media",
    porta: "CONDICIONAL: menu do console (moderador)",
    dependeDeDados: true,
  },
  {
    route: "/communities/[id]/admin/moderators",
    porta: "CONDICIONAL: hub do console (moderador)",
    dependeDeDados: true,
  },
  {
    route: "/communities/[id]/admin/pending",
    porta: "CONDICIONAL: 'Analisar pedidos de entrada' na aba Sobre da comunidade (moderador)",
    dependeDeDados: true,
  },
  {
    route: "/communities/[id]/admin/providers",
    porta: "CONDICIONAL: 'Prestadores atestados' no hub do console (moderador)",
    dependeDeDados: true,
  },
  {
    route: "/communities/[id]/indicar-prestador",
    porta: "BOTÃO: 'Mais opções' > 'Indicar prestador' em /communities (window.location.assign)",
  },
  {
    route: "/communities/[id]/invite",
    porta:
      "CONDICIONAL: 'Convidar membros' na aba Sobre; 'Mais opções' > 'Convidar' em /communities",
    dependeDeDados: true,
  },
  {
    route: "/community",
    porta:
      "FLUXO: fim do onboarding ('Ir para a comunidade'), notificação de publicação e redirects",
    dependeDeDados: true,
  },
  {
    route: "/consent",
    porta:
      "DÍVIDA ROTA-CONSENT-LEGADA: portão removido pelo ADR-20260907-consentimento-no-cadastro",
  },
  {
    route: "/denuncias",
    porta:
      "CONDICIONAL: 'Minhas denúncias' na Ajuda e o retorno do fluxo de denúncia; a lista só é alcançada quando a persona já denunciou, o que o rastreador nem sempre exercita (portas intactas, LT-007 não as tocou)",
    dependeDeDados: true,
  },
  {
    route: "/denuncias/[id]",
    porta: "CONDICIONAL: lista de /denuncias, quando a pessoa já denunciou",
    dependeDeDados: true,
  },
  {
    route: "/denuncias/nova",
    porta: "FLUXO: versão endereçável (spec C10) do diálogo que as origens abrem por cima da tela",
  },
  {
    route: "/guide/[id]",
    porta:
      "CONDICIONAL: referência do Guia linkada nos pedidos de indicação (ask-indication/indication-detail), atrás de dado que o rastreador nem sempre vê; a lista /guide saiu para o app (F08/LT-007), o verbete web permanece",
    dependeDeDados: true,
  },
  {
    route: "/guide/[id]/correcao",
    porta: "CONDICIONAL: 'Sugerir atualização' no artigo, quando a referência tem guia publicado",
    dependeDeDados: true,
  },
  {
    route: "/guide/sugerir",
    porta:
      "DÍVIDA LAN-TROCA: a porta era 'Sugerir um lugar' na lista /guide, trocada para o app (F08); o app ainda não tem a porta de sugestão de lugar novo (gap em F08-RESSALVAS)",
  },
  {
    route: "/imoveis/alertas",
    porta:
      "DÍVIDA LAN-TROCA: 'Criar alerta' dentro de /imoveis antigos, sem equivalente no app (F06)",
  },
  {
    route: "/imoveis/novo",
    porta:
      "DÍVIDA LAN-TROCA: 'Anunciar imóvel' dentro de /imoveis antigos, sem destino direto no app (F06)",
  },
  {
    route: "/imoveis/[id]/editar",
    porta: "CONDICIONAL: 'Editar anúncio' no detalhe, só para o dono",
    dependeDeDados: true,
  },
  {
    route: "/indicacoes",
    porta:
      "FLUXO: redireciona para a vista Indicações da Comunidade; fica para links antigos e ?pedir=1",
  },
  { route: "/invite/[token]", porta: "EXTERNO: link de convite compartilhado" },
  {
    route: "/localidade",
    porta:
      "DÍVIDA LAN-TROCA: a porta era o rail da Início web e a aba Sobre da comunidade, fora do percurso do rastreador (F02/F08)",
  },
  {
    route: "/mercado/[id]/editar",
    porta:
      "URL DIRETA: a edição web de desapego permanece só por URL; o Gerenciar do app edita em folha inline e não referencia esta rota (gap registrado em LAN-F06)",
  },
  {
    route: "/mercado/novo",
    porta:
      "DÍVIDA LAN-TROCA: a porta era o menu '+' da casca web, que a fase 1 substituiu pela casca do app (F06)",
  },
  {
    route: "/negocio",
    porta:
      "DÍVIDA LAN-TROCA: a porta era 'Meu negócio' na lista /mercado, trocada para o app (F06); a gestão do negócio próprio segue na web (F07)",
  },
  {
    route: "/negocio/catalogo",
    porta: "CONDICIONAL: 'Catálogo' em /negocio, só depois que a página do negócio existe",
    dependeDeDados: true,
  },
  { route: "/nova-senha", porta: "EXTERNO: link do e-mail de recuperação de senha" },
  { route: "/onboarding", porta: "FLUXO: proxy, cadastro e consentimento" },
  {
    route: "/onboarding/documento",
    porta: "FLUXO: verificação recusada e 'Enviar identidade' no status",
  },
  {
    route: "/onboarding/locality",
    porta: "FLUXO: proxy redireciona quem é verificado e ainda não escolheu cidade",
  },
  {
    route: "/onboarding/perfil",
    porta:
      "FLUXO: redireciona para a tela de cidade — o passo de personalização saiu da entrada (PORT-005)",
  },
  { route: "/onboarding/status", porta: "FLUXO: proxy e notificação de entrada recusada" },
  { route: "/onboarding/welcome", porta: "FLUXO: fim do onboarding" },
  { route: "/pedidos/novo", porta: "BOTÃO: 'Pedir serviço' na ficha do prestador" },
  {
    route: "/profile/[userId]",
    porta:
      "DÍVIDA LAN-TROCA: a porta eram os autores no feed da Início web; o perfil de outra pessoa segue na web (F10)",
  },
  { route: "/prestador-convite/[token]", porta: "EXTERNO: e-mail de convite do prestador" },
  {
    route: "/recommendations",
    porta: "FLUXO: aposentada em 25/09/2026; redireciona links antigos para a Comunidade",
  },
]

function listFiles(dir: string, name: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) listFiles(path, name, out)
    else if (entry === name) out.push(relative(APP_DIR, path))
  }
  return out
}

interface Broken {
  persona: string
  from: string
  target: string
  motivo: string
}

async function crawl(
  context: BrowserContext,
  persona: string,
  entradas: string[],
  chega: RegExp,
  patterns: RoutePattern[],
  reached: Set<string>,
  broken: Broken[],
  redirects: Array<{ persona: string; target: string; landed: string }>,
): Promise<number> {
  const frontier = new Frontier(patterns, CAP_PER_ROUTE)
  for (const entrada of entradas) frontier.enter({ target: entrada, from: "(entrada)", persona })
  const page = await context.newPage()
  page.setDefaultNavigationTimeout(NAV_TIMEOUT)
  let visits = 0

  for (let visit = frontier.next(); visit; visit = frontier.next()) {
    visits += 1
    const started = Date.now()
    const response = await page.goto(visit.target, { waitUntil: "load" }).catch(() => null)
    await page.waitForLoadState("networkidle", { timeout: 1_000 }).catch(() => {})
    const landed = new URL(page.url())
    const status = response?.status() ?? 0
    if (visits === 1 && !chega.test(landed.pathname)) {
      throw new Error(
        `persona ${persona} não entrou: ${visit.target} caiu em ${landed.pathname}. ` +
          "Medir daqui mediria o app visto por outra pessoa.",
      )
    }
    appendFileSync(
      PROGRESS,
      `${persona}	${visits}	${status}	${Date.now() - started}ms	${visit.target}
`,
    )

    // Sem espera: a área de operação não tem <main>, e um locator esperaria por ele até o fim.
    const body = await page
      .evaluate(() => (document.querySelector("main") ?? document.body)?.innerText ?? "")
      .catch(() => "")
    if (status >= 400 || status === 0 || BROKEN_TEXT.test(body)) {
      broken.push({
        persona,
        from: visit.from,
        target: visit.target,
        motivo: status >= 400 ? `HTTP ${status}` : status === 0 ? "sem resposta" : "tela de erro",
      })
      continue
    }
    if (`${landed.pathname}${landed.search}` !== visit.target) {
      redirects.push({ persona, target: visit.target, landed: landed.pathname })
    }
    // A rota onde um redirecionamento deixou a pessoa é percorrida, mas não conta como
    // alcançada: depende de qual link o rastreador seguiu antes, e a medida oscilava entre
    // rodadas. Só conta o que algum link aponta; o resto aparece sempre e é declarado.
    frontier.offer({ target: landed.pathname, from: visit.target, persona })

    const hrefs = await page.$$eval("a[href]", (anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    )
    for (const href of new Set(hrefs)) {
      const target = internalTarget(href, page.url())
      if (!target) continue
      const pattern = frontier.offer({ target, from: landed.pathname, persona })
      if (!pattern) {
        broken.push({ persona, from: landed.pathname, target, motivo: "rota inexistente" })
        continue
      }
      reached.add(pattern.route)
    }
  }
  await page.close()
  return visits
}

test.describe("rastreador de links", { tag: "@stateful" }, () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "a navegação é a mesma; uma largura")
  test.describe.configure({ timeout: 25 * 60_000 })

  test("todo link leva a uma tela real e toda tela tem porta", async ({ browser }) => {
    // Telas do SPA em /app: o catálogo do roteador (apps/app) é a autoridade do que existe lá.
    const patterns = buildPatterns(
      listFiles(APP_DIR, "page.tsx"),
      listFiles(APP_DIR, "route.ts"),
      caminhosDoCatalogo(ROTAS),
      // Continuam sendo links válidos e são visitados; deixaram de ser telas
      // da web cuja porta o inventário exige (LAN-TROCA fase 1).
      [
        "/messages",
        "/messages/[id]",
        "/mercado/[id]",
        "/imoveis/[id]",
        "/pedidos",
        "/pedidos/[id]",
        "/prestadores/[id]",
        "/configuracoes/bloqueados",
        "/configuracoes/familia",
        "/inicio",
        "/explorar",
      ],
    )
    const reached = new Set<string>()
    const broken: Broken[] = []
    const redirects: Array<{ persona: string; target: string; landed: string }> = []
    const visitas: Record<string, number> = {}
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(PROGRESS, "")

    // Em série: com as personas em paralelo o Supabase local compartilhado deixou de responder
    // my_account_kind, o proxy falhou fechado e o operador foi medido como quem não tem conta.
    for (const persona of PERSONAS) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      if (persona.email) await signInAs(context, persona.email)
      try {
        visitas[persona.nome] = await crawl(
          context,
          persona.nome,
          persona.entradas,
          persona.chega,
          patterns,
          reached,
          broken,
          redirects,
        )
      } finally {
        await context.close()
      }
    }

    const semPorta = unreachedRoutes(patterns, reached, PORTAS_FORA_DO_LINK)
    const portasVelhas = staleAllowances(patterns, reached, PORTAS_FORA_DO_LINK)
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(
      join(OUT_DIR, "relatorio.json"),
      `${JSON.stringify(
        {
          geradoEm: new Date().toISOString(),
          visitas,
          rotasDePagina: patterns.filter((p) => p.kind === "page").length,
          alcancadas: [...reached].sort(),
          quebrados: broken,
          semPorta,
          portasVelhas,
          redirecionamentos: redirects,
        },
        null,
        2,
      )}\n`,
    )

    expect(broken, "links que levam a lugar nenhum").toEqual([])
    expect(semPorta, "rotas que só se alcançam digitando a URL").toEqual([])
    expect(portasVelhas, "portas declaradas que ficaram velhas").toEqual([])
  })
})
