"use client"

import { Button, Input } from "@heroui/react"
import { useEffect, useState } from "react"
import {
  getFamilyInviteDataAction,
  revokeFamilyInviteAction,
  sendFamilyInviteAction,
} from "./family-invite-section-actions"

type PendingInviteRow = {
  id: string
  invitee_email_digest: Buffer
  created_at: string
  expires_at: string
}

type FamilyInviteData = {
  isVerified: boolean
  pending: PendingInviteRow[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function FamilyInviteSection() {
  const [data, setData] = useState<FamilyInviteData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getFamilyInviteDataAction()
      .then((result) => {
        if (cancelled) return
        setData(result)
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

  const isVerified = data?.isVerified ?? false
  const pending = data?.pending ?? []

  return (
    <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
      <p className="text-sm font-medium">Convites de família</p>
      <p className="mt-1 text-xs text-muted">
        Convide até 5 familiares por vez. Cada convite expira em 7 dias.
      </p>

      {isVerified ? (
        <form action={sendFamilyInviteAction} className="mt-3 flex gap-2">
          <Input
            type="email"
            name="email"
            placeholder="email@familiar.com"
            required
            className="flex-1"
          />
          <Button type="submit" size="sm" variant="primary">
            Enviar
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Apenas titulares verificados podem enviar convites.
        </p>
      )}

      {pending.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pending.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-[var(--surface-sunken)] p-2 text-xs"
            >
              <span className="text-muted">
                Convite enviado em {formatDate(inv.created_at)} — expira em{" "}
                {formatDate(inv.expires_at)}
              </span>
              <form action={revokeFamilyInviteAction}>
                <input type="hidden" name="invitationId" value={inv.id} />
                <Button type="submit" size="sm" variant="tertiary">
                  Revogar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
