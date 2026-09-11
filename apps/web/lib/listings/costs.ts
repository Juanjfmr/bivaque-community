// RECON-027 — modelo de custo de Moradia.
//
// Regra da prancha 19 e do ADR (D6): aluguel, condomínio e IPTU são colunas
// separadas e anuláveis; `null` significa "não informado" e a tela mostra
// "Consultar anunciante". Custo ausente NUNCA vira R$ 0,00 e NUNCA entra em
// soma. Este módulo existe para que essa regra seja uma função testável, e não
// um `?? 0` esquecido no JSX.

import type { ListingDeal } from "./types"

export interface PropertyCosts {
  rentCents: number | null
  condoFeeCents: number | null
  iptuCents: number | null
  salePriceCents: number | null
}

export interface CostLine {
  key: "rent" | "condo" | "iptu"
  label: string
  amountCents: number | null
  display: string
  // `true` quando o valor não foi informado — a UI usa isto para o texto
  // "Consultar anunciante" e para nunca somar.
  unknown: boolean
}

export const UNKNOWN_COST_LABEL = "Consultar anunciante"

export function formatMoney(cents: number): string {
  // Preços de imóvel são valores cheios; os centavos só aparecem quando
  // existem ("R$ 2.200", não "R$ 2.200,00"), mas nunca são truncados.
  const fractionDigits = cents % 100 === 0 ? 0 : 2
  return (cents / 100)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    .replace(/\u00a0/g, " ")
}

function costLine(key: CostLine["key"], label: string, amountCents: number | null): CostLine {
  return {
    key,
    label,
    amountCents,
    display: amountCents === null ? UNKNOWN_COST_LABEL : formatMoney(amountCents),
    unknown: amountCents === null,
  }
}

// As três linhas do rail da prancha 19. Aluguel e venda são exclusivos por
// construção da tabela; as linhas exibidas são as de custo mensal.
export function propertyCostLines(costs: PropertyCosts): CostLine[] {
  return [
    costLine("rent", "Aluguel", costs.rentCents),
    costLine("condo", "Condomínio (aprox.)", costs.condoFeeCents),
    costLine("iptu", "IPTU (aprox.)", costs.iptuCents),
  ]
}

// Preço em destaque. Aluguel é por mês; venda é valor único. Ausente nos dois
// é "Consultar anunciante", nunca "R$ 0".
export function headlinePrice(
  deal: ListingDeal,
  costs: Pick<PropertyCosts, "rentCents" | "salePriceCents">,
): string {
  if (deal === "rent") {
    return costs.rentCents === null ? UNKNOWN_COST_LABEL : `${formatMoney(costs.rentCents)}/mês`
  }
  return costs.salePriceCents === null ? UNKNOWN_COST_LABEL : formatMoney(costs.salePriceCents)
}

// Soma que se recusa a mentir: se qualquer componente mensal é desconhecido, o
// total é `null` — jamais a soma dos conhecidos tratando o ausente como zero.
export function sumCosts(lines: CostLine[]): number | null {
  let total = 0
  for (const line of lines) {
    if (line.amountCents === null) return null
    total += line.amountCents
  }
  return total
}
