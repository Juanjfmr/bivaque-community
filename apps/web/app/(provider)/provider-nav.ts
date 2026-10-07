import type { Route } from "next"

// FIGMA-001 — reparos finais (despacho Codex 06/10/2026): a decisão pura da
// navegação do painel do prestador, separada da apresentação pelo mesmo motivo
// que conversas-loaders.ts existe: o Vitest da casa roda em node sem DOM nem
// transform de JSX, então a regra testável mora aqui e o componente
// (provider-navigation.tsx) só a consome.

export type ProviderNavId = "painel" | "conversas" | "ficha" | "catalogo"

export interface ProviderNavEntry {
  id: ProviderNavId
  label: string
  href: Route
}

// Painel é a entrada de chegada do shell e também o fallback do casamenteiro:
// constante nomeada para a lista e para o piso caminharem sempre juntos.
const PANEL_ENTRY: ProviderNavEntry = {
  id: "painel",
  label: "Painel",
  href: "/prestador" as Route,
}

export const PROVIDER_NAV_ENTRIES: ProviderNavEntry[] = [
  PANEL_ENTRY,
  { id: "conversas", label: "Conversas", href: "/prestador/conversas" as Route },
  { id: "ficha", label: "Minha ficha", href: "/prestador/ficha" as Route },
  { id: "catalogo", label: "Catálogo e portfólio", href: "/prestador/catalogo" as Route },
]

// Exatamente um ativo, a mesma regra nav-active do shell do membro
// (app-shell.tsx): /prestador é prefixo de toda rota do painel, então o
// prefixo MAIS LONGO que casa vence (conversas/ficha/catalogo sobre painel) e
// o thread /prestador/conversas/<id> herda Conversas. O sufixo "/" impede que
// prefixo de segmento vaze (/prestador/catalogacao não é catálogo). Caminho
// desconhecido recai em Painel — o container de chegada — em vez de deixar a
// navegação sem item atual.
export function activeProviderNavId(pathname: string): ProviderNavId {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  let active: ProviderNavEntry = PANEL_ENTRY
  for (const entry of PROVIDER_NAV_ENTRIES) {
    const matches = normalized === entry.href || normalized.startsWith(`${entry.href}/`)
    if (matches && entry.href.length > active.href.length) active = entry
  }
  return active.id
}
