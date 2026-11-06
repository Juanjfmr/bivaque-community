import type { NextResponse } from "next/server"
import { responder } from "../../../../../lib/app-api/rota-do-app"
import { FalhaDeConvite } from "../../../../../lib/convite/familia"

/**
 * A recusa de família vira status tipado (ADR-20261105 §3.1): 400 régua do
 * e-mail, 403 não é titular verificado, 409 teto de convites ativos, 404
 * convite que não existe ou não é desta pessoa, 503 banco fora. O motivo vem
 * do módulo compartilhado com a tela antiga — as duas portas não podem
 * discordar. `banco` nunca ecoa a mensagem do Postgres.
 */
export function respostaDaFalhaDeConvite(request: Request, falha: unknown): NextResponse {
  if (!(falha instanceof FalhaDeConvite)) {
    return responder(request, { erro: "familia-indisponivel" }, 503)
  }
  switch (falha.motivo) {
    case "email-invalido":
      return responder(request, { erro: "dados-invalidos", mensagem: falha.message }, 400)
    case "nao-titular":
      return responder(request, { erro: "nao-titular", mensagem: falha.message }, 403)
    case "teto-de-convites":
      return responder(request, { erro: "teto-de-convites", mensagem: falha.message }, 409)
    case "convite-nao-encontrado":
      return responder(request, { erro: "nao-encontrado", mensagem: falha.message }, 404)
    default:
      return responder(request, { erro: "familia-indisponivel" }, 503)
  }
}
