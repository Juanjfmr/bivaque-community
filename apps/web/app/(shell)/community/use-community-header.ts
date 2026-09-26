"use client"

import { useEffect, useState } from "react"
import { signCommunityImageUrls } from "../../../lib/communities/community-image-urls"
import { createBrowserClient } from "../../../lib/supabase/client"

// O que o cabeçalho da comunidade mostra além do nome: descrição, capa,
// quantos membros e quem são alguns deles (a fileira de avatares do Meetup e
// do X). Cada parte é opcional — falha em uma não esconde as outras, e nenhuma
// inventa valor: sem capa, a faixa da marca; sem contagem, sem número.

/** Quantos rostos a fileira mostra antes do "+N". */
const MEMBER_PREVIEW = 4

export interface CommunityHeaderData {
  description: string | null
  bannerUrl: string | null
  memberCount: number | null
  members: { userId: string; name: string }[]
}

const EMPTY: CommunityHeaderData = {
  description: null,
  bannerUrl: null,
  memberCount: null,
  members: [],
}

export function useCommunityHeader(communityId: string | null): CommunityHeaderData {
  const [data, setData] = useState<CommunityHeaderData>(EMPTY)

  useEffect(() => {
    if (!communityId) {
      setData(EMPTY)
      return
    }
    let cancelled = false
    const supabase = createBrowserClient()

    void (async () => {
      const [communityResult, countResult, membersResult] = await Promise.all([
        supabase
          .from("communities")
          .select("description, banner_path")
          .eq("id", communityId)
          .maybeSingle(),
        supabase
          .from("community_memberships")
          .select("user_id", { count: "exact", head: true })
          .eq("community_id", communityId)
          .eq("status", "approved"),
        supabase
          .from("community_memberships")
          .select("user_id")
          .eq("community_id", communityId)
          .eq("status", "approved")
          .order("joined_at", { ascending: false })
          .limit(MEMBER_PREVIEW),
      ])
      if (cancelled) return

      const community = communityResult.error ? null : communityResult.data
      let bannerUrl: string | null = null
      if (community?.banner_path) {
        const signed = await signCommunityImageUrls(supabase, [
          { communityId, banner: true, thumbnail: false },
        ])
        bannerUrl = signed.get(communityId)?.bannerUrl ?? null
      }

      const ids = membersResult.error
        ? []
        : ((membersResult.data ?? []) as { user_id: string }[]).map((row) => row.user_id)
      let members: CommunityHeaderData["members"] = []
      if (ids.length > 0) {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", ids)
        if (!error) {
          const byId = new Map(
            ((profiles ?? []) as { user_id: string; display_name: string }[]).map((row) => [
              row.user_id,
              row.display_name,
            ]),
          )
          members = ids
            .filter((id) => byId.has(id))
            .map((id) => ({ userId: id, name: byId.get(id) ?? "" }))
        }
      }
      if (cancelled) return

      setData({
        description: community?.description?.trim() || null,
        bannerUrl,
        memberCount: countResult.error ? null : (countResult.count ?? null),
        members,
      })
    })().catch(() => {
      if (!cancelled) setData(EMPTY)
    })

    return () => {
      cancelled = true
    }
  }, [communityId])

  return data
}
