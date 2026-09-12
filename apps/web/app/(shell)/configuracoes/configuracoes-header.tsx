"use client"

import { usePathname } from "next/navigation"

// Prancha 52: o H1 da área de Configurações. A área continua nomeada
// ("Configurações") e cada subtela entra no MESMO h1 com o próprio nome, para
// que a captura da subtela errada deixe de passar como válida — RECON-042,
// defeito 3. Um h1 por tela, como a auditoria exige; as páginas filhas usam h2.
//
// O layout é servidor e não recebe o pathname, por isso este cabeçalho é um
// componente cliente: é o único jeito de o título refletir a subtela sem
// transformar a área em quatro telas sem nome.
const SECTION_NAMES: Record<string, string> = {
  conta: "Conta",
  notificacoes: "Notificações",
  familia: "Família",
  bloqueados: "Privacidade",
}

export function ConfiguracoesHeader() {
  const pathname = usePathname()
  const section = SECTION_NAMES[pathname.split("/")[2] ?? ""]

  return (
    <div className="sticky top-12 z-30 border-b border-border bg-[var(--semantic-surface)]">
      <div className="mx-auto flex max-w-2xl items-center px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">
          {section ? `Configurações · ${section}` : "Configurações"}
        </h1>
      </div>
    </div>
  )
}
