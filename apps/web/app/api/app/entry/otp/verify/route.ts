import { createServerClient } from "@supabase/ssr"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  codigoDeEntrada,
  emailDeEntrada,
  SEGUNDOS_DE_REENVIO,
  vereditoDaVerificacao,
} from "../../../../../../lib/app-api/entrada-otp"
import { conferirPorta, opcoesDoApp, responder } from "../../../../../../lib/app-api/rota-do-app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Verificação do código de entrada (LAN-F01, ADR-20261101-entrada-unica-por-codigo).
//
// Só esta rota cria a sessão do app: o `verifyOtp` devolve a sessão e os cookies
// do `@supabase/ssr` são gravados na resposta. O caminho de erro é deliberadamente
// único — código errado, vencido ou reusado respondem "Código inválido ou
// vencido", sem dizer qual foi e sem o erro cru do GoTrue.
//
// A porta do app (cabeçalho próprio + origem na lista) também protege contra
// login CSRF: um site de terceiro não consegue verificar um código e fixar a
// sessão da vítima na conta do atacante.

const CORPO_MAXIMO = 4 * 1024

type CookieParaGravar = Readonly<{
  name: string
  value: string
  options?: Record<string, unknown>
}>

export async function POST(request: NextRequest): Promise<NextResponse> {
  const porta = conferirPorta(request, "cookie")
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

  // Os cookies saem daqui, não do cliente: o `@supabase/ssr` escreve a sessão
  // na resposta depois de o GoTrue validar o código. Guardar a lista e aplicá-la
  // depois monta a resposta já com o corpo certo e os cookies.
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

  const resposta = (corpoDaResposta: unknown, status: number): NextResponse => {
    const montada = responder(request, corpoDaResposta, status)
    for (const cookie of paraGravar) {
      if (cookie.options === undefined) {
        montada.cookies.set(cookie.name, cookie.value)
      } else {
        montada.cookies.set(cookie.name, cookie.value, cookie.options as never)
      }
    }
    return montada
  }

  if (error !== null) {
    const veredito = vereditoDaVerificacao(error)
    if (veredito.estado === "limite") {
      return resposta({ erro: "limite", reenviarEm: SEGUNDOS_DE_REENVIO }, 429)
    }
    if (veredito.estado === "codigo-invalido") {
      return resposta({ erro: "codigo-invalido" }, 400)
    }
    return resposta({ erro: "indisponivel" }, 503)
  }

  if (data.session === null) {
    // Sem sessão não há entrada: o GoTrue validou o código mas não devolveu
    // sessão, e seguir adiante fingiria um login que não existe.
    return resposta({ erro: "codigo-invalido" }, 400)
  }

  return resposta({ autenticado: true }, 200)
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
