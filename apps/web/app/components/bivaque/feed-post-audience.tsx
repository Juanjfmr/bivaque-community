"use client"

// Audiência de publicação (RECON-014; lote 5, tarefa N2). A lista de destinos
// vem SEMPRE de consulta real — os GRUPOS em que a pessoa é aprovada —, nunca
// de lista fixa. Publicar existe só dentro de um grupo (ADR-20261023): cidade e
// vila saíram do seletor, e a RLS posts_insert_locality_member recusa no
// servidor qualquer publicação sem grupo (migration 20261024100000). A tela não
// inventa permissão: quem decide é o banco.
//
// `AudienceDestination.kind` ainda conhece "city" e "community" porque a tela
// de EDIÇÃO mostra o destino de publicações antigas (de cidade e de vila), que
// continuam no banco. O compositor só constrói destinos de grupo.

import { Button, Radio, RadioGroup, Spinner } from "@heroui/react"
import { Building2, Trees, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { type AudienceKey, groupAudienceKey } from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { Skeleton } from "./skeleton"

export interface AudienceDestination {
  key: AudienceKey
  kind: "city" | "community" | "group"
  /** grupo: nome real da linha; na edição, também cidade/comunidade antigas */
  name: string
  description: string
}

interface AudienceState {
  loading: boolean
  error: string | null
  groups: AudienceDestination[]
  retry: () => void
}

export function usePostAudience(localityId: string): AudienceState {
  const supabase = createBrowserClient()
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<AudienceDestination[]>([])

  const retry = useCallback(() => setAttempt((prev) => prev + 1), [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: este efeito recarrega de propósito quando `retry` incrementa `attempt` — a dependência é o gatilho, não uma leitura do corpo
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setLoading(false)
        return
      }

      const { data: groupMemberships, error: groupsError } = await supabase
        .from("group_memberships")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("status", "approved")
      if (cancelled) return

      if (groupsError) {
        // Sem a lista não há destino nenhum: a publicação não sai para lugar
        // nenhum "por padrão". O aviso diz exatamente isso, em vez de inventar
        // um destino que o banco vai recusar.
        setError("Não foi possível carregar seus grupos. Tente de novo.")
        setGroups([])
        setLoading(false)
        return
      }

      const groupIds = ((groupMemberships as { group_id: string }[] | null) ?? []).map(
        (row) => row.group_id,
      )

      const groupsResult =
        groupIds.length > 0
          ? await supabase
              .from("groups")
              .select("id, name")
              .in("id", groupIds)
              .eq("locality_id", localityId)
          : { data: [] as { id: string; name: string }[], error: null }
      if (cancelled) return

      if (groupsResult.error) {
        setError("Não foi possível carregar seus grupos. Tente de novo.")
        setGroups([])
        setLoading(false)
        return
      }

      setGroups(
        ((groupsResult.data as { id: string; name: string }[] | null) ?? []).map((group) => ({
          key: groupAudienceKey(group.id),
          kind: "group" as const,
          name: group.name,
          description: "Membros do Bivaque neste grupo",
        })),
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, localityId, attempt])

  return { loading, error, groups, retry }
}

export function DestinationIcon({
  kind,
  size = 16,
  className,
}: {
  kind: AudienceDestination["kind"]
  size?: number
  className?: string
}) {
  if (kind === "community") return <Trees size={size} aria-hidden="true" className={className} />
  if (kind === "group") return <Users size={size} aria-hidden="true" className={className} />
  return <Building2 size={size} aria-hidden="true" className={className} />
}

interface AudiencePickerProps {
  value: AudienceKey
  onChange: (key: AudienceKey) => void
  destinations: AudienceDestination[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function AudiencePicker({
  value,
  onChange,
  destinations,
  loading,
  error,
  onRetry,
}: AudiencePickerProps) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium" id="audience-heading">
        Quem pode ver?
      </p>
      <RadioGroup
        aria-labelledby="audience-heading"
        value={value}
        onChange={(next) => onChange(next)}
        orientation="vertical"
        className="gap-1"
      >
        {destinations.map((destination) => (
          <Radio key={destination.key} value={destination.key}>
            {/* min-h-11: o rótulo do radio é o alvo de toque (a régua do
                produto pede 44px); a altura vinha de 39px e reprovava. */}
            <Radio.Content className="min-h-11">
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <div className="flex items-start gap-2">
                <DestinationIcon kind={destination.kind} className="mt-0.5 text-muted" />
                <div className="flex flex-col gap-0.5">
                  <span>{destination.name}</span>
                  <span className="text-xs text-muted">{destination.description}</span>
                </div>
              </div>
            </Radio.Content>
          </Radio>
        ))}
        {loading ? (
          <div role="status" aria-label="Carregando seus grupos">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="mt-2 h-10 w-1/2" />
          </div>
        ) : null}
      </RadioGroup>

      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted" aria-live="polite">
          <Spinner size="sm" aria-label="Carregando seus grupos" />
          Carregando seus grupos…
        </div>
      ) : null}

      {error ? (
        <div className="mt-2" data-testid="communities-error">
          <FeedbackAlert
            variant="danger"
            title="Não foi possível listar seus grupos"
            description={error}
            actions={
              <Button size="sm" variant="tertiary" onPress={onRetry}>
                Tentar novamente
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  )
}

// O aviso de audiência descreve quem vai ler o destino ESCOLHIDO. O compositor
// só escolhe grupo (lote 5 N2); as frases de vila e de cidade continuam aqui
// porque a tela de EDIÇÃO descreve o destino de publicações antigas desses
// alcances (elas seguem no banco, mesmo sem compositor que as crie).
export function audienceNoticeText(
  kind: AudienceDestination["kind"],
  cityName: string | null,
): string {
  if (kind === "community") return "Só os aprovados desta vila vão ler."
  if (kind === "group") return "Só os aprovados deste grupo vão ler."
  return `Toda ${cityName ?? "a cidade"} — todos os membros verificados da cidade vão ler.`
}

interface DestinationLabel {
  loading: boolean
  name: string | null
}

// Nome real do destino de uma publicação existente — para a tela de edição
// mostrar o que está travado. Consulta por id; sem nome, sem chumbo.
export function usePostDestinationLabel(
  localityId: string | null,
  communityId: string | null,
  groupId: string | null,
): DestinationLabel {
  const supabase = createBrowserClient()
  const { current: locality } = useLocalityContext()
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (communityId) {
        const { data } = await supabase
          .from("communities")
          .select("name")
          .eq("id", communityId)
          .maybeSingle()
        if (!cancelled) setName((data as { name: string } | null)?.name ?? null)
      } else if (groupId) {
        const { data } = await supabase
          .from("groups")
          .select("name")
          .eq("id", groupId)
          .maybeSingle()
        if (!cancelled) setName((data as { name: string } | null)?.name ?? null)
      } else if (localityId && localityId === locality?.id) {
        if (!cancelled) setName(locality?.cityName ? `Toda a cidade · ${locality.cityName}` : null)
      } else if (localityId) {
        const { data } = await supabase
          .from("localities")
          .select("city_name")
          .eq("id", localityId)
          .maybeSingle()
        if (!cancelled)
          setName(
            (data as { city_name: string } | null)?.city_name
              ? `Toda a cidade · ${(data as { city_name: string }).city_name}`
              : null,
          )
      } else if (!cancelled) {
        setName(null)
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, localityId, communityId, groupId, locality])

  return { loading, name }
}
