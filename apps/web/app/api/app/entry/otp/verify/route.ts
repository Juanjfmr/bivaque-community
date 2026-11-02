import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  cabecalhosDeCors,
  cabecalhosDePreflight,
  origemPermitida,
  VALOR_DO_CABECALHO_DO_APP,
} from "../../../../../../lib/app-api/contrato"
import {
  codigoDeEntrada,
  emailDeEntrada,
  SEGUNDOS_DE_REENVIO,
  vereditoDaVerificacao,
} from "../../../../../../lib/app-api/entrada-otp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// VerificaÃ§Ã£o do cÃ³digo de entrada (LAN-F01, ADR-20261101-entrada-unica-por-codigo).
//
// SÃ³ esta rota cria a sessÃ£o do app: o `verifyOtp` devolve a sessÃ£o e os cookies
// do `@supabase/ssr` sÃ£o gravados na resposta. O caminho de erro Ã© deliberadamente
// Ãºnico â€” cÃ³digo errado, vencido ou reusado respondem "CÃ³digo invÃ¡lido ou
// vencido", sem dizer qual foi e sem o erro cru do GoTrue.
//
// A porta do app (cabeÃ§alho prÃ³prio + origem na lista) tambÃ©m protege contra
// login CSRF: um site de terceiro nÃ£o consegue verificar um cÃ³digo e fixar a
// sessÃ£o da vÃ­tima na conta do atacante.

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
  if (origem !== null && !origemPermitida(origem, origensPermitidas(request))) {
    return "origem-recusada"
  }
  if (request.headers.get("x-bivaque-app") !== VALOR_DO_CABECALHO_DO_APP) {
    return "cabecalho-ausente"
  }
  return "ok"
}

type CookieParaGravar = Readonly<{
  name: string
  value: string
  options?: Record<string, unknown>
}>

function responder(
  request: NextRequest,
  corpo: unknown,
  status: number,
  cookies: readonly CookieParaGravar[] = [],
): NextResponse {
  const resposta = NextResponse.json(corpo, {
    status,
    headers: {
      "cache-control": "no-store",
      ...cabecalhosDeCors(request.headers.get("origin"), origensPermitidas(request)),
    },
  })
  for (const cookie of cookies) {
    if (cookie.options === undefined) {
      resposta.cookies.set(cookie.name, cookie.value)
    } else {
      resposta.cookies.set(cookie.name, cookie.value, cookie.options as never)
    }
  }
  return resposta
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

  const corpo =
    typeof bruto === "object" && bruto !== null ? (bruto as Record<string, unknown>) : {}
  const email = emailDeEntrada(corpo["email"])
  const codigo = codigoDeEntrada(corpo["codigo"])
  if (email === null || codigo === null) {
    return responder(request, { erro: "codigo-invalido" }, 400)
  }

  // Os cookies saem daqui, nÃ£o do cliente: o `@supabase/ssr` escreve a sessÃ£o
  // na resposta depois de o GoTrue validar o cÃ³digo. Guardar a lista e aplicÃ¡-la
  // depois monta a resposta jÃ¡ com o corpo certo e os cookies.
  const paraGravar: CookieParaGravar[] = []
  const cliente = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookies) {
        for (const cookie of cookies) paraGravar.push(cookie)
      },
    },
  })

  const { data, error } = await cliente.auth.verifyOtp({
    email,
    token: codigo,
    type: "email",
  })

  if (error !== null) {
    const veredito = vereditoDaVerificacao(error)
    if (veredito.estado === "limite") {
      return responder(
        request,
        { erro: "limite", reenviarEm: SEGUNDOS_DE_REENVIO },
        429,
        paraGravar,
      )
    }
    if (veredito.estado === "codigo-invalido") {
      return responder(request, { erro: "codigo-invalido" }, 400, paraGravar)
    }
    return responder(request, { erro: "indisponivel" }, 503, paraGravar)
  }

  if (data.session === null) {
    // Sem sessÃ£o nÃ£o hÃ¡ entrada: o GoTrue validou o cÃ³digo mas nÃ£o devolveu
    // sessÃ£o, e seguir adiante fingiria um login que nÃ£o existe.
    return responder(request, { erro: "codigo-invalido" }, 400)
  }

  return responder(request, { autenticado: true }, 200, paraGravar)
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
