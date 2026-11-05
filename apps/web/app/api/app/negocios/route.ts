import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@bivaque/domain"
import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import {
  alcanceDaCidade,
  consultaNegocios,
  resumoDoNegocio,
} from "../../../../lib/providers/app-negocios"
import { validateCategory } from "../../../../lib/providers/showcase"
import { cidadeDaSessao, ehUuid } from "../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const busca = new URL(request.url).searchParams
  const categoria = busca.get("categoria")
  const depois = busca.get("depois")
  if (
    (categoria !== null && !validateCategory(categoria).ok) ||
    (depois !== null && !ehUuid(depois))
  ) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, auth.sessao.usuario.id)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const alcance = await alcanceDaCidade(client, cidade.id)
    let query = consultaNegocios(client, alcance)
    if (categoria !== null) query = query.eq("category", categoria as ProviderCategory)
    if (depois !== null) query = query.gt("id", depois)
    const { data, error } = await query.order("id", { ascending: true }).limit(20)
    if (error) throw error
    const negocios = (data ?? []).map(resumoDoNegocio)
    return responder(
      request,
      {
        negocios,
        categorias: PROVIDER_CATEGORIES.map((id) => ({ id, nome: PROVIDER_CATEGORY_LABELS[id] })),
        cidade: cidade.nome,
        proximo: negocios.length === 20 ? (negocios.at(-1)?.id ?? null) : null,
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
