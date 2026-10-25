"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { FiltroDeIndicacoes } from "@/lib/dados/indicacoes"
import { COMUNIDADE } from "@/lib/demo/textos"

// Os chips de filtro do protótipo (`features/listings/catalog.js`,
// filterChips + `features/community/views.js`): Para ajudar, Resolvidas e
// Minhas. São um grupo de alternância única, com alvo de toque de 44 px.
const FILTROS: Array<{ id: FiltroDeIndicacoes; rotulo: string }> = [
  { id: "para-ajudar", rotulo: COMUNIDADE.filtros.ajudar },
  { id: "resolvidas", rotulo: COMUNIDADE.filtros.resolvidas },
  { id: "minhas", rotulo: COMUNIDADE.filtros.minhas },
]

export function ChipsDeFiltro({
  valor,
  aoMudar,
}: {
  valor: FiltroDeIndicacoes
  aoMudar: (filtro: FiltroDeIndicacoes) => void
}) {
  return (
    <ToggleGroup
      type="single"
      value={valor}
      onValueChange={(novo) => {
        if (novo) aoMudar(novo as FiltroDeIndicacoes)
      }}
      variant="outline"
      spacing={2}
      aria-label="Filtrar as perguntas"
      className="flex-wrap"
    >
      {FILTROS.map((filtro) => (
        <ToggleGroupItem
          key={filtro.id}
          value={filtro.id}
          aria-label={`Filtrar por ${filtro.rotulo}`}
          className="min-h-11 rounded-xl px-4 text-(--foreground) data-[state=on]:bg-(--secondary-container) data-[state=on]:text-(--secondary-foreground)"
        >
          {filtro.rotulo}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
