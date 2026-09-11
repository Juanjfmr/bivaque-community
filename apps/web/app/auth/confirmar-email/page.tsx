import type { Metadata } from "next"
import { Suspense } from "react"
import { ConfirmarEmailClient } from "./confirmar-email-client"

// O título da página não leva endereço nem código: o contrato proíbe expor
// e-mail em query string, log OU título (RECON-018, forbidden).
export const metadata: Metadata = {
  title: "Confira seu e-mail — Bivaque",
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarEmailClient />
    </Suspense>
  )
}
