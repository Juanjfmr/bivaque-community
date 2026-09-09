"use client"

import { ErrorState } from "../../components/bivaque/error-state"

interface QueryErrorProps {
  message: string
}

// Falha de consulta nunca é fila vazia: o estado de erro é renderizado com
// nova tentativa explícita (contrato RECON-010, spec §3.3 item 4). O retry
// recarrega a rota — os loaders voltam a consultar o banco.
export function QueryError({ message }: QueryErrorProps) {
  return <ErrorState message={message} onRetry={() => window.location.reload()} />
}
