import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  formatReceived,
  requestBody,
  requestTitle,
  SERVICE_REQUEST_STATUS_LABELS,
  type ServiceRequestStatus,
} from "../../../../../lib/service-requests/status"
import { createServerClient as createServiceClient } from "../../../../../lib/supabase/server"
import { closeRequestAction, respondToRequestAction } from "../../actions"

interface RequestRow {
  id: string
  conversation_id: string
  description: string
  when_text: string | null
  region: string | null
  category: ProviderCategory
  status: ServiceRequestStatus
  created_at: string
}

interface MessageRow {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default async function PrestadorPedidoPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return null

  const { data: requestRow, error: requestError } = await authClient
    .from("service_requests")
    .select("id, conversation_id, description, when_text, region, category, status, created_at")
    .eq("id", id)
    .maybeSingle()
  if (requestError) throw new Error(`Falha ao carregar o pedido: ${requestError.message}`)
  if (!requestRow) notFound()

  const request = requestRow as RequestRow

  const { data: messageRows, error: messageError } = await authClient
    .from("dm_messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", request.conversation_id)
    .order("created_at", { ascending: true })
  if (messageError) throw new Error(`Falha ao carregar a conversa: ${messageError.message}`)
  const messages = (messageRows ?? []) as MessageRow[]

  const { data: clientName } = await authClient.rpc("conversation_counterpart_name", {
    p_conversation_id: request.conversation_id,
  })

  const serviceClient = createServiceClient()
  const { data: accountRow } = await serviceClient
    .from("provider_accounts")
    .select("locality_id")
    .eq("auth_user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle()
  const localityId = (accountRow as { locality_id: string | null } | null)?.locality_id ?? null
  let cityLabel = ""
  if (localityId) {
    const { data: localityRow } = await serviceClient
      .from("localities")
      .select("city_name, state_code")
      .eq("id", localityId)
      .maybeSingle()
    const locality = localityRow as { city_name: string; state_code: string } | null
    if (locality) cityLabel = `${locality.city_name}, ${locality.state_code}`
  }

  const isOpen = request.status === "open" || request.status === "in_conversation"
  const responseClientKey = crypto.randomUUID()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={"/prestador" as Route}
        className="inline-flex min-h-11 items-center text-sm text-muted underline transition-colors"
      >
        ‹ Voltar aos pedidos
      </Link>

      <header className="mt-2">
        <h1 className="text-2xl font-semibold">{requestTitle(request.description)}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--semantic-selected)] px-3 py-1 text-[var(--semantic-action-primary)]">
            {SERVICE_REQUEST_STATUS_LABELS[request.status]}
          </span>
          <span>{PROVIDER_CATEGORY_LABELS[request.category]}</span>
          <span>{[request.region, cityLabel].filter(Boolean).join(" · ")}</span>
          <span>{request.when_text ?? "A combinar"}</span>
          <span>Recebido {formatReceived(request.created_at)}</span>
        </div>
      </header>

      {requestBody(request.description) && (
        <p className="mt-4 whitespace-pre-line rounded-xl border border-border bg-[var(--semantic-surface)] p-4 text-sm text-muted-foreground">
          {requestBody(request.description)}
        </p>
      )}

      <section aria-label="Conversa" className="mt-6 space-y-3">
        {messages.length === 0 ? (
          <p role="status" className="text-sm text-muted">
            Nenhuma mensagem ainda. Sua primeira resposta move o pedido para Em conversa.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => {
              const fromProvider = message.sender_id === user.id
              return (
                <li
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    fromProvider
                      ? "ml-auto bg-[var(--semantic-selected)] text-foreground"
                      : "bg-[var(--semantic-surface)] text-muted-foreground"
                  }`}
                >
                  <p className="text-xs font-medium text-muted">
                    {fromProvider ? "Você" : ((clientName as string | null) ?? "Membro")} ·{" "}
                    {formatReceived(message.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{message.content}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {isOpen ? (
        <section aria-label="Responder" className="mt-6 space-y-3">
          <form action={respondToRequestAction} className="space-y-3">
            <input type="hidden" name="requestId" value={request.id} />
            <input type="hidden" name="conversationId" value={request.conversation_id} />
            <input type="hidden" name="clientKey" value={responseClientKey} />
            <label htmlFor="content" className="block text-sm font-medium">
              Escreva uma mensagem
            </label>
            <textarea
              id="content"
              name="content"
              required
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg border border-border bg-[var(--semantic-surface)] p-3 text-sm"
              placeholder="Responda ao pedido"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-5 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors"
            >
              Enviar
            </button>
          </form>

          <form action={closeRequestAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors"
            >
              Encerrar pedido
            </button>
          </form>
          <p className="text-xs text-muted">
            Encerrado não significa serviço prestado nem pago. Valores e pagamento são combinados
            entre vocês; o Bivaque não participa da negociação.
          </p>
        </section>
      ) : (
        <p role="status" className="mt-6 text-sm text-muted">
          {request.status === "cancelled"
            ? "Este pedido foi cancelado pelo solicitante. O histórico continua disponível."
            : "Este pedido está encerrado. O histórico continua disponível."}
        </p>
      )}
    </div>
  )
}
