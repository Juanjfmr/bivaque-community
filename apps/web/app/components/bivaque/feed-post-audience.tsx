"use client"

// Audiência de publicação (RECON-014). A lista de destinos vem SEMPRE de
// consulta real — comunidade e grupo em que a pessoa é aprovada — nunca de
// lista fixa. Cidade inteira é o único destino sempre disponível para quem é
// membro ativo da localidade (a RLS posts_insert_locality_member confirma no
// servidor; a UI não inventa permissão).

import { Button, Radio, RadioGroup, Spinner } from "@heroui/react"
import { Building2, Trees, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import {
  type AudienceKey,
  CITY_AUDIENCE_KEY,
  communityAudienceKey,
  groupAudienceKey,
} from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { Skeleton } from "./skeleton"

export interface AudienceDestination {
  key: AudienceKey
  kind: "city" | "community" | "group"
  /** cidade: nome da localidade; comunidade/grupo: nome real da linha */
  name: string
  description: string
}

interface AudienceState {
  loading: boolean
  error: string | null
  communities: AudienceDestination[]
  groups: AudienceDestination[]
  retry: () => void
}

export function cityDestination(cityName: string): AudienceDestination {
  return {
    key: CITY_AUDIENCE_KEY,
    kind: "city",
    name: `Toda a cidade · ${cityName}`,
    description: "Membros do Bivaque nesta cidade",
  }
}

export function usePostAudience(localityId: string): AudienceState {
  const supabase = createBrowserClient()
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [communities, setCommunities] = useState<AudienceDestination[]>([])
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

      const [memberships, groupMemberships] = await Promise.all([
        supabase
          .from("community_memberships")
          .select("community_id")
          .eq("user_id", user.id)
          .eq("status", "approved"),
        supabase
          .from("group_memberships")
          .select("group_id")
          .eq("user_id", user.id)
          .eq("status", "approved"),
      ])
      if (cancelled) return

      if (memberships.error || groupMemberships.error) {
        // Não oferecemos silenciosamente a cidade quando a vila default ainda
        // está selecionada — o aviso de audiência tem que refletir o que o
        // membro pode escolher (DS-002/DS-014). Com a lista indisponível, só
        // a cidade resta, e o aviso diz exatamente isso.
        setError(
          "Não foi possível carregar suas comunidades e grupos. O post será publicado para toda a cidade.",
        )
        setCommunities([])
        setGroups([])
        setLoading(false)
        return
      }

      const communityIds = ((memberships.data as { community_id: string }[] | null) ?? []).map(
        (row) => row.community_id,
      )
      const groupIds = ((groupMemberships.data as { group_id: string }[] | null) ?? []).map(
        (row) => row.group_id,
      )

      const [communitiesResult, groupsResult] = await Promise.all([
        communityIds.length > 0
          ? supabase.from("communities").select("id, name").in("id", communityIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
        groupIds.length > 0
          ? supabase
              .from("groups")
              .select("id, name")
              .in("id", groupIds)
              .eq("locality_id", localityId)
          : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
      ])
      if (cancelled) return

      if (communitiesResult.error || groupsResult.error) {
        setError(
          "Não foi possível carregar suas comunidades e grupos. Você ainda pode publicar para a cidade inteira.",
        )
        setCommunities([])
        setGroups([])
        setLoading(false)
        return
      }

      setCommunities(
        ((communitiesResult.data as { id: string; name: string }[] | null) ?? []).map(
          (community) => ({
            key: communityAudienceKey(community.id),
            kind: "community" as const,
            name: community.name,
            description: "Membros do Bivaque nesta comunidade",
          }),
        ),
      )
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

  return { loading, error, communities, groups, retry }
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
            <div className="flex items-start gap-2">
              <DestinationIcon kind={destination.kind} className="mt-0.5 text-muted" />
              <div className="flex flex-col gap-0.5">
                <span>{destination.name}</span>
                <span className="text-xs text-muted">{destination.description}</span>
              </div>
            </div>
          </Radio>
        ))}
        {loading ? (
          <div role="status" aria-label="Carregando suas comunidades e grupos">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="mt-2 h-10 w-1/2" />
          </div>
        ) : null}
      </RadioGroup>

      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted" aria-live="polite">
          <Spinner size="sm" aria-label="Carregando suas comunidades e grupos" />
          Carregando suas comunidades e grupos…
        </div>
      ) : null}

      {error ? (
        <div className="mt-2" data-testid="communities-error">
          <FeedbackAlert
            variant="danger"
            title="Não foi possível listar suas comunidades e grupos"
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

// O aviso de audiência descreve quem vai ler o destino ESCOLHIDO. A copy de
// vila é travada pelo E2E do golden slice ("aprovados desta vila") — mudar é
// quebrar a prova de alcance, não só o texto.
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
