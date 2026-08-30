"use client"

// Onda E Task 11 — interests section (the form + the empty-state offer).
//
// §3.2: interests map to groups. §3.3: a private group user is not in is
// not shown (the RPC enforces this; the UI just renders what comes back).
//
// Step 3 of the plan: when there are no available groups in the locality,
// we do NOT show an empty list. We offer the path that the user actually
// needs: create the first group, or invite someone who would join with one.

import { Button, Checkbox } from "@heroui/react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  clearUserGroupInterestsAction,
  getUserInterestsDataAction,
  recordUserGroupInterestsAction,
} from "./interests-actions"

type AvailableGroup = {
  id: string
  name: string
  description: string | null
  visibility: "public" | "private"
  already_member: boolean
  already_interest: boolean
}

type UserInterest = {
  group_id: string
  created_at: string
}

type InterestsData = {
  available: AvailableGroup[]
  recorded: UserInterest[]
}

export function InterestsSection() {
  const [data, setData] = useState<InterestsData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const result = await getUserInterestsDataAction()
    setData(result)
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh().catch(() => setLoaded(true))
  }, [refresh])

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    setSuccess(null)
    try {
      await recordUserGroupInterestsAction(formData)
      setSuccess("Interesses atualizados.")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar interesses.")
    }
  }

  const handleClear = async () => {
    setError(null)
    setSuccess(null)
    try {
      await clearUserGroupInterestsAction()
      setSuccess("Interesses removidos.")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao limpar interesses.")
    }
  }

  if (!loaded) return null

  const available = data?.available ?? []
  const recorded = data?.recorded ?? []
  const recordedIds = new Set(recorded.map((i) => i.group_id))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Assuntos de interesse</h1>
        <p className="mt-1 text-sm text-muted">
          Estes interesses são usados para sugerir grupos da sua cidade. Nada além disso — o produto
          não usa essa informação para outra coisa (LGPD, finalidade declarada).
        </p>
      </header>

      {available.length === 0 ? (
        <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
          <p className="text-sm font-medium">Sua cidade ainda não tem grupos públicos.</p>
          <p className="mt-2 text-sm text-muted">
            Você pode ser o primeiro: criar um grupo é o caminho que faz a cidade parar de parecer
            vazia. Convidar um membro para uma vila também ajuda — quem chega pode encontrar gente
            com interesses em comum.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/groups"
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] hover:opacity-90"
            >
              Criar o primeiro grupo
            </Link>
            <Link
              href="/communities"
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--surface)] border border-border px-4 text-sm font-medium text-foreground hover:bg-[var(--surface-sunken)]"
            >
              Ver vilas disponíveis
            </Link>
          </div>
        </div>
      ) : (
        <form action={handleSubmit} className="space-y-3">
          <ul className="space-y-2">
            {available.map((group) => {
              const checked = recordedIds.has(group.id)
              return (
                <li
                  key={group.id}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <div className="pt-0.5">
                    <Checkbox
                      name="groupIds"
                      value={group.id}
                      defaultSelected={checked}
                      isDisabled={group.already_member}
                      aria-label={`Marcar ${group.name} como interesse`}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{group.name}</div>
                    {group.description && (
                      <div className="text-xs text-muted">{group.description}</div>
                    )}
                    <div className="mt-1 text-xs text-muted">
                      {group.visibility === "private" ? "Privado" : "Público"}
                      {group.already_member ? " · você já é membro" : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button type="submit" size="sm" variant="primary">
              Salvar interesses
            </Button>
            {recorded.length > 0 ? (
              <Button type="button" size="sm" variant="tertiary" onPress={handleClear}>
                Limpar
              </Button>
            ) : null}
          </div>

          {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
          {success ? <p className="text-xs text-muted">{success}</p> : null}
        </form>
      )}
    </div>
  )
}
