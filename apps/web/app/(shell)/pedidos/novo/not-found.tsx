import { SegmentNotFound } from "../../../components/bivaque/segment-fallbacks"

// Destinatário ausente ou sem permissão devolve o mesmo estado, sem revelar
// existência privada.
export default function NotFound() {
  return <SegmentNotFound />
}
