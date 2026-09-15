import { createServerClient } from "@supabase/ssr"
import { CalendarDays, User } from "lucide-react"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import {
  deriveQuestionViewState,
  destinationNotice,
  threadConversationForEvent,
} from "../../../../../lib/events/question-thread"
import { MemberAvatar } from "../../../../components/bivaque/avatar"
import { EmptyState } from "../../../../components/bivaque/empty-state"
import { EventsIllustration } from "../../../../components/bivaque/illustrations"
import { QuestionComposer } from "./question-composer"

type EventRow = Database["public"]["Tables"]["events"]["Row"]

type ConversationRow = {
  id: string
  participant_a: string
  participant_b: string
  context_type: string
  context_id: string
}

type MessageRow = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

function formatEventDay(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(".", "")
}

function formatEventTime(iso: string): string {
  const date = new Date(iso)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, "0")}`
}

// Prancha 67: "Hoje 8:40". Dia corrente vira "Hoje"; ontem, "Ontem"; o resto
// mostra a data curta. Nunca uma data absoluta onde a referência é o agora.
function formatThreadTime(iso: string): string {
  const then = new Date(iso)
  const now = new Date()
  const sameDay = then.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = then.toDateString() === yesterday.toDateString()
  const time = then.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  if (sameDay) return `Hoje ${time}`
  if (isYesterday) return `Ontem ${time}`
  return `${then.toLocaleDateString("pt-BR")} ${time}`
}

export default async function EventQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ com?: string }>
}) {
  const { id: eventId } = await params
  const { com } = await searchParams

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient<Database>(url, anonKey, {
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
  if (!user) {
    redirect(`/login?return=/events/${eventId}/perguntas`)
  }

  // RLS decide o que o visitante enxerga. Sem evento legível, 404 honesto.
  const { data: eventData, error: eventError } = await authClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()
  if (eventError) throw new Error(`failed to read event: ${eventError.message}`)
  const event = eventData as EventRow | null
  if (!event) notFound()

  const viewerId = user.id
  const organizerId = event.organizer_id
  const isOrganizer = organizerId === viewerId
  const isCancelled = event.status === "cancelled"

  const { data: organizerData, error: organizerError } = await authClient
    .from("profiles")
    .select("display_name")
    .eq("user_id", event.organizer_id)
    .maybeSingle()
  if (organizerError) throw new Error(`failed to read organizer: ${organizerError.message}`)
  const organizerName = (organizerData as { display_name: string } | null)?.display_name ?? null

  const { data: viewerData } = await authClient
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle()
  const viewerName = (viewerData as { display_name: string } | null)?.display_name ?? null

  // Conversas do evento. A RLS já limita a quem participa; o autor reencontra a
  // dele pelo contexto, o organizador enxerga todas as perguntas do evento.
  // `as never` no valor do enum: `database.generated.ts` só ganha
  // 'event_question' depois de `supabase gen types` contra a stack migrada — o
  // mesmo recurso local já usado para event_rsvp.
  const { data: conversationData, error: conversationError } = await authClient
    .from("dm_conversations")
    .select("id, participant_a, participant_b, context_type, context_id")
    .eq("context_type", "event_question" as never)
    .eq("context_id", event.id)
    .order("created_at", { ascending: true })
  if (conversationError)
    throw new Error(`failed to read conversations: ${conversationError.message}`)
  const conversations = (conversationData as unknown as ConversationRow[] | null) ?? []

  const eventThread = threadConversationForEvent(
    conversations.map((c) => ({
      id: c.id,
      contextType: c.context_type,
      contextId: c.context_id,
    })),
    event.id,
  )

  const state = deriveQuestionViewState({
    viewerIsOrganizer: isOrganizer,
    hasEventThread: eventThread !== null,
  })

  // Nome de quem pergunta, para o organizador ler a lista e o fio.
  const counterpartIds = new Set<string>()
  for (const conversation of conversations) {
    counterpartIds.add(
      conversation.participant_a === user.id
        ? conversation.participant_b
        : conversation.participant_a,
    )
  }
  if (isOrganizer) counterpartIds.delete(user.id)
  const names = new Map<string, string>()
  if (counterpartIds.size > 0) {
    const { data: nameData } = await authClient
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", Array.from(counterpartIds))
    for (const row of (nameData as { user_id: string; display_name: string }[] | null) ?? []) {
      names.set(row.user_id, row.display_name)
    }
  }

  const selectedConversationId =
    isOrganizer && com && conversations.some((c) => c.id === com) ? com : (eventThread?.id ?? null)

  let messages: MessageRow[] = []
  if (selectedConversationId) {
    const { data: messageData, error: messageError } = await authClient
      .from("dm_messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", selectedConversationId)
      .order("created_at", { ascending: true })
    if (messageError) throw new Error(`failed to read messages: ${messageError.message}`)
    messages = (messageData as MessageRow[] | null) ?? []
  }

  function nameOf(userId: string): string | null {
    if (userId === viewerId) return viewerName
    if (userId === organizerId) return organizerName
    return names.get(userId) ?? null
  }

  const organizerProfileHref = `/profile/${event.organizer_id}` as Route
  const backToEvent = `/events/${event.id}`

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      {/* Mesma trilha de /meus-anuncios: destino de 44px, transição e a página
          atual marcada — sem aria-current o nav fica sem item corrente e a
          auditoria visual acusa '0 active nav items'. */}
      <nav aria-label="Trilha" className="text-sm text-muted">
        {/* Lista ordenada: o caminho tem ordem, e sem <ol>/<li> o leitor de tela
            perde a contagem dos passos. Alvos seguem de 44px. */}
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href={"/events" as Route}
              className="inline-flex min-h-11 items-center transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
            >
              Eventos
            </Link>
            <span aria-hidden="true">›</span>
          </li>
          <li>
            <Link
              href={backToEvent as Route}
              className="inline-flex min-h-11 items-center transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
            >
              {event.title}
            </Link>
            <span aria-hidden="true">›</span>
          </li>
          <li aria-current="page">Perguntas</li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="flex flex-col gap-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {state === "organizer" ? "Perguntas sobre este evento" : "Sua pergunta"}
          </h1>

          {/* Cartão do evento: data, hora e local; organizador com link. */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-[var(--semantic-surface)] p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <CalendarDays size={16} aria-hidden="true" className="text-muted" />
              <span>
                {formatEventDay(event.starts_at)} · {formatEventTime(event.starts_at)}
                {event.venue ? ` · ${event.venue}` : ""}
              </span>
            </p>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <User size={16} aria-hidden="true" className="text-muted" />
              <span>
                Organizado por{" "}
                <Link
                  href={organizerProfileHref}
                  className="inline-flex min-h-11 items-center font-medium text-[var(--semantic-action-primary)] underline-offset-4 transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
                >
                  {organizerName ?? "quem organiza"}
                </Link>
              </span>
            </p>
          </div>

          {isCancelled ? (
            <p className="text-sm font-medium text-danger">
              Este evento foi cancelado. As perguntas já enviadas continuam aqui; novas mensagens
              estão indisponíveis.
            </p>
          ) : null}

          {state === "organizer" ? (
            <OrganizerThreadList
              conversations={conversations}
              viewerId={user.id}
              nameOf={nameOf}
              selectedId={selectedConversationId}
              eventId={event.id}
            />
          ) : null}

          {!isOrganizer && !eventThread ? (
            <QuestionComposer
              mode="ask"
              eventId={event.id}
              backHref={backToEvent}
              disabled={isCancelled}
            />
          ) : null}

          {selectedConversationId ? (
            <section aria-labelledby="thread-heading" className="flex flex-col gap-3">
              <h2 id="thread-heading" className="text-base font-semibold tracking-tight">
                Fio da pergunta
              </h2>

              {messages.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma mensagem neste fio ainda.</p>
              ) : (
                <ol className="flex flex-col gap-4">
                  {messages.map((message) => {
                    const isMine = message.sender_id === user.id
                    const authorName = nameOf(message.sender_id)
                    return (
                      <li key={message.id} className="flex gap-3">
                        <MemberAvatar name={authorName} size="sm" className="mt-5 shrink-0" />
                        <div className="flex min-w-0 flex-col items-start">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">
                              {authorName ?? (isMine ? "Você" : "Participante")}
                            </span>
                            <span className="text-xs text-muted">
                              {formatThreadTime(message.created_at)}
                            </span>
                          </div>
                          <div
                            className={`mt-1 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed ${
                              isMine
                                ? "bg-[var(--semantic-selected)]"
                                : "bg-[var(--semantic-surface-sunken)]"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                          {isMine ? (
                            <p className="mt-1 text-xs text-muted" role="status">
                              ✓ Enviada
                            </p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}

              <QuestionComposer
                mode="reply"
                eventId={event.id}
                conversationId={selectedConversationId}
                backHref={backToEvent}
                disabled={isCancelled}
              />
            </section>
          ) : null}
        </article>

        <aside aria-labelledby="destino-heading" className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-[var(--semantic-surface)] p-4">
            <div
              className="flex h-32 items-center justify-center rounded-xl bg-[var(--semantic-surface-sunken)]"
              aria-hidden="true"
            >
              <EventsIllustration className="h-14 w-20" />
            </div>
            <MemberAvatar name={organizerName} />
            <h2 id="destino-heading" className="sr-only">
              Destinatário
            </h2>
            <p className="text-sm text-muted">{destinationNotice(organizerName)}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function OrganizerThreadList({
  conversations,
  viewerId,
  nameOf,
  selectedId,
  eventId,
}: {
  conversations: ConversationRow[]
  viewerId: string
  nameOf: (userId: string) => string | null
  selectedId: string | null
  eventId: string
}) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        title="Nenhuma pergunta ainda"
        description="Quando alguém pedir mais informações sobre este evento, a conversa aparece aqui."
        illustration={<EventsIllustration />}
      />
    )
  }

  return (
    <section aria-labelledby="organizer-list-heading" className="flex flex-col gap-2">
      <h2 id="organizer-list-heading" className="text-base font-semibold tracking-tight">
        Conversas
      </h2>
      <ul className="flex flex-col gap-2">
        {conversations.map((conversation) => {
          const counterpartId =
            conversation.participant_a === viewerId
              ? conversation.participant_b
              : conversation.participant_a
          const name = nameOf(counterpartId)
          const isSelected = conversation.id === selectedId
          return (
            <li key={conversation.id}>
              <Link
                href={`/events/${eventId}/perguntas?com=${conversation.id}` as Route}
                className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)] ${
                  isSelected
                    ? "border-[var(--semantic-action-primary)] bg-[var(--semantic-selected)]"
                    : "border-border hover:bg-[var(--semantic-selected)]"
                }`}
              >
                <MemberAvatar name={name} size="sm" />
                <span className="text-sm font-medium">{name ?? "Participante"}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
