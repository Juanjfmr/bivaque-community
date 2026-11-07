import { timingSafeEqual } from "node:crypto"
import { createServerClient } from "../../../../lib/supabase/server"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const esperado = process.env["OUTBOX_WORKER_SECRET"]
  if (!esperado) return Response.json({ erro: "indisponivel" }, { status: 503 })
  const recebido = request.headers.get("x-outbox-secret") ?? ""
  const a = Buffer.from(esperado)
  const b = Buffer.from(recebido)
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json({ erro: "recusado" }, { status: 401 })
  try {
    // Credencial de worker validada acima; não há identidade de membro no corpo.
    const { data, error } = await createServerClient().rpc("enqueue_city_digests")
    if (error) return Response.json({ erro: "indisponivel" }, { status: 503 })
    return Response.json({ enfileirados: data })
  } catch {
    return Response.json({ erro: "indisponivel" }, { status: 503 })
  }
}
