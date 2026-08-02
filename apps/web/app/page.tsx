import type { LocalityCode } from "@bivaque/contracts"
import { PILOT_LOCALITY_CODE } from "@bivaque/domain"
import { brandTokens } from "@bivaque/tokens"
import { Button } from "@heroui/react"

const pilotLocality: LocalityCode = PILOT_LOCALITY_CODE

export default function HomePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <section className="flex max-w-md flex-col items-start gap-4" aria-labelledby="page-title">
        <p className="text-sm font-medium text-muted">Manaus, AM</p>
        <h1 id="page-title" className="text-4xl font-semibold tracking-tight">
          {brandTokens.productName}
        </h1>
        <p className="text-base leading-7 text-muted">
          A fundação da comunidade privada está em preparação.
        </p>
        <Button variant="tertiary" isDisabled aria-label={`Piloto ${pilotLocality} em preparação`}>
          Ambiente privado
        </Button>
      </section>
    </main>
  )
}
