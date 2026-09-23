import { appendFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { type BrowserContext, expect, test } from "@playwright/test"
import {
  type AllowedUnreached,
  buildPatterns,
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
//   1. um link leva a rota que não existe, a 404, ou à tela "Algo deu errado";
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
const BROKEN_TEXT = /não encontrad[oa]|Algo deu errado|This page could not be found/i

// `chega` é onde a primeira entrada TEM de cair. Se não cair, a persona não entrou (o proxy
// falha fechado em /onboarding quando não consegue ler o tipo da conta) e tudo o que ela
// percorresse seria o app visto por outra pessoa — o spec para antes de medir errado.
const PERSONAS: Array<{ nome: string; email: string | null; entradas: string[]; chega: RegExp }> = [
  { nome: "visitante", email: null, entradas: ["/", "/login", "/signup"], chega: /^\/$/ },
  {
    nome: "membro",
    email: "membro-1@bivaque.example.invalid",
    entradas: ["/inicio"],
    chega: /^\/inicio$/,
  },
  {
    nome: "dono de vila",
    email: "dono-vila@bivaque.example.invalid",
    entradas: ["/inicio"],
    chega: /^\/inicio$/,
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
  {
    nome: "verificado sem cidade",
    email: "verified-no-membership@bivaque.example.invalid",
    entradas: ["/onboarding/locality"],
    chega: /^\/onboarding\/locality$/,
  },
]

// Rotas legítimas que nenhum <a href> alcança. Cada uma diz por onde se chega de verdade.
// Rota que só se alcança digitando a URL NÃO entra aqui: ela é defeito e o spec reprova.
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
    route: "/denuncias/[id]",
    porta: "CONDICIONAL: lista de /denuncias, quando a pessoa já denunciou",
    dependeDeDados: true,
  },
  {
    route: "/denuncias/nova",
    porta: "FLUXO: versão endereçável (spec C10) do diálogo que as origens abrem por cima da tela",
  },
  {
    route: "/events/[id]/editar",
    porta: "CONDICIONAL: 'Editar evento' para quem organiza",
    dependeDeDados: true,
  },
  {
    route: "/events/novo",
    porta: "DÍVIDA EVENTOS-CRIACAO-DUPLICADA: /events cria pelo formulário embutido",
  },
  { route: "/explorar/busca", porta: "FLUXO: formulário GET da busca global do cabeçalho" },
  {
    route: "/guide/[id]/correcao",
    porta: "CONDICIONAL: 'Sugerir atualização' no artigo, quando a referência tem guia publicado",
    dependeDeDados: true,
  },
  {
    route: "/imoveis/[id]/editar",
    porta: "CONDICIONAL: 'Editar anúncio' no detalhe, só para o dono",
    dependeDeDados: true,
  },
  { route: "/invite/[token]", porta: "EXTERNO: link de convite compartilhado" },
  { route: "/mercado/[id]/editar", porta: "BOTÃO: 'Editar' em /meus-anuncios" },
  { route: "/mercado/novo", porta: "BOTÃO: 'Anunciar' em /mercado e /meus-anuncios" },
  { route: "/messages/[id]", porta: "FLUXO: escolher conversa na caixa, ou ?conversation=" },
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
  { route: "/onboarding/perfil", porta: "FLUXO: passo seguinte à escolha da cidade" },
  { route: "/onboarding/status", porta: "FLUXO: proxy e notificação de entrada recusada" },
  { route: "/onboarding/welcome", porta: "FLUXO: fim do onboarding" },
  { route: "/pedidos/novo", porta: "BOTÃO: 'Pedir serviço' na ficha do prestador" },
  { route: "/prestador-convite/[token]", porta: "EXTERNO: e-mail de convite do prestador" },
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
    const patterns = buildPatterns(listFiles(APP_DIR, "page.tsx"), listFiles(APP_DIR, "route.ts"))
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
