import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { signPhotoPaths } from "../../../../../lib/listings/queries"
import { log } from "../../../../../lib/logger"
import { type AnuncioBruto, baseDoAnuncio, ehUuid, SELECT_ANUNCIO } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

export { PATCH } from "./_editar"

// O detalhe lê o anúncio pela RLS (`private.can_read_listing`): o que não é
// visível volta como 404, nunca 403 — a resposta não entrega a existência.
// O endereço sai só no nível que o anunciante escolheu divulgar (ADR de
// localização): `listings.address` é `null` quando a escolha foi o bairro.

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const result = await client.from("listings").select(SELECT_ANUNCIO).eq("id", id).maybeSingle()
    if (result.error) throw result.error
    if (result.data === null) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
    const row = result.data as unknown as AnuncioBruto

    const [perfil, salvo] = await Promise.all([
      client.from("profiles").select("display_name").eq("user_id", row.owner_user_id).maybeSingle(),
      client
        .from("listing_saves")
        .select("listing_id")
        .eq("listing_id", id)
        .eq("user_id", userId)
        .maybeSingle(),
    ])
    if (perfil.error || salvo.error) throw perfil.error ?? salvo.error

    const fotos = [...(row.listing_photos ?? [])].sort((a, b) => a.position - b.position)
    const assinadas = await signPhotoPaths(
      client,
      fotos.map((foto) => foto.path),
    )
    const urls = fotos
      .map((foto) => assinadas.get(foto.path) ?? null)
      .filter((url): url is string => url !== null)

    return responder(
      request,
      {
        anuncio: {
          ...baseDoAnuncio(row),
          endereco: row.address,
          donoNome: perfil.data?.display_name ?? null,
          fotos: urls,
          meu: row.owner_user_id === userId,
          salvo: salvo.data !== null,
        },
      },
      200,
    )
  } catch (error) {
    log.error("app mercado: detail failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
