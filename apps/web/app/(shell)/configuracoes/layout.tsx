import type { ReactNode } from "react"
import { ConfiguracoesHeader } from "./configuracoes-header"
import { ConfiguracoesNav } from "./configuracoes-nav"

// Prancha 52: o H1 da área fica FORA do cartão; dentro dele, a coluna vertical
// de seções à esquerda e o conteúdo da seção à direita. O layout embrulha todas
// as subrotas e o h1 carrega o nome da área + o nome da subtela (RECON-042,
// defeito 3), então cada página filha usa h2 — nunca um segundo h1, que a
// auditoria reprova.
export default function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <ConfiguracoesHeader />
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <ConfiguracoesNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
