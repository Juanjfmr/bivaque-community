/**
 * Os 100 ícones do inventário (seção 9), como Material Symbols locais.
 *
 * Autoridade: `docs/agents/prototipo-shadcn/inventario.md` §9 e o ADR §2
 * ("Ícones: os Material Symbols do protótipo, hospedados localmente, com só os
 * ícones usados"). O nome do ícone **é** a ligadura da fonte: não há tabela de
 * tradução, há um conjunto fechado de nomes válidos.
 *
 * A fonte é a mesma do protótipo, extraída de
 * `prototypes/bivaque-html/src/styles/fonts.css` para `apps/app/public/fonts/`
 * — nenhum pacote, nenhuma rede. A conferência de que os 100 nomes existem na
 * fonte está em `tests/icones.test.ts` (a lista de glifos do subconjunto) e na
 * prova de navegador (`tests/e2e/icones.spec.ts`, que mede o glifo desenhado).
 *
 * O item 1 das notas do §9 fica de fora de propósito: o bloco "Saúde" da busca
 * usa um SVG próprio (`SVG_HEALTH`), não um Material Symbol.
 */

export const ICONES_DE_NAVEGACAO = [
  "arrow_back",
  "chevron_left",
  "chevron_right",
  "close",
  "expand_more",
  "menu",
  "more_vert",
  "home",
  "search",
  "settings",
  "tune",
  "sort",
  "list",
  "map",
  "refresh",
  "logout",
  "lock",
] as const

export const ICONES_DE_LOCALIZACAO = [
  "place",
  "pin",
  "location_on",
  "location_off",
  "travel_explore",
] as const

export const ICONES_DE_AVISO_E_PESSOAS = [
  "notifications",
  "notifications_active",
  "notifications_none",
  "notifications_off",
  "check",
  "check_circle",
  "cancel",
  "error",
  "info",
  "hourglass_top",
  "timer",
  "schedule",
  "bolt",
  "auto_awesome",
  "flag",
  "report",
  "gavel",
  "shield_person",
  "verified_user",
  "badge",
  "admin_panel_settings",
  "support",
  "public",
  "person",
  "person_add",
  "group",
  "group_add",
  "groups",
  "undo",
] as const

export const ICONES_DE_CONTEUDO_E_MIDIA = [
  "chat_bubble",
  "forum",
  "send",
  "thumb_up",
  "volunteer_activism",
  "history_edu",
  "history",
  "ballot",
  "how_to_vote",
  "interests",
  "image",
  "photo_camera",
  "add_photo_alternate",
  "edit",
  "edit_square",
  "delete",
  "content_copy",
  "link",
  "share",
  "open_in_new",
  "upload",
  "bookmark",
  "bookmark_border",
  "bookmark_remove",
  "remove",
  "add",
] as const

export const ICONES_DE_MERCADO_E_ROTINA = [
  "sell",
  "storefront",
  "build",
  "local_shipping",
  "apartment",
  "home_work",
  "pets",
  "school",
  "child_care",
  "family_restroom",
  "directions_run",
  "flight_land",
  "request_quote",
  "inbox",
  "add_business",
  "checklist",
  "event",
  "event_available",
  "event_busy",
  "trending_up",
  "search_off",
  "visibility",
  "visibility_off",
] as const

export const GRUPOS_DE_ICONE = {
  "9.1": ICONES_DE_NAVEGACAO,
  "9.2": ICONES_DE_LOCALIZACAO,
  "9.3": ICONES_DE_AVISO_E_PESSOAS,
  "9.4": ICONES_DE_CONTEUDO_E_MIDIA,
  "9.5": ICONES_DE_MERCADO_E_ROTINA,
} as const

export type GrupoDeIcone = keyof typeof GRUPOS_DE_ICONE

export const NOMES_DE_ICONE = [
  ...ICONES_DE_NAVEGACAO,
  ...ICONES_DE_LOCALIZACAO,
  ...ICONES_DE_AVISO_E_PESSOAS,
  ...ICONES_DE_CONTEUDO_E_MIDIA,
  ...ICONES_DE_MERCADO_E_ROTINA,
] as const

export type NomeDeIcone = (typeof NOMES_DE_ICONE)[number]

const CONJUNTO: ReadonlySet<string> = new Set<string>(NOMES_DE_ICONE)

export function nomeDeIconeValido(valor: unknown): valor is NomeDeIcone {
  return typeof valor === "string" && CONJUNTO.has(valor)
}

/**
 * Nome de ícone vindo de dado (inventário §9, nota 2: `ic:`/`icon:` precisam
 * entrar como chave de mapa tipado, nunca como literal solto no JSX). Sem
 * correspondência, cai no `photo_camera` do protótipo
 * (`shell/primitives.js:3`).
 */
export function iconeDeDado(valor: unknown): NomeDeIcone {
  return nomeDeIconeValido(valor) ? valor : "photo_camera"
}

/** Ligadura desenhada na fonte. O nome já é a ligadura. */
export function ligadura(nome: NomeDeIcone): string {
  return nome
}
