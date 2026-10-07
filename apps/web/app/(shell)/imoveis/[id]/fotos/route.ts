import { uploadListingPhotos } from "../../../../../lib/listings/actions"
import { hasSameMediaOrigin } from "../../../../../lib/listings/media-origin"
import { createUserClient } from "../../../../../lib/listings/server"

// One photo per request avoids the Server Action 1 MiB transport limit without
// increasing it globally or buffering a 120 MiB publication body.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameMediaOrigin(request))
    return Response.json({ ok: false, error: "Origem não permitida." }, { status: 403 })
  const length = Number(request.headers.get("content-length") ?? 0)
  if (length > 11 * 1024 * 1024)
    return Response.json(
      { ok: false, error: "Cada foto deve ter no máximo 10 MB." },
      { status: 413 },
    )
  try {
    const client = await createUserClient()
    const auth = await client.auth.getUser()
    if (auth.error || !auth.data.user)
      return Response.json({ ok: false, error: "Entre para enviar fotos." }, { status: 401 })
    const { id } = await params
    const reader = request.body?.getReader()
    if (!reader) return Response.json({ ok: false, error: "Envie uma foto." }, { status: 400 })
    const chunks: ArrayBuffer[] = []
    let received = 0
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      received += chunk.value.byteLength
      if (received > 11 * 1024 * 1024) {
        await reader.cancel()
        return Response.json(
          { ok: false, error: "Cada foto deve ter no máximo 10 MB." },
          { status: 413 },
        )
      }
      const bytes = new Uint8Array(chunk.value.length)
      bytes.set(chunk.value)
      chunks.push(bytes.buffer)
    }
    const form = await new Response(new Blob(chunks), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData()
    const photos = form.getAll("photos")
    if (photos.length !== 1 || !(photos[0] instanceof File))
      return Response.json({ ok: false, error: "Envie uma foto por vez." }, { status: 400 })
    form.set("listing_id", id)
    const result = await uploadListingPhotos(form)
    return Response.json(result, { status: result.ok ? 200 : 400 })
  } catch {
    return Response.json(
      { ok: false, error: "Não foi possível enviar a foto. Tente novamente." },
      { status: 500 },
    )
  }
}
