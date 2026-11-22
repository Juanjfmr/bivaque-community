import { Capacitor } from "@capacitor/core"
import { afterEach, describe, expect, it, vi } from "vitest"
import { enviarFormulario, ler } from "@/lib/api/cliente"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("origem da API", () => {
  it("mantém o caminho relativo na web", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false)
    const buscar = vi.fn().mockResolvedValue(new Response("{}"))
    vi.stubGlobal("fetch", buscar)
    await ler("/api/app/exemplo")
    expect(buscar).toHaveBeenCalledWith(
      "/api/app/exemplo",
      expect.objectContaining({
        credentials: "include",
        headers: expect.not.objectContaining({ Authorization: expect.anything() }),
      }),
    )
  })

  it("usa a origem configurada no nativo também para arquivos", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true)
    vi.stubEnv("VITE_API_BASE", "https://api.example.invalid")
    const buscar = vi.fn().mockResolvedValue(new Response("{}"))
    vi.stubGlobal("fetch", buscar)
    await ler("/api/app/exemplo")
    await enviarFormulario("/api/app/foto", new FormData())
    expect(buscar).toHaveBeenNthCalledWith(
      1,
      "https://api.example.invalid/api/app/exemplo",
      expect.anything(),
    )
    expect(buscar).toHaveBeenNthCalledWith(
      2,
      "https://api.example.invalid/api/app/foto",
      expect.anything(),
    )
  })

  it("recusa configuração ausente ou inválida antes de chamar a rede", async () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true)
    const buscar = vi.fn()
    vi.stubGlobal("fetch", buscar)
    for (const base of ["", "/api"]) {
      vi.stubEnv("VITE_API_BASE", base)
      await expect(ler("/api/app/exemplo")).rejects.toMatchObject({ codigo: "rede" })
      await expect(enviarFormulario("/api/app/foto", new FormData())).rejects.toMatchObject({
        codigo: "rede",
      })
    }
    expect(buscar).not.toHaveBeenCalled()
  })
})
