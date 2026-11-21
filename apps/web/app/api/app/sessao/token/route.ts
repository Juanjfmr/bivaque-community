import type { NextRequest, NextResponse } from "next/server"
import { opcoesDoApp } from "../../../../../lib/app-api/rota-do-app"
import { trocarSessao } from "../../../../../lib/app-api/sessao-nativa"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function POST(request: NextRequest): Promise<NextResponse> {
  return trocarSessao(request, "token")
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
