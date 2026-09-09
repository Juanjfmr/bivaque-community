"use client"

import { Button } from "@heroui/react"
import { useState } from "react"

type CancelRsvpAction = (formData: FormData) => Promise<void>

// RECON-007: presence cancellation as an INLINE contextual confirmation panel
// (per prancha 48 — not a modal). The board shows two distinct actions on the
// detail screen:
//   1) "Cancelar presença" — a large outlined button under "Você vai".
//   2) An inline panel that opens IN PLACE: "Tem certeza que deseja cancelar
//      sua presença?" with two buttons — submit "Cancelar presença" (real
//      server action, deletes the current-occurrence RSVP row so the count
//      on this page updates) and "Manter presença" (safe dismiss).
//
// The server action is passed as a prop rather than imported here, so the
// client component never depends on the server module and the action stays
// in the same module that already authenticates and revalidates.
export function CancelPresenceControl({
  eventId,
  cancelRsvpAction,
}: {
  eventId: string
  cancelRsvpAction: CancelRsvpAction
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        fullWidth
        className="min-h-11"
        onPress={() => setConfirming(true)}
      >
        Cancelar presença
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
      <p className="text-sm font-medium">Tem certeza que deseja cancelar sua presença?</p>
      <div className="flex flex-wrap gap-2">
        <form action={cancelRsvpAction} className="flex-1 min-w-0">
          <input type="hidden" name="eventId" value={eventId} />
          <Button type="submit" variant="tertiary" size="sm" className="min-h-11 w-full">
            Cancelar presença
          </Button>
        </form>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="min-h-11"
          onPress={() => setConfirming(false)}
        >
          Manter presença
        </Button>
      </div>
    </div>
  )
}
