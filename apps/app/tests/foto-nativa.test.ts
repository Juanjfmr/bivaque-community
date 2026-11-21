import { Camera } from "@capacitor/camera"
import { describe, expect, it, vi } from "vitest"
import { fotoDaCamera } from "../lib/nativo/foto"

vi.mock("@capacitor/camera", () => ({
  Camera: { getPhoto: vi.fn() },
  CameraResultType: { Uri: "uri" },
  CameraSource: { Prompt: "PROMPT" },
}))

describe("foto nativa", () => {
  it("transforma a foto em arquivo para o envio existente", async () => {
    vi.mocked(Camera.getPhoto).mockResolvedValue({
      webPath: "https://localhost/foto",
      format: "jpeg",
      saved: false,
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new Blob(["foto"], { type: "image/jpeg" }))),
    )
    const foto = await fotoDaCamera()
    expect(foto.type).toBe("image/jpeg")
    expect(await foto.text()).toBe("foto")
    vi.unstubAllGlobals()
  })
  it("recusa foto sem caminho", async () => {
    vi.mocked(Camera.getPhoto).mockResolvedValue({ format: "jpeg", saved: false })
    await expect(fotoDaCamera()).rejects.toThrow()
  })
})
