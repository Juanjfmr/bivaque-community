// Resolução do item ativo da navegação da lateral a partir da ROTA.
//
// Bug que originou o RECON-038: `/salvos` era tratada como "destino pessoal" e
// caía no fallback "perfil" — a lateral acendia **Perfil** enquanto a pessoa
// estava em Salvos. Isso é defeito de navegação, não de estilo: o item ativo
// tem que sair da rota, nunca de um fallback que escolhe um vizinho plausível.
//
// O módulo é puro (sem React, sem Next) de propósito — é o que permite testar
// a regressão em tests/unit/ui/shell-active-nav.test.ts no ambiente node do
// Vitest da casa, sem DOM nem testing-library.

export type PrimaryNavItem = {
  id: string
  href: string
}

export type ActiveNav = { kind: "primary"; id: string } | { kind: "secondary"; href: string }

// Destinos secundários que representam a si mesmos na lateral porque têm item
// próprio desenhado em app-shell.tsx. `/notifications` fica DE FORA de
// propósito: o contrato DS-011 (tests/e2e/nav-container-invariant.spec.ts)
// exige que ela continue caindo em "perfil". Só `/salvos` acende a si mesma.
export const SECONDARY_SELF_ROUTES = ["/salvos"] as const

// Rotas que vivem sob "Perfil" sem item primário próprio (DESIGN_SYSTEM §7.1):
// mensagens contextuais, notificações, denúncias e ajuda.
export const PERSONAL_FALLBACK_PREFIXES = [
  "/messages",
  "/notifications",
  "/denuncias",
  "/ajuda",
] as const

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function resolveActiveNav(pathname: string, primary: readonly PrimaryNavItem[]): ActiveNav {
  const secondary = SECONDARY_SELF_ROUTES.find((href) => matches(pathname, href))
  if (secondary) return { kind: "secondary", href: secondary }

  const primaryMatch = primary.find((item) => matches(pathname, item.href))
  if (primaryMatch) return { kind: "primary", id: primaryMatch.id }

  const personal = PERSONAL_FALLBACK_PREFIXES.some((prefix) => matches(pathname, prefix))
  return { kind: "primary", id: personal ? "perfil" : "inicio" }
}
