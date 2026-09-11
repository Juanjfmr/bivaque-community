import { describe, expect, it } from "vitest"
import {
  buildEventCreatePayload,
  buildEventPayload,
  validateEventForm,
} from "../../../apps/web/lib/events/event-form"

// RECON-029 (R35): o payload de edição NÃO carrega alcance. Editar não muda
// localidade/comunidade/grupo — é a proibição explícita da cláusula R35.
// O payload de criação fixa organizador (sessão) e cidade (contexto).

describe("validateEventForm", () => {
  const valid = {
    title: "Café entre vizinhos",
    description: "Encontro aberto.",
    startsAt: "2026-09-12T09:00",
    venue: "Jardim das Acácias",
  }

  it("aceita o formulário completo", () => {
    expect(validateEventForm(valid)).toBeNull()
  })

  it("recusa título curto, data ausente e data inválida", () => {
    expect(validateEventForm({ ...valid, title: "a" })).toMatch(/título/i)
    expect(validateEventForm({ ...valid, startsAt: "" })).toMatch(/data e a hora/i)
    expect(validateEventForm({ ...valid, startsAt: "não é data" })).toMatch(/inválidas/i)
  })

  it("recusa campos acima do teto", () => {
    expect(validateEventForm({ ...valid, title: "a".repeat(201) })).toMatch(/título/i)
    expect(validateEventForm({ ...valid, description: "a".repeat(2001) })).toMatch(/descrição/i)
    expect(validateEventForm({ ...valid, venue: "a".repeat(201) })).toMatch(/local/i)
  })
})

describe("buildEventPayload (edição)", () => {
  it("carrega só os campos editáveis — nenhum campo de alcance", () => {
    const payload = buildEventPayload({
      title: "  Café  ",
      description: "  ",
      startsAt: "2026-09-12T09:00",
      venue: "  ",
    })
    expect(payload).toEqual({
      title: "Café",
      description: null,
      starts_at: new Date("2026-09-12T09:00").toISOString(),
      venue: null,
    })
    expect(Object.keys(payload)).not.toContain("locality_id")
    expect(Object.keys(payload)).not.toContain("community_id")
    expect(Object.keys(payload)).not.toContain("group_id")
    expect(Object.keys(payload)).not.toContain("status")
  })
})

describe("buildEventCreatePayload", () => {
  it("fixa organizador da sessão e cidade do contexto", () => {
    const payload = buildEventCreatePayload(
      { title: "Feira", description: "", startsAt: "2026-09-12T09:00", venue: "" },
      { organizerId: "user-1", localityId: "loc-1" },
    )
    expect(payload.organizer_id).toBe("user-1")
    expect(payload.locality_id).toBe("loc-1")
    expect(payload.title).toBe("Feira")
  })
})
