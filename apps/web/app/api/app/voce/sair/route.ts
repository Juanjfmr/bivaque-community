import { createClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import { resolverCredencial } from "../../../../../lib/app-api/contrato"
import { avaliarModoNativo } from "../../../../../lib/app-api/modo-nativo"
import {
  aplicarCookies,
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Sair da conta (F10) pelo app. O app não tem cliente Supabase (ADR-20261105):
 * quem revoga a sessão é o servidor. O `signOut` do cliente da sessão pede ao
 * `@supabase/ssr` a remoção dos cookies (valor vazio, `maxAge: 0`), e a rota
 * aplica esse mesmo array na resposta — a sessão some do navegador.
 *
 * `exigirSessao` só registra o array quando ele já vem com a renovação do
 * token; por isso a remoção é aplicada aqui explicitamente. Aplicar de novo o
 * que já foi registrado não muda nada: o cookie é o mesmo nome.
 *
 * Escopo `local` (decisão RUN-157): sem opção o GoTrue revoga a sessão em todos
 * os aparelhos, e o subtítulo da tela ("Encerrar a sessão neste aparelho")
 * seria mentira. Local ainda limpa o cookie deste navegador pelo mesmo
 * `setAll`; o que ele não faz é deslogar a pessoa nos outros aparelhos.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const modo = avaliarModoNativo(request)
  if ("recusa" in modo) return responder(request, { erro: "origem-recusada" }, modo.recusa)
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  try {
    if (auth.sessao.via === "bearer") {
      const credencial = resolverCredencial({
        autorizacao: request.headers.get("authorization"),
        temCookie: false,
      })
      const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
      const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
      if (!("via" in credencial) || credencial.via !== "bearer" || !url || !anon) {
        throw new Error("configuracao ou credencial indisponivel")
      }
      const cliente = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { error } = await cliente.auth.admin.signOut(credencial.token, "local")
      if (error) throw error
      return responder(request, { ok: true }, 200)
    }
    const { error } = await auth.sessao.cliente.auth.signOut({ scope: "local" })
    if (error) throw error
    const resposta = aplicarCookies(
      responder(request, { ok: true }, 200),
      auth.sessao.cookiesParaGravar ?? [],
    )
    resposta.headers.set("Clear-Site-Data", '"cache", "storage"')
    return resposta
  } catch {
    log.error("app voce: saída falhou")
    return responder(request, { erro: "saida-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
