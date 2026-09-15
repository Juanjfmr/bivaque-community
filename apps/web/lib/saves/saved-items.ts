import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

// Prancha 54-web-retorno, painel /salvos: "conteúdos salvos por tipo; abrir e
// remover" (spec C09). O tipo só entra na tela quando existe backend de
// salvamento real para ele. Existem dois:
// - `recommendation_saves` (20260802001100) — a aba "Indicações";
// - `guide_entry_saves` (20260915190000) — a aba "Guia", com o marcador no
//   cartão de cada referência do guia (prancha 12/61).
// Mercado e Imóveis seguem pendentes no card RECON-032: cada um espera a
// própria tabela junto da tela de origem. Aba sem produtor seria o placeholder
// que o gate G1 veta (tests/unit/ui/empty-promises.test.ts).

export type SavedKind = "indicacao" | "guia"

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
  guia: "Guia",
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

// Referência do guia: o destino real é o filtro do próprio guia (`?q=` casa
// nome e descrição), porque entrada do guia não tem rota de detalhe.
export function buildGuideSavedItems(
  saves: Array<{ entry_id: string; saved_at: string }>,
  entries: Array<{
    id: string
    name: string
    description: string | null
    category: string
    status?: string
  }>,
): SavedItem[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  return saves.map((save) => {
    const entry = byId.get(save.entry_id)
    // Entrada que saiu da fila aprovada também fica indisponível: a RLS já não
    // a devolve, e a checagem explícita mantém a regra mesmo se a leitura vier
    // por outro caminho.
    if (!entry || (entry.status !== undefined && entry.status !== "approved")) {
      return {
        kind: "guia" as const,
        id: save.entry_id,
        savedAt: save.saved_at,
        available: false,
        title: null,
        excerpt: null,
        category: null,
        href: null,
      }
    }
    return {
      kind: "guia" as const,
      id: save.entry_id,
      savedAt: save.saved_at,
      available: true,
      title: entry.name,
      excerpt: excerptOf(entry.description ?? ""),
      category: entry.category,
      href: `/guide?q=${encodeURIComponent(entry.name)}`,
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
  const [saves, guideSaves] = await Promise.all([
    supabase
      .from("recommendation_saves")
      .select("request_id, saved_at")
      .order("saved_at", { ascending: false }),
    supabase
      .from("guide_entry_saves")
      .select("entry_id, saved_at")
      .order("saved_at", { ascending: false }),
  ])
  if (saves.error) throw new Error("saves-query-failed")
  if (guideSaves.error) throw new Error("guide-saves-query-failed")

  const rows = (saves.data ?? []) as Array<{ request_id: string; saved_at: string }>
  const guideRows = (guideSaves.data ?? []) as Array<{ entry_id: string; saved_at: string }>

  const [requests, entries] = await Promise.all([
    rows.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : supabase
          .from("recommendation_requests")
          .select("id, title, body, category, is_deleted")
          .in(
            "id",
            rows.map((row) => row.request_id),
          ),
    guideRows.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : supabase
          .from("arrival_guide_entries")
          .select("id, name, description, category, status")
          .in(
            "id",
            guideRows.map((row) => row.entry_id),
          ),
  ])
  if (requests.error) throw new Error("requests-query-failed")
  if (entries.error) throw new Error("guide-entries-query-failed")

  const merged = [
    ...buildSavedItems(
      rows,
      (requests.data ?? []) as Array<{
        id: string
        title: string
        body: string
        category: string
        is_deleted?: boolean
      }>,
    ),
    ...buildGuideSavedItems(
      guideRows,
      (entries.data ?? []) as Array<{
        id: string
        name: string
        description: string | null
        category: string
        status?: string
      }>,
    ),
  ]
  // A prancha ordena por data de salvamento, não por tipo.
  return merged.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function removeSavedItem(
  supabase: Client,
  kind: SavedKind,
  id: string,
): Promise<boolean> {
  if (kind === "guia") {
    const { error } = await supabase.from("guide_entry_saves").delete().eq("entry_id", id)
    return !error
  }
  const { error } = await supabase.from("recommendation_saves").delete().eq("request_id", id)
  return !error
}
