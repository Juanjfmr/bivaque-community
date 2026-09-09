"use client"

import { SegmentError } from "../../../components/bivaque/segment-fallbacks"

// RECON-013 — falha de leitura não é 404: a página-servidor lança quando a
// consulta ao guia falha, e esta borda oferece nova tentativa sobre o mesmo
// endereço. "Não existe" continua vindo apenas do notFound() honesto.
export default function GuideEntryErrorBoundary({ reset }: { reset: () => void }) {
  return <SegmentError onRetry={reset} />
}
