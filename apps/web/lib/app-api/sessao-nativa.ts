import type { NextResponse } from "next/server"
import { log } from "../logger"
import { VALOR_DO_CABECALHO_DO_APP } from "./contrato"
import { ipConfiavel } from "./entrada-limite"
import { consumirSessaoNativa } from "./limitador-de-sessao"
import { avaliarModoNativo } from "./modo-nativo"
import {
  clienteDeServicoOuNulo,
  conferirPorta,
  lerCorpoJson,
  responder,
  respostaIndisponivel,
} from "./rota-do-app"

const RECUSAS_DEFINITIVAS = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_not_found",
  "session_expired",
  "bad_code_verifier",
  "flow_state_not_found",
  "flow_state_expired",
  "invalid_grant",
  "user_not_found",
  "user_banned",
])

export async function trocarSessao(
  request: Request,
  escopo: "token" | "renovar",
): Promise<NextResponse> {
  const modo = avaliarModoNativo(request)
  if ("recusa" in modo) return responder(request, { erro: "origem-recusada" }, modo.recusa)
  if (!modo.nativo) return responder(request, { erro: "origem-recusada" }, 403)
  const porta = conferirPorta(request, "bearer")
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (request.headers.get("x-bivaque-app") !== VALOR_DO_CABECALHO_DO_APP) {
    return responder(request, { erro: "cabecalho-ausente" }, 403)
  }
  const lido = await lerCorpoJson(request, 4 * 1024)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const { code, code_verifier, refresh_token } = lido.corpo
  if (
    escopo === "token"
      ? typeof code !== "string" ||
        code.length < 1 ||
        code.length > 512 ||
        typeof code_verifier !== "string" ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier)
      : typeof refresh_token !== "string" || refresh_token.length < 1 || refresh_token.length > 512
  ) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const limite = await consumirSessaoNativa(
    clienteDeServicoOuNulo(),
    escopo,
    ipConfiavel(request.headers),
  )
  if (limite === "estourou") return responder(request, { erro: "limite" }, 429)
  if (limite === "indisponivel") {
    log.error("session: limiter unavailable")
    return respostaIndisponivel(request)
  }
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) return respostaIndisponivel(request)
  try {
    const resposta = await fetch(
      `${url}/auth/v1/token?grant_type=${escopo === "token" ? "pkce" : "refresh_token"}`,
      {
        method: "POST",
        headers: { apikey: anon, "content-type": "application/json" },
        body: JSON.stringify(
          escopo === "token" ? { auth_code: code, code_verifier } : { refresh_token },
        ),
        signal: AbortSignal.timeout(10_000),
      },
    )
    if (!resposta.ok) {
      if (resposta.status >= 400 && resposta.status < 500 && resposta.status !== 429) {
        const erro: unknown = await resposta.json().catch(() => null)
        if (typeof erro === "object" && erro !== null) {
          const corpo = erro as Record<string, unknown>
          if (
            [corpo["error_code"], corpo["error"]].some(
              (codigo) => typeof codigo === "string" && RECUSAS_DEFINITIVAS.has(codigo),
            )
          )
            return responder(request, { erro: "credencial-recusada" }, 401)
        }
      }
      return respostaIndisponivel(request)
    }
    const dados: unknown = await resposta.json()
    if (typeof dados !== "object" || dados === null) return respostaIndisponivel(request)
    const par = dados as Record<string, unknown>
    const expires_at =
      typeof par["expires_at"] === "number"
        ? par["expires_at"]
        : typeof par["expires_in"] === "number"
          ? Math.floor(Date.now() / 1000) + par["expires_in"]
          : null
    if (
      typeof par["access_token"] !== "string" ||
      !par["access_token"] ||
      typeof par["refresh_token"] !== "string" ||
      !par["refresh_token"] ||
      expires_at === null ||
      !Number.isFinite(expires_at)
    )
      return respostaIndisponivel(request)
    return responder(
      request,
      { access_token: par["access_token"], refresh_token: par["refresh_token"], expires_at },
      200,
    )
  } catch {
    return respostaIndisponivel(request)
  }
}
