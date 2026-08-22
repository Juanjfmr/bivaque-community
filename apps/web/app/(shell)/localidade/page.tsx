"use client"

// Onda T Task 4 — o seletor de localidade.
//
// Aterrissa no container "cidade" (ADR-20260816-shells-e-navegacao). A
// cidade corrente é sempre visível — CityReference já cumpre isso com o
// header. Quando o membro declarou transferência (LocalityContext.outbound
// não é null), esta tela ganha um segundo estado: a cidade de origem, com um
// aviso do que aquele estado significa antes que a pessoa tente publicar e
// descubra sozinha (a pergunta de suporte que o ADR registra como risco).
//
// O switcher NÃO muda qual localidade é "current" no banco — isso só muda
// via declare_locality_transfer / reverse_locality_transfer. É puramente
// qual referência de cidade está sendo lida nesta tela.

import { Tab, TabList, TabPanel, Tabs } from "@heroui/react"
import { useState } from "react"
import { type LocalityCurrent, useLocalityContext } from "../../../lib/locality-context"
import { CityReference } from "../../components/bivaque/city-reference"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"

function formatDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}

export default function LocalidadePage() {
  const { current, outbound } = useLocalityContext()
  const [viewingOutbound, setViewingOutbound] = useState(false)

  if (outbound === null) {
    return <CityReference />
  }

  const outboundAsCurrent: LocalityCurrent = {
    id: outbound.id,
    cityName: outbound.cityName,
    stateCode: outbound.stateCode,
  }

  return (
    <div className="mx-auto flex w-full max-w-[56rem] flex-col gap-4 px-4 pt-6">
      <Tabs
        aria-label="Escolher cidade"
        variant="primary"
        selectedKey={viewingOutbound ? "outbound" : "current"}
        onSelectionChange={(key) => setViewingOutbound(key === "outbound")}
        className="rounded-full"
      >
        <TabList
          aria-label="Cidades"
          className="flex w-full gap-2 rounded-full border border-border bg-[var(--surface-sunken)] p-1"
        >
          <Tab
            id="current"
            className="min-h-11 flex-1 rounded-full px-4 text-sm font-medium transition-colors text-muted hover:bg-surface-subtle aria-[selected=true]:bg-[var(--accent)] aria-[selected=true]:text-[var(--accent-foreground)]"
          >
            {current.cityName}
          </Tab>
          <Tab
            id="outbound"
            className="min-h-11 flex-1 rounded-full px-4 text-sm font-medium transition-colors text-muted hover:bg-surface-subtle aria-[selected=true]:bg-[var(--accent)] aria-[selected=true]:text-[var(--accent-foreground)]"
          >
            {outbound.cityName} (saindo)
          </Tab>
        </TabList>

        <TabPanel id="current">
          <CityReference locality={current} />
        </TabPanel>

        <TabPanel id="outbound">
          <FeedbackAlert
            variant="warning"
            description={
              outbound.readOnly
                ? `Você só lê aqui — a transferência já aconteceu. Para publicar, use ${current.cityName}.`
                : `Você está saindo de ${outbound.cityName} em ${formatDate(outbound.endsAt)}. Até lá, continua podendo publicar aqui normalmente.`
            }
          />
          <CityReference locality={outboundAsCurrent} />
        </TabPanel>
      </Tabs>
    </div>
  )
}
