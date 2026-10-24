// Resolução do item ativo da navegação da lateral a partir da ROTA.
//
// Bug que originou o RECON-038: `/salvos` era tratada como "destino pessoal" e
// caía no fallback "perfil" — a lateral acendia **Perfil** enquanto a pessoa
// estava em Salvos. Isso é defeito de navegação, não de estilo: o item ativo
// tem que sair da rota, nunca de um fallback que escolhe um vizinho plausível.
//
// RECON-042, defeito 2: o último recurso elegia "inicio" para toda rota que não
// fosse um container primário nem uma rota pessoal. Isso acendia Início em
// /guide, /events, /recommendations e /configuracoes. A correção não é uma lista
// de rotas que cresce a cada tela nova — é declarar a que container cada ÁREA
// pertence e reprovar rota sem declaração em vez de acender um vizinho. Uma rota
// nova nasce cobrada pelo teste que varre o mapa HEADINGS da captura visual.
//
// O módulo é puro (sem React, sem Next) de propósito — é o que permite testar
// a regressão em tests/unit/ui/shell-active-nav.test.ts no ambiente node do
// Vitest da casa, sem DOM nem testing-library.

export type PrimaryNavItem = {
  id: string
  href: string
}

// `none` é o último recurso honesto: nenhuma rota sem container declarado acende
// um item. Preferimos uma lateral sem item ativo a uma que aponta para o vizinho
// errado — o teste de escopo transforma o caso em falha de contrato.
export type ActiveNav =
  | { kind: "primary"; id: string }
  | { kind: "secondary"; href: string }
  | { kind: "none" }

// Os quatro containers primários. Os ids são os mesmos de NAV_ITEMS em
// bottom-nav.tsx — se um item nascer aqui com outro id, o teste falha.
//
// Lote 5, tarefa N1 (ADR-20261023-comunidade-do-prototipo, "Navegação e
// estrutura"): a barra segue o protótipo — Início, Comunidade, Conversas e
// Você. Isto substitui os containers Início/Explorar/Comunidades/Perfil do
// PROCESSO-DE-CONSTRUCAO §7, que a reconstrução de 2026-09-06 tinha fixado.
export const PRIMARY_CONTAINERS = ["inicio", "comunidade", "conversas", "voce"] as const

export type PrimaryContainer = (typeof PRIMARY_CONTAINERS)[number]

// Destinos secundários que representam a si mesmos na lateral porque têm item
// próprio desenhado em app-shell.tsx. A lista ficou VAZIA no lote 5 N1: o
// protótipo põe Salvos em Você (activeTab() devolve 'voce' para salvos), então
// /salvos acende Você — não a si mesmo. A entrada segunda da lateral continua
// existindo como atalho, mas não é mais um destino primário autônomo.
export const SECONDARY_SELF_ROUTES = [] as const

// A que container cada ÁREA pertence. É a regra de produto, não uma lista de
// telas: o prefixo da área resolve, e a tela herda o container do pai
// conceitual (prototypes/bivaque-html/src/shell/navigation.js activeTab):
//
//   Início     → só rotas com dono fixo; destinos compartilhados herdam `origin`.
//   Comunidade → a Comunidade da cidade: perguntas e respostas (Indicações) e
//                os Grupos; também as rotas antigas de vila, que redirecionam.
//   Conversas  → as mensagens privadas.
//   Você       → a pessoa: perfil, conta, notificações, Salvos, Meus anúncios,
//                Bloqueados, Privacidade, Conduta e Ajuda.
//
// Ordem importa: o prefixo mais específico primeiro. A comparação é por
// fronteira (`matches`), então `/prestadores` não casa `/prestador`.
export const AREA_CONTAINERS: ReadonlyArray<readonly [string, PrimaryContainer]> = [
  ["/inicio", "inicio"],
  // Indicações é a vista de perguntas da Comunidade; /recommendations é a rota
  // aposentada que redireciona para ela.
  ["/recommendations", "comunidade"],
  ["/indicacoes", "comunidade"],
  // As vilas saíram da tela no lote 5 N1; /communities e /groups e /community
  // são a Comunidade da cidade (as duas primeiras redirecionam para a última).
  ["/communities", "comunidade"],
  ["/community", "comunidade"],
  ["/groups", "comunidade"],
  ["/messages", "conversas"],
  ["/profile", "voce"],
  // Salvos é coisa da pessoa (activeTab() do protótipo → 'voce'); deixou de ser
  // um destino secundário autônomo no lote 5 N1.
  ["/salvos", "voce"],
  ["/negocio", "voce"],
  ["/configuracoes", "voce"],
  ["/notifications", "voce"],
  // A conversa contextual membro↔prestador vive em Você, e o pedido é o
  // workspace dessa conversa.
  ["/pedidos", "voce"],
  ["/denuncias", "voce"],
  ["/ajuda", "voce"],
  // "Meus anúncios" é coisa da pessoa (activeTab() do protótipo → 'voce'),
  // embora o caminho de entrada esteja no Mercado.
  ["/meus-anuncios", "voce"],
]

