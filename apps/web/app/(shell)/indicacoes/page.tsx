"use client"

import { useSearchParams } from "next/navigation"
import { useLocalityContext } from "../../../lib/locality-context"
import { IndicationsPanel } from "../../components/indications/indications-panel"

// Indicações da cidade (ADR-20260925-memoria-de-indicacoes): o lugar onde um
// pedido não some dez minutos depois. `?pedir=1` chega com a caixa focada — é o
// destino de "Pedir uma indicação" no botão de criar e no Início.

export default function IndicacoesPage() {
  const { current } = useLocalityContext()
  const searchParams = useSearchParams()
  const autoFocusAsk = searchParams.get("pedir") === "1"

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 sm:pt-6 lg:px-8">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-ui-ink sm:text-2xl">Indicações</h1>
        <p className="mt-1 text-sm text-ui-ink-2">
          O que {current.cityName} já perguntou e respondeu.
        </p>
      </header>
      <IndicationsPanel
        localityId={current.id}
        cityName={current.cityName}
        autoFocusAsk={autoFocusAsk}
      />
    </div>
  )
}
