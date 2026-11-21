import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { alvosDeDenuncia } from "../../../../../lib/reports/alvos-de-denuncia"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// TROCA-005 — os alvos que a folha "Nova denúncia" da Ajuda oferece. É leitura
// do que a sessão já enxerga (publicações da cidade e grupos do membro), sem
// identificar autor: o payload leva só tipo, id e título para a pessoa escolher.

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const alvos = await alvosDeDenuncia(auth.sessao.cliente, auth.sessao.usuario.id)
    return responder(request, { alvos }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
