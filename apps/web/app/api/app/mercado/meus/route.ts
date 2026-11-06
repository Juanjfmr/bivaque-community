import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { signPhotoPaths } from "../../../../../lib/listings/queries"
import { type AnuncioBruto, baseDoAnuncio, ehUuid, SELECT_ANUNCIO } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const depois = new URL(request.url).searchParams.get("depois")
  if (depois !== null && !ehUuid(depois))
    return responder(request, { erro: "cursor-invalido" }, 400)
  try {
    const client = auth.sessao.cliente
    let query = client
      .from("listings")
      .select(SELECT_ANUNCIO)
      .eq("owner_user_id", auth.sessao.usuario.id)
      .order("id", { ascending: false })
      .limit(20)
    if (depois !== null) query = query.lt("id", depois)
    const result = await query
    if (result.error) throw result.error
    const rows = (result.data ?? []) as unknown as AnuncioBruto[]
    const capas = rows.map(
      (row) => [...(row.listing_photos ?? [])].sort((a, b) => a.position - b.position)[0]?.path,
    )
    const assinadas = await signPhotoPaths(
      client,
      capas.filter((path): path is string => path !== undefined),
    )
    if (capas.some((path) => path !== undefined && !assinadas.has(path)))
      throw new Error("unsigned photo")
    return responder(
      request,
      {
        anuncios: rows.map((row, index) => ({
          ...baseDoAnuncio(row),
          foto: assinadas.get(capas[index] ?? "") ?? null,
        })),
        proximo: rows.length === 20 ? (rows.at(-1)?.id ?? null) : null,
        cidade: null,
      },
      200,
    )
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
