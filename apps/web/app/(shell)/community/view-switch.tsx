"use client"

import { Tabs } from "@heroui/react"
import type { Route } from "next"
import { useRouter } from "next/navigation"

// Duas vistas da mesma comunidade (ADR-20260925-memoria-de-indicacoes): a
// conversa corre, as indicações ficam. A vista mora na URL para "Pedir uma
// indicação" e o botão voltar chegarem nela.

export type CommunityView = "conversa" | "indicacoes"

const VIEW_TABS: { key: CommunityView; label: string }[] = [
  { key: "conversa", label: "Conversa" },
  { key: "indicacoes", label: "Indicações" },
]

export function readCommunityView(vista: string | null): CommunityView {
  return vista === "indicacoes" ? "indicacoes" : "conversa"
}

export function CommunityViewSwitch({ view }: { view: CommunityView }) {
  const router = useRouter()
  return (
    <Tabs
      aria-label="Vistas da comunidade"
      selectedKey={view}
      onSelectionChange={(key) =>
        router.replace(
          (key === "indicacoes" ? "/community?vista=indicacoes" : "/community") as Route,
          { scroll: false },
        )
      }
    >
      {/* RECON-047 — exceção declarada (não recebe `tabs--secondary`): é um
          seletor segmentado em pílula das duas vistas, com o mesmo peso, e a
          escolhida fica em superfície clara sobre o trilho. As abas de conteúdo
          abaixo dele usam o estilo do produto. */}
      <Tabs.List className="grid grid-cols-2 gap-1 rounded-full bg-ui-subtle p-1">
        {VIEW_TABS.map((item) => (
          <Tabs.Tab
            key={item.key}
            id={item.key}
            className="flex min-h-10 items-center justify-center rounded-full text-sm font-semibold text-ui-ink-2 transition-colors data-[selected=true]:bg-ui-surface data-[selected=true]:text-ui-ink data-[selected=true]:shadow-ui"
          >
            {item.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  )
}
