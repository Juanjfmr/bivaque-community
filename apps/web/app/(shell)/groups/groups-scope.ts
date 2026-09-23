// FE-GRUPOS-ALCANCAVEIS (19/09/2026) — quais cidades a lista de grupos cobre.
//
// O defeito que este módulo corrige: `(shell)/groups/page.tsx` reconsultava
// `locality_memberships` com `.limit(1)` e **sem filtro de `kind`**. Para quem
// tem transferência declarada (uma linha `current` e uma `leaving`) a consulta
// devolvia a linha `leaving` — a cidade de ORIGEM — enquanto `(shell)/layout.tsx`
// escrevia a `current` no cabeçalho. O membro via os grupos da cidade errada e
// os da cidade onde mora sumiam, sem erro nenhum na tela. Medido contra a
// revisão de produção (`main` 90e4c94) com o JWT de uma conta transferida.
//
// Agora a cidade vem do provider do shell — fonte única, resolvida no servidor
// por `kind = 'current'` — e a lista cobre **as duas** cidades enquanto o vínculo
// de saída existir: o ADR-20260816 diz que a origem continua legível e
// publicável até o prazo declarado, então esconder os grupos de lá seria uma
// regressão nova em cima do defeito antigo. Grupo que não é da cidade corrente
// aparece com o nome da cidade dele, nunca misturado sem rótulo.

import type { LocalityCurrent, LocalityOutbound } from "../../../lib/locality-context"

export type GroupsScope = {
  /** Cidades cobertas pela lista, a cidade corrente primeiro. */
  localityIds: string[]
  /** Rótulo real de cada cidade, para marcar o grupo que não é daqui. */
  cityLabelByLocalityId: Map<string, string>
  /** Mais de uma cidade em jogo: o rótulo de cidade passa a ser necessário. */
  multipleCities: boolean
  /** Descrição do cabeçalho da lista. */
  headline: string
}

function cityLabel(locality: { cityName: string; stateCode: string }): string {
  return locality.stateCode ? `${locality.cityName}, ${locality.stateCode}` : locality.cityName
}

export function resolveGroupsScope(
  current: LocalityCurrent,
  outbound: LocalityOutbound | null,
): GroupsScope {
  const localityIds = [current.id]
  const cityLabelByLocalityId = new Map<string, string>([[current.id, cityLabel(current)]])

  // `id !== current.id` não é paranoia: uma transferência declarada para a
  // cidade em que a pessoa já está é recusada pelo RPC, mas a linha de saída
  // pode ter sido criada antes disso por outro caminho — e listar a mesma
  // cidade duas vezes marcaria todo grupo como "de fora".
  if (outbound !== null && outbound.id !== current.id) {
    localityIds.push(outbound.id)
    cityLabelByLocalityId.set(outbound.id, cityLabel(outbound))
  }

  const multipleCities = localityIds.length > 1
  return {
    localityIds,
    cityLabelByLocalityId,
    multipleCities,
    headline: multipleCities ? "Grupos das suas cidades." : "Grupos da sua cidade.",
  }
}
