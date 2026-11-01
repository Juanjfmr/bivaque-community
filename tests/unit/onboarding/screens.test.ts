import { describe, expect, it } from "vitest"
import { documentFormMode, statusScreen } from "../../../apps/web/lib/onboarding/screens"

// PORT-004 (frente B), correção da revisão independente: a decisão de qual tela
// cada situação abre, medida sem navegador.
//
// O caso que a revisão reproduziu é o da recusa manual: o documento foi
// recusado pela equipe (`review_status = 'rejected'`) e o resultado da pessoa é
// `rejected`. A tela desviava antes de ler o documento e mostrava "Não
// localizamos o vínculo", perdendo o caminho de enviar outro arquivo. A recusa
// da fonte oficial também é `rejected`, mas sem documento — e essa continua no
// resultado da consulta, como `renderEntryResult` no protótipo.

describe("status screen decision", () => {
  it("sends a verified person to the city step", () => {
    expect(statusScreen({ status: "verified", document: "none" })).toEqual({ screen: "locality" })
  })

  it("keeps the analysis screen while the document is in review", () => {
    expect(statusScreen({ status: "pending", document: "in_review" })).toEqual({
      screen: "pending",
      askedForReplacement: false,
    })
  })

  it("keeps the analysis screen while the source asks for a conference", () => {
    expect(statusScreen({ status: "pending", document: "none" })).toEqual({
      screen: "pending",
      askedForReplacement: false,
    })
  })

  it("shows the request for another document after a manual rejection", () => {
    expect(statusScreen({ status: "rejected", document: "needs_replacement" })).toEqual({
      screen: "pending",
      askedForReplacement: true,
    })
  })

  it("does not lose the recovery path when the rejection arrives while pending", () => {
    expect(statusScreen({ status: "pending", document: "needs_replacement" })).toEqual({
      screen: "pending",
      askedForReplacement: true,
    })
  })

  it("keeps the source rejection on the result screen", () => {
    expect(statusScreen({ status: "rejected", document: "none" })).toEqual({ screen: "result" })
  })

  it("keeps an unavailable source on the result screen", () => {
    expect(statusScreen({ status: "temporary_error", document: "none" })).toEqual({
      screen: "result",
    })
  })

  it("treats the absence of a result as the result screen", () => {
    expect(statusScreen({ status: null, document: "none" })).toEqual({ screen: "result" })
  })

  it("lets a verified person into the city even with a stale document row", () => {
    expect(statusScreen({ status: "verified", document: "needs_replacement" })).toEqual({
      screen: "locality",
    })
  })
})

describe("document form mode", () => {
  it("offers the first upload when there is no document", () => {
    expect(documentFormMode("none")).toBe("upload")
  })

  it("offers another file after a manual rejection", () => {
    expect(documentFormMode("needs_replacement")).toBe("replace")
  })

  it("offers another file while the current one is in review", () => {
    expect(documentFormMode("in_review")).toBe("in-review")
  })

  it("never offers a new file for an approved document", () => {
    // A página desvia um documento aprovado antes de desenhar o formulário;
    // se a decisão for chamada assim mesmo, ela não abre um envio novo.
    expect(documentFormMode("approved")).toBe("upload")
  })
})
