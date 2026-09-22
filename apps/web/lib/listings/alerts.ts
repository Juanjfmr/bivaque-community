// RECON-028 — prancha 65, painel 2. Lógica pura do alerta de Moradia:
// critérios, situação, data e o link de volta aos resultados. Sem React e sem
// banco, para que a regra seja uma função testável — o cartão do alerta e o
// painel de edição consomem daqui.

import { formatMoney } from "./costs"
import { filtersToQuery, type ListingFilters, valueFilterLabel } from "./filters"
import type { ListingDeal, ListingKind } from "./types"

export interface ListingAlert {
  id: string
  name: string
  kind: ListingKind
  localityId: string | null
  neighborhood: string | null
  deal: ListingDeal | null
  maxValueCents: number | null
  minBedrooms: number | null
  isActive: boolean
  createdAt: string
}

export const ALERT_NAME_MIN = 2
export const ALERT_NAME_MAX = 80

// "Aluguel · Até R$ 2.500 · 2+ quartos" — os critérios do cartão, separados por
// ponto médio, como a prancha 65.
export function alertCriteriaParts(alert: ListingAlert): string[] {
  const parts: string[] = []
  if (alert.deal === "rent") parts.push("Aluguel")
  if (alert.deal === "sale") parts.push("Venda")
  if (alert.maxValueCents !== null) parts.push(`Até ${formatMoney(alert.maxValueCents)}`)
  if (alert.minBedrooms !== null) parts.push(`${alert.minBedrooms}+ quartos`)
  return parts
}

export function alertCriteriaLabel(alert: ListingAlert): string {
  const parts = alertCriteriaParts(alert)
  return parts.length > 0 ? parts.join(" · ") : "Todos os imóveis"
}

export function formatAlertDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}`
}

// "Ativo · Criado em 20/05/2024" — a linha de situação do cartão.
export function alertStatusLabel(alert: ListingAlert): string {
  const situation = alert.isActive ? "Ativo" : "Inativo"
  const created = formatAlertDate(alert.createdAt)
  return created === "" ? situation : `${situation} · Criado em ${created}`
}

// Abrir o alerta leva aos resultados com os mesmos critérios normalizados.
export function alertSearchHref(alert: ListingAlert): string {
  const filters: ListingFilters = {
    search: null,
    neighborhood: alert.neighborhood,
    deal: alert.deal,
    maxValueCents: alert.maxValueCents,
    minBedrooms: alert.minBedrooms,
    propertyType: null,
    sort: "recent",
  }
  return `/imoveis${filtersToQuery(filters)}`
}

// O rótulo do teto de valor: "Aluguel máximo" quando não inclui condomínio.
export function alertValueLabel(deal: ListingDeal | null): string {
  return valueFilterLabel(deal)
}
