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
export const PRIMARY_CONTAINERS = ["inicio", "explorar", "comunidades", "perfil"] as const

export type PrimaryContainer = (typeof PRIMARY_CONTAINERS)[number]

// Destinos secundários que representam a si mesmos na lateral porque têm item
// próprio desenhado em app-shell.tsx. `/notifications` fica DE FORA de
// propósito: o contrato DS-011 (tests/e2e/nav-container-invariant.spec.ts)
// exige que ela continue caindo em "perfil". Só `/salvos` acende a si mesma.
export const SECONDARY_SELF_ROUTES = ["/salvos"] as const

// A que container cada ÁREA pertence. É a regra de produto, não uma lista de
// telas: o prefixo da área resolve, e a tela herda o container do pai
// conceitual (DESIGN_SYSTEM §7.1; PROCESSO-DE-CONSTRUCAO §7):
//
//   Explorar    → descoberta, busca, Guia, Mercado, serviços, moradia, eventos
//   Comunidades → comunidades e grupos (grupos vivem dentro de uma comunidade)
//   Perfil      → dados da pessoa, conta, notificações e a conversa contextual
//
// Ordem importa: o prefixo mais específico primeiro. A comparação é por
// fronteira (`matches`), então `/prestadores` não casa `/prestador`.
export const AREA_CONTAINERS: ReadonlyArray<readonly [string, PrimaryContainer]> = [
  ["/inicio", "inicio"],
  ["/explorar", "explorar"],
  ["/guide", "explorar"],
  ["/events", "explorar"],
  ["/mercado", "explorar"],
  // Decisão do dono em 12/09/2026, contra o DESIGN_SYSTEM §7, que manda a
  // gestão dos próprios anúncios para Perfil. Os cinco caminhos de entrada
  // desta tela estão todos dentro do Mercado, e Perfil não tem nenhum. O §7
  // não está errado, está não construído: no dia em que Perfil ganhar uma
  // entrada para cá, esta linha muda junto com ela. Comparar com /salvos, que
  // é igualmente "coisa da pessoa" e fica em Perfil — porque tem item próprio
  // na lateral, isto é, é alcançável de lá.
  ["/meus-anuncios", "explorar"],
  ["/imoveis", "explorar"],
  ["/recommendations", "explorar"],
  // Indicações é uma vista da comunidade (ADR-20260925-memoria-de-indicacoes).
  ["/indicacoes", "comunidades"],
  ["/prestadores", "explorar"],
  ["/communities", "comunidades"],
  ["/community", "comunidades"],
  ["/groups", "comunidades"],
  ["/profile", "perfil"],
  ["/configuracoes", "perfil"],
  ["/messages", "perfil"],
  ["/notifications", "perfil"],
  // A conversa contextual membro↔prestador vive em Perfil, e o pedido é o
  // workspace dessa conversa (DESIGN_SYSTEM §7.1).
  ["/pedidos", "perfil"],
  ["/denuncias", "perfil"],
  ["/ajuda", "perfil"],
  // Não existe container "cidade" nesta versão (PROCESSO §7), então a pergunta
  // é de onde se chega aqui. Dentro do shell, os dois únicos links para
  // /localidade estão em Explorar — `explorar/busca` e `explorar/servicos`. O
  // terceiro é a tela de boas-vindas do onboarding, que roda fora do shell e
  // não tem lateral para acender. A lateral responde "onde estou e como volto",
  // não "de quem é o dado": acender Perfil aqui mandaria a pessoa para um
  // container que não alcança esta tela.
  ["/localidade", "explorar"],
  // Consulta a outra cidade (25/09/2026): é descoberta — Guia, encontros e
  // anúncios de outro lugar —, e a volta é pelo mesmo caminho de /localidade.
  ["/cidade", "explorar"],
]

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
  return area ? area[1] : null
}

// Rotas que sabidamente vivem fora do shell do membro (sem lateral).
export function livesOutsideShell(pathname: string): boolean {
  return OUTSIDE_SHELL_PREFIXES.some((prefix) => matches(pathname, prefix))
}

export function resolveActiveNav(pathname: string, primary: readonly PrimaryNavItem[]): ActiveNav {
  const secondary = SECONDARY_SELF_ROUTES.find((href) => matches(pathname, href))
  if (secondary) return { kind: "secondary", href: secondary }

  const primaryMatch = primary.find((item) => matches(pathname, item.href))
  if (primaryMatch) return { kind: "primary", id: primaryMatch.id }

  const container = declaredContainerFor(pathname)
  if (container) return { kind: "primary", id: container }

  // Sem container declarado: nada acende. O teste de escopo reprova a rota.
  return { kind: "none" }
}
