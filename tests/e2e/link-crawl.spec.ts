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
// Desde o RUN-176 a mesma lista é a entrada da casca: a persona dona de uma porta visita a rota
// como semente e o crawl segue os links dali. Semente não é link — a invariante da porta
// continua valendo para chegada por <a href>, e é o crawl, não a lista, que fecha o que a
// casca alcança.
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
    // RUN-172: a segunda entrada era `/profile`, hoje 307 para o app. O Início
    // é a porta da casca web, e os destinos da pessoa (Salvos, Configurações,
    // o Você no app) saem dos links dele.
    entradas: ["/inicio"],
    chega: /^\/app\/inicio$/,
  },
  {
    nome: "dono de vila",
    email: "dono-vila@bivaque.example.invalid",
    // RUN-176: a casca web não tem link saindo do app, então a porta dela é ENTRADA
    // declarada, não dívida de link. `/inicio` é 307; `/communities` abre a casca e a
    // lateral dela leva a Salvos e Configurações. A lista deixou de ser porta fora do link
    // no run 43853510395: o card "Entrar na comunidade" de /community linka ela.
    entradas: ["/inicio", "/communities"],
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
//
// RUN-176: a lista tem dois papéis. Uma porta que nenhum link abre é exatamente a que só se
// abre digitando a URL — então o rastreador digita: a entrada com `dono` é visitada como
// semente pela persona que a detém, com a mesma visita real das outras, e o crawl segue todo
// link que sai dali. É assim que a casca web volta ao inventário sem que ninguém invente
// caminho: o que essas telas alcançam sai do crawl, não desta lista. Chegar por semente NÃO
// conta como "alcançada por link" — o invariante continua sendo link-ou-declaração, e a porta
// que voltar a ter link envelhece em staleAllowances como qualquer outra.
// Rota com parâmetro fica sem semente: a URL nua cai em notFound (/pedidos/novo) ou depende
// de id/token externo, e inventar id seria medir dado que não existe. Quem as caminha é o
// link da lista semeada ao lado — cada `porta` nomeia qual — e, enquanto não houver link, a
// declaração continua sendo a porta.
interface PortaDeclarada extends AllowedUnreached {
  /** Persona que detém a porta. Sem parâmetro na rota, ela entra por ali como semente. */
  readonly dono?: string
}

const PORTAS_FORA_DO_LINK: readonly PortaDeclarada[] = [
  {
    route: "/auth/callback-error",
    porta: "FLUXO: redirect do /auth/callback quando o OAuth falha",
    dono: "visitante",
  },
  {
    route: "/auth/confirmar-email",
    porta: "FLUXO: router.push depois do cadastro e next= do link de confirmação",
    dono: "visitante",
  },
  {
    route: "/conta-apagada",
    porta: "FLUXO: redirect depois de apagar a conta em Configurações > Conta (lote 4, PORT-006)",
    dono: "visitante",
  },
  {
    route: "/convite",
    porta:
      "CONDICIONAL: link do e-mail do convite e 'É cônjuge ou dependente?' na elegibilidade, que a persona do rastreador não vê (lote 4, PORT-006)",
    dono: "visitante",
  },
  {
    route: "/explorar/servicos",
    porta:
      "DÍVIDA LAN-TROCA: a porta era a lista /mercado e a página /explorar, ambas trocadas para o app (F02/F06); a lista de serviços segue na web até o lote próprio",
    dono: "membro",
  },
  {
    route: "/groups",
    porta:
      "CONDICIONAL: 'Veja os grupos' no compositor, que só aparece para quem ainda não participa de nenhum; o 'Criar o primeiro grupo' de Interesses saiu com a tela web (RUN-163) e o app não oferece criar grupo",
    dependeDeDados: true,
    dono: "membro",
  },
  {
    route: "/communities/[id]/admin",
    porta:
      "CONDICIONAL: menu do console, cuja entrada é 'Analisar pedidos de entrada' na aba Sobre (moderador)",
    dependeDeDados: true,
    dono: "dono de vila",
  },
  {
    route: "/communities/[id]/admin/media",
    porta: "CONDICIONAL: menu do console (moderador)",
    dependeDeDados: true,
    dono: "dono de vila",
  },
  {
    route: "/communities/[id]/admin/moderators",
    porta: "CONDICIONAL: hub do console (moderador)",
    dependeDeDados: true,
    dono: "dono de vila",
  },
  {
    route: "/communities/[id]/admin/pending",
    porta: "CONDICIONAL: 'Analisar pedidos de entrada' na aba Sobre da comunidade (moderador)",
    dependeDeDados: true,
    dono: "dono de vila",
  },
  {
    route: "/communities/[id]/admin/providers",
    porta: "CONDICIONAL: 'Prestadores atestados' no hub do console (moderador)",
    dependeDeDados: true,
    dono: "dono de vila",
  },
  {
    route: "/communities/[id]/indicar-prestador",
    porta: "BOTÃO: 'Mais opções' > 'Indicar prestador' em /communities (window.location.assign)",
    dono: "dono de vila",
  },
  {
    route: "/communities/[id]/invite",
    porta:
      "CONDICIONAL: 'Convidar membros' na aba Sobre; 'Mais opções' > 'Convidar' em /communities",
    dependeDeDados: true,
    dono: "dono de vila",
  },
  {
    route: "/community",
    porta:
      "FLUXO: fim do onboarding ('Ir para a comunidade'), notificação de publicação e redirects",
    dependeDeDados: true,
    dono: "membro",
  },
  {
    route: "/consent",
    porta:
      "DÍVIDA ROTA-CONSENT-LEGADA: portão removido pelo ADR-20260907-consentimento-no-cadastro",
    dono: "visitante",
  },
  {
    route: "/denuncias",
    porta:
      "CONDICIONAL: 'Minhas denúncias' na Ajuda e o retorno do fluxo de denúncia; a lista só é alcançada quando a persona já denunciou, o que o rastreador nem sempre exercita (portas intactas, LT-007 não as tocou)",
    dependeDeDados: true,
    dono: "membro",
  },
  {
    route: "/denuncias/[id]",
    porta: "CONDICIONAL: lista de /denuncias, quando a pessoa já denunciou",
    dependeDeDados: true,
    dono: "membro",
  },
  // Sem semente de propósito: sem `?tipo=` e `?id=` a tela desenha "Conteúdo não encontrado" —
  // o servidor confere o alvo antes de qualquer campo, por design. Mesma regra de
  // /pedidos/novo: nada de inventar id para a semente, a declaração segue sendo a porta.
  {
    route: "/denuncias/nova",
    porta: "FLUXO: versão endereçável (spec C10) do diálogo que as origens abrem por cima da tela",
  },
  {
    route: "/guide/sugerir",
    porta:
      "DÍVIDA LAN-TROCA: a porta era 'Sugerir um lugar' na lista /guide, trocada para o app (F08); o app ainda não tem a porta de sugestão de lugar novo (gap em F08-RESSALVAS)",
    dono: "membro",
  },
  {
    route: "/indicacoes",
    porta:
      "FLUXO: redireciona para a vista Indicações da Comunidade; fica para links antigos e ?pedir=1",
    dono: "membro",
  },
  { route: "/invite/[token]", porta: "EXTERNO: link de convite compartilhado" },
  // RUN-172/176: o perfil web era a única tela da casca a que uma persona chegava, e com ele
  // morreram as portas de Salvos, Configurações, Conta, senha, Comunidades e o detalhe da
  // indicação. Entrar na casca por uma semente devolveu a medida, e estas voltaram a ter link
  // — por isso saíram da lista: declaração que virou link é dívida paga, e staleAllowances
  // acusaria a linha esquecida.
  // - /salvos e /configuracoes: coluna lateral de toda tela da casca (app-shell.tsx:113 e :161)
  // - /configuracoes/conta: coluna de Configurações (configuracoes-nav.tsx)
  // - /recuperar-senha: 'Alterar' e 'Ajuda com acesso' em Conta (configuracoes/conta/page.tsx)
  // - /communities/[id]: lista de comunidades (communities-screen.tsx:276) e a lateral (:328)
  // - /groups/[id]: nome do grupo na lista de grupos (groups/page.tsx:448)
  // - /negocio: 'Ofereça seus serviços' na lista de serviços (explorar/servicos/page.tsx:352)
  // - /communities: card 'Entrar na comunidade' de /community (join-community.tsx:24). Como é
  //   por ela que a casca se abre, a entrada do dono da vila foi para `entradas`, não para cá:
  //   a casca não tem link saindo do app, e entrada declarada não é dívida.
  {
    route: "/indicacoes/[id]",
    porta:
      "CONDICIONAL: lista de /salvos ou a vista Indicações da Comunidade, que só linka o pedido quando a cidade já tem pedidos (RUN-172/RUN-176)",
    dependeDeDados: true,
    dono: "dono de vila",
  },
  {
    route: "/nova-senha",
    porta: "EXTERNO: link do e-mail de recuperação de senha",
    dono: "visitante",
  },
  { route: "/onboarding", porta: "FLUXO: proxy, cadastro e consentimento", dono: "visitante" },
  {
    route: "/onboarding/documento",
    porta: "FLUXO: verificação recusada e 'Enviar identidade' no status",
    dono: "visitante",
  },
  {
    route: "/onboarding/locality",
    porta: "FLUXO: proxy redireciona quem é verificado e ainda não escolheu cidade",
    dono: "visitante",
  },
  {
    route: "/onboarding/perfil",
    porta:
      "FLUXO: redireciona para a tela de cidade — o passo de personalização saiu da entrada (PORT-005)",
    dono: "visitante",
  },
  {
    route: "/onboarding/status",
    porta: "FLUXO: proxy e notificação de entrada recusada",
    dono: "visitante",
  },
  { route: "/onboarding/welcome", porta: "FLUXO: fim do onboarding", dono: "visitante" },
  { route: "/prestador-convite/[token]", porta: "EXTERNO: e-mail de convite do prestador" },
  {
    route: "/recommendations",
    porta: "FLUXO: aposentada em 25/09/2026; redireciona links antigos para a Comunidade",
    dono: "membro",
  },
]

// Sementes da persona: as portas que ela detém e cuja URL se digita. Rota com parâmetro fica
// de fora — o crawl a alcança pelo link da lista que a `porta` nomeia.
function sementesDa(dono: string): string[] {
  return PORTAS_FORA_DO_LINK.filter(
    (porta) => porta.dono === dono && !porta.route.includes("["),
  ).map((porta) => porta.route)
}

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
  sementes: string[],
  chega: RegExp,
  patterns: RoutePattern[],
  reached: Set<string>,
  broken: Broken[],
  redirects: Array<{ persona: string; target: string; landed: string }>,
): Promise<number> {
  const frontier = new Frontier(patterns, CAP_PER_ROUTE)
  for (const entrada of entradas) frontier.enter({ target: entrada, from: "(entrada)", persona })
  // A porta declarada entra como semente, não como chegada: `reached` só cresce no laço de
  // hrefs abaixo, então visitar a tela não a torna "alcançável por link".
  for (const semente of sementes) {
    frontier.enter({ target: semente, from: "(porta declarada)", persona })
  }
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
      // da web cuja porta o inventário exige (LAN-TROCA fase 1). /messages saiu
      // desta lista no RUN-166 e `/profile/[userId]` no RUN-172, pela mesma
      // regra: sem page.tsx não há padrão a reclassificar, e nenhuma tela web
      // linka a URL antiga (os links migraram para o app).
      [
        "/mercado/[id]",
        "/imoveis/[id]",
        "/pedidos",
        "/pedidos/[id]",
        "/prestadores/[id]",
        // /guide perdeu o page.tsx na troca da fase 8 e vive só do redirect do next.config:
        // continua destino válido de <a href> (o "voltar" de /guide/sugerir), então precisa de
        // padrão — sem ele, todo link para lá virava "rota inexistente".
        "/guide",
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
    const sementes: Record<string, string[]> = {}
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(PROGRESS, "")

    // Uma persona com `dono` digitado errado perderia as sementes sem avisar: é a única lista
    // deste spec que casa por nome.
    for (const porta of PORTAS_FORA_DO_LINK) {
      if (!porta.dono) continue
      expect(
        PERSONAS.map((p) => p.nome),
        `${porta.route} sem persona dona`,
      ).toContain(porta.dono)
    }

    // Em série: com as personas em paralelo o Supabase local compartilhado deixou de responder
    // my_account_kind, o proxy falhou fechado e o operador foi medido como quem não tem conta.
    for (const persona of PERSONAS) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      if (persona.email) await signInAs(context, persona.email)
      sementes[persona.nome] = sementesDa(persona.nome)
      try {
        visitas[persona.nome] = await crawl(
          context,
          persona.nome,
          persona.entradas,
          sementes[persona.nome] ?? [],
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
          sementes,
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

  // A distinção que o RUN-176 introduziu, medida no modelo e não na intuição de quem edita a
  // lista: entrar por semente visita a tela, mas não a torna "alcançável por link".
  test("semente não satisfaz o invariante de porta", () => {
    // Só a tela da semente no padrão: "/" é entrada, não semente, e no inventário do teste
    // ela entraria como rota sem porta por não ter link nenhum — ruído que esconde a regra.
    const patterns = buildPatterns(["(shell)/salvos/page.tsx"], [])
    const frontier = new Frontier(patterns, CAP_PER_ROUTE)
    const porta = { route: "/salvos", porta: "semente da persona dona" }

    frontier.enter({ target: "/salvos", from: "(porta declarada)", persona: "dono de vila" })
    expect(frontier.next()?.target).toBe("/salvos")

    // Sem link e sem declaração, a tela da semente continua sendo rota que só se alcança
    // digitando a URL; declarada, passa; e no dia em que um link a alcançar, a declaração
    // vira dívida paga e staleAllowances a acusa.
    expect(unreachedRoutes(patterns, new Set(), [])).toEqual(["/salvos"])
    expect(unreachedRoutes(patterns, new Set(), [porta])).toEqual([])
    expect(staleAllowances(patterns, new Set(), [porta])).toEqual([])
    expect(staleAllowances(patterns, new Set(["/salvos"]), [porta])).toEqual(["/salvos"])
  })
})
