import { SegmentNotFound } from "../../../components/bivaque/segment-fallbacks"

// Entrada inexistente, não-aprovada e de outra cidade chegam aqui pelo mesmo
// caminho (notFound() na página). A resposta não distingue os casos — é o
// que impede a tela de vazar a existência de uma entrada pendente.
export default function NotFound() {
  return <SegmentNotFound />
}
