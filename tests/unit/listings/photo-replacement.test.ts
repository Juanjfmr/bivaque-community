import { describe, expect, it } from "vitest"
import {
  type ListingPhotoReplacementSteps,
  replaceListingPhoto,
} from "../../../apps/web/lib/listings/photo-replacement"

// SEC-006 (revisão M1) — a troca de foto do Mercado.
//
// O cenário que o Codex apontou: a foto nova já foi gravada em
// `listing_photos` e a remoção da foto anterior falha. Desfazer a foto nova
// nesse momento deixa o anúncio apontando para um objeto que não existe, e a
// mensagem diz que a anterior continua disponível — o que é falso.

const NEW_PATH = "fixture-listing/0-new.jpg"
const OLD_PATH = "fixture-listing/0-old.jpg"

function steps(
  overrides: Partial<ListingPhotoReplacementSteps> = {},
): ListingPhotoReplacementSteps {
  return {
    uploadNewPhoto: async () => ({ path: NEW_PATH }),
    clearPhotoRows: async () => ({ error: null }),
    insertNewPhotoRow: async () => ({ error: null }),
    deletePhotoObject: async () => ({ ok: true }),
    ...overrides,
  }
}

describe("SEC-006 troca de foto do Mercado", () => {
  it("mantém a foto nova quando apagar o objeto anterior lança erro", async () => {
    const deleted: string[] = []
    const result = await replaceListingPhoto(
      OLD_PATH,
      steps({
        deletePhotoObject: async (path) => {
          deleted.push(path)
          if (path === OLD_PATH) throw new Error("storage indisponível")
          return { ok: true }
        },
      }),
    )

    expect(deleted).toEqual([OLD_PATH])
    expect(result).toEqual({ ok: true, path: NEW_PATH, previousCleanupFailed: true })
  })

  it("mantém a foto nova quando apagar o objeto anterior devolve falha", async () => {
    const deleted: string[] = []
    const result = await replaceListingPhoto(
      OLD_PATH,
      steps({
        deletePhotoObject: async (path) => {
          deleted.push(path)
          return path === OLD_PATH ? { ok: false } : { ok: true }
        },
      }),
    )

    expect(deleted).toEqual([OLD_PATH])
    expect(result).toEqual({ ok: true, path: NEW_PATH, previousCleanupFailed: true })
  })

  it("desfaz a foto nova quando a linha nova não é gravada", async () => {
    const deleted: string[] = []
    const result = await replaceListingPhoto(
      OLD_PATH,
      steps({
        insertNewPhotoRow: async () => ({ error: "linha recusada" }),
        deletePhotoObject: async (path) => {
          deleted.push(path)
          return { ok: true }
        },
      }),
    )

    expect(deleted).toEqual([NEW_PATH])
    expect(result).toEqual({
      ok: false,
      message: "Não foi possível trocar a foto. A foto anterior continua aqui.",
    })
  })

  it("não remove o objeto anterior quando o caminho é o mesmo", async () => {
    const deleted: string[] = []
    const result = await replaceListingPhoto(
      NEW_PATH,
      steps({
        deletePhotoObject: async (path) => {
          deleted.push(path)
          return { ok: true }
        },
      }),
    )

    expect(deleted).toEqual([])
    expect(result).toEqual({ ok: true, path: NEW_PATH, previousCleanupFailed: false })
  })
})
