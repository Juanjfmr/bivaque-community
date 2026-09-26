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
import { COUNT_CAP } from "./hub-loaders"

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
  // Quem confirmou presença (até 4), lido pela RLS do próprio membro — a
  // mesma leitura do "Você vai" de /events/[id]. Sem perfil legível o nome não
  // entra; a contagem continua verdadeira.
  goingAttendees: Array<{ userId: string; name: string }>
}

// Copy de presença da prancha ("Leila, Andréa e mais 18 pessoas vão"). Pura e
// exportada para ter teste próprio: quando não há nome legível ela degrada para
// a contagem, nunca inventa quem vai.
export function buildGoingLine(names: string[], goingCount: number): string | null {
  if (goingCount <= 0) return null
  const clean = names.map((name) => name.trim()).filter((name) => name.length > 0)
  if (clean.length === 0) return goingCount === 1 ? "1 pessoa vai" : `${goingCount} pessoas vão`
  if (goingCount === 1) return `${clean[0]} vai`
  if (clean.length === 1) {
    const others = goingCount - 1
    return `${clean[0]} e mais ${others} ${others === 1 ? "pessoa vai" : "pessoas vão"}`
  }
  if (goingCount === 2) return `${clean[0]} e ${clean[1]} vão`
  return `${clean[0]}, ${clean[1]} e mais ${goingCount - 2} pessoas vão`
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

/** Quantas publicações a prévia do Início lê (mostra 3; conta novidade sobre todas). */
export const COMMUNITY_PREVIEW_READ = COUNT_CAP

export async function loadCommunityFeed(
  supabase: InicioClient,
  communityId: string,
): Promise<FeedOutcome> {
  try {
    // A prévia mostra 3, mas o selo "N novas" conta sobre o que foi lido: 50
    // cobre o selo até o teto dele ("50+", hub-loaders COUNT_CAP) sem trazer a
    // comunidade inteira (350 publicações na Vila Ajuricaba antes deste teto).
    const { data, error: feedError } = await supabase.rpc("feed_community", {
      p_community_id: communityId,
      p_order: "recent",
      p_limit: COMMUNITY_PREVIEW_READ,
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

// A aba "Acompanhando" (prancha 01) lê o mesmo canal dos outros feeds:
// o RPC feed_following revalida a matriz de visibilidade no servidor — seguir
// um post nunca concede leitura que a pessoa já não teria.
export async function loadFollowedFeed(supabase: InicioClient): Promise<FeedOutcome> {
  try {
    const { data, error } = await supabase.rpc("feed_following")
    if (error) {
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
      .order("created_at", { ascending: true })

    const going = (goingRows as { user_id: string }[] | null) ?? []

    let goingAttendees: Array<{ userId: string; name: string }> = []
    if (!countError && going.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in(
          "user_id",
          going.slice(0, 4).map((row) => row.user_id),
        )
      const byId = new Map(
        ((profileRows as { user_id: string; display_name: string }[] | null) ?? [])
          .filter((profile) => profile.display_name.trim().length > 0)
          .map((profile) => [profile.user_id, profile.display_name]),
      )
      goingAttendees = going
        .slice(0, 4)
        .map((row) => ({ userId: row.user_id, name: byId.get(row.user_id) ?? "" }))
        .filter((attendee) => attendee.name.length > 0)
    }

    return {
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      venue: row.venue ?? null,
      goingCount: countError ? null : going.length,
      goingAttendees: countError ? [] : goingAttendees,
    }
  } catch {
    // Sem evento confirmado — inclusive quando a consulta rejeitou — o card
    // honesto é não existir, não o card da consulta anterior pendurado.
    return null
  }
}
