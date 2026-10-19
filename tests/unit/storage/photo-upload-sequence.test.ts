import { describe, expect, it, vi } from "vitest"
import {
  runWithPending,
  uploadPhotosOneByOne,
} from "../../../apps/web/lib/storage/photo-upload-sequence"

// SEC-006 (revisão M2) — o `bodySizeLimit` de 12 MB vale para o corpo inteiro
// de uma chamada. Estes testes provam que os formulários com várias fotos
// passam a mandar uma por chamada e que uma falha não prende o `pending`.

const MB = 1024 * 1024

function jpeg(bytes: number): File {
  return new File([new Uint8Array(bytes)], "foto.jpg", { type: "image/jpeg" })
}

describe("SEC-006 envio de fotos em chamadas separadas", () => {
  it("2 fotos de 7 MB somam mais de 12 MB, mas saem em 2 chamadas de 1 foto", async () => {
    const files = [jpeg(7 * MB), jpeg(7 * MB)]
    const payloads: number[] = []

    const result = await uploadPhotosOneByOne(files, async (file) => {
      payloads.push(file.size)
      return { path: `/listing/${payloads.length}.jpg` }
    })

    expect(payloads.reduce((total, size) => total + size, 0)).toBeGreaterThan(12 * MB)
    expect(payloads).toEqual([7 * MB, 7 * MB])
    expect(payloads.every((size) => size < 12 * MB)).toBe(true)
    expect(result).toEqual({ uploaded: 2, failures: [] })
  })

  it("uma foto que falha não impede o envio das seguintes", async () => {
    const files = [jpeg(MB), jpeg(MB), jpeg(MB)]
    const attempted: number[] = []

    const result = await uploadPhotosOneByOne(files, async (_file, index) => {
      attempted.push(index)
      return index === 1 ? { error: "Falha no envio da foto." } : { path: `/listing/${index}.jpg` }
    })

    expect(attempted).toEqual([0, 1, 2])
    expect(result.uploaded).toBe(2)
    expect(result.failures).toEqual([{ index: 1, message: "Falha no envio da foto." }])
  })
})

describe("SEC-006 pending nunca fica preso", () => {
  it("uma rejeição da Server Action encerra o pending e devolve mensagem", async () => {
    const setPending = vi.fn()
    const rejection = new Error("Body exceeded 12mb limit")

    const outcome = await runWithPending(
      setPending,
      async () => {
        throw rejection
      },
      "Não foi possível enviar. Seu texto continua aqui.",
    )

    expect(setPending.mock.calls).toEqual([[true], [false]])
    expect(outcome).toEqual({
      ok: false,
      message: "Não foi possível enviar. Seu texto continua aqui.",
    })
  })

  it("no caminho de sucesso o pending também é encerrado", async () => {
    const setPending = vi.fn()

    const outcome = await runWithPending(setPending, async () => "ok", "falhou")

    expect(outcome).toEqual({ ok: true, value: "ok" })
    expect(setPending.mock.calls).toEqual([[true], [false]])
  })
})
