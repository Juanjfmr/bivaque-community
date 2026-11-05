import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_DE_SALVOS = 50

/**
 * As referências do guia que a pessoa salvou (F08), para a tela Salvos.
 *
 * A leitura parte de `guide_entry_saves` com a sessão: a RLS já devolve só as
 * linhas do próprio `user_id`. O recorte por status repete a regra da lista —
 * referência que saiu do ar não vira item de tela. Falha de leitura é 503, não
 * lista vazia.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const salvas = await client
      .from("guide_entry_saves")
      .select("entry_id")
      .order("saved_at", { ascending: false })
      .limit(LIMITE_DE_SALVOS)
    if (salvas.error) throw salvas.error

    const ids = (salvas.data ?? []).map((linha) => linha.entry_id)
    if (ids.length === 0) return responder(request, { entradas: [] }, 200)

    const result = await client
      .from("arrival_guide_entries")
      .select("id,category,name,description,website_url,phone")
      .in("id", ids)
      .eq("status", "approved")
    if (result.error) throw result.error

    const porId = new Map((result.data ?? []).map((linha) => [linha.id, linha]))
    const entradas = ids.flatMap((id) => {
      const linha = porId.get(id)
      if (linha === undefined) return []
      return [
        {
          id: linha.id,
          categoria: linha.category,
          nome: linha.name,
          descricao: linha.description,
          site: linha.website_url,
          telefone: linha.phone,
          salvo: true,
        },
      ]
    })
    return responder(request, { entradas }, 200)
  } catch (error) {
    log.error("app guia: saved list failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
