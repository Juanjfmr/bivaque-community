import type { NextRequest, NextResponse } from "next/server"
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
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const userId = auth.sessao.usuario.id
  try {
    const { error } = await auth.sessao.cliente.auth.signOut({ scope: "local" })
    if (error) throw error
    return aplicarCookies(
      responder(request, { ok: true }, 200),
      auth.sessao.cookiesParaGravar ?? [],
    )
  } catch (erro) {
    log.error("app voce: saída falhou", {
      error: erro instanceof Error ? erro.message : "unknown",
      userId,
    })
    return responder(request, { erro: "saida-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
