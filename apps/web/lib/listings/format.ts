import {
  informedTotalCents,
  LISTING_COST_UNINFORMED_LABEL,
  LISTING_PROPERTY_TYPE_LABELS,
  type ListingPropertyType,
} from "@bivaque/domain"
import type { PropertyDetailRow } from "./types"

// FIGMA-002 — rótulos de custo e especificação das pranchas property-*, com a
// regra D6 no centro: valor ausente é "Consultar anunciante", nunca R$ 0,00,
// e o total informado soma somente custos presentes.

export function formatBrl(cents: number): string {
  const reais = cents / 100
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(reais) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

/** "R$ 3.200" para o card e o painel; null vira o rótulo honesto do D6. */
export function rentLabel(rentCents: number | null): string | null {
  if (rentCents === null) return null
  return formatBrl(rentCents)
}

/** Rodapé do card: "+R$ 720 condomínio", "Sem condomínio" ou o rótulo D6. */
export function condoFooterLabel(condoCents: number | null): string {
  if (condoCents === null) return LISTING_COST_UNINFORMED_LABEL
  if (condoCents === 0) return "Sem condomínio"
  return `+${formatBrl(condoCents)} condomínio`
}

export interface ListingCostLines {
  rent: string
  condo: string
  iptu: string
  total: string | null
}

/** Painel de custos do detalhe: cada linha própria + total somente informado. */
export function costLinesFor(details: PropertyDetailRow): ListingCostLines {
  const total = informedTotalCents(
    details.rent_cents,
    details.condo_included_in_rent ? null : details.condo_fee_cents,
    details.iptu_cents,
  )
  return {
    rent:
      details.rent_cents === null ? LISTING_COST_UNINFORMED_LABEL : formatBrl(details.rent_cents),
    condo:
      details.condo_fee_cents === null
        ? LISTING_COST_UNINFORMED_LABEL
        : details.condo_fee_cents === 0
          ? "Sem condomínio"
          : formatBrl(details.condo_fee_cents),
    iptu:
      details.iptu_cents === null ? LISTING_COST_UNINFORMED_LABEL : formatBrl(details.iptu_cents),
    total: total === null ? null : formatBrl(total),
  }
}

/** "3 quartos · 98 m²" — só o que existe entra na linha. */
export function specsLabel(details: PropertyDetailRow): string {
  const parts: string[] = []
  if (details.bedrooms !== null) parts.push(`${details.bedrooms} quartos`)
  if (details.area_m2 !== null) parts.push(`${details.area_m2} m²`)
  if (details.parking_spots !== null) parts.push(`${details.parking_spots} vagas`)
  return parts.join(" · ")
}

export function propertyTypeLabel(type: ListingPropertyType): string {
  return LISTING_PROPERTY_TYPE_LABELS[type] ?? type
}

/** Specs da prévia de revisão a partir do texto do formulário (só cliente). */
export function specsLabelLike(bedrooms: string, areaM2: string): string {
  const parts: string[] = []
  if (bedrooms.trim() !== "") parts.push(`${bedrooms.trim()} quartos`)
  if (areaM2.trim() !== "") parts.push(`${areaM2.trim()} m²`)
  return parts.join(" · ")
}
