import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import {
  alcanceDaCidade,
  consultaNegocios,
  resumoDoNegocio,
} from "../../../../../lib/providers/app-negocios"
import { cidadeDaSessao, ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "negocio-nao-encontrado" }, 404)
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, auth.sessao.usuario.id)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const alcance = await alcanceDaCidade(client, cidade.id)
    const perfil = await consultaNegocios(client, alcance).eq("id", id).maybeSingle()
    if (perfil.error) throw perfil.error
    if (perfil.data === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)

    const [catalogo, fotos] = await Promise.all([
      client
        .from("provider_catalog_items")
        .select("id,title,description")
        .eq("provider_id", id)
        .order("position"),
      client
        .from("provider_portfolio_photos")
        .select("photo_path,caption")
        .eq("provider_id", id)
        .order("position")
        .limit(1),
    ])
    if (catalogo.error || fotos.error) throw catalogo.error ?? fotos.error
    const primeiraFoto = fotos.data?.[0]
    let foto: string | null = null
    if (primeiraFoto !== undefined) {
      const assinada = await client.storage
        .from("provider-photos")
        .createSignedUrl(primeiraFoto.photo_path, 300)
      if (assinada.error || !assinada.data?.signedUrl) throw new Error("Mídia indisponível")
      foto = assinada.data.signedUrl
    }
    return responder(
      request,
      {
        negocio: {
          ...resumoDoNegocio(perfil.data),
          cidade: cidade.nome,
          podePedir: perfil.data.owner_user_id !== auth.sessao.usuario.id,
          servicos: (catalogo.data ?? []).map((linha) => ({
            id: linha.id,
            titulo: linha.title,
            descricao: linha.description,
          })),
          foto,
          fotoDescricao: primeiraFoto?.caption ?? null,
        },
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
