// FIGMA-001 — prova unitária da orquestração pura da central de conversas.
// O Vitest da casa roda em node sem DOM (ver inicio-recon.test.tsx), então o
// que se prova aqui são as decisões que a caixa e o thread tomam: rótulo de
// contexto, href de origem (nunca link morto), relógio da caixa, prévia e o
// guarda de submit duplicado que impede gravar duas mensagens num clique duplo.

import { describe, expect, it } from "vitest"
import {
  blockStateFor,
  buildInboxEntries,
  type ConversationRow,
  canSubmitReply,
  contextLabelFor,
  counterpartIdOf,
  formatInboxTime,
  inboxCopyFor,
  type LastMessageRow,
  lastMessagePreview,
  originHrefFor,
} from "web/app/(shell)/messages/conversas-loaders"

const ME = "10000000-0000-4000-8000-000000000001"
const OTHER = "20000000-0000-4000-8000-000000000002"

function conversation(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "30000000-0000-4000-8000-000000000003",
    participant_a: ME,
    participant_b: OTHER,
    context_type: "provider",
    context_id: "40000000-0000-4000-8000-000000000004",
    created_at: "2026-10-05T12:00:00.000Z",
    ...overrides,
  }
}

describe("contextos e origens", () => {
  it("rotula apenas os contextos que existem no enum", () => {
    expect(contextLabelFor("provider")).toBe("Prestador")
    expect(contextLabelFor("shared_group")).toBe("Grupo em comum")
    expect(contextLabelFor("shared_event")).toBe("Evento em comum")
    expect(contextLabelFor("recommendation_thread")).toBe("Indicação")
    expect(contextLabelFor("accepted_family")).toBe("Família")
    // Contexto desconhecido não vira rótulo inventado: ecoa o tipo cru.
    expect(contextLabelFor("sei_la_o_que")).toBe("sei_la_o_que")
  })

  it("aponta Ver origem só para rota que existe hoje", () => {
    const id = "40000000-0000-4000-8000-000000000004"
    expect(originHrefFor("shared_group", id)).toBe(`/groups/${id}`)
    expect(originHrefFor("shared_event", id)).toBe(`/events/${id}`)
    expect(originHrefFor("recommendation_thread", id)).toBe(`/publicacoes/${id}`)
    expect(originHrefFor("provider", id)).toBe(`/prestadores/${id}`)
    // Vínculo familiar não tem superfície pública: null esconde o botão.
    expect(originHrefFor("accepted_family", id)).toBeNull()
    expect(originHrefFor("contexto_futuro", id)).toBeNull()
  })

  it("resolve a contraparte nunca o caller", () => {
    expect(counterpartIdOf(conversation(), ME)).toBe(OTHER)
    expect(counterpartIdOf(conversation({ participant_a: OTHER, participant_b: ME }), ME)).toBe(
      OTHER,
    )
  })
})

