"use client"

import { Button } from "@heroui/react"
import { EmptyState } from "../../components/bivaque/empty-state"
import { EventsIllustration } from "../../components/bivaque/illustrations"
import { respondInviteAction } from "./event-invites-actions"

// RECON-043: a area "Seus eventos" so pode declarar o vazio depois de saber se
// a pessoa tem convite — um dos quatro estados que ela mostra. A leitura subiu
// para a pagina (a mesma fonte alimenta a decisao e esta lista), e este
// componente ficou de apresentacao. Aceitar/recusar continua aqui.
export type InvitedEventRow = {
  id: string
  title: string
  starts_at: string
  venue: string | null
  status: "pending" | "accepted" | "declined"
  organizer_name: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function EventInvitesSection({
  invites,
  loaded,
  onReload,
}: {
  invites: InvitedEventRow[]
  loaded: boolean
  onReload: () => void
}) {
  if (!loaded) {
    return null
  }

  if (invites.length === 0) {
    return (
      <EmptyState
        title="Nenhum convite"
        description="Quando alguém te convidar para um evento, ele aparece aqui."
        illustration={<EventsIllustration />}
      />
    )
  }

  return (
    <ul className="space-y-2">
      {invites.map((invite) => (
        <li
          key={invite.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[var(--surface)] p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{invite.title}</p>
            <p className="mt-0.5 text-xs text-muted">
              {formatDate(invite.starts_at)}
              {invite.venue ? ` — ${invite.venue}` : ""}
              {invite.organizer_name ? ` · ${invite.organizer_name}` : ""}
            </p>
          </div>
          {invite.status === "pending" ? (
            <div className="flex shrink-0 gap-1.5">
              <form
                action={async (formData) => {
                  await respondInviteAction(formData)
                  onReload()
                }}
              >
                <input type="hidden" name="eventId" value={invite.id} />
                <input type="hidden" name="status" value="accepted" />
                <Button type="submit" size="sm" variant="primary">
                  Aceitar
                </Button>
              </form>
              <form
                action={async (formData) => {
                  await respondInviteAction(formData)
                  onReload()
                }}
              >
                <input type="hidden" name="eventId" value={invite.id} />
                <input type="hidden" name="status" value="declined" />
                <Button type="submit" size="sm" variant="tertiary">
                  Recusar
                </Button>
              </form>
            </div>
          ) : (
            <span className="shrink-0 text-xs font-medium text-muted">
              {invite.status === "accepted" ? "Confirmado" : "Recusado"}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
