import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

// Prancha 54-web-retorno, painel /salvos: "conteúdos salvos por tipo; abrir e
// remover" (spec C09). O tipo só entra na tela quando existe backend de
// salvamento real para ele. Hoje existe exatamente um: `recommendation_saves`
// (20260802001100). Guia, Mercado e Imóveis estão pendentes no card
// RECON-032 — cada um espera sua tabela de salvamento junto da tela de origem
// (lotes RECON-030, RECON-025, RECON-027), e o contrato proíbe migration
// neste lote. Um aba sem produtor seria o placeholder que o gate G1 veta.

export type SavedKind = "indicacao"

export type SavedItem = {
  kind: SavedKind
  id: string
  savedAt: string
  available: boolean
  title: string | null
  excerpt: string | null
  category: string | null
  href: string | null
}

export const SAVED_KIND_LABELS: Record<SavedKind, string> = {
  indicacao: "Indicações",
}

// Mescla as linhas de salvamento com o que a RLS devolveu do conteúdo alvo.
// Linha salva sem conteúdo legível (removida, retida por moderação, fora do
// alcance) vira item indisponivel: nem titulo, nem corpo, nem href — o que
// ficou salvo nao pode virar snapshot do que foi retirado.
export function buildSavedItems(
  saves: Array<{ request_id: string; saved_at: string }>,
  requests: Array<{
    id: string
    title: string
    body: string
    category: string
    is_deleted?: boolean
  }>,
): SavedItem[] {
  const byId = new Map(requests.map((request) => [request.id, request]))
  return saves.map((save) => {
    const request = byId.get(save.request_id)
    if (!request || request.is_deleted) {
      return {
        kind: "indicacao" as const,
        id: save.request_id,
        savedAt: save.saved_at,
        available: false,
        title: null,
        excerpt: null,
        category: null,
        href: null,
      }
    }
    return {
      kind: "indicacao" as const,
      id: save.request_id,
      savedAt: save.saved_at,
      available: true,
      title: request.title,
      excerpt: excerptOf(request.body),
      category: request.category,
      // Deep-link real da casa: abre a lista de pedidos focando o item.
      href: `/recommendations?focus=${save.request_id}#req-${save.request_id}`,
    }
  })
}

function excerptOf(body: string, max = 140): string {
  const oneLine = body.replace(/\s+/g, " ").trim()
  return oneLine.length > max ? `${oneLine.slice(0, max - 1).trimEnd()}…` : oneLine
}

// Busca da prancha ("Buscar nos salvos"). Indisponiveis só casam pela
// etiqueta fixa — nunca por conteudo que a tela nao tem mais direito de ler.
export function filterSavedItems(items: SavedItem[], query: string): SavedItem[] {
  const needle = query.trim().toLocaleLowerCase("pt-BR")
  if (needle.length === 0) return items
  return items.filter((item) => {
    if (!item.available) return "conteudo indisponível".toLocaleLowerCase("pt-BR").includes(needle)
    return `${item.title ?? ""} ${item.excerpt ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle)
  })
}

type Client = SupabaseClient<Database>

export async function loadSavedItems(supabase: Client): Promise<SavedItem[]> {
  const { data: saves, error: savesError } = await supabase
    .from("recommendation_saves")
    .select("request_id, saved_at")
    .order("saved_at", { ascending: false })
  if (savesError) throw new Error("saves-query-failed")

  const rows = (saves ?? []) as Array<{ request_id: string; saved_at: string }>
  if (rows.length === 0) return []

  const { data: requests, error: requestsError } = await supabase
    .from("recommendation_requests")
    .select("id, title, body, category, is_deleted")
    .in(
      "id",
      rows.map((row) => row.request_id),
    )
  if (requestsError) throw new Error("requests-query-failed")

  return buildSavedItems(
    rows,
    (requests ?? []) as Array<{
      id: string
      title: string
      body: string
      category: string
      is_deleted?: boolean
    }>,
  )
}

export async function removeSavedItem(supabase: Client, requestId: string): Promise<boolean> {
  const { error } = await supabase.from("recommendation_saves").delete().eq("request_id", requestId)
  return !error
}
