import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  cabecalhosDeCors,
  cabecalhosDePreflight,
  origemPermitida,
  VALOR_DO_CABECALHO_DO_APP,
} from "../../../../../lib/app-api/contrato"
import {
  emailDeEntrada,
  SEGUNDOS_DE_REENVIO,
  vereditoDoEnvio,
} from "../../../../../lib/app-api/entrada-otp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Envio do código de entrada (LAN-F01, ADR-20261101-entrada-unica-por-codigo).
//
// A rota não tem sessão para resolver: ela é a porta. Duas coisas importam:
//
// 1. **Resposta única.** Conta nova e conta existente recebem a mesma resposta
//    "enviado" (o GoTrue cria a conta para o endereço novo). Limite de reenvio
//    e falha de transporte são os únicos estados distinguíveis, porque nenhum
//    dos dois fala sobre a existência da conta.
// 2. **A porta do app.** A rota exige o cabeçalho do app e recusa origem fora
//    da lista: um formulário de outro site não consegue disparar e-mails nem
//    fixar a credencial de outra pessoa (login CSRF na verificação).

const CORPO_MAXIMO = 4 * 1024

function origensPermitidas(request: NextRequest): string[] {
  const doAmbiente = (process.env["BIVAQUE_APP_ORIGINS"] ?? "")
    .split(",")
    .map((origem) => origem.trim())
    .filter((origem) => origem !== "")
  return [new URL(request.url).origin, ...doAmbiente]
}

type Porta = "ok" | "origem-recusada" | "cabecalho-ausente"

function conferirPorta(request: NextRequest): Porta {
  const origem = request.headers.get("origin")
  // POST de navegador sempre manda Origin; a ausência é cliente nativo.
  if (origem !== null && !origemPermitida(origem, origensPermitidas(request))) {
    return "origem-recusada"
  }
  if (request.headers.get("x-bivaque-app") !== VALOR_DO_CABECALHO_DO_APP) {
    return "cabecalho-ausente"
  }
  return "ok"
}

function responder(request: NextRequest, corpo: unknown, status: number): NextResponse {
  return NextResponse.json(corpo, {
    status,
    headers: {
      "cache-control": "no-store",
      ...cabecalhosDeCors(request.headers.get("origin"), origensPermitidas(request)),
    },
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const porta = conferirPorta(request)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) return responder(request, { erro: "indisponivel" }, 503)

  let bruto: unknown
  try {
    const texto = await request.text()
    if (texto.length > CORPO_MAXIMO) return responder(request, { erro: "grande-demais" }, 413)
    bruto = JSON.parse(texto)
  } catch {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const email = emailDeEntrada(
    typeof bruto === "object" && bruto !== null ? (bruto as { email?: unknown }).email : undefined,
  )
  if (email === null) return responder(request, { erro: "email-invalido" }, 400)

  // Cliente anônimo no servidor: a chave pública fica no servidor e o app não
  // precisa falar com o GoTrue. `shouldCreateUser` é o que faz conta nova e
  // conta existente terem o mesmo caminho.
  const cliente = createClient<Database>(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await cliente.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })

  const veredito = vereditoDoEnvio(error)
  if (veredito.estado === "enviado") {
    return responder(request, { enviado: true, reenviarEm: SEGUNDOS_DE_REENVIO }, 200)
  }
  if (veredito.estado === "limite") {
    return responder(request, { erro: "limite", reenviarEm: veredito.reenviarEm }, 429)
  }
  return responder(request, { erro: "indisponivel" }, 503)
}

export function OPTIONS(request: NextRequest): NextResponse {
  const cabecalhos = cabecalhosDePreflight(
    request.headers.get("origin"),
    origensPermitidas(request),
  )
  if (Object.keys(cabecalhos).length === 0) {
    return new NextResponse(null, { status: 403, headers: { "cache-control": "no-store" } })
  }
  return new NextResponse(null, {
    status: 204,
    headers: { "cache-control": "no-store", ...cabecalhos },
  })
}
