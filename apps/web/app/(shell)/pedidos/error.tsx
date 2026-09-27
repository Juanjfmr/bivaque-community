"use client"

import { ErrorState } from "../../components/bivaque/error-state"

// Estado recuperavel do segmento. Mantem o titulo da tela (um unico h1) acima
// do alerta, para a falha nao virar uma pagina sem cabeca.
export default function SegmentErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-8">
      <h1 className="text-2xl font-semibold tracking-tight">Meus orçamentos</h1>
      <div className="mt-4">
        <ErrorState message="Não foi possível carregar seus pedidos." onRetry={reset} />
      </div>
    </div>
  )
}