describe("relógio e prévia da caixa", () => {
  const now = new Date(2026, 9, 5, 15, 30).getTime()

  it("usa o eixo Hoje/Ontem do Figma", () => {
    const today = new Date(2026, 9, 5, 10, 42).toISOString()
    const yesterday = new Date(2026, 9, 4, 18, 40).toISOString()
    expect(formatInboxTime(today, now)).toMatch(/^Hoje · 10:42$/)
    expect(formatInboxTime(yesterday, now)).toMatch(/^Ontem · 18:40$/)
    expect(formatInboxTime("2026-09-01T09:00:00.000Z", now)).toBe("01 de set.")
    // Registro sem data vazio, nunca "Invalid Date".
    expect(formatInboxTime("nada", now)).toBe("")
  })

  it("marca como própria só a mensagem do caller", () => {
    const mine: LastMessageRow = {
      id: "m1",
      conversation_id: "c1",
      sender_id: ME,
      content: "Olá! Gostaria de confirmar a disponibilidade.",
      created_at: "2026-10-05T10:42:00.000Z",
    }
    const theirs: LastMessageRow = { ...mine, id: "m2", sender_id: OTHER }
    expect(lastMessagePreview(mine, ME)).toBe("Você: Olá! Gostaria de confirmar a disponibilidade.")
    expect(lastMessagePreview(theirs, ME)).toBe("Olá! Gostaria de confirmar a disponibilidade.")
    expect(lastMessagePreview(null, ME)).toBe("")
  })

  it("monta a caixa com dados reais, ordenada da mais nova", () => {
    const third = "50000000-0000-4000-8000-000000000005"
    const older = conversation({
      id: "c-old",
      participant_b: third,
      created_at: "2026-10-01T08:00:00.000Z",
    })
    const newer = conversation({ id: "c-new", created_at: "2026-10-05T11:00:00.000Z" })
    const names = new Map([[OTHER, "Amazon Climatização"]])
    const lastMessages = new Map<string, LastMessageRow>([
      [
        "c-new",
        {
          id: "m1",
          conversation_id: "c-new",
          sender_id: OTHER,
          content: "Recebemos seu pedido. Podemos combinar os detalhes por aqui.",
          created_at: new Date(2026, 9, 5, 10, 42).toISOString(),
        },
      ],
    ])
    const entries = buildInboxEntries([older, newer], names, lastMessages, ME, now)
    expect(entries.map((entry) => entry.id)).toEqual(["c-new", "c-old"])
    expect(entries[0]).toMatchObject({
      title: "Amazon Climatização",
      contextLabel: "Prestador",
      href: "/messages/c-new",
      timeLabel: "Hoje · 10:42",
    })
    // Sem nome resolvido e sem última mensagem: degrada honestamente.
    expect(entries[1].title).toBe(third.slice(0, 8))
    expect(entries[1].preview).toBe("")
    expect(entries[1].timeLabel).toBe("")
  })
})

describe("títulos de conversa provider por conversa", () => {
  const P1 = "40000000-0000-4000-8000-000000000004"
  const P2 = "40000000-0000-4000-8000-000000000007"
  const providers = new Map([
    [P1, { id: P1, display_name: "Climatiza Manaus", owner_user_id: OTHER }],
    [P2, { id: P2, display_name: "Negócio B", owner_user_id: OTHER }],
  ])
  const names = new Map([
    [ME, "Juan Membro"],
    [OTHER, "Prestador Pessoa"],
  ])

  it("consumidor vê o nome comercial da ficha", () => {
    const conv = conversation({ context_type: "provider", context_id: P1 })
    const entries = buildInboxEntries([conv], new Map(), new Map(), ME, 0, providers)
    expect(entries[0].title).toBe("Climatiza Manaus")
  })

  it("dono da ficha vê o nome do membro, não o próprio negócio", () => {
    const conv = conversation({ context_type: "provider", context_id: P1 })
    const entries = buildInboxEntries([conv], names, new Map(), OTHER, 0, providers)
    expect(entries[0].title).toBe("Juan Membro")
  })

  it("dono com duas fichas e contexto misto não herda nome comercial de outro contexto", () => {
    const convP1 = conversation({ id: "c-p1", context_type: "provider", context_id: P1 })
    const convP2 = conversation({
      id: "c-p2",
      context_type: "provider",
      context_id: P2,
      participant_a: OTHER,
      participant_b: ME,
    })
    const convGroup = conversation({ id: "c-gr", context_type: "shared_group" })
    const entries = buildInboxEntries(
      [convP1, convP2, convGroup],
      names,
      new Map(),
      OTHER,
      0,
      providers,
    )
    const byId = new Map(entries.map((entry) => [entry.id, entry]))
    // Para o dono, todas as contrapartes são o membro — nenhuma vira negócio.
    expect(byId.get("c-p1")?.title).toBe("Juan Membro")
    expect(byId.get("c-p2")?.title).toBe("Juan Membro")
    expect(byId.get("c-gr")?.title).toBe("Juan Membro")

    // Do lado do membro, cada conversa provider carrega a SUA ficha, e a de
    // grupo carrega o nome pessoal da contraparte.
    const asMember = buildInboxEntries(
      [convP1, convP2, convGroup],
      names,
      new Map(),
      ME,
      0,
      providers,
    )
    const memberById = new Map(asMember.map((entry) => [entry.id, entry]))
    expect(memberById.get("c-p1")?.title).toBe("Climatiza Manaus")
    expect(memberById.get("c-p2")?.title).toBe("Negócio B")
    expect(memberById.get("c-gr")?.title).toBe("Prestador Pessoa")
  })
})