// activeTab() returns `origin` for discovery destinations without a dedicated tab.
export const SHARED_AREAS = [
  "/explorar",
  "/guide",
  "/events",
  "/mercado",
  "/imoveis",
  "/prestadores",
  "/localidade",
  "/cidade",
] as const

const LAST_ROOT_KEY = "bivaque:last-navigation-root"
const HISTORY_ORIGIN_KEY = "bivaqueOrigem"

function isPrimaryContainer(value: unknown): value is PrimaryContainer {
  return PRIMARY_CONTAINERS.some((id) => id === value)
}

function readLastRoot(): PrimaryContainer | null {
  try {
    const value: unknown = window.sessionStorage.getItem(LAST_ROOT_KEY)
    return isPrimaryContainer(value) ? value : null
  } catch {
    return null
  }
}

export function rememberNavigationOrigin(
  pathname: string,
  primary: readonly PrimaryNavItem[],
  currentOrigin: PrimaryContainer | null,
): PrimaryContainer {
  const root = primary.find((item) => matches(pathname, item.href))
  const owner = AREA_CONTAINERS.find(([prefix]) => matches(pathname, prefix))?.[1]
  const previousOrigin: unknown = window.history.state?.[HISTORY_ORIGIN_KEY]
  const origin =
    (root && isPrimaryContainer(root.id) ? root.id : null) ??
    owner ??
    (isPrimaryContainer(previousOrigin) ? previousOrigin : null) ??
    currentOrigin ??
    readLastRoot() ??
    "inicio"

  try {
    if (root && isPrimaryContainer(root.id)) {
      window.sessionStorage.setItem(LAST_ROOT_KEY, root.id)
    }
  } catch {
    // History state still preserves this entry when session storage is unavailable.
  }
  if (previousOrigin !== origin) {
    window.history.replaceState({ ...window.history.state, [HISTORY_ORIGIN_KEY]: origin }, "")
  }
  return origin
}

// Rotas que renderizam FORA do shell do membro: funil de entrada, onboarding,
// console do operador, painel do prestador e raiz pública. Não têm lateral, e
// declaram isso em vez de escolher um container plausível. A lista é explícita
// de propósito: uma rota nova sem área acima e sem prefixo aqui NÃO cai em
// Início — `declaredContainerFor` devolve `null` e o teste reprova.
export const OUTSIDE_SHELL_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/consent",
  "/onboarding",
  "/auth",
  "/recuperar-senha",
  "/nova-senha",
  "/admissions",
  "/reports",
  "/arrivals",
  "/guide-queue",
  "/prestador",
  // O convite de prestador é pré-autenticação (prancha 79, painel 2). O prefixo
  // é próprio porque `/prestador` não casa com ele: `matches` compara o caminho
  // inteiro ou o prefixo seguido de "/", e "prestador-convite" não é
  // "prestador/…".
  "/prestador-convite",
] as const

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

// O container declarado de uma área, ou `null` quando a rota não tem container
// declarado. `null` é o sinal que o teste usa para reprovar — nunca um vizinho.
export function declaredContainerFor(pathname: string): PrimaryContainer | null {
  const area = AREA_CONTAINERS.find(([prefix]) => matches(pathname, prefix))
  if (area) return area[1]
  return SHARED_AREAS.some((prefix) => matches(pathname, prefix)) ? "inicio" : null
}

// Rotas que sabidamente vivem fora do shell do membro (sem lateral).
export function livesOutsideShell(pathname: string): boolean {
  return OUTSIDE_SHELL_PREFIXES.some((prefix) => matches(pathname, prefix))
}

export function resolveActiveNav(
  pathname: string,
  primary: readonly PrimaryNavItem[],
  origin: PrimaryContainer = "inicio",
): ActiveNav {
  const secondary = SECONDARY_SELF_ROUTES.find((href) => matches(pathname, href))
  if (secondary) return { kind: "secondary", href: secondary }

  const primaryMatch = primary.find((item) => matches(pathname, item.href))
  if (primaryMatch) return { kind: "primary", id: primaryMatch.id }

  if (SHARED_AREAS.some((prefix) => matches(pathname, prefix))) {
    return { kind: "primary", id: origin }
  }

  const container = declaredContainerFor(pathname)
  if (container) return { kind: "primary", id: container }

  // Sem container declarado: nada acende. O teste de escopo reprova a rota.
  return { kind: "none" }
}
