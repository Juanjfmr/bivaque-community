import { describe, expect, it } from "vitest"
import {
  type ListingPhotoReplacementSteps,
  replaceListingPhoto,
} from "../../../apps/web/lib/listings/photo-replacement"

// SEC-006 (reparo 2026-10-19, tentativa 2) — a composição da troca de foto.
//
// Só a recusa SQL definitiva autoriza dizer que a foto anterior continua e que
// o objeto novo pode ser descartado. Resposta perdida, exceção de transporte ou
// erro sem código SQL são INCONCLUSIVOS: os bytes da foto nova são preservados
// porque o commit pode ter acontecido. A limpeza de objetos (nova em recusa,
// antigas após commit) é responsabilidade exclusiva da Server Action.

const NEW_PATH = "fixture-listing/0-new.jpg"
const OLD_PATH = "fixture-listing/0-old.jpg"
const OTHER_OLD_PATH = "fixture-listing/1-old.jpg"

function steps(
  overrides: Partial<ListingPhotoReplacementSteps> = {},
): ListingPhotoReplacementSteps {
  return {
    uploadNewPhoto: async () => ({ path: NEW_PATH }),
    commitReplacement: async () => ({ error: null, previousPaths: [OLD_PATH] }),
    ...overrides,
  }
}

describe("SEC-006 composição da troca de foto do Mercado", () => {
  it("mapeia sucesso e aviso de limpeza sem apagar nada no cliente", async () => {
    const result = await replaceListingPhoto(
      OLD_PATH,
      steps({
        commitReplacement: async () => ({
          error: null,
          previousPaths: [OLD_PATH, OTHER_OLD_PATH],
          cleanupFailed: true,
        }),
      }),
    )

    expect(result).toEqual({
      ok: true,
      path: NEW_PATH,
      previousCleanupFailed: true,
    })
  })

  it("recusa definitiva informa que a anterior continua", async () => {
    const result = await replaceListingPhoto(
      OLD_PATH,
      steps({
        commitReplacement: async () => ({
          error: "colisão de posição",
          definite: true,
          cleanupFailed: false,
        }),
      }),
    )

    expect(result).toEqual({
      ok: false,
      indeterminate: false,
      message: "Não foi possível trocar a foto. A foto anterior continua aqui.",
    })
  })

  it("erro inconclusivo não promete rollback nem apaga a foto nova", async () => {
    const result = await replaceListingPhoto(
      OLD_PATH,
      steps({
        commitReplacement: async () => ({
          error: "timeout",
          definite: false,
          cleanupFailed: false,
        }),
      }),
    )

    expect(result).toMatchObject({ ok: false, indeterminate: true })
    if (!result.ok) {
      expect(result.message).not.toContain("anterior continua aqui")
      expect(result.message).toContain("recarregue")
    }
  })

  it("exceção na troca é inconclusiva", async () => {
    const result = await replaceListingPhoto(
      OLD_PATH,
      steps({
        commitReplacement: async () => {
          throw new Error("resposta perdida")
        },
      }),
    )

    expect(result).toMatchObject({ ok: false, indeterminate: true })
  })

  it("falha no envio não apaga nada e mantém a anterior", async () => {
    const thrown = await replaceListingPhoto(
      OLD_PATH,
      steps({
        uploadNewPhoto: async () => {
          throw new Error("createImageBitmap indisponível")
        },
      }),
    )
    expect(thrown).toEqual({
      ok: false,
      indeterminate: false,
      message: "Não foi possível trocar a foto. A foto anterior continua aqui.",
    })

    const returned = await replaceListingPhoto(
      OLD_PATH,
      steps({ uploadNewPhoto: async () => ({ error: "arquivo grande" }) }),
    )
    expect(returned).toEqual({
      ok: false,
      indeterminate: false,
      message: "Não foi possível trocar a foto. A foto anterior continua aqui.",
    })
  })
})
