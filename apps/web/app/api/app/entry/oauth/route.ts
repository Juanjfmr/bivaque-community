import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { VALOR_DO_CABECALHO_DO_APP } from "../../../../../lib/app-api/contrato"
import { avaliarModoNativo } from "../../../../../lib/app-api/modo-nativo"
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
const REDIRECT_NATIVO = "bivaque://auth-callback"

function provedorPedido(corpo: unknown): unknown {
  if (typeof corpo !== "object" || corpo === null) return undefined
  return (corpo as { provedor?: unknown }).provedor
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const modo = avaliarModoNativo(request)
  if ("recusa" in modo) return responder(request, { erro: "origem-recusada" }, modo.recusa)
  const porta = conferirPorta(request, modo.nativo ? "bearer" : "cookie")
  if (modo.nativo && request.headers.get("x-bivaque-app") !== VALOR_DO_CABECALHO_DO_APP) {
    return responder(request, { erro: "cabecalho-ausente" }, 403)
  }
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

  const desafio = (bruto as { code_challenge?: unknown }).code_challenge
  if (modo.nativo && (typeof desafio !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(desafio))) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) return respostaIndisponivel(request)

  if (modo.nativo) {
    const parametros = new URLSearchParams({
      provider: PROVEDOR,
      redirect_to: REDIRECT_NATIVO,
      code_challenge: desafio as string,
      code_challenge_method: "s256",
    })
    return responder(request, { url: `${url}/auth/v1/authorize?${parametros}` }, 200)
  }

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
