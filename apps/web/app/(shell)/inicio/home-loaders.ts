// RECON-002 (prancha 01): orquestração de leitura da home, separada dos
// componentes para ser testável no ambiente node do Vitest da casa (sem DOM,
// sem testing-library — dependências não se adicionam aqui). Regras:
//
// - Nenhum loader rejeita. Rede fora do ar devolve estado de erro recuperável
//   (ou ausência honesta, no rail), nunca uma Promise rejeitada solta que deixa
//   a seção presa em carregamento infinito.
// - createRequestGuard dá ao chamador o veredito "esta resposta ainda vale":
//   quando troca de cidade, comunidade ou nova tentativa dispara outra carga, a
//   resposta atrasada da carga anterior é descartada em vez de sobrescrever o
//   contexto atual.
// - Os loaders só leem pelo mesmo canal de antes: mesmas tabelas, mesmo RPC
//   feed_community, mesmo filtro de eventos. Nenhuma API ou permissão muda.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type InicioClient = SupabaseClient<Database>

export type PrimaryCommunity =
  | { status: "loading" }
  | { status: "error" }
  | { status: "none" }
  | { status: "ready"; id: string; name: string | null }

export const FEED_ERROR_MESSAGE = "Não foi possível carregar as publicações. Tente novamente."

export type FeedOutcome = { status: "ok"; posts: unknown[] } | { status: "error"; message: string }

export type NextEvent = {
  id: string
  title: string
  startsAt: string
  venue: string | null
  goingCount: number | null
}

type EventRow = {
  id: string
  title: string
  starts_at: string
  venue: string | null
}

// Cada begin() aposenta a chamada anterior e devolve o veredito da própria.
// O chamador aplica o resultado só se isCurrent() — última chamada vence.
export function createRequestGuard(): { begin: () => () => boolean } {
  let generation = 0
  return {
    begin() {
      generation += 1
      const current = generation
      return () => current === generation
    },
  }
}

// A comunidade primária — a mais antiga entre as aprovadas, mesma resolução da
// rota /community — lida uma vez pela página e servida às três consumidoras.
export async function loadPrimaryCommunity(supabase: InicioClient): Promise<PrimaryCommunity> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { status: "error" }

    const { data: membership, error: membershipError } = await supabase
      .from("community_memberships")
      .select("community_id")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("joined_at", { ascending: true })
      .limit(1)

    if (membershipError) return { status: "error" }

    const communityId = ((membership as { community_id: string }[] | null) ?? [])[0]?.community_id
    if (!communityId) return { status: "none" }

    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("name")
      .eq("id", communityId)
      .maybeSingle()

    if (communityError) return { status: "error" }

    return {
      status: "ready",
      id: communityId,
      name: (community as { name: string } | null)?.name ?? null,
    }
  } catch {
    // Rejeição de rede (getUser/arquitetura offline) é erro recuperável na
    // seção — nunca carregamento infinito nem rejection não tratada.
    return { status: "error" }
  }
}

export async function loadCommunityFeed(
  supabase: InicioClient,
  communityId: string,
): Promise<FeedOutcome> {
  try {
    const { data, error: feedError } = await supabase.rpc("feed_community", {
      p_community_id: communityId,
      p_order: "recent",
    })

    if (feedError) {
      // O erro é lido e devolvido como estado recuperável — renderizar lista
      // vazia no lugar de uma consulta que falhou é o bug que a casa proíbe.
      return { status: "error", message: FEED_ERROR_MESSAGE }
    }

    return { status: "ok", posts: (data as unknown[] | null) ?? [] }
  } catch {
    return { status: "error", message: FEED_ERROR_MESSAGE }
  }
}

export async function loadNextEvent(
  supabase: InicioClient,
  localityId: string,
): Promise<NextEvent | null> {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("events")
      .select("id, title, starts_at, venue")
      .eq("locality_id", localityId)
      .eq("status", "upcoming")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(1)

    if (error) return null
    const row = ((data as unknown as EventRow[] | null) ?? [])[0]
    if (!row) return null

    // Contagem por linhas lidas, não head count: a pilha local não responde
    // HTTP HEAD (prova de runtime 2026-09-08 — a requisição morre em
    // net::ERR_ABORTED). É o mesmo GET da lista de eventos; uma ocorrência
    // tem uma linha por pessoa, então length é a contagem de gente.
    const occurrenceDate = row.starts_at.slice(0, 10)
    const { data: goingRows, error: countError } = await supabase
      .from("event_rsvps")
      .select("user_id")
      .eq("event_id", row.id)
      .eq("status", "going")
      .eq("occurrence_date", occurrenceDate)

    return {
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      venue: row.venue ?? null,
      goingCount: countError ? null : ((goingRows as { user_id: string }[] | null) ?? []).length,
    }
  } catch {
    // Sem evento confirmado — inclusive quando a consulta rejeitou — o card
    // honesto é não existir, não o card da consulta anterior pendurado.
    return null
  }
}