describe("guarda de submit duplicado", () => {
  it("libera envio só com rascunho não vazio e nenhuma entrega pendente", () => {
    expect(canSubmitReply("", [])).toBe(false)
    expect(canSubmitReply("   ", [])).toBe(false)
    expect(canSubmitReply("Olá", [])).toBe(true)
    expect(canSubmitReply("Olá", [{ id: "m1", content: "x", status: "sent" }])).toBe(true)
    expect(canSubmitReply("Olá", [{ id: "m1", content: "x", status: "sending" }])).toBe(false)
    expect(canSubmitReply("Olá", [{ id: "m1", content: "x", status: "failed" }])).toBe(true)
  })
})

describe("bloqueio por par exato", () => {
  const THIRD = "60000000-0000-4000-8000-000000000006"

  it("marca só o bloqueio do par desta conversa", () => {
    expect(blockStateFor([], ME, OTHER)).toEqual({ blocked: false, byOther: false })
    expect(blockStateFor([{ blocker_user_id: ME, blocked_user_id: OTHER }], ME, OTHER)).toEqual({
      blocked: true,
      byOther: false,
    })
    expect(blockStateFor([{ blocker_user_id: OTHER, blocked_user_id: ME }], ME, OTHER)).toEqual({
      blocked: false,
      byOther: true,
    })
  })

  it("bloqueio de terceiro não impede nem marca a conversa atual", () => {
    // Regressão da revisão independente de 05/10/2026: o loop antigo marcava
    // a conversa se QUALQUER bloqueio do usuário existisse.
    const deTerceiro = [
      { blocker_user_id: ME, blocked_user_id: THIRD },
      { blocker_user_id: THIRD, blocked_user_id: ME },
    ]
    expect(blockStateFor(deTerceiro, ME, OTHER)).toEqual({ blocked: false, byOther: false })
    // E o par continua valendo quando há ruído de terceiros na mesma leitura.
    expect(
      blockStateFor([...deTerceiro, { blocker_user_id: OTHER, blocked_user_id: ME }], ME, OTHER),
    ).toEqual({ blocked: false, byOther: true })
  })
})

describe("copy da caixa por audiência (reparos finais 06/10/2026)", () => {
  it("preserva a copy do consumidor ao pé da letra", () => {
    // Travada também no e2e manaus-pilot-full-journey.spec.ts ("Conversas
    // nascem de um contexto"): o reparo do lado prestador não pode mover a do
    // membro — nem o padrão da prop (audience ausente = member).
    const member = inboxCopyFor("member")
    expect(member.subtitle).toBe("Respostas de prestadores, empresas e anunciantes.")
    expect(member.emptyTitle).toBe("Nenhuma conversa ainda")
    expect(member.emptyDescription).toBe(
      "Conversas nascem de um contexto: o contato com um prestador, uma pergunta em um evento ou um vínculo em comum.",
    )
  })

  it("o dono da ficha vê pedidos de membros, não respostas de prestadores", () => {
    const provider = inboxCopyFor("provider")
    expect(provider.subtitle).toMatch(/pedidos de membros/i)
    expect(provider.emptyTitle).toMatch(/pedido de membro/i)
    expect(provider.emptyDescription).toMatch(/membro/)
    // A copy do consumidor falava de "prestadores" como contraparte; do lado
    // do dono isso seria o espelho errado (ele É o prestador).
    expect(provider.subtitle).not.toBe(inboxCopyFor("member").subtitle)
    expect(provider.subtitle).not.toMatch(/respostas de prestadores/i)
    expect(provider.emptyDescription).not.toEqual(inboxCopyFor("member").emptyDescription)
  })
})
