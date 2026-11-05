import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { cidadeDaSessao } from "../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TAMANHO = 20

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const valor = new URL(request.url).searchParams.get("pagina")
  const pagina = valor === null ? 1 : Number(valor)
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100) {
    return responder(request, { erro: "parametro-invalido" }, 400)
  }
  try {
    const client = auth.sessao.cliente
    const cidade = await cidadeDaSessao(client, auth.sessao.usuario.id)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const inicio = (pagina - 1) * TAMANHO
    const fim = inicio + TAMANHO
    const [perguntas, eventos, anuncios] = await Promise.all([
      client
        .from("recommendation_requests")
        .select("id,title,body,is_resolved,created_at")
        .eq("locality_id", cidade.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(inicio, fim),
      client
        .from("events")
        .select("id,title,venue,starts_at,status")
        .eq("locality_id", cidade.id)
        .eq("status", "upcoming")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .order("id", { ascending: true })
        .range(inicio, fim),
      client
        .from("listings")
        .select("id,title,kind,price_cents,neighborhood,description,status,created_at")
        .eq("locality_id", cidade.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(inicio, fim),
    ])
    if (perguntas.error || eventos.error || anuncios.error) throw new Error("leitura indisponível")
    const listas = [perguntas.data ?? [], eventos.data ?? [], anuncios.data ?? []] as const
    return responder(
      request,
      {
        cidade: cidade.nome,
        perguntas: listas[0].slice(0, TAMANHO),
        eventos: listas[1].slice(0, TAMANHO),
        anuncios: listas[2].slice(0, TAMANHO),
        proximo: listas.some((lista) => lista.length > TAMANHO) ? pagina + 1 : null,
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
