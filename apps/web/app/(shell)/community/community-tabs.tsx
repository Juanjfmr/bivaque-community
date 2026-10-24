"use client"

import { Tabs } from "@heroui/react"
import type { Route } from "next"
import { usePathname } from "next/navigation"

// As abas da Comunidade do protótipo (renderCommunity em
// prototypes/bivaque-html/src/features/community/views.js): Indicações e Grupos.
// A terceira aba do protótipo, Negócios, entra com o lote 6 (ADR-20261023).
//
// A troca é por ROTA, não por estado escondido: Indicações é a própria
// Comunidade da cidade (/community) e Grupos é a lista de grupos (/groups,
// que o lote 5 B ainda está portando). Assim o endereço de cada aba é
// compartilhável e o botão "voltar" do navegador funciona, como nos itens da
// barra. Explícito e testável; a fileira vive na rota /community.

const INDICACOES_HREF: Route = "/community"
const GRUPOS_HREF: Route = "/groups"

export function CommunityTabs() {
  const pathname = usePathname()
  const selectedKey = pathname.startsWith(GRUPOS_HREF) ? "grupos" : "indicacoes"

  return (
    <Tabs selectedKey={selectedKey} className="tabs--secondary" aria-label="Seções da Comunidade">
      <Tabs.ListContainer>
        <Tabs.List aria-label="Seções da Comunidade">
          <Tabs.Tab id="indicacoes" href={INDICACOES_HREF}>
            Indicações
          </Tabs.Tab>
          <Tabs.Tab id="grupos" href={GRUPOS_HREF}>
            Grupos
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  )
}
