"use client"

import { ErrorState } from "../../../components/bivaque/error-state"

// Estado recuperavel do detalhe. Um unico h1 permanece na tela mesmo quando a
// consulta falha; a retomada refaz a consulta que falhou.
export default function SegmentErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-8">
      <h1 className="text-2xl font-semibold tracking-tight">Pedido de serviço</h1>
      <div className="mt-4">
        <ErrorState message="Não foi possível carregar este pedido." onRetry={reset} />
      </div>
    </div>
  )
}
