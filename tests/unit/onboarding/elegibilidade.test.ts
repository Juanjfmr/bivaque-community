import { describe, expect, it } from "vitest"
import {
  formatCpfInput,
  formatUploadedAt,
  pendingHeadline,
  pendingLead,
  pendingTimeline,
} from "../../../apps/web/lib/onboarding/elegibility"

// PORT-004 (frente B): a lógica da elegibilidade medida sem navegador. Os casos
// são os estados de `renderEntryResult` e `renderEntryPending`
// (prototypes/bivaque-html/src/features/entry/account.js) — o mesmo texto, na
// mesma ordem, com o passo do documento trocando de estado conforme o envio.

describe("CPF field mask", () => {
  it("formats progressively, as the prototype does", () => {
    expect(formatCpfInput("")).toBe("")
    expect(formatCpfInput("123")).toBe("123")
    expect(formatCpfInput("1234")).toBe("123.4")
    expect(formatCpfInput("1234567")).toBe("123.456.7")
    expect(formatCpfInput("1234567890")).toBe("123.456.789-0")
    expect(formatCpfInput("12345678909")).toBe("123.456.789-09")
  })
})

describe("uploaded document timestamp", () => {
  it("reads in Manaus time, as server-rendered copy", () => {
    expect(formatUploadedAt("2026-10-13T20:00:00Z")).toBe("13/10, 16:00")
  })

  it("returns an empty string instead of inventing a date", () => {
    expect(formatUploadedAt("not-a-date")).toBe("")
  })
})

describe("pending headline", () => {
  it("follows the three states of the prototype", () => {
    expect(pendingHeadline({ askedForReplacement: false, hasDocument: true })).toBe(
      "Recebemos seu documento.",
    )
    expect(pendingHeadline({ askedForReplacement: true, hasDocument: false })).toBe(
      "A equipe pediu outro documento.",
    )
    expect(pendingHeadline({ askedForReplacement: false, hasDocument: false })).toBe(
      "Sua elegibilidade está em análise.",
    )
  })

  it("says the content is closed while the team checks", () => {
    expect(pendingLead(true)).toBe("Enquanto a equipe confere, o conteúdo do Bivaque fica fechado.")
  })

  it("invites a document when there is none", () => {
    expect(pendingLead(false)).toContain(
      "envie um documento que mostre o vínculo, como o contracheque ou a identidade militar",
    )
  })
})

describe("pending timeline", () => {
  const base = { email: "pessoa@example.invalid", askedForReplacement: false, uploadedAt: null }

  it("has the four steps of the prototype, in order", () => {
    const steps = pendingTimeline(base)

    expect(steps.map((step) => step.title)).toEqual([
      "Conta criada",
      "Consulta feita",
      "Análise da equipe",
      "Escolher sua cidade",
    ])
    expect(steps.map((step) => step.state)).toEqual(["done", "now", "now", "todo"])
    expect(steps[0]?.detail).toBe("pessoa@example.invalid")
    expect(steps[1]?.detail).toBe("A fonte oficial pediu uma conferência")
    expect(steps[3]?.detail).toBe("Assim que liberar")
  })

  it("marks the document step as done when a file was sent", () => {
    const steps = pendingTimeline({ ...base, uploadedAt: "2026-10-13T20:00:00Z" })

    expect(steps[1]).toEqual({
      detail: "13/10, 16:00",
      state: "done",
      title: "Documento enviado",
    })
  })

  it("names the request for another document on the current step", () => {
    const steps = pendingTimeline({ ...base, askedForReplacement: true })

    expect(steps[1]).toEqual({
      detail: "A equipe pediu outro documento",
      state: "now",
      title: "Consulta feita",
    })
  })
})
