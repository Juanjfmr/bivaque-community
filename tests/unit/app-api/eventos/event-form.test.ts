import { describe, expect, it } from "vitest"
import {
  buildEventUpdatePayload,
  EVENTO_CANCELADO,
  eventInputFromBody,
  intencaoDoPatch,
  validateEventForm,
} from "web/lib/events/event-form"

describe("eventInputFromBody", () => {
  it("mapeia o contrato do app e separa 'sem capa' de 'capa vazia'", () => {
    expect(eventInputFromBody({ titulo: "Encontro", comecaEm: "2026-12-01T12:00:00Z" })).toEqual({
      input: {
        title: "Encontro",
        description: "",
        startsAt: "2026-12-01T12:00:00Z",
        venue: "",
        coverPath: "",
      },
      // Sem `capa` no corpo: a edição não pode tocar na capa gravada.
      temCapa: false,
    })
    expect(
      eventInputFromBody({ titulo: "Encontro", comecaEm: "2026-12-01T12:00:00Z", capa: "" }),
    ).toMatchObject({ temCapa: true })
  })

  it("recusa campo ausente ou de tipo errado e reusa a validação do formulário", () => {
    expect(eventInputFromBody({ titulo: "x", comecaEm: "2026-12-01", local: null })).toBeNull()
    expect(eventInputFromBody({ titulo: "x" })).toBeNull()
    expect(
      eventInputFromBody({ titulo: "Encontro", comecaEm: "2026-12-01T12:00:00Z", capa: 7 }),
    ).toBeNull()
    const corpo = eventInputFromBody({ titulo: "x", comecaEm: "2026-12-01T12:00:00Z" })
    expect(corpo === null ? null : validateEventForm(corpo.input)).toBe(
      "O título precisa de pelo menos 2 caracteres.",
    )
  })
})

describe("intencaoDoPatch", () => {
  it("corpo sem status é edição; só 'cancelled' cancela", () => {
    expect(intencaoDoPatch({ titulo: "Encontro", comecaEm: "2026-12-01T12:00:00Z" })).toBe("editar")
    expect(intencaoDoPatch({ status: EVENTO_CANCELADO })).toBe("cancelar")
  })

  it.each([
    ["concluído", "completed"],
    ["futuro", "upcoming"],
    ["nulo", null],
    ["maiúsculo", "CANCELLED"],
  ])("qualquer outro status (%s) é dado inválido", (_label, status) => {
    expect(intencaoDoPatch({ status })).toBe("invalido")
  })
})

describe("buildEventUpdatePayload", () => {
  const entrada = {
    title: "Encontro",
    description: "Descrição",
    startsAt: "2026-12-01T12:00:00Z",
    venue: "Praça",
    coverPath: "",
  }

  it("sem capa no corpo, o campo nem entra no update", () => {
    expect(buildEventUpdatePayload(entrada, false)).not.toHaveProperty("cover_path")
  })

  it("com capa, a troca é intencional — inclusive remover", () => {
    expect(buildEventUpdatePayload(entrada, true)).toHaveProperty("cover_path", null)
    expect(
      buildEventUpdatePayload({ ...entrada, coverPath: "user/capa.jpg" }, true),
    ).toHaveProperty("cover_path", "user/capa.jpg")
  })
})
