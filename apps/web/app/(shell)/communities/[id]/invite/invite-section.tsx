"use client"

// Onda E Task 6 — community invite section (the form + token display).
//
// Wraps sendCommunityInviteAction so we can capture the token returned
// once and show it to the inviter. The revoke action stays on the server
// form (it returns void and is fine with <form action={...}>).

import { Button } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import {
  getCommunityInviteDataAction,
  revokeCommunityInviteAction,
  sendCommunityInviteAction,
} from "../../community-invite-actions"

type PendingInviteRow = {
  id: string
  community_id: string
  expires_at: string
  created_at: string
}

type CommunityInviteData = {
  isVerified: boolean
  isMember: boolean
  pending: PendingInviteRow[]
}

export function CommunityInviteSection({ communityId }: { communityId: string }) {
  const [data, setData] = useState<CommunityInviteData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const result = await getCommunityInviteDataAction(communityId)
    setData(result)
    setLoaded(true)
  }, [communityId])

  useEffect(() => {
    refresh().catch(() => setLoaded(true))
  }, [refresh])

  const handleSend = async (formData: FormData) => {
    setError(null)
    setCopied(false)
    try {
      const result = await sendCommunityInviteAction(formData)
      if (result?.token) {
        setInviteLink(`/invite/${result.token}`)
        await refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar convite.")
    }
  }

  const copyLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(new URL(inviteLink, window.location.origin).toString())
    setCopied(true)
  }

  if (!loaded) {
    return null
  }

  const isVerified = data?.isVerified ?? false
  const isMember = data?.isMember ?? false
  const pending = data?.pending ?? []

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
        <p className="text-sm font-medium">Convite de membro</p>
        <p className="mt-1 text-xs text-muted">
          O link vale só para esta comunidade. Quem aceitar ainda passa pela aprovação de quem cuida
          dela.
        </p>

        {!isVerified ? (
          <p className="mt-3 text-xs text-muted">
            Só titulares verificados convidam. Conclua sua verificação para poder convidar.
          </p>
        ) : !isMember ? (
          <p className="mt-3 text-xs text-muted">
            Você precisa ser membro aprovado desta comunidade para convidar.
          </p>
        ) : (
          <form action={handleSend} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="communityId" value={communityId} />
            <Button type="submit" size="sm" variant="primary">
              Gerar link de convite
            </Button>

            {inviteLink && (
              <p className="flex items-center gap-2 rounded-md border border-border bg-[var(--surface-sunken)] p-2 text-xs">
                <span className="truncate" title={inviteLink}>
                  {inviteLink}
                </span>
                <Button size="sm" variant="secondary" onPress={copyLink} type="button">
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </p>
            )}

            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          </form>
        )}
      </div>

      <section aria-labelledby="pending-invites-heading" className="space-y-2">
        <h2 id="pending-invites-heading" className="text-base font-semibold tracking-tight">
          Convites pendentes
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Nenhum convite pendente.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <div>
                    Convite criado em {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="text-xs text-muted">
                    Expira em {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <form action={revokeCommunityInviteAction}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <input type="hidden" name="communityId" value={communityId} />
                  <Button type="submit" size="sm" variant="tertiary">
                    Revogar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
