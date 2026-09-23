import { SegmentNotFound } from "../../../components/bivaque/segment-fallbacks"

// RUN-004: comunidade inexistente, removida ou fora do meu alcance chegam todas
// aqui pelo mesmo notFound() da página, e a resposta é a mesma nos três casos —
// é o que impede a tela de contar que uma comunidade restrita existe. Antes
// deste arquivo, o segmento não tinha boundary próprio e o resultado era a
// página padrão do Next, fora do shell e sem caminho de volta.
export default function NotFound() {
  return <SegmentNotFound />
}
