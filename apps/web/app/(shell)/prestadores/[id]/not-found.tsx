import { SegmentNotFound } from "../../../components/bivaque/segment-fallbacks"

// FIGMA-001, reparo da revisão independente (rodada 1/3, 06/10/2026): boundary
// pt-BR do segmento /prestadores/[id] — antes caía no 404 default em inglês do
// Next. Não toca policy, ficha nem ator da negação. Atenção ao status: no
// Next 16 o notFound() desta rota responde HTTP 200 com esta UI (streaming —
// lição registrada em page.tsx e confirmada em runtime no build isolado em
// 06/10/2026); a prova externa da fronteira can_see_provider é conteúdo
// presente/ausente, nunca o código HTTP.
export default function ProviderNotFound() {
  return <SegmentNotFound />
}
