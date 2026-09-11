"use client"

import { Button, Input } from "@heroui/react"
import { useEffect, useState } from "react"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { Skeleton } from "../../../components/bivaque/skeleton"
import {
  getFamilyInviteDataAction,
  revokeFamilyInviteAction,
  sendFamilyInviteAction,
} from "../../profile/family-invite-section-actions"

// Prancha 52 / C07: criar, copiar e revogar convite familiar. O token aparece
// uma única vez e nunca é persistido — o banco guarda só o digest (migration
// 20260815130000). Não há listagem de família alheia: a leitura é das próprias
// pendências (`list_pending_invites_with_hint`), nunca de outra conta.

type PendingInviteRow = {
  id: string
  invitee_email_hint: string | null
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

export default function ConfiguracoesFamiliaPage() {
  const [data, setData] = useState<FamilyInviteData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoadError(false)
    try {
      setData(await getFamilyInviteDataAction())
    } catch {
      setLoadError(true)
    }
    setLoaded(true)
  }

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
        setLoadError(true)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSend = async (formData: FormData) => {
    setError(null)
    setCopied(false)
    try {
      const result = await sendFamilyInviteAction(formData)
      if (result?.token) {
        setInviteLink(`/onboarding?invite=${result.token}`)
        setData(await getFamilyInviteDataAction())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar convite. Tente novamente.")
    }
  }

  const copyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(new URL(inviteLink, window.location.origin).toString())
      setCopied(true)
    } catch {
      setError("Não foi possível copiar o link. Copie manualmente.")
    }
  }

  if (!loaded) {
    return (
      <div role="status" aria-label="Carregando convites" className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  const isVerified = data?.isVerified ?? false
  const pending = data?.pending ?? []

  return (
    <section aria-labelledby="familia-heading" className="space-y-4">
      <div>
        <h2 id="familia-heading" className="text-lg font-semibold tracking-tight">
          Família
        </h2>
        <p className="mt-1 text-sm text-muted">
          Convide até 5 familiares por vez. Cada convite expira em 7 dias e mantém a conta do
          familiar independente.
        </p>
      </div>

      {loadError && (
        <FeedbackAlert
          variant="danger"
          description="Não foi possível carregar seus convites."
          actions={
            <Button size="sm" variant="secondary" onPress={load}>
              Tentar novamente
            </Button>
          }
        />
      )}

      <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
        {isVerified ? (
          <form action={handleSend} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium" htmlFor="family-email">
                E-mail do familiar
              </label>
              <Input
                id="family-email"
                type="email"
                name="email"
                placeholder="email@familiar.com"
                required
                className="mt-1"
              />
            </div>
            <Button type="submit" variant="primary" className="min-h-11 self-start">
              Criar convite
            </Button>

            {inviteLink && (
              <div className="rounded-lg border border-border bg-[var(--surface-sunken)] p-3">
                <p className="text-xs text-muted">
                  O link aparece uma única vez. Envie ao familiar antes de sair desta tela.
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm">
                  <span className="truncate" title={inviteLink}>
                    {inviteLink}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="min-h-11 shrink-0"
                    onPress={copyLink}
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </p>
              </div>
            )}

            {error && <FeedbackAlert variant="danger" description={error} />}
          </form>
        ) : (
          <p className="text-sm text-muted">
            Apenas titulares verificados podem enviar convites de família.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
        <h3 className="text-sm font-medium">Convites pendentes</h3>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhum convite pendente.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-[var(--surface-sunken)] p-3 text-sm"
              >
                <span className="min-w-0 text-muted">
                  {invite.invitee_email_hint ?? "Convite"} — enviado em{" "}
                  {formatDate(invite.created_at)}, expira em {formatDate(invite.expires_at)}
                </span>
                <form action={revokeFamilyInviteAction}>
                  <input type="hidden" name="invitationId" value={invite.id} />
                  <Button type="submit" size="sm" variant="tertiary" className="min-h-11">
                    Revogar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
