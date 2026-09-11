import { describe, expect, it } from "vitest"
import {
  canSendQuestion,
  deriveQuestionViewState,
  destinationNotice,
  hasRelevantEventChange,
  normalizeQuestion,
  QUESTION_MAX_LENGTH,
  QUESTION_SEND_FAILURE_COPY,
  threadConversationForEvent,
} from "../../../apps/web/lib/events/question-thread"

// RECON-029 (R34 / prancha 67): as regras puras que a rota usa para decidir o
// estado da tela, qual conversa é o fio e quando uma edição de evento é
// relevante. A regra de entregar o destinatário mora no banco
// (open_event_question), não neste módulo — e há teste negativo de RLS em pgTAP.

describe("canSendQuestion", () => {
  it("rejeita vazio e só-espaços e aceita texto dentro do teto", () => {
    expect(canSendQuestion("")).toBe(false)
    expect(canSendQuestion("   ")).toBe(false)
    expect(canSendQuestion("Posso levar as crianças?")).toBe(true)
  })

  it("respeita o teto de dm_messages.content (2000)", () => {
    expect(canSendQuestion("a".repeat(QUESTION_MAX_LENGTH))).toBe(true)
    expect(canSendQuestion("a".repeat(QUESTION_MAX_LENGTH + 1))).toBe(false)
  })

  it("normaliza removendo as bordas, preservando o miolo", () => {
    expect(normalizeQuestion("  pergunta  ")).toBe("pergunta")
  })
})

describe("threadConversationForEvent", () => {
  const conversations = [
    { id: "c1", contextType: "shared_group", contextId: "event-1" },
    { id: "c2", contextType: "event_question", contextId: "event-outro" },
    { id: "c3", contextType: "event_question", contextId: "event-1" },
  ]

  it("só devolve a conversa cujo contexto aponta para este evento", () => {
    expect(threadConversationForEvent(conversations, "event-1")?.id).toBe("c3")
  })

  it("não confunde outro contexto que por acaso carrega o mesmo id", () => {
    expect(threadConversationForEvent(conversations, "event-2")).toBeNull()
  })
})

describe("deriveQuestionViewState", () => {
  it("organizador vê a lista de fios", () => {
    expect(deriveQuestionViewState({ viewerIsOrganizer: true, hasEventThread: false })).toBe(
      "organizer",
    )
  })

  it("membro com fio lê e responde; sem fio, pergunta", () => {
    expect(deriveQuestionViewState({ viewerIsOrganizer: false, hasEventThread: true })).toBe(
      "thread",
    )
    expect(deriveQuestionViewState({ viewerIsOrganizer: false, hasEventThread: false })).toBe("ask")
  })
})

describe("destinationNotice", () => {
  it("declara o nome de quem organiza quando resolvido", () => {
    expect(destinationNotice("Mariana Santos")).toBe(
      "Sua pergunta será enviada a Mariana Santos, que organiza este evento.",
    )
  })

  it("sem nome, continua honesto sobre quem recebe e não inventa pessoa", () => {
    expect(destinationNotice(null)).toBe("Sua pergunta será enviada a quem organiza este evento.")
    expect(destinationNotice("  ")).toBe("Sua pergunta será enviada a quem organiza este evento.")
  })
})

describe("hasRelevantEventChange (espelha notify_event_change)", () => {
  const base = {
    title: "Café entre vizinhos",
    description: null,
    startsAt: "2026-09-12T09:00:00.000Z",
    venue: "Jardim das Acácias",
    status: "upcoming",
  }

  it("é falso quando nada relevante mudou", () => {
    expect(hasRelevantEventChange(base, { ...base })).toBe(false)
  })

  it("é verdadeiro para horário, local, título, descrição ou situação", () => {
    expect(hasRelevantEventChange(base, { ...base, startsAt: "2026-09-12T10:00:00.000Z" })).toBe(
      true,
    )
    expect(hasRelevantEventChange(base, { ...base, venue: "Outro lugar" })).toBe(true)
    expect(hasRelevantEventChange(base, { ...base, title: "Outro título" })).toBe(true)
    expect(hasRelevantEventChange(base, { ...base, description: "nova" })).toBe(true)
    expect(hasRelevantEventChange(base, { ...base, status: "cancelled" })).toBe(true)
  })
})

describe("copy de falha", () => {
  it("a mensagem de falha é a da prancha e afirma que o texto foi mantido", () => {
    expect(QUESTION_SEND_FAILURE_COPY).toBe("Não foi possível enviar. Seu texto foi mantido.")
  })
})
