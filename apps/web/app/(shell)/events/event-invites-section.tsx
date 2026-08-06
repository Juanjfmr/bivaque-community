"use client"

import { Button } from "@heroui/react"
import { useEffect, useState } from "react"
import { EmptyState } from "../../components/bivaque/empty-state"
import { EventsIllustration } from "../../components/bivaque/illustrations"
import { getInvitedEventsAction, respondInviteAction } from "./event-invites-actions"

type InvitedEventRow = {
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

export default function EventInvitesSection() {
  const [invites, setInvites] = useState<InvitedEventRow[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = () => {
    getInvitedEventsAction()
      .then((rows) => {
        setInvites(rows)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }

  useEffect(() => {
    let cancelled = false
    getInvitedEventsAction()
      .then((rows) => {
        if (cancelled) return
        setInvites(rows)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
                  load()
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
                  load()
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
