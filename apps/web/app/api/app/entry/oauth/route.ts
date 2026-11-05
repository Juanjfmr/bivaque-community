import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  conferirPorta,
  opcoesDoApp,
  origemDoPedido,
  responder,
  respostaIndisponivel,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Início do OAuth do Google na porta do app (RUN-002, lote C parte 1).
//
// O app nunca fala com o Google: ele pede a URL de autorização e navega para
// ela. O `redirectTo` volta ao `/auth/callback` da MESMA origem que abriu o
// fluxo — local, prévia ou produção —, com `next=/app/entrar`; é o callback que
// troca o código pela sessão e devolve a pessoa à entrada, onde o provedor lido
// da sessão retoma no aceite.
//
// O PKCE vive num cookie do `@supabase/ssr`: o verificador não aparece na URL
// nem no corpo da resposta. A rota não exige sessão (é a porta), mas exige a
// origem da lista e o cabeçalho do app — um formulário de outro site não
// começa um fluxo em nome de ninguém.

const DESTINO_DO_APP = "/app/entrar"
const PROVEDOR = "google"

function provedorPedido(corpo: unknown): unknown {
  if (typeof corpo !== "object" || corpo === null) return undefined
  return (corpo as { provedor?: unknown }).provedor
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const porta = conferirPorta(request, "cookie")
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  let bruto: unknown
  try {
    bruto = await request.json()
  } catch {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  if (provedorPedido(bruto) !== PROVEDOR) {
    return responder(request, { erro: "provedor-invalido" }, 400)
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) return respostaIndisponivel(request)

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(itens) {
        for (const { name, value, options } of itens) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })

  const redirectTo = `${origemDoPedido(request)}/auth/callback?next=${encodeURIComponent(
    DESTINO_DO_APP,
  )}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: PROVEDOR,
    options: { redirectTo, skipBrowserRedirect: true },
  })

  if (error !== null || data.url === null) {
    log.error("entry oauth start failed", { message: error?.message ?? "sem url" })
    return responder(request, { erro: "oauth-indisponivel" }, 503)
  }

  return responder(request, { url: data.url }, 200)
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
