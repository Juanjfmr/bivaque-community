import { describe, expect, it } from "vitest"
import {
  requestSubmissionBlocked,
  selectRequestPhotos,
} from "../../../apps/web/lib/service-requests/photo-selection"

// SEC-006 (reconferência 2026-10-19) — selecionar 7 fotos (máximo 6) esvaziava
// `photos` e mostrava erro; no submit o erro era apagado, as fotos removidas do
// FormData e o pedido "publicava com sucesso" sem anexo e sem aviso. O estado do
// formulário precisa preservar a seleção anterior e manter o erro até uma
// seleção válida. Este teste exercita o estado real usado pelo formulário, não
// uma regex no JSX.

function photo(name: string): File {
  return new File(["x"], name, { type: "image/jpeg" })
}

describe("SEC-006 seleção de fotos do pedido", () => {
  it("mantém as fotos anteriores quando a seleção nova passa do máximo", () => {
    const previous = [photo("a.jpg"), photo("b.jpg"), photo("c.jpg")]
    const seven = Array.from({ length: 7 }, (_, index) => photo(`${index}.jpg`))

    const state = selectRequestPhotos(previous, seven)

    expect(state.photos).toEqual(previous)
    expect(state.error).toBe("Envie no máximo 6 fotos.")
  })

  it("mantém o erro de seleção até uma seleção válida", () => {
    const invalid = selectRequestPhotos(
      [photo("a.jpg")],
      [photo("a.jpg"), new File(["x"], "a.gif", { type: "image/gif" })],
    )
    expect(invalid.error).toBe("Use imagens JPEG, PNG ou WebP.")

    const stillInvalid = selectRequestPhotos(invalid.photos, [
      ...Array.from({ length: 7 }, (_, index) => photo(`${index}.jpg`)),
    ])
    expect(stillInvalid.error).toBe("Envie no máximo 6 fotos.")
    expect(stillInvalid.photos).toEqual(invalid.photos)
  })

  it("substitui a seleção e limpa o erro quando a seleção é válida", () => {
    const selected = [photo("d.jpg"), photo("e.jpg")]

    const state = selectRequestPhotos([photo("a.jpg")], selected)

    expect(state.photos).toEqual(selected)
    expect(state.error).toBeNull()
  })

  it("bloqueia o envio enquanto o erro de seleção existir", () => {
    expect(requestSubmissionBlocked("Envie no máximo 6 fotos.")).toBe("Envie no máximo 6 fotos.")
  })

  it("libera o envio depois da seleção válida, inclusive sem fotos", () => {
    expect(requestSubmissionBlocked(null)).toBeNull()
  })

  it("seleção vazia é válida e limpa o erro", () => {
    const state = selectRequestPhotos([photo("a.jpg")], [])
    expect(state.photos).toEqual([])
    expect(state.error).toBeNull()
  })
})
