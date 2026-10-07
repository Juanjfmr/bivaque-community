import { afterEach, describe, expect, it, vi } from "vitest"
import { uploadPropertyFiles } from "../../../apps/web/lib/listings/media-client"

afterEach(() => vi.unstubAllGlobals())
describe("listing upload transport", () => {
  const file = () => new File([new Uint8Array([1])], "fixture.png", { type: "image/png" })
  it("uploads a photo without following a gate redirect", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, error: null }))
    vi.stubGlobal("fetch", fetchMock)
    expect(await uploadPropertyFiles("fixture-id", [file()])).toMatchObject({
      ok: true,
      listingId: "fixture-id",
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "/imoveis/fixture-id/fotos",
      expect.objectContaining({ method: "POST", redirect: "error" }),
    )
  })
  it("preserves draft identity on network or redirect failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("redirect")))
    expect(await uploadPropertyFiles("fixture-id", [file()])).toMatchObject({
      ok: false,
      listingId: "fixture-id",
    })
  })
  it("does not interpret an HTML fallback as success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Login</html>")))
    expect(await uploadPropertyFiles("fixture-id", [file()])).toMatchObject({
      ok: false,
      listingId: "fixture-id",
    })
  })
  it("stops on denied upload without claiming the remaining files were stored", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: false, error: "Negado" }, { status: 403 }))
    vi.stubGlobal("fetch", fetchMock)
    expect(await uploadPropertyFiles("fixture-id", [file(), file()])).toMatchObject({
      ok: false,
      error: "Negado",
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
