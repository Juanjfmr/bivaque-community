import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { log } from "../../../../lib/logger"
import type {
  ServiceRequestStatus,
  TrackingMessage,
} from "../../../../lib/service-requests/tracking"
import { RequestWorkspace } from "./request-workspace"

// RECON-023 — `/pedidos/[id]` (R44, prancha 17).
//
// Leitura pelo cliente autenticado: a RLS so devolve o pedido para solicitante
// e destinatario. Terceiro recebe notFound(), nunca uma tela vazia que pareca
// "sem pedidos". A situacao vem da COLUNA; a conversa vem de `dm_messages` do
// contexto ja gravado — nunca do corpo do request.

type ReachRow = {
  scope_type: "community" | "locality"
  scope_id: string
}

type RequestRow = {
  id: string
  requester_user_id: string
  provider_user_id: string
  provider_id: string
  description: string
  when_text: string | null
  status: ServiceRequestStatus
  created_at: string
  updated_at: string
  closed_at: string | null
  closed_by_user_id: string | null
  conversation_id: string | null
  provider_profiles: { display_name: string; category: ProviderCategory } | null
}

async function resolveProviderLocation(
  client: ReturnType<typeof createServerClient>,
  providerId: string,
): Promise<string | null> {
  const reachQuery = await client
    .from("provider_reach")
    .select("scope_type, scope_id")
    .eq("provider_id", providerId)
    .eq("active", true)

  if (reachQuery.error) {
    log.error("pedidos: could not load reach", { error: reachQuery.error.message })
    return null
  }

  const reach = (reachQuery.data as ReachRow[] | null) ?? []
  const localityReach = reach.find((row) => row.scope_type === "locality")
  if (localityReach) {
    const { data } = await client
      .from("localities")
      .select("city_name, state_code")
      .eq("id", localityReach.scope_id)
      .maybeSingle()
    const row = data as { city_name: string; state_code: string } | null
    return row ? `${row.city_name}, ${row.state_code}` : null
  }

  const communityReach = reach.find((row) => row.scope_type === "community")
  if (!communityReach) return null

  const { data: community } = await client
    .from("communities")
    .select("locality_id")
    .eq("id", communityReach.scope_id)
    .maybeSingle()
  if (!community) return null

  const { data: locality } = await client
    .from("localities")
    .select("city_name, state_code")
    .eq("id", (community as { locality_id: string }).locality_id)
    .maybeSingle()
  const row = locality as { city_name: string; state_code: string } | null
  return row ? `${row.city_name}, ${row.state_code}` : null
}

export default async function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Server component, sem escrita de cookie.
      },
    },
  })

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    notFound()
  }

  const requestQuery = await client
    .from("service_requests")
    .select(
      "id, requester_user_id, provider_user_id, provider_id, description, when_text, status, created_at, updated_at, closed_at, closed_by_user_id, conversation_id, provider_profiles(display_name, category)",
    )
    .eq("id", id)
    .maybeSingle()

  if (requestQuery.error) {
    throw new Error(`Falha ao carregar o pedido: ${requestQuery.error.message}`)
  }

  const request = requestQuery.data as unknown as RequestRow | null
  if (!request) {
    notFound()
  }

  let messages: TrackingMessage[] = []
  let lastReadAt: string | null = null

  if (request.conversation_id) {
    const messagesQuery = await client
      .from("dm_messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", request.conversation_id)
      .order("created_at", { ascending: true })

    if (messagesQuery.error) {
      throw new Error(`Falha ao carregar a conversa: ${messagesQuery.error.message}`)
    }
    messages = (messagesQuery.data as TrackingMessage[] | null) ?? []

    const readQuery = await client
      .from("dm_read_states")
      .select("last_read_at")
      .eq("conversation_id", request.conversation_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (readQuery.error) {
      log.error("pedidos: could not load read state", { error: readQuery.error.message })
    } else {
      lastReadAt = (readQuery.data as { last_read_at: string } | null)?.last_read_at ?? null
    }
  }

  const providerName = request.provider_profiles?.display_name ?? "Prestador"
  const category = request.provider_profiles?.category
  const categoryLabel = category ? (PROVIDER_CATEGORY_LABELS[category] ?? category) : "Serviço"
  const location = await resolveProviderLocation(client, request.provider_id)

  return (
    <RequestWorkspace
      request={{
        id: request.id,
        status: request.status,
        description: request.description,
        whenText: request.when_text,
        createdAt: request.created_at,
        closedAt: request.closed_at,
        closedByUserId: request.closed_by_user_id,
        providerName,
        categoryLabel,
        location,
      }}
      conversationId={request.conversation_id}
      viewerId={user.id}
      isRequester={request.requester_user_id === user.id}
      initialMessages={messages}
      initialLastReadAt={lastReadAt}
    />
  )
}
