import { SegmentNotFound } from "../../../components/bivaque/segment-fallbacks"

// Ficha retirada ou sem permissão devolve o mesmo estado sem revelar
// existência privada (a RLS já esconde a linha; aqui não há distinção entre
// "não existe" e "você não pode ver").
export default function NotFound() {
  return <SegmentNotFound />
}
