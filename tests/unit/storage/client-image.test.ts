import { describe, expect, it, vi } from "vitest"
import {
  type ClientImagePlatform,
  type DecodedImage,
  stripExifWith,
} from "../../../apps/web/lib/storage/client-image"

// SEC-006 (reconferência 2026-10-19) — o Mercado de edição ficava preso em
// "Enviando…" quando a etapa do navegador rejeitava. A causa não era o botão:
// `createImageBitmap`, `getContext` ou `toBlob` lançavam antes de a tela ter
// qualquer chance de encerrar o estado. Cada etapa tem um teste de exceção.

function file(): File {
  return new File([new Uint8Array([1, 2, 3])], "foto.jpg", { type: "image/jpeg" })
}

function decoded(): DecodedImage {
  return { width: 4, height: 3, close: vi.fn() }
}

function makePlatform(overrides: Partial<ClientImagePlatform> = {}): ClientImagePlatform {
  const image = decoded()
  const context = { drawImage: vi.fn() }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  }
  return {
    decode: vi.fn(async () => image),
    createCanvas: vi.fn(() => canvas),
    encode: vi.fn(async () => new Blob(["jpeg"], { type: "image/jpeg" })),
    ...overrides,
  }
}

describe("SEC-006 limpeza de EXIF no navegador", () => {
  it("desenha e reencoda sem metadados e fecha o bitmap", async () => {
    const image = decoded()
    const context = { drawImage: vi.fn() }
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => context) }
    const encode = vi.fn(async () => new Blob(["jpeg"], { type: "image/jpeg" }))
    const platformImpl: ClientImagePlatform = {
      decode: async () => image,
      createCanvas: () => canvas,
      encode,
    }

    const blob = await stripExifWith(file(), platformImpl)

    expect(blob.type).toBe("image/jpeg")
    expect(canvas.width).toBe(4)
    expect(canvas.height).toBe(3)
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0)
    expect(encode).toHaveBeenCalledWith(canvas, "image/jpeg", 0.9)
    expect(image.close).toHaveBeenCalledOnce()
  })

  it("falha com mensagem quando createImageBitmap rejeita e não fecha bitmap inexistente", async () => {
    const platformImpl = makePlatform({
      decode: async () => {
        throw new Error("imagem ilegível")
      },
    })

    await expect(stripExifWith(file(), platformImpl)).rejects.toThrow("imagem ilegível")
  })

  it("falha quando o canvas 2d não existe e ainda fecha o bitmap", async () => {
    const image = decoded()
    const platformImpl = makePlatform({
      decode: async () => image,
      createCanvas: () => ({ width: 0, height: 0, getContext: () => null }),
    })

    await expect(stripExifWith(file(), platformImpl)).rejects.toThrow("canvas indisponível")
    expect(image.close).toHaveBeenCalledOnce()
  })

  it("falha quando a compressão devolve null e ainda fecha o bitmap", async () => {
    const image = decoded()
    const platformImpl = makePlatform({
      decode: async () => image,
      encode: async () => null,
    })

    await expect(stripExifWith(file(), platformImpl)).rejects.toThrow(
      "não foi possível processar a imagem",
    )
    expect(image.close).toHaveBeenCalledOnce()
  })

  it("falha quando a compressão rejeita e ainda fecha o bitmap", async () => {
    const image = decoded()
    const platformImpl = makePlatform({
      decode: async () => image,
      encode: async () => {
        throw new Error("toBlob indisponível")
      },
    })

    await expect(stripExifWith(file(), platformImpl)).rejects.toThrow("toBlob indisponível")
    expect(image.close).toHaveBeenCalledOnce()
  })
})
