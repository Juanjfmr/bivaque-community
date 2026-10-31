import { describe, expect, it } from "vitest"
import {
  applyFilters,
  decisionToAction,
  type QueueFilters,
  resolveTargets,
  TARGET_LABELS,
} from "../../../../apps/web/app/(admin)/reports/targets"

// FIGMA-002 — o alvo `listing` na fila da operação.
//
// O operador lê TEXTO autorizado (título, autor, comunidade) e a marca de
// ocultação, que é o que habilita a restauração auditada. Foto não entra aqui:
// a matriz de mídia do ADR é a mesma do membro, sem exceção de operador. E o
// rótulo do alvo existe — sem ele o cartão cairia no fallback e a triagem não
// distinguiria anúncio de publicação.

type Row = Record<string, unknown>

function fakeServiceClient(rows: Record<string, Row[]>) {
  return {
    from(table: string) {
      return {
        select(_columns: string) {
          return {
            async in(_column: string, ids: string[]) {
              const all = rows[table] ?? []
              // `in` casa pela coluna pedida, que o cliente real já aplicou no
              // select; aqui basta o valor aparecer em qualquer campo da linha
              // (id de anúncio, user_id de perfil, id de comunidade).
              return {
                data: all.filter((row) => Object.values(row).some((v) => ids.includes(String(v)))),
                error: null,
              }
            },
          }
        },
      }
    },
  } as unknown as Parameters<typeof resolveTargets>[0]
}

const listingId = "81000000-0000-4000-8000-000000000401"
const communityId = "82000000-0000-4000-8000-000000000001"

describe("alvo listing na fila da operação", () => {
  it("tem rótulo próprio, sem cair no fallback do enum cru", () => {
    expect(TARGET_LABELS.listing).toBe("Anúncio de imóvel")
  })

  it("entrega trecho, autor, comunidade e a marca de ocultação", async () => {
    const client = fakeServiceClient({
      listings: [
        {
          id: listingId,
          title: "Apartamento 3 quartos",
          owner_user_id: "owner-1",
          community_id: communityId,
          moderation_hidden: true,
          created_at: "2026-10-01T12:00:00.000Z",
        },
      ],
      communities: [{ id: communityId, name: "Vila da Sintur" }],
      profiles: [{ user_id: "owner-1", display_name: "Ana Verificada" }],
    })

    const targets = await resolveTargets(client, [{ target_type: "listing", target_id: listingId }])
    expect(targets.get(listingId)).toEqual({
      content: "Apartamento 3 quartos",
      authorName: "Ana Verificada",
      communityName: "Vila da Sintur",
      contentCreatedAt: "2026-10-01T12:00:00.000Z",
      listingHidden: true,
    })
  })

  it("anúncio não ocultado traz listingHidden false, para a UI não sugerir estado", async () => {
    const client = fakeServiceClient({
      listings: [
        {
          id: listingId,
          title: "Casa na vila",
          owner_user_id: "owner-2",
          community_id: null,
          moderation_hidden: false,
          created_at: "2026-10-02T12:00:00.000Z",
        },
      ],
      profiles: [{ user_id: "owner-2", display_name: "Bruno Reinado" }],
    })

    const targets = await resolveTargets(client, [{ target_type: "listing", target_id: listingId }])
    expect(targets.get(listingId)?.listingHidden).toBe(false)
    expect(targets.get(listingId)?.communityName).toBeNull()
  })

  it("alvo ausente vira estado vazio honesto, com listingHidden nulo", async () => {
    const client = fakeServiceClient({})
    const targets = await resolveTargets(client, [{ target_type: "listing", target_id: listingId }])
    expect(targets.get(listingId)).toEqual({
      content: null,
      authorName: null,
      communityName: null,
      contentCreatedAt: null,
      listingHidden: null,
    })
  })
})

describe("filtro por tipo continua genérico", () => {
  it("listing é filtrável pelo mesmo caminho dos outros alvos", () => {
    const filters: QueueFilters = {
      tab: "em-analise",
      tipo: "listing",
      comunidade: null,
      motivo: null,
      ordem: "antigas",
      pagina: 1,
    }
    const rows = [
      {
        id: "a",
        target_type: "listing",
        target_id: listingId,
        reason: "Conteúdo enganoso",
        created_at: "2026-10-01T10:00:00.000Z",
        status: "open" as const,
        resolved_at: null,
        operator_note: null,
        excerpt: "Apartamento",
        authorName: "Ana",
        communityName: null,
        contentCreatedAt: null,
        openReportsOnTarget: 1,
      },
      {
        id: "b",
        target_type: "post",
        target_id: "post-1",
        reason: "Spam",
        created_at: "2026-10-02T10:00:00.000Z",
        status: "open" as const,
        resolved_at: null,
        operator_note: null,
        excerpt: "Compre já",
        authorName: "Carlos",
        communityName: null,
        contentCreatedAt: null,
        openReportsOnTarget: 1,
      },
    ]
    expect(applyFilters(rows, filters).map((row) => row.id)).toEqual(["a"])
  })
})

describe("a decisão continua sendo humana", () => {
  it("só 'manter' e 'ocultar' viram ação, inclusive no ramo de anúncio", () => {
    expect(decisionToAction("ocultar")).toBe("hide")
    expect(decisionToAction("manter")).toBe("dismiss")
    expect(decisionToAction("")).toBeNull()
    expect(decisionToAction("hide")).toBeNull()
    expect(decisionToAction(null)).toBeNull()
  })
})
