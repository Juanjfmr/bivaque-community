import { type NextRequest, NextResponse } from "next/server"
import { responder } from "../../../../../lib/app-api/rota-do-app"
import { interpretarErroDoBanco } from "../../eventos/_comum"
import { registrarFalha } from "../_comum"

export function resultado(
  request: NextRequest,
  error: { code?: string; message?: string } | null,
): NextResponse {
  if (!error) {
    const resposta = responder(request, {}, 200)
    return new NextResponse(null, { status: 204, headers: resposta.headers })
  }
  if (
    error.code === "P0002" ||
    (error.code === "P0001" &&
      (error.message === "group not found" ||
        error.message === "pending membership not found for this user"))
  )
    return responder(request, { erro: "nao-encontrado" }, 404)
  if (error.code === "23505" || error.code === "23503")
    return responder(request, { erro: "conflito" }, 409)
  const falha = interpretarErroDoBanco(error.code, {
    recusado: "Operação recusada.",
    dados: "Dados inválidos.",
  })
  if (falha.status === 503) registrarFalha("administração", error)
  return responder(request, falha.corpo, falha.status)
}
