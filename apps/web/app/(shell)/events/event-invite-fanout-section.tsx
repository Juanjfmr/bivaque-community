"use client"

import { Button, Checkbox } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import { listInvitableMembersAction, sendEventInvitesAction } from "./event-invites-actions"

type InvitableMemberRow = {
  user_id: string
  display_name: string | null
  is_already_invited: boolean
}

// Wave F Task 3 — organizer invite fan-out.
//
// D43: no people SEARCH — the organizer only sees the members they can
// legitimately reach (the same set the INSERT policy accepts). Inviting
// fans out to N event_invites + N outbox rows through the server action.
export function EventInviteFanoutSection({ eventId }: { eventId: string }) {
  const [members, setMembers] = useState<InvitableMemberRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const rows = await listInvitableMembersAction(eventId)
    setMembers(rows)
    setLoaded(true)
  }, [eventId])

  useEffect(() => {
    refresh().catch(() => setLoaded(true))
  }, [refresh])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!loaded) return null

  const invitable = members.filter((m) => !m.is_already_invited)
  const alreadyInvited = members.filter((m) => m.is_already_invited)

  return (
    <section aria-labelledby="invite-fanout-heading" className="space-y-3">
      <h2 id="invite-fanout-heading" className="text-base font-semibold tracking-tight">
        Convidar para este evento
      </h2>
      <p className="text-sm text-muted">
        Convide pessoas da sua comunidade e dos seus grupos. Quem aceitar confirma presença; quem já
        foi convidado aparece abaixo.
      </p>

      {invitable.length === 0 ? (
        <p className="text-sm text-muted">
          {alreadyInvited.length > 0
            ? "Todos os membros alcançáveis já foram convidados."
            : "Não há membros disponíveis para convidar no momento."}
        </p>
      ) : (
        <form
          action={async (formData) => {
            setError(null)
            setFeedback(null)
            try {
              const result = await sendEventInvitesAction(formData)
              if (result) setFeedback(`Convite(s) enviado(s) para ${result.invited} membro(s).`)
              setSelected(new Set())
              await refresh()
            } catch (err) {
              setError(err instanceof Error ? err.message : "Erro ao enviar convites.")
            }
          }}
          className="space-y-2"
        >
          <input type="hidden" name="eventId" value={eventId} />
          {/* sendEventInvitesAction reads formData.getAll("inviteeId") — the
              checkbox selection lives in React state (`selected`), so each
              selected id needs its own hidden input to actually reach the
              action. Without this the form always submitted zero invitees
              (found alongside the HeroUI Checkbox compound-structure fix). */}
          {Array.from(selected).map((id) => (
            <input key={id} type="hidden" name="inviteeId" value={id} />
          ))}
          <ul className="space-y-1">
            {invitable.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
              >
                <Checkbox
                  aria-label={`Convidar ${m.display_name ?? "membro"}`}
                  isSelected={selected.has(m.user_id)}
                  onChange={() => toggle(m.user_id)}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
                <span className="flex-1 truncate">{m.display_name ?? "Membro"}</span>
              </li>
            ))}
          </ul>
          <Button type="submit" size="sm" variant="primary" isDisabled={selected.size === 0}>
            Convidar {selected.size} selecionado(s)
          </Button>
          {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
          {feedback ? <p className="text-xs text-muted">{feedback}</p> : null}
        </form>
      )}

      {alreadyInvited.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted">Já convidados</p>
          <ul className="mt-1 space-y-1">
            {alreadyInvited.map((m) => (
              <li key={m.user_id} className="text-sm text-muted">
                {m.display_name ?? "Membro"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
